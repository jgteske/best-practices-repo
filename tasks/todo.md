# Task: `.ts` vs `.tsx` vs `.d.ts`, and namespaces

## Plan

- [x] `examples/typescript/declarations/ambient-declarations.d.ts` - script-mode
      declaration file: ambient module, wildcard asset modules, `Window` merge,
      `declare namespace`.
- [x] `examples/typescript/declarations/using-ambient-declarations.ts` - the
      consumer that proves each declaration resolves.
- [x] `examples/typescript/declarations/module-augmentation.d.ts` - module-mode:
      augments React's `CSSProperties`, plus `declare global`.
- [x] `examples/typescript/declarations/using-module-augmentation.ts` - consumer.
- [x] `examples/typescript/declarations/tsx-file-kind.tsx` - what `.tsx` changes,
      the generic-arrow trap and its three fixes.
- [x] `examples/typescript/namespaces/namespace-basics.ts` and
      `declaration-merging.ts`.
- [x] New pages `docs/typescript/file-kinds-and-declarations.md` and
      `docs/typescript/namespaces.md`, plus a "Files & Declarations" sidebar
      group, index rows, and cross-links.

## Review

### What was built

**7 example files** in two new folders under `examples/typescript/`, and **2 new
pages** in a new sidebar group. The declaration files are the first `.d.ts` in
the repo; `tsconfig.json` already globbed `examples/**/*.ts`, so they are
type-checked with everything else and needed no build changes.

The organising idea of the first page is **script mode vs module mode**: a
`.d.ts` with no top-level `import`/`export` is global, and `declare module "x"`
*declares* a module; add one `import` and the identical syntax *augments* an
existing module instead, so an import of the package fails with TS2307. Both
modes get their own example file plus a consumer.

### Verified rather than assumed

Everything asserted about the compiler was checked against a scratch project
using this repo's exact strict options before any of it was written up:

- The TS2307 script-vs-module gotcha - reproduced, and quoted with its real
  error code.
- The `.tsx` generic-arrow trap - reproduced (TS17008 / TS1382 / TS1005), and all
  three documented fixes confirmed to compile.
- The compiled JavaScript quoted on the namespaces page is real `tsc` output for
  the example file, emitted with `--removeComments`, not hand-written.
- `@types/react` really is `declare namespace React` + `export = React` +
  `export as namespace React` (`node_modules/@types/react/index.d.ts:47-50`), so
  the "where namespaces still live" claim cites something checkable.

### Non-vacuity check

A declaration file compiles whatever you write, so the consumer files are the
only real test. Renaming `track` to `trackRenamed` in the ambient `.d.ts` made
`using-ambient-declarations.ts` fail with **TS2614: Module '"legacy-analytics"'
has no exported member 'track'**; the declaration was then restored and the
project type-checks clean. The page says this explicitly.

### Two things found along the way

1. **VitePress interpolates `{{ }}` inside inline code.** A prose mention of a
   JSX `style` prop broke `docs:build` with a Vue compiler error. Reworded rather
   than escaped.
2. **Numbered headings get underscore-prefixed anchors** (`### 3. Interface
   merging` → `id="_3-interface-merging"`), and **VitePress's dead-link check
   does not validate anchors** - so a wrong `#fragment` builds green. The
   headings were renumbered to plain text, and every anchor link in the repo was
   then checked against the ids in the built HTML. That swept up one
   **pre-existing** dead anchor in `const-assertions-and-enums.md`
   (`#the-satisfies-operator` → `#satisfies-validate-without-widening`), fixed
   here. The whole `docs/` tree now scans clean.

### Decisions worth recording

- **The ambient declarations are global to the project**, because
  `tsconfig.json` compiles `examples/` as one program. That is exactly how a
  `.d.ts` behaves in a real repo and is the lesson itself; the declarations are
  additive, and the names (`legacy-analytics`, `LegacyWidgets`, `buildId`) do not
  collide with anything.
- **No `NodeJS.ProcessEnv` example.** `@types/node` is not installed, so
  `declare namespace NodeJS` would create a new namespace rather than augment
  one - the page would have been teaching something untrue here. The `react` and
  `Window` augmentations are real in this project.
- **The pages recommend *against* writing most of what they demonstrate** -
  generate declarations for code you own, and prefer modules to namespaces. The
  examples exist so the reader can recognise these constructs, which is the
  actual need.

### Verification performed

