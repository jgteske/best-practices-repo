# Workflow Anatomy

::: v-pre
This page walks through one complete workflow,
[`anatomy.yml`](https://github.com/jgteske/best-practices-repo/blob/main/examples/github-actions/.github/workflows/anatomy.yml),
part by part.

## Triggers: `on:`

<<< ../../examples/github-actions/.github/workflows/anatomy.yml#triggers{yaml}

| Trigger | Runs | Typical use |
| --- | --- | --- |
| `push` | on every push to matching branches/tags | CI on `main`, deploys, releases on tags |
| `pull_request` | when a PR is opened or updated | the merge gate. Forks get a **read-only** token and no secrets |
| `workflow_dispatch` | from a button or `gh workflow run` | manual deploys, one-off jobs, with typed `inputs` |
| `schedule` | on a cron schedule (UTC) | nightly builds, dependency checks, cleanup |
| `workflow_call` | when another workflow calls it | [reusable workflows](./reusable-workflows) |

`paths` / `paths-ignore` and `branches` / `branches-ignore` filter `push` and
`pull_request`. Be careful with path filters on a **required** check: a PR
that touches only ignored files never starts the check, so it never reports
success, and the PR can't be merged. Either filter inside the job, or require
a job that always runs.

Scheduled runs are delayed when GitHub is busy, so avoid minute `0` of the
hour. In public repositories, GitHub disables them after 60 days without
repository activity.

## Defaults for every job

<<< ../../examples/github-actions/.github/workflows/anatomy.yml#defaults{yaml}

- **`permissions`** sets what `GITHUB_TOKEN` can do. Set it explicitly at the
  top of every workflow, as described in [Security](./security#least-privilege-permissions).
- **`concurrency`** groups runs. A new run in the same group waits, or, with
  `cancel-in-progress`, cancels the old one. Keying the group on `github.ref`
  gives one run per branch or PR. Making cancellation conditional keeps
  every run on `main`, so each merge gets checked and deployed.
- **`defaults.run.shell: bash`** runs every step as
  `bash --noprofile --norc -eo pipefail {0}`, so a failing command in the
  middle of a pipeline (`curl ... | jq`) fails the step. Without a `shell:`,
  Linux steps run `bash -e {0}`, which has **no pipefail**, and Windows steps
  run PowerShell.

## Jobs and steps

<<< ../../examples/github-actions/.github/workflows/anatomy.yml#job-and-steps{yaml}

- Set **`timeout-minutes`** on every job. The default is 360 minutes, which a
  hung test burns completely.
- Use **`npm ci`**, not `npm install`. It installs exactly what the lockfile
  says and fails if `package.json` and the lockfile disagree. The same applies
  to `pip install -r` with hashes, `poetry install --sync` and `cargo --locked`.
- Read the runtime version **from the repository** (`node-version-file`,
  `python-version-file`), so CI and developers can't drift apart.
- `${{ }}` expressions are evaluated by Actions **before** the step runs. That
  makes them convenient for inputs you control, and dangerous for input you
  don't. See [script injection](./security#untrusted-input-is-data-not-code).

## Passing data: outputs and `needs`

<<< ../../examples/github-actions/.github/workflows/anatomy.yml#outputs-and-needs{yaml}

A step writes `name=value` lines to the file at `$GITHUB_OUTPUT`. The job
re-exports the values it wants under `outputs:`, and a later job reads them
as `needs.<job>.outputs.<name>`. `$GITHUB_STEP_SUMMARY` takes Markdown that
appears on the run's summary page, which is useful for test reports, coverage
or deploy URLs. `$GITHUB_ENV` sets environment variables for the job's
*later* steps.

A job with `needs:` is **skipped** when any of its dependencies fails or is
skipped. To run anyway (cleanup, notifications), use `if: always()` or
`if: failure()`, and check `needs.<job>.result` in the condition.

## Rules of thumb

- Trigger CI on `pull_request` (the merge gate) and on `push` to `main`.
- Set `permissions`, `concurrency` and `timeout-minutes` explicitly in every workflow.
- Install from the lockfile, and read tool versions from files in the repository.
- Pass data between steps with `$GITHUB_OUTPUT` and between jobs with `outputs` + `needs`.
- Run `actionlint` before you push a workflow change.

:::
