import { ApiGatewayManagementApiClient, PostToConnectionCommand } from '@aws-sdk/client-apigatewaymanagementapi';
import { DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { docClient } from '@libs/dynamo-db-doc-client';

export const postToConnections = (url: string, connectionIds: { connectionId: string }[], data: any) => {
  const client = new ApiGatewayManagementApiClient({
    apiVersion: '2018-11-29',
    endpoint: url,
  });

  return connectionIds.map(async ({ connectionId }) => {
    const input = {
      ConnectionId: connectionId,
      Data: Buffer.from(JSON.stringify(data)),
    };

    try {
      const postToConnectionCommand = new PostToConnectionCommand(input);

      await client.send(postToConnectionCommand);
    } catch (err) {
      console.error('PostToConnection ERROR is:    ', err);

      const deleteCommand = new DeleteCommand({
        TableName: process.env.CONNECTIONS_TABLE,
        Key: { connectionId },
      });

      await docClient.send(deleteCommand);
    }
  });
};
