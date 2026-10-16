# DONE - TypeScript: deepen thin pages + tsconfig & zod pages

Workstream 2 of 4 (see ~/.claude/plans/look-at-the-repo-partitioned-lake.md). Branch `docs/typescript-depth`, from main.

- [x] error-handling: `result-helpers.ts` (map/andThen/tryCatch/fromPromise), `error-classes.ts` (subclasses, cause, AggregateError)
- [x] generics-in-depth: `advanced-inference.ts` (const T, NoInfer, candidates, in/out variance, method bivariance)
- [x] modeling-with-unions: `modeling-real-data.ts` (payment methods, boolean flags, API responses, `in`)
- [x] mapped-and-conditional-types: `remapping-and-distribution.ts` (map -> union, distribution, IsNever, depth-limited Paths)
- [x] function-signatures: `this-tuples-and-maps.ts` (this params, labeled tuples, lookup map, satisfies tables)
- [x] new `tsconfig-and-strictness.md` + `tsconfig/strict-flags.ts`; imports the real `tsconfig.json`
- [x] new `schema-validation.md` + `validation/zod-schemas.ts`, `validation/parse-at-boundaries.ts`; `zod` ^4.6.5 devDependency
- [x] sidebar, index rows, cross-link from type-safe-validation, README

## Review

- First use of `@ts-expect-error` in the repo, so "this doesn't compile" claims are now checked by `npm run typecheck`.
  Each directive was also verified in a scratch copy with the directives stripped: all 20 errors fire
  for the reason the comment states.
- TS examples aren't executed by CI, but every new file was bundled with esbuild and run in scratch.
  All quoted outputs match. Lines that would crash at runtime sit in an uncalled `compileErrorsOnly()`
  function, or use a call that succeeds at runtime but is rejected by the type.
- Lesson: interface *method* syntax is bivariant even under strict. The first variance demo silently passed,
  and switching to property syntax became a documented point.
- The thin pages went from 49-60 to 92-110 lines, plus larger examples.
- `npm run typecheck` and `npm run docs:build` (dead links) pass.
