import type { AnyQuery } from 'yaschema-api';
import type { AnyCommands } from 'yaschema-ws-api';

import type { WsApiRequestors } from './WsApiRequestors';

export type WsApiResponseHandler<
  RequestCommandsT extends AnyCommands,
  ResponseCommandsT extends AnyCommands,
  CommandNameT extends keyof ResponseCommandsT & string,
  QueryT extends AnyQuery
> = (args: {
  ws: WebSocket;
  query: QueryT;
  input: ResponseCommandsT[CommandNameT]['valueType'];
  output: WsApiRequestors<RequestCommandsT>;
}) => Promise<void>;
