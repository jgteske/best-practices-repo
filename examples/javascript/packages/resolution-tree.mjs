// npm does not install a dependency *graph* - it writes a directory *tree*,
// and a directory can hold only one version of a name. This simulates the
// placement rule that turns one into the other:
//
//   1. process dependencies breadth-first, shallowest first;
//   2. if a copy is already visible from where the dependent sits and it
//      satisfies the range, reuse it (this is deduplication);
//   3. otherwise install the highest satisfying version at the root, if the
//      root has no copy of that name yet (this is hoisting);
//   4. otherwise nest it inside the dependent's own node_modules.
//
// Real npm has more to worry about - peer dependencies, bundled deps, an
// existing lockfile to honour - but rules 2-4 are what decide whether you end
// up with one copy of a package or three.
import assert from "node:assert/strict";

import { maxSatisfying, satisfies } from "./semver.mjs";

/** Build the node_modules tree for `rootDependencies` against `registry`. */
function install(rootDependencies, registry) {
  const root = { name: "(root)", version: null, children: new Map() };
  const queue = Object.entries(rootDependencies).map(([name, range]) => ({
    name,
    range,
    // The chain of packages between the root and the dependent - exactly the
    // directories Node will walk when it resolves a bare specifier.
    chain: [root],
  }));
  const log = [];

  while (queue.length > 0) {
    // #region placement
    const { name, range, chain } = queue.shift();
    const dependent = chain.at(-1);

    // Node resolves `require("x")` by looking in the nearest node_modules and
    // walking up, so that is the order a copy counts as "already visible".
    let visible = null;
    for (let i = chain.length - 1; i >= 0; i -= 1) {
      const found = chain[i].children.get(name);
      if (found !== undefined) {
        visible = found;
        break;
      }
    }

    if (visible !== null && satisfies(visible.version, range)) {
      log.push(`reuse  ${name}@${visible.version} for ${describe(dependent)} (wants ${range})`);
      continue;
    }

    const version = maxSatisfying(Object.keys(registry[name] ?? {}), range);
    assert.ok(version !== null, `nothing published for ${name}@${range}`);

    // Rule 3 vs rule 4: the root slot is first-come, first-served.
    const conflicted = root.children.has(name);
    const target = conflicted ? dependent : root;
    const node = { name, version, children: new Map() };
    target.children.set(name, node);
    // #endregion placement

    log.push(
      conflicted
        ? `nest   ${name}@${version} under ${describe(dependent)} (wants ${range}; root has ${root.children.get(name).version})`
        : `hoist  ${name}@${version} to the root (${describe(dependent)} wants ${range})`,
    );

    const chainForNode = target === root ? [root, node] : [...chain, node];
    for (const [depName, depRange] of Object.entries(registry[name][version] ?? {})) {
      queue.push({ name: depName, range: depRange, chain: chainForNode });
    }
  }

  return { root, log };
}

const describe = (node) => (node.version === null ? "the root package" : `${node.name}@${node.version}`);

function render(node, prefix = "") {
  const children = [...node.children.values()].sort((a, b) => a.name.localeCompare(b.name));

  return children
    .map((child, index) => {
      const last = index === children.length - 1;
      const line = `${prefix}${last ? "└─ " : "├─ "}${child.name}@${child.version}`;
      if (child.children.size === 0) return line;

      const indent = prefix + (last ? "   " : "│  ");
      return [line, `${indent}└─ node_modules/`, render(child, `${indent}   `)].join("\n");
    })
    .join("\n");
}

function copiesOf(node, name, found = []) {
  for (const child of node.children.values()) {
    if (child.name === name) found.push(child.version);
    copiesOf(child, name, found);
  }
  return found;
}

function report(title, rootDependencies, registry) {
  const { root, log } = install(rootDependencies, registry);
  console.log(`${title}\n`);
  console.log("  the root package depends on:");
  for (const [name, range] of Object.entries(rootDependencies)) {
    console.log(`    ${name}: "${range}"`);
  }
  console.log("\n  what the installer decided:");
  for (const line of log) console.log(`    ${line}`);
  console.log("\n  node_modules/");
  console.log(
    render(root, "  ")
      .split("\n")
      .map((line) => `  ${line}`)
      .join("\n"),
  );
  console.log();
  return root;
}

// ---------------------------------------------------------------------------
// 1. The diamond that cannot be flattened: two dependents, incompatible ranges.
// ---------------------------------------------------------------------------

const conflicting = {
  charting: { "1.0.0": { lodash: "^3.10.0" } },
  reporting: { "1.0.0": { lodash: "^4.17.0" } },
  lodash: { "3.10.1": {}, "4.17.15": {}, "4.17.21": {} },
};

const conflicted = report(
  "1. incompatible ranges - one name, two directories",
  { charting: "^1.0.0", reporting: "^1.0.0" },
  conflicting,
);

assert.deepEqual(copiesOf(conflicted, "lodash").sort(), ["3.10.1", "4.17.21"]);
// charting won the root slot only because it was processed first. Nothing in
// the algorithm promises *which* dependent gets hoisted - only that one does.
assert.equal(conflicted.children.get("lodash").version, "3.10.1");
assert.equal(conflicted.children.get("reporting").children.get("lodash").version, "4.17.21");
assert.equal(conflicted.children.get("charting").children.size, 0);

// ---------------------------------------------------------------------------
// 2. The same shape, with ranges that overlap: one copy, shared.
// ---------------------------------------------------------------------------

const compatible = {
  charting: { "1.0.0": { lodash: "^4.16.0" } },
  reporting: { "1.0.0": { lodash: "^4.17.0" } },
  lodash: { "3.10.1": {}, "4.17.15": {}, "4.17.21": {} },
};

const deduped = report(
  "2. overlapping ranges - deduplicated into a single copy",
  { charting: "^1.0.0", reporting: "^1.0.0" },
  compatible,
);

assert.deepEqual(copiesOf(deduped, "lodash"), ["4.17.21"]);
assert.equal(deduped.children.get("charting").children.size, 0);
assert.equal(deduped.children.get("reporting").children.size, 0);

// ---------------------------------------------------------------------------
// 3. Hoisting makes packages importable that you never declared.
// ---------------------------------------------------------------------------

const transitive = {
  server: { "1.0.0": { debug: "^4.3.0" } },
  debug: { "4.3.4": { ms: "^2.1.2" } },
  ms: { "2.1.2": {}, "2.1.3": {} },
};

const hoisted = report(
  "3. transitive hoisting - where phantom dependencies come from",
  { server: "^1.0.0" },
  transitive,
);

// Nothing in the root package.json mentions `ms`, yet it sits at the top of
// node_modules, so `import "ms"` from application code resolves and works -
// right up until `debug` changes its own dependency and the phantom vanishes.
assert.equal(hoisted.children.get("ms").version, "2.1.3");
assert.equal(hoisted.children.has("debug"), true);

console.log("all documented placements hold");
