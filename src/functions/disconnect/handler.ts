import { constants as httpConstants } from 'http2';
import type { ValidatedEventAPIGatewayProxyEvent } from '@libs/api-gateway';
import { formatJSONResponse } from '@libs/api-gateway';
import { middyfy } from '@libs/lambda';
import { dynamoDBDocumentClient } from '../../libs/dynamo-db-doc-client';

import schema from './schema';
import { DeleteCommand, QueryCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { DB_MAPPER, GSI_FIRST, TABLE } from 'src/common/constants';

const disconnect: ValidatedEventAPIGatewayProxyEvent<typeof schema> = async (event) => {
  try {
    console.log('Incoming event into disconnect is:   ', event);

    const [userId]: string | undefined = (event.requestContext?.authorizer?.principalId || '').split(' ');

    const deleteCommand = new DeleteCommand({
      TableName: TABLE,
      Key: {
        PK: DB_MAPPER.CONNECTION(event.requestContext.connectionId),
        SK: DB_MAPPER.ENTITY,
      },
    });

    await dynamoDBDocumentClient.send(deleteCommand);

    const queryCommand = new QueryCommand({
      TableName: TABLE,
      IndexName: GSI_FIRST,
      KeyConditionExpression: '#GSI_PK = :gsi_pk and #GSI_SK = :gsi_sk',
      ExpressionAttributeNames: {
        '#GSI_PK': 'GSI_PK',
        '#GSI_SK': 'GSI_SK',
      },
      ExpressionAttributeValues: {
        ':gsi_pk': DB_MAPPER.ENTITY,
        ':gsi_sk': DB_MAPPER.USER(userId),
      },
    });

    const { Items } = await dynamoDBDocumentClient.send(queryCommand);
    console.log('ALIVE USER CONNECTIONS:   ', Items);

    if (Items && !Items.length) {
      const updateCommand = new UpdateCommand({
        TableName: TABLE,
        Key: {
          PK: DB_MAPPER.USER(userId),
          SK: DB_MAPPER.ENTITY,
        },
        UpdateExpression: 'set isOnline = :isOnline',
        ExpressionAttributeValues: {
          ':isOnline': false,
        },
      });

      await dynamoDBDocumentClient.send(updateCommand);
    }

    return formatJSONResponse();
  } catch (err) {
    console.error('ERROR is:    ', err);
    return formatJSONResponse({ message: err.message }, httpConstants.HTTP_STATUS_INTERNAL_SERVER_ERROR);
  }
};

export const main = middyfy(disconnect);
