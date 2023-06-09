import middy from '@middy/core';
import httpJsonBodyParser from '@middy/http-json-body-parser';
import wsJsonBodyParser from '@middy/ws-json-body-parser';

export const middyfy = (handler) => {
  return middy(handler).use(httpJsonBodyParser());
};

export const middyfyWS = (handler) => {
  return middy(handler).use(wsJsonBodyParser());
};
