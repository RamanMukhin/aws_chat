import { constants as httpConstants } from 'http2';
import { CustomError } from './errors';
import { QueryCommand } from '@aws-sdk/lib-dynamodb';
import { DB_MAPPER, TABLE } from './constants';
import { dynamoDBDocumentClient } from '@libs/dynamo-db-doc-client';
import { DB_ENTITY_NAME, Entity, EntityWithGSI } from './types';

export const getExclusiveStartKey = async (
  queryStringParameters: Record<string, string>,
  PK_NAME: DB_ENTITY_NAME,
  SK_NAME: DB_ENTITY_NAME,
  searchByGSI = false,
): Promise<Entity | EntityWithGSI> => {
  const [PK, SK] = queryStringParameters.last.split(':');

  if (!PK || !SK) {
    throw new CustomError('Invalid "last" parameter', httpConstants.HTTP_STATUS_BAD_REQUEST);
  }

  const queryCommand = new QueryCommand({
    TableName: TABLE,
    KeyConditionExpression: 'PK = :pk and SK = :sk',
    ExpressionAttributeValues: {
      ':pk': DB_MAPPER[PK_NAME](DB_MAPPER.RAW_PK(PK)),
      ':sk': DB_MAPPER[SK_NAME](DB_MAPPER.RAW_PK(SK)),
    },
  });

  const Items = (await dynamoDBDocumentClient.send(queryCommand)).Items;

  if (!Items || !Items.length) {
    throw new CustomError('Invalid "last" parameter', httpConstants.HTTP_STATUS_BAD_REQUEST);
  }

  const item = Items[0];

  return searchByGSI
    ? {
        PK: item.PK,
        SK: item.SK,
        GSI_PK: item.GSI_PK,
        GSI_SK: item.GSI_SK,
      }
    : {
        PK: item.PK,
        SK: item.SK,
      };
};
