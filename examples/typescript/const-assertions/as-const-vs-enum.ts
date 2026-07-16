/**
 * Prefer `as const` objects over native `enum`.
 *
 * Native `enum` has real drawbacks: numeric enums allow any number, `const
 * enum` breaks under isolated/transpile-only builds, and enums generate
 * runtime code that isn't tree-shakeable. An `as const` object plus a derived
 * union gives you the same ergonomics with none of those problems - and the
 * values are plain data you can iterate, serialize, and log.
 */

// The idiomatic pattern: a frozen-by-type object + a union derived from it.
const LogLevel = {
  Debug: "debug",
  Info: "info",
  Warn: "warn",
  Error: "error",
} as const;

// Derive the value union from the object - single source of truth.
type LogLevel = (typeof LogLevel)[keyof typeof LogLevel];
// LogLevel = "debug" | "info" | "warn" | "error"

function log(level: LogLevel, message: string): void {
  console.log(`[${level}] ${message}`);
}

log(LogLevel.Warn, "disk almost full"); // via the object (refactor-friendly)
log("info", "started"); // or the literal directly - both type-check

// Unlike an enum, the values are ordinary data you can enumerate at runtime:
const allLevels = Object.values(LogLevel); // readonly ["debug","info","warn","error"]
console.log(allLevels);

// `as const` also freezes tuples and nested literals: without it, `roles`
// would widen to `string[]`; with it, it's a readonly tuple of literals.
const roles = ["owner", "admin", "member"] as const;
type Role = (typeof roles)[number]; // "owner" | "admin" | "member"

const currentRole: Role = "admin";
console.log(currentRole);

export { LogLevel, log, roles };
export type { Role };
