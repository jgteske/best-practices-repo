# Lessons

- **Never `git checkout -- .` (or `git restore .`) to undo a single deliberate break.** It also discards every
  other uncommitted edit in the tree. Undo the break with the inverse edit, or `git restore <that file>` only, and
  only when that file has no other uncommitted changes. Better: do deliberate-break checks on a copy, or after committing.
- **Verify in a fresh clone before calling CI-bound work done.** A broad `.gitignore` pattern (`*.log`) silently
  dropped test fixtures; every local run passed, every CI checkout failed. `git clone` the branch into a scratch dir
  and run `npm run check` there, and check `git status --ignored examples` for fixtures that never got committed.
