import { CognitoJwtVerifier } from 'aws-jwt-verify';
import { APIGatewayAuthorizerEvent, Context, Callback, PolicyDocument } from 'aws-lambda';
import { AUTHORIZER_EVENT } from 'src/common/constants';
import { AWS_POLICY_EFFECT } from 'src/common/types';

const authorizer = async (event: APIGatewayAuthorizerEvent, _context: Context, callback: Callback) => {
  console.log('Incoming event into authorizer is:   ', JSON.stringify(event));

  const token = (
    event.type === AUTHORIZER_EVENT.REQUEST ? event.queryStringParameters.Authorization : event.authorizationToken
  ).split(' ')[1];

  if (!token) {
    return callback('Unauthorized');
  }

  try {
    const verifier = CognitoJwtVerifier.create({
      userPoolId: process.env.USER_POOL_ID,
      tokenUse: 'access',
      clientId: process.env.CLIENT_ID,
    });

    const payload = await verifier.verify(token);

    let effect: AWS_POLICY_EFFECT = 'Allow';

    console.log('Token is valid. Payload:', payload);

    const policy = generatePolicy(effect, event.methodArn);

    console.log('Policy is:   ', JSON.stringify(policy));

    return callback(null, {
      principalId: `${payload.sub} ${payload.username} ${payload.exp}`,
      policyDocument: policy,
    });
  } catch (err) {
    console.error('ERROR is:    ', err);
    return callback('Unauthorized');
  }
};

const generatePolicy = (effect: AWS_POLICY_EFFECT, resource: string): PolicyDocument => ({
  Version: '2012-10-17',
  Statement: [
    {
      Action: 'execute-api:Invoke',
      Effect: effect,
      Resource: resource,
    },
  ],
});

export const main = authorizer;
