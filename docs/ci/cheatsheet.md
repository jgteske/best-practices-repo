# GitHub Actions Cheat Sheet

One-line reminders, grouped by task. Follow the links for the full explanation.

## Triggers: [details](./workflow-anatomy#triggers-on)

```yaml
on:
  pull_request:                         # the merge gate (forks: read-only token, no secrets)
  push: { branches: [main], paths-ignore: ["**.md"] }
  workflow_dispatch: { inputs: { dry-run: { type: boolean, default: true } } }
  schedule: [{ cron: "17 3 * * 1" }]   # UTC; avoid minute 0
  workflow_call:                        # reusable workflow
```

## Every workflow: [details](./workflow-anatomy#defaults-for-every-job)

```yaml
permissions: { contents: read }         # or {} - then per-job additions
concurrency: { group: "${{ github.workflow }}-${{ github.ref }}", cancel-in-progress: true }
jobs:
  x:
    runs-on: ubuntu-latest
    timeout-minutes: 15                 # default is 360
```

## Data between steps and jobs: [details](./workflow-anatomy#passing-data-outputs-and-needs)

```bash
echo "name=value" >> "$GITHUB_OUTPUT"   # step output -> ${{ steps.<id>.outputs.name }}
echo "VAR=value" >> "$GITHUB_ENV"       # env var for later steps
echo "### Done" >> "$GITHUB_STEP_SUMMARY"
```

```yaml
outputs: { v: "${{ steps.read.outputs.v }}" }   # job output -> needs.<job>.outputs.v
needs: [build]  ;  if: always()  ;  if: needs.build.result == 'failure'
```

## Security: [details](./security)

```yaml
- uses: actions/checkout@<40-char-sha> # v4.4.0     # pin; Dependabot bumps both
  with: { persist-credentials: false }
- env: { TITLE: "${{ github.event.pull_request.title }}" }
  run: echo "$TITLE"                    # untrusted input via env, never inline ${{ }}
permissions: { id-token: write }        # OIDC to the cloud instead of stored keys
```

## Speed: [details](./caching-and-matrices)

```yaml
strategy: { fail-fast: false, matrix: { os: [ubuntu-latest, windows-latest], node: [22, 24] } }
- uses: actions/setup-node@<sha> # v4
  with: { node-version-file: .nvmrc, cache: npm }
- uses: actions/cache@<sha> # v4
  with: { path: ~/.cache/x, key: "x-${{ runner.os }}-${{ hashFiles('x.lock') }}", restore-keys: "x-${{ runner.os }}-" }
- uses: actions/upload-artifact@<sha> # v4   (download-artifact in the next job)
```

## Tooling

```bash
actionlint                              # lint every workflow (+ shellcheck on run: steps)
gh workflow run ci.yml -f dry-run=false # trigger workflow_dispatch
gh run watch ; gh run view --log-failed # follow / debug a run
```
