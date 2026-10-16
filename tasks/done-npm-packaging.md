# TODO - npm packaging, version ranges & dependency resolution

Plan: `~/.claude/plans/reactive-foraging-flute.md`

## Examples (`examples/javascript/packages/`)

- [x] `semver.mjs` - dependency-free range matcher (library, no output)
- [x] `semver-ranges.mjs` - prints the range/version truth table + asserts
- [x] `resolution-tree.mjs` - simulates npm's tree builder, prints layouts
- [x] `token.mjs` - tiny module used to demonstrate duplicate copies
- [x] `duplicate-instances.mjs` - two copies, broken `instanceof`, two singletons

## Docs

- [x] `docs/javascript/creating-packages.md`
- [x] `docs/javascript/version-ranges.md`
- [x] `docs/javascript/dependency-resolution.md`

## Wiring

- [x] `docs/.vitepress/config.ts` - new "Packages & Dependencies" sidebar group
- [x] `docs/javascript/index.md` - new table block
- [x] `docs/javascript/npm-and-packages.md` - cross-links out to the new pages
- [x] `docs/javascript/modules-esm-and-cjs.md` - link `exports` section onward
- [x] `README.md` - mention packaging & resolution
- [x] `docs/guide/writing-docs.md` - document `#region` snippets (see review)

## Verification

- [x] `npm run check:js` passes (examples execute, asserts hold)
- [x] Quoted output in docs copied from real stdout
- [x] `npm run check` passes end to end (exit 0)

## Review

Three new pages (1080 lines) backed by five runnable examples (693 lines).

**Verified rather than asserted.** Everything quoted is real output:

- The range matcher was differentially tested against the real `semver@7.8.5`
  (installed in a scratch directory, not added to this repo): **936
  range/version comparisons, 0 mismatches**, plus `sort` and `maxSatisfying`.
- `ERESOLVE`, `npm pack --dry-run`, `npm explain`, `npm ls commander`, the
  lockfile entry, and the `overrides` fix are captured from real runs - the
  `npm ls`/`npm explain`/lockfile ones from this repository's own tree, which
  duplicates 8 packages.
- `--install-strategy=nested` vs the default layout was run and diffed.

**Four claims corrected because the check failed:**

1. `npm install --include=prerelease` does not exist (`Must be one or more of:
   prod, dev, optional, peer`). Rewritten to the real opt-ins.
2. npm 11 **errors** on publishing a prerelease without `--tag`; it does not
   merely warn.
3. `file:../pkg` **symlinks** in modern npm - it does not copy and does not
   honour `files`. `--install-links` is what installs a real copy.
4. npm does not support the `link:` protocol at all
   (`EUNSUPPORTEDPROTOCOL`) - that is pnpm/yarn.

**Pre-existing repo issue found.** `docs/guide/writing-docs.md` claimed
`<<< file.ts{10-20}` "pulls in only lines 10-20". It does not: VitePress passes
that range through as *line highlighting* and embeds the whole file (verified by
rendering, and by reading the snippet plugin in
`node_modules/vitepress/dist/node/`). Only `#region` markers select. The guide
is corrected and the new examples use regions.

**Not done (out of scope, needs a decision).** 31 snippet imports across the six
TypeScript "Classes" pages rely on the wrong behaviour, so each of those pages
currently embeds its example files whole, three to five times over:

| Page | Ranged imports |
| --- | --- |
| `typescript/mixins-and-class-factories.md` | 8 |
| `typescript/classes-with-interfaces.md` | 6 |
| `typescript/abstract-classes-and-inheritance.md` | 5 |
| `typescript/class-chaining-and-builders.md` | 5 |
| `typescript/classes-and-constructors.md` | 4 |
| `typescript/class-methods-and-callers.md` | 3 |

Fixing them means adding `#region` markers to the example files and rewriting
the imports - mechanical, but a separate change.
