/**
 * Overloads vs. union parameters - and when each is right.
 *
 * Reach for a union parameter first; it's simpler and the compiler checks the
 * body against every case. Use overloads only when the RETURN type depends on
 * WHICH argument type was passed, in a way a single signature can't express.
 */

// Prefer this: a union parameter. One signature, body handles both cases.
function area(shape: { kind: "circle"; r: number } | { kind: "square"; side: number }): number {
  return shape.kind === "circle" ? Math.PI * shape.r ** 2 : shape.side ** 2;
}
console.log(area({ kind: "square", side: 3 }));

// Overloads earn their keep here: the return type is correlated with the
// argument type. A caller passing a number gets a number back; a string
// caller gets a string - a plain `string | number` return couldn't say that.
function double(value: number): number;
function double(value: string): string;
function double(value: number | string): number | string {
  // The implementation signature is NOT part of the public API; callers only
  // see the two overloads above. Keep the body defensive.
  return typeof value === "number" ? value * 2 : value + value;
}

const n = double(21); // n: number (not number | string)
const s = double("ab"); // s: string
console.log(n, s);

// Modern alternative to overloads: a generic with a conditional return type.
// Often clearer, and it composes better than a stack of overloads.
type Doubled<T> = T extends number ? number : string;
function double2<T extends number | string>(value: T): Doubled<T> {
  const result = typeof value === "number" ? value * 2 : `${value}${value}`;
  return result as Doubled<T>;
}
console.log(double2(2), double2("x"));

export { area, double, double2 };
