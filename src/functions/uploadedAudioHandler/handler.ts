import { S3Event } from 'aws-lambda';
import { constants as httpConstants } from 'http2';
import { formatJSONResponse } from '@libs/api-gateway';
import { MODERATION_STATUS_TYPES } from 'src/common/constants';
import { s3Client } from '@libs/s3-client';
import { dynamoDBDocumentClient } from '@libs/dynamo-db-doc-client';
import { handleUploadedFile } from 'src/common/handle-uploaded-file';

const uploadedAudioHandler = async (event: S3Event) => {
  try {
    console.log('Incoming event into uploadedAudioHandler is:   ', JSON.stringify(event));

    await Promise.all(
      event.Records.map(async (record) => {
        await handleUploadedFile(
          s3Client,
          dynamoDBDocumentClient,
          record.s3.object.key,
          MODERATION_STATUS_TYPES.SUCCEEDED,
        );
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

export const main = uploadedAudioHandler;
