import { createHmac } from 'crypto';
import { constants as httpConstants } from 'http2';
import {
  AdminInitiateAuthCommand,
  AdminRespondToAuthChallengeCommand,
  AdminInitiateAuthResponse,
  DescribeUserPoolClientCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import { formatJSONResponse, ValidatedEventAPIGatewayProxyEvent } from '@libs/api-gateway';
import { middyfy } from '@libs/lambda';
import { cognitoIdentityProviderClient } from '@libs/cognito-identitu-provider-client';
import schema from './schema';

const login: ValidatedEventAPIGatewayProxyEvent<typeof schema> = async (event) => {
  console.log('Incoming event into login is:   ', event);

  try {
    const { username } = event.body;
    const { CLIENT_ID, USER_POOL_ID } = process.env;

    const describeUserPoolClientCommand = new DescribeUserPoolClientCommand({
      UserPoolId: USER_POOL_ID,
      ClientId: CLIENT_ID,
    });

    const {
      UserPoolClient: { ClientSecret: CLIENT_SECRET },
    } = await cognitoIdentityProviderClient.send(describeUserPoolClientCommand);

    const secretHash = createHmac('sha256', CLIENT_SECRET).update(`${username}${CLIENT_ID}`).digest('base64');

    const initiateAuthCommand = new AdminInitiateAuthCommand({
      UserPoolId: process.env.USER_POOL_ID,
      ClientId: CLIENT_ID,
      AuthFlow: 'ADMIN_USER_PASSWORD_AUTH',
      AuthParameters: {
        USERNAME: username,
        PASSWORD: event.body.password,
        SECRET_HASH: secretHash,
      },
    });

    let response: AdminInitiateAuthResponse = await cognitoIdentityProviderClient.send(initiateAuthCommand);

    if (response.ChallengeName && response.ChallengeName === 'NEW_PASSWORD_REQUIRED') {
      const respondToAuthChallengeInput = {
        UserPoolId: process.env.USER_POOL_ID,
        ClientId: process.env.CLIENT_ID,
        ChallengeName: response.ChallengeName,
        ChallengeResponses: {
          USERNAME: username,
          NEW_PASSWORD: event.body.password,
          SECRET_HASH: secretHash,
        },
        Session: response.Session,
      };

      const respondToAuthChallengeCommand = new AdminRespondToAuthChallengeCommand(respondToAuthChallengeInput);
      response = await cognitoIdentityProviderClient.send(respondToAuthChallengeCommand);
    }

    return formatJSONResponse({ AuthenticationResult: response.AuthenticationResult });
  } catch (err) {
    console.error('ERROR is:    ', err);
    
    if (err?.$metadata.httpStatusCode === httpConstants.HTTP_STATUS_BAD_REQUEST) {
      return formatJSONResponse({ message: 'Unauthorized' }, httpConstants.HTTP_STATUS_UNAUTHORIZED);
    }

    return formatJSONResponse({ message: err.message }, httpConstants.HTTP_STATUS_INTERNAL_SERVER_ERROR);
  }
};

export const main = middyfy(login);
