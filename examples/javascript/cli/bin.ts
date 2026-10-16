#!/usr/bin/env node
// The installed `logq` command: connects run() to the real process. Kept tiny
// on purpose - everything worth testing lives in cli.ts.
//
// Ctrl-C needs no handler: Node's default is to die by SIGINT, which the shell
// reports as exit 130 with no stack trace. Add a handler only when there is
// something to clean up (a temp file, a half-written output), and then exit 130.
import process from "node:process";
import { run } from "./cli.ts";

process.exitCode = await run({
  argv: process.argv.slice(2), // drop [execPath, scriptPath]
  stdin: process.stdin,
  stdout: process.stdout,
  stderr: process.stderr,
  env: process.env,
});
