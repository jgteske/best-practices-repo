/**
 * Generics: let the compiler infer, constrain only what you use.
 *
 * Good generic code reads types *off the call site* instead of forcing the
 * caller to spell them out, and constrains type parameters just enough to
 * make the body type-check - no more.
 */

// `keyof` constraint: `K` must be a real key of `T`, and the return type is
// the exact property type - not a widened union. Callers never pass type args.
function prop<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key];
}

const user = { id: 1, name: "Ada", admin: true };
const id = prop(user, "id"); // id: number
const name = prop(user, "name"); // name: string
console.log(id, name);
// prop(user, "nope");        // compile error: "nope" is not a key of user

// Constrain to a *shape*, not a concrete type, so the function stays general
// but the body can safely read `.length`.
function longest<T extends { length: number }>(a: T, b: T): T {
  return a.length >= b.length ? a : b;
}

const longer = longest([1, 2, 3], [4]); // T = number[]
const word = longest("hello", "hi"); // T = string
console.log(longer, word);

// Default type parameters: sensible fallback, still overridable.
function createBox<T = string>(value: T): { value: T } {
  return { value };
}

const box = createBox("hi"); // { value: string }
const numBox = createBox<number>(5); // { value: number }
console.log(box, numBox);

// Anti-pattern: a type parameter used only once, in one position, buys you
// nothing over a plain type. `function identityBad<T>(x: T[]): void` where T
// is never related to anything else could just be `(x: unknown[])`.
// Rule of thumb: a type parameter should connect at least two positions
// (e.g. an argument to the return type, or two arguments to each other).

export { prop, longest, createBox };
