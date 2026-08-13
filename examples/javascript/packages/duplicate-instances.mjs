// What it costs when the installer nests a second copy of a package instead of
// sharing one. Everything below is the same file loaded twice - which is
// exactly what node_modules/token and node_modules/reporting/node_modules/token
// are as far as the runtime is concerned.
//
// Node keys its module cache by resolved URL, so a query string is enough to
// force a second, independent evaluation here. In a real install the two URLs
// differ by directory instead; the consequences are identical.
import assert from "node:assert/strict";

const copyA = await import("./token.mjs");
const copyB = await import("./token.mjs?copy=2");

const row = (label, value) => console.log(`  ${`${label} `.padEnd(44, ".")} ${value}`);

console.log(`\nloaded copy #${copyA.copyNumber} and copy #${copyB.copyNumber} of the same module\n`);

const token = new copyA.Token("abc123");

console.log("identity");
row("copyA.Token === copyB.Token", copyA.Token === copyB.Token);
row("token instanceof copyA.Token", token instanceof copyA.Token);
row("token instanceof copyB.Token", token instanceof copyB.Token);
row("both classes are named", `"${copyA.Token.name}" and "${copyB.Token.name}"`);

console.log("\nthe error this produces");
try {
  copyB.assertToken(token);
} catch (error) {
  console.log(`  ${error.message}`);
}

console.log("\nmodule-level state is per copy");
copyA.register("json", () => "json");
copyA.register("yaml", () => "yaml");
copyB.register("toml", () => "toml");
row("copyA sees", JSON.stringify(copyA.registeredNames()));
row("copyB sees", JSON.stringify(copyB.registeredNames()));

console.log("\nwhat still works across copies");
row("Symbol.for() brand is shared", copyA.SHARED_BRAND === copyB.SHARED_BRAND);
row("plain Symbol() is not", copyA.LOCAL_BRAND === copyB.LOCAL_BRAND);
row("copyB.isToken(token built by copyA)", copyB.isToken(token));
row("structural read: token.value", token.value);

// ---------------------------------------------------------------------------

// Two evaluations, two class objects, so `instanceof` is false in one
// direction even though the object is a perfectly good Token.
assert.equal(copyA.Token === copyB.Token, false);
assert.equal(token instanceof copyA.Token, true);
assert.equal(token instanceof copyB.Token, false);

// ...and the error message is unhelpful, because both classes have the same
// name. "expected a Token, got a Token" is the signature of a duplicated
// package in the tree.
assert.throws(() => copyB.assertToken(token), /expected a Token, got a Token/);

// Each copy has its own module scope, so anything a package treats as a
// singleton - a registry, a pool, a cache, React's hook dispatcher - silently
// becomes two.
assert.deepEqual(copyA.registeredNames(), ["json", "yaml"]);
assert.deepEqual(copyB.registeredNames(), ["toml"]);

// The mitigations: a global symbol registry survives duplication, a plain
// symbol does not, and a structural check never cared in the first place.
assert.equal(copyA.SHARED_BRAND === copyB.SHARED_BRAND, true);
assert.equal(copyA.LOCAL_BRAND === copyB.LOCAL_BRAND, false);
assert.equal(copyB.isToken(token), true);

console.log("\nall documented duplication effects hold");
