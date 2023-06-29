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
  ROOM_FILES,
  ROOM_FILE_TYPES,
} from 'src/common/constants';
import { fileTypeFromBuffer } from 'file-type';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { s3Client } from '@libs/s3-client';
import { checkRoom } from 'src/common/check-room';
import { checkFileTypeFromBuffer, createBase64Buffer } from 'src/common/utils';
import { checkImageContent } from 'src/common/moderate-image';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { rekognitionClient } from '@libs/rekognition-client';
import { saveAndSendMessage } from 'src/common/save-and-send-message';

const uploadFile: ValidatedEventAPIGatewayProxyEvent<typeof schema> = async (event) => {
  try {
    console.log('Incoming event into uploadFile is:   ', event);

    const [userId]: string | undefined = (event.requestContext?.authorizer?.principalId || '').split(' ');
    const { roomId, type, fileName, data } = event.body;
    const Key = join(`${ROOMS_STORAGE_PREFIX}/${type}/${DB_MAPPER.RAW_PK(roomId)}/${uuidv4()}/${fileName}`);
    const Metadata = { fileName, userId, roomId, keyFileName: Key };

    await checkRoom(roomId, userId);

    if (type === ROOM_FILE_TYPES.video || type === ROOM_FILE_TYPES.audio) {
      const putObjectCommand = new PutObjectCommand({ Bucket: BUCKET, Key, ACL: 'private', Metadata });

      const url = await getSignedUrl(s3Client, putObjectCommand, { expiresIn: 1200 });

      return formatJSONResponse({ url });
    }

    const Bytes = createBase64Buffer(data);

    await checkFileTypeFromBuffer(fileTypeFromBuffer, Bytes, ROOM_FILES[type]);

    if (type === ROOM_FILE_TYPES.image) {
      await checkImageContent(rekognitionClient, Bytes);
    }

    const putObjectCommand = new PutObjectCommand({ Body: Bytes, Bucket: BUCKET, Key, ACL: 'private', Metadata });

    await s3Client.send(putObjectCommand);

    const moderationStatus = MODERATION_STATUS_TYPES.SUCCEEDED;

    await saveAndSendMessage(dynamoDBDocumentClient, roomId, userId, MESSAGE_TYPES.file, {
      data: Key,
      moderationStatus,
    });

    return formatJSONResponse({ message: 'success' }, httpConstants.HTTP_STATUS_CREATED);
  } catch (err) {
    console.error('ERROR is:    ', err);
    return formatJSONResponse({ message: err.message }, httpConstants.HTTP_STATUS_INTERNAL_SERVER_ERROR);
  }
};

export const main = middyfy(uploadFile);
