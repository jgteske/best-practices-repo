# CI/CD with GitHub Actions

Continuous integration means **every change is checked automatically before
it is merged**. Continuous delivery adds one more step: every change that
passes is deployed. GitHub Actions runs both from YAML files in
`.github/workflows/`. The format is easy to start with. It is just as easy to
end up with workflows that are slow, flaky, or a security hole with write
access to your repository.

Every workflow on these pages is a real file under
[`examples/github-actions`](https://github.com/jgteske/best-practices-repo/tree/main/examples/github-actions).
`npm run check:actions` lints them with
[actionlint](https://github.com/rhysd/actionlint), which also runs shellcheck
over every `run:` script. Two files under `must-fail/` contain classic
mistakes, and the check **requires actionlint to reject them** with specific
errors, so every "actionlint catches this" claim on these pages is itself
tested. This repository's own [`ci.yml`](https://github.com/jgteske/best-practices-repo/blob/main/.github/workflows/ci.yml)
follows every practice described here.

## What's covered

<div class="vp-doc">

| Page | Focus |
| --- | --- |
| [Workflow Anatomy](./workflow-anatomy) | Triggers, jobs and steps, `needs`, step and job outputs, conditions, `concurrency`, timeouts, and job summaries. |
| [Security](./security) | Least-privilege `permissions`, pinning actions by SHA, script injection, `pull_request_target`, secrets, and OIDC instead of long-lived keys. |
| [Matrices, Caching & Artifacts](./caching-and-matrices) | `strategy.matrix` with `include`/`exclude`, dependency caches and cache keys, and passing files between jobs. |
| [Reusable Workflows](./reusable-workflows) | `workflow_call` with inputs, secrets and outputs, calling one per package, and reusable workflows vs composite actions. |
| [Cheat Sheet](./cheatsheet) | One-line reminders grouped by task. |

</div>

## The model in one paragraph

An **event** (a push, a pull request, a schedule, a button click) triggers
**workflows** whose `on:` matches it. A workflow is a set of **jobs**. Each
job runs on a fresh virtual machine (a **runner**), and jobs run in parallel
unless `needs:` orders them. A job is a list of **steps**. Each step is either
a shell command (`run:`) or an **action** (`uses:`), which is someone else's
code at a specific version. Jobs share nothing unless you pass it explicitly
(outputs, artifacts, caches), and every job gets a short-lived
`GITHUB_TOKEN` whose rights you set with `permissions:`.

## A good CI pipeline

- **Fast.** Cache dependencies, cancel outdated runs, and split slow suites
  across a matrix. A check that takes 20 minutes gets skipped by humans.
- **The same as local.** CI runs the same commands developers run (`npm run check`
  here), not a separate set of commands only CI knows.
- **Required.** Make the check a required status for merging (branch
  protection or rulesets), or a red X is only advice.
- **Least privilege.** Read-only by default, actions pinned by SHA,
  untrusted input never pasted into scripts.
- **Linted.** `actionlint` finds typos in keys, wrong step ids and shell bugs
  before a push-and-wait cycle does.
