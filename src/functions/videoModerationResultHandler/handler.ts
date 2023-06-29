import { SNSEvent } from 'aws-lambda';
import { constants as httpConstants } from 'http2';
import { formatJSONResponse } from '@libs/api-gateway';
import { MODERATION_STATUS_TYPE } from 'src/common/types';
import { BUCKET, MODERATION_STATUS_TYPES } from 'src/common/constants';
import { DeleteObjectCommand } from '@aws-sdk/client-s3';
import { s3Client } from '@libs/s3-client';
import { dynamoDBDocumentClient } from '@libs/dynamo-db-doc-client';
import { handleUploadedFile } from 'src/common/handle-uploaded-file';

const videoModerationResultHandler = async (event: SNSEvent) => {
  try {
    console.log('Incoming event into videoModerationResultHandler is:   ', JSON.stringify(event));

    await Promise.all(
      event.Records.map(async (record) => {
        const rekognitionMessage = JSON.parse(record.Sns.Message);
        const Key = rekognitionMessage.Video.S3ObjectName;
        const moderationStatus: MODERATION_STATUS_TYPE = rekognitionMessage.Status;

        if (moderationStatus === MODERATION_STATUS_TYPES.IN_PROGRESS) {
          return;
        }

        const failReason = moderationStatus === MODERATION_STATUS_TYPES.FAILED ? rekognitionMessage.Message : undefined;

        await handleUploadedFile(s3Client, dynamoDBDocumentClient, Key, moderationStatus, failReason);

        if (moderationStatus === MODERATION_STATUS_TYPES.FAILED) {
          const deleteObjectCommand = new DeleteObjectCommand({ Bucket: BUCKET, Key });

          await s3Client.send(deleteObjectCommand);
        }
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

export const main = videoModerationResultHandler;
