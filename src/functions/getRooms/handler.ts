import { constants as httpConstants } from 'http2';
import type { ValidatedEventAPIGatewayProxyEvent } from '@libs/api-gateway';
import { formatJSONResponse } from '@libs/api-gateway';
import { middyfy } from '@libs/lambda';
import { dynamoDBDocumentClient } from '../../libs/dynamo-db-doc-client';
import schema from './schema';
import { QueryCommand } from '@aws-sdk/lib-dynamodb';
import { DB_MAPPER, END_PK_REG_EXP, TABLE } from 'src/common/constants';

const getRooms: ValidatedEventAPIGatewayProxyEvent<typeof schema> = async (event) => {
  try {
    console.log('Incoming event into getRooms is:   ', event);

    const [userId]: string | undefined = (event.requestContext?.authorizer?.principalId || '').split(' ');

    const queryCommand = new QueryCommand({
      TableName: TABLE,
      KeyConditionExpression: '#PK = :pk and begins_with(#SK, :sk)',
      ExpressionAttributeNames: {
        '#PK': 'PK',
        '#SK': 'SK',
      },
      ExpressionAttributeValues: {
        ':pk': DB_MAPPER.USER(userId),
        ':sk': DB_MAPPER.ROOM('').replace(END_PK_REG_EXP, ''),
      },
    });

    const { Items: rooms } = await dynamoDBDocumentClient.send(queryCommand);

    return formatJSONResponse({ rooms });
  } catch (err) {
    console.error('ERROR is:    ', err);
    return formatJSONResponse({ message: err.message }, httpConstants.HTTP_STATUS_INTERNAL_SERVER_ERROR);
  }
};

export const main = middyfy(getRooms);
