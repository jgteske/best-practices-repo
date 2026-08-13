# Creating & Publishing a Package

Publishing to npm is one command. Everything difficult about it happens before
and after: deciding what the public surface is, making sure the tarball contains
what you think it contains, and accepting that a published version is permanent.
This page is the path from a directory of source files to something other people
can install - and to something *you* can still change afterwards.

## What a published package is

A tarball plus a manifest, nothing more. The registry stores it, the client
unpacks it into `node_modules`, and from that moment the only things that matter
are the files you included and the fields that describe them.

```json
{
  "name": "@acme/duration",
  "version": "1.0.0",
  "description": "Parse and format durations.",
  "license": "MIT",
  "type": "module",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "default": "./dist/index.js"
    }
  },
  "files": ["dist"],
  "sideEffects": false,
  "engines": { "node": ">=22" },
  "repository": {
    "type": "git",
    "url": "git+https://github.com/acme/duration.git"
  },
  "scripts": {
    "build": "tsc -p tsconfig.build.json",
    "test": "node --test",
    "prepublishOnly": "npm run build && npm test"
  },
  "devDependencies": { "typescript": "^5.5.4" }
}
```

| Field | Role |
| --- | --- |
| `name` | the install name and the namespace; see below |
| `version` | must be unique - the registry never lets you reuse one |
| `license` | omit it and consumers' license scanners flag you; `"UNLICENSED"` is a valid answer |
| `type` | `"module"` makes `.js` files ESM - see [ESM vs CommonJS](./modules-esm-and-cjs) |
| `exports` | the public surface, and the thing that blocks deep imports |
| `files` | the allow-list of what goes in the tarball |
| `sideEffects` | `false` promises importing a module changes nothing, so bundlers may drop unused ones |
| `engines` | the Node versions you support |
| `repository` | powers "Repository" on npmjs.com and provenance attestation |
| `bin` | maps command names to executable files, for a CLI |
| `publishConfig` | overrides at publish time - registry, `access`, tag |

### Naming

Names are lowercase, URL-safe, and globally unique - which for anything
memorable means "taken". A **scope** solves that:

```
duration            unscoped - first come, first served
@acme/duration      scoped to an org or user
```

Scoped packages are **private by default**, which is the single most common
first-publish failure. `npm publish` on a scope you have not paid for fails with
`402 Payment Required` unless you say `--access public` (or record it once in
`publishConfig`). Scopes also namespace an organisation cleanly and make a
private registry straightforward later, so prefer one.

## Entry points

`exports` replaced `main`. It does two jobs: it names the entry points, and it
makes everything else unreachable, which is what lets you rearrange `dist/`
without a major version.

```json
{
  "exports": {
    ".": "./dist/index.js",
    "./testing": "./dist/testing.js",
    "./package.json": "./package.json"
  }
}
```

That publishes `@acme/duration` and `@acme/duration/testing`, and nothing else:

```
$ node -e "import('@acme/duration/dist/index.js')"
ERR_PACKAGE_PATH_NOT_EXPORTED: Package subpath './dist/index.js' is not defined
by "exports" in .../node_modules/@acme/duration/package.json
```

::: warning `./package.json` is blocked too, unless you export it
Plenty of tooling reads a dependency's `package.json` at runtime. If you define
`exports` and do not list it, those reads fail. Exporting it costs nothing and
is worth doing by default.
:::

**Conditions** let one subpath resolve to different files depending on who is
asking. They are matched **top to bottom**, so order is load-bearing:

```json
{
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "node": "./dist/index.node.js",
      "browser": "./dist/index.browser.js",
      "import": "./dist/index.mjs",
      "require": "./dist/index.cjs",
      "default": "./dist/index.js"
    }
  }
}
```

| Condition | Matches |
| --- | --- |
| `types` | TypeScript - **must be first**, or TS resolves a JS file and gives up |
| `node` / `browser` | the runtime the bundler or Node declares |
| `import` / `require` | how the consumer loaded you |
| `development` / `production` | opt-in, set by some bundlers |
| `default` | anything - **must be last**, since it always matches |

The private counterpart is `imports`, for internal aliases that never leave your
package:

```json
{ "imports": { "#config": "./src/config.js" } }
```

