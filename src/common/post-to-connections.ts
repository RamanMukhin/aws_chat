import { ApiGatewayManagementApiClient, PostToConnectionCommand } from '@aws-sdk/client-apigatewaymanagementapi';
import { DeleteCommand, DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { deleteConnection } from './delete-connection';
import { Connection } from './types';

export const postToConnections = (
  apiGatewayManagementApiClient: ApiGatewayManagementApiClient,
  dynamoDBDocumentClient: DynamoDBDocumentClient,
  connections: Connection[],
  data: any,
): Promise<void>[] => {
  return connections.map(async ({ connectionId, disconnectAt }: Connection) => {
    try {
      if (disconnectAt && Date.now() - +disconnectAt * 1000 >= 0) {
        console.error(`Connection ${connectionId} TOKEN EXPIRED.`);

        await deleteConnection(apiGatewayManagementApiClient, dynamoDBDocumentClient, connectionId);

        return;
      }

      const postToConnectionCommand = new PostToConnectionCommand({
        ConnectionId: connectionId,
        Data: Buffer.from(JSON.stringify(data)),
      });

      await apiGatewayManagementApiClient.send(postToConnectionCommand);
    } catch (err) {
      console.error('PostToConnection ERROR is:    ', err);

      const deleteCommand = new DeleteCommand({
        TableName: process.env.CONNECTIONS_TABLE,
        Key: { connectionId },
      });

      await dynamoDBDocumentClient.send(deleteCommand);
    }
  });
};
