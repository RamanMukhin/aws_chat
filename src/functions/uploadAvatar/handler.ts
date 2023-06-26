import { join } from 'path';
import { constants as httpConstants } from 'http2';
import type { ValidatedEventAPIGatewayProxyEvent } from '@libs/api-gateway';
import { formatJSONResponse } from '@libs/api-gateway';
import { middyfy } from '@libs/lambda';
import { dynamoDBDocumentClient } from '../../libs/dynamo-db-doc-client';
import schema from './schema';
import { UpdateCommand } from '@aws-sdk/lib-dynamodb';
import {
  BUCKET,
  DB_MAPPER,
  REKOGNITION_MODERATION_LABELS_MIN_CONFIDENCE,
  TABLE,
  USERS_AVATAR_NAME,
  USERS_STORAGE_PREFIX,
  USER_AVATAR,
} from 'src/common/constants';
import { CustomError } from 'src/common/errors';
import { rekognitionClient } from '@libs/rekognition-client';
import { DetectModerationLabelsCommand } from '@aws-sdk/client-rekognition';
import { fileTypeFromBuffer } from 'file-type';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { s3Client } from '@libs/s3-client';

const uploadAvatar: ValidatedEventAPIGatewayProxyEvent<typeof schema> = async (event) => {
  try {
    console.log('Incoming event into uploadAvatar is:   ', event);

    const [userId]: string | undefined = (event.requestContext?.authorizer?.principalId || '').split(' ');

    let Bytes: Buffer;

    try {
      Bytes = Buffer.from(event.body.img.replace(/^data:image\/[a-z]+;base64,/, ''), 'base64');
    } catch (err) {
      throw new CustomError('Check img provided.', httpConstants.HTTP_STATUS_BAD_REQUEST);
    }

    const { ext, mime } = await fileTypeFromBuffer(Bytes);

    if (Bytes.byteLength > USER_AVATAR.MAX_SIZE || !USER_AVATAR.EXT.has(ext) || !USER_AVATAR.MIME.has(mime)) {
      throw new CustomError('Check img requirements', httpConstants.HTTP_STATUS_BAD_REQUEST);
    }

    const detectModerationLabelsCommand = new DetectModerationLabelsCommand({
      Image: { Bytes },
      MinConfidence: REKOGNITION_MODERATION_LABELS_MIN_CONFIDENCE,
    });

    let { ModerationLabels } = await rekognitionClient.send(detectModerationLabelsCommand);

    const isValid = !(ModerationLabels && !!ModerationLabels.length);

    if (!isValid) {
      throw new CustomError('Img content validation failed', httpConstants.HTTP_STATUS_UNPROCESSABLE_ENTITY);
    }

    const KeyFileName = join(`${USERS_STORAGE_PREFIX}/${userId}/${USERS_AVATAR_NAME}`);

    const putObjectCommand = new PutObjectCommand({
      Body: Bytes,
      Bucket: BUCKET,
      Key: KeyFileName,
    });

    await s3Client.send(putObjectCommand);

    const updateCommand = new UpdateCommand({
      TableName: TABLE,
      Key: {
        PK: DB_MAPPER.USER(userId),
        SK: DB_MAPPER.ENTITY(),
      },
      UpdateExpression: 'set avatar = :avatar',
      ExpressionAttributeValues: {
        ':avatar': KeyFileName,
      },
    });

    await dynamoDBDocumentClient.send(updateCommand);

    return formatJSONResponse({ message: 'success' }, httpConstants.HTTP_STATUS_CREATED);
  } catch (err) {
    console.error('ERROR is:    ', err);
    return formatJSONResponse({ message: err.message }, httpConstants.HTTP_STATUS_INTERNAL_SERVER_ERROR);
  }
};

export const main = middyfy(uploadAvatar);
