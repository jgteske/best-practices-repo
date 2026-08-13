# npm, `package.json` & Semver

`package.json` is the manifest, the lockfile is the reproducible build, and
semver is the contract between them. Most dependency pain traces back to one of
three misunderstandings: what a range actually permits, why the lockfile is
committed, or which dependency section a package belongs in.

::: tip This page is the overview
Three companion pages go into detail where this one summarises:
[Creating & Publishing a Package](./creating-packages) for authoring one,
[Version Ranges In Depth](./version-ranges) for the full range grammar, and
[How Dependencies Get Resolved](./dependency-resolution) for what the installer
does with those ranges.
:::

## The fields that matter

```json
{
  "name": "my-service",
  "version": "1.4.2",
  "private": true,
  "type": "module",
  "engines": { "node": ">=22" },
  "scripts": {
    "build": "tsc -p tsconfig.build.json",
    "test": "node --test",
    "check": "npm run typecheck && npm test"
  },
  "dependencies": { "undici": "^6.19.0" },
  "devDependencies": { "typescript": "^5.5.4" }
}
```

| Field | Why it matters |
| --- | --- |
| `"private": true` | Makes `npm publish` refuse. Put it on every application and internal repo - it is the cheapest possible guard against publishing something by accident. |
| `"type"` | `"module"` makes `.js` files ESM. See [ESM vs CommonJS](./modules-esm-and-cjs). |
| `"engines"` | Declares the supported Node range. A warning by default; an error with `engine-strict=true` in `.npmrc`. |
| `"exports"` | The public surface of a published package, and the thing that blocks deep imports. Replaces `main`. |
| `"files"` | Allow-list of what gets published. Without it you ship your tests, fixtures, and CI config. |
| `"scripts"` | The project's task interface - see below. |
| `"packageManager"` | Pins the exact npm/pnpm/yarn version; Corepack enforces it. |

Published packages additionally want `license`, `repository`, and either
`"sideEffects": false` or an accurate list, so bundlers can tree-shake. The
`exports` map, the conditions inside it, and what `files` really controls are
covered in [Creating & Publishing a Package](./creating-packages).

## Semver, and what a range really permits

`MAJOR.MINOR.PATCH` — breaking / additive / fix. The ranges you will actually
write:

| Range | Allows | Reads as |
| --- | --- | --- |
| `^1.4.2` | `>=1.4.2 <2.0.0` | "any compatible update" — the npm default |
| `~1.4.2` | `>=1.4.2 <1.5.0` | "patches only" |
| `1.4.2` | exactly that | "nothing moves" |
| `*` / `latest` | anything | "please break my build" |

::: warning `^` behaves differently below 1.0.0
`^0.3.1` means `>=0.3.1 <0.4.0` — for `0.x` releases the *minor* is treated as
the breaking position, because pre-1.0 packages are permitted to break there.
`^0.0.3` allows only `0.0.3`. Plenty of widely used packages sit on `0.x`
indefinitely, so this is not an edge case.
:::

Semver is a promise about intent, not a guarantee about behaviour. A patch
release can still break you. That is what the lockfile is for.

The rest of the grammar - hyphen ranges, `||`, x-ranges, the prerelease rule,
and which range to choose for an application versus a published library - is on
[Version Ranges In Depth](./version-ranges).

## `npm ci` vs `npm install`

| | `npm install` | `npm ci` |
| --- | --- | --- |
| Reads | `package.json` | `package-lock.json` only |
| Writes the lockfile | yes, may update it | never - errors if it disagrees with `package.json` |
| `node_modules` | updates in place | deletes and reinstalls from scratch |
| Speed | slower resolution | faster, no resolution step |
| Use in | local development | **CI, Docker builds, anywhere reproducible** |

**Commit `package-lock.json`.** It records the exact resolved version and
integrity hash of every package in the tree, including transitive ones that no
range in your manifest mentions. Without it, `^1.4.2` means "whatever 1.x existed
the day the build ran", and a build that passed yesterday can fail today with an
unchanged commit.

Useful commands that are not `install`:

