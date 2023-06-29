import { S3Event } from 'aws-lambda';
import { constants as httpConstants } from 'http2';
import { formatJSONResponse } from '@libs/api-gateway';

import {
  BUCKET,
  REKOGNITION_MODERATION_VIDEO_SNS_TOPIC,
  REKOGNITION_MODERATION_VIDEO_MIN_CONFIDENCE,
  REKOGNITION_MODERATION_VIDEO_ROLE,
} from 'src/common/constants';

import { rekognitionClient } from '@libs/rekognition-client';
import { StartContentModerationCommand } from '@aws-sdk/client-rekognition';

const moderateVideo = async (event: S3Event) => {
  try {
    console.log('Incoming event into moderateVideo is:   ', JSON.stringify(event));

    await Promise.all(
      event.Records.map(async (record) => {
        const startContentModerationCommand = new StartContentModerationCommand({
          MinConfidence: REKOGNITION_MODERATION_VIDEO_MIN_CONFIDENCE,
          NotificationChannel: {
            RoleArn: REKOGNITION_MODERATION_VIDEO_ROLE,
            SNSTopicArn: REKOGNITION_MODERATION_VIDEO_SNS_TOPIC,
          },
          Video: {
            S3Object: {
              Bucket: BUCKET,
              Name: record.s3.object.key,
            },
          },
        });

        const { JobId } = await rekognitionClient.send(startContentModerationCommand);

        console.log('JobId is:   ', JobId);
      }),
    );

    return formatJSONResponse();
  } catch (err) {
    console.error('ERROR is:    ', err);
    return formatJSONResponse(
      { message: err.message },
      err.statusCode ?? httpConstants.HTTP_STATUS_INTERNAL_SERVER_ERROR,
    );
  }
};

export const main = moderateVideo;
