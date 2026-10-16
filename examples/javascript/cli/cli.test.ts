// Tests for logq. Most call run() in-process with fake streams and a fake
// environment; a few spawn the real `node bin.ts` to test the process-level
// behaviour (pipes, signals) that in-process tests can't see.
//
// Run: node --test examples/javascript/cli/

import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PassThrough, Readable } from "node:stream";
import { describe, it } from "node:test";
import { run } from "./cli.ts";
import { resolveSettings, type ColorMode, type Env } from "./config.ts";
import { CliError } from "./core.ts";
import { useColor } from "./output.ts";

const SAMPLE = join(import.meta.dirname, "sample.log");

// A writable that collects everything written to it, optionally posing as a terminal.
function sink(isTTY = false) {
  const stream = Object.assign(new PassThrough(), { isTTY });
  const chunks: string[] = [];
  stream.on("data", (chunk: Buffer) => chunks.push(chunk.toString()));
  return { stream, text: () => chunks.join("") };
}

async function logq(argv: string[], opts: { stdin?: string; env?: Env; tty?: boolean } = {}) {
  const out = sink(opts.tty);
  const err = sink();
  const code = await run({ argv, stdin: Readable.from([opts.stdin ?? ""]), stdout: out.stream, stderr: err.stream, env: opts.env ?? {} });
  return { code, out: out.text(), err: err.text() };
}

// #region test-precedence
describe("settings precedence", () => {
  it("uses defaults when nothing is set", () => {
    assert.deepEqual(resolveSettings({ flags: {}, env: {} }).minLevel, { value: "INFO", source: "default" });
  });

  const file = { source: "config.json", values: { minLevel: "debug" } };
  const cases: [string, Env, string | undefined, { value: string; source: string }][] = [
    ["file beats default", {}, undefined, { value: "DEBUG", source: "config.json" }],
    ["env beats file", { LOGQ_MIN_LEVEL: "warn" }, undefined, { value: "WARN", source: "LOGQ_MIN_LEVEL" }],
    ["flag beats env", { LOGQ_MIN_LEVEL: "warn" }, "error", { value: "ERROR", source: "--min-level" }],
    ["empty env var is unset", { LOGQ_MIN_LEVEL: "" }, undefined, { value: "DEBUG", source: "config.json" }],
  ];
  for (const [name, env, flag, expected] of cases) {
    it(name, () => assert.deepEqual(resolveSettings({ flags: { minLevel: flag }, env, file }).minLevel, expected));
  }

  it("names where a bad value came from", () => {
    assert.throws(() => resolveSettings({ flags: {}, env: { LOGQ_MIN_LEVEL: "loud" } }), {
      name: "CliError",
      message: /unknown level 'loud'.*\(from LOGQ_MIN_LEVEL\)/,
    });
  });

  it("finds the config file through the environment", async () => {
    const home = await mkdtemp(join(tmpdir(), "logq-"));
    await mkdir(join(home, "logq"));
    await writeFile(join(home, "logq", "config.json"), JSON.stringify({ min_level: "error" }));
    const { code, out } = await logq(["filter", "-q", SAMPLE], { env: { XDG_CONFIG_HOME: home } });
    assert.equal(code, 0);
    assert.equal(out, "2026-10-16T09:04:05Z ERROR upload failed: connection reset\n");
  });

  it("-v explains each setting", async () => {
    const { err } = await logq(["filter", "-v", SAMPLE], { env: { LOGQ_MIN_LEVEL: "warn" } });
    assert.match(err, /min_level=WARN \(from LOGQ_MIN_LEVEL\)/);
    assert.match(err, /color=auto \(from default\)/);
  });
});
// #endregion test-precedence

