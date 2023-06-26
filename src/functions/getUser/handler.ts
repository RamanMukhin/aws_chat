import { constants as httpConstants } from 'http2';
import type { ValidatedEventAPIGatewayProxyEvent } from '@libs/api-gateway';
import { formatJSONResponse } from '@libs/api-gateway';
import { middyfy } from '@libs/lambda';
import { dynamoDBDocumentClient } from '../../libs/dynamo-db-doc-client';
import schema from './schema';
import { QueryCommand } from '@aws-sdk/lib-dynamodb';
import { BUCKET, DB_MAPPER, TABLE } from 'src/common/constants';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { s3Client } from '@libs/s3-client';
import { GetObjectCommand } from '@aws-sdk/client-s3';

const getUser: ValidatedEventAPIGatewayProxyEvent<typeof schema> = async (event) => {
  try {
    console.log('Incoming event into getUser is:   ', event);

    const [userId]: string | undefined = (event.requestContext?.authorizer?.principalId || '').split(' ');

    const queryCommand = new QueryCommand({
      TableName: TABLE,
      KeyConditionExpression: 'PK = :pk and SK = :sk',
      ExpressionAttributeValues: {
        ':pk': DB_MAPPER.USER(userId),
        ':sk': DB_MAPPER.ENTITY(),
      },
    });

    const { Items } = await dynamoDBDocumentClient.send(queryCommand);

    const user = Items[0];

    if (event.queryStringParameters && event.queryStringParameters.avatar === 'true') {
      user.avatar = user.avatar ?? null;

      if (user.avatar) {
        const putObjectCommand = new GetObjectCommand({
          Bucket: BUCKET,
          Key: user.avatar,
        });

        user.avatar = await getSignedUrl(s3Client, putObjectCommand, { expiresIn: 600 });
      }
    }

    return formatJSONResponse({ user });
  } catch (err) {
    console.error('ERROR is:    ', err);
    return formatJSONResponse({ message: err.message }, httpConstants.HTTP_STATUS_INTERNAL_SERVER_ERROR);
  }
};

export const main = middyfy(getUser);
