/**
 * Conditional types and `infer`: compute types from other types.
 *
 * A conditional type (`T extends U ? X : Y`) plus `infer` lets you pull a
 * type out of a larger structure. This is how the built-in `ReturnType`,
 * `Awaited`, and `Parameters` are implemented - and you can build your own.
 */

// Unwrap the element type of an array (and pass non-arrays through).
type ElementOf<T> = T extends readonly (infer E)[] ? E : T;

type A = ElementOf<string[]>; // string
type B = ElementOf<number>; // number (not an array -> passthrough)
const a: A = "x";
const b: B = 1;
console.log(a, b);

// Deeply unwrap a Promise, however many layers - recursion at the type level.
type DeepAwaited<T> = T extends Promise<infer Inner> ? DeepAwaited<Inner> : T;

type C = DeepAwaited<Promise<Promise<number>>>; // number
const c: C = 42;
console.log(c);

// Distributive conditional types: applied to a union, the condition runs
// per-member. This filters `null`/`undefined` out of a union.
type NonNullableUnion<T> = T extends null | undefined ? never : T;

type D = NonNullableUnion<string | null | number | undefined>; // string | number
const d: D = "kept";
console.log(d);

// Extract the type of a single named argument from a function type.
type FirstArg<F> = F extends (first: infer P, ...rest: never[]) => unknown
  ? P
  : never;

type Handler = (event: { x: number; y: number }) => void;
type E = FirstArg<Handler>; // { x: number; y: number }
const e: E = { x: 1, y: 2 };
console.log(e);

export type { ElementOf, DeepAwaited, NonNullableUnion, FirstArg };
