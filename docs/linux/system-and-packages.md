# System, Packages & Services

## Knowing what you are on

```bash
cat /etc/os-release        # distribution and version - the portable answer
uname -a                   # kernel, architecture, hostname
hostnamectl                # hostname, OS, kernel, virtualisation, machine ID
uptime                     # how long up, and the load averages
lscpu                      # cores, threads, model, cache
lsblk                      # block devices and mount points
free -h                    # memory and swap
nproc                      # CPU count - the number to compare load against
```

Scripts that must branch per distribution should read `ID` and `VERSION_ID`
from `/etc/os-release`, never parse `uname` or guess from a file's existence.

## Package management

| Task | Debian/Ubuntu (`apt`) | Fedora/RHEL (`dnf`) | Arch (`pacman`) |
| --- | --- | --- | --- |
| Refresh metadata | `sudo apt update` | (automatic) | `sudo pacman -Sy` |
| Upgrade everything | `sudo apt upgrade` | `sudo dnf upgrade` | `sudo pacman -Syu` |
| Install | `sudo apt install pkg` | `sudo dnf install pkg` | `sudo pacman -S pkg` |
| Remove | `sudo apt remove pkg` | `sudo dnf remove pkg` | `sudo pacman -R pkg` |
| Remove + config | `sudo apt purge pkg` | - | `sudo pacman -Rns pkg` |
| Search | `apt search term` | `dnf search term` | `pacman -Ss term` |
| Show details | `apt show pkg` | `dnf info pkg` | `pacman -Si pkg` |
| Is it installed? | `dpkg -l pkg` | `rpm -q pkg` | `pacman -Q pkg` |
| Which package owns a file? | `dpkg -S /usr/bin/ls` | `rpm -qf /usr/bin/ls` | `pacman -Qo /usr/bin/ls` |
| What files does it install? | `dpkg -L pkg` | `rpm -ql pkg` | `pacman -Ql pkg` |
| Clean up orphans | `sudo apt autoremove` | `sudo dnf autoremove` | `pacman -Qtdq \| pacman -Rns -` |

::: warning `apt update` ≠ `apt upgrade`
`update` only refreshes the package lists; `upgrade` installs. On Debian-family
systems you always need both, in that order. (`apt` is the friendly interactive
front end; use `apt-get` in scripts, where its stable output and flags matter.)
:::

Cross-distribution formats live alongside these: `flatpak`, `snap`, and
`AppImage` for desktop apps; language managers (`npm`, `pip`, `cargo`) for
libraries. Prefer the distribution package for anything the system itself
depends on.

## Services with systemd

`systemd` is PID 1 on every mainstream distribution: it starts services, keeps
them running, and collects their logs.

```bash
systemctl status nginx           # state, PID, memory, and the last log lines
systemctl start|stop|restart nginx
systemctl reload nginx           # re-read config without dropping connections, if supported
systemctl enable nginx           # start at boot
systemctl enable --now nginx     # enable AND start in one step
systemctl disable nginx
systemctl is-active nginx        # scriptable: exit status says it all
systemctl list-units --type=service --state=running
systemctl list-unit-files --state=enabled
systemctl daemon-reload          # required after editing any unit file
systemctl --failed               # what is broken right now
```

`enable` and `start` are independent: `start` affects now, `enable` affects the
next boot. Forgetting `enable` is why a service "disappears" after a reboot.

### Writing a unit

