// A stand-in for a small library that exports a class, a brand check, and a
// module-level registry - the three things that break when a dependency tree
// ends up holding two copies of the same package. See duplicate-instances.mjs.

// Symbol.for() looks up a *process-global* registry rather than creating a new
// symbol, so every copy of this module gets the identical symbol back. That
// property is what makes the counter below work across copies, and it is the
// standard fix for cross-copy brand checks.
const COPY_COUNTER = Symbol.for("packages-demo.token.copies");
const BRAND = Symbol.for("packages-demo.token.brand");

globalThis[COPY_COUNTER] = (globalThis[COPY_COUNTER] ?? 0) + 1;

/** Which copy of this module this is, counted across the whole process. */
export const copyNumber = globalThis[COPY_COUNTER];

/** Shared across copies (Symbol.for) - unlike a plain Symbol(), below. */
export const SHARED_BRAND = BRAND;

/** A fresh symbol per module evaluation, so never equal across copies. */
export const LOCAL_BRAND = Symbol("packages-demo.token.local");

export class Token {
  constructor(value) {
    this.value = value;
    this[BRAND] = true;
  }
}

/** Works across copies: it asks what the object *is*, not who built it. */
export function isToken(value) {
  return typeof value === "object" && value !== null && value[BRAND] === true;
}

/** Fails across copies: `instanceof` compares one specific class object. */
export function assertToken(value) {
  if (!(value instanceof Token)) {
    throw new TypeError(`expected a Token, got a ${value?.constructor?.name ?? typeof value}`);
  }
}

// Module-level state - a plugin registry, a connection pool, a config cache.
// Every copy of the module gets its own.
const handlers = new Map();

export function register(name, handler) {
  handlers.set(name, handler);
  return handlers.size;
}

export function registeredNames() {
  return [...handlers.keys()];
}
