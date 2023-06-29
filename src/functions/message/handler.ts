import { constants as httpConstants } from 'http2';
import type { ValidatedEventAPIGatewayProxyEvent } from '@libs/api-gateway';
import { formatJSONResponse } from '@libs/api-gateway';
import { dynamoDBDocumentClient } from '../../libs/dynamo-db-doc-client';
import schema from './schema';
import { createApiGatewayMangementEndpoint } from 'src/common/utils';
import { createApiGatewayMangementApiClient } from '@libs/api-gateway-management-api-client';
import { deleteConnection } from 'src/common/delete-connection';
import { MESSAGE_TYPES } from 'src/common/constants';
import { CustomError } from 'src/common/errors';
import { middyfyWS } from '@libs/lambda';
import { checkRoom } from 'src/common/check-room';
import { saveAndSendMessage } from 'src/common/save-and-send-message';

const message: ValidatedEventAPIGatewayProxyEvent<typeof schema> = async (event) => {
  try {
    console.log('Incoming event into message is:   ', event);

    const [userId, , disconnectAt]: string | undefined = event.requestContext?.authorizer?.principalId.split(' ');
    const endpoint = createApiGatewayMangementEndpoint(event.requestContext.domainName, event.requestContext.stage);

    if (disconnectAt && Date.now() - +disconnectAt * 1000 >= 0) {
      console.error('TOKEN EXPIRED.');

      const apiGatewayManagementApiClient = createApiGatewayMangementApiClient(endpoint);

      await deleteConnection(apiGatewayManagementApiClient, dynamoDBDocumentClient, event.requestContext.connectionId);

      return;
    }

    const { roomId, message: messageData } = event.body;

    if (!roomId || !messageData) {
      throw new CustomError('Room or message was not specified', httpConstants.HTTP_STATUS_BAD_REQUEST);
    }

    await checkRoom(roomId, userId);

    await saveAndSendMessage(
      dynamoDBDocumentClient,
      roomId,
      userId,
      MESSAGE_TYPES.text,
      {
        data: messageData,
      },
      endpoint,
    );

    return formatJSONResponse();
  } catch (err) {
    console.error('ERROR is:    ', err);
    return formatJSONResponse({ message: err.message }, httpConstants.HTTP_STATUS_INTERNAL_SERVER_ERROR);
  }
};

export const main = middyfyWS(message);
