import { join } from 'path';
import { constants as httpConstants } from 'http2';
import type { ValidatedEventAPIGatewayProxyEvent } from '@libs/api-gateway';
import { formatJSONResponse } from '@libs/api-gateway';
import { middyfy } from '@libs/lambda';
import { dynamoDBDocumentClient } from '../../libs/dynamo-db-doc-client';
import schema from './schema';
import { UpdateCommand } from '@aws-sdk/lib-dynamodb';
import {
  DB_MAPPER,
  TABLE,
  USERS_AVATAR_NAME,
  USERS_STORAGE_PREFIX,
  USER_AVATAR_REQUIREMENTS,
} from 'src/common/constants';
import { s3Client } from '@libs/s3-client';
import { fileTypeFromBuffer } from 'file-type';
import { rekognitionClient } from '@libs/rekognition-client';
import { checkFileAndUploadToS3 } from 'src/common/upload-file-to-s3';

const uploadAvatar: ValidatedEventAPIGatewayProxyEvent<typeof schema> = async (event) => {
  try {
    console.log('Incoming event into uploadAvatar is:   ', event);

    const [userId]: string | undefined = (event.requestContext?.authorizer?.principalId || '').split(' ');
    const Key = join(`${USERS_STORAGE_PREFIX}/${userId}/${USERS_AVATAR_NAME}`);
    const Metadata = { userId, Key };

    await checkFileAndUploadToS3(
      s3Client,
      event.body.img,
      Key,
      Metadata,
      USER_AVATAR_REQUIREMENTS,
      fileTypeFromBuffer,
      true,
      rekognitionClient,
    );

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
    return formatJSONResponse(
      { message: err.message },
      err.statusCode ?? httpConstants.HTTP_STATUS_INTERNAL_SERVER_ERROR,
    );
  }
};

export const main = middyfy(uploadAvatar);
