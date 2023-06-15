import type { ValidatedEventAPIGatewayProxyEvent } from '@libs/api-gateway';
import { formatJSONResponse } from '@libs/api-gateway';
import { dynamoDBDocumentClient } from '../../libs/dynamo-db-doc-client';
import schema from './schema';
import { ScanCommand } from '@aws-sdk/lib-dynamodb';
import { postToConnections } from 'src/common/post-to-connections';
import { createApiGatewayMangementEndpoint } from 'src/common/utils';
import { createApiGatewayMangementApiClient } from '@libs/api-gateway-management-api-client';
import { deleteConnection } from 'src/common/delete-connection';
import { Connection } from 'src/common/types';

const message: ValidatedEventAPIGatewayProxyEvent<typeof schema> = async (event) => {
  try {
    console.log('Incoming event into message is:   ', event);

    const [, , disconnectAt]: string | undefined = event.requestContext?.authorizer?.principalId.split(' ');
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

    const scanCommand = new ScanCommand({
      TableName: process.env.CONNECTIONS_TABLE,
      FilterExpression: '#DYNOBASE_connectionId <> :connectionId',
      ExpressionAttributeNames: {
        '#DYNOBASE_connectionId': 'connectionId',
      },
      ExpressionAttributeValues: {
        ':connectionId': connectionId,
      },
    });

    const { Items } = await dynamoDBDocumentClient.send(scanCommand);
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
    return formatJSONResponse({ message: err.message }, 500);
  }
};

export const main = message;
