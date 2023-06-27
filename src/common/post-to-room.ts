import { DB_MAPPER, END_PK_REG_EXP, GSI_FIRST, TABLE } from './constants';
import { Connection, RoomUser } from './types';
import { DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { postToConnections } from './post-to-connections';
import { ApiGatewayManagementApiClient } from '@aws-sdk/client-apigatewaymanagementapi';

export const postMessageToRoom = async (
  apiGatewayManagementApiClient: ApiGatewayManagementApiClient,
  dynamoDBDocumentClient: DynamoDBDocumentClient,
  roomId: string,
  message: any,
): Promise<void> => {
  const queryCommandRoomUsers = new QueryCommand({
    TableName: TABLE,
    IndexName: GSI_FIRST,
    KeyConditionExpression: 'GSI_PK = :gsi_pk and begins_with(GSI_SK, :gsi_sk)',
    ExpressionAttributeValues: {
      ':gsi_pk': DB_MAPPER.ROOM(DB_MAPPER.RAW_PK(roomId)),
      ':gsi_sk': DB_MAPPER.USER('').replace(END_PK_REG_EXP, ''),
    },
  });

  const roomUsers = (await dynamoDBDocumentClient.send(queryCommandRoomUsers)).Items as RoomUser[];

  const connections: Connection[] = [];

  await Promise.all(
    roomUsers.map(async (roomUser) => {
      const queryCommandConnection = new QueryCommand({
        TableName: TABLE,
        IndexName: GSI_FIRST,
        KeyConditionExpression: 'GSI_PK = :gsi_pk and GSI_SK = :gsi_sk',
        ExpressionAttributeValues: {
          ':gsi_pk': DB_MAPPER.ENTITY(),
          ':gsi_sk': DB_MAPPER.USER(DB_MAPPER.RAW_PK(roomUser.PK)),
        },
      });

      const Items = (await dynamoDBDocumentClient.send(queryCommandConnection)).Items as Connection[];

      return connections.push(...Items);
    }),
  );

  console.log('CONNECTIONS:   ', connections);

  if (connections.length) {
    await Promise.all(postToConnections(apiGatewayManagementApiClient, dynamoDBDocumentClient, connections, message));
  }
};
