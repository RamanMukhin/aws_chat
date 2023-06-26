import { MimeType, FileExtension } from 'file-type';

export type ConnectionData = {
  userId?: string;
  username?: string;
  sourceIp?: string;
  disconnectAt?: string;
};

export type DB_ENTITY_NAME = 'USER' | 'ROOM' | 'MESSAGE' | 'CONNECTION' | 'ENTITY';

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

export type USER_AVATAR_TYPE = {
  MAX_SIZE: number;
  EXT: Set<FileExtension>;
  MIME: Set<MimeType>;
};
