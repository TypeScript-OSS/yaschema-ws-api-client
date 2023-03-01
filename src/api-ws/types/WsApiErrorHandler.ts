import type { AnyQuery } from 'yaschema-ws-api';

export type WsApiErrorHandler<QueryT extends AnyQuery> = (args: { ws: WebSocket; query: QueryT; error: Error }) => Promise<void>;
