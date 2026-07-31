# Command Cheat Sheet

One-line reminders, grouped by the question you are trying to answer. Each
section links to the page with the full explanation.

## Navigating — [details](./shell-basics)

```bash
pwd                      # where am I
cd -                     # back to the previous directory
ls -lahtr                # long, hidden, human sizes, oldest first
type -a cmd              # binary, builtin, function, or alias?
which -a cmd             # every match on PATH
man 5 crontab            # a specific manual section
history | grep ssh       # what did I run before
!!  /  !$                # last command / last argument
```

## Files — [details](./files-and-directories)

```bash
cp -a src dst            # copy preserving everything
mkdir -p a/b/c           # create the whole path
ln -s target link        # symlink
rm -rf -- "$dir"         # delete (the -- protects against leading dashes)
find . -name '*.log' -mtime +7 -delete
find . -type f -print0 | xargs -0 -r -P4 gzip
tar -czf out.tar.gz dir/ ; tar -tzf out.tar.gz ; tar -xzf out.tar.gz -C /dest
du -h --max-depth=1 . | sort -h
df -h ; df -i            # space ; inodes
realpath file ; basename path .ext ; dirname path
```

## Text — [details](./text-processing)

```bash
grep -rn --include='*.ts' 'pattern' .
grep -c / -v / -w / -F / -E / -C 3      # count, invert, word, literal, regex, context
sed -E 's/old/new/g' file               # substitute (add -i.bak to edit in place)
sed -n '10,20p' file                    # print a line range
awk '{print $2}' file                   # a column
awk -F: '$3 >= 1000 {print $1}' /etc/passwd
sort | uniq -c | sort -rn | head        # top N by frequency
cut -d, -f2,5 file ; tr -d '\r' < file ; wc -l file
jq -r '.items[] | .id' data.json
tail -f app.log | grep --line-buffered ERROR
```

## Streams — [details](./pipes-and-redirection)

```bash
cmd > out 2>&1           # both streams to a file (this order)
cmd 2>/dev/null          # drop errors only
: > file                 # truncate without deleting
cmd | tee -a log         # save and keep piping
echo x | sudo tee /etc/f # write to a root-owned file
cmd1 | cmd2 ; echo "${PIPESTATUS[@]}"
diff <(sort a) <(sort b) # process substitution
while read -r l; do :; done < <(find .)   # loop without a subshell
cat <<'EOF' > f          # literal heredoc (no expansion)
```

## Permissions — [details](./permissions-and-ownership)

```bash
chmod 644 file ; chmod 755 dir ; chmod 600 secret
chmod -R u+rwX,go+rX site/        # recursive done right
chown -R user:group path
umask 022                          # → 644 files, 755 dirs
usermod -aG docker alice           # never forget the -a
sudo -l                            # what may I run
visudo -f /etc/sudoers.d/deploy
find / -perm -4000 -type f 2>/dev/null   # setuid audit
```

## Processes — [details](./processes-and-jobs)

```bash
ps -eo pid,%cpu,%mem,etime,cmd --sort=-%cpu | head
pgrep -af nginx ; pstree -p
kill PID ; kill -TERM PID ; kill -9 PID   # polite → last resort
pkill -f 'python worker' ; timeout 30 cmd
htop ; watch -n2 'ss -tan | wc -l'
cmd &  ;  jobs -l  ;  fg %1  ;  bg %1  ;  disown -h %1
nohup cmd > out.log 2>&1 &  ;  echo $!
lsof -i :8080 ; lsof -p PID ; ls -l /proc/PID/fd
```

## System — [details](./system-and-packages)

```bash
cat /etc/os-release ; uname -a ; uptime ; free -h ; lsblk ; nproc
sudo apt update && sudo apt install pkg      # dnf install / pacman -S
dpkg -S /usr/bin/ls                          # rpm -qf / pacman -Qo
systemctl status|start|stop|restart|reload NAME
systemctl enable --now NAME ; systemctl daemon-reload ; systemctl --failed
journalctl -u NAME -f ; journalctl -p err -b ; journalctl --since "1 hour ago"
crontab -e ; crontab -l                      # absolute paths, redirect output
```

## Network — [details](./networking-and-remote)

```bash
ip -br a ; ip r get 1.1.1.1 ; ss -tulpn
dig +short host ; dig @1.1.1.1 host ; mtr host
nc -vz host 443
curl -fsS url ; curl -v url ; curl -o f -L url
ssh -v user@host ; ssh -t host 'sudo systemctl restart app'
ssh-keygen -t ed25519 ; ssh-copy-id user@host
ssh -L 5432:localhost:5432 prod              # local port forward
rsync -avz --dry-run --delete src/ host:/dst/
scp file host:/tmp/
```

## Scripting — [details](./scripting-basics) · [robustness](./scripting-robustness)

```bash
#!/usr/bin/env bash
set -euo pipefail; IFS=$'\n\t'

"${VAR:-default}" "${VAR:?required}" "${VAR##*/}" "${VAR%.ext}" "${#VAR}"
[[ -f "$f" && -r "$f" ]] ; [[ "$s" =~ ^re$ ]] ; (( n > 5 ))
for f in *.log; do [[ -e "$f" ]] || continue; done
while IFS= read -r line; do :; done < file
args=(--flag "value"); cmd "${args[@]}"
mapfile -t items < <(cmd)
while getopts ":vo:" opt; do case "$opt" in ...; esac; done; shift $((OPTIND-1))
tmp="$(mktemp -d)"; trap 'rm -rf -- "$tmp"' EXIT
log() { printf '%s %s\n' "$(date +%F\ %T)" "$*" >&2; }
bash -n script.sh ; bash -x script.sh ; shellcheck script.sh
```

## Emergency handbook

| Situation | First command |
| --- | --- |
| Disk full | `df -h` then `du -h --max-depth=1 / \| sort -h`; check `df -i` and `lsof +L1` |
| Out of memory | `free -h`, `ps -eo pid,%mem,cmd --sort=-%mem \| head`, `journalctl -k \| grep -i oom` |
| Load is high | `uptime` vs `nproc`, `htop`, `iotop` - high load with idle CPU means I/O wait |
| Service won't start | `systemctl status NAME` then `journalctl -u NAME -n 50` |
| Port already in use | `ss -tulpn \| grep :PORT` or `lsof -i :PORT` |
| Can't connect | `ping` → `dig` → `ss -tulpn` on the server → `nc -vz` → `curl -v` |
| Permission denied | `ls -la`, `id`, `namei -l /full/path`, then SELinux (`ls -Z`) if RHEL-family |
| Command not found | `type -a cmd`, `echo "$PATH"`, `dpkg -S`/`dnf provides` to find the package |
| Runaway process | `kill PID`, wait, then `kill -9 PID`; `renice`/`taskset` if it just needs throttling |
| Accidentally huge log | `: > file` (truncate, keeps the writer's handle) - not `rm` |
