import { createHmac } from 'crypto';
import {
  CognitoIdentityProviderClient,
  AdminInitiateAuthCommand,
  AdminRespondToAuthChallengeCommand,
  AdminInitiateAuthResponse,
} from '@aws-sdk/client-cognito-identity-provider'; // ES Modules import
import { formatJSONResponse, ValidatedEventAPIGatewayProxyEvent } from '@libs/api-gateway';
import { middyfy } from '@libs/lambda';

import schema from './schema';

const login: ValidatedEventAPIGatewayProxyEvent<typeof schema> = async (event) => {
  console.log('Incoming event into login is:   ', event);

  try {
    const client = new CognitoIdentityProviderClient({});
    const CLIENT_ID = process.env.CLIENT_ID;

    const hasher = createHmac('sha256', process.env.CLIENT_SECRET);
    hasher.update(`${event.body.username}${CLIENT_ID}`);
    const secretHash = hasher.digest('base64');

    const initiateAuthInput = {
      UserPoolId: process.env.USER_POOL_ID,
      ClientId: process.env.CLIENT_ID,
      AuthFlow: 'ADMIN_USER_PASSWORD_AUTH',
      AuthParameters: {
        USERNAME: event.body.username,
        PASSWORD: event.body.password,
        SECRET_HASH: secretHash,
      },
    };

    const initiateAuthCommand = new AdminInitiateAuthCommand(initiateAuthInput);
    let response: AdminInitiateAuthResponse = await client.send(initiateAuthCommand);

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
      response = await client.send(respondToAuthChallengeCommand);
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
