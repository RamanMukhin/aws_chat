import type { ValidatedEventAPIGatewayProxyEvent } from '@libs/api-gateway';
import { formatJSONResponse } from '@libs/api-gateway';
import { middyfy } from '@libs/lambda';
import { dynamoDBDocumentClient } from '../../libs/dynamo-db-doc-client';

import schema from './schema';
import { PutCommand } from '@aws-sdk/lib-dynamodb';
import { ConnectionData } from 'src/common/types';

const connect: ValidatedEventAPIGatewayProxyEvent<typeof schema> = async (event) => {
  try {
    console.log('Incoming event into connect is:   ', event);

    const [userId, username, disconnectAt]: string | undefined = (
      event.requestContext?.authorizer?.principalId || ''
    ).split(' ');
    const userData: ConnectionData = {};

    if (userId) {
      userData.userId = userId;
    }

    if (username) {
      userData.username = username;
    }

    if (disconnectAt) {
      userData.disconnectAt = disconnectAt;
    }

    const putCommand = new PutCommand({
      TableName: process.env.CONNECTIONS_TABLE,
      Item: {
        connectionId: event.requestContext.connectionId,
        ...userData,
      },
    });

    await dynamoDBDocumentClient.send(putCommand);

    return formatJSONResponse();
  } catch (err) {
    console.error('ERROR is:    ', err);
    return formatJSONResponse({ message: err.message }, 500);
  }
};

export const main = middyfy(connect);
