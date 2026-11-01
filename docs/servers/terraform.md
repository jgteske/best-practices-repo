# Provisioning with Terraform

Terraform describes the resources that should exist and works out the changes
needed to get there. [OpenTofu](https://opentofu.org/) is its open-source fork.
The examples work with both, and the `tofu` commands here have matching
`terraform` commands.

The files are in
[`examples/servers/terraform`](https://github.com/jgteske/best-practices-repo/tree/main/examples/servers/terraform).

## Keep state remote and locked

State is Terraform's record of what it manages. Keeping it on a laptop means
nobody else, including CI, can run safely. Two simultaneous applies can also
corrupt it.

<<< ../../examples/servers/terraform/versions.tf{hcl}

<<< ../../examples/servers/terraform/backend.hcl{hcl}

::: danger State files can contain secrets
Keep the bucket private, encrypted and versioned, and never commit `*.tfstate`.
Versioning also gives you a way back from a damaged state file.
:::

`use_lockfile` needs Terraform or OpenTofu 1.10 or later. Other S3-compatible
stores usually need extra backend settings, and locking relies on the store
supporting conditional writes, so check that before relying on it.

## Commit the lock file

`~> 1.70` allows newer 1.x provider versions, and `.terraform.lock.hcl` records
exactly which one you tested. Commit it so that CI and your laptop get the same
build. CI then uses `tofu init -lockfile=readonly`, which fails instead of
quietly changing it. Update providers on purpose with `tofu init -upgrade`, in a
pull request.

## Make the firewall the real boundary

<<< ../../examples/servers/terraform/main.tf#firewall{hcl}

Only web traffic is open to everyone. Docker's iptables rules can bypass UFW
([details](./docker#docker-bypasses-ufw)), so this provider-level firewall is the
one to rely on. Variables can also reject a dangerous value before anything runs:

<<< ../../examples/servers/terraform/variables.tf#admin-cidrs{hcl}

## Protect servers that hold data

<<< ../../examples/servers/terraform/main.tf#server{hcl}

Two lifecycle settings do the work here:

- **`prevent_destroy`** makes any plan that would destroy the server fail.
  Some changes force a replacement, and this stops one from being applied
  by accident.
- **`ignore_changes`** covers arguments that matter only at creation. Without it,
  editing `cloud-init.yaml` would plan a replacement of a running server.

Always read the plan before applying it, and look for `must be replaced`.

## Bootstrap with cloud-init, then stop

<<< ../../examples/servers/terraform/cloud-init.yaml{yaml}

Terraform shouldn't configure the inside of the server. Provisioners and long
cloud-init files run once, are hard to re-run, and can't tell you when the server
has drifted. Install just enough for Ansible to connect.

## Secrets and variables

- Provider tokens come from the environment (`HCLOUD_TOKEN`), not from `.tf` files.
- Don't commit `*.tfvars` files holding real values. CI passes them as `TF_VAR_*`
  variables instead.
- A secret passed to a resource is stored in state, even if it's marked
  `sensitive`. That flag only hides it from the output.

## Managing Coolify itself with Terraform

A [community Coolify provider](https://pkg.go.dev/github.com/coolify-terraform/terraform-provider-coolify)
exists, at v0.1.x when this was written. These examples don't use it. Using the
Coolify UI and API avoids tying your server's lifecycle to an early-stage
provider. Evaluate it if you run enough apps that clicking through the UI becomes
the bottleneck.

## Rules of thumb

- Use remote state with locking, and commit the lock file.
- Change infrastructure only through code. A console change is drift, and the next apply may undo it.
- Read every plan, and treat `must be replaced` as a stop sign.
- Keep CI's plan token read-only where the provider supports it.
- Pin provider versions, and update them in their own pull request.
