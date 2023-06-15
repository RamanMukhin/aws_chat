import type { ValidatedEventAPIGatewayProxyEvent } from '@libs/api-gateway';
import { formatJSONResponse } from '@libs/api-gateway';
import { middyfy } from '@libs/lambda';
import { dynamoDBDocumentClient } from '../../libs/dynamo-db-doc-client';

import schema from './schema';
import { DeleteCommand } from '@aws-sdk/lib-dynamodb';

const disconnect: ValidatedEventAPIGatewayProxyEvent<typeof schema> = async (event) => {
  try {
    console.log('Incoming event into disconnect is:   ', event);

    const deleteCommand = new DeleteCommand({
      TableName: process.env.CONNECTIONS_TABLE,
      Key: { connectionId: event.requestContext.connectionId },
    });

    await dynamoDBDocumentClient.send(deleteCommand);

    return formatJSONResponse();
  } catch (err) {
    console.error('ERROR is:    ', err);
    return formatJSONResponse({ message: err.message }, 500);
  }
};

export const main = middyfy(disconnect);
