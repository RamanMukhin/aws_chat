import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { saveMessageToRoom } from './save-message';
import { MESSAGE_TYPES, WEBSOCKET_EVENT_TYPES } from './constants';
import { MESSAGE_DATA_TYPE, MESSAGE_TYPE } from './types';
import { createApiGatewayMangementEndpoint } from './utils';
import { createApiGatewayMangementApiClient } from '@libs/api-gateway-management-api-client';
import { postMessageToRoom } from './post-to-room';

export const saveAndSendMessage = async (
  dynamoDBDocumentClient: DynamoDBDocumentClient,
  roomId: string,
  userId: string,
  messageType: MESSAGE_TYPE,
  messageData: MESSAGE_DATA_TYPE,
  url?: string,
): Promise<void> => {
  const message = await saveMessageToRoom(
    dynamoDBDocumentClient,
    roomId,
    userId,
    MESSAGE_TYPES[messageType],
    messageData,
  );

  const endpoint = url ? url : createApiGatewayMangementEndpoint();

  const apiGatewayMangementApiClient = createApiGatewayMangementApiClient(endpoint);

  await postMessageToRoom(apiGatewayMangementApiClient, dynamoDBDocumentClient, roomId, {
    type: WEBSOCKET_EVENT_TYPES.newMessage,
    data: message,
  });
};
