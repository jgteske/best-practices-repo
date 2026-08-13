# Version Ranges in Depth

A range in `package.json` is not a version. It is a *policy*: the set of
versions you are willing to accept, evaluated against whatever the registry
holds at the moment somebody runs `npm install`. Writing `"undici": "^6.19.0"`
is a standing instruction to a program you will not be watching, so it pays to
know exactly what you have authorised.

Every table on this page is printed by
[`semver-ranges.mjs`](https://github.com/jgteske/best-practices-repo/tree/main/examples/javascript/packages/semver-ranges.mjs),
which runs a dependency-free implementation of npm's matcher
([`semver.mjs`](https://github.com/jgteske/best-practices-repo/tree/main/examples/javascript/packages/semver.mjs))
over a fixed list of versions. Its output is quoted verbatim below and its
assertions run in CI, so a claim here cannot drift away from what the algorithm
really does.

## Anatomy of a version

```
1.4.2-rc.1+build.55
│ │ │  │      └── build metadata - ignored completely when comparing
│ │ │  └───────── prerelease tag - makes this version *lower* than 1.4.2
│ │ └──────────── PATCH  - backwards-compatible fix
│ └────────────── MINOR  - backwards-compatible addition
└──────────────── MAJOR  - breaking change
```

The comparison rules that follow from that are worth stating precisely, because
two of them regularly surprise people:

| Rule | Consequence |
| --- | --- |
| Compare major, then minor, then patch, numerically | `1.10.0` is **newer** than `1.9.0` - these are numbers, not decimals |
| A version with a prerelease is lower than the same version without | `2.0.0-rc.1 < 2.0.0` |
| Prerelease identifiers compare left to right; numeric ones compare as numbers | `2.0.0-rc.10 > 2.0.0-rc.2` |
| Numeric identifiers rank below alphanumeric ones | `1.0.0-1 < 1.0.0-alpha` |
| A shorter set of prerelease identifiers is lower | `1.0.0-rc < 1.0.0-rc.1` |
| Build metadata is not part of precedence at all | `2.0.0+build.55` and `2.0.0` are **equal** |

```
precedence: how the registry orders what it has

  1.9.9 < 2.0.0-alpha < 2.0.0-beta.2 < 2.0.0-rc.2 < 2.0.0-rc.10 < 2.0.0 < 2.0.0+build.55
  (build metadata is ignored entirely: 2.0.0+build.55 ties with 2.0.0)
```

## Every operator you can write

| Range | Expands to | Reads as |
| --- | --- | --- |
| `1.4.2` | `=1.4.2` | exactly this, nothing moves |
| `^1.4.2` | `>=1.4.2 <2.0.0` | "any compatible update" - npm's default |
| `~1.4.2` | `>=1.4.2 <1.5.0` | patches only |
| `~1.4` | `>=1.4.0 <1.5.0` | same thing, minor pinned |
| `~1` | `>=1.0.0 <2.0.0` | with no minor, `~` widens to the major |
| `1.4.x` | `>=1.4.0 <1.5.0` | an x-range, identical to `~1.4` |
| `1.x` / `1` | `>=1.0.0 <2.0.0` | identical to `^1.0.0` |
| `*` / `x` / `""` | `>=0.0.0` | anything published |
| `>=1.4.2` | itself | no upper bound - majors included |
| `>1.2` | `>=1.3.0` | a partial version excludes **all** of `1.2.x` |
| `<=1.2` | `<1.3.0` | the same asymmetry in reverse |
| `1.2.3 - 1.4.5` | `>=1.2.3 <=1.4.5` | hyphen range, inclusive both ends |
| `1.2 - 1.4` | `>=1.2.0 <1.5.0` | a partial right-hand side widens to the whole `1.4` line |
| `>=1.4.2 <1.6.0` | both must hold | **whitespace means AND** |
| `^1 \|\| ^2` | either may hold | `\|\|` means OR |

::: tip Two grammar rules, and everything else is spelling
A space between comparators is an **AND**; `||` is an **OR**. Every other form
in that table - `^`, `~`, x-ranges, hyphen ranges - is shorthand that the
installer expands into a pair of `>=`/`<` comparators before it does anything
else. `^1.4.2` is not a special kind of range; it is `>=1.4.2 <2.0.0` typed
faster.
:::

The expansion for `^` and `~` is small enough to read in full:

<<< ../../examples/javascript/packages/semver.mjs#bounds{js}

Run against a handful of published versions, the operators separate like this:

```
ranges over a 1.x package

range             1.4.1  1.4.2  1.4.9  1.5.0  1.9.9  2.0.0
----------------------------------------------------------
1.4.2                 .    yes      .      .      .      .
^1.4.2                .    yes    yes    yes    yes      .
~1.4.2                .    yes    yes      .      .      .
>=1.4.2 <1.6.0        .    yes    yes    yes      .      .
1.x                 yes    yes    yes    yes    yes      .
1.4.x               yes    yes    yes      .      .      .
1.2 - 1.4           yes    yes    yes      .      .      .
^1.4.2 || ^2          .    yes    yes    yes    yes    yes
*                   yes    yes    yes    yes    yes    yes
```

Note the difference between `^1.4.2` and `1.x`: the caret keeps the **lower**
bound you wrote, so `1.4.1` is excluded. An x-range throws it away. If you
depend on a bug fix released in `1.4.2`, `1.x` does not express that and
`^1.4.2` does.

## The `^` rule below 1.0.0

`^` allows changes that do not modify the **left-most non-zero** component. Above
`1.0.0` that component is the major, which is the familiar behaviour. Below it,
the rule shifts one position to the right for every leading zero:

```
the same operators below 1.0.0

range     0.0.3  0.0.4  0.3.1  0.3.9  0.4.0  1.0.0
--------------------------------------------------
^0.3.1        .      .    yes    yes      .      .
~0.3.1        .      .    yes    yes      .      .
^0.0.3      yes      .      .      .      .      .
~0.0.3      yes    yes      .      .      .      .
0.x         yes    yes    yes    yes    yes      .
*           yes    yes    yes    yes    yes    yes
```

::: warning `^0.3.1` and `~0.3.1` are the same range
On a `0.x` package the caret degrades to the tilde, and `^0.0.3` degrades
further to an exact pin. This is deliberate - semver gives pre-1.0 packages
permission to break in the minor - but it means the "any compatible update"
operator quietly stops giving you updates at all on the many packages that sit
at `0.x` indefinitely. If a `0.x` dependency matters to you, watch it manually;
`^` will not do it for you.
:::

## Prereleases are opt-in, per exact version

The rule: a version carrying a prerelease tag is only considered by a comparator
set that names a prerelease of the **same** `major.minor.patch`.

<<< ../../examples/javascript/packages/semver.mjs#prerelease-rule{js}

```
prereleases are opt-in, per [major, minor, patch]

  2.0.0-rc.1   does not satisfy  ^1.0.0
  2.0.0-rc.1   does not satisfy  >=1.0.0
  2.0.0-rc.1   does not satisfy  *
  2.0.0-rc.1   does not satisfy  ^2.0.0
  2.0.0-rc.1          satisfies  ^2.0.0-rc.1
  2.0.0-rc.2          satisfies  ^2.0.0-rc.1
  2.1.0-rc.1   does not satisfy  ^2.0.0-rc.1
  2.0.0               satisfies  ^2.0.0-rc.1
```

Three consequences worth internalising:

- **`>=1.0.0` does not match `2.0.0-rc.1`**, even though the prerelease is
  numerically greater. Nothing you can write with a plain comparator will hand
  you an unreleased version by accident.
- **Opting in is per version, not per package.** `^2.0.0-rc.1` accepts
  `2.0.0-rc.2` and the eventual `2.0.0`, but not `2.1.0-rc.1` - a new prerelease
  line needs a new range.
- **There is no "just give me prereleases" flag.** You opt in by naming the
  version (`npm install pkg@2.0.0-rc.1`), by naming a dist-tag
  (`npm install pkg@next`), or by writing a range that mentions a prerelease.
  Distributing them under a tag rather than `latest` is the publisher's half of
  the same idea - see
  [Creating & Publishing a Package](./creating-packages#dist-tags).

## Ranges that do not point at the registry

A dependency value is not always a semver range. These specifiers are all legal
in the same field, and all of them bypass version resolution entirely:

| Specifier | Installs |
| --- | --- |
| `"file:../shared"` | a **symlink** to that directory - your edits are live, and `files` is not applied |
| `"file:../shared/pkg.tgz"` | a local tarball, extracted like a registry package |
| `"git+https://github.com/o/r.git#v1.2.3"` | a git ref: tag, branch, or commit |
| `"git+ssh://git@host/o/r.git#semver:^1.2.0"` | the highest **tag** in that repo satisfying the range |
| `"npm:@scope/other@^2"` | an alias - the folder is named after the key, the contents come from another package |
| `"https://host/pkg.tgz"` | a tarball URL, no version resolution at all |
| `"workspace:^"` | the sibling workspace package, rewritten on publish - **pnpm and yarn only** |

npm records a directory dependency as `{"resolved": "../shared", "link": true}`
in the lockfile, with no version and no integrity hash. Pass `--install-links`
to install it as a real copy instead, which is what you want when you are
testing the thing you are about to publish. The `link:` protocol other managers
accept is not npm's - it fails with `EUNSUPPORTEDPROTOCOL`.

::: warning A git dependency has no integrity guarantee
A branch or tag can be moved after you install it, and the lockfile records the
commit rather than a hash of published content. Fine for a private repo you
control, a liability for anything else. Prefer a real registry - including a
private one - for anything you did not write.
:::

## Choosing a range

The right range depends entirely on who has to live with the answer.

| Where | Use | Why |
| --- | --- | --- |
| Application dependency | `^1.4.2` | the lockfile pins the exact version anyway; the range only says what an *update* may take |
| Application, tooling that formats or lints | `~1.4.2` or exact | a patch that changes formatting output rewrites your whole diff |
| Published library, runtime dependency | the **widest** range you actually support, usually `^` | narrow ranges in libraries are what force duplicate copies into your users' trees |
| Published library, peer dependency | very wide - `^17 \|\| ^18 \|\| ^19` | a peer range that is too tight is an install failure for the user, not a warning |
| `devDependencies` anywhere | `^` | they never reach a consumer |
| Anything with a history of breaking in patches | exact, with a comment | semver is a statement of intent, not a guarantee |

The asymmetry between applications and libraries is the part people get
backwards. An application has a lockfile, so a wide range costs nothing: the
exact version is pinned until somebody deliberately updates it. A **library**
has no lockfile in the consumer's install - its ranges are inputs to somebody
else's resolution, and every unnecessary constraint is another chance to force a
second copy of a package into their tree, or to fail their install outright. See
[How Dependencies Get Resolved](./dependency-resolution).

::: tip Pin exactly when the version *is* the contract
`save-exact=true` in `.npmrc` (or `npm install --save-exact`) writes `1.4.2`
instead of `^1.4.2`. It is the right default for the toolchain of an
application - the compiler, the formatter, the bundler - where a patch release
changing output is more disruptive than staying still. It is the wrong default
for a library, where it exports the constraint to everybody who installs you.
:::

`engines` is the same idea applied to the runtime rather than a package:

```json
{ "engines": { "node": ">=22" } }
```

By default npm only warns when the running Node fails that range. Set
`engine-strict=true` in `.npmrc` to make it an error - worth it for a repo where
a wrong Node version produces confusing failures much later.

## What actually gets installed

The range is only half the decision. **npm resolves a range to the highest
published version that satisfies it**, then writes that exact version to the
lockfile, and from then on the lockfile wins:

```
what npm installs today, from what the registry offers

  ^1.4.2         -> 1.9.9
  ~1.4.2         -> 1.4.9
  1.4.2          -> 1.4.2
  >=1.4.2        -> 2.0.0
  ^1 || ^2       -> 2.0.0
  ^2.1.0-rc.0    -> 2.1.0-rc.1
```

Which command moves which number:

| Command | `package.json` | `package-lock.json` |
| --- | --- | --- |
| `npm ci` | never read for resolution | never written - errors if it disagrees |
| `npm install` (no args) | unchanged | only changed if it is missing entries or contradicts the manifest |
| `npm update` | unchanged | bumped to the newest version **inside** the existing ranges |
| `npm update --save` | ranges bumped too | bumped |
| `npm install pkg@latest` | range rewritten to the new major | bumped |
| `npm outdated` | nothing | nothing - it only reports |

`npm outdated` is the one that makes this legible: `Wanted` is the highest
version your range allows, `Latest` is what the registry has under the `latest`
dist-tag. A row where those two differ is a major upgrade waiting for a human.

::: tip Update on a schedule, not on an incident
The failure mode of `^` is not that a bad version arrives - the lockfile stops
that. It is that nobody runs `npm update` for a year, and then a security
advisory forces four majors at once under time pressure. A small, boring,
regularly-merged update PR is the whole practice; Dependabot and Renovate exist
to open it for you.
:::

## Summary

- Whitespace is AND, `||` is OR, and every other operator is shorthand for a
  pair of `>=`/`<` comparators.
- `^` means "same major" - except below `1.0.0`, where it means "same minor",
  and `^0.0.3` means "exactly that".
- A partial version in a comparator widens it: `>1.2` excludes all of `1.2.x`.
- Prereleases never match a range that does not name a prerelease at the same
  `major.minor.patch`.
- Build metadata is ignored entirely when comparing versions.
- npm picks the **highest** version a range allows, then pins it in the
  lockfile; the range describes what an update may do, not what is installed.
- Wide ranges in libraries, exact pins for an application's toolchain.
- `npm outdated` shows the gap between what your range allows and what exists.
