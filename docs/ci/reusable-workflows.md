# Reusable Workflows

::: v-pre
When five repositories, or five packages in one repository, run the same
"install, lint, test" steps, copy-pasted YAML drifts apart quickly. A
**reusable workflow** is a workflow file with `on: workflow_call` that other
workflows call like a function: typed inputs, explicit secrets, and outputs.

Examples:
[`reusable-tests.yml`](https://github.com/jgteske/best-practices-repo/blob/main/examples/github-actions/.github/workflows/reusable-tests.yml)
and
[`reusable-caller.yml`](https://github.com/jgteske/best-practices-repo/blob/main/examples/github-actions/.github/workflows/reusable-caller.yml).
`check:actions` lints them as a pair, so a caller passing an input the callee
doesn't declare fails the check.

## Defining one

<<< ../../examples/github-actions/.github/workflows/reusable-tests.yml#workflow-call{yaml}

- **`inputs`** are typed (`string`, `number`, `boolean`) and can have defaults.
  Read them as `${{ inputs.name }}`.
- **`secrets`** must be declared, and the caller passes them explicitly, so a
  reusable workflow can't read secrets it wasn't given.
- **`outputs`** map job outputs to workflow outputs, and the caller reads them
  as `needs.<job>.outputs.<name>`.
- It must live in `.github/workflows/` of some repository. A file elsewhere
  can't be called.

## Calling one

<<< ../../examples/github-actions/.github/workflows/reusable-caller.yml#call{yaml}

A calling job has **no steps and no `runs-on`**, only `uses:`, `with:` and
`secrets:`. It can still take a `strategy.matrix`, which makes "run the same
pipeline for every package" a few lines. Reference a workflow in the same
repository by path (`./.github/workflows/...`, which runs at the caller's
commit). Reference one in another repository as
`owner/repo/.github/workflows/file.yml@<sha>`, and pin it like any other
action. `secrets: inherit` forwards all of the caller's secrets. That is
convenient within one organisation, but passing them one by one documents what
each one is for.

## Reusable workflow or composite action?

| | Reusable workflow | Composite action |
| --- | --- | --- |
| Unit | one or more **jobs** | **steps** inside a job |
| Defined in | `.github/workflows/*.yml` with `on: workflow_call` | `action.yml` with `runs: using: composite` |
| Chooses its runner | yes (`runs-on` inside) | no, it runs on the caller's |
| Can use secrets / environments | yes, declared | only what the caller passes as inputs |
| Shows in the UI as | separate jobs, with their own logs | steps of the calling job |
| Best for | a whole standard pipeline ("our Node CI") | a repeated setup sequence ("install toolchain X") |

Both nest: a reusable workflow can use composite actions, and reusable
workflows can call others up to ten levels deep.

## Rules of thumb

- Extract a reusable workflow once a second repository or package copies the same jobs.
- Declare every input and secret. Prefer passing secrets one by one over `secrets: inherit`.
- Pin cross-repository calls to a SHA, just like actions.
- Use composite actions for repeated steps, and reusable workflows for repeated jobs.

:::
