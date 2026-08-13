// A dependency-free subset of node-semver: enough to decide whether an
// installed version satisfies a range written in package.json. It covers the
// grammar npm actually accepts - `^`, `~`, comparators, x-ranges, hyphen
// ranges, `||` unions - and the prerelease rule, which is the part that
// surprises people.
//
// This is a teaching implementation, not a replacement for the `semver`
// package: no coercion, no `subset()`, no range intersection. Build metadata
// is parsed and then discarded, which is what the specification says to do
// with it.

const VERSION = /^v?(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?(?:\+[0-9A-Za-z.-]+)?$/;

// A comparator is a single bound: `{ op: ">=", version: 1.4.2 }`.
// A comparator *set* is an AND of those, and a range is an OR of sets.
const PARTIAL =
  /^(\^|~|>=|<=|>|<|=)?\s*v?(\d+|[xX*])(?:\.(\d+|[xX*]))?(?:\.(\d+|[xX*]))?(?:-([0-9A-Za-z.-]+))?(?:\+[0-9A-Za-z.-]+)?$/;

const version = (major, minor = 0, patch = 0, prerelease = []) => ({
  major,
  minor,
  patch,
  prerelease,
});

const ANY = [{ op: ">=", version: version(0, 0, 0) }];

/** `"1.4.2-rc.1"` -> `{ major: 1, minor: 4, patch: 2, prerelease: ["rc", 1] }` */
export function parseVersion(input) {
  const match = VERSION.exec(String(input).trim());
  if (match === null) {
    throw new TypeError(`not a semver version: ${input}`);
  }

  const [, major, minor, patch, prerelease] = match;
  return version(
    Number(major),
    Number(minor),
    Number(patch),
    // Numeric identifiers are compared as numbers, so store them as numbers:
    // "rc.10" must sort above "rc.9", which string comparison gets wrong.
    prerelease === undefined
      ? []
      : prerelease.split(".").map((id) => (/^\d+$/.test(id) ? Number(id) : id)),
  );
}

function comparePrerelease(a, b) {
  // A version with no prerelease outranks the same version with one:
  // 1.0.0 > 1.0.0-rc.1 > 1.0.0-beta.
  if (a.length === 0 && b.length === 0) return 0;
  if (a.length === 0) return 1;
  if (b.length === 0) return -1;

  for (let i = 0; i < Math.max(a.length, b.length); i += 1) {
    const left = a[i];
    const right = b[i];
    if (left === undefined) return -1; // a shorter set of identifiers is lower
    if (right === undefined) return 1;
    if (left === right) continue;

    const leftIsNumber = typeof left === "number";
    const rightIsNumber = typeof right === "number";
    if (leftIsNumber !== rightIsNumber) return leftIsNumber ? -1 : 1;
    return left < right ? -1 : 1;
  }

  return 0;
}

/** Sort comparator: negative if `a` is older than `b`. Accepts strings. */
export function compareVersions(a, b) {
  const left = typeof a === "string" ? parseVersion(a) : a;
  const right = typeof b === "string" ? parseVersion(b) : b;

  return (
    left.major - right.major ||
    left.minor - right.minor ||
    left.patch - right.patch ||
    comparePrerelease(left.prerelease, right.prerelease)
  );
}

function parsePartial(token) {
  const match = PARTIAL.exec(token);
  if (match === null) {
    throw new TypeError(`not a comparator: ${token}`);
  }

  const [, op = "", major, minor, patch, prerelease] = match;
  const wild = (part) => part === undefined || part === "x" || part === "X" || part === "*";

  return {
    op,
    major: wild(major) ? null : Number(major),
    minor: wild(minor) ? null : Number(minor),
    patch: wild(patch) ? null : Number(patch),
    prerelease: prerelease === undefined ? [] : parseVersion(`0.0.0-${prerelease}`).prerelease,
  };
}

// #region bounds
// `^` allows changes that do not modify the left-most *non-zero* component.
// That single sentence is the whole reason ^0.3.1 and ^1.3.1 behave
// differently: below 1.0.0 the minor is the left-most non-zero position.
function caretUpperBound(part) {
  if (part.major !== 0) return version(part.major + 1);
  if (part.minor === null) return version(1); // ^0, ^0.x
  if (part.minor !== 0) return version(0, part.minor + 1); // ^0.3.1
  if (part.patch === null) return version(0, 1); // ^0.0, ^0.0.x
  return version(0, 0, part.patch + 1); // ^0.0.3 - only that patch
}

// `~` allows patch-level changes when a minor is given, minor-level otherwise.
function tildeUpperBound(part) {
  if (part.minor === null) return version(part.major + 1); // ~1
  return version(part.major, part.minor + 1); // ~1.2, ~1.2.3
}

// An x-range is an implied bound: `1.x` is >=1.0.0 <2.0.0. Returns null when
// every component is pinned, because then there is no upper bound to imply.
function wildcardUpperBound(part) {
  if (part.minor === null) return version(part.major + 1);
  if (part.patch === null) return version(part.major, part.minor + 1);
  return null;
}
// #endregion bounds

function expandToken(token) {
  if (token === "" || token === "*" || token === "x" || token === "X" || token === "latest") {
    return ANY;
  }

  const part = parsePartial(token);
  if (part.major === null) return ANY;

  const lower = version(part.major, part.minor ?? 0, part.patch ?? 0, part.prerelease);
  const implied = wildcardUpperBound(part);

  switch (part.op) {
    case "^":
      return [{ op: ">=", version: lower }, { op: "<", version: caretUpperBound(part) }];
    case "~":
      return [{ op: ">=", version: lower }, { op: "<", version: tildeUpperBound(part) }];
    case ">":
      // `>1.2` means ">= 1.3.0": every 1.2.x is excluded, not just 1.2.0.
      return implied === null
        ? [{ op: ">", version: lower }]
        : [{ op: ">=", version: implied }];
    case ">=":
      return [{ op: ">=", version: lower }];
    case "<":
      return [{ op: "<", version: lower }];
    case "<=":
      return implied === null
        ? [{ op: "<=", version: lower }]
        : [{ op: "<", version: implied }];
    default:
      // No operator: an exact pin, unless a wildcard implied a bound.
      return implied === null
        ? [{ op: "=", version: lower }]
        : [{ op: ">=", version: lower }, { op: "<", version: implied }];
  }
}

function expandSet(text) {
  // `1.2.3 - 2.3.4` is an inclusive range, and the only place whitespace is
  // not simply an AND, so it has to be handled before tokenising.
  const hyphen = text.split(/\s+-\s+/);
  if (hyphen.length === 2) {
    const [from, to] = hyphen.map(parsePartial);
    const implied = wildcardUpperBound(to);
    return [
      {
        op: ">=",
        version: version(from.major ?? 0, from.minor ?? 0, from.patch ?? 0, from.prerelease),
      },
      implied === null
        ? { op: "<=", version: version(to.major, to.minor, to.patch, to.prerelease) }
        : { op: "<", version: implied },
    ];
  }

  return text
    .replace(/(\^|~|>=|<=|>|<|=)\s+/g, "$1") // ">= 1.2.3" -> ">=1.2.3"
    .trim()
    .split(/\s+/)
    .flatMap(expandToken);
}

/** `"^1.2 || ~2.0"` -> two comparator sets, either of which may match. */
export function parseRange(range) {
  return String(range)
    .trim()
    .split("||")
    .map((set) => expandSet(set.trim()));
}

function testComparator(target, { op, version: bound }) {
  const order = compareVersions(target, bound);
  switch (op) {
    case ">=":
      return order >= 0;
    case ">":
      return order > 0;
    case "<=":
      return order <= 0;
    case "<":
      return order < 0;
    default:
      return order === 0;
  }
}

// #region prerelease-rule
function satisfiesSet(target, comparators) {
  // The prerelease rule: a version carrying a prerelease tag is only ever
  // considered by a comparator set that names a prerelease of the *same*
  // [major, minor, patch]. This is why 2.0.0-rc.1 does not satisfy >=1.0.0
  // even though it is numerically greater - you never get handed an
  // unreleased version by accident.
  if (target.prerelease.length > 0) {
    const optedIn = comparators.some(
      (comparator) =>
        comparator.version.prerelease.length > 0 &&
        comparator.version.major === target.major &&
        comparator.version.minor === target.minor &&
        comparator.version.patch === target.patch,
    );
    if (!optedIn) return false;
  }

  return comparators.every((comparator) => testComparator(target, comparator));
}
// #endregion prerelease-rule

/** Does `candidate` satisfy `range`? The question npm asks a few thousand times per install. */
export function satisfies(candidate, range) {
  const target = parseVersion(candidate);
  return parseRange(range).some((set) => satisfiesSet(target, set));
}

/** The version npm would pick: the highest one the range allows, or null. */
export function maxSatisfying(versions, range) {
  return (
    [...versions]
      .filter((candidate) => satisfies(candidate, range))
      .sort(compareVersions)
      .at(-1) ?? null
  );
}
