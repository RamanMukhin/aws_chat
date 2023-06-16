import { constants as httpConstants } from 'http2';
import type { ValidatedEventAPIGatewayProxyEvent } from '@libs/api-gateway';
import { formatJSONResponse } from '@libs/api-gateway';
import { middyfy } from '@libs/lambda';
import { dynamoDBDocumentClient } from '../../libs/dynamo-db-doc-client';
import schema from './schema';
import { PutCommand } from '@aws-sdk/lib-dynamodb';
import { ConnectionData } from 'src/common/types';
import { DB_MAPPER, TABLE } from 'src/common/constants';

const connect: ValidatedEventAPIGatewayProxyEvent<typeof schema> = async (event) => {
  try {
    console.log('Incoming event into connect is:   ', event);

    const [userId, username, disconnectAt]: string | undefined = (
      event.requestContext?.authorizer?.principalId || ''
    ).split(' ');
    const userData: ConnectionData = {};

    if (event.requestContext.identity.sourceIp) {
      userData.sourceIp = event.requestContext.identity.sourceIp;
    }

    if (userId) {
      userData.userId = userId;
    }

    if (username) {
      userData.username = username;
    }

    if (disconnectAt) {
      userData.disconnectAt = disconnectAt;
    }
    const { connectionId } = event.requestContext;

    const putCommand = new PutCommand({
      TableName: TABLE,
      Item: {
        PK: DB_MAPPER.CONNECTION(connectionId),
        SK: DB_MAPPER.ENTITY,
        GSI_PK: DB_MAPPER.ENTITY,
        GSI_SK: DB_MAPPER.CONNECTION(connectionId),
        ...userData,
      },
    });

    await dynamoDBDocumentClient.send(putCommand);

    return formatJSONResponse();
  } catch (err) {
    console.error('ERROR is:    ', err);
    return formatJSONResponse({ message: err.message }, httpConstants.HTTP_STATUS_INTERNAL_SERVER_ERROR);
  }
};

export const main = middyfy(connect);
