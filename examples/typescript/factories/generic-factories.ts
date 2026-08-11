/**
 * Generic factories: let the call site's argument decide the type.
 *
 * A factory is the place where inference pays off most. The caller passes a
 * value; every method on the returned object is typed from it, with no type
 * arguments written by hand and no annotation to keep in sync.
 */

type Store<T> = {
  get: () => T;
  set: (next: T) => void;
  update: (change: (current: T) => T) => void;
};

// `T` is inferred from `initial`. Callers never write `createStore<Settings>`.
function createStore<T>(initial: T): Store<T> {
  let current = initial;

  return {
    get: () => current,
    set: (next) => {
      current = next;
    },
    update: (change) => {
      current = change(current);
    },
  };
}

const settings = createStore({ theme: "dark", fontSize: 14 });
// `update`'s callback parameter is typed `{ theme: string; fontSize: number }`
// with nothing declared at the call site.
settings.update((current) => ({ ...current, fontSize: current.fontSize + 2 }));
console.log(settings.get()); // { theme: 'dark', fontSize: 16 }

/**
 * `const` type parameters keep literal types alive.
 *
 * Without `const`, TypeScript widens `["open", "close"]` to `string[]` and the
 * factory can only promise `string`. With it, the tuple's literal types survive
 * into the returned API - so `isKnown` narrows to the exact names that were
 * registered, and a typo is a compile error rather than a silent `false`.
 */
function createNameSet<const T extends readonly string[]>(names: T) {
  const known = new Set<string>(names);

  return {
    names,
    isKnown: (name: string): name is T[number] => known.has(name),
  };
}

const events = createNameSet(["open", "close", "error"]);
// events.names is readonly ["open", "close", "error"], not string[]
type EventName = (typeof events.names)[number]; // "open" | "close" | "error"

function describe(name: string): string {
  // The type predicate narrows a plain `string` down to the registered union,
  // so the compiler knows the switch below is exhaustive.
  if (!events.isKnown(name)) return `unknown event: ${name}`;

  const label: Record<EventName, string> = {
    open: "connection opened",
    close: "connection closed",
    error: "connection failed",
  };
  return label[name];
}

console.log(describe("open")); // connection opened
console.log(describe("nope")); // unknown event: nope

/**
 * Generics flow through to the returned object's methods.
 *
 * `createPaginator` knows nothing about the element type, yet `page()` returns
 * `readonly T[]` and `find` takes a predicate over `T`. One type parameter on
 * the factory types the entire API it hands back.
 */
function createPaginator<T>(items: readonly T[], pageSize: number) {
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));

  return {
    pageCount,
    page: (index: number): readonly T[] =>
      items.slice(index * pageSize, (index + 1) * pageSize),
    find: (match: (item: T) => boolean): T | undefined => items.find(match),
  };
}

const users = createPaginator(
  [
    { id: "u1", name: "Ada" },
    { id: "u2", name: "Grace" },
    { id: "u3", name: "Alan" },
  ],
  2,
);
console.log(users.pageCount); // 2
console.log(users.page(0).map((user) => user.name)); // [ 'Ada', 'Grace' ]
console.log(users.find((user) => user.id === "u3")?.name); // Alan

export { createStore, createNameSet, createPaginator, describe };
export type { Store, EventName };
