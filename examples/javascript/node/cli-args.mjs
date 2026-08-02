/**
 * Reading arguments, environment, and stdin - the whole surface of a small CLI,
 * with no dependencies.
 *
 * Run: node examples/javascript/node/cli-args.mjs --name=ada --verbose extra.txt
 */

import { parseArgs } from "node:util";
import process from "node:process";

// process.argv is always [execPath, scriptPath, ...theRest]. Slicing off the
// first two by hand is the single most common Node CLI bug; parseArgs does it
// for you and validates while it is at it.
const { values, positionals } = parseArgs({
  options: {
    name: { type: "string", short: "n", default: "world" },
    verbose: { type: "boolean", short: "v", default: false },
    retries: { type: "string", default: "3" }, // parseArgs has no number type
  },
  allowPositionals: true,
  // With this false (the default) an unknown flag throws - usually what you want,
  // because a typo'd flag silently ignored is worse than a crash.
  strict: true,
});

const retries = Number(values.retries);
if (!Number.isInteger(retries) || retries < 0) {
  console.error(`--retries must be a non-negative integer, got ${values.retries}`);
  process.exitCode = 64; // EX_USAGE, the conventional exit code for bad arguments
} else {
  console.log("parsed arguments:");
  console.log("  name .........", values.name);
  console.log("  verbose ......", values.verbose);
  console.log("  retries ......", retries);
  console.log("  positionals ..", positionals.length ? positionals.join(", ") : "(none)");
}

// --- Environment -----------------------------------------------------------------
// Every value in process.env is a string or undefined - there are no booleans and
// no numbers. Read config once, at startup, and validate it there.

const config = {
  logLevel: process.env.LOG_LEVEL ?? "info",
  // "false", "0" and "" are all truthy strings, so compare explicitly:
  colour: process.env.NO_COLOR === undefined,
  port: Number(process.env.PORT ?? 3000),
};

console.log("\nenvironment:");
console.log("  LOG_LEVEL ....", config.logLevel, "(defaulted)");
console.log("  colour .......", config.colour);
console.log("  PORT .........", config.port, Number.isInteger(config.port) ? "" : "<- NOT a number");
console.log("  node version .", process.version, "on", `${process.platform}/${process.arch}`);

// `node --env-file=.env script.mjs` loads a .env file with no dotenv dependency.

// --- Writing output --------------------------------------------------------------
// Results go to stdout, diagnostics go to stderr. That is what makes
// `node script.mjs > out.json` work while you can still see the progress logs.

console.log(JSON.stringify({ name: values.name, retries }));
console.error("[diagnostic] this line is stderr, so it stays out of the pipe");

// Set process.exitCode and let the process end naturally. process.exit() quits
// immediately and can truncate a stdout write that has not flushed yet.
