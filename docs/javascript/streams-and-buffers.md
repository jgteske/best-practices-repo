# Streams & Buffers

`readFile` pulls an entire file into memory. That is correct for a 4KB config and
an out-of-memory crash for a 4GB log. Streams process data in chunks, so memory
stays flat regardless of size - and they carry a flow-control mechanism
(backpressure) that stops a fast producer from burying a slow consumer.

## The four kinds

| Type | Direction | Examples |
| --- | --- | --- |
| **Readable** | source | `createReadStream`, an HTTP request, `process.stdin` |
| **Writable** | sink | `createWriteStream`, an HTTP response, `process.stdout` |
| **Duplex** | both, independent | a TCP socket |
| **Transform** | both, connected | `createGzip`, a cipher, your own line filter |

<<< ../../examples/javascript/node/streams-pipeline.mjs{js}

## `pipeline()`, not `.pipe()`

```
pipeline:
  286742 bytes in -> 390 bytes out (filtered + gzipped)
  peak memory held: one chunk at a time, not the whole file
```

```js
await pipeline(
  createReadStream(logPath),   // read
  errorsOnly,                  // transform
  createGzip(),                // transform
  createWriteStream(gzPath),   // write
);
```

`pipeline` from `node:stream/promises` is the only correct way to chain streams.
`a.pipe(b).pipe(c)` looks equivalent and is not: **it does not forward errors**,
and when one link fails it leaves the others open. That is how a process ends up
with leaked file descriptors and a rejection nobody handled.

```
error handling:
  pipeline rejected: transform blew up
  every stream in the chain was destroyed - no leaked descriptors
```

One `await`, one `try`/`catch`, and every stream in the chain is destroyed on
failure. There is no version of `.pipe()` that gets you that.

## Backpressure

A readable stream produces as fast as the source allows; a writable stream
accepts until its internal buffer (the `highWaterMark`, 64KB by default) is full,
then says "wait". Backpressure is that signal travelling back up the chain to
pause the source.

`pipeline` and `for await` handle it for you. The only way to lose it is to
ignore the return value of `write()`:

```js
for (const row of millionsOfRows) {
  stream.write(row);   // returns false when the buffer is full - and we ignored it
}
```

Nothing here is wrong syntactically; it just buffers the entire dataset in
memory, which is the exact problem streams exist to prevent. Use `pipeline` with
`Readable.from(iterable)` instead, and the pausing happens automatically.

## Consuming a stream

**`for await` is the readable way.** A readable stream is an async iterable, and
the loop body awaiting is what applies backpressure:

```js
for await (const chunk of createReadStream(path)) { … }
```

**For text, split lines with `readline`** rather than by hand:

```
line-by-line with readline:
  counted 4241 INFO, 707 WARN, 52 ERROR
```

```js
const reader = createInterface({
  input: createReadStream(logPath),
  crlfDelay: Infinity,   // treat \r\n as a single break
});
for await (const line of reader) { … }
```

::: warning Chunk boundaries do not respect your data
A chunk is an arbitrary number of bytes. It will land mid-line, mid-JSON-object,
and mid-multi-byte-character. The `Transform` in the example has to hold a
`leftover` partial line back for the next chunk and flush it at the end - which
is precisely the bookkeeping `readline` (or `StringDecoder`, for text) does for
you. Do not hand-roll it unless you have a reason.
:::

## Producing a stream

`Readable.from(iterable)` turns any iterable or async generator into a stream,
which is almost always easier than implementing `_read()`:

```
Readable.from a generator: row-0, row-1, row-2
```

```js
async function* generateRows() {
  for await (const page of paginate()) yield* page.items;
}
await pipeline(Readable.from(generateRows()), transform, destination);
```

An async generator also works directly as a pipeline stage - the `async
function* (source)` form in the example - which is usually more readable than a
`Transform` subclass for anything with per-chunk logic.

## When *not* to stream

```
readFile for comparison:
  same 5000 lines, but the entire file was resident
  fine at 280KB; an out-of-memory crash at 25GB
```

Streams cost complexity. Reach for one when **you do not control the size** -
user uploads, log files, database exports, an HTTP response body - or when
latency matters and the consumer can start before the producer finishes. For a
config file, a fixture, or a JSON payload you already bounded at the edge,
`readFile` is clearer and there is no prize for streaming it.

## `Buffer` and typed arrays

`Buffer` is Node's binary type, and a subclass of `Uint8Array` - so anything
accepting a typed array accepts a `Buffer`, including `crypto`, `fetch` bodies,
and `TextDecoder`.

| Task | Call |
| --- | --- |
| String → bytes | `Buffer.from(str, "utf8")` |
| Bytes → string | `buf.toString("utf8")` |
| Hex / base64 | `buf.toString("hex")`, `Buffer.from(b64, "base64")` |
| Fixed-size zeroed | `Buffer.alloc(n)` |
| Join chunks | `Buffer.concat(chunks)` |
| A view, no copy | `buf.subarray(start, end)` |
| Constant-time compare | `crypto.timingSafeEqual(a, b)` |

Two things worth internalising:

- **`buf.subarray()` shares memory; `buf.slice()` on a plain array copies.** A
  `Buffer` returned from `subarray` is a view - writing through it mutates the
  original. That is a feature for parsing and a bug when you meant to keep a copy.
- **`Buffer.allocUnsafe(n)` is faster and returns uninitialised memory**, which
  may contain fragments of whatever was there before. Only use it when you
  immediately overwrite every byte.

`.length` on a `Buffer` is **bytes**, not characters. `"café".length` is 4;
`Buffer.byteLength("café")` is 5. Any size limit you enforce on incoming data -
see [HTTP & Networking](./http-and-networking) - must count bytes.

For text specifically, `TextDecoder`/`TextEncoder` are the standard, cross-
platform pair, and `new TextDecoder("utf-8", { fatal: true })` will actually
reject malformed input rather than silently substituting `�`.

## Web streams

Node also implements the WHATWG streams API (`ReadableStream`,
`WritableStream`, `TransformStream`) - that is what a `fetch` response `.body`
is. Convert when you need to cross between the two worlds:

```js
import { Readable } from "node:stream";

const response = await fetch(url);
await pipeline(Readable.fromWeb(response.body), createWriteStream(dest));
```

Node streams have the richer ecosystem inside Node; web streams are what you get
from `fetch` and what runs unchanged in a browser or an edge runtime. Pick per
boundary, and convert at it.

## Summary

- Stream when you do not control the size; `readFile` when you do.
- `pipeline()` from `node:stream/promises` - never a chain of `.pipe()`, which
  drops errors and leaks descriptors.
- Backpressure is automatic with `pipeline` and `for await`, and lost the moment
  you ignore `write()`'s return value.
- Chunk boundaries land mid-line; let `readline` or `StringDecoder` handle it.
- `Readable.from(asyncGenerator)` is the easy way to make a source.
- `Buffer` is a `Uint8Array`; `.length` is bytes; `subarray` is a view, not a
  copy.
- `Readable.fromWeb`/`.toWeb` bridge to the `fetch`-style web streams.
