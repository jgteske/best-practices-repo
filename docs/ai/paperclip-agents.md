# Working with Agents

Paperclip's day-to-day work happens in the dashboard. You set a goal, approve a plan,
and review the results. Labels here are from v2026.1023.0, and the
[getting started guide](https://docs.paperclip.ing/guides/getting-started/five-minute-path/)
has the current walkthrough.

## Before the first run

1. **Create a company** and give it a specific goal. Agents plan from this text, so
   "Ship a working invoice export by March" gets better results than "Grow the
   business".
2. **Set a budget before any agent runs.** Setup doesn't create one, so a new agent
   has no limit. See [Budgets](./paperclip-operations#budgets).
3. **Turn on hire approval.** New companies in this version don't require it, so
   agents can add agents without asking you. See
   [Require approval for new agents](./paperclip-operations#require-approval-for-new-agents).

## Add your first agent

1. Go to **Agents**, then **New Agent**. The first agent is always the CEO.
2. Name it, click **Choose adapter**, then pick one and click **Configure agent**.
3. Connect the provider by signing in or entering an API key.
4. Choose a model. Use a stronger one for planning roles and a cheaper one for routine
   work.
5. Click **Run test** and wait for **Connection successful**.
6. Click **Finish setup**. The agent shows as `idle`.

### Choosing an adapter

| Adapter | Type | Notes |
| --- | --- | --- |
| Claude Code | `claude_local` | Recommended by Paperclip. Included in the Docker image |
| Codex | `codex_local` | Recommended by Paperclip. Included in the Docker image |
| Gemini CLI, OpenCode | `gemini_local`, `opencode_local` | Included in the Docker image |
| Cursor, Pi, Hermes, Grok, Kimi | `cursor`, `pi_local`, ... | Available, but not in the list of tools the Docker docs say are pre-installed |
| Process, HTTP | `process`, `http` | Your own command or endpoint. Set through the API for now |

See the [adapter overview](https://docs.paperclip.ing/reference/adapters/overview/).

### API key or subscription

Prefer an **API key** on a server. Subscription runs don't count against Paperclip's
budgets, so its spending limits won't cap them.

## From goal to tasks

1. The CEO reads the goal and submits a **strategy** for approval.
2. Review it under approvals. Check that it addresses the goal and that the tasks are
   specific, then **Approve** or **Request revision** with a comment saying what to
   change.
3. The CEO creates tasks and moves them across the board.

You can also create a task yourself and assign it to an agent, which wakes that agent.
A good task has one outcome and a clear way to tell it's done.

## Give agents instructions

Each agent has a folder of instruction files, loaded on each run:

| File | Purpose |
| --- | --- |
| `AGENTS.md` | The entry file. Required, and it should point to the others |
| `SOUL.md` | Persona and tone |
| `HEARTBEAT.md` | The checklist to follow on each wake-up |
| `TOOLS.md` | Notes on available tools |

Treat these like code. Edits apply on the next run, so use **Run now** to test one
straight away. Each configuration save creates an entry under **Revisions**, which
you can restore.

## Decide when agents wake

Agents wake on a timer, when assigned a task or when a comment arrives on an open one,
on demand, or from a routine. Only the timer wakes an agent with nothing new to do, and each wake-up
can cost money.

**Leave "Heartbeat on interval" off and "Wake on demand" on**, which is also
[Paperclip's recommendation](https://docs.paperclip.ing/guides/projects-workflow/routines/).
If a role really needs a timer, use minutes or hours rather than seconds.

Set these under **Run Policy** on the agent's **Harness / Runtime** page:

- **Timeout** stops a stuck run.
- **Cooldown** sets a minimum gap between runs.
- **Max concurrent runs** limits how much the agent does at once.

### Recurring work

Use a **routine** for anything with a schedule, such as a nightly report. A routine
creates a task when its cron or webhook trigger fires.

- **Concurrency:** the default combines overlapping ticks into one queued follow-up.
- **Catch-up:** the default skips ticks missed during downtime, which avoids a burst
  of paid runs after an outage.

## Keep work separate

Pick a workspace for each kind of task:

| Workspace | Behavior | Use it for |
| --- | --- | --- |
| Isolated | A new git worktree and branch | Code changes. The default choice |
| Reuse existing | Shares a workspace and its services | Follow-up work on the same branch |
| Project primary | The main checkout | Rarely, because edits change the shared copy directly |

- **Merge before archiving.** Archiving a workspace deletes unmerged and uncommitted
  work.
- **Expect port conflicts.** Two worktrees running the same dev server compete for
  one port.
- **Review what agents produce.** Protect your main branch so their work goes through
  a [pull request](../git/remotes-and-prs) and CI.

## Add agents gradually

Agents can propose hires, and managers can break down work for reports. Start with a
CEO and one worker, and add a role only when you can name the work it would take over.
Each agent adds cost, and more agents make it harder to follow what's going on.

## Rules of thumb

- Set the budget and hire approval before the first run.
- Use event-driven wake-ups, not timers.
- Start small, and read the first few runs closely.
- Use isolated workspaces for code.
- Review agent output the way you'd review a new colleague's.
