/**
 * Beyond the built-ins: deriving unions from maps, distribution, and
 * recursive types with a depth limit.
 */

// --- a map type is the single source of truth ------------------------------
interface Events {
  login: { userId: string };
  logout: { userId: string; reason: "timeout" | "manual" };
  purchase: { orderId: string; total: number };
}

// Map over the keys, then index with all keys to turn the map into a
// discriminated union - one member per event, always in sync with Events.
type EventMessage = {
  [K in keyof Events]: { type: K; payload: Events[K] };
}[keyof Events];
// = { type: "login"; payload: {...} } | { type: "logout"; ... } | { type: "purchase"; ... }

// Key remapping builds a handler object type from the same map.
type Handlers = {
  [K in keyof Events as `on${Capitalize<K>}`]: (payload: Events[K]) => void;
};
// = { onLogin(payload): void; onLogout(payload): void; onPurchase(payload): void }

function dispatch(message: EventMessage, handlers: Handlers): void {
  switch (message.type) {
    case "login":
      return handlers.onLogin(message.payload);
    case "logout":
      return handlers.onLogout(message.payload);
    case "purchase":
      return handlers.onPurchase(message.payload);
  }
}

dispatch(
  { type: "purchase", payload: { orderId: "o1", total: 20 } },
  {
    onLogin: () => {},
    onLogout: ({ reason }) => console.log(reason),
    onPurchase: ({ total }) => console.log(`paid ${total}`), // paid 20
  },
);

// @ts-expect-error - the payload must match the event type
const wrong: EventMessage = { type: "login", payload: { orderId: "o1", total: 1 } };

// --- distributive vs non-distributive conditionals --------------------------
// A conditional on a *naked* type parameter runs once per union member...
type ToArray<T> = T extends unknown ? T[] : never;
type Distributed = ToArray<string | number>; // string[] | number[]

// ...wrapping both sides in a tuple turns that off.
type ToArrayWhole<T> = [T] extends [unknown] ? T[] : never;
type Whole = ToArrayWhole<string | number>; // (string | number)[]

const distributed: Distributed = ["a", "b"];
// @ts-expect-error - string[] | number[] does not allow mixing
const mixedDistributed: Distributed = ["a", 1];
const whole: Whole = ["a", 1];

// The classic trap: never is the empty union, so a distributive check returns never.
type IsNeverWrong<T> = T extends never ? true : false;
type IsNever<T> = [T] extends [never] ? true : false;
// @ts-expect-error - IsNeverWrong<never> is never (the empty union), so not even `true` fits
const wrongAnswer: IsNeverWrong<never> = true;
const rightAnswer: IsNever<never> = true;

// --- recursive types, with a depth limit ------------------------------------
interface Settings {
  theme: { mode: "light" | "dark"; accent: string };
  editor: { font: { family: string; size: number }; tabs: boolean };
}

// All dotted paths to leaf values. The Depth tuple stops runaway recursion on
// deep or self-referencing types (TS gives up at ~50 levels with an error).
type Paths<T, Depth extends unknown[] = []> = Depth["length"] extends 5
  ? never
  : {
      [K in keyof T & string]: T[K] extends object ? `${K}.${Paths<T[K], [...Depth, unknown]>}` : K;
    }[keyof T & string];

type SettingPath = Paths<Settings>;
// = "theme.mode" | "theme.accent" | "editor.font.family" | "editor.font.size" | "editor.tabs"

function readSetting(path: SettingPath): string {
  return path;
}
readSetting("editor.font.size");
// @ts-expect-error - "editor.font" is an object, not a leaf
readSetting("editor.font");

console.log(wrong, distributed, mixedDistributed, whole, wrongAnswer, rightAnswer);

export { dispatch, readSetting };
export type { EventMessage, Handlers, ToArray, ToArrayWhole, IsNever, Paths };