`import "#config"` then works from anywhere inside the package without a stack
of `../../`, and means nothing to consumers.

## Shipping types

If the package is written in TypeScript, ship the declarations and point at them
from the `types` condition (first, always). Consumers on
`"moduleResolution": "node16"` or `"bundler"` read `exports`; consumers on the
legacy `"node"` mode do not, so a top-level `"types": "./dist/index.d.ts"`
alongside `exports` is cheap insurance.

If the package is written in JavaScript, `types` can point at a hand-written
`.d.ts` - see
[.ts, .tsx & .d.ts](/typescript/file-kinds-and-declarations) for what belongs in
one.

## Dual ESM/CJS, and whether to bother

Publishing both formats means two builds and this shape:

```json
{
  "type": "module",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js",
      "require": "./dist/index.cjs"
    }
  }
}
```

::: warning The dual-package hazard
A consumer that reaches your package both ways - directly with `import`, and
through a dependency that uses `require` - loads **both** builds, and gets two
copies of every class and every module-level singleton in one process. The
symptoms are exactly those in
[How Dependencies Get Resolved](./dependency-resolution#why-a-duplicate-copy-matters):
`instanceof` failing against a seemingly identical class, two registries where
there should be one.
:::

The ways out, in order: publish **ESM only** (Node 22.12+ can `require()` ESM
without top-level `await`, so this is increasingly viable); or publish CJS only
and let ESM consumers use the interop; or, if you must ship both, keep all state
in a thin shared CJS core that both entry points re-export, so there is only one
copy of the state even when there are two of the wrappers.

## What actually gets published

`files` is an allow-list. Without it, npm publishes everything that is not in
`.gitignore`/`.npmignore` - which is how test fixtures, `.env` files, and CI
config end up on the public registry.

**Never trust it without looking.** `npm pack --dry-run` prints the exact
tarball contents:

```
$ npm pack --dry-run
npm notice 📦  @acme/duration@1.0.0
npm notice Tarball Contents
npm notice 9B README.md
npm notice 33B dist/index.d.ts
npm notice 21B dist/index.js
npm notice 200B package.json
npm notice Tarball Details
npm notice name: @acme/duration
npm notice version: 1.0.0
npm notice filename: acme-duration-1.0.0.tgz
npm notice package size: 344 B
npm notice unpacked size: 263 B
npm notice total files: 4
```

That project also has `src/`, `test/`, and a `.env` on disk. `"files": ["dist"]`
kept all three out - and note that `package.json`, `README`, `LICENSE`, and the
file named by `main`/`bin` are **always** included whatever you write.

::: tip The warning you want to see
If npm prints `No .npmignore file found, using .gitignore for file exclusion`,
you have no allow-list and are publishing by exclusion. That is the mode where
`.env` slips out. Add `files`.
:::

## The scripts that run around publishing

| Script | Runs |
| --- | --- |
| `prepare` | after `npm install` in a git checkout, and before `pack`/`publish` - the place for a build needed by git-URL installs |
| `prepack` | before the tarball is built (also on `npm pack`) |
| `prepublishOnly` | only on `npm publish` - the right home for "build and test before this goes out" |
| `postpublish` | after a successful publish - push tags, notify |

`prepublishOnly` is the gate: `"prepublishOnly": "npm run build && npm test"`
makes it impossible to publish a version whose tests you never ran.

## Publishing

```bash
npm login                       # or a granular access token in CI
npm version minor               # bumps package.json, commits, and tags v1.1.0
npm publish --dry-run           # everything except the upload
npm publish --access public     # scoped packages need this the first time
git push --follow-tags
```

`npm version <major|minor|patch|prerelease>` is worth using rather than editing
the field by hand: it refuses to run on a dirty tree, writes the commit, and
creates the matching git tag, so the published version and the tagged commit
cannot drift apart.

### Dist-tags

Every published version carries a tag; `latest` is what `npm install pkg`
resolves to. That indirection is how prereleases stay out of everyone's way:

```bash
npm publish --tag next          # 2.0.0-rc.1 published, latest untouched
npm install @acme/duration@next # opt in explicitly
npm dist-tag ls @acme/duration  # what points where
npm dist-tag add @acme/duration@2.0.0 latest   # promote, after the RC period
```

Without a tag, publishing `2.0.0-rc.1` would move `latest` to it and every plain
`npm install` of your package would start serving a release candidate. npm 11
refuses rather than let that happen:

```
$ npm publish --dry-run
npm error You must specify a tag using --tag when publishing a prerelease version.
```

Older clients did it silently, which is why so many packages have a `latest`
pointing at an abandoned beta.

### Provenance

In a supported CI (GitHub Actions, GitLab), `npm publish --provenance` attaches
a signed attestation linking the tarball to the workflow run and commit that
produced it, and npmjs.com shows the badge. It needs `id-token: write`
permission and a public package. Combined with a granular, expiring access token
rather than a personal password, it is most of what supply-chain hardening means
for a small package.

## After publishing

**A version is permanent.** `npm unpublish` is only allowed within 72 hours of
publishing, and only if nothing else depends on it; past that it takes a support
request, and the usual answer is no - somebody's lockfile pins that exact
tarball and its integrity hash. Republishing the same version number is never
possible. The tools you actually have:

```bash
npm deprecate @acme/duration@"<1.0.0" "no longer maintained, use v1"
npm deprecate @acme/duration@1.2.3 "broken build, use 1.2.4"
npm deprecate @acme/duration@1.2.3 ""     # clear the notice again
```

A deprecation prints a warning on install and leaves the version installable,
which is the right outcome for a bad release: publish the fixed version, then
deprecate the broken one pointing at it.

## Testing a package before it exists

Do not publish to find out whether it works. Three ways to install a package
that is still on your disk, in increasing order of fidelity:

```bash
# 1. Fastest, least accurate: a symlink. Ignores `files` entirely.
cd ~/src/duration && npm link
cd ~/src/app && npm link @acme/duration

# 2. Also a symlink, despite looking like an install:
npm install ../duration

# 3. A real copy, built through `files` - the tarball's contents, unpacked.
npm install ../duration --install-links

# 4. Best: install the actual artifact you would publish.
cd ~/src/duration && npm pack          # -> acme-duration-1.0.0.tgz
cd ~/src/app && npm install ../duration/acme-duration-1.0.0.tgz
```

The difference between 2 and 3 is worth seeing once:

```
$ npm install ../duration               # a symlink to your working tree
node_modules/@acme/duration -> ../../../duration

$ npm install ../duration --install-links
node_modules/@acme/duration/            # a directory, filtered by `files`
  dist/  package.json  README.md        # no src/, no test/, no .env
```

::: warning Symlinked packages hide the bugs you are looking for
A symlinked package resolves its own dependencies from *its* directory, so peer
dependencies and duplicated copies behave differently than they will for a real
consumer - the classic "two copies of React" that only appears when linked. A
symlink also ignores `files`, so a `dist/` you forgot to include looks fine
locally and arrives empty for everybody else. Iterate with a link; verify with
the tarball.
:::

For several packages developed together, workspaces are better than any of the
above: one `npm install` at the root symlinks them to each other, with a single
lockfile for the whole tree.

```json
{ "workspaces": ["packages/*"] }
```

## A release checklist

1. `npm run build && npm test` clean, on a clean git tree.
2. `npm pack --dry-run` - is every file in that list one you meant to publish?
3. Install the tarball into a scratch project and import it, both the way
   TypeScript sees it and the way Node does.
4. `npm version <level>` for the bump, commit, and tag.
5. `npm publish --dry-run`, then `npm publish` (`--access public` on a scope's
   first release, `--tag next` for a prerelease).
6. `git push --follow-tags`, and write the release notes while you remember why.

## Summary

- Scope your package; scoped packages need `--access public` on first publish.
- `exports` is the public API - it names entry points and blocks everything
  else, including `./package.json` unless you list it.
- Conditions are ordered: `types` first, `default` last.
- Prefer ESM-only to a dual build; if you ship both, keep shared state in one
  place or consumers get two copies.
- `files` is an allow-list, and `npm pack --dry-run` is the only way to know
  what you are about to publish.
- `prepublishOnly` is where "build and test" belongs.
- `npm version` keeps the tag and the version in sync; dist-tags keep
  prereleases out of `latest`.
- A published version is permanent: `npm deprecate` forward, never unpublish and
  re-push.
- Test with the real tarball - `npm link` hides duplicate-copy and `files` bugs.
