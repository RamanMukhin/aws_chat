import { join } from 'path';
import { handlerPath } from '@libs/handler-resolver';
import { ROOMS_STORAGE_PREFIX, ROOM_FILE_TYPES } from 'src/common/constants';

export default {
  handler: `${handlerPath(__dirname)}/handler.main`,
  events: [
    {
      s3: {
        bucket: { Ref: 'S3Bucket' },
        event: 's3:ObjectCreated:*',
        rules: [
          {
            prefix: join(`${ROOMS_STORAGE_PREFIX}/${ROOM_FILE_TYPES.audio}/`),
          },
        ],
        existing: true,
      },
    },
  ],
};
