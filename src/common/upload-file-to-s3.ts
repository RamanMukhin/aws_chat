import { constants as httpConstants } from 'http2';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { BUCKET } from './constants';
import { FILE_REQUIREMENTS_TYPE } from './types';
import { calculateBase64BytesSize, checkFileFromBuffer, createBase64Buffer } from './utils';
import { FileTypeResult } from 'file-type';
import { checkImageContent } from './moderate-image';
import { CustomError } from './errors';
import { RekognitionClient } from '@aws-sdk/client-rekognition';

export const checkFileAndUploadToS3 = async (
  s3Client: S3Client,
  objectBase64Data: string,
  objectKey: string,
  objectMetadata: any,
  fileRequirements: FILE_REQUIREMENTS_TYPE,
  fileTypeChecker: (buffer: ArrayBuffer | Uint8Array) => Promise<FileTypeResult>,
  needToModerate: boolean,
  rekognitionClient?: RekognitionClient | null,
): Promise<void> => {
  if (calculateBase64BytesSize(objectBase64Data) > fileRequirements.MAX_SIZE) {
    throw new CustomError('Check data size', httpConstants.HTTP_STATUS_BAD_REQUEST);
  }

  const Bytes = createBase64Buffer(objectBase64Data);

  await checkFileFromBuffer(fileTypeChecker, Bytes, fileRequirements);

  if (needToModerate) {
    if (!rekognitionClient) {
      throw new CustomError('Rekognition client was not provided');
    }

    await checkImageContent(rekognitionClient, Bytes);
  }

  const putObjectCommand = new PutObjectCommand({
    Body: Bytes,
    Bucket: BUCKET,
    Key: objectKey,
    ACL: 'private',
    Metadata: objectMetadata,
  });

  await s3Client.send(putObjectCommand);
};
