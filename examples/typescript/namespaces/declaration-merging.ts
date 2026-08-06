// Where namespaces are still the right answer: DECLARATION MERGING - attaching
// types or members to a name that already exists. A module cannot do this, which
// is why the keyword has not been retired.

// --- 1. Function + namespace: statics with types attached ---------------------------

export function parseDuration(input: string): number {
  const match = /^(\d+)(ms|s|m|h)$/.exec(input);
  if (match === null) throw new TypeError(`not a duration: ${input}`);
  const [, digits = "0", unit = "ms"] = match;
  return Number(digits) * parseDuration.units[unit as parseDuration.Unit];
}

// The namespace merges with the function above: same name, one binding. This is
// how you hang constants, helpers and TYPES off a callable.
export namespace parseDuration {
  export type Unit = "ms" | "s" | "m" | "h";

  export const units: Readonly<Record<Unit, number>> = {
    ms: 1,
    s: 1_000,
    m: 60_000,
    h: 3_600_000,
  };

  /** `parseDuration.safe` - a static on a function, with its own type. */
  export function safe(input: string): number | null {
    try {
      return parseDuration(input);
    } catch {
      return null;
    }
  }
}

const oneMinute: number = parseDuration("1m");
const bad: number | null = parseDuration.safe("nope");
export const durations = { oneMinute, bad } as const;

// Note the alternative before reaching for this. `Object.assign` or a plain
// object literal covers the VALUE side:
//
//   export const parse = Object.assign(parseImpl, { units, safe });
//
// What it cannot do is expose `parseDuration.Unit` as a TYPE. If you only need
// statics, use the object. If you need types under the same name, merge.

// --- 2. Class + namespace: nested types that belong to the class --------------------

export class HttpClient {
  constructor(private readonly baseUrl: string) {}

  request(path: string, options: HttpClient.Options = {}): string {
    const timeout = options.timeoutMs ?? HttpClient.defaults.timeoutMs;
    return `${options.method ?? "GET"} ${this.baseUrl}${path} (${timeout}ms)`;
  }
}

export namespace HttpClient {
  export type Method = "GET" | "POST" | "PUT" | "DELETE";

  export interface Options {
    readonly method?: Method;
    readonly timeoutMs?: number;
  }

  export const defaults = { timeoutMs: 30_000 } as const;
}

export const call = new HttpClient("https://example.test").request("/users", { method: "POST" });

// --- 3. Interface merging: the same trick without a namespace -----------------------
//
// Two interfaces of the same name in the same scope add up. This is the
// mechanism behind every `declare module "x" { interface Y { ... } }`
// augmentation - it is just merging, reached through a module.

interface PluginRegistry {
  readonly markdown: (input: string) => string;
}

interface PluginRegistry {
  readonly sanitize: (input: string) => string;
}

export const registry: PluginRegistry = {
  markdown: (input) => input.trim(),
  sanitize: (input) => input.replace(/</g, "&lt;"),
};

// ⚠ Merging is additive and silent: nothing warns you that a second declaration
// exists, and a conflicting property type is an error in a place that can be far
// from either declaration. It is the right tool for extending someone else's
// types, and the wrong one for organising your own.
