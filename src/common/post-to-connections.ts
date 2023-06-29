import { ApiGatewayManagementApiClient, PostToConnectionCommand } from '@aws-sdk/client-apigatewaymanagementapi';
import { DeleteCommand, DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { deleteConnection } from './delete-connection';
import { Connection, WEBSOCKET_EVENT_DATA_TYPE } from './types';
import { DB_MAPPER, TABLE } from './constants';

export const postToConnections = (
  apiGatewayManagementApiClient: ApiGatewayManagementApiClient,
  dynamoDBDocumentClient: DynamoDBDocumentClient,
  connections: Connection[],
  data: WEBSOCKET_EVENT_DATA_TYPE,
): Promise<void>[] => {
  return connections.map(async ({ PK: connectionIdPK, disconnectAt }: Connection) => {
    try {
      if (disconnectAt && Date.now() - +disconnectAt * 1000 >= 0) {
        console.error(`Connection ${connectionIdPK} TOKEN EXPIRED.`);

        await deleteConnection(apiGatewayManagementApiClient, dynamoDBDocumentClient, DB_MAPPER.RAW_PK(connectionIdPK));

        return;
      }

      const postToConnectionCommand = new PostToConnectionCommand({
        ConnectionId: DB_MAPPER.RAW_PK(connectionIdPK),
        Data: Buffer.from(JSON.stringify(data)),
      });

      await apiGatewayManagementApiClient.send(postToConnectionCommand);
    } catch (err) {
      console.error('PostToConnection ERROR is:    ', err);

      const deleteCommand = new DeleteCommand({
        TableName: TABLE,
        Key: {
          PK: DB_MAPPER.CONNECTION(DB_MAPPER.RAW_PK(connectionIdPK)),
          SK: DB_MAPPER.ENTITY(),
        },
      });

      await dynamoDBDocumentClient.send(deleteCommand);
    }
  });
};
