import { ApiGatewayManagementApiClient, DeleteConnectionCommand } from '@aws-sdk/client-apigatewaymanagementapi';
import { DeleteCommand, DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

export const deleteConnection = async (
  apiGatewayManagementApiClient: ApiGatewayManagementApiClient,
  dynamoDBDocumentClient: DynamoDBDocumentClient,
  connectionId: string,
) => {
  const deleteConnectionCommand = new DeleteConnectionCommand({
    ConnectionId: connectionId,
  });

  const deleteCommand = new DeleteCommand({
    TableName: process.env.CONNECTIONS_TABLE,
    Key: { connectionId },
  });

  try {
    await apiGatewayManagementApiClient.send(deleteConnectionCommand);
    await dynamoDBDocumentClient.send(deleteCommand);
  } catch (err) {
    console.error('DeleteConnection ERROR is:    ', err);
  }
};
