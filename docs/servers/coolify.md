# Deploying with Coolify

[Coolify](https://coolify.io/docs/) is a self-hosted deployment platform. It
builds and runs your apps as Docker containers, routes traffic through a reverse
proxy, gets TLS certificates, and schedules database backups. It takes the role a
managed platform would otherwise fill.

Coolify changes quickly, so check its documentation when a detail here doesn't
match what you see.

## Install it from a pinned version

The official installer takes a version as its argument, so Ansible can install a
known release:

<<< ../../examples/servers/ansible/roles/coolify/tasks/main.yml#install{yaml}

- **Set the root user's details during the install.** Otherwise your dashboard
  waits for the first visitor to create the admin account.
- **Use a fresh server.** The
  [installation docs](https://coolify.io/docs/get-started/installation) recommend
  it, and it avoids conflicts with whatever's already running. The minimum is
  2 CPU cores, 2 GB of RAM and 10 GB of disk, but builds need more.
- **Turn off automatic updates** with `AUTOUPDATE=false` if you want upgrades to
  happen after a backup and at a time you choose.

## Close the setup ports

Coolify's dashboard starts on port 8000, with 6001 and 6002 for realtime updates
and the web terminal. The [firewall docs](https://coolify.io/docs/knowledge-base/server/firewall)
say all three can be closed once the dashboard works through a domain:

1. Set `expose_setup_port = true` in Terraform for the first login. Port 8000 opens
   to your admin networks only.
2. Create the admin account, then point a DNS record at the server.
3. Set the instance's domain under Coolify's settings, and confirm the dashboard,
   live updates and terminal work over HTTPS.
4. Set the variable back to `false` and apply.

Enable two-factor authentication on the dashboard. It has root-level control over
the server, so treat it like SSH access.

## What Coolify needs from the host

- **Root SSH by key.** The installer sets up a key so Coolify can reach its own
  host. A [non-root user](https://coolify.io/docs/knowledge-base/server/non-root-user)
  is possible but experimental, and it needs passwordless sudo for everything, so
  it doesn't reduce privilege.
- **Ports 80 and 443** for the proxy and for issuing certificates.
- **Docker**, which the installer sets up, including log rotation in
  `/etc/docker/daemon.json`. Leave Docker's installation to Coolify rather than
  adding an Ansible role that fights it.

## Choosing how an app gets built

| Method | Use it when | Trade-off |
| --- | --- | --- |
| Nixpacks | A simple app with no Dockerfile yet | Quickest start, with less control over the result |
| Dockerfile | You want control and reproducible builds | You maintain the Dockerfile, and the build runs on the server |
| Docker Compose | The app has several services | Coolify reads your Compose file, so learn how it handles domains and networks |
| Prebuilt image | Production apps with CI | Requires a registry, but tested images are deployed and the server doesn't build |

For anything that matters, **build in CI and deploy a prebuilt image**. A big
build on the server that runs production competes with your live apps for memory
and CPU. See [Automating with CI/CD](./automation#applications-build-then-trigger).
If you do want builds in Coolify, a separate build server keeps them away from
production.

## Configuration and secrets

- Keep environment-specific values in Coolify's environment variables, not in images.
- A value baked into an image is readable by anyone who can pull that image.
- Mark values as build-time only if the build really needs them, because they can
  end up in image layers.
- Keep a list of the required variables (names only) in the app's repository, so
  you can restore them after a rebuild.

## Keep production separate

- Use separate Coolify projects or environments for staging and production.
- Use preview deployments for pull requests, but remember that they run the
  PR's code on your server. Don't enable them for untrusted forks.
- Avoid running heavy workloads next to Coolify on one small server. Coolify's own
  docs warn that high server usage can stop the dashboard from working, so moving
  apps to a second server is the first step when you grow.

## Rules of thumb

- Pin the version, and upgrade deliberately after a backup.
- Close ports 8000, 6001 and 6002 once the domain works.
- Build in CI, and deploy an image that's been tested.
- Treat dashboard access as root access to the server.
- Back up Coolify and its encryption key. See [Backups](./operations#backups).
