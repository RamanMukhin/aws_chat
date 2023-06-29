import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { constants as httpConstants } from 'http2';
import type { ValidatedEventAPIGatewayProxyEvent } from '@libs/api-gateway';
import { formatJSONResponse } from '@libs/api-gateway';
import { middyfy } from '@libs/lambda';
import { dynamoDBDocumentClient } from '../../libs/dynamo-db-doc-client';
import schema from './schema';
import {
  BUCKET,
  DB_MAPPER,
  MESSAGE_TYPES,
  MODERATION_STATUS_TYPES,
  ROOMS_STORAGE_PREFIX,
  ROOM_FILES_REQUIREMENTS,
  ROOM_FILE_TYPES,
} from 'src/common/constants';
import { fileTypeFromBuffer } from 'file-type';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { s3Client } from '@libs/s3-client';
import { checkRoom } from 'src/common/check-room';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { rekognitionClient } from '@libs/rekognition-client';
import { saveAndSendMessage } from 'src/common/save-and-send-message';
import { checkFileAndUploadToS3 } from 'src/common/upload-file-to-s3';
import { RekognitionClient } from '@aws-sdk/client-rekognition';

const uploadFile: ValidatedEventAPIGatewayProxyEvent<typeof schema> = async (event) => {
  try {
    console.log('Incoming event into uploadFile is:   ', event);

    const [userId]: string | undefined = (event.requestContext?.authorizer?.principalId || '').split(' ');
    const { roomId, type, fileName, data } = event.body;
    const Key = join(`${ROOMS_STORAGE_PREFIX}/${type}/${DB_MAPPER.RAW_PK(roomId)}/${uuidv4()}/${fileName}`);
    const Metadata = { fileName, userId, roomId, Key };

    await checkRoom(roomId, userId);

    if (type === ROOM_FILE_TYPES.video || type === ROOM_FILE_TYPES.audio) {
      const putObjectCommand = new PutObjectCommand({ Bucket: BUCKET, Key, ACL: 'private', Metadata });

      const url = await getSignedUrl(s3Client, putObjectCommand, { expiresIn: 1200 });

      return formatJSONResponse({ url });
    }

    const imageModerator: [boolean, RekognitionClient | null] =
      type === ROOM_FILE_TYPES.image ? [true, rekognitionClient] : [false, null];

    await checkFileAndUploadToS3(
      s3Client,
      data,
      Key,
      Metadata,
      ROOM_FILES_REQUIREMENTS[type],
      fileTypeFromBuffer,
      ...imageModerator,
    );

    await saveAndSendMessage(dynamoDBDocumentClient, roomId, userId, MESSAGE_TYPES.file, {
      data: Key,
      moderationStatus: MODERATION_STATUS_TYPES.SUCCEEDED,
    });

    return formatJSONResponse({ message: 'success' }, httpConstants.HTTP_STATUS_CREATED);
  } catch (err) {
    console.error('ERROR is:    ', err);
    return formatJSONResponse(
      { message: err.message },
      err.statusCode ?? httpConstants.HTTP_STATUS_INTERNAL_SERVER_ERROR,
    );
  }
};

export const main = middyfy(uploadFile);
