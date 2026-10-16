// The command-line layer: parse argv, resolve settings, run a command, map the
// outcome to an exit code. All I/O is passed in, so tests never touch the real
// terminal, environment or home directory. bin.ts wires it to `process`.

import { open } from "node:fs/promises";
import { createInterface } from "node:readline";
import type { Readable, Writable } from "node:stream";
import { parseArgs, type ParseArgsConfig } from "node:util";
import { COLOR_MODES, configPath, loadConfigFile, resolveSettings, type Env, type Settings } from "./config.ts";
import { atLeast, CliError, emptyStats, LEVELS, parseLine, statsJson, UsageError, type LogRecord, type Stats } from "./core.ts";
import { BrokenPipe, Diagnostics, Output, recordDocument, renderJson, renderTable, useColor } from "./output.ts";

export const VERSION = "1.0.0";

export type Io = {
  argv: readonly string[]; // without node and the script path
  stdin: Readable;
  stdout: Writable & { isTTY?: boolean };
  stderr: Writable;
  env: Env;
};

// #region parser
// parseArgs has no subcommands, so the command is the first argument and each
// command declares its own options on top of the common ones.
const COMMON = {
  json: { type: "boolean", default: false },
  color: { type: "string" },
  config: { type: "string" },
  strict: { type: "boolean", default: false },
  verbose: { type: "boolean", short: "v", default: false },
  quiet: { type: "boolean", short: "q", default: false },
  help: { type: "boolean", short: "h", default: false },
} as const satisfies ParseArgsConfig["options"];

const USAGE = `usage: logq [--version] COMMAND [options] [FILE ...]

Summarize and filter log files. FILE '-' or no FILE reads stdin.

commands:
  stats                 count lines per level
  filter                print lines at or above a level
    -l, --min-level L   lowest level to keep (default: INFO)

options:
  --json                machine-readable output
  --color MODE          auto, always or never (default: auto)
  --config PATH         config file (default: $LOGQ_CONFIG, then XDG)
  --strict              treat a malformed line as an error
  -v, --verbose         explain what is happening, on stderr
  -q, --quiet           only report errors
  -h, --help            show this help
`;

function parse(command: string, args: readonly string[], extra: ParseArgsConfig["options"] = {}) {
  try {
    const { values, positionals } = parseArgs({
      args: [...args],
      options: { ...COMMON, ...extra },
      allowPositionals: true,
      strict: true, // an unknown or misspelled flag is an error, not silently ignored
    });
    if (values.verbose && values.quiet) throw new UsageError("--verbose and --quiet are mutually exclusive");
    if (typeof values.color === "string" && !(COLOR_MODES as readonly string[]).includes(values.color)) {
      throw new UsageError(`--color must be one of ${COLOR_MODES.join(", ")}`);
    }
    return { values, files: positionals };
  } catch (error) {
    if (error instanceof UsageError) throw error;
    // parseArgs throws TypeError with an ERR_PARSE_ARGS_* code for bad input.
    throw new UsageError(`${command}: ${(error as Error).message}`);
  }
}
// #endregion parser

// #region io
type Context = { files: string[]; strict: boolean; json: boolean; settings: Settings; out: Output; diag: Diagnostics; io: Io };

// Yield [source, line number, line] lazily: a 10 GB log never sits in memory.
async function* readLines(files: readonly string[], stdin: Readable): AsyncGenerator<[string, number, string]> {
  for (const name of files.length ? files : ["-"]) {
    let n = 0;
    if (name === "-") {
      for await (const line of createInterface({ input: stdin, crlfDelay: Infinity })) yield ["<stdin>", ++n, line];
      continue;
    }
    // Opening first turns a missing file into an error *here*, before any output.
    const handle = await open(name).catch((error: NodeJS.ErrnoException) => {
      if (error.code === "ENOENT") throw new CliError(`${name}: no such file`);
      if (error.code === "EISDIR") throw new CliError(`${name}: is a directory`);
      throw error;
    });
    try {
      for await (const line of handle.readLines()) yield [name, ++n, line];
    } finally {
      await handle.close();
    }
  }
}

