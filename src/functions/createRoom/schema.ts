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
  },
  required: ['type', 'participants'],
  // if: {
  //   properties: { type: { const: ROOM_TYPES.private } },
  // },
  // then: {
  //   properties: {
  //     participants: {
  //       type: 'array',
  //       items: { type: 'string' },
  //       minItems: 1,
  //       maxItems: 1,
  //     },
  //   },
  // },
  // else: {
  //   properties: {
  //     participants: {
  //       type: 'array',
  //       items: { type: 'string' },
  //       minItems: 1,
  //     },
  //   },
  //   required: ['type', 'participants', 'name'],
  // },
} as const;
