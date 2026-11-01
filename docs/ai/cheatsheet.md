# AI Agents Cheat Sheet

One-line reminders, grouped by task. Follow the links for the full explanation.
Commands are for the Docker setup, run next to `compose.yaml`.

```bash
# The CLI inside the container
pc() { docker compose exec -u node paperclip pnpm --silent paperclipai "$@"; }
```

## Run it: [details](./paperclip-install)

```bash
docker compose up -d                      # start, or apply .env changes
curl -s 127.0.0.1:3100/api/health         # want "status":"ok", "bootstrapStatus":"ready"
docker compose logs -f paperclip          # follow the logs
docker compose stop paperclip             # emergency stop for all agents
ss -ltn | grep 3100                       # should show 127.0.0.1 only
```

Careful: `docker compose down -v` deletes the database and all agent files.

## Tailscale: [details](./paperclip-tailscale)

```bash
sudo tailscale up --auth-key="$TS_AUTH_KEY" --hostname=paperclip
sudo tailscale serve --bg 3100            # HTTPS on the tailnet, survives reboots
tailscale serve status
sudo tailscale serve reset                # remove the route
nmap -Pn -p 22,80,443,3100 <public-ip>    # from OUTSIDE the tailnet: want nothing open
```

Use `serve`, not `funnel`. Tag the server, and never use the tag as a grant's `src`.

## Agents: [details](./paperclip-operations#stopping-an-agent)

```bash
pc agent list --company-id "$COMPANY_ID"
pc agent pause <agent-id>
pc agent resume <agent-id>
pc agent wake <agent-id> --reason "Pick up the new spec"
pc agent terminate <agent-id>             # permanent
```

## Costs: [details](./paperclip-operations#budgets)

```bash
pc cost summary --company-id "$COMPANY_ID"
pc budget overview --company-id "$COMPANY_ID"

# Amounts are in cents: this is $25 a month
curl -X PATCH "$PAPERCLIP_API_URL/api/agents/$AGENT_ID/budgets" \
  -H "Authorization: Bearer $PAPERCLIP_API_KEY" \
  -H "Content-Type: application/json" -d '{ "budgetMonthlyCents": 2500 }'
```

## Backups: [details](./paperclip-operations#backups)

```bash
pc db:backup                              # database only
docker compose exec -T paperclip tar -C /paperclip -czf - instances \
  > "paperclip-$(date +%F).tar.gz"        # agent files, uploads, backups
```

Also keep `.env` off the server, because it holds the master key.

## New company checklist: [details](./paperclip-agents#before-the-first-run)

| Step | Why |
| --- | --- |
| Set company and agent budgets | Agents have no limit by default |
| Set `requireBoardApprovalForNewAgents` to `true` | It's off by default |
| Leave "Heartbeat on interval" off | Timers cost money with nothing to do |
| Use isolated workspaces for code | Edits stay on their own branch |
| Set a limit at your provider | Paperclip's budgets miss some usage |

## Don't

| Don't | Because |
| --- | --- |
| Run `local_trusted` on a server | There's no login |
| Publish port 3100 beyond loopback | Docker's published ports bypass UFW |
| Run `paperclipai onboard` in the container | It writes a `local_trusted` config |
| Leave a new instance unclaimed | The first user to claim it becomes admin |
| Mount the Docker socket | It's effectively root on the host |
| Give agents production credentials | Budgets and roles don't contain a compromised agent |
