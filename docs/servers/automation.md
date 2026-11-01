# Automating with CI/CD

::: v-pre
The goal is that **merging a pull request is the only way production changes**.
Each layer gets its own workflow, triggered by changes to its own files, because
they change at different rates and carry different risks.

| Layer | On pull request | On merge to `main` |
| --- | --- | --- |
| Terraform | `fmt`, `validate`, plan | Apply after approval |
| Ansible | Syntax check, lint | Dry run, then apply |
| App | Your tests | Build image, push, trigger Coolify |
| Schedule | | Drift detection |

:::

![Each change type passes pull request checks, then after merging waits for approval in the production environment before reaching the server or Coolify. A manual rollback passes the same gate, and a weekly schedule checks for drift through the drift environment, where a failed run is the alert](./diagrams/delivery-pipelines.drawio.png)

::: v-pre

The workflows are real files in
[`examples/github-actions`](https://github.com/jgteske/best-practices-repo/tree/main/examples/github-actions/.github/workflows),
and they assume a repository with `infra/terraform` and `infra/ansible` folders.
The [CI/CD guide](../ci/) explains the workflow syntax and security practices they
rely on.

## Terraform: plan on the PR, apply after approval

<<< ../../examples/github-actions/.github/workflows/infra-terraform.yml#plan{yaml}

The plan goes in the job summary, so reviewers see what will change next to the
code. Fork pull requests are skipped, because their code must never run with your
cloud token.

<<< ../../examples/github-actions/.github/workflows/infra-terraform.yml#apply{yaml}

Set **required reviewers** on the `production` environment, and restrict it to
`main`. This job is the only one with a write token, and the workflow's
`concurrency` group stops two applies from overlapping. Reviewers approve the PR's
plan, but `apply` computes a fresh plan after merging, so check the run's output
if anything else has changed in between.

## Ansible: reaching the server safely

GitHub's runners don't have fixed IP addresses, and opening port 22 to all of them
would undo the firewall. Instead, the runner joins a private network for the
length of the job:

<<< ../../examples/github-actions/.github/workflows/infra-ansible.yml#connect{yaml}

Pin the host key in the `SSH_KNOWN_HOSTS` variable. Running `ssh-keyscan` in the
job would trust whichever machine answered, which removes the protection the check
provides. Limit the CI tag with your tailnet's access rules so it can reach only
this server's SSH port, and use an SSH key that exists only for CI.

<<< ../../examples/github-actions/.github/workflows/infra-ansible.yml#run{yaml}

The dry run stops the job on an error before anything changes, and the log shows
each diff. Tasks that depend on an earlier change can fail in check mode, so
guard those with `when: not ansible_check_mode` or `check_mode: false`.

## Applications: build, then trigger

CI builds and tests an image, pushes it, and then asks Coolify to deploy it. This
avoids building on the production server, and each image is tied to a commit:

<<< ../../examples/github-actions/.github/workflows/deploy-coolify.yml#build{yaml}

In Coolify, configure the app to use the prebuilt image with the `production` tag.
Then call the [deploy endpoint](https://coolify.io/docs/api/endpoints/deployments/deploy-by-tag-or-uuid):

<<< ../../examples/github-actions/.github/workflows/deploy-coolify.yml#trigger{yaml}

Set this up in Coolify:

1. Enable the API under **Settings → Advanced**, if it's off.
2. Under **Keys & Tokens → API Tokens**, create a token with only the **Deploy**
   permission. It's shown once.
3. Store it as an environment secret, and turn off Coolify's own automatic deploy
   for this app so that it doesn't deploy untested commits as well.

GHCR image names must be lowercase, so a repository name with capitals needs
converting first. If the image is private, add registry credentials on the server.

## Rollback

<<< ../../examples/github-actions/.github/workflows/deploy-coolify.yml#rollback{yaml}

Run the workflow by hand with an old commit SHA. This moves the `production` tag to
an image that's already built, which is faster and safer than reverting and
rebuilding under pressure.

::: warning Rollback doesn't undo database migrations
Old code has to run against the new schema. Make migrations backwards compatible
by adding the new form first and removing the old one in a later release.
:::

## Detecting drift

Someone will eventually make a quick manual fix. A scheduled job finds it before it
gets overwritten or forgotten:

<<< ../../examples/github-actions/.github/workflows/drift-detection.yml#terraform-drift{yaml}

<<< ../../examples/github-actions/.github/workflows/drift-detection.yml#ansible-drift{yaml}

A failed run is the alert. Put these credentials in a separate `drift` environment
with no required reviewers, restricted to `main`, so the schedule doesn't wait for
an approval. Then decide: put the change into Git, or let the next run remove it.

## Credentials

Give each job the least it can work with:

| Credential | Scope | Where it's stored |
| --- | --- | --- |
| Hetzner token for plans | Read-only | Repository secret and `drift` environment |
| Hetzner token for applies | Read and write | `production` environment |
| State bucket key | That bucket only | Repository secret and `drift` environment |
| SSH key for CI | One user on these servers | `production` and `drift` environments |
| Ansible Vault password | | `production` and `drift` environments |
| Coolify token | Deploy only | `production` environment |
| GHCR | The job's `GITHUB_TOKEN`, with `packages: write` | Automatic |

- Prefer OIDC where your provider supports it, which
  [removes the stored key altogether](../ci/security#oidc-instead-of-long-lived-cloud-keys).
- The plan job needs the state bucket key, and a PR from your own repository can
  edit its workflow to read repository secrets. Restrict who can push branches,
  and scope that key to the state bucket.
- Protect `main` with required checks. If anyone can push to it, the pipeline isn't
  a control.
- Use a real CI user rather than root. CI needs sudo for Ansible, so treat this key
  as highly privileged anyway.

## Rules of thumb

- Trigger each pipeline on its own paths, so an app change never touches infrastructure.
- Put a human approval in front of anything that can destroy resources.
- Pin actions and tool versions, the same as any other dependency.
- Serialize production jobs with `concurrency`, and never cancel one midway.
- Keep a documented way to do everything by hand for when CI itself is down.

:::
