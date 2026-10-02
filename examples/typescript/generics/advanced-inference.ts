/**
 * Steering inference: const type parameters, NoInfer, and variance.
 *
 * Most generic code just works. These are the tools for the cases where the
 * compiler infers something too wide, infers from the wrong argument, or
 * needs to be told how a type parameter is used.
 */

// --- const type parameters (TS 5.0) ---------------------------------------
// Without `const`, an array literal argument widens to string[].
function routesLoose<T extends readonly string[]>(paths: T): T {
  return paths;
}
const loose = routesLoose(["/", "/about"]); // string[]

// With `const`, the caller gets the literal tuple - no `as const` at the call site.
function routes<const T extends readonly string[]>(paths: T): T {
  return paths;
}
const exact = routes(["/", "/about"]); // readonly ["/", "/about"]
const home: (typeof exact)[0] = "/";
// @ts-expect-error - "/contact" is not one of the literal routes
const missing: (typeof exact)[number] = "/contact";

// --- NoInfer (TS 5.4) -----------------------------------------------------
// `initial` should be checked *against* the options, not widen them.
function createSelectLoose<T extends string>(options: T[], initial: T): T[] {
  return [initial, ...options];
}
// T is inferred from both arguments, so the typo silently becomes a valid option:
createSelectLoose(["small", "large"], "medum");

function createSelect<T extends string>(options: T[], initial: NoInfer<T>): T[] {
  return [initial, ...options];
}
createSelect(["small", "large"], "small");
// @ts-expect-error - T comes only from `options`, so "medum" is rejected
createSelect(["small", "large"], "medum");

// --- inference from several candidates -------------------------------------
function pair<T>(first: T, second: T): [T, T] {
  return [first, second];
}
// @ts-expect-error - T is inferred from the first argument; 2 is not a string
pair("a", 2);
// Use two type parameters when the arguments are allowed to differ.
function pairOf<A, B>(first: A, second: B): [A, B] {
  return [first, second];
}
const mixed = pairOf("a", 2); // [string, number]

// --- variance annotations (TS 4.7) -----------------------------------------
// `out T`: T is only produced (covariant). `in T`: only consumed (contravariant).
// The compiler checks the annotation against the body, and can compare
// instantiations faster because it no longer has to work the variance out.
interface Producer<out T> {
  get(): T;
}
interface Consumer<in T> {
  // Property syntax, not method syntax: method parameters are checked
  // bivariantly even under `strict`, which would let the bad assignment below pass.
  accept: (value: T) => void;
}

const numberProducer: Producer<number> = { get: () => 1 };
const anyProducer: Producer<number | string> = numberProducer; // OK: produces a subset

const printer: Consumer<number | string> = { accept: (value) => console.log(value) };
const numberSink: Consumer<number> = printer; // OK: accepts a superset
// @ts-expect-error - a Consumer<number> can't stand in for one that must accept strings
const stringSink: Consumer<number | string> = { accept: (value: number) => value.toFixed() };

// --- when NOT to use a generic ---------------------------------------------
// T appears once: it relates nothing, so `unknown` says the same thing more simply.
function logAllBad<T>(items: T[]): void {
  items.forEach((item) => console.log(item));
}
function logAll(items: readonly unknown[]): void {
  items.forEach((item) => console.log(item));
}

console.log(loose, exact, home, missing, mixed, anyProducer.get(), stringSink);
numberSink.accept(1);
logAllBad([1]);
logAll(["a"]);

export { routes, createSelect, pairOf, logAll };
export type { Producer, Consumer };