- `npm run typecheck` - all 7 new files compile under `strict`,
  `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `isolatedModules`.
- `npm run check` - typecheck + bash + 21 JS examples + `docs:build`, passing.
- Both pages present in `docs/.vitepress/dist/typescript/` with `<<<` snippets
  inlined; sidebar group and index rows render.
- Repo-wide anchor scan: **no dead anchors**.

### Not done

- No browser spot-check (no Chrome in this environment).

---

# Task: Promise queues, rate limiting & timing examples

## Plan

- [x] `examples/javascript/async/promise-queue.mjs` - a side-effect-free module
      exporting `PromiseQueue` + `mapConcurrent` / `mapSettled`.
- [x] `examples/javascript/async/promise-queue-usage.mjs` - the measured
      demonstrations (unbounded vs queued, ordering, failure, abort, mutex, idle).
- [x] `examples/javascript/async/rate-limit-and-retry.mjs` - sliding-window
      limiter, backoff with full jitter, per-attempt vs overall deadlines, and
      the four policies stacked.
- [x] `examples/javascript/async/timers-and-scheduling.mjs` - timer drift,
      interval overlap, vanilla debounce/throttle, clock-derived countdowns.
- [x] `examples/react/hooks/use-async-queue.tsx` - `useAsyncQueue` →
      `useUploadQueue` → `UploadPanel`.
- [x] `examples/react/hooks/use-throttled-callback.tsx` - time-based throttle
      (leading + trailing) → `useTypingPresence` → `MessageComposer`.
- [x] `examples/react/hooks/use-loading-delay.tsx` - delayed, minimum-duration
      spinner → `useSearchResults` → `SearchResults`.
- [x] New pages: `docs/javascript/promise-queues.md`,
      `docs/javascript/timers-and-scheduling.md`,
      `docs/react/queues-and-concurrency.md`.
- [x] Extend `docs/react/advanced-hook-chaining.md` (two new timing policies, the
      Layer-2 chain diagram, the policy table).
- [x] Wire up sidebar, both section `index.md` tables, and cross-links from the
      event-loop and TypeScript async pages.

## Review

### What was built

**4 JavaScript examples** and **3 React examples**, plus **3 new pages** and
edits to five existing ones. `examples/javascript` went from 17 files to 21.

The queue is split in two on purpose: `promise-queue.mjs` is a module that
prints nothing, `promise-queue-usage.mjs` is the script that exercises it. The
first draft had them in one file, and importing the class into
`rate-limit-and-retry.mjs` then re-ran the whole demo inside another example's
output - which is precisely the side-effect-on-import problem the ESM page warns
about. `examples/javascript/testing/cart.mjs` was already the precedent for a
runnable-but-silent module.

### Where running the code changed the docs

1. **The drift claim was wrong.** The example was written to show `setInterval`
   drifting because Node "re-arms after the callback returns". Measured:
   `setInterval` +8ms vs a self-correcting chain +5ms over 10 ticks - no
   meaningful difference. `setInterval` schedules on a fixed grid and absorbs
   callback time. The section was rebuilt around the timer that *does* drift, a
   naive chained `setTimeout` (+62ms over the same 200ms), and the page now says
   so explicitly against the folklore.
2. **The deadline demo's error name was racy** - `AbortError` or `TimeoutError`
   depending on whether the budget expired during an attempt or during a backoff
   sleep. Fixed in `retry` by always re-throwing `signal.reason`, which is better
   behaviour as well as a stable doc: "why did this stop" now has one answer.
3. **The rate limiter is not FIFO**, which one run made obvious (`call 3` landed
   in the third window while calls 4-6 went in the second). Rather than hide it,
   the example prints sorted by call number with a comment, and the page calls
   the property out and says what to do when fairness matters.

### Decisions worth recording

- **No new dependency.** The whole point is that a bounded queue is ~40 lines, so
  `p-limit` stays out of `package.json`.
- **The React queue lives in refs, mirrored into state.** The state-driven
  version reads better and double-starts every job under StrictMode's
  `setup → cleanup → setup`, because both setups see the same `jobs` snapshot.
  The page explains the choice rather than just showing it.
- **`useLoadingDelay` does not chain on `useEventCallback`.** It takes a boolean,
  not a callback, so there is no user function to keep fresh. The Layer-2
  diagram shows it owning its own timers instead of inventing a dependency for
  consistency's sake.
- **Jittered output is quoted as-is** and the page says the numbers differ every
  run - that being the point of jitter.

### Verification performed

- `npm run check:js` - **all 21 examples passed (20 executed)**; every output
  block on the three new pages is pasted from a real run.
- Timing-sensitive output confirmed stable across repeated runs; the one
  deliberately non-deterministic demo (jitter) is labelled as such, and the
  deadline demo has jitter switched off so its numbers repeat.
- `npm run typecheck` - the three new `.tsx` files compile under `strict` with
  `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes`.
- `npm run check` - typecheck + bash + js + `docs:build`, **passing**, including
  VitePress's dead-link check over every new cross-link and `<<<` path.
- All four new/edited mermaid diagrams parse: each clears the grammar and fails
  only at DOMPurify (no browser DOM here), while a deliberately broken control
  diagram fails with a real `Parse error` - so the check is not vacuous.
- Anchor targets used in cross-links verified against ids in the built HTML.

### Not done

- No browser spot-check of the rendered pages or the new sidebar entries (no
  Chrome in this environment). The built HTML contains all three new pages with
  snippets inlined and highlighted.

---

# Task: JavaScript & Node.js documentation section

## Plan

- [x] New top-level section `docs/javascript/` with its own `index.md`, plus nav and
      sidebar entries in `docs/.vitepress/config.ts` (per `docs/guide/writing-docs.md`).
- [x] Language pages: values & coercion, scope/closures/`this`, objects & classes,
      arrays & iteration.
- [x] Modules & async pages: ESM vs CommonJS, the event loop & promises.
- [x] Node runtime pages: running node, npm & packages, core APIs, streams & buffers,
      HTTP & networking, errors & graceful shutdown, testing with `node:test`.
- [x] Reference: cheat sheet.
- [x] Runnable examples under `examples/javascript/`, imported with `<<<` snippets.
- [x] A checker for the new language: `scripts/check-js.sh` (`node --check` always,
      then actually executing every runnable example and `node --test`), wired into
      `npm run check:js` / `check` and the GitHub Actions workflow.
- [x] Update README, home page, guide index, and writing-docs for the new section.

## Review

### What was built

**15 pages** under `docs/javascript/` (overview + 4 language + 2 modules/async +
7 runtime + cheat sheet), wired into `nav` and a `"/javascript/"` sidebar in
`docs/.vitepress/config.ts` with five groups.

**17 example files** under `examples/javascript/` (`language/`, `modules/`,
`async/`, `node/`, `testing/`), imported into the pages with `<<< …{js}`.

**`scripts/check-js.sh`** — the new per-language checker. It does three things:
`node --check` on every `.mjs`/`.cjs`, then executes each runnable file under a
60s `timeout`, then `node --test 'examples/javascript/**/*.test.mjs'`. Opt-out
marker is `// check-js: no-run`. Wired into `npm run check:js` and the `check`
chain, and added as a CI step.

