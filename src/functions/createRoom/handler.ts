import { v4 as uuidv4 } from 'uuid';
import { constants as httpConstants } from 'http2';
import type { ValidatedEventAPIGatewayProxyEvent } from '@libs/api-gateway';
import { formatJSONResponse } from '@libs/api-gateway';
import { middyfy } from '@libs/lambda';
import { dynamoDBDocumentClient } from '../../libs/dynamo-db-doc-client';
import schema from './schema';
import { TransactWriteCommand, BatchGetCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { DB_MAPPER, ROOM_TYPES, TABLE } from 'src/common/constants';
import { CustomError } from 'src/common/errors';

const createRoom: ValidatedEventAPIGatewayProxyEvent<typeof schema> = async (event) => {
  try {
    console.log('Incoming event into createRoom is:   ', event);

    const [userId]: string | undefined = (event.requestContext?.authorizer?.principalId || '').split(' ');

    const participants = [...new Set([userId, ...event.body.participants])];

    if (participants.length < 2) {
      throw new CustomError('Cannot create oneself room.', httpConstants.HTTP_STATUS_BAD_REQUEST);
    }

    const roomId = uuidv4();

    const usersRoomsCreateInput: {
      Put: {
        TableName: string;
        Item: Record<string, string>;
      };
    }[] = [];
    const usersGetInput: { PK: string; SK: string }[] = [];

    participants.forEach((userId) => {
      usersRoomsCreateInput.push({
        Put: {
          TableName: TABLE,
          Item: {
            PK: DB_MAPPER.USER(userId),
            SK: DB_MAPPER.ROOM(roomId),
            GSI_PK: DB_MAPPER.ROOM(roomId),
            GSI_SK: DB_MAPPER.USER(userId),
          },
        },
      });

      usersGetInput.push({
        PK: DB_MAPPER.USER(userId),
        SK: DB_MAPPER.ENTITY,
      });
    });

    const batchGetCommand = new BatchGetCommand({
      RequestItems: {
        [TABLE]: {
          Keys: usersGetInput,
        },
      },
    });

    const { Responses } = await dynamoDBDocumentClient.send(batchGetCommand);

    if (Responses && Responses[TABLE] && Responses[TABLE].length !== participants.length) {
      throw new CustomError('Check userIds you provided.', httpConstants.HTTP_STATUS_BAD_REQUEST);
    }

    let interlocutorId: string;

    if (event.body.type === ROOM_TYPES.PRIVATE) {
      interlocutorId = participants.filter((it) => it !== userId)[0];

      const queryCommand = (userId: string, interlocutorId: string) =>
        new QueryCommand({
          TableName: TABLE,
          IndexName: 'GSI',
          KeyConditionExpression: '#GSI_PK = :gsi_pk and #GSI_SK = :gsi_sk',
          ExpressionAttributeNames: {
            '#GSI_PK': 'GSI_PK',
            '#GSI_SK': 'GSI_SK',
          },
          ExpressionAttributeValues: {
            ':gsi_pk': DB_MAPPER.USER(interlocutorId),
            ':gsi_sk': DB_MAPPER.USER(userId),
          },
        });

      const { Items: first_items } = await dynamoDBDocumentClient.send(queryCommand(userId, interlocutorId));
      const { Items: second_items } = await dynamoDBDocumentClient.send(queryCommand(interlocutorId, userId));

      if (first_items.length || second_items.length) {
        throw new CustomError('The room already exists.', httpConstants.HTTP_STATUS_BAD_REQUEST);
      }
    }

    const conditionalRoomData =
      event.body.type === ROOM_TYPES.PRIVATE
        ? {
            GSI_PK: DB_MAPPER.USER(userId),
            GSI_SK: DB_MAPPER.USER(interlocutorId),
          }
        : { name: event.body.name || 'Group talk' };

    const transactWriteCommand = new TransactWriteCommand({
      TransactItems: [
        {
          Put: {
            TableName: TABLE,
            Item: {
              PK: DB_MAPPER.ROOM(roomId),
              SK: DB_MAPPER.ENTITY,
              owner: DB_MAPPER.USER(userId),
              type: event.body.type,
              ...conditionalRoomData,
            },
          },
        },
        ...usersRoomsCreateInput,
      ],
    });

    await dynamoDBDocumentClient.send(transactWriteCommand);

    return formatJSONResponse({ message: 'success' }, httpConstants.HTTP_STATUS_CREATED);
  } catch (err) {
    console.error('ERROR is:    ', err);
    return formatJSONResponse({ message: err.message }, httpConstants.HTTP_STATUS_INTERNAL_SERVER_ERROR);
  }
};

export const main = middyfy(createRoom);
