export const API_VERSION = process.env.API_VERSION || '2018-11-29';

export const STAGES = {
  LOCAL: 'local',
  DEV: 'dev',
};

export const ROOM_TYPES = {
  PRIVATE: 'private',
  GROUP: 'group',
};

export const LOCAL_APIGATEWAY_MANAGEMENT_ENDPOINT = 'http://localhost:3001';

export const LOCAL_DYNAMO_DB_ENDPOINT = 'http://localhost:5000';

export const TABLE = process.env.TABLE;

export const MOCK_ROOM = '1';

export const START_PK_REG_EXP = /^(.*)_</;

export const END_PK_REG_EXP = />$/;

export const DB_MAPPER = {
  ENTITY: 'ENTITY',
  USER: (userId: string) => `USER_<${userId}>`,
  ROOM: (roomId: string) => `ROOM_<${roomId}>`,
  MESSAGE: (messageId: string) => `MESSAGE_<${messageId}>`,
  CONNECTION: (connectionId: string) => `CONNECTION_<${connectionId}>`,
  RAW_PK: (partitionKey: string) => partitionKey.replace(START_PK_REG_EXP, '').replace(END_PK_REG_EXP, ''),
};
