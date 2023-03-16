# yaschema-ws-api-client

[![Downloads][downloads-badge]][downloads]
[![Size][size-badge]][size]

Client supporting WebSockets via yaschema-ws-api

## Basic Example

```typescript
export const stream = makeWsApi({
  routeType: 'stream',
  url: '/stream',
  schemas: {
    requests: {
      ping: schema.object({ echo: schema.string().allowEmptyString().optional() }).optional()
    },
    responses: {
      pong: schema.object({
        body: schema.string()
      })
    }
  }
});
```

```typescript
const connection = await apiWs(
  stream,
  {},
  {
    pong: async ({ input }) => {
      console.log(`GOT ${input.body}`)
    }
  }
);

await connection.output.ping({ echo: 'Hello World!' });
```

The above example demonstrates basic use of a yaschema-ws-api-client, which lets you define runtime and compile-time types for bidirectionally working with WebSockets.  See the [express-yaschema-ws-api-handler](https://www.npmjs.com/package/express-yaschema-ws-api-handler) package for adding handlers to Express.

This library supports web-based WebSockets by default and supports the Node [ws](https://www.npmjs.com/package/ws) package by calling:

```typescript
setWebSocket(WebSocket as any as CommonWebSocket);
```

While the Node ws WebSocket interface doesn't perfectly align with the web equivalent, for the aspects we use, it does.

## Thanks

Thanks for checking it out.  Feel free to create issues or otherwise provide feedback.

[API Docs](https://typescript-oss.github.io/yaschema-ws-api-client/)

Be sure to check out our other [TypeScript OSS](https://github.com/TypeScript-OSS) projects as well.

<!-- Definitions -->

[downloads-badge]: https://img.shields.io/npm/dm/yaschema-ws-api-client.svg

[downloads]: https://www.npmjs.com/package/yaschema-ws-api-client

[size-badge]: https://img.shields.io/bundlephobia/minzip/yaschema-ws-api-client.svg

[size]: https://bundlephobia.com/result?p=yaschema-ws-api-client
