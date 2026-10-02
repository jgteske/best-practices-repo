/**
 * What each strictness flag in this repo's tsconfig.json actually catches.
 *
 * Every `@ts-expect-error` below marks a line that compiles without the flag
 * and is rejected with it - and `npm run typecheck` fails if any of them
 * stops being an error, so these claims are checked.
 */

// --- strict: strictNullChecks ------------------------------------------------
function findUser(id: number): { name: string } | undefined {
  return id === 1 ? { name: "Ada" } : undefined;
}
// @ts-expect-error - the type says the result may be undefined, even if this call succeeds
findUser(1).name;
const found = findUser(1)?.name ?? "anonymous"; // OK

// --- strict: noImplicitAny -----------------------------------------------------
// @ts-expect-error - parameter 'value' implicitly has an 'any' type
function double(value) {
  return value * 2;
}

// --- strict: strictPropertyInitialization ---------------------------------------
class Session {
  // @ts-expect-error - declared but never assigned in the constructor
  token: string;
  createdAt = Date.now(); // OK: has an initializer
}

// --- strict: useUnknownInCatchVariables ----------------------------------------
try {
  JSON.parse("{");
} catch (error) {
  // @ts-expect-error - `error` is unknown: anything can be thrown in JavaScript
  console.log(error.message);
  if (error instanceof Error) console.log(error.message); // OK after narrowing
}

// --- noUncheckedIndexedAccess --------------------------------------------------
const scores: number[] = [90, 85];
const prices: Record<string, number> = { apple: 1.2 };
// @ts-expect-error - an index can be out of bounds: scores[5] is number | undefined
const fifth: number = scores[5];
// @ts-expect-error - a key may be missing: prices["pear"] is number | undefined
const pear: number = prices["pear"];
const first = scores[0] ?? 0; // OK: the missing case is handled
for (const score of scores) console.log(score); // OK: iteration never yields undefined

// --- exactOptionalPropertyTypes -------------------------------------------------
interface Options {
  timeout?: number; // may be *absent*...
}
const absent: Options = {}; // OK
// @ts-expect-error - ...but not present-and-undefined, which `"timeout" in opts` would see
const explicitUndefined: Options = { timeout: undefined };
interface OptionsAllowingUndefined {
  timeout?: number | undefined; // say so when undefined is a meaningful value
}
const allowed: OptionsAllowingUndefined = { timeout: undefined }; // OK

// --- noImplicitOverride ---------------------------------------------------------
class Base {
  greet(): string {
    return "hi";
  }
}
class Loud extends Base {
  override greet(): string {
    return "HI"; // OK: marked as an intentional override
  }
}
class Sneaky extends Base {
  // @ts-expect-error - overriding without `override` (did you mean to?)
  greet(): string {
    return "psst";
  }
}

console.log(found, double, Session, first, fifth, pear, absent, explicitUndefined, allowed);
console.log(new Loud().greet(), new Sneaky().greet());
