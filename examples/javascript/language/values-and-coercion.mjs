/**
 * Primitives, equality, and the coercion rules worth memorising.
 *
 * Run: node examples/javascript/language/values-and-coercion.mjs
 */

// --- typeof over every primitive, plus the one historical bug ------------------

const values = [
  ["string", "hi"],
  ["number", 42],
  ["bigint", 9007199254740993n],
  ["boolean", true],
  ["undefined", undefined],
  ["symbol", Symbol("id")],
  ["null", null], // typeof null === "object" - a bug from 1995, kept for compatibility
  ["object", { a: 1 }],
  ["function", () => {}],
];

for (const [label, value] of values) {
  console.log(`${label.padEnd(10)} -> typeof ${typeof value}`);
}

// --- == vs === ----------------------------------------------------------------
// `==` converts operands to a common type before comparing; `===` never converts.
// Nothing below is guessable from the operands alone - which is the whole argument
// against `==`: you have to know the conversion table to read the code.

console.log("\n== coercion surprises:");
console.log("  0 == '' ............", 0 == ""); // "" -> 0
console.log("  0 == '0' ...........", 0 == "0"); // "0" -> 0
console.log("  '' == '0' ..........", "" == "0"); // both strings: no conversion, so false
console.log("  [] == false ........", [] == false); // [] -> "" -> 0, false -> 0
console.log("  null == undefined ..", null == undefined); // the one useful == case
console.log("  null == 0 ..........", null == 0); // null only loosely equals undefined

// Use === everywhere. The single exception people deliberately keep is
// `x == null`, which is true for exactly null and undefined:
const missing = undefined;
console.log("\n  x == null catches both null and undefined:", missing == null);

// --- NaN, the value that is not equal to itself -------------------------------

const notANumber = Number("nope");
console.log("\nNaN:");
console.log("  NaN === NaN .............", notANumber === notANumber);
console.log("  Number.isNaN(NaN) .......", Number.isNaN(notANumber));
console.log("  Object.is(NaN, NaN) .....", Object.is(notANumber, notANumber));
// Global isNaN() coerces first, so it lies about non-numbers:
console.log("  isNaN('hello') ..........", isNaN("hello"), "<- coerces, avoid it");
console.log("  Number.isNaN('hello') ...", Number.isNaN("hello"), "<- correct");

// Object.is also separates the two zeroes, which === does not:
console.log("  0 === -0 ................", 0 === -0);
console.log("  Object.is(0, -0) ........", Object.is(0, -0));

// --- Truthiness ---------------------------------------------------------------
// Exactly eight falsy values exist. Everything else - including [] and {} - is truthy.

const falsy = [false, 0, -0, 0n, "", null, undefined, NaN];
console.log("\nfalsy values:", falsy.filter((v) => !v).length, "of", falsy.length);
console.log("  Boolean([]) ...", Boolean([]), "<- an empty array is truthy");
console.log("  Boolean({}) ....", Boolean({}), "<- so is an empty object");

// This is why ?? and || are different operators:
const zero = 0;
console.log("  0 || 'default' ...", zero || "default", "<- || tests truthiness");
console.log("  0 ?? 'default' ...", zero ?? "default", "<- ?? tests null/undefined only");

// --- Number precision ---------------------------------------------------------
// Every number is a 64-bit float, so decimals and large integers both lose exactness.

console.log("\nnumbers:");
console.log("  0.1 + 0.2 ..................", 0.1 + 0.2);
console.log("  0.1 + 0.2 === 0.3 ..........", 0.1 + 0.2 === 0.3);
console.log("  within epsilon .............", Math.abs(0.1 + 0.2 - 0.3) < Number.EPSILON);
console.log("  MAX_SAFE_INTEGER ...........", Number.MAX_SAFE_INTEGER);
console.log("  2**53 === 2**53 + 1 ........", 2 ** 53 === 2 ** 53 + 1, "<- the +1 rounds away");
console.log("  Number(9007199254740993n) ..", Number(9007199254740993n), "<- lost");
console.log("  BigInt keeps it exact ......", 9007199254740993n);

// Money belongs in integer minor units (cents) or a decimal library - never a float.
const priceInCents = 1999;
console.log("  1999 cents formatted .......", (priceInCents / 100).toFixed(2));

// --- Copying: reference, shallow, deep ----------------------------------------

const original = { name: "config", nested: { retries: 3 }, tags: ["a"] };

const sameObject = original; // no copy at all: one object, two names
const shallow = { ...original }; // top level copied; nested still shared
const deep = structuredClone(original); // fully independent (Node 17+, all browsers)

sameObject.name = "mutated";
shallow.nested.retries = 99;
deep.nested.retries = 0;

console.log("\ncopying:");
console.log("  original.name ............", original.name, "<- reference assignment mutated it");
console.log("  original.nested.retries ..", original.nested.retries, "<- spread shared the nested object");
console.log("  deep.nested.retries ......", deep.nested.retries, "<- structuredClone is independent");

// structuredClone handles Map/Set/Date/RegExp/TypedArray and cycles, which
// JSON.parse(JSON.stringify(x)) silently destroys:
const tricky = { when: new Date(0), seen: new Set([1, 2]) };
console.log("  clone keeps Date/Set .....", structuredClone(tricky).when instanceof Date, structuredClone(tricky).seen instanceof Set);
console.log("  JSON round-trip does not .", typeof JSON.parse(JSON.stringify(tricky)).when);
// ...but it throws on functions, and cannot clone class identity.