```ini
# /etc/systemd/system/myapp.service
[Unit]
Description=My application
After=network-online.target

[Service]
Type=simple
User=myapp
WorkingDirectory=/srv/myapp
ExecStart=/srv/myapp/bin/server --port 8080
Restart=on-failure
RestartSec=5
LimitNOFILE=8192
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

Then `sudo systemctl daemon-reload && sudo systemctl enable --now myapp`. Use
`systemctl edit myapp` to add overrides without touching a vendor-provided file,
and `systemd-analyze verify` to validate one before enabling it.

::: tip Timers instead of cron
A `.timer` unit gets you logging, dependency ordering, `Persistent=true` for
missed runs, and randomised delays. `systemctl list-timers` shows the schedule.
`cron` is still fine and simpler - `crontab -e`, five fields
(`min hour dom mon dow`), and remember that cron runs with a nearly empty
environment and no `PATH` you can rely on: use absolute paths in cron jobs.
:::

## Logs

```bash
journalctl -u nginx                # everything from one unit
journalctl -u nginx -f             # follow, like tail -f
journalctl -u nginx --since "1 hour ago" --until "10 min ago"
journalctl -p err -b               # priority error and worse, this boot only
journalctl -b -1                   # the previous boot - the one that crashed
journalctl -k                      # kernel messages (same as dmesg)
journalctl -n 100 --no-pager       # last 100 lines, scriptable
journalctl --disk-usage            # how much the journal is consuming
journalctl --vacuum-time=7d        # trim it
```

Traditional files still exist for services that write their own:
`/var/log/syslog` or `/var/log/messages`, `/var/log/auth.log`, and application
directories. `logrotate` (`/etc/logrotate.d/`) is what keeps them from filling
the disk - a service that keeps writing to a rotated file needs a `SIGHUP` or a
`copytruncate` rule.

## The filesystem layout

| Path | Contains |
| --- | --- |
| `/etc` | system-wide configuration (text files, version-controllable) |
| `/var` | data that changes: `/var/log`, `/var/lib` (service state), `/var/cache` |
| `/tmp` | temporary, world-writable, cleared on reboot; `/var/tmp` survives reboots |
| `/home` | user home directories |
| `/usr/bin`, `/usr/lib` | distribution-managed programs and libraries |
| `/usr/local` | software **you** installed outside the package manager |
| `/opt` | self-contained third-party packages |
| `/srv` | data served by this machine (web roots, repos) |
| `/proc`, `/sys` | kernel interfaces exposed as files - not real files on disk |
| `/dev` | device nodes (`/dev/null`, `/dev/urandom`, `/dev/sda`) |
| `/boot` | kernel, initramfs, bootloader |
| `/run` | runtime state since boot: PIDs, sockets (tmpfs) |

The rule of thumb: **your** software goes in `/usr/local` or `/opt`, its
configuration in `/etc`, its state in `/var/lib`, and nothing you write goes in
`/usr/bin`.

## Users and scheduled work

```bash
sudo adduser alice                  # interactive, sets up the home directory
sudo usermod -aG sudo alice         # grant admin rights (group name is wheel on RHEL)
sudo passwd alice                   # set/reset a password
sudo deluser --remove-home alice
getent passwd alice                 # the authoritative lookup (also covers LDAP)
last / lastlog                      # login history
w / who                             # who is logged in right now
```

```bash
crontab -e                          # your own scheduled jobs
crontab -l                          # list them
sudo crontab -e -u www-data         # someone else's
# ┌─ min ┌─ hour ┌─ day-of-month ┌─ month ┌─ day-of-week
# │      │       │               │        │
  0      3       *               *        1   /usr/local/bin/backup.sh >> /var/log/backup.log 2>&1
```

Always redirect a cron job's output somewhere: whatever it prints is emailed
(and usually silently dropped), so an unredirected error is invisible.

## Summary

- Identify the system from `/etc/os-release`, not guesswork.
- `apt`/`dnf`/`pacman` do the same jobs with different verbs - and `apt update`
  only refreshes lists.
- `systemctl enable --now` is start + start-at-boot; `daemon-reload` after every
  unit edit; `journalctl -u NAME -f` is where the logs are.
- Write services as units with `Restart=on-failure` and a dedicated `User=`.
- Know the tree: config in `/etc`, state in `/var/lib`, your software in
  `/usr/local` or `/opt`.
- Cron jobs need **absolute paths** and explicit output redirection.
