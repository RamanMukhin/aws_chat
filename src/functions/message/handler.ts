import { v4 as uuidv4 } from 'uuid';
import { constants as httpConstants } from 'http2';
import type { ValidatedEventAPIGatewayProxyEvent } from '@libs/api-gateway';
import { formatJSONResponse } from '@libs/api-gateway';
import { dynamoDBDocumentClient } from '../../libs/dynamo-db-doc-client';
import schema from './schema';
import { UpdateCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { postToConnections } from 'src/common/post-to-connections';
import { createApiGatewayMangementEndpoint } from 'src/common/utils';
import { createApiGatewayMangementApiClient } from '@libs/api-gateway-management-api-client';
import { deleteConnection } from 'src/common/delete-connection';
import { Connection, RoomUser } from 'src/common/types';
import { DB_MAPPER, END_PK_REG_EXP, TABLE } from 'src/common/constants';
import { CustomError } from 'src/common/errors';
import { middyfyWS } from '@libs/lambda';
import { checkRoom } from 'src/common/check-room';

const message: ValidatedEventAPIGatewayProxyEvent<typeof schema> = async (event) => {
  try {
    console.log('Incoming event into message is:   ', event);

    const [userId, , disconnectAt]: string | undefined = event.requestContext?.authorizer?.principalId.split(' ');
    const {
      requestContext: { connectionId },
    } = event;

    if (disconnectAt && Date.now() - +disconnectAt * 1000 >= 0) {
      console.error('TOKEN EXPIRED.');

      const {
        requestContext: { domainName, stage },
      } = event;
      const endpoint = createApiGatewayMangementEndpoint(domainName, stage);
      const apiGatewayManagementApiClient = createApiGatewayMangementApiClient(endpoint);

      await deleteConnection(apiGatewayManagementApiClient, dynamoDBDocumentClient, connectionId);

      return;
    }

    const { roomId, message: messageData } = event.body;

    if (!roomId || !messageData) {
      throw new CustomError('Room or message was not specified', httpConstants.HTTP_STATUS_BAD_REQUEST);
    }

    await checkRoom(roomId, userId);

    const messageId = uuidv4();

    const updateCommand = new UpdateCommand({
      TableName: TABLE,
      Key: {
        PK: DB_MAPPER.MESSAGE(messageId),
        SK: DB_MAPPER.ENTITY,
      },
      UpdateExpression:
        'SET GSI_PK = :GSI_PK, GSI_SK = :GSI_SK, userId = :userId, #data = :data, createdAt = :createdAt',
      ExpressionAttributeValues: {
        ':GSI_PK': DB_MAPPER.ROOM(DB_MAPPER.RAW_PK(roomId)),
        ':GSI_SK': DB_MAPPER.MESSAGE(messageId),
        ':userId': userId,
        ':data': JSON.stringify(messageData),
        ':createdAt': new Date().toISOString(),
      },
      ExpressionAttributeNames: {
        '#data': 'data',
      },
      ReturnValues: 'ALL_NEW',
    });

    const { Attributes: message } = await dynamoDBDocumentClient.send(updateCommand);

    const queryCommandRoomUsers = new QueryCommand({
      TableName: TABLE,
      IndexName: 'GSI',
      KeyConditionExpression: '#GSI_PK = :gsi_pk and begins_with(#GSI_SK, :gsi_sk)',
      ExpressionAttributeNames: {
        '#GSI_PK': 'GSI_PK',
        '#GSI_SK': 'GSI_SK',
      },
      ExpressionAttributeValues: {
        ':gsi_pk': DB_MAPPER.ROOM(DB_MAPPER.RAW_PK(roomId)),
        ':gsi_sk': DB_MAPPER.USER('').replace(END_PK_REG_EXP, ''),
      },
    });

    const roomUsers = (await dynamoDBDocumentClient.send(queryCommandRoomUsers)).Items as RoomUser[];

    const connections = await Promise.all(
      roomUsers.map(async (it) => {
        const userId = DB_MAPPER.RAW_PK(it.PK);

        const queryCommandConnection = new QueryCommand({
          TableName: TABLE,
          IndexName: 'GSI',
          KeyConditionExpression: '#GSI_PK = :gsi_pk and #GSI_SK = :gsi_sk',
          ExpressionAttributeNames: {
            '#GSI_PK': 'GSI_PK',
            '#GSI_SK': 'GSI_SK',
          },
          ExpressionAttributeValues: {
            ':gsi_pk': DB_MAPPER.ENTITY,
            ':gsi_sk': DB_MAPPER.USER(userId),
          },
        });

        const connections = (await dynamoDBDocumentClient.send(queryCommandConnection)).Items as Connection[];

        return connections && connections[0];
      }),
    );

    console.log('CONNECTIONS:   ', connections);

    if (connections.length) {
      const {
        requestContext: { domainName, stage },
      } = event;
      const endpoint = createApiGatewayMangementEndpoint(domainName, stage);
      const apiGatewayMangementClient = createApiGatewayMangementApiClient(endpoint);

      await Promise.all(postToConnections(apiGatewayMangementClient, dynamoDBDocumentClient, connections, message));
    }

    return formatJSONResponse();
  } catch (err) {
    console.error('ERROR is:    ', err);
    return formatJSONResponse({ message: err.message }, httpConstants.HTTP_STATUS_INTERNAL_SERVER_ERROR);
  }
};

export const main = middyfyWS(message);
