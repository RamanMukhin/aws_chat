import { ApiGatewayManagementApiClient, PostToConnectionCommand } from '@aws-sdk/client-apigatewaymanagementapi';

export const postToConnections = (url: string, connectionIds: { connectionId: string }[], data: any) => {
  const client = new ApiGatewayManagementApiClient({
    apiVersion: '2018-11-29',
    endpoint: url,
  });

  return connectionIds.map(({ connectionId }) => {
    const input = {
      ConnectionId: connectionId,
      Data: Buffer.from(JSON.stringify(data)),
    };

    const command = new PostToConnectionCommand(input);
    return client.send(command);
  });
};
