import { MESSAGE_STATUS_TYPES } from 'src/common/constants';

export default {
  type: 'object',
  properties: {
    roomId: { type: 'string' },
    messageIds: {
      type: 'array',
      items: { type: 'string' },
    },
    status: { type: 'string', enum: Object.values(MESSAGE_STATUS_TYPES) },
  },
  required: ['roomId', 'messageIds', 'status'],
} as const;
