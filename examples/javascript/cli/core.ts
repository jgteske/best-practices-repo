// The domain logic: parsing and counting log lines. Nothing here knows about
// argv, streams, environment variables or exit codes, so it is tested directly.
//
// Node runs this file as-is by stripping the types (Node 22.18+), so it sticks
// to erasable syntax: no enums, no parameter properties, `import type` for types.

export const LEVELS = ["DEBUG", "INFO", "WARN", "ERROR"] as const; // ordered, lowest first
export type Level = (typeof LEVELS)[number];

// #region errors
// An expected failure: reported as one line on stderr, never a stack trace.
export class CliError extends Error {
  override name = "CliError";
  exitCode = 1;
}

export class UsageError extends CliError {
  override name = "UsageError";
  override exitCode = 2;
}
// #endregion errors

// #region parse
export type LogRecord = { timestamp: string; level: Level; message: string };

const LINE = /^(?<timestamp>\S+)\s+(?<level>[A-Z]+)\s+(?<message>.*)$/;

export function parseLevel(text: string): Level {
  const level = LEVELS.find((l) => l === text.toUpperCase());
  if (level === undefined) {
    throw new RangeError(`unknown level '${text}' (expected one of ${LEVELS.join(", ").toLowerCase()})`);
  }
  return level;
}

export function parseLine(line: string): LogRecord | undefined {
  const groups = LINE.exec(line)?.groups;
  const level = LEVELS.find((l) => l === groups?.level);
  if (groups === undefined || level === undefined) return undefined;
  return { timestamp: groups.timestamp ?? "", level, message: groups.message ?? "" };
}

export const atLeast = (level: Level, minimum: Level): boolean => LEVELS.indexOf(level) >= LEVELS.indexOf(minimum);
// #endregion parse

// #region stats
export type Stats = { levels: Record<Level, number>; malformed: number };

export const emptyStats = (): Stats => ({
  levels: Object.fromEntries(LEVELS.map((l) => [l, 0])) as Record<Level, number>,
  malformed: 0,
});

export const total = (stats: Stats): number => Object.values(stats.levels).reduce((a, b) => a + b, 0);

export const statsJson = (stats: Stats) => ({ total: total(stats), levels: stats.levels, malformed: stats.malformed });
// #endregion stats
