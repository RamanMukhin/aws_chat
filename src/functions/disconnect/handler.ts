import { constants as httpConstants } from 'http2';
import type { ValidatedEventAPIGatewayProxyEvent } from '@libs/api-gateway';
import { formatJSONResponse } from '@libs/api-gateway';
import { middyfy } from '@libs/lambda';
import { dynamoDBDocumentClient } from '../../libs/dynamo-db-doc-client';

import schema from './schema';
import { DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { DB_MAPPER, TABLE } from 'src/common/constants';

const disconnect: ValidatedEventAPIGatewayProxyEvent<typeof schema> = async (event) => {
  try {
    console.log('Incoming event into disconnect is:   ', event);

    const deleteCommand = new DeleteCommand({
      TableName: TABLE,
      Key: {
        PK: DB_MAPPER.CONNECTION(event.requestContext.connectionId),
        SK: DB_MAPPER.ENTITY,
      },
    });

    await dynamoDBDocumentClient.send(deleteCommand);

    return formatJSONResponse();
  } catch (err) {
    console.error('ERROR is:    ', err);
    return formatJSONResponse({ message: err.message }, httpConstants.HTTP_STATUS_INTERNAL_SERVER_ERROR);
  }
};

export const main = middyfy(disconnect);
