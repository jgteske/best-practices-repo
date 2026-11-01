# Managing Agents

Once agents are running, the job is keeping costs, access and data under control.
For the server underneath, see [Day-to-Day Operations](../servers/operations).

## Running the CLI in Docker

The image has no `paperclipai` command on its path, so run it through `pnpm` as the
`node` user:

```bash
pc() { docker compose exec -u node paperclip pnpm --silent paperclipai "$@"; }
pc db:backup
```

Other examples on this page use the API, with a key from **Governance > API Keys**:

```bash
export PAPERCLIP_API_URL=https://paperclip.your-tailnet.ts.net
export PAPERCLIP_API_KEY=...    # shown once
export COMPANY_ID=...
```

## Budgets

**A new agent has no spending limit.** Setup doesn't create one, so set it through
the [API or CLI](https://docs.paperclip.ing/how-to/set-monthly-budget/). Amounts are
in **cents**:

```bash
# $100 a month for the whole company
curl -X PATCH "$PAPERCLIP_API_URL/api/companies/$COMPANY_ID/budgets" \
  -H "Authorization: Bearer $PAPERCLIP_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{ "budgetMonthlyCents": 10000 }'

# $25 a month for one agent
curl -X PATCH "$PAPERCLIP_API_URL/api/agents/$AGENT_ID/budgets" \
  -H "Authorization: Bearer $PAPERCLIP_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{ "budgetMonthlyCents": 2500 }'
```

Set both. The company limit is the overall ceiling, and per-agent limits stop one
agent from using all of it.

| Point | What happens |
| --- | --- |
| 80% | A warning is recorded. The agent keeps running |
| 100% | The agent is paused, and its tasks stay assigned to it |
| 1st of the month (UTC) | Spending resets, and agents paused only by budget restart automatically |

To continue after a hard stop, use **Raise budget & resume** under **Audit > Budgets**.
To stop an agent restarting at the new month, pause it by hand first.

### What budgets don't catch

Paperclip's budget is a second line of defense, not a replacement for limits at your
provider.

- **Subscription runs** have no per-call charge, so they don't count.
- **Unpriced usage** has an unknown cost, which includes OpenAI-compatible endpoints
  other than OpenAI and OpenRouter. By default, this holds new work until it's
  resolved.
- **Cursor and native Grok** don't report authoritative per-run costs.
- **Costs are estimates** until invoices are imported, so they can differ from your
  bill.

**Set a spending limit in your provider's console as well**, and give Paperclip its
own API key.

## Require approval for new agents

The [approvals docs](https://docs.paperclip.ing/guides/day-to-day/approvals/) describe
hires going through the approval queue, but in v2026.1023.0 a new company had
`requireBoardApprovalForNewAgents` set to `false`. Turn it on, and check that the
response shows `true`:

```bash
curl -X PATCH "$PAPERCLIP_API_URL/api/companies/$COMPANY_ID" \
  -H "Authorization: Bearer $PAPERCLIP_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{ "requireBoardApprovalForNewAgents": true }'
```

Check the budget and adapter settings on each hire request, not just the role.

## Stopping an agent

| Action | Effect | Use it when |
| --- | --- | --- |
| Turn off **Heartbeat on interval** | Stops timer wake-ups only | Reducing routine cost |
| **Pause** | Stops all wake-ups and keeps history | Something looks wrong |
| **Terminate** | Permanent | The role is finished |

```bash
pc agent list --company-id "$COMPANY_ID"
pc agent pause <agent-id>
pc agent resume <agent-id>
```

**In an emergency, stop the container** with `docker compose stop paperclip`. Then
revoke the provider keys it held, since a paused agent has already had access to them.

## What the permissions don't protect

Paperclip's budgets, approvals and roles control well-behaved agents. On this setup
**they aren't a security boundary against an agent that's been compromised**, for
example through a prompt injection hidden in a web page, ticket or dependency.

With local adapters, agents run inside the Paperclip container, as the same user as
the server. So plan as if an agent can reach whatever the server can, including its
configuration and database. The takeaways:

- **Any agent can potentially reach what every agent can reach.** Don't count on one
  company or agent's secrets being hidden from another on the same instance.
- **Use a separate instance for each trust level.** Keep work that reads untrusted
  input away from work holding valuable credentials.
- **Give agents narrow credentials.** Use scoped tokens with short lifetimes, and
  never production database or cloud admin keys.
- **Don't mount the Docker socket.** It's effectively root on the host.
- **Limit what the server can reach.** Keep agents away from private services they
  don't need with [the firewall](../servers/terraform) and Docker networks.
- **Require review for anything that leaves.** Use branch protection, so agent changes
  can't reach production on their own.

Paperclip has further controls, which help but don't remove the risk:

- [`low_trust_review`](https://github.com/paperclipai/paperclip/blob/master/doc/LOW-TRUST-PRESETS.md)
  limits what an agent can do through the Paperclip API, not what its process can
  reach on the machine.
- [Prompt injection checks](https://github.com/paperclipai/paperclip/blob/master/doc/prompt-injection-prevention.md)
  scan tool results, but Paperclip says they can't catch every attack, and they can't
  undo a write that's already happened.
- [Sandbox providers](https://docs.paperclip.ing/reference/adapters/sandbox-providers/)
  run agents outside the server container. This is the direction to look at if you
  need real isolation, though it wasn't tested for this guide.

## Secrets

- **Store provider keys as Paperclip secrets**, not plain environment values. The
  example sets `PAPERCLIP_SECRETS_STRICT_MODE=true`, which rejects plaintext values
  for keys named `*_API_KEY`, `*_TOKEN` or `*_SECRET` in agent settings.
- **Rotate API keys by overlapping them:** create the new key, switch to it, then
  revoke the old one. Revoking can't be undone.
- **Remember that a secret given to an agent can be read by that agent.** Encrypted
  storage protects it at rest, not from the run that receives it.

## Backups

Paperclip backs up its database on its own. In the test it reported every 60 minutes,
keeping 7 days, in `/paperclip/instances/default/data/backups`. **That's on the same
server, so it won't survive losing the server.** Copy it elsewhere following
[the backup advice for servers](../servers/operations#backups).

| What | Where | In a database backup? |
| --- | --- | --- |
| Companies, agents, tasks, costs | Postgres | Yes |
| Agent instruction files | `paperclip-data` volume, under `companies/` | **No** |
| Uploads and workspaces | `paperclip-data` volume | **No** |
| Master key and other secrets | `.env`, and `secrets/` in the volume | **No** |

You need all of them. Without the master key, the encrypted values in a restored
database are unusable.

```bash
# Take a backup now
pc db:backup

# Copy everything off the server's volume
docker compose exec -T paperclip tar -C /paperclip -czf - instances \
  > "paperclip-$(date +%F).tar.gz"
```

### Restore drill

A backup you've never restored is unverified. Backups are gzipped SQL, so you can
restore one into an empty database, then compare it:

```bash
docker compose exec -T db createdb -U paperclip restore_test
gunzip -c paperclip-20261101-084102.sql.gz \
  | docker compose exec -T db psql -U paperclip -d restore_test -v ON_ERROR_STOP=1 -q
docker compose exec -T db psql -U paperclip -d restore_test \
  -Atc "select count(*) from information_schema.tables where table_schema='public'"
docker compose exec -T db dropdb -U paperclip restore_test
```

For a real recovery, try it on a disposable server: restore the database and the
volume, set the same `.env`, then start Paperclip and check an agent.

### Company exports are different

[Company exports](https://docs.paperclip.ing/how-to/back-up-and-restore-a-company/)
move a company's setup to another instance. They leave out secrets, approvals, costs
and activity, and importing creates new agent identities. Use them for templates and
moves, and a database restore for recovering an instance.

## Updating

Paperclip releases often, and each release can include database migrations.

1. Read the [release notes](https://github.com/paperclipai/paperclip/releases).
2. Take a backup with `pc db:backup`, and copy it off the server.
3. Change `PAPERCLIP_TAG` in `.env` to the new version.
4. Run `docker compose up -d`, and check `/api/health`.

**Migrations run automatically at startup, and going back to the old image doesn't undo
them.** To roll back, restore the backup taken before the update along with the old
version. Paperclip's [update guide](https://docs.paperclip.ing/how-to/update-paperclip/)
also warns that crossing v2026.1012.0 in either direction needs every old process
stopped first, not a hot restart.

Installs using npm have their own commands: `paperclipai update` and
`paperclipai update --rollback`.

## When something's wrong

| Symptom | Check |
| --- | --- |
| Won't start | `docker compose logs paperclip --tail 100` |
| Agent is `paused` | **Audit > Budgets** for a budget incident |
| Agent is `error` | The run's log on the agent page, then **Clear error** |
| Agent never wakes | Is **Wake on demand** on, and is it assigned the task? |
| Costs are climbing | Timers, routine schedules and retry loops, then `pc cost summary --company-id "$COMPANY_ID"` |
| Login or hostname errors | `PAPERCLIP_PUBLIC_URL` and `PAPERCLIP_ALLOWED_HOSTNAMES` |
| Data has disappeared | Is the volume still attached, and is `DATABASE_URL` the one you expect? |
| Server is struggling | `docker stats`, and how many runs are happening at once |

`paperclipai doctor` is the usual diagnostic, but in this Docker setup it stops with
`Config file not found`, because configuration comes from the environment. Don't run
`onboard` to fix that, because it
[writes a `local_trusted` config](./paperclip-install#public-access-over-https). Use
the health endpoint and logs instead.

## Weekly habits

- Look over spending per agent, and against your provider's bill.
- Clear pending approvals, and read a sample of finished runs.
- Pause agents that aren't producing anything useful.
- Check that recent backups made it off the server.

## Rules of thumb

- Set limits in Paperclip and at the provider.
- Treat everything in the container as readable by any agent.
- Run a separate instance for each trust level.
- Back up the database, the volume and the master key.
- Back up before each update, because rollbacks don't undo migrations.
