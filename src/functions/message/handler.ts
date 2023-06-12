import { format } from 'util';
import type { ValidatedEventAPIGatewayProxyEvent } from '@libs/api-gateway';
import { formatJSONResponse } from '@libs/api-gateway';
import { docClient } from '../../libs/dynamo-db-doc-client';

import schema from './schema';
import { ScanCommand } from '@aws-sdk/lib-dynamodb';
import { postToConnections } from 'src/common/post-to-connections';

const message: ValidatedEventAPIGatewayProxyEvent<typeof schema> = async (event) => {
  try {
    console.log('Incoming event into message is:   ', event);

    const scanCommand = new ScanCommand({
      TableName: process.env.CONNECTIONS_TABLE,
      FilterExpression: '#DYNOBASE_connectionId <> :connectionId',
      ExpressionAttributeNames: {
        '#DYNOBASE_connectionId': 'connectionId',
      },
      ExpressionAttributeValues: {
        ':connectionId': event.requestContext.connectionId,
      },
    });

    const { Items } = await docClient.send(scanCommand);
    console.log('CONNECTIONS:   ', Items);

    if (Items && Items.length) {
      const domain = event.requestContext.domainName;
      const stage = event.requestContext.stage;
      const callbackUrl = format(format('https://%s/%s', domain, stage));
      const url = stage === 'local' ? 'http://localhost:3001' : callbackUrl;

      await Promise.all(postToConnections(url, Items as any, event.body));
    }

    return formatJSONResponse();
  } catch (err) {
    console.error('ERROR is:    ', err);
    return formatJSONResponse({ message: err.message }, 500);
  }
};

export const main = message;
