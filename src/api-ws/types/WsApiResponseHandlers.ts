import type { Schema } from 'yaschema';
import type { AnyQuery } from 'yaschema-ws-api';

import type { WsApiResponseHandler } from './WsApiResponseHandler';

export type WsApiResponseHandlers<
  RequestCommandsT extends Record<string, Schema>,
  ResponseCommandsT extends Record<string, Schema>,
  QueryT extends AnyQuery
> = {
  [K in keyof RequestCommandsT & string]: WsApiResponseHandler<RequestCommandsT, ResponseCommandsT, K, QueryT>;
};
