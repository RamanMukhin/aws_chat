import { AUTHORIZER_EVENT } from 'src/common/constants';
import schema from './schema';
import { handlerPath } from '@libs/handler-resolver';

export default {
  handler: `${handlerPath(__dirname)}/handler.main`,
  events: [
    {
      http: {
        method: 'post',
        path: 'rooms',
        request: {
          schemas: {
            'application/json': schema,
          },
        },
        authorizer: {
          name: 'authorizer',
          type: AUTHORIZER_EVENT.TOKEN,
          identitySource: 'method.request.header.Authorization',
        },
      },
    },
  ],
};