**Surrounding updates:** `package.json` (`check:js`, `engines: >=22`,
description), `.github/workflows/deploy-docs.yml` (Node 20 → 22, new check step),
`README.md`, `docs/index.md`, `docs/guide/index.md`, `docs/guide/writing-docs.md`.

### Decisions worth recording

- **No TypeScript pages**, per the scoping answer. The section cross-links to
  `/typescript/` instead of duplicating it.
- **Executing the examples, not just parsing them** was the key choice. It means
  every output block quoted in the prose is real program output — and it caught
  four places where my written prediction was wrong (see below).
- **`.mjs`/`.cjs` extensions everywhere** so no page has to explain which
  `package.json` `"type"` applies to a snippet.

### Where running the code changed the docs

1. **Event-loop ordering.** I had written `nextTick` → `promise.then` →
   `queueMicrotask`. The real ESM output is `promise.then` → `queueMicrotask` →
   `nextTick` **last**, because a top-level ESM body is itself evaluated inside a
   microtask. Confirmed the CJS order differs. The example now records and prints
   the actual order, and the page states the discrepancy explicitly rather than
   repeating the usual (CJS-only) summary.
2. **`2 ** 53 + 1 === 2 ** 53 + 2`** printed `false`, not the `true` my comment
   claimed. Replaced with `2 ** 53 === 2 ** 53 + 1`.
3. **A comment claiming "every line below is `true`"** for the `==` block — several
   were false.
4. **`fetch("http://127.0.0.1:9/…")`** raised `TypeError` (ECONNREFUSED), not a
   timeout, so the cancellation demo was rewritten to be fully offline.

### Verification performed

- `npm run check:js` — **all 17 examples passed (16 executed)**; test suite 8
  pass / 1 todo / 0 fail.
- Checker proved non-vacuous by planting three files: a syntax error (failed), a
  `process.exit(3)` (reported `FAILED (exit 3)`), and a `// check-js: no-run`
  (skipped). All three planted files removed.
- `npx shellcheck --severity=warning scripts/check-js.sh` — clean.
- `npm run check` — typecheck + bash + js + full `docs:build`, **passing**,
  including VitePress's dead-link check over every new cross-link. (Two dead
  links were found and fixed this way: `/typescript/result-types-and-errors` →
  `/typescript/error-handling`, and a `/react/testing-components` page that does
  not exist.)
- All 15 `docs/.vitepress/dist/javascript/*.html` exist; snippets are inlined and
  highlighted as `language-js` despite the `.mjs` extension, confirming the
  `{js}` override works.
- Mermaid: could not render in-browser (no Chrome in this environment), but the
  parser discriminates correctly — deliberately broken syntax fails with a
  *parse error*, while the new diagram and an already-shipped diagram from
  `docs/linux/` both clear the grammar and fail identically at DOMPurify, which
  needs a browser DOM.

### Not done

- No `npm run docs:dev` visual spot-check of the nav/sidebar, for the same
  reason (no browser available here). The sidebar config follows the exact shape
  of the three existing sections and the built HTML contains all the pages.
