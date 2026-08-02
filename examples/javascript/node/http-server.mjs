/**
 * An HTTP server and an HTTP client, both from the standard library.
 *
 * Run: node examples/javascript/node/http-server.mjs
 *
 * The server starts on an ephemeral port, calls itself with the built-in fetch,
 * prints what happened, and shuts down - so this file is a complete, runnable
 * round trip rather than something you have to curl by hand.
 */

import { createServer } from "node:http";
import { once } from "node:events";

const routes = new Map([
  ["GET /health", (_request, response) => sendJson(response, 200, { status: "ok" })],

  ["GET /users", (_request, response) => sendJson(response, 200, [{ id: 1, name: "ada" }])],

  ["POST /users", async (request, response) => {
    const body = await readJsonBody(request);
    if (typeof body?.name !== "string" || body.name.length === 0) {
      return sendJson(response, 400, { error: "name is required" });
    }
    // 201 + Location is the correct answer to a successful create.
    response.setHeader("Location", "/users/2");
    sendJson(response, 201, { id: 2, name: body.name });
  }],
]);

function sendJson(response, statusCode, payload) {
  const body = JSON.stringify(payload);
  response.writeHead(statusCode, {
    "content-type": "application/json; charset=utf-8",
    // Set the length when you know it: otherwise the response is chunked.
    "content-length": Buffer.byteLength(body),
  });
  response.end(body);
}

async function readJsonBody(request, { limitBytes = 1_000_000 } = {}) {
  const chunks = [];
  let size = 0;
  // A request body is a stream, and a client controls how big it is. Without a
  // cap, one request can exhaust the server's memory.
  for await (const chunk of request) {
    size += chunk.length;
    if (size > limitBytes) {
      request.destroy();
      throw new Error("request body too large");
    }
    chunks.push(chunk);
  }
  if (size === 0) return null;
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

const server = createServer(async (request, response) => {
  // `request.url` is a path, not a URL. Parsing it against a dummy origin is the
  // standard way to get the pathname and query safely.
  const url = new URL(request.url, `http://${request.headers.host ?? "localhost"}`);
  const handler = routes.get(`${request.method} ${url.pathname}`);

  try {
    if (!handler) return sendJson(response, 404, { error: "not found" });
    await handler(request, response);
  } catch (error) {
    // An exception thrown in an async handler will NOT reach any framework-less
    // error middleware - without this try/catch the socket just hangs open.
    console.error("[server] handler failed:", error.message);
    if (!response.headersSent) sendJson(response, 500, { error: "internal error" });
  }
});

// Port 0 asks the OS for any free port - the right choice in tests, so two runs
// never fight over 3000.
server.listen(0, "127.0.0.1");
await once(server, "listening");

const { port } = server.address();
const baseUrl = `http://127.0.0.1:${port}`;
console.log(`server listening on ${baseUrl}`);

// --- The client side: fetch is global, no dependency needed -----------------------

console.log("\nrequests:");

const health = await fetch(`${baseUrl}/health`);
console.log(`  GET /health -> ${health.status} ${JSON.stringify(await health.json())}`);

const created = await fetch(`${baseUrl}/users`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ name: "grace" }),
  // Always bound a request. Without a signal, a hung server hangs you too.
  signal: AbortSignal.timeout(5_000),
});
console.log(`  POST /users -> ${created.status} location=${created.headers.get("location")}`);

const rejected = await fetch(`${baseUrl}/users`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({}),
});
console.log(`  POST /users (no name) -> ${rejected.status} ${JSON.stringify(await rejected.json())}`);

// fetch only rejects on a *network* failure. A 404 or a 500 is a perfectly
// successful fetch with response.ok === false - forgetting this is the single
// most common fetch bug.
const missing = await fetch(`${baseUrl}/nope`);
console.log(`  GET /nope -> ${missing.status}, and fetch did NOT throw (ok=${missing.ok})`);

// Consume or cancel every body, or the socket is held open:
await created.body?.cancel();

server.close();
await once(server, "close");
console.log("\nserver closed");

// At this scale the standard library is enough. A framework (Express, Fastify,
// Hono) starts paying for itself once you want routing with parameters, nested
// middleware, content negotiation, and structured error handling - all of which
// you would otherwise be writing above.
