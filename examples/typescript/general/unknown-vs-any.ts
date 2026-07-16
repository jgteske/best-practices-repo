/**
 * `unknown` instead of `any` at the boundaries of the program.
 *
 * `any` disables type checking for a value AND everything derived from it -
 * it's contagious. `unknown` is equally honest about "we don't know the
 * type yet," but forces a check (a type guard, an `as`, a narrowing
 * `typeof`/`instanceof`) before the value can be used for anything.
 */

function parseJsonBad(raw: string): any {
  return JSON.parse(raw);
}

function handleBad(raw: string): void {
  const data = parseJsonBad(raw);
  // No error here, even though `data.user.name.toUpperCase()` might not
  // exist at all - `any` opts every one of these accesses out of checking.
  console.log(data.user.name.toUpperCase());
}

function parseJson(raw: string): unknown {
  return JSON.parse(raw);
}

interface User {
  name: string;
}

function isUser(value: unknown): value is User {
  return (
    typeof value === "object" &&
    value !== null &&
    "name" in value &&
    typeof (value as { name: unknown }).name === "string"
  );
}

function handle(raw: string): void {
  const data = parseJson(raw);
  // data.user.name.toUpperCase();  // <- compile error: `data` is `unknown`

  if (isUser(data)) {
    console.log(data.name.toUpperCase()); // narrowed to `User`, this is safe
  }
}

export { parseJsonBad, handleBad, parseJson, isUser, handle };
export type { User };