async function* records(ctx: Context, stats: Stats): AsyncGenerator<[string, LogRecord]> {
  for await (const [source, n, line] of readLines(ctx.files, ctx.io.stdin)) {
    if (!line.trim()) continue;
    const record = parseLine(line);
    if (record === undefined) {
      if (ctx.strict) throw new CliError(`${source}:${n}: malformed line: ${JSON.stringify(line)}`);
      stats.malformed++;
      ctx.diag.warn(`${source}:${n}: skipping malformed line`);
      continue;
    }
    yield [line, record];
  }
}
// #endregion io

// #region commands
async function stats(ctx: Context): Promise<number> {
  const result = emptyStats();
  for await (const [, record] of records(ctx, result)) result.levels[record.level]++;
  const color = useColor(ctx.settings.color.value, { isTTY: ctx.io.stdout.isTTY === true, env: ctx.io.env });
  await ctx.out.write(ctx.json ? renderJson(statsJson(result)) : renderTable(result, color));
  return 0;
}

async function filter(ctx: Context): Promise<number> {
  const minimum = ctx.settings.minLevel.value;
  for await (const [line, record] of records(ctx, emptyStats())) {
    // Stream each match as it is found, so `logq filter | head` stops early.
    if (atLeast(record.level, minimum)) await ctx.out.write(ctx.json ? renderJson(recordDocument(record)) : line + "\n");
  }
  return 0;
}

const COMMANDS = {
  stats: { run: stats, options: {} },
  filter: { run: filter, options: { "min-level": { type: "string", short: "l" } } },
} as const satisfies Record<string, { run: (ctx: Context) => Promise<number>; options: ParseArgsConfig["options"] }>;

const isCommand = (name: string | undefined): name is keyof typeof COMMANDS => name !== undefined && Object.hasOwn(COMMANDS, name);
// #endregion commands

// #region run
export async function run(io: Io): Promise<number> {
  // Errors are reported even before the flags (and so -q) are known.
  const errors = new Diagnostics(io.stderr, { verbose: false, quiet: false });
  try {
    const [command, ...rest] = io.argv;
    if (command === "--version") {
      io.stdout.write(`logq ${VERSION}\n`);
      return 0;
    }
    if (command === "-h" || command === "--help") {
      io.stdout.write(USAGE);
      return 0;
    }
    if (!isCommand(command)) {
      const problem = command === undefined ? "missing COMMAND" : `unknown command '${command}'`;
      throw new UsageError(`${problem} (run 'logq --help' for usage)`);
    }

    const { values, files } = parse(command, rest, COMMANDS[command].options);
    if (values.help) {
      io.stdout.write(USAGE);
      return 0;
    }
    const minLevel = "min-level" in values && typeof values["min-level"] === "string" ? values["min-level"] : undefined;
    if (minLevel !== undefined && !LEVELS.some((l) => l === minLevel.toUpperCase())) {
      throw new UsageError(`--min-level must be one of ${LEVELS.join(", ").toLowerCase()}`);
    }

    const path = await configPath(values.config, io.env);
    const settings = resolveSettings({
      flags: { minLevel, color: values.color },
      env: io.env,
      file: path === undefined ? undefined : await loadConfigFile(path),
    });
    const ctx: Context = {
      files,
      strict: values.strict,
      json: values.json,
      settings,
      out: new Output(io.stdout),
      diag: new Diagnostics(io.stderr, { verbose: values.verbose, quiet: values.quiet }),
      io,
    };
    ctx.diag.detail(`min_level=${settings.minLevel.value} (from ${settings.minLevel.source})`);
    ctx.diag.detail(`color=${settings.color.value} (from ${settings.color.source})`);
    return await COMMANDS[command].run(ctx);
  } catch (error) {
    if (!(error instanceof CliError)) throw error; // a bug: let it crash with a stack trace
    if (!(error instanceof BrokenPipe)) errors.error(error.message); // after EPIPE, nobody is reading
    return error.exitCode;
  }
}
// #endregion run