```bash
npm ls undici              # why is this version here? shows the dependency path
npm outdated               # what has moved, and how far
npm update                 # bump within the existing ranges
npm audit                  # known advisories
npm audit fix --dry-run    # see what it would change before it changes it
npm dedupe                 # collapse duplicate transitive copies
```

::: tip `npm audit` output needs reading, not obeying
An advisory against a package your build tooling uses at compile time is not the
same risk as one in a request path in production. Treat the report as input;
`npm audit fix --force` will happily install a major version bump that breaks
you. Check whether the vulnerable code path is one you actually reach.
:::

## Which dependency section?

| Section | Ships to production | For |
| --- | --- | --- |
| `dependencies` | yes | anything the running code imports |
| `devDependencies` | no | build tools, test runners, types, linters |
| `peerDependencies` | declared, not installed | plugins that must share the host's copy - a React component library, an ESLint plugin |
| `optionalDependencies` | attempted, failure ignored | platform-specific native extras |

The rule of thumb: **if `import`ing it at runtime would break production, it is a
`dependency`.** For an application that gets bundled or compiled, the distinction
matters less; for a published library it is the difference between a working
install and a broken one.

`peerDependencies` exist to prevent two copies of a singleton (React's hooks,
ESLint's rule registry) ending up in one process. npm 7+ installs them
automatically, which is convenient and occasionally surprising -
`--legacy-peer-deps` is the escape hatch when a transitive peer range is
overly strict, and `overrides` is the surgical version:

```json
{ "overrides": { "vulnerable-lib": "^2.1.0" } }
```

Why two copies are a problem in the first place, how to read the `ERESOLVE`
error a peer conflict produces, and what the installer does with all of this:
[How Dependencies Get Resolved](./dependency-resolution).

## Scripts

`scripts` is the project's task interface: a newcomer should be able to run
`npm run` and see everything the repo can do.

- **`pre`/`post` hooks** fire automatically: `pretest` runs before `test`. They
  are implicit control flow, so keep them rare and obvious.
- **`node_modules/.bin` is on `PATH`** inside a script, which is why `"build":
  "tsc"` works without a path or `npx`.
- **`npm run x -- --flag`** forwards arguments past npm's own parsing.
- **Chain with `&&`** so the first failure stops the run - this repo's `check`
  script is exactly that: `typecheck && check:bash && check:js && docs:build`.
- **`prepare`** runs on `npm install` in a git checkout and before publish; it is
  the conventional home for a git-hook installer or a build step for a package
  installed straight from a repository.

::: warning Install scripts execute arbitrary code
`postinstall` in a *dependency* runs on your machine and in CI, with your
permissions. `npm ci --ignore-scripts` disables that, and is a reasonable default
for CI where nothing in the tree legitimately needs it.
:::

## `npx`

`npx pkg` runs a package's binary, using the local copy if there is one and
otherwise downloading it into a cache. Excellent for one-shot tools
(`npx create-vitepress@latest`); a mistake inside a build, where you want the
version pinned in `devDependencies` rather than whatever is current today.

Pin the version when it matters: `npx typescript@5.5.4 tsc --noEmit`.

## Workspaces

A monorepo without extra tooling:

```json
{ "workspaces": ["packages/*"] }
```

One `npm install` at the root links the packages to each other and hoists shared
dependencies into a single `node_modules`. `npm run build --workspaces` runs a
script in each; `npm install lodash -w packages/api` adds a dependency to one.
There is a single lockfile for the whole tree.

That covers a handful of packages. Past that, task orchestration and caching
(Turborepo, Nx, or pnpm's own tooling) start earning their keep - npm workspaces
do linking, not scheduling.

## Summary

- `"private": true` on everything you do not intend to publish; `"files"` and
  `"exports"` on everything you do.
- `^` means "same major" - except below 1.0.0, where it means "same minor".
- Commit the lockfile and use `npm ci` everywhere reproducibility matters.
- Runtime imports are `dependencies`; everything else is `devDependencies`.
- `peerDependencies` prevent two copies of a singleton; `overrides` force a
  transitive version.
- Scripts are the project's interface - chain with `&&`, keep hooks rare.
- Dependency install scripts run arbitrary code; `--ignore-scripts` in CI is a
  sensible default.
