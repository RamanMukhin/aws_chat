import { ROOM_FILE_TYPES } from 'src/common/constants';

export default {
  type: 'object',
  properties: {
    roomId: { type: 'string' },
    type: { type: 'string', enum: Object.values(ROOM_FILE_TYPES) },
    fileName: { type: 'string' },
    data: { type: 'string', title: 'Base64 encoded file' },
  },
  required: ['roomId', 'type', 'fileName'],
  anyOf: [
    {
      properties: {
        type: { enum: [ROOM_FILE_TYPES.image, ROOM_FILE_TYPES.doc] },
      },
      required: ['roomId', 'type', 'fileName', 'data'],
    },
  ],
} as const;
