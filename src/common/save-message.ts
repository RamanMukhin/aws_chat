import { DynamoDBDocumentClient, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';
import { DB_MAPPER, TABLE } from './constants';

export const saveMessageToRoom = async (
  dynamoDBDocumentClient: DynamoDBDocumentClient,
  roomId: string,
  userId: string,
  messageType: string,
  messageData: any,
): Promise<Record<string, any>> => {
  const messageId = uuidv4();

  const updateCommand = new UpdateCommand({
    TableName: TABLE,
    Key: {
      PK: DB_MAPPER.MESSAGE(messageId),
      SK: DB_MAPPER.ENTITY(),
    },
    UpdateExpression:
      'SET GSI_PK = :GSI_PK, GSI_SK = :GSI_SK, #type = :type, userId = :userId, #data = :data, createdAt = :createdAt',
    ExpressionAttributeValues: {
      ':GSI_PK': DB_MAPPER.ROOM(DB_MAPPER.RAW_PK(roomId)),
      ':GSI_SK': DB_MAPPER.MESSAGE(messageId),
      ':type': messageType,
      ':userId': userId,
      ':data': JSON.stringify(messageData),
      ':createdAt': new Date().toISOString(),
    },
    ExpressionAttributeNames: {
      '#data': 'data',
      '#type': 'type',
    },
    ReturnValues: 'ALL_NEW',
  });

  const { Attributes: message } = await dynamoDBDocumentClient.send(updateCommand);

  return message;
};
