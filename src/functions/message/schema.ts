export default {
  type: 'object',
  properties: {
    roomId: { type: 'string' },
    message: { type: 'string' },
  },
  required: ['roomId', 'message'],
} as const;
