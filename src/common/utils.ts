import { format } from 'util';
import { constants as httpConstants } from 'http2';
import { DB_MAPPER, LOCAL_APIGATEWAY_MANAGEMENT_ENDPOINT, REGION, STAGE, STAGES, WEBSOCKET_API_ID } from './constants';
import { CustomError } from './errors';
import { FILE_REQUIREMENTS_TYPE } from './types';
import { FileTypeResult } from 'file-type';

export const createApiGatewayMangementEndpoint = (
  domain = '',
  stage = STAGE,
  apiId = WEBSOCKET_API_ID,
  region = REGION,
): string => {
  const apiGatewayMangementEndpoint = domain
    ? format(format('https://%s/%s', domain, stage))
    : format(format('https://%s.execute-api.%s.amazonaws.com/%s', apiId, region, stage));

  return stage === STAGES.LOCAL ? LOCAL_APIGATEWAY_MANAGEMENT_ENDPOINT : apiGatewayMangementEndpoint;
};

export const getLimit = (limit: string, MAX_LIMIT: number): number =>
  !limit || isNaN(+limit) || !+limit || +limit > MAX_LIMIT ? MAX_LIMIT : +limit;

export const getLastEvaluatedKey = (entity: Record<string, any>) =>
  `${DB_MAPPER.RAW_PK(entity.PK)}:${DB_MAPPER.RAW_PK(entity.SK)}`;

export const calculateBase64BytesSize = (base64String: string): number => {
  const base64 = base64String.substring(base64String.indexOf(',') + 1);
  const bits = base64.length * 6;
  const bytes = bits / 8;
  return Math.ceil(bytes);
};

export const createBase64Buffer = (base64String: string): Buffer => {
  try {
    const Bytes = Buffer.from(base64String.replace(/^data:image\/[a-z]+;base64,/, ''), 'base64');

    return Bytes;
  } catch (err) {
    throw new CustomError('Check data provided.', httpConstants.HTTP_STATUS_BAD_REQUEST);
  }
};

// Cannot import functions dirextly from file-type besause of ESM package
export const checkFileTypeFromBuffer = async (
  checker: (buffer: ArrayBuffer | Uint8Array) => Promise<FileTypeResult>,
  buffer: Buffer,
  requirements: FILE_REQUIREMENTS_TYPE,
): Promise<FileTypeResult> => {
  const { ext, mime } = await checker(buffer);

  if (buffer.byteLength > requirements.MAX_SIZE || !requirements.EXT.has(ext) || !requirements.MIME.has(mime)) {
    throw new CustomError('Check img requirements', httpConstants.HTTP_STATUS_BAD_REQUEST);
  }

  return { ext, mime };
};
