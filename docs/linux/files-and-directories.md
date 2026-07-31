# Files & Directories

## The everyday commands

| Command | Use | Flags worth knowing |
| --- | --- | --- |
| `cp SRC DEST` | copy | `-r` recursive, `-a` archive (preserve everything), `-i` prompt, `-n` never overwrite, `-v` verbose, `-u` only if newer |
| `mv SRC DEST` | move / rename | `-i` prompt, `-n` no-clobber, `-v` verbose |
| `rm FILE` | delete | `-r` recursive, `-f` force, `-i` prompt, `-v` verbose |
| `mkdir DIR` | create directory | `-p` create parents, and don't fail if it exists |
| `rmdir DIR` | delete an **empty** directory | `-p` remove parents too |
| `touch FILE` | create empty file / bump mtime | `-a`/`-m` only atime/mtime, `-d` set a specific time |
| `ln -s TARGET LINK` | symbolic link | `-f` replace an existing link, `-n` treat a link to a dir as a file |
| `stat FILE` | full metadata | `-c '%s %U %a'` custom format |
| `file FILE` | what a file actually *is* | contents-based, ignores the extension |
| `realpath FILE` | resolve to an absolute, symlink-free path | `-m` allow missing components |
| `basename` / `dirname` | split a path | `basename path .ext` also strips a suffix |

### The `--` habit

A filename starting with `-` is otherwise parsed as a flag. `--` ends option
parsing:

```bash
rm -- -rf-named-file        # deletes the file literally called "-rf-named-file"
rm -rf-named-file           # rm parses it as flags and errors (or worse)
```

Get in the habit of writing `rm -f -- "$file"` in scripts, where `$file` may
come from anywhere.

::: warning `rm` has no undo
There is no trash can. Two habits prevent most disasters: never put a trailing
`/*` on a variable (`rm -rf "$dir"/*` with `dir` unset is `rm -rf /*`), and run
the command as `echo rm ...` once before running it for real. `alias rm='rm -i'`
helps interactively but trains a dangerous reflex - see
[Writing Robust Scripts](./scripting-robustness).
:::

## Globbing: the shell's pattern matching

Globs are expanded **by the shell**, before the command runs. They are not
regular expressions.

| Pattern | Matches |
| --- | --- |
| `*` | any string, including empty (never `/`, never a leading `.`) |
| `?` | exactly one character |
| `[abc]` / `[a-z]` / `[!abc]` | one character from a set / range / not in the set |
| `{a,b}` | brace expansion - `file.{txt,md}` → `file.txt file.md` |
| `{1..10}` | a numeric sequence (`{01..10}` zero-pads) |
| `**` | any depth, but only after `shopt -s globstar` |

```bash
shopt -s globstar nullglob dotglob
ls **/*.log        # every .log at any depth (globstar)
                   # nullglob: a pattern that matches nothing expands to nothing
                   # dotglob: * also matches dotfiles
```

Without `nullglob`, a pattern that matches nothing is passed through
**literally** - which is why loops over globs should start with an existence
check, as in [the loops example](./scripting-basics#loops).

## `find`: the programmable search

`find` walks a tree and tests every entry. The order is `find WHERE TESTS
ACTION`.

```bash
find . -name '*.log'                     # by name (quote it, or the shell expands it first)
find . -iname '*.LOG'                    # case-insensitive
find /etc -type f -name '*.conf'         # only regular files (-type d, l, f)
find . -mtime -7                         # modified in the last 7 days (+7 = older than)
find . -mmin -30                         # modified in the last 30 minutes
find . -size +100M                       # larger than 100 MB (k, M, G)
find . -user alice -group dev            # by ownership
find . -maxdepth 2 -mindepth 1           # limit the recursion depth
find . -empty                            # empty files and directories
find . -path './node_modules' -prune -o -print   # skip a subtree entirely
```

Combine tests with `-a` (implicit), `-o`, `!`, and parentheses (escaped:
`\( ... \)`). Then act on the matches:

```bash
find . -name '*.tmp' -delete                       # built-in, fastest
find . -name '*.log' -exec gzip {} \;              # one gzip per file
find . -name '*.log' -exec gzip {} +               # batches files into few calls
find . -name '*.log' -print0 | xargs -0 -P4 gzip   # parallel, whitespace-safe
```

::: tip `-print0` / `-0` is not optional
Filenames may contain spaces and even newlines. `find ... -print0` emits
NUL-separated names and `xargs -0` reads them - the only pairing that cannot be
broken by a hostile or careless filename. Add `-r` to `xargs` so it does not run
the command at all when there is no input.
:::

For plain "find files by name in a source tree", modern alternatives (`fd`,
`ripgrep`'s `--files`) are faster and respect `.gitignore`, but `find` is on
every machine.

## Archives and compression

`tar` bundles many files into one; the compressor squeezes that bundle.

```bash
tar -czf backup.tar.gz DIR/       # create gzip archive   (c=create z=gzip f=file)
tar -xzf backup.tar.gz            # extract
tar -xzf backup.tar.gz -C /dest   # extract somewhere specific
tar -tzf backup.tar.gz            # list contents without extracting
tar -czf out.tar.gz --exclude='*.tmp' DIR/
```

Swap the compressor with `-j` (bzip2), `-J` (xz), or `--zstd`. Modern GNU `tar`
auto-detects on extract, so `tar -xf anything` usually works.

| Tool | Use |
| --- | --- |
| `gzip` / `gunzip` | fast, universal, single file (replaces the original) |
| `zstd` | modern default: gzip-like speed, much better ratio |
| `xz` | slowest, smallest - good for release artifacts |
| `zip` / `unzip` | when the other end is Windows |

Always **verify** an archive you intend to rely on (`tar -tf` or `gzip -t`)
before deleting the source - see the [backup script](./scripting-robustness).

## Space: what is using it

```bash
df -h                       # free space per mounted filesystem
df -i                       # inodes - "no space left" with df -h showing free space
du -sh /var/log             # total size of one directory
du -h --max-depth=1 /var | sort -h    # biggest children, smallest first
ncdu /var                   # interactive explorer, if installed
```

`du` measures files, `df` measures the filesystem, and they disagree when a
deleted file is still held open by a process - find those with
`lsof +L1`. Truncating the file (`: > /var/log/huge.log`) reclaims the space
without breaking the writer's file handle, which deleting it would not.

## Summary

- Learn `cp -a`, `mkdir -p`, `ln -s`, and always write `rm -f --` in scripts.
- **Globs are the shell's**, expanded before the command runs; `shopt -s
  globstar nullglob` makes them behave sensibly.
- `find` is the programmable search: tests (`-name`, `-mtime`, `-size`, `-type`)
  then an action (`-delete`, `-exec ... +`, `-print0 | xargs -0`).
- `tar -czf` to create, `-xzf` to extract, `-tzf` to inspect - and verify before
  you trust.
- `df` for filesystems, `du` for directories, `df -i` when the numbers make no
  sense.
