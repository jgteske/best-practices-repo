// Turning results into text: colour decisions, the human table, JSON, and the
// diagnostics channel. Data goes to stdout; everything else goes to stderr.

import { once } from "node:events";
import type { Writable } from "node:stream";
import type { ColorMode, Env } from "./config.ts";
import { CliError, LEVELS, total, type Level, type LogRecord, type Stats } from "./core.ts";

// #region color
// An explicit --color always/never wins; `auto` follows the conventions.
export function useColor(mode: ColorMode, opts: { isTTY: boolean; env: Env }): boolean {
  if (mode !== "auto") return mode === "always";
  if (opts.env.NO_COLOR) return false; // https://no-color.org: any non-empty value
  if (opts.env.FORCE_COLOR) return true; // CI logs that render ANSI codes set this
  return opts.isTTY && opts.env.TERM !== "dumb";
}
// #endregion color

const STYLES: Record<Level, string> = { DEBUG: "2", INFO: "0", WARN: "33", ERROR: "1;31" };
const paint = (text: string, level: Level, color: boolean) => (color ? `\x1b[${STYLES[level]}m${text}\x1b[0m` : text);

// #region render
export function renderTable(stats: Stats, color: boolean): string {
  const width = String(total(stats)).length;
  const lines = LEVELS.map((l) => `${paint(l.padEnd(5), l, color)}  ${String(stats.levels[l]).padStart(width)}`);
  lines.push(`${"total".padEnd(5)}  ${String(total(stats)).padStart(width)}`);
  if (stats.malformed) lines.push(`(${stats.malformed} malformed line${stats.malformed === 1 ? "" : "s"} skipped)`);
  return lines.join("\n") + "\n";
}

// One compact document per line: easy for `jq`, and for the next program in a pipe.
export const renderJson = (value: unknown): string => JSON.stringify(value) + "\n";
export const recordDocument = ({ timestamp, level, message }: LogRecord) => ({ timestamp, level, message });
// #endregion render

// #region output
// stdout with backpressure and broken-pipe detection. `write()` returns false
// when the stream's buffer is full; awaiting "drain" keeps a fast producer from
// buffering an entire 10 GB log in memory when the reader is slow.
export class BrokenPipe extends CliError {
  override name = "BrokenPipe";
  override exitCode = 141; // 128 + SIGPIPE, as if the OS had killed us
}

export class Output {
  readonly stream: Writable & { isTTY?: boolean };
  #error: NodeJS.ErrnoException | undefined;

  constructor(stream: Writable & { isTTY?: boolean }) {
    this.stream = stream;
    // Record the error so the next write() throws. Node swallows EPIPE on
    // process.stdout, so without this the program would keep reading its whole
    // input after the reader has gone - and then exit 0.
    stream.on("error", (error: NodeJS.ErrnoException) => {
      this.#error = error;
    });
  }

  async write(text: string): Promise<void> {
    this.#throwIfBroken();
    if (!this.stream.write(text)) {
      // once() rejects if "error" fires first; the listener above has recorded it.
      await once(this.stream, "drain").catch(() => {});
      this.#throwIfBroken();
    }
  }

  #throwIfBroken(): void {
    if (this.#error?.code === "EPIPE") throw new BrokenPipe("stdout closed");
    if (this.#error) throw this.#error;
  }
}
// #endregion output

// #region diagnostics
// Messages for the human, on stderr: warnings unless -q, details only with -v.
export class Diagnostics {
  readonly #stream: Writable;
  readonly #verbose: boolean;
  readonly #quiet: boolean;

  constructor(stream: Writable, opts: { verbose: boolean; quiet: boolean }) {
    this.#stream = stream;
    this.#verbose = opts.verbose;
    this.#quiet = opts.quiet;
  }

  warn(message: string): void {
    if (!this.#quiet) this.#stream.write(`logq: warning: ${message}\n`);
  }

  detail(message: string): void {
    if (this.#verbose) this.#stream.write(`logq: ${message}\n`);
  }

  error(message: string): void {
    this.#stream.write(`logq: error: ${message}\n`); // always shown, even with -q
  }
}
// #endregion diagnostics
