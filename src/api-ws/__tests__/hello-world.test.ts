import { WebSocket } from 'ws';

import type { CommonWebSocket } from '../../config/websocket';
import { setWebSocket } from '../../config/websocket';

describe('Hello World', () => {
  it('Hello World', () => {
    setWebSocket(WebSocket as any as CommonWebSocket);

    expect(true).toBe(true);
  });
});
