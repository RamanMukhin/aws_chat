import { handlerPath } from '@libs/handler-resolver';
import { AUTHORIZER_EVENT } from 'src/common/constants';

export default {
  handler: `${handlerPath(__dirname)}/handler.main`,
  events: [
    {
      http: {
        method: 'put',
        path: 'users/avatar',
        authorizer: {
          name: 'authorizer',
          type: AUTHORIZER_EVENT.TOKEN,
          resultTtlInSeconds: 0,
          identitySource: 'method.request.header.Authorization',
        },
        caching: {
          enabled: false,
        },
      },
    },
  ],
};
