import { handlerPath } from '@libs/handler-resolver';

export default {
  name: 'videoModerationResultHandler',
  handler: `${handlerPath(__dirname)}/handler.main`,
  events: [
    {
      sns: {
        arn: { Ref: 'RekognitionSNSTopic' },
        topicName: '${sls:stage}-${env:REKOGNITION_MODERATION_VIDEO_SNS_TOPIC}',
      },
    },
  ],
};
