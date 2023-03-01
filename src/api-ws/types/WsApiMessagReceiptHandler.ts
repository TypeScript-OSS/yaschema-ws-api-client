import type { AnyQuery } from 'yaschema-ws-api';

export type WsApiMessageReceiptHandler<QueryT extends AnyQuery> = (args: { ws: WebSocket; query: QueryT; message: any }) => Promise<void>;
