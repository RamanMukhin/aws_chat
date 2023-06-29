import { constants as httpConstants } from 'http2';
import type { ValidatedEventAPIGatewayProxyEvent } from '@libs/api-gateway';
import { formatJSONResponse } from '@libs/api-gateway';
import { middyfy } from '@libs/lambda';
import { dynamoDBDocumentClient } from '../../libs/dynamo-db-doc-client';
import schema from './schema';
import { QueryCommand } from '@aws-sdk/lib-dynamodb';
import { DB_MAPPER, END_PK_REG_EXP, GSI_FIRST, TABLE } from 'src/common/constants';
import { CustomError } from 'src/common/errors';
import { checkRoom } from 'src/common/check-room';
import { Entity, EntityWithGSI } from 'src/common/types';
import { getExclusiveStartKey } from 'src/common/get-exclusive-start-key';
import { getLastEvaluatedKey } from 'src/common/utils';

const getMessages: ValidatedEventAPIGatewayProxyEvent<typeof schema> = async (event) => {
  try {
    console.log('Incoming event into getMessages is:   ', event);

    const [userId]: string | undefined = event.requestContext?.authorizer?.principalId.split(' ');
    const {
      queryStringParameters,
      pathParameters: { roomId },
    } = event;

    if (!roomId) {
      throw new CustomError('Room was not specified.');
    }

    await checkRoom(roomId, userId);

    let ExclusiveStartKey: Entity | EntityWithGSI;

    if (queryStringParameters && queryStringParameters.last) {
      ExclusiveStartKey = await getExclusiveStartKey(
        queryStringParameters,
        DB_MAPPER.NAME.MESSAGE,
        DB_MAPPER.NAME.ENTITY,
        true,
      );
    }

    const queryCommand = new QueryCommand({
      TableName: TABLE,
      IndexName: GSI_FIRST,
      ExclusiveStartKey,
      Limit: DB_MAPPER.LIMIT.MESSAGE(queryStringParameters && queryStringParameters.limit),
      KeyConditionExpression: 'GSI_PK = :gsi_pk and begins_with(GSI_SK, :gsi_sk)',
      ExpressionAttributeValues: {
        ':gsi_pk': DB_MAPPER.ROOM(DB_MAPPER.RAW_PK(roomId)),
        ':gsi_sk': DB_MAPPER.MESSAGE('').replace(END_PK_REG_EXP, ''),
      },
    });

    const { Items: messages, LastEvaluatedKey } = await dynamoDBDocumentClient.send(queryCommand);

    let last = null;

    if (LastEvaluatedKey) {
      last = getLastEvaluatedKey(LastEvaluatedKey);
    }

    return formatJSONResponse({ messages, last });
  } catch (err) {
    console.error('ERROR is:    ', err);
    return formatJSONResponse(
      { message: err.message },
      err.statusCode ?? httpConstants.HTTP_STATUS_INTERNAL_SERVER_ERROR,
    );
  }
};

export const main = middyfy(getMessages);
