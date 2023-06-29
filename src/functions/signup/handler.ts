import { constants as httpConstants } from 'http2';
import { AdminCreateUserCommand, AdminDeleteUserCommand } from '@aws-sdk/client-cognito-identity-provider';
import { formatJSONResponse, ValidatedEventAPIGatewayProxyEvent } from '@libs/api-gateway';
import { middyfy } from '@libs/lambda';
import { cognitoIdentityProviderClient } from '@libs/cognito-identitu-provider-client';
import { dynamoDBDocumentClient } from '@libs/dynamo-db-doc-client';
import schema from './schema';
import { PutCommand } from '@aws-sdk/lib-dynamodb';
import { DB_MAPPER, TABLE } from 'src/common/constants';

const signup: ValidatedEventAPIGatewayProxyEvent<typeof schema> = async (event) => {
  console.log('Incoming event into signup is:   ', event);

  try {
    const createUserCommand = new AdminCreateUserCommand({
      UserPoolId: process.env.USER_POOL_ID,
      Username: event.body.username,
      TemporaryPassword: event.body.password,
    });

    let response = await cognitoIdentityProviderClient.send(createUserCommand);

    const putCommand = new PutCommand({
      TableName: TABLE,
      Item: {
        PK: DB_MAPPER.USER(response.User.Attributes[0].Value),
        SK: DB_MAPPER.ENTITY(),
        userName: response.User.Username,
        createdAt: response.User.UserCreateDate.toISOString(),
        isOnline: false,
      },
    });

    await dynamoDBDocumentClient.send(putCommand);

    return formatJSONResponse({ message: 'success' });
  } catch (err) {
    console.error('ERROR is:    ', err);

    if (err?.$metadata?.httpStatusCode === httpConstants.HTTP_STATUS_BAD_REQUEST) {
      return formatJSONResponse({ message: err.message }, httpConstants.HTTP_STATUS_BAD_REQUEST);
    }

    try {
      const deleteUserCommand = new AdminDeleteUserCommand({
        UserPoolId: process.env.USER_POOL_ID,
        Username: event.body.username,
      });

      const res = await cognitoIdentityProviderClient.send(deleteUserCommand);
      console.log('Deleted incorrectly created user:  ', event.body.username, res);
    } catch (err) {
      console.error('Error while deleting incorrectly created user:  ', err);
    }

    return formatJSONResponse(
      { message: err.message },
      err.statusCode ?? httpConstants.HTTP_STATUS_INTERNAL_SERVER_ERROR,
    );
  }
};

export const main = middyfy(signup);
