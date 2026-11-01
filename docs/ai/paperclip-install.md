# Installing Paperclip

This page gets Paperclip running in Docker on a server, reachable only over a
private network. Set up the server first with
[Running Your Own Server](../servers/your-own-server).

## Choose a mode

| Mode | Login | Use it for |
| --- | --- | --- |
| `local_trusted` | None | Your own laptop. Never on a server |
| `authenticated` + `private` | Required | A server reached over Tailscale, a VPN or a LAN |
| `authenticated` + `public` | Required | Reachable from the internet |

**Start with `authenticated` + `private` over
[Tailscale](./paperclip-tailscale).** The dashboard controls agents that can run
commands, so it's safer off the internet. See
[deployment modes](https://docs.paperclip.ing/reference/deploy/deployment-modes/)
for the details.

## Size the server

Paperclip's [VPS guide](https://docs.paperclip.ing/how-to/deploy-to-vps-or-fly/)
estimates $5-10 a month, but agents run in the same container as the server by
default. The example allows Paperclip 4 GB of memory, a limit chosen for this guide
rather than a Paperclip requirement. Use `docker stats` under real work, and resize
if agents are hitting the limit.

Use a server dedicated to agents, not the one running your production apps. See
[what the permissions don't protect](./paperclip-operations#what-the-permissions-don-t-protect).

## Start it with Docker Compose

Paperclip's quickstart Compose file builds from source and uses the embedded
database, while its VPS guide says embedded Postgres is for local use. This example
uses the published image at a pinned version, with a separate Postgres container:

<<< ../../examples/servers/paperclip/compose.yaml#paperclip{yaml}

<<< ../../examples/servers/paperclip/compose.yaml#db{yaml}

Generate the secrets once, next to `compose.yaml`:

```bash
umask 077
cat > .env <<EOF
PAPERCLIP_PUBLIC_URL=https://paperclip.your-tailnet.ts.net
POSTGRES_PASSWORD=$(openssl rand -hex 32)
BETTER_AUTH_SECRET=$(openssl rand -hex 32)
PAPERCLIP_AGENT_JWT_SECRET=$(openssl rand -hex 32)
PAPERCLIP_TOOL_ACTION_SIGNING_SECRET=$(openssl rand -hex 32)
PAPERCLIP_SECRETS_MASTER_KEY=$(openssl rand -hex 32)
EOF
```

Then start it:

```bash
docker compose up -d
curl -s 127.0.0.1:3100/api/health    # wait for "status":"ok"
```

- **Save `.env` somewhere safe, off the server.** The master key encrypts the secrets
  you store in Paperclip, and Paperclip's docs don't describe any way to recover
  them without it. Don't replace these values on a running instance.
- **The first start takes a little while.** Paperclip applies its database
  migrations, and health reports `"status":"starting"` until it's ready.
- **Expect a `database_backup_missing` warning** in the health response at first. It
  clears after the first backup. See [Backups](./paperclip-operations#backups).
- **There are no provider keys in this file.** You add them per agent in the
  dashboard, where they're stored as secrets. Strict mode rejects plaintext keys in
  agent settings.

## Reach it over Tailscale

The port only listens on `127.0.0.1`, so nothing can reach it until you put something
in front. Follow [Private Access with Tailscale](./paperclip-tailscale), which sets up
the tailnet policy, the HTTPS address and the firewall.

## Claim the instance straight away

A new private instance has no admin. **The first signed-in user who chooses
"Claim this instance" becomes the admin**, so anyone who can reach it first can take
it.

1. Open the URL, and create an account.
2. Choose **Claim this instance**.
3. Confirm `curl -s 127.0.0.1:3100/api/health` reports `"bootstrapStatus":"ready"`.

Do this before you share the network or add a public route.

## Public access over HTTPS

If you do need the internet to reach it, follow Paperclip's
[HTTPS guide](https://docs.paperclip.ing/reference/deploy/https/). Put Caddy in
front, and keep port 3100 private:

```text
paperclip.example.com {
    reverse_proxy 127.0.0.1:3100
}
```

Set `PAPERCLIP_EXPOSURE=public` and use the public URL for `PAPERCLIP_PUBLIC_URL`.
Open only ports 80 and 443 in [the firewall](../servers/terraform).

::: danger Public mode needs extra steps on this setup
Browser claiming is disabled in public mode, and Paperclip's docs point you to
`paperclipai auth bootstrap-ceo` to create the first admin. In this image, with
configuration from environment variables only, that command stops with
`No config found`.

Don't run `paperclipai onboard` to get past it. In testing, it wrote a `local_trusted`
`config.json` into the volume, and later CLI commands read that mode rather than the
environment. Work out the first-admin step on a disposable server, and check the
current docs, before relying on public mode.
:::

## Without Docker

On a server of your own, the npm package needs Node.js 24.11 or newer:

```bash
npx paperclipai@latest onboard --yes --bind tailnet
paperclipai service install --enable-linger
paperclipai service status
```

This runs as a systemd **user** service, using embedded Postgres and storing data in
`~/.paperclip`. `--enable-linger` keeps it running after you log out. For an agent to
use Claude Code or another tool, that tool must also be installed on the host.

Use a dedicated Linux user, because agents run as whichever user runs Paperclip and
can reach that user's files. See the
[installation reference](https://docs.paperclip.ing/reference/cli/installation/).

## Rules of thumb

- Keep it private, with port 3100 bound to loopback.
- Pin the image version rather than using `latest`.
- Claim the instance as soon as it's up.
- Keep `.env` off the server as well as on it.
- Give agents their own server.
