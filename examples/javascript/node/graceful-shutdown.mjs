/**
 * Error handling and graceful shutdown: the boilerplate every long-running Node
 * process needs, and nothing more.
 *
 * Run: node examples/javascript/node/graceful-shutdown.mjs
 *
 * The script starts a server, sends itself SIGTERM after a moment, and shuts
 * down cleanly - so you can watch the whole lifecycle in one run.
 */

import { createServer } from "node:http";
import { once } from "node:events";
import process from "node:process";

// --- Errors worth defining ----------------------------------------------------------
// Subclass Error so callers can branch on the type rather than on message text,
// and keep the original failure attached with `cause`.

class ConfigError extends Error {
  constructor(message, options) {
    super(message, options);
    this.name = "ConfigError"; // otherwise stack traces say "Error"
    this.exitCode = 78; // EX_CONFIG
  }
}

try {
  try {
    JSON.parse("{ not json }");
  } catch (error) {
    throw new ConfigError("config.json is not valid JSON", { cause: error });
  }
} catch (error) {
  console.log("errors:");
  console.log("  name .......", error.name);
  console.log("  instanceof .", error instanceof ConfigError, error instanceof Error);
  console.log("  cause ......", error.cause.name + ":", error.cause.message.split("\n")[0]);
}

// --- The two process-level safety nets ------------------------------------------------
// These are for *logging and dying*, not for recovery. After an uncaught
// exception the process state is unknown - keeping it alive is how a healthy
// pod turns into one that answers requests with corrupt data.

process.on("uncaughtException", (error, origin) => {
  console.error(`[fatal] uncaught ${origin}:`, error.message);
  process.exitCode = 1;
  void shutdown("uncaughtException");
});

process.on("unhandledRejection", (reason) => {
  // Since Node 15 this terminates the process by default. Log it, then let it.
  console.error("[fatal] unhandled rejection:", reason instanceof Error ? reason.message : reason);
  process.exitCode = 1;
});

// --- A server that finishes what it started -------------------------------------------

let inFlight = 0;

const server = createServer(async (request, response) => {
  inFlight += 1;
  try {
    await new Promise((resolve) => setTimeout(resolve, 50)); // pretend work
    response.writeHead(200, { "content-type": "text/plain" });
    response.end("done\n");
  } finally {
    inFlight -= 1;
  }
});

server.listen(0, "127.0.0.1");
await once(server, "listening");
const { port } = server.address();
console.log(`\nlifecycle:\n  listening on 127.0.0.1:${port}`);

// --- Shutdown ---------------------------------------------------------------------------

let shuttingDown = false;

async function shutdown(signal) {
  // A second Ctrl-C must not restart the teardown half-way through.
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`  ${signal} received - draining ${inFlight} in-flight request(s)`);

  // Stop accepting new connections; existing ones are allowed to finish.
  server.close();

  // The deadline matters: without it a single hung keep-alive connection keeps
  // the process alive forever and your orchestrator SIGKILLs it anyway.
  const deadline = setTimeout(() => {
    console.error("  drain timed out - forcing exit");
    process.exit(1);
  }, 5_000);
  deadline.unref(); // do not let this timer itself hold the loop open

  await once(server, "close");
  clearTimeout(deadline);

  // Release everything else here: database pools, queue consumers, open files.
  console.log("  closed cleanly; exit code", process.exitCode ?? 0);
}

// SIGTERM is what Docker, Kubernetes, and systemd send. SIGINT is Ctrl-C.
// SIGKILL cannot be caught - which is exactly why the deadline above exists.
for (const signal of ["SIGTERM", "SIGINT"]) {
  process.on(signal, () => void shutdown(signal));
}

// Prove it works: fire a request, then signal ourselves mid-flight.
const pending = fetch(`http://127.0.0.1:${port}/`).then((r) => r.text());
setTimeout(() => process.kill(process.pid, "SIGTERM"), 20);

console.log("  in-flight response:", (await pending).trim(), "<- served despite the SIGTERM");
