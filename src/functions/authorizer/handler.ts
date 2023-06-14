import { CognitoJwtVerifier } from 'aws-jwt-verify';
import { APIGatewayAuthorizerEvent, Context, Callback, PolicyDocument } from 'aws-lambda';

const authorizer = async (event: APIGatewayAuthorizerEvent, _context: Context, callback: Callback) => {
  console.log('Incoming event into authorizer is:   ', JSON.stringify(event));

  const { type } = event;
  if (type !== 'REQUEST') {
    return callback('Unauthorized');
  }

  try {
    const verifier = CognitoJwtVerifier.create({
      userPoolId: process.env.USER_POOL_ID,
      tokenUse: 'access',
      clientId: process.env.CLIENT_ID,
    });

    const payload = await verifier.verify(event.queryStringParameters.Authorization.split(' ')[1]);

    console.log('Token is valid. Payload:', payload);

    const policy = generatePolicy('Allow', event.methodArn);

    console.log('Policy is:   ', JSON.stringify(policy));

    return callback(null, {
      principalId: `${payload.sub} ${payload.username}`,
      policyDocument: policy,
    });
  } catch (err) {
    console.error('ERROR is:    ', err);
    return callback('Unauthorized');
  }
};

const generatePolicy = (effect: 'Deny' | 'Allow', resource: string): PolicyDocument => {
  return {
    Version: '2012-10-17',
    Statement: [
      {
        Action: 'execute-api:Invoke',
        Effect: effect,
        Resource: resource,
      },
    ],
  };
};

export const main = authorizer;