import { DynamoDBClient, DynamoDBClientConfig } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

const configuration: DynamoDBClientConfig =
  process.env.IS_OFFLINE === 'true'
    ? {
        region: 'localhost',
        endpoint: `http://localhost:5000`,
      }
    : {};

export const docClient = DynamoDBDocumentClient.from(new DynamoDBClient(configuration));
