import { FileExtension, MimeType } from 'file-type';
import {
  AUTHORIZER_EVENT_TYPE,
  DB_MAPPER_TYPE,
  FILE_REQUIREMENTS_TYPE,
  FILE_TYPE,
  MESSAGE_STATUS_TYPE,
  MESSAGE_TYPE,
  MODERATION_STATUS_TYPE,
  ROOM_FILES_TYPE,
  ROOM_TYPE,
  WEBSOCKET_EVENT_TYPE,
} from './types';
import { getLimit } from './utils';

export const API_VERSION = process.env.API_VERSION || '2018-11-29';

export const STAGES = Object.freeze({
  LOCAL: 'local',
  DEV: 'dev',
});

export const ROOM_TYPES: Record<ROOM_TYPE, ROOM_TYPE> = Object.freeze({
  private: 'private',
  group: 'group',
});

export const ROOM_FILE_TYPES: Record<FILE_TYPE, FILE_TYPE> = Object.freeze({
  doc: 'doc',
  image: 'image',
  video: 'video',
  audio: 'audio',
});

export const MESSAGE_TYPES: Record<MESSAGE_TYPE, MESSAGE_TYPE> = Object.freeze({
  text: 'text',
  file: 'file',
});

export const MESSAGE_STATUS_TYPES: Record<MESSAGE_STATUS_TYPE, MESSAGE_STATUS_TYPE> = Object.freeze({
  delivered: 'delivered',
  opened: 'opened',
});

export const WEBSOCKET_EVENT_TYPES: Record<WEBSOCKET_EVENT_TYPE, WEBSOCKET_EVENT_TYPE> = Object.freeze({
  newMessage: 'newMessage',
  messageStatusUpdated: 'messageStatusUpdated',
});

export const MODERATION_STATUS_TYPES: Record<MODERATION_STATUS_TYPE, MODERATION_STATUS_TYPE> = Object.freeze({
  IN_PROGRESS: 'IN_PROGRESS',
  SUCCEEDED: 'SUCCEEDED',
  FAILED: 'FAILED',
});

export const AUTHORIZER_EVENT: AUTHORIZER_EVENT_TYPE = Object.freeze({
  TOKEN: 'TOKEN',
  REQUEST: 'REQUEST',
});

export const LOCAL_APIGATEWAY_MANAGEMENT_ENDPOINT = 'http://localhost:3001';

export const LOCAL_DYNAMO_DB_ENDPOINT = 'http://localhost:5000';

export const TABLE = process.env.TABLE;

export const BUCKET = process.env.BUCKET;

export const REKOGNITION_MODERATION_VIDEO_SNS_TOPIC = process.env.REKOGNITION_MODERATION_VIDEO_SNS_TOPIC;

export const REKOGNITION_MODERATION_VIDEO_ROLE = process.env.REKOGNITION_MODERATION_VIDEO_ROLE;

export const WEBSOCKET_API_ID = process.env.WEBSOCKET_API_ID;

export const REGION = process.env.REGION;

export const STAGE = process.env.STAGE;

export const USERS_STORAGE_PREFIX = 'users/avatars/';

export const ROOMS_STORAGE_PREFIX = 'rooms/content/';

export const USERS_AVATAR_NAME = 'avatar';

export const GSI_FIRST = 'GSI';

export const MOCK_ROOM = '1';

export const REKOGNITION_MODERATION_LABELS_MIN_CONFIDENCE = 70;

export const REKOGNITION_MODERATION_VIDEO_MIN_CONFIDENCE = 70;

export const START_PK_REG_EXP = /(^(.*)_%3C)|(^(.*)_<)/;

export const END_PK_REG_EXP = /(%3E$)|(>$)/;

export const DB_MAPPER: DB_MAPPER_TYPE = Object.freeze({
  ENTITY: (_entity?: string) => 'ENTITY',
  USER: (userId: string) => `USER_<${userId}>`,
  ROOM: (roomId: string) => `ROOM_<${roomId}>`,
  MESSAGE: (messageId: string) => `MESSAGE_<${messageId}>`,
  CONNECTION: (connectionId: string) => `CONNECTION_<${connectionId}>`,
  RAW_PK: (partitionKey: string) => partitionKey.replace(START_PK_REG_EXP, '').replace(END_PK_REG_EXP, ''),
  LIMIT: {
    USER: (limit: string) => getLimit(limit, 100),
    ROOM: (limit: string) => getLimit(limit, 100),
    MESSAGE: (limit: string) => getLimit(limit, 100),
    CONNECTION: (limit: string) => getLimit(limit, 100),
  },
  NAME: {
    USER: 'USER',
    ROOM: 'ROOM',
    MESSAGE: 'MESSAGE',
    CONNECTION: 'CONNECTION',
    ENTITY: 'ENTITY',
  },
});

export const USER_AVATAR: FILE_REQUIREMENTS_TYPE = Object.freeze({
  MAX_SIZE: 1024 * 1024 * 5,
  EXT: new Set<FileExtension>(['jpg', 'png']),
  MIME: new Set<MimeType>(['image/jpeg', 'image/png']),
});

export const ROOM_FILES: ROOM_FILES_TYPE = Object.freeze({
  doc: {
    MAX_SIZE: 1024 * 1024 * 50,
    EXT: new Set<FileExtension>(['docx', 'odt']),
    MIME: new Set<MimeType>([
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.oasis.opendocument.text',
    ]),
  },
  image: {
    MAX_SIZE: 1024 * 1024 * 10,
    EXT: new Set<FileExtension>(['jpg', 'png']),
    MIME: new Set<MimeType>(['image/jpeg', 'image/png']),
  },
  video: {
    MAX_SIZE: 1024 * 1024 * 1000,
    EXT: new Set<FileExtension>(['mp4', 'avi']),
    MIME: new Set<MimeType>(['video/mp4', 'video/mpeg', 'video/vnd.avi']),
  },
  audio: {
    MAX_SIZE: 1024 * 1024 * 100,
    EXT: new Set<FileExtension>(['mp3', 'flac']),
    MIME: new Set<MimeType>(['audio/mpeg', 'audio/x-flac']),
  },
});
