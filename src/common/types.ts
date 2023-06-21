export type ConnectionData = {
  userId?: string;
  username?: string;
  sourceIp?: string;
  disconnectAt?: string;
};

type Entity = {
  PK: string;
  SK: string;
};

type EntityWithGSI = Entity & {
  GSI_PK: string;
  GSI_SK: string;
};

export type Connection = EntityWithGSI & ConnectionData;

export type RoomUser = EntityWithGSI;
