import { constants as httpConstants } from 'http2';
import type { APIGatewayProxyEvent, APIGatewayProxyResult, Handler } from 'aws-lambda';
import type { FromSchema } from 'json-schema-to-ts';

type ValidatedAPIGatewayProxyEvent<S> = Omit<APIGatewayProxyEvent, 'body'> & { body: FromSchema<S> };
export type ValidatedEventAPIGatewayProxyEvent<S> = Handler<ValidatedAPIGatewayProxyEvent<S>, APIGatewayProxyResult>;

export const formatJSONResponse = (
  response: Record<string, unknown> = {},
  statusCode: number = httpConstants.HTTP_STATUS_OK,
) => {
  return {
    statusCode,
    body: JSON.stringify(response),
  };
};
