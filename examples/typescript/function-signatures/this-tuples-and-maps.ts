/**
 * More signature tools: `this` parameters, tuple parameters, lookup maps as
 * an alternative to overloads, and `satisfies` for callback tables.
 */

// --- `this` parameters -------------------------------------------------------
// A fake first parameter that declares what `this` must be. It is erased at
// runtime and makes unbound calls a compile error.
interface Counter {
  count: number;
}

function increment(this: Counter, by: number): number {
  this.count += by;
  return this.count;
}

const counter = { count: 0, increment };
counter.increment(2); // OK: called as a method, `this` is counter
increment.call({ count: 10 }, 5); // OK: `this` supplied explicitly

// Only for the compiler: these calls would crash at runtime, so nothing calls this.
function compileErrorsOnly(): void {
  // @ts-expect-error - called without a receiver, `this` would be undefined
  increment(1);
  // @ts-expect-error - see `commands` below: an unknown key is caught
  commands.missing(["x"]);
}

// --- tuple parameters --------------------------------------------------------
// A labeled tuple type describes an argument list: names show up in editor
// hints, and optional/rest elements work like normal parameters.
type MoveArgs = [x: number, y: number, animate?: boolean];

function moveTo(...args: MoveArgs): string {
  const [x, y, animate = false] = args;
  return `(${x}, ${y})${animate ? " animated" : ""}`;
}

// Forwarding arguments keeps their types, which `any[]` would lose.
function logged<Args extends unknown[], R>(fn: (...args: Args) => R) {
  return (...args: Args): R => {
    console.log(`calling ${fn.name} with ${JSON.stringify(args)}`);
    return fn(...args);
  };
}

const loggedMove = logged(moveTo);
console.log(loggedMove(1, 2)); // calling moveTo with [1,2]  then  (1, 2)
// @ts-expect-error - the wrapper kept moveTo's parameter list
loggedMove("1", 2);

// --- a lookup map instead of overloads ---------------------------------------
// When the return type depends on a string argument, a map type reads better
// than one overload per case, and adding a case is a single line.
interface ElementsByKind {
  text: { kind: "text"; value: string };
  number: { kind: "number"; value: number };
  toggle: { kind: "toggle"; value: boolean };
}

function createField<K extends keyof ElementsByKind>(kind: K, value: ElementsByKind[K]["value"]) {
  return { kind, value } as ElementsByKind[K];
}

const age = createField("number", 42); // { kind: "number"; value: number }
// @ts-expect-error - a toggle's value must be a boolean
createField("toggle", "yes");

// --- `satisfies` for tables of callbacks ---------------------------------------
type Command = (args: string[]) => string;

// `satisfies` checks every entry against Command (and gives the parameters
// their types), but keeps the literal keys, so `commands.greet` is known to exist.
const commands = {
  greet: (args) => `hello ${args.join(" ")}`,
  count: (args) => String(args.length),
} satisfies Record<string, Command>;

console.log(commands.greet(["Ada"])); // hello Ada
// With a `: Record<string, Command>` annotation instead, `commands.missing(...)`
// would compile and then crash; with `satisfies` it's a compile error.

console.log(age);

export { compileErrorsOnly, increment, moveTo, logged, createField, commands };
export type { MoveArgs, ElementsByKind };
