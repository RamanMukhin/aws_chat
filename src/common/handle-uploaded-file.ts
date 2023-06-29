import { HeadObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { BUCKET, MESSAGE_TYPES } from './constants';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { saveAndSendMessage } from './save-and-send-message';
import { MODERATION_STATUS_TYPE } from './types';

export const handleUploadedFile = async (
  s3Client: S3Client,
  dynamoDBDocumentClient: DynamoDBDocumentClient,
  objectKey: string,
  moderationStatus: MODERATION_STATUS_TYPE,
  failReason?: string,
): Promise<void> => {
  const headObjectCommand = new HeadObjectCommand({ Bucket: BUCKET, Key: objectKey });

  const { Metadata } = await s3Client.send(headObjectCommand);

  console.log('File Metadata is   :', Metadata);

  const { roomid: roomId, userid: userId } = Metadata;

  await saveAndSendMessage(dynamoDBDocumentClient, roomId, userId, MESSAGE_TYPES.file, {
    data: objectKey,
    moderationStatus,
    failReason,
  });
};
