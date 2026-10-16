# Security

::: v-pre
A workflow runs code from your repository, from every action it `uses:`, and
from every package those install, with a token that may be able to push to
your repository, publish packages or deploy. Most attacks on CI need one of
three mistakes: **too many permissions**, **an action that changed under you**,
or **untrusted text run as code**.

The examples are
[`security.yml`](https://github.com/jgteske/best-practices-repo/blob/main/examples/github-actions/.github/workflows/security.yml)
and the deliberately broken
[`must-fail/injection.yml`](https://github.com/jgteske/best-practices-repo/blob/main/examples/github-actions/must-fail/injection.yml).

## Least-privilege `permissions`

<<< ../../examples/github-actions/.github/workflows/security.yml#permissions{yaml}

Without a `permissions:` key, `GITHUB_TOKEN` gets the repository's default,
which is read-and-write on many older repositories. Declare it in every
workflow: `permissions: {}` (or `contents: read`) at the top, and per-job
additions only where they are needed. If a compromised dependency runs in a
job with `contents: read`, it can read code that is probably public anyway.
With `contents: write` it can push to your branches.

This repository's own `ci.yml` does the same. The workflow is
`contents: read`, and only the `deploy` job adds `pages: write` and
`id-token: write`.

## Pin actions to a commit SHA

<<< ../../examples/github-actions/.github/workflows/security.yml#pinning{yaml}

`uses: some/action@v4` resolves the **tag** `v4` at run time, and a tag can be
moved to any commit by whoever controls that repository, or by whoever
compromised it. That has happened to popular actions, which were changed to
dump CI secrets into public logs. A full 40-character commit SHA can't be
moved. Keep the version in a trailing comment. Dependabot
(`package-ecosystem: github-actions`) and Renovate both understand the
`@<sha> # vX.Y.Z` form and open PRs to update both together.

`persist-credentials: false` stops `actions/checkout` from leaving the token in
`.git/config`, where every later step (and every dependency it runs) can read
it. Set it unless a later step needs to `git push`.

## Untrusted input is data, not code

<<< ../../examples/github-actions/must-fail/injection.yml#injection{yaml}

`${{ ... }}` is **text substitution performed before the shell starts**. The
PR title is pasted into the script, so a title containing `"; <command>; echo "`
ends the string and runs the command. PR titles and bodies, branch names,
issue comments, commit messages and fork labels are all attacker-controlled.
actionlint rejects this file:

```
"github.event.pull_request.title" is potentially untrusted. avoid using it
directly in inline scripts. instead, pass it through an environment variable.
```

The fix is to pass the value through `env:`. The shell then sees a variable,
and expands it as data:

<<< ../../examples/github-actions/.github/workflows/security.yml#untrusted-input{yaml}

### `pull_request_target` and `workflow_run`

`pull_request` runs a fork's PR with a **read-only token and no secrets**,
which is safe by design. `pull_request_target` runs in the context of the
**base** repository, with a write token and secrets, so that it can label or
comment on fork PRs. Combined with checking out the PR's code
(`ref: ${{ github.event.pull_request.head.sha }}`) and running its build, it
hands your secrets to anyone who opens a PR. Use `pull_request_target` only
for steps that never execute the PR's code, and never combine it with
injectable expressions. The same applies to `workflow_run` workflows that
download artifacts from an untrusted run.

## Secrets

- Read secrets only through `${{ secrets.NAME }}` mapped into `env:` on the
  step that needs them, not workflow-wide.
- GitHub masks secret values in logs, but not transformed versions of them
  (base64, URL-encoded, split across lines). Never print them.
- Use **environments** (`environment: production`) with required reviewers
  and branch restrictions for deploy credentials. A workflow run from any
  other branch then can't read them.

## OIDC instead of long-lived cloud keys

For deploying to AWS, GCP or Azure, don't store an access key as a secret. Give
the job `permissions: id-token: write`. The cloud provider then trusts a
short-lived token that GitHub signs for **this repository, branch and
environment**, and swaps it for temporary credentials:

```yaml
permissions:
  id-token: write   # request the OIDC token
  contents: read
steps:
  - uses: aws-actions/configure-aws-credentials@<sha> # v4
    with:
      role-to-assume: arn:aws:iam::123456789012:role/deploy-from-main
      aws-region: eu-central-1
```

There is no key to leak or rotate, and the cloud-side trust policy can require
`ref:refs/heads/main`. GitHub Pages deployment (`actions/deploy-pages`, used
by this site) works the same way. That is why its job needs `id-token: write`.

## Rules of thumb

- Set `permissions: {}` or `contents: read` at the top, and add per-job permissions only where needed.
- Pin every third-party action to a full commit SHA, with the version in a comment, and let Dependabot bump it.
- Never put `${{ github.event.* }}` inside `run:`. Pass it through `env:`.
- Never build or run PR code under `pull_request_target`.
- Keep secrets in environments with protection rules, and prefer OIDC to stored cloud keys.
- Lint with actionlint. It catches injection and many other mistakes.

:::
