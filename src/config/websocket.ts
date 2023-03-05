export interface CommonWebSocket {
  new (url: string | URL, protocols?: string | string[]): WebSocket;
  readonly CLOSED: number;
  readonly CLOSING: number;
  readonly CONNECTING: number;
  readonly OPEN: number;
}

let globalWebSocket: CommonWebSocket | undefined;

/** Gets the configured `WebSocket` implementation */
export const getWebSocket = () => globalWebSocket ?? WebSocket;

/** Use to override the `WebSocket` implementation, e.g. to use ws */
export const setWebSocket = (webSocket: CommonWebSocket) => {
  globalWebSocket = webSocket;
};
