# Docker Setups

Coolify runs everything as containers, so the quality of your images and Compose
files directly affects security and reliability. These practices apply with or
without Coolify.

The files are in
[`examples/servers/docker`](https://github.com/jgteske/best-practices-repo/tree/main/examples/servers/docker).

## Small, non-root images

<<< ../../examples/servers/docker/Dockerfile{dockerfile}

- **Multi-stage builds** leave the compiler and source code behind. An attacker
  who gets in finds no shell or package manager to use.
- **A non-root user** limits the damage of a container escape or a compromised
  process. This base image's `nonroot` variant handles that.
- **Pinning by digest** means a base image can't change under you. Let Dependabot
  or Renovate open pull requests to update them.
- **Copying dependency files before source code** keeps the dependency layer
  cached when only the code changes.
- **A `.dockerignore` allowlist** stops `.env` files and `.git` from reaching the
  image by accident:

<<< ../../examples/servers/docker/.dockerignore{text}

## A production Compose file

<<< ../../examples/servers/docker/compose.yaml#app{yaml}

- **`${VAR:?message}`** stops with a clear error when a variable is missing,
  instead of starting with an empty password.
- **`read_only`, `cap_drop` and `no-new-privileges`** remove abilities most web
  services don't need. If your app writes temporary files, add a `tmpfs` mount for
  that path rather than dropping `read_only`.
- **Memory and CPU limits** stop one leaking container from taking down the server.
- **Log rotation** matters because the default `json-file` driver has no size limit
  unless the daemon sets one, and full disks take servers down. Coolify's installer
  sets a daemon default, so this mostly matters on hosts you set up yourself.
- **Never deploy `:latest`.** Use a tag you can trace to a commit.

## Databases, networks and health

<<< ../../examples/servers/docker/compose.yaml#db{yaml}

- **`internal: true`** gives the backend network no route out, and with no `ports:`
  the database can't be reached from the internet.
- **`depends_on` with `service_healthy`** waits until the database accepts
  connections. Without the condition, Compose waits only until it has started.
- **Healthchecks** should be cheap, and check that the service itself can respond.
  If they call the database too, a database blip can restart every app.

## Docker bypasses UFW

This is the most common way self-hosters expose a database by accident.

```yaml
# Anti-pattern: this is reachable from the internet, even if UFW denies port 5432.
services:
  db:
    ports:
      - "5432:5432"
```

Docker writes its own iptables rules for published ports, and that traffic doesn't
pass through UFW's rules. So `ufw deny 5432` can report success while the port
stays open.
[Coolify's firewall docs](https://coolify.io/docs/knowledge-base/server/firewall)
give the same warning and recommend the hosting provider's firewall. In order of
preference:

1. Don't publish the port. Containers can reach each other over a Docker network.
2. If you need access from the host, bind to loopback: `"127.0.0.1:5432:5432"`.
3. Enforce the rules in the [provider's firewall](./terraform#make-the-firewall-the-real-boundary).

Verify from a machine **outside** the server, because a test from the server
itself proves nothing:

```bash
nmap -Pn -p 1-65535 203.0.113.10
```

## Data: volumes and bind mounts

- **Named volumes** suit database data, because Docker manages their location and
  permissions.
- **Bind mounts** suit config files you edit on the host.
- **Containers are disposable, and volumes aren't.** `docker compose down -v` and
  `docker volume prune` can delete data, so never run them from habit.
- **A running database's files aren't a safe backup.** Use `pg_dump` or Coolify's
  scheduled backups.
- **Volumes aren't backups.** They sit on the same disk as everything else.

## Keeping the disk under control

Old images and build cache fill disks slowly, then all at once. Coolify has a
Docker cleanup setting for each server, so check that it's on. When doing it by hand:

```bash
docker system df             # see what's using the space
docker image prune           # dangling images only
docker builder prune         # build cache
```

## Rules of thumb

- Use multi-stage builds and non-root users, and pin base images by digest.
- Don't publish ports you don't need, and bind the rest to `127.0.0.1`.
- Give every long-running service a healthcheck, resource limits and log rotation.
- Scan images in CI, and rebuild regularly to pick up base image fixes.
- Don't mount `/var/run/docker.sock` into an app. It amounts to root on the host.
