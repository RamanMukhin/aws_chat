import { constants as httpConstants } from 'http2';
import { GetCommand } from '@aws-sdk/lib-dynamodb';
import { DB_MAPPER, TABLE } from './constants';
import { dynamoDBDocumentClient } from '@libs/dynamo-db-doc-client';
import { CustomError } from './errors';

export const checkRoom = async (roomId: string, userId: string): Promise<void> => {
  const getCommand = new GetCommand({
    TableName: TABLE,
    Key: {
      PK: DB_MAPPER.USER(DB_MAPPER.RAW_PK(userId)),
      SK: DB_MAPPER.ROOM(DB_MAPPER.RAW_PK(roomId)),
    },
  });

  let { Item: room } = await dynamoDBDocumentClient.send(getCommand);

  if (!room) {
    throw new CustomError("Room doesn't exist", httpConstants.HTTP_STATUS_NOT_FOUND);
  }
};
