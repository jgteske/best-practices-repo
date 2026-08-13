// What a version range in package.json actually permits, printed as a table.
// The matcher itself is in ./semver.mjs; the assertions at the bottom mean a
// wrong claim on the docs page fails `npm run check:js` instead of quietly
// misinforming somebody.
import assert from "node:assert/strict";

import { compareVersions, maxSatisfying, satisfies } from "./semver.mjs";

function table(ranges, versions) {
  const rangeWidth = Math.max(...ranges.map((range) => range.length), 5) + 2;
  const columns = versions.map((version) => Math.max(version.length, 5) + 2);

  const header =
    "range".padEnd(rangeWidth) +
    versions.map((version, i) => version.padStart(columns[i])).join("");
  const rule = "-".repeat(header.length);

  const rows = ranges.map(
    (range) =>
      range.padEnd(rangeWidth) +
      versions
        .map((version, i) => (satisfies(version, range) ? "yes" : ".").padStart(columns[i]))
        .join(""),
  );

  return [header, rule, ...rows].join("\n");
}

console.log("ranges over a 1.x package\n");
console.log(
  table(
    ["1.4.2", "^1.4.2", "~1.4.2", ">=1.4.2 <1.6.0", "1.x", "1.4.x", "1.2 - 1.4", "^1.4.2 || ^2", "*"],
    ["1.4.1", "1.4.2", "1.4.9", "1.5.0", "1.9.9", "2.0.0"],
  ),
);

console.log("\n\nthe same operators below 1.0.0\n");
console.log(
  table(
    ["^0.3.1", "~0.3.1", "^0.0.3", "~0.0.3", "0.x", "*"],
    ["0.0.3", "0.0.4", "0.3.1", "0.3.9", "0.4.0", "1.0.0"],
  ),
);

console.log("\n\nprereleases are opt-in, per [major, minor, patch]\n");
for (const [candidate, range] of [
  ["2.0.0-rc.1", "^1.0.0"],
  ["2.0.0-rc.1", ">=1.0.0"],
  ["2.0.0-rc.1", "*"],
  ["2.0.0-rc.1", "^2.0.0"],
  ["2.0.0-rc.1", "^2.0.0-rc.1"],
  ["2.0.0-rc.2", "^2.0.0-rc.1"],
  ["2.1.0-rc.1", "^2.0.0-rc.1"],
  ["2.0.0", "^2.0.0-rc.1"],
]) {
  const verdict = satisfies(candidate, range) ? "satisfies" : "does not satisfy";
  console.log(`  ${candidate.padEnd(12)} ${verdict.padStart(16)}  ${range}`);
}

console.log("\n\nprecedence: how the registry orders what it has\n");
const releases = [
  "2.0.0",
  "2.0.0-rc.2",
  "2.0.0-rc.10",
  "2.0.0-beta.2",
  "2.0.0-alpha",
  "1.9.9",
  "2.0.0+build.55",
];
console.log(`  ${[...releases].sort(compareVersions).join(" < ")}`);
console.log("  (build metadata is ignored entirely: 2.0.0+build.55 ties with 2.0.0)");

console.log("\n\nwhat npm installs today, from what the registry offers\n");
const published = ["1.4.1", "1.4.2", "1.4.9", "1.5.0", "1.9.9", "2.0.0", "2.1.0-rc.1"];
for (const range of ["^1.4.2", "~1.4.2", "1.4.2", ">=1.4.2", "^1 || ^2", "^2.1.0-rc.0"]) {
  console.log(`  ${range.padEnd(14)} -> ${maxSatisfying(published, range)}`);
}

// ---------------------------------------------------------------------------
// Everything the docs page claims, asserted.
// ---------------------------------------------------------------------------

// ^ is "same major"...
assert.equal(satisfies("1.9.9", "^1.4.2"), true);
assert.equal(satisfies("2.0.0", "^1.4.2"), false);
assert.equal(satisfies("1.4.1", "^1.4.2"), false);

// ...except below 1.0.0, where it is "same minor".
assert.equal(satisfies("0.3.9", "^0.3.1"), true);
assert.equal(satisfies("0.4.0", "^0.3.1"), false);
assert.equal(satisfies("0.0.4", "^0.0.3"), false);

// ~ is "patches only" once a minor is pinned.
assert.equal(satisfies("1.4.9", "~1.4.2"), true);
assert.equal(satisfies("1.5.0", "~1.4.2"), false);

// x-ranges and hyphen ranges are just implied bounds.
assert.equal(satisfies("1.9.9", "1.x"), true);
assert.equal(satisfies("1.4.9", "1.2 - 1.4"), true);
assert.equal(satisfies("1.5.0", "1.2 - 1.4"), false);

// A space is AND, `||` is OR.
assert.equal(satisfies("1.5.0", ">=1.4.2 <1.6.0"), true);
assert.equal(satisfies("1.6.0", ">=1.4.2 <1.6.0"), false);
assert.equal(satisfies("2.3.0", "^1.4.2 || ^2"), true);

// `>1.2` excludes all of 1.2.x, not just 1.2.0.
assert.equal(satisfies("1.2.9", ">1.2"), false);
assert.equal(satisfies("1.3.0", ">1.2"), true);

// Prereleases only match a range that names one at the same version.
assert.equal(satisfies("2.0.0-rc.1", ">=1.0.0"), false);
assert.equal(satisfies("2.0.0-rc.1", "*"), false);
assert.equal(satisfies("2.0.0-rc.1", "^2.0.0"), false);
assert.equal(satisfies("2.0.0-rc.1", "^2.0.0-rc.1"), true);
assert.equal(satisfies("2.1.0-rc.1", "^2.0.0-rc.1"), false);

// Precedence: numeric prerelease identifiers compare as numbers, and a
// release always outranks its own prereleases.
assert.equal(compareVersions("2.0.0-rc.10", "2.0.0-rc.2") > 0, true);
assert.equal(compareVersions("2.0.0", "2.0.0-rc.10") > 0, true);
assert.equal(compareVersions("2.0.0+build.55", "2.0.0"), 0);

// npm resolves a range to the highest published version that satisfies it.
assert.equal(maxSatisfying(published, "^1.4.2"), "1.9.9");
assert.equal(maxSatisfying(published, "~1.4.2"), "1.4.9");
assert.equal(maxSatisfying(published, "1.4.2"), "1.4.2");
assert.equal(maxSatisfying(published, ">=1.4.2"), "2.0.0");
assert.equal(maxSatisfying(["1.0.0"], "^2.0.0"), null);

console.log("\n\nall documented range claims hold");
