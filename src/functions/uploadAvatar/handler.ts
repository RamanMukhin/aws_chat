import { join } from 'path';
import { constants as httpConstants } from 'http2';
import type { ValidatedEventAPIGatewayProxyEvent } from '@libs/api-gateway';
import { formatJSONResponse } from '@libs/api-gateway';
import { middyfy } from '@libs/lambda';
import { dynamoDBDocumentClient } from '../../libs/dynamo-db-doc-client';
import schema from './schema';
import { UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { BUCKET, DB_MAPPER, TABLE, USERS_AVATAR_NAME, USERS_STORAGE_PREFIX, USER_AVATAR } from 'src/common/constants';
import { CustomError } from 'src/common/errors';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { s3Client } from '@libs/s3-client';
import { calculateBase64BytesSize, checkFileTypeFromBuffer, createBase64Buffer } from 'src/common/utils';
import { checkImageContent } from 'src/common/moderate-image';
import { fileTypeFromBuffer } from 'file-type';
import { rekognitionClient } from '@libs/rekognition-client';

const uploadAvatar: ValidatedEventAPIGatewayProxyEvent<typeof schema> = async (event) => {
  try {
    console.log('Incoming event into uploadAvatar is:   ', event);

    const [userId]: string | undefined = (event.requestContext?.authorizer?.principalId || '').split(' ');

    if (calculateBase64BytesSize(event.body.img) > USER_AVATAR.MAX_SIZE) {
      throw new CustomError('Check img size', httpConstants.HTTP_STATUS_BAD_REQUEST);
    }

    const Bytes = createBase64Buffer(event.body.img);

    await checkFileTypeFromBuffer(fileTypeFromBuffer, Bytes, USER_AVATAR);

    await checkImageContent(rekognitionClient, Bytes);

    const Key = join(`${USERS_STORAGE_PREFIX}/${userId}/${USERS_AVATAR_NAME}`);

    const putObjectCommand = new PutObjectCommand({ Body: Bytes, Bucket: BUCKET, Key, ACL: 'private' });

    await s3Client.send(putObjectCommand);

    const updateCommand = new UpdateCommand({
      TableName: TABLE,
      Key: {
        PK: DB_MAPPER.USER(userId),
        SK: DB_MAPPER.ENTITY(),
      },
      UpdateExpression: 'set avatar = :avatar, updatedAt = :updatedAt',
      ExpressionAttributeValues: {
        ':avatar': Key,
        ':updatedAt': new Date().toISOString(),
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
