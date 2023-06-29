import { constants as httpConstants } from 'http2';
import type { ValidatedEventAPIGatewayProxyEvent } from '@libs/api-gateway';
import { formatJSONResponse } from '@libs/api-gateway';
import { dynamoDBDocumentClient } from '../../libs/dynamo-db-doc-client';
import schema from './schema';
import { createApiGatewayMangementEndpoint, isTokenExpired } from 'src/common/utils';
import { createApiGatewayMangementApiClient } from '@libs/api-gateway-management-api-client';
import { deleteConnection } from 'src/common/delete-connection';
import { DB_MAPPER, MESSAGE_STATUS_TYPES, TABLE, WEBSOCKET_EVENT_TYPES } from 'src/common/constants';
import { CustomError } from 'src/common/errors';
import { middyfyWS } from '@libs/lambda';
import { checkRoom } from 'src/common/check-room';
import { TransactWriteCommand } from '@aws-sdk/lib-dynamodb';
import { postMessageToRoom } from 'src/common/post-to-room';

const setMessageStatus: ValidatedEventAPIGatewayProxyEvent<typeof schema> = async (event) => {
  try {
    console.log('Incoming event into setMessageStatus is:   ', event);

    const [userId, , disconnectAt]: string | undefined = event.requestContext?.authorizer?.principalId.split(' ');
    const endpoint = createApiGatewayMangementEndpoint(event.requestContext.domainName, event.requestContext.stage);

    if (isTokenExpired(disconnectAt)) {
      console.error('TOKEN EXPIRED.');

      const apiGatewayManagementApiClient = createApiGatewayMangementApiClient(endpoint);

      await deleteConnection(apiGatewayManagementApiClient, dynamoDBDocumentClient, event.requestContext.connectionId);

      return;
    }

    const { roomId, status, messageIds } = event.body;

    if (
      !status ||
      !(status in MESSAGE_STATUS_TYPES) ||
      typeof roomId !== 'string' ||
      !messageIds ||
      !Array.isArray(messageIds) ||
      !messageIds.length ||
      messageIds.some((messageId) => typeof messageId !== 'string')
    ) {
      throw new CustomError(
        "Message id's, roomId or status were not specified or incorrect",
        httpConstants.HTTP_STATUS_BAD_REQUEST,
      );
    }

    await checkRoom(roomId, userId);

    const transactWriteCommand = new TransactWriteCommand({
      TransactItems: messageIds.map((messageId) => ({
        Update: {
          TableName: TABLE,
          Key: {
            PK: DB_MAPPER.MESSAGE(DB_MAPPER.RAW_PK(messageId)),
            SK: DB_MAPPER.ENTITY(),
          },
          ConditionExpression: 'GSI_PK = :GSI_PK and GSI_SK = :GSI_SK',
          UpdateExpression: 'SET #status = :status, updatedAt = :updatedAt',
          ExpressionAttributeValues: {
            ':status': status,
            ':updatedAt': new Date().toISOString(),
            ':GSI_PK': DB_MAPPER.ROOM(DB_MAPPER.RAW_PK(roomId)),
            ':GSI_SK': DB_MAPPER.MESSAGE(DB_MAPPER.RAW_PK(messageId)),
          },
          ExpressionAttributeNames: {
            '#status': 'status',
          },
        },
      })),
    });

    try {
      await dynamoDBDocumentClient.send(transactWriteCommand);
    } catch (err) {
      if (
        err.CancellationReasons &&
        err.CancellationReasons.some((it: { Code: string; Message: string }) => it.Code === 'ConditionalCheckFailed')
      ) {
        throw new CustomError("Room doesn't have such messages", httpConstants.HTTP_STATUS_BAD_REQUEST);
      }

      throw err;
    }

    const apiGatewayMangementApiClient = createApiGatewayMangementApiClient(endpoint);

    await postMessageToRoom(apiGatewayMangementApiClient, dynamoDBDocumentClient, roomId, {
      type: WEBSOCKET_EVENT_TYPES.messageStatusUpdated,
      data: { messageIds, status },
    });

    return formatJSONResponse();
  } catch (err) {
    console.error('ERROR is:    ', err);
    return formatJSONResponse(
      { message: err.message },
      err.statusCode ?? httpConstants.HTTP_STATUS_INTERNAL_SERVER_ERROR,
    );
  }
};

export const main = middyfyWS(setMessageStatus);