// #region test-output
describe("output", () => {
  it("--json prints one parseable document", async () => {
    const { code, out, err } = await logq(["stats", "--json", SAMPLE]);
    assert.equal(code, 0);
    assert.deepEqual(JSON.parse(out), { total: 6, levels: { DEBUG: 1, INFO: 3, WARN: 1, ERROR: 1 }, malformed: 1 });
    assert.match(err, /skipping malformed line/); // diagnostics never pollute stdout
  });

  it("-q silences warnings but not data", async () => {
    const { out, err } = await logq(["stats", "-q", SAMPLE]);
    assert.match(out, /total {2}6/);
    assert.equal(err, "");
  });

  it("reads stdin when no files are given", async () => {
    assert.deepEqual(await logq(["filter", "-l", "warn"], { stdin: "t1 INFO a\nt2 WARN b\n" }), { code: 0, out: "t2 WARN b\n", err: "" });
  });

  const colorCases: [ColorMode, boolean, Env, boolean][] = [
    ["auto", true, {}, true],
    ["auto", false, {}, false], // piped: no escape codes in the file
    ["auto", true, { NO_COLOR: "1" }, false],
    ["auto", true, { TERM: "dumb" }, false],
    ["auto", false, { FORCE_COLOR: "1" }, true],
    ["always", false, { NO_COLOR: "1" }, true], // an explicit choice wins
    ["never", true, {}, false],
  ];
  for (const [mode, isTTY, env, expected] of colorCases) {
    it(`color ${mode}, tty=${isTTY}, ${JSON.stringify(env)} -> ${expected}`, () => assert.equal(useColor(mode, { isTTY, env }), expected));
  }

  it("colours tables only on a terminal", async () => {
    assert.match((await logq(["stats", "-q", SAMPLE], { tty: true })).out, /\x1b\[1;31mERROR/);
    assert.doesNotMatch((await logq(["stats", "-q", SAMPLE])).out, /\x1b\[/);
  });
});
// #endregion test-output

// #region test-errors
describe("errors and exit codes", () => {
  it("usage errors exit 2", async () => {
    const { code, err } = await logq(["filter", "--min-level", "loud"]);
    assert.equal(code, 2);
    assert.match(err, /--min-level must be one of/);
    assert.equal((await logq(["stats", "--colour"])).code, 2); // misspelled flag
    assert.equal((await logq(["frob"])).code, 2);
  });

  it("runtime errors exit 1 with one line", async () => {
    assert.deepEqual(await logq(["stats", "missing.log"]), { code: 1, out: "", err: "logq: error: missing.log: no such file\n" });
  });

  it("--strict turns a malformed line into an error", async () => {
    const { code, err } = await logq(["stats", "--strict", SAMPLE]);
    assert.equal(code, 1);
    assert.match(err, /sample\.log:5: malformed line/);
  });

  it("CliError carries its exit code", () => assert.equal(new CliError("x").exitCode, 1));
});
// #endregion test-errors

// #region test-process
describe("as a process", () => {
  const bin = join(import.meta.dirname, "bin.ts");
  const spawnLogq = (args: string[]) => spawn(process.execPath, [bin, ...args], { env: { PATH: process.env.PATH } });

  it("a closed pipe ends quietly with 141", async () => {
    const big = join(await mkdtemp(join(tmpdir(), "logq-")), "big.log");
    await writeFile(big, Array.from({ length: 200_000 }, (_, n) => `t${n} INFO line ${n}\n`).join(""));
    const child = spawnLogq(["filter", big]);
    let stderr = "";
    child.stderr.on("data", (chunk: Buffer) => (stderr += chunk));
    const [first] = (await once(child.stdout, "data")) as [Buffer];
    assert.match(first.toString(), /^t0 INFO line 0\n/);
    child.stdout.destroy(); // what `head -1` does after its first line
    const [code] = await once(child, "close");
    assert.deepEqual({ code, stderr }, { code: 141, stderr: "" }); // no EPIPE stack trace
  });

  it("a reader that never reads also gets 141", async () => {
    // Like `logq stats app.log | true`: one small write, which only fails after it was handed off.
    const child = spawnLogq(["stats", "-q", join(import.meta.dirname, "sample.log")]);
    child.stdout.destroy(); // before the child has even started up
    let stderr = "";
    child.stderr.on("data", (chunk: Buffer) => (stderr += chunk));
    const [code] = await once(child, "close");
    assert.deepEqual({ code, stderr }, { code: 141, stderr: "" });
  });

  it("Ctrl-C ends the process by SIGINT (the shell shows 130)", { skip: process.platform === "win32" }, async () => {
    const child = spawnLogq(["stats", "-v"]);
    await once(child.stderr, "data"); // -v prints before reading stdin: now it is waiting for input
    child.kill("SIGINT");
    const [code, signal] = await once(child, "close");
    assert.deepEqual([code, signal], [null, "SIGINT"]);
  });
});
// #endregion test-process
