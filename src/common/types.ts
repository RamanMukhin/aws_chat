export type ConnectionData = { userId?: string; username?: string; disconnectAt?: string };

export type Connection = { connectionId: string } & ConnectionData;
