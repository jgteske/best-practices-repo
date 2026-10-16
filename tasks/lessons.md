# Lessons

- **Never `git checkout -- .` (or `git restore .`) to undo a single deliberate break.** It also discards every
  other uncommitted edit in the tree. Undo the break with the inverse edit, or `git restore <that file>` only, and
  only when that file has no other uncommitted changes. Better: do deliberate-break checks on a copy, or after committing.
