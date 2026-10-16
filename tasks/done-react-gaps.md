# DONE - React: reducers, data fetching, forms, testing + check:react

Workstream 3 of 4 (see ~/.claude/plans/look-at-the-repo-partitioned-lake.md). Branch `docs/react-gaps`,
stacked on `docs/typescript-depth` because the forms and data-fetching examples use zod.

- [x] infra: `vitest` 5, `jsdom`, `@testing-library/{react,dom,user-event}`. Added `vitest.config.ts`,
      `examples/react/test-setup.ts` (cleanup) and `test-utils.ts` (`hideExpectedErrors`).
      Added `npm run check:react`, included it in `npm run check`, and added a CI workflow step.
- [x] `reducers/` - cart reducer (event-named union actions, never default), reducer + split contexts, tests
- [x] `data-fetching/` - `useQuery` (status union, abort, url-tagged state, schema parse, reload) + `UserCard` + tests
- [x] `forms/` - controlled vs uncontrolled, accessible signup form with zod + pending + server errors, tests
- [x] backfilled tests: ErrorBoundary (fallback, reset, resetKeys), useToggle/Disclosure, useLoadingDelay (fake timers)
- [x] pages: state-with-reducers, data-fetching, forms, testing-components. Also sidebar, index, guide table, README.

## Review

- `npm run check:react`: 6 files, 20 tests pass. `npm run typecheck` and `npm run docs:build` pass.
- Deliberate-break check: removing the abort cleanup from `useQuery` fails the race test, and removing
  `disabled={submitting}` fails the double-submit test. Both were restored, with 20/20 passing again.
- React 18 + jsdom prints expected boundary errors as uncaught. `hideExpectedErrors()` silences them
  per test only, so unexpected errors still surface.
- VitePress can't import line ranges (`#L..`), only regions, so I used `// #region component-test`.
