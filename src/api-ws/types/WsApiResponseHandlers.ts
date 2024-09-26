import type { Schema } from 'yaschema';
import type { AnyQuery } from 'yaschema-api';

import type { WsApiResponseHandler } from './WsApiResponseHandler';

export type WsApiResponseHandlers<
  RequestCommandsT extends Record<string, Schema>,
  ResponseCommandsT extends Record<string, Schema>,
  QueryT extends AnyQuery
> = {
  [K in keyof ResponseCommandsT & string]: WsApiResponseHandler<RequestCommandsT, ResponseCommandsT, K, QueryT>;
};
