import bodyParser from 'body-parser';
import express from 'express';
import type { WithWebsocketMethod } from 'express-ws';
import expressWs from 'express-ws';
import { finalizeApiHandlerRegistrations } from 'express-yaschema-api-handler';
import { registerWsApiHandler } from 'express-yaschema-ws-api-handler';
import type * as http from 'http';
import WebSocket from 'ws';
import { schema } from 'yaschema';
import { setDefaultUrlBase, setUrlBaseForRouteType } from 'yaschema-api';
import { makeWsApi } from 'yaschema-ws-api';

import type { CommonWebSocket } from '../../config/websocket';
import { setWebSocket } from '../../config/websocket';
import { waitFor } from '../__test_dependency__/wait-for';
import { apiWs } from '../api-ws';

const port = Number.parseInt(process.env.PORT ?? '8088');

export const stream = makeWsApi({
  routeType: 'stream',
  url: '/stream',
  schemas: {
    requests: {
      ping: schema.object({ echo: schema.string().allowEmptyString().optional() }).optional(),
      hello: schema.any().optional()
    },
    responses: {
      pong: schema.object({
        body: schema.string()
      }),
      hello: schema.object({
        body: schema.string()
      })
    }
  }
});

describe('Stream', () => {
  let server: http.Server | undefined;

  beforeAll(
    async () =>
      new Promise<void>((resolve, reject) => {
        const app = express();

        app.use(bodyParser.json({ type: 'application/json' }));

        expressWs(app);
        const appWithWs = app as typeof app & WithWebsocketMethod;

        registerWsApiHandler(
          appWithWs,
          stream,
          {},
          {
            ping: async ({ express, input, output }) => {
              console.log('New ping request with query:', express.req.query, 'and params:', express.req.params);

              output.pong({ body: `PONG${(input?.echo?.length ?? 0) > 0 ? ' ' : ''}${input?.echo ?? ''}` });
            },
            hello: async ({ output }) => output.hello({ body: 'world' })
          }
        );

        finalizeApiHandlerRegistrations();

        try {
          server = app.listen(port, () => {
            console.log(`Example app listening on port ${port}`);

            resolve();
          });
        } catch (e) {
          reject(e);
        }
      })
  );

  beforeAll(() => {
    setDefaultUrlBase(`http://localhost:${port}`);
    setUrlBaseForRouteType('stream', `ws://localhost:${port}`);
    setWebSocket(WebSocket as any as CommonWebSocket);
  });

  afterAll(
    async () =>
      new Promise<void>((resolve, reject) => {
        if (server === undefined) {
          return resolve();
        }

        server.close((error) => {
          if (error !== undefined) {
            reject(error);
          } else {
            resolve();
          }
        });
      })
  );

  it('should work', async () => {
    const got: string[] = [];
    let isConnected = false;
    let connection = await apiWs(
      stream,
      {},
      {
        hello: async ({ input }) => {
          got.push(`hello response: ${input.body}`);
        },
        pong: async ({ input }) => {
          got.push(`pong response: ${input.body}`);
        }
      },
      {
        onConnect: async () => {
          isConnected = true;
        },
        onDisconnect: async () => {
          isConnected = false;
        }
      }
    );

    for (let i = 0; i < 2; i += 1) {
      if (i > 0) {
        connection = await connection.reconnect();
      }

      try {
        await waitFor(() => expect(isConnected).toBeTruthy());

        expect(connection.ws.readyState).toBe(WebSocket.OPEN);

        await connection.output.hello('test');
        await waitFor(() => expect(got[got.length - 1]).toBe('hello response: world'));

        await connection.output.ping({ echo: 'Hello World!' });
        await waitFor(() => expect(got[got.length - 1]).toBe('pong response: PONG Hello World!'));

        expect(true).toBe(true);
      } finally {
        connection.ws.close();

        await waitFor(() => expect(isConnected).toBeFalsy());

        expect(connection.ws.readyState).toBe(WebSocket.CLOSED);
      }
    }
  });
});
