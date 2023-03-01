import type { AnyCommands } from 'yaschema-ws-api';

export type WsApiRequestors<RequestCommandsT extends AnyCommands> = {
  [K in keyof RequestCommandsT & string]: (value: RequestCommandsT[K]['valueType']) => Promise<void>;
};
