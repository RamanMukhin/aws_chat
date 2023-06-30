import { ApiGatewayManagementApiClient, DeleteConnectionCommand } from '@aws-sdk/client-apigatewaymanagementapi';
import { DeleteCommand, DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { DB_MAPPER, TABLE } from './constants';

export const deleteConnection = async (
  apiGatewayManagementApiClient: ApiGatewayManagementApiClient,
  dynamoDBDocumentClient: DynamoDBDocumentClient,
  connectionId: string,
): Promise<void> => {
  const deleteConnectionCommand = new DeleteConnectionCommand({
    ConnectionId: connectionId,
  });

  const deleteCommand = new DeleteCommand({
    TableName: TABLE,
    Key: {
      PK: DB_MAPPER.CONNECTION(connectionId),
      SK: DB_MAPPER.ENTITY(),
    },
  });

  try {
    await apiGatewayManagementApiClient.send(deleteConnectionCommand);
    await dynamoDBDocumentClient.send(deleteCommand);
  } catch (err) {
    console.error('DeleteConnection ERROR is:    ', err);
  }
};
