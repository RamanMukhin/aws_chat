import { createHmac } from 'crypto';
import {
  CognitoIdentityProviderClient,
  AdminInitiateAuthCommand,
  AdminRespondToAuthChallengeCommand,
  AdminInitiateAuthResponse,
  DescribeUserPoolClientCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import { formatJSONResponse, ValidatedEventAPIGatewayProxyEvent } from '@libs/api-gateway';
import { middyfy } from '@libs/lambda';

import schema from './schema';

const login: ValidatedEventAPIGatewayProxyEvent<typeof schema> = async (event) => {
  console.log('Incoming event into login is:   ', event);

  try {
    const cognitoIdentityProviderClient = new CognitoIdentityProviderClient({});

    const { CLIENT_ID, USER_POOL_ID } = process.env;

    const describeUserPoolClientCommand = new DescribeUserPoolClientCommand({
      UserPoolId: USER_POOL_ID,
      ClientId: CLIENT_ID,
    });

    const {
      UserPoolClient: { ClientSecret: CLIENT_SECRET },
    } = await cognitoIdentityProviderClient.send(describeUserPoolClientCommand);

    const secretHash = createHmac('sha256', CLIENT_SECRET)
      .update(`${event.body.username}${CLIENT_ID}`)
      .digest('base64');

    const initiateAuthCommand = new AdminInitiateAuthCommand({
      UserPoolId: process.env.USER_POOL_ID,
      ClientId: CLIENT_ID,
      AuthFlow: 'ADMIN_USER_PASSWORD_AUTH',
      AuthParameters: {
        USERNAME: event.body.username,
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
          USERNAME: event.body.username,
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
    console.error(err);
    if (err?.$metadata.httpStatusCode === 400) {
      return formatJSONResponse({ message: 'Unauthorized' }, 401);
    }

    return formatJSONResponse({ message: err.message }, 500);
  }
};

export const main = middyfy(login);
