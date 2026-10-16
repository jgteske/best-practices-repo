# Matrices, Caching & Artifacts

The examples are from
[`caching-and-matrices.yml`](https://github.com/jgteske/best-practices-repo/blob/main/examples/github-actions/.github/workflows/caching-and-matrices.yml).

## Build matrices

<<< ../../examples/github-actions/.github/workflows/caching-and-matrices.yml#matrix{yaml}

`strategy.matrix` runs the job once per combination of its lists, in parallel.

- **`exclude`** removes combinations. Here Windows + Node 22 is dropped, so
  4 combinations become 3.
- **`include`** adds variables to the combinations it matches (here `coverage`
  goes to ubuntu + 24), or adds a new combination if it matches none.
- **`fail-fast: false`** lets every combination finish. The default cancels
  the rest as soon as one fails, which hides whether the failure is
  OS-specific or happens everywhere.
- A descriptive `name:` makes required checks readable in the PR UI.

Keep matrices small. Each combination is a full job with its own setup time,
and on private repositories each one is billed. Test the oldest and newest
supported runtime versions, not every one in between.

## Dependency caches

Most `setup-*` actions cache the package manager's download directory for you.
Set `cache: npm` / `pip` / `poetry` / `gradle`, and the cache is keyed on the
lockfile hash. For anything else, use `actions/cache`:

<<< ../../examples/github-actions/.github/workflows/caching-and-matrices.yml#cache{yaml}

The **key** must change whenever the cached content should change. Hash the
file that determines it, so `hashFiles('**/package-lock.json')` for npm and
the config file for tools. Include `runner.os`, because caches aren't portable
between operating systems. **`restore-keys`** are prefixes to fall back to when
there is no exact hit. A slightly stale cache plus an incremental install
beats starting from nothing. A cache entry is immutable: the cache action
saves a new entry only when the key had no exact hit.

Caching rules:

- Cache **downloads** (`~/.npm`, `~/.cache/pip`), not install directories like
  `node_modules`. `npm ci` deletes `node_modules` anyway.
- Caches are scoped by branch. A PR can read caches from its base branch, but
  writes its own. So populate caches on `main`.
- Never cache anything secret. Caches can be read by later runs, including
  runs triggered by PRs.

## Passing files between jobs: artifacts

<<< ../../examples/github-actions/.github/workflows/caching-and-matrices.yml#artifacts{yaml}

Each job runs on a fresh machine, so a build output has to be uploaded as an
**artifact** and downloaded by the job that needs it. Artifacts are also how
you keep test reports, coverage and built binaries attached to the run for
people to download. Set `retention-days` so they don't fill your storage
quota.

| Use | For |
| --- | --- |
| cache | speeding up repeated work. Can be missing at any time, so correctness must not depend on it |
| artifact | handing exact outputs from one job to another, or to people |
| job outputs | small strings (versions, flags, URLs) |

## Rules of thumb

- Matrix the dimensions that really differ (OS, oldest and newest runtime), and set `fail-fast: false`.
- Use the `setup-*` actions' built-in `cache:` first, and `actions/cache` keyed on `hashFiles(...)` for the rest.
- Cache downloads, not installed trees. Populate caches from `main`.
- Use artifacts for build outputs between jobs and caches for speed. Never rely on a cache for correctness.
