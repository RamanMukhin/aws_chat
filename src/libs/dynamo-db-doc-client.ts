import { DynamoDBClient, DynamoDBClientConfig } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { LOCAL_DYNAMO_DB_ENDPOINT } from 'src/common/constants';

const configuration: DynamoDBClientConfig =
  process.env.IS_OFFLINE === 'true'
    ? {
        region: 'localhost',
        endpoint: LOCAL_DYNAMO_DB_ENDPOINT,
      }
    : {};

export const dynamoDBDocumentClient = DynamoDBDocumentClient.from(new DynamoDBClient(configuration));
