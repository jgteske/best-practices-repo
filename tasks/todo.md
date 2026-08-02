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
