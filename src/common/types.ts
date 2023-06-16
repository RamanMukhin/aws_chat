export type ConnectionData = {
  userId?: string;
  username?: string;
  sourceIp?: string;
  disconnectAt?: string;
};

export type Connection = {
  PK: string;
  SK: string;
  GSI_PK: string;
  GSI_SK: string;
} & ConnectionData;
