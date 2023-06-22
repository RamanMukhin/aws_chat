import { handlerPath } from '@libs/handler-resolver';
import { AUTHORIZER_EVENT } from 'src/common/constants';

export default {
  handler: `${handlerPath(__dirname)}/handler.main`,
  events: [
    {
      http: {
        method: 'get',
        path: 'rooms/messages/{roomId}',
        authorizer: {
          name: 'authorizer',
          type: AUTHORIZER_EVENT.TOKEN,
          identitySource: 'method.request.header.Authorization',
        },
        caching: {
          enabled: false,
        },
      },
    },
  ],
};
