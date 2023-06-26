export default {
  type: 'object',
  properties: {
    img: { type: 'string', title: 'Base64 encoded image' },
  },
  required: ['img'],
} as const;
