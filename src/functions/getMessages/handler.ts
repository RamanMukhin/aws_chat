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

const getMessages: ValidatedEventAPIGatewayProxyEvent<typeof schema> = async (event) => {
  try {
    console.log('Incoming event into getMessages is:   ', event);

    const [userId]: string | undefined = event.requestContext?.authorizer?.principalId.split(' ');
    const { roomId } = event.pathParameters;

    if (!roomId) {
      throw new CustomError('Room was not specified.');
    }

    await checkRoom(roomId, userId);

    const queryCommand = new QueryCommand({
      TableName: TABLE,
      IndexName: GSI_FIRST,
      KeyConditionExpression: '#GSI_PK = :gsi_pk and begins_with(#GSI_SK, :gsi_sk)',
      ExpressionAttributeNames: {
        '#GSI_PK': 'GSI_PK',
        '#GSI_SK': 'GSI_SK',
      },
      ExpressionAttributeValues: {
        ':gsi_pk': DB_MAPPER.ROOM(DB_MAPPER.RAW_PK(roomId)),
        ':gsi_sk': DB_MAPPER.MESSAGE('').replace(END_PK_REG_EXP, ''),
      },
    });

    const { Items: messages } = await dynamoDBDocumentClient.send(queryCommand);

    return formatJSONResponse({ messages });
  } catch (err) {
    console.error('ERROR is:    ', err);
    return formatJSONResponse({ message: err.message }, httpConstants.HTTP_STATUS_INTERNAL_SERVER_ERROR);
  }
};

export const main = middyfy(getMessages);
