import { constants as httpConstants } from 'http2';
import { DetectModerationLabelsCommand, RekognitionClient } from '@aws-sdk/client-rekognition';
import { REKOGNITION_MODERATION_LABELS_MIN_CONFIDENCE } from './constants';
import { CustomError } from './errors';

export const checkImageContent = async (
  rekognitionClient: RekognitionClient,
  image: Buffer,
  MinConfidence = REKOGNITION_MODERATION_LABELS_MIN_CONFIDENCE,
): Promise<void> => {
  const detectModerationLabelsCommand = new DetectModerationLabelsCommand({
    Image: { Bytes: image },
    MinConfidence,
  });

  let { ModerationLabels } = await rekognitionClient.send(detectModerationLabelsCommand);

  const isValid = !(ModerationLabels && !!ModerationLabels.length);

  if (!isValid) {
    throw new CustomError('Img content validation failed', httpConstants.HTTP_STATUS_UNPROCESSABLE_ENTITY);
  }
};
