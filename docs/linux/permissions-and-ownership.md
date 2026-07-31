# Permissions & Ownership

## The model

Every file has one **owner** (a user), one **group**, and three sets of
permission bits: for the owner, for members of the group, and for everyone else
("other"). The first character of `ls -l` output is the file *type*, not a
permission.

```
-rwxr-x---  1 alice devs  4096 Jul 31 09:12 deploy.sh
│└┬┘└┬┘└┬┘    └─┬─┘ └─┬┘
│ │  │  │       │     └── group
│ │  │  │       └──────── owner
│ │  │  └── other: ---  (nothing)
│ │  └───── group: r-x  (read, execute)
│ └──────── owner: rwx  (read, write, execute)
└────────── type: - file, d directory, l symlink, c/b device, s socket, p pipe
```

The meaning of each bit **depends on the file type**, which is the part people
get wrong:

| Bit | On a file | On a directory |
| --- | --- | --- |
| `r` (4) | read the contents | **list** the names inside |
| `w` (2) | modify the contents | **create/delete/rename** entries inside |
| `x` (1) | execute it | **enter** it / access anything inside by path |

Consequences that follow directly:

- A directory needs `x` to be usable at all. `r` without `x` lets you list names
  but not `stat` them; `x` without `r` lets you open a known path but not
  discover it.
- **Deleting a file depends on the directory's `w` bit, not the file's.** You can
  delete a read-only file from a directory you can write to.
- `x` on a script also requires `r` (the interpreter has to read it); a compiled
  binary only needs `x`.

## Reading and writing modes

Octal is just the three bits per triple, summed: `r=4`, `w=2`, `x=1`.

| Octal | Symbolic | Typical use |
| --- | --- | --- |
| `644` | `rw-r--r--` | a normal file |
| `755` | `rwxr-xr-x` | a script, a binary, a directory |
| `600` | `rw-------` | a secret: SSH private key, `.env`, credentials |
| `700` | `rwx------` | a private directory (`~/.ssh`, `~/.gnupg`) |
| `664` / `775` | group-writable file / directory | shared team directories |
| `777` | `rwxrwxrwx` | **never** - see below |

```bash
chmod 640 config.yml            # absolute: set exactly these bits
chmod u+x deploy.sh             # symbolic: add execute for the owner
chmod go-w shared/              # remove write for group and other
chmod a+r,u+w file              # multiple clauses
chmod -R u+rwX,go+rX site/      # capital X = "x only on directories and already-executable files"
chmod --reference=good.conf new.conf   # copy another file's mode
```

`-R u+rwX` is the recursive form you almost always want: plain `-R a+x` marks
every data file executable, `X` doesn't.

::: warning `chmod 777` is not a fix
It is the reflex when something "doesn't work", and it means *any* user or
process on the machine can rewrite the file. The real answer is nearly always
the right **ownership** (`chown`) plus `755`/`644`. On a directory,
`777` without the sticky bit also lets any user delete any other user's files.
:::

## Ownership

```bash
chown alice file                 # change owner
chown alice:devs file            # owner and group
chown -R alice:devs /srv/app     # recursive
chgrp devs file                  # group only
id alice                         # uid, gid, and all supplementary groups
groups                           # your own groups
usermod -aG docker alice         # ADD to a group (the -a is critical: without it,
                                 # you REPLACE every supplementary group)
```

A new group membership only applies to **new** login sessions - `newgrp docker`
or a fresh login is needed before it takes effect.

## `umask`: the default for new files

New files are created `666 & ~umask`, directories `777 & ~umask` - the shell
never grants `x` on a new file.

| umask | New file | New directory |
| --- | --- | --- |
| `022` (typical default) | `644` | `755` |
| `002` (shared group work) | `664` | `775` |
| `077` (private) | `600` | `700` |

```bash
umask            # show the current value
umask 077        # for this shell; put it in ~/.profile to make it a default
```

## The special bits

| Bit | Octal | Shown as | Effect |
| --- | --- | --- | --- |
| setuid | `4000` | `s` in the owner's `x` | run the program as its **owner** (e.g. `passwd`) |
| setgid | `2000` | `s` in the group's `x` | run as the group; **on a directory**, new entries inherit the group |
| sticky | `1000` | `t` in other's `x` | in a shared directory, only the owner may delete their own files (`/tmp` is `1777`) |

```bash
chmod 2775 /srv/shared        # setgid: everything created here stays group-owned by the team
chmod 1777 /var/spool/uploads # sticky: everyone can write, nobody can delete another's file
find / -perm -4000 -type f 2>/dev/null   # audit: every setuid binary on the system
```

setuid on a **script** is ignored by Linux (it is a known security hole); use
`sudo` rules instead.

## `sudo` and root

```bash
sudo cmd              # run one command as root
sudo -u alice cmd     # run as another user
sudo -i               # a full root login shell
sudo -l               # what am I allowed to run?
visudo                # the ONLY safe way to edit /etc/sudoers (it validates before saving)
```

Grant narrow rights rather than blanket `ALL`, in a file under
`/etc/sudoers.d/`:

```
# /etc/sudoers.d/deploy  (edit with: visudo -f /etc/sudoers.d/deploy)
deploy ALL=(root) NOPASSWD: /usr/bin/systemctl restart myapp
```

::: tip `sudo cmd > /root/out` does not work
The shell opens `/root/out` **before** `sudo` runs, as you. Use
`cmd | sudo tee /root/out > /dev/null`, or `sudo sh -c 'cmd > /root/out'`.
:::

## Beyond the basics

When three triples aren't enough, ACLs give per-user rules:

```bash
getfacl file
setfacl -m u:bob:rw file          # grant bob read+write specifically
setfacl -x u:bob file             # remove it
```

A `+` at the end of the `ls -l` mode string (`-rw-r--r--+`) means an ACL is
present - worth knowing, because it explains permissions that `chmod` alone
can't account for. On RHEL-family systems, also check `ls -Z` and `ausearch`:
SELinux can deny access even when the mode bits look correct.

## Summary

- Three triples - owner/group/other - and `r`/`w`/`x` mean **different things**
  on directories: `x` is "enter", `w` is "add and remove entries".
- Deleting a file is governed by the **directory's** permissions.
- `644` files, `755` executables and directories, `600`/`700` for secrets.
  `chmod -R u+rwX` for recursion; never `777`.
- `chown user:group`, and `usermod -aG` (never forget the `-a`).
- `umask` sets the defaults; setgid on a directory keeps group ownership
  consistent; the sticky bit protects shared write directories.
- Give narrow `sudo` rules via `visudo` and `/etc/sudoers.d/`, and remember that
  redirection happens as *you*, not as root.
