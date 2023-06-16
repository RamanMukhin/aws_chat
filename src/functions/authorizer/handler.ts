import { CognitoJwtVerifier } from 'aws-jwt-verify';
import { APIGatewayAuthorizerEvent, Context, Callback, PolicyDocument } from 'aws-lambda';

const authorizer = async (event: APIGatewayAuthorizerEvent, _context: Context, callback: Callback) => {
  console.log('Incoming event into authorizer is:   ', JSON.stringify(event));

  if (event.type !== 'REQUEST') {
    return callback('Unauthorized');
  }

  try {
    const verifier = CognitoJwtVerifier.create({
      userPoolId: process.env.USER_POOL_ID,
      tokenUse: 'access',
      clientId: process.env.CLIENT_ID,
    });

    const payload = await verifier.verify(event.queryStringParameters.Authorization.split(' ')[1]);
    // const payload = {sub: 'f65f7fb5-9d73-4cb5-a693-575f5c17a6b7', username: 'test', exp: Date.now() + 3600000};
    let effect: 'Allow' | 'Deny' = 'Allow';

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

const generatePolicy = (effect: 'Deny' | 'Allow', resource: string): PolicyDocument => ({
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
