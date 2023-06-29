import { MimeType, FileExtension } from 'file-type';

export type ConnectionData = {
  userId?: string;
  username?: string;
  sourceIp?: string;
  disconnectAt?: string;
};

export type ROOM_TYPE = 'private' | 'group';

export type FILE_TYPE = 'doc' | 'image' | 'video' | 'audio';

export type MESSAGE_TYPE = 'text' | 'file';

export type MESSAGE_STATUS_TYPE = 'delivered' | 'opened';

export type WEBSOCKET_EVENT_TYPE = 'newMessage' | 'messageStatusUpdated';

export type DB_ENTITY_NAME = 'USER' | 'ROOM' | 'MESSAGE' | 'CONNECTION' | 'ENTITY';

export type MODERATION_STATUS_TYPE = 'IN_PROGRESS' | 'SUCCEEDED' | 'FAILED';

export type AWS_POLICY_EFFECT = 'Allow' | 'Deny';

export type Entity = {
  PK: string;
  SK: string;
};

export type EntityWithGSI = Entity & {
  GSI_PK: string;
  GSI_SK: string;
};

export type Connection = EntityWithGSI & ConnectionData;

export type RoomUser = EntityWithGSI;

export type AUTHORIZER_EVENT_TYPE = {
  TOKEN: 'TOKEN';
  REQUEST: 'REQUEST';
};

export type MESSAGE_DATA_TYPE = {
  data: string;
  moderationStatus?: MODERATION_STATUS_TYPE;
  failReason?: string;
};

export type WEBSOCKET_EVENT_DATA_TYPE = {
  type: WEBSOCKET_EVENT_TYPE;
  data: Record<string, any>;
};

export type DB_MAPPER_TYPE = {
  ENTITY: (arg?: string) => 'ENTITY';
  USER: (arg: string) => string;
  ROOM: (arg: string) => string;
  MESSAGE: (arg: string) => string;
  CONNECTION: (arg: string) => string;
  RAW_PK: (arg: string) => string;
  LIMIT: {
    USER: (arg: string) => number;
    ROOM: (arg: string) => number;
    MESSAGE: (arg: string) => number;
    CONNECTION: (arg: string) => number;
  };
  NAME: {
    ENTITY: 'ENTITY';
    USER: 'USER';
    ROOM: 'ROOM';
    MESSAGE: 'MESSAGE';
    CONNECTION: 'CONNECTION';
  };
};

export type FILE_REQUIREMENTS_TYPE = {
  MAX_SIZE: number;
  EXT: Set<FileExtension>;
  MIME: Set<MimeType>;
};

export type ROOM_FILES_TYPE = Record<FILE_TYPE, FILE_REQUIREMENTS_TYPE>;
