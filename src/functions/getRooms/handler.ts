import { constants as httpConstants } from 'http2';
import type { ValidatedEventAPIGatewayProxyEvent } from '@libs/api-gateway';
import { formatJSONResponse } from '@libs/api-gateway';
import { middyfy } from '@libs/lambda';
import { dynamoDBDocumentClient } from '../../libs/dynamo-db-doc-client';
import schema from './schema';
import { QueryCommand } from '@aws-sdk/lib-dynamodb';
import { DB_MAPPER, END_PK_REG_EXP, TABLE } from 'src/common/constants';
import { Entity, EntityWithGSI } from 'src/common/types';
import { getExclusiveStartKey } from 'src/common/get-exclusive-start-key';
import { getLastEvaluatedKey } from 'src/common/utils';

const getRooms: ValidatedEventAPIGatewayProxyEvent<typeof schema> = async (event) => {
  try {
    console.log('Incoming event into getRooms is:   ', event);

    const [userId]: string | undefined = (event.requestContext?.authorizer?.principalId || '').split(' ');
    const { queryStringParameters } = event;

    let ExclusiveStartKey: Entity | EntityWithGSI;

    if (queryStringParameters && queryStringParameters.last) {
      ExclusiveStartKey = await getExclusiveStartKey(queryStringParameters, DB_MAPPER.NAME.USER, DB_MAPPER.NAME.ROOM);
    }

    const queryCommand = new QueryCommand({
      TableName: TABLE,
      ExclusiveStartKey,
      Limit: DB_MAPPER.LIMIT.ROOM(queryStringParameters && queryStringParameters.limit),
      KeyConditionExpression: 'PK = :pk and begins_with(SK, :sk)',
      ExpressionAttributeValues: {
        ':pk': DB_MAPPER.USER(userId),
        ':sk': DB_MAPPER.ROOM('').replace(END_PK_REG_EXP, ''),
      },
    });

    const { Items: rooms, LastEvaluatedKey } = await dynamoDBDocumentClient.send(queryCommand);

    let last = null;

    if (LastEvaluatedKey) {
      last = getLastEvaluatedKey(LastEvaluatedKey);
    }

    return formatJSONResponse({ rooms, last });
  } catch (err) {
    console.error('ERROR is:    ', err);
    return formatJSONResponse(
      { message: err.message },
      err.statusCode ?? httpConstants.HTTP_STATUS_INTERNAL_SERVER_ERROR,
    );
  }
};

export const main = middyfy(getRooms);
