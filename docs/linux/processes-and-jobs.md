# Processes, Jobs & Signals

## Seeing what is running

```bash
ps aux                  # every process on the system (BSD-style flags)
ps -ef                  # the same, POSIX style
ps -eo pid,ppid,user,%cpu,%mem,etime,cmd --sort=-%cpu | head
ps -p 1234 -o cmd=      # the full command line of one PID
pgrep -af nginx         # PIDs (and command lines) matching a name
pstree -p               # the parent/child tree
```

`ps aux` columns worth reading: `PID`, `%CPU`, `%MEM`, `RSS` (resident memory in
KB - the number that matters), `STAT`, `START`, `TIME` (cumulative CPU, not wall
clock), `COMMAND`.

`STAT` explains a lot on its own:

| Code | Meaning |
| --- | --- |
| `R` | running or runnable |
| `S` | sleeping, interruptible (waiting on I/O or an event - the normal idle state) |
| `D` | **uninterruptible** sleep, usually blocked on disk or NFS; cannot be killed |
| `Z` | zombie - finished, waiting for its parent to reap it |
| `T` | stopped (suspended with <kbd>Ctrl</kbd>+<kbd>Z</kbd>) |
| `<` / `N` | high / low priority; `s` session leader; `+` in the foreground |

### Live views

| Tool | Notes |
| --- | --- |
| `top` | everywhere. `P` sort by CPU, `M` by memory, `k` kill, `1` per-core, `u` filter by user |
| `htop` | the one to install: colours, tree view (`F5`), scrolling, mouse |
| `btop` / `glances` | richer dashboards |
| `iotop` | which process is hitting the disk |
| `watch -n2 'cmd'` | rerun any command every 2s - a poor man's live view |

Load average (`uptime`, top's first line) is the 1/5/15-minute count of
runnable **plus** uninterruptible tasks. Compare it to your core count
(`nproc`): 4.0 on 4 cores is fully busy, not overloaded. Persistent load with
low CPU usually means I/O wait.

## Signals

Killing a process means sending it a signal - a request, not a hardware stop.

| Signal | Number | Default effect | Use it for |
| --- | --- | --- | --- |
| `SIGTERM` | 15 | terminate, **catchable** | the polite default: let it flush and exit |
| `SIGINT` | 2 | terminate | what <kbd>Ctrl</kbd>+<kbd>C</kbd> sends |
| `SIGHUP` | 1 | terminate | historically "terminal closed"; many daemons reload config instead |
| `SIGKILL` | 9 | **uncatchable** kill | last resort: no cleanup, no flush, temp files left behind |
| `SIGSTOP` / `SIGCONT` | 19 / 18 | suspend / resume | pause a runaway job without losing it |
| `SIGUSR1` / `SIGUSR2` | 10 / 12 | app-defined | e.g. `nginx -s reopen`-style log reopening |

```bash
kill 1234                  # SIGTERM
kill -TERM 1234            # explicit, same thing
kill -9 1234               # SIGKILL - only after TERM has failed
kill -HUP $(pgrep nginx)   # reload configuration
pkill -f 'python worker'   # by command-line pattern (-f matches the full line)
killall firefox            # by exact process name
timeout 30 cmd             # send TERM after 30s (-k 5 adds a KILL 5s later)
```

::: warning `kill -9` is not "kill harder", it is "kill worse"
SIGKILL gives the process no chance to close files, release locks, or finish a
write - which is how you get corrupt databases and stale lockfiles. Always try
SIGTERM first, wait a few seconds, then escalate. A process stuck in `D` state
will ignore SIGKILL too, because it is blocked in the kernel.
:::

## Jobs: foreground and background

Job control belongs to your shell, and only covers processes it started.

```bash
long-running-command &      # start in the background
jobs -l                     # list this shell's jobs with PIDs
fg %1                       # bring job 1 to the foreground
bg %1                       # resume a suspended job in the background
kill %1                     # signal a job by job number
wait                        # block until all background jobs finish
wait -n                     # ...until the next one finishes (bash 4.3+)
```

<kbd>Ctrl</kbd>+<kbd>Z</kbd> suspends the foreground job (SIGTSTP) and hands you
the prompt back - `fg` resumes it. It is the fastest way to "pause vim, run one
command, go back".

### Surviving a disconnect

A background job still dies when its terminal closes, because it receives
SIGHUP.

| Approach | When |
| --- | --- |
| `nohup cmd &` | one-shot, output goes to `nohup.out` |
| `setsid cmd` | fully detach into a new session |
| `disown -h %1` | you already started it and only now realise |
| `tmux` / `screen` | **the real answer for interactive work**: detach with <kbd>Ctrl</kbd>+<kbd>B</kbd> <kbd>D</kbd>, reattach with `tmux attach` |
| a systemd unit | the real answer for anything that should keep running |

```bash
nohup ./import.sh > import.log 2>&1 &
echo $!                     # the PID of the last background job - save it
```

## Inspecting a single process

```bash
lsof -p 1234                 # every file, socket, and device it has open
lsof -i :8080                # which process holds port 8080
ls -l /proc/1234/fd          # the same, no extra tools required
cat /proc/1234/status        # memory, threads, parent, state
strace -p 1234 -f            # trace system calls live (slow; needs privileges)
pmap -x 1234                 # memory map with sizes
```

`/proc/PID/` is the whole story: `cmdline`, `environ`, `cwd`, `limits`, `fd/`.
Everything `ps` prints is read from there.

## Resource limits and priority

```bash
ulimit -a                    # this shell's limits (open files, stack, processes)
ulimit -n 4096               # raise the open-file limit for this shell
nice -n 10 cmd               # start with lower priority (-20 highest … 19 lowest)
renice -n 5 -p 1234          # change a running process's priority
taskset -c 0,1 cmd           # pin to specific CPUs
```

Only root can raise a hard limit or set a negative `nice`. For services, set
limits in the systemd unit (`LimitNOFILE=`) rather than in a wrapper script.

## Summary

- `ps aux` / `pgrep` to find, `htop` to watch, `/proc/PID/` for the truth about
  one process.
- `STAT` codes: `D` means blocked in the kernel, `Z` means the parent isn't
  reaping - neither is fixed by `kill -9`.
- **SIGTERM first, SIGKILL last.** `kill -HUP` often means "reload config".
- `&`, <kbd>Ctrl</kbd>+<kbd>Z</kbd>, `jobs`, `fg`/`bg` for shell job control;
  `tmux` or a systemd unit for anything that must outlive the terminal.
- `lsof -i :PORT` answers "what is using this port"; `lsof -p` answers "what is
  this process holding open".
