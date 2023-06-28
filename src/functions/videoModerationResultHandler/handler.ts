import { SNSEvent } from 'aws-lambda';
import { constants as httpConstants } from 'http2';
import { formatJSONResponse } from '@libs/api-gateway';
import { MODERATION_STATUS_TYPE } from 'src/common/types';
import { BUCKET, MESSAGE_TYPES, MODERATION_STATUS_TYPES, REGION, STAGE, WEBSOCKET_API_ID } from 'src/common/constants';
import { DeleteObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { s3Client } from '@libs/s3-client';
import { saveMessageToRoom } from 'src/common/save-message';
import { dynamoDBDocumentClient } from '@libs/dynamo-db-doc-client';
import { createApiGatewayMangementEndpoint } from 'src/common/utils';
import { createApiGatewayMangementApiClient } from '@libs/api-gateway-management-api-client';
import { postMessageToRoom } from 'src/common/post-to-room';

const videoModerationResultHandler = async (event: SNSEvent) => {
  try {
    console.log('Incoming event into videoModerationResultHandler is:   ', JSON.stringify(event));

    await Promise.all(
      event.Records.map(async (record) => {
        const rekognitionMessage = JSON.parse(record.Sns.Message);
        const KeyFileName = rekognitionMessage.Video.S3ObjectName;
        const moderationStatus: MODERATION_STATUS_TYPE = rekognitionMessage.Status;
        let failReason: string;

        if (moderationStatus === MODERATION_STATUS_TYPES.IN_PROGRESS) {
          return;
        }

        const headObjectCommand = new HeadObjectCommand({
          Bucket: BUCKET,
          Key: KeyFileName,
        });

        const { Metadata } = await s3Client.send(headObjectCommand);

        console.log('File Metadata is   :', Metadata);

        const { roomid: roomId, userid: userId } = Metadata;

        const message = await saveMessageToRoom(dynamoDBDocumentClient, roomId, userId, MESSAGE_TYPES.file, {
          KeyFileName,
          moderationStatus,
        });

        const endpoint = createApiGatewayMangementEndpoint('', STAGE, WEBSOCKET_API_ID, REGION);
        const apiGatewayMangementApiClient = createApiGatewayMangementApiClient(endpoint);

        await postMessageToRoom(apiGatewayMangementApiClient, dynamoDBDocumentClient, roomId, message);

        if (moderationStatus === MODERATION_STATUS_TYPES.FAILED) {
          failReason = rekognitionMessage.Message;

          const deleteObjectCommand = new DeleteObjectCommand({
            Bucket: BUCKET,
            Key: KeyFileName,
          });

          await s3Client.send(deleteObjectCommand);
        }
      }),
    );

    return formatJSONResponse({ message: 'success' });
  } catch (err) {
    console.error('ERROR is:    ', err);
    return formatJSONResponse({ message: err.message }, httpConstants.HTTP_STATUS_INTERNAL_SERVER_ERROR);
  }
};

export const main = videoModerationResultHandler;
