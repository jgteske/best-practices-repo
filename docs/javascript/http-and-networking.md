# HTTP & Networking

Node's standard library covers both ends of an HTTP conversation: `node:http` for
the server, the global `fetch` for the client. Neither needs a dependency, and
knowing what they do unaided is what tells you when a framework is actually
earning its place.

<<< ../../examples/javascript/node/http-server.mjs{js}

```
server listening on http://127.0.0.1:36209

requests:
  GET /health -> 200 {"status":"ok"}
  POST /users -> 201 location=/users/2
  POST /users (no name) -> 400 {"error":"name is required"}
  GET /nope -> 404, and fetch did NOT throw (ok=false)

server closed
```

That file starts a server, calls itself, and shuts down - which is why it runs in
CI as a complete round trip rather than something you have to `curl` by hand.

## The server

### `request.url` is a path, not a URL

It is `/users?page=2` - no scheme, no host. Parse it against an origin to get
`pathname` and `searchParams` without writing your own splitter:

```js
const url = new URL(request.url, `http://${request.headers.host ?? "localhost"}`);
```

Splitting on `?` by hand mishandles encoded characters, and a naive `startsWith`
route match treats `/users/../admin` as `/users/…`. `URL` normalises.

### Every `async` handler needs a `try`/`catch`

```js
try {
  await handler(request, response);
} catch (error) {
  if (!response.headersSent) sendJson(response, 500, { error: "internal error" });
}
```

Without it the rejection escapes to `unhandledRejection`, no response is ever
written, and **the socket just hangs** until the client times out. There is no
framework-less error middleware to catch it. Note the `headersSent` check: once
the head is out you cannot change the status, so all you can do is destroy the
response.

### Bound the request body

```js
for await (const chunk of request) {
  size += chunk.length;
  if (size > limitBytes) { request.destroy(); throw new Error("request body too large"); }
  chunks.push(chunk);
}
```

A request body is a stream whose size the **client** chooses. Accumulating it
without a cap means one request can exhaust the server's memory. Count bytes
(`chunk.length` on a `Buffer` is bytes, not characters - see
[Streams & Buffers](./streams-and-buffers)), and destroy the request rather than
politely reading the rest of an attack.

Do not trust `content-length` for this: it is a claim by the client, useful for
rejecting early but not a substitute for counting what actually arrives.

### Responding

| Do | Why |
| --- | --- |
| Set `content-type` with a charset | browsers guess otherwise, usually wrongly |
| Set `content-length` when you know it | otherwise the response is chunked for no reason |
| `201` + `Location` on a successful create | the correct answer, and free to provide |
| `4xx` for the caller's mistake, `5xx` for yours | this is what alerting thresholds are built on |
| Never echo an internal error message | stack traces and SQL fragments are information disclosure |

## The client

`fetch` is global since Node 18 - the same API as the browser, backed by
[undici](https://undici.nodejs.org/).

::: warning `fetch` does not throw on 4xx or 5xx
```
  GET /nope -> 404, and fetch did NOT throw (ok=false)
```
A rejection means a *network* failure: DNS, connection refused, abort. A 500 is a
perfectly successful fetch with `response.ok === false`. This is the single most
common `fetch` bug - a `try`/`catch` around a fetch with no `response.ok` check
treats every server error as a success.
:::

```js
const response = await fetch(url, { signal: AbortSignal.timeout(5_000) });
if (!response.ok) {
  throw new Error(`${response.status} ${response.statusText} from ${url}`);
}
return await response.json();
```

**Always pass a signal.** `fetch` has no default timeout: without one, a hung
server hangs your process indefinitely.
`AbortSignal.timeout(ms)` is the one-liner; `AbortSignal.any([userSignal,
AbortSignal.timeout(ms)])` combines "the caller gave up" with "this took too
long". See [the event loop page](./event-loop-and-async#cancellation).

**Consume or cancel every body.** A response body is a stream holding a socket
open. If you check the status and return early, call `await response.body?.cancel()`
- otherwise the connection is not returned to the pool and you leak it, slowly,
under load.

**Keep-alive is on by default** in Node's fetch, so repeated requests to the same
host reuse connections. When you need to tune that - a connection cap, a
per-host pool, a proxy - reach for `undici`'s `Agent` directly; the global
`fetch` deliberately exposes no knobs.

### Retries

Retry **idempotent** requests only (`GET`, `PUT`, `DELETE`; a `POST` may have
already created something), on connection errors and `5xx`/`429` - never on
`4xx`, which will fail identically forever. Back off exponentially with jitter,
and respect `Retry-After` when the server sends it:

```js
for (let attempt = 0; ; attempt++) {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(2_000) });
    if (response.status < 500 && response.status !== 429) return response;
    if (attempt === 3) return response;
  } catch (error) {
    if (attempt === 3) throw error;
  }
  await delay(2 ** attempt * 100 + Math.random() * 100);
}
```

The jitter is not decoration: without it, every client that failed during an
outage retries in lockstep and finishes the server off as it recovers.

## When a framework earns its keep

The server above is ~60 lines and handles routing, JSON, body limits, and errors.
That scale is genuinely fine unframeworked. Reach for Express, Fastify, or Hono
when you want:

- **route parameters and wildcards** (`/users/:id`) - the `Map` lookup above does
  exact matches only, and hand-rolled path matching is where the security bugs
  live;
- **composable middleware** - auth, request IDs, logging, CORS, compression;
- **content negotiation and validation** at the edge;
- **structured error handling** with one place that turns a thrown error into a
  status code.

What does *not* change is everything on this page: you still bound bodies, still
pass a timeout signal, still never leak an internal message. A framework moves
that code; it does not delete it.

## Summary

- `request.url` is a path - parse it with `URL`, never by splitting strings.
- Wrap every `async` handler in `try`/`catch`, and check `headersSent` before
  responding to a failure.
- Cap the request body by counting bytes, and destroy the request when it
  exceeds the cap.
- `fetch` rejects only on network failure - check `response.ok`.
- Every `fetch` gets a signal; `AbortSignal.timeout` is the default answer.
- Consume or cancel response bodies so connections return to the pool.
- Retry idempotent requests only, with exponential backoff **and jitter**.
