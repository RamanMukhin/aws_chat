import { ROOM_TYPES } from 'src/common/constants';

export default {
  type: 'object',
  properties: {
    type: { type: 'string', enum: Object.values(ROOM_TYPES) },
    participants: {
      type: 'array',
      items: { type: 'string' },
    },
    name: { type: 'string' },
    if: {
      properties: { type: { enum: [ROOM_TYPES.PRIVATE] } },
    },
    then: {
      properties: {
        participants: {
          minItems: 1,
          maxItems: 1,
        },
      },
    },
    else: {
      properties: {
        participants: {
          minItems: 1,
        },
      },
      required: ['type', 'participants', 'name'],
    },
  },
  required: ['type', 'participants'],
} as const;
