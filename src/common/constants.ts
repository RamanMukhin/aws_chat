import { AUTHORIZER_EVENT_TYPE, DB_MAPPER_TYPE } from './types';
import { getLimit } from './utils';

export const API_VERSION = process.env.API_VERSION || '2018-11-29';

export const STAGES = Object.freeze({
  LOCAL: 'local',
  DEV: 'dev',
});

export const ROOM_TYPES = Object.freeze({
  PRIVATE: 'private',
  GROUP: 'group',
});

export const AUTHORIZER_EVENT: AUTHORIZER_EVENT_TYPE = Object.freeze({
  TOKEN: 'TOKEN',
  REQUEST: 'REQUEST',
});

export const LOCAL_APIGATEWAY_MANAGEMENT_ENDPOINT = 'http://localhost:3001';

export const LOCAL_DYNAMO_DB_ENDPOINT = 'http://localhost:5000';

export const TABLE = process.env.TABLE;

export const GSI_FIRST = 'GSI';

export const MOCK_ROOM = '1';

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
