import type { ValidatedEventAPIGatewayProxyEvent } from '@libs/api-gateway';
import { formatJSONResponse } from '@libs/api-gateway';
import { middyfy } from '@libs/lambda';
import { docClient } from '../../libs/dynamo-db-doc-client';

import schema from './schema';
import { PutCommand } from '@aws-sdk/lib-dynamodb';

const connect: ValidatedEventAPIGatewayProxyEvent<typeof schema> = async (event) => {
  try {
    console.log('Incoming event into connect is:   ', event);

    const [userId, username]: string | undefined = event.requestContext?.authorizer?.principalId.split(' ');
    const userData: { userId?: string; username?: string } = {};

    if (userId) {
      userData.userId = userId;
    }

    if (username) {
      userData.username = username;
    }

    const command = new PutCommand({
      TableName: process.env.CONNECTIONS_TABLE,
      Item: {
        connectionId: event.requestContext.connectionId,
        ...userData,
      },
    });

    await docClient.send(command);

    return formatJSONResponse();
  } catch (err) {
    console.error('ERROR is:    ', err);
    return formatJSONResponse({ message: err.message }, 500);
  }
};

export const main = middyfy(connect);
