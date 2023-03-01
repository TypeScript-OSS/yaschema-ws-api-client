import type { AnyQuery } from 'yaschema-ws-api';

export type WsApiConnectionChangeHandler<QueryT extends AnyQuery> = (args: { ws: WebSocket; query: QueryT }) => Promise<void>;
