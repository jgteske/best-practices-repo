// Where each setting comes from: defaults < config file < environment < flags.
//
// `resolveSettings` is a pure function of its inputs - it never reads
// process.env or the filesystem itself - so every precedence rule is a one-line test.

import { readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import { CliError, parseLevel, type Level } from "./core.ts";

export const COLOR_MODES = ["auto", "always", "never"] as const;
export type ColorMode = (typeof COLOR_MODES)[number];

export function parseColor(text: string): ColorMode {
  const mode = COLOR_MODES.find((m) => m === text.toLowerCase());
  if (mode === undefined) throw new RangeError(`unknown color mode '${text}' (expected one of ${COLOR_MODES.join(", ")})`);
  return mode;
}

// #region settings
// "default", "LOGQ_MIN_LEVEL", "--color", "/home/me/.config/logq/config.json"
export type Setting<T> = { value: T; source: string };
export type Settings = { minLevel: Setting<Level>; color: Setting<ColorMode> };

type Name = keyof Settings;
// One layer: a source label and the raw strings it sets, lowest precedence first.
export type Layer = { source: string; values: Partial<Record<Name, string>> };
export type Env = Readonly<Record<string, string | undefined>>;

const ENV_NAMES: Record<Name, string> = { minLevel: "LOGQ_MIN_LEVEL", color: "LOGQ_COLOR" };
const FLAG_NAMES: Record<Name, string> = { minLevel: "--min-level", color: "--color" };

export function resolveSettings(input: {
  flags: Partial<Record<Name, string | undefined>>;
  env: Env;
  file?: Layer | undefined;
}): Settings {
  const raw: Record<Name, { text: string; source: string }> = {
    minLevel: { text: "INFO", source: "default" },
    color: { text: "auto", source: "default" },
  };

  const names = Object.keys(raw) as Name[];
  const layers: Layer[] = [
    ...(input.file ? [input.file] : []),
    // An empty variable counts as unset - `LOGQ_COLOR= logq ...` should not be an error.
    ...names.flatMap((n) => (input.env[ENV_NAMES[n]] ? [{ source: ENV_NAMES[n], values: { [n]: input.env[ENV_NAMES[n]] } }] : [])),
    ...names.flatMap((n) => (input.flags[n] !== undefined ? [{ source: FLAG_NAMES[n], values: { [n]: input.flags[n] } }] : [])),
  ];

  for (const { source, values } of layers) {
    for (const n of names) {
      const text = values[n];
      if (text !== undefined) raw[n] = { text, source }; // later layers win
    }
  }

  // Validate after merging, so the error names the layer the bad value came from.
  const pick = <T>(name: Name, parse: (text: string) => T): Setting<T> => {
    const { text, source } = raw[name];
    try {
      return { value: parse(text), source };
    } catch (error) {
      throw new CliError(`${(error as Error).message} (from ${source})`);
    }
  };
  return { minLevel: pick("minLevel", parseLevel), color: pick("color", parseColor) };
}
// #endregion settings

// #region config-file
// --config, then $LOGQ_CONFIG, then the XDG location if that file exists.
export async function configPath(flag: string | undefined, env: Env): Promise<string | undefined> {
  if (flag) return flag;
  if (env.LOGQ_CONFIG) return env.LOGQ_CONFIG;
  const base = env.XDG_CONFIG_HOME || (env.HOME ? join(env.HOME, ".config") : undefined);
  if (base === undefined) return undefined;
  const path = join(base, "logq", "config.json");
  const found = await stat(path).then((s) => s.isFile(), () => false);
  return found ? path : undefined;
}

export async function loadConfigFile(path: string): Promise<Layer> {
  let data: unknown;
  try {
    data = JSON.parse(await readFile(path, "utf8"));
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "ENOENT") throw new CliError(`config file not found: ${path}`);
    if (error instanceof SyntaxError) throw new CliError(`${path}: invalid JSON: ${error.message}`);
    throw error;
  }
  if (typeof data !== "object" || data === null || Array.isArray(data)) throw new CliError(`${path}: expected a JSON object`);

  // The file uses the same snake_case keys as the Python version's TOML file.
  const keys: Record<string, Name> = { min_level: "minLevel", color: "color" };
  const values: Layer["values"] = {};
  for (const [key, value] of Object.entries(data)) {
    const name = keys[key];
    if (name === undefined) throw new CliError(`${path}: unknown setting '${key}'`);
    if (typeof value !== "string") throw new CliError(`${path}: ${key} must be a string`);
    values[name] = value;
  }
  return { source: path, values };
}
// #endregion config-file
