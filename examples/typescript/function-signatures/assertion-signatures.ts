/**
 * Assertion signatures: `asserts x is T` and `asserts condition`.
 *
 * A type guard (`x is T`) returns a boolean you branch on. An *assertion*
 * signature instead narrows the type of its argument for all code that runs
 * *after* the call - the function either returns (having proven the fact) or
 * throws. This is how `assert`-style helpers stay type-aware.
 */

// `asserts condition`: after this returns, the compiler treats `condition`
// as true. Here that narrows away `undefined`/`null` from later usage.
function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function firstChar(text: string | undefined): string {
  assert(text !== undefined, "text is required");
  // After the assert, `text` is `string` - no `?.` or `!` needed.
  return text.charAt(0);
}
console.log(firstChar("hello"));

// `asserts x is T`: prove a specific type for the argument itself.
function assertIsNumberArray(value: unknown): asserts value is number[] {
  if (!Array.isArray(value) || value.some((v) => typeof v !== "number")) {
    throw new Error("expected number[]");
  }
}

function sum(data: unknown): number {
  assertIsNumberArray(data);
  // `data` is now `number[]` for the rest of the function.
  return data.reduce((total, n) => total + n, 0);
}
console.log(sum([1, 2, 3]));

// Note: assertion signatures require an explicit type annotation on the
// function - TypeScript will not infer `asserts`. That explicitness is the
// point: you're promising the compiler something it can't verify itself.

export { assert, assertIsNumberArray, firstChar, sum };
