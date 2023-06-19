import { v4 as uuidv4 } from 'uuid';
import { constants as httpConstants } from 'http2';
import type { ValidatedEventAPIGatewayProxyEvent } from '@libs/api-gateway';
import { formatJSONResponse } from '@libs/api-gateway';
import { dynamoDBDocumentClient } from '../../libs/dynamo-db-doc-client';
import schema from './schema';
import { PutCommand, QueryCommand, GetCommand } from '@aws-sdk/lib-dynamodb';
import { postToConnections } from 'src/common/post-to-connections';
import { createApiGatewayMangementEndpoint } from 'src/common/utils';
import { createApiGatewayMangementApiClient } from '@libs/api-gateway-management-api-client';
import { deleteConnection } from 'src/common/delete-connection';
import { Connection } from 'src/common/types';
import { DB_MAPPER, MOCK_ROOM, TABLE } from 'src/common/constants';

const message: ValidatedEventAPIGatewayProxyEvent<typeof schema> = async (event) => {
  try {
    console.log('Incoming event into message is:   ', event);

    const [userId, , disconnectAt]: string | undefined = event.requestContext?.authorizer?.principalId.split(' ');
    const {
      requestContext: { connectionId },
    } = event;

    if (disconnectAt && Date.now() - +disconnectAt * 1000 >= 0) {
      console.error('TOKEN EXPIRED.');

      const {
        requestContext: { domainName, stage },
      } = event;
      const endpoint = createApiGatewayMangementEndpoint(domainName, stage);
      const apiGatewayManagementApiClient = createApiGatewayMangementApiClient(endpoint);

      await deleteConnection(apiGatewayManagementApiClient, dynamoDBDocumentClient, connectionId);

      return;
    }

    const getCommand = new GetCommand({
      TableName: TABLE,
      Key: {
        PK: DB_MAPPER.ROOM(MOCK_ROOM),
        SK: DB_MAPPER.ENTITY,
      },
    });

    let { Item: room } = await dynamoDBDocumentClient.send(getCommand);

    if (!room) {
      const putCommand = new PutCommand({
        TableName: TABLE,
        Item: {
          PK: DB_MAPPER.ROOM(MOCK_ROOM),
          SK: DB_MAPPER.ENTITY,
        },
      });

      await dynamoDBDocumentClient.send(putCommand);
    }

    const messageId = uuidv4();

    const putCommand = new PutCommand({
      TableName: TABLE,
      Item: {
        PK: DB_MAPPER.MESSAGE(messageId),
        SK: DB_MAPPER.ENTITY,
        GSI_PK: DB_MAPPER.ROOM(MOCK_ROOM),
        GSI_SK: DB_MAPPER.MESSAGE(messageId),
        userId,
        data: JSON.stringify(event.body),
      },
    });

    await dynamoDBDocumentClient.send(putCommand);

    const queryCommand = new QueryCommand({
      TableName: TABLE,
      IndexName: 'GSI',
      KeyConditionExpression: '#GSI_PK = :gsi_pk and begins_with(#GSI_SK, :gsi_sk)',
      ExpressionAttributeNames: {
        '#GSI_PK': 'GSI_PK',
        '#GSI_SK': 'GSI_SK',
        '#PK': 'PK',
      },
      ExpressionAttributeValues: {
        ':gsi_pk': DB_MAPPER.ENTITY,
        ':gsi_sk': DB_MAPPER.USER('').slice(0, -1),
        ':pk': DB_MAPPER.CONNECTION(connectionId),
      },
      FilterExpression: '#PK <> :pk',
      ScanIndexForward: true,
    });

    const { Items } = await dynamoDBDocumentClient.send(queryCommand);
    console.log('CONNECTIONS:   ', Items);

    if (Items && Items.length) {
      const {
        requestContext: { domainName, stage },
      } = event;
      const endpoint = createApiGatewayMangementEndpoint(domainName, stage);
      const apiGatewayMangementClient = createApiGatewayMangementApiClient(endpoint);

      await Promise.all(
        postToConnections(apiGatewayMangementClient, dynamoDBDocumentClient, Items as any as Connection[], event.body),
      );
    }

    return formatJSONResponse();
  } catch (err) {
    console.error('ERROR is:    ', err);
    return formatJSONResponse({ message: err.message }, httpConstants.HTTP_STATUS_INTERNAL_SERVER_ERROR);
  }
};

export const main = message;
