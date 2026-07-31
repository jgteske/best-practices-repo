# Task: More complex hook-chaining examples (callbacks + timing)

## Plan

- [x] Add a foundation example: `useLatestRef` → `useEventCallback` → `useTimeout`
      (stale-closure and stable-identity problems).
- [x] Add a debounce chain: `useDebouncedCallback` (with `cancel`/`flush`) →
      `useDebouncedSearch` (debounce + `AbortController`) → `SearchBox`.
- [x] Add an interval chain: `useInterval` (`delay: number | null`) →
      `usePolling` (backoff + tab visibility) → `HealthWidget`.
- [x] Add a frame-timing chain: `useFrameThrottledCallback` →
      `useScrollProgress` → `ReadingProgressBar`.
- [x] New page `docs/react/advanced-hook-chaining.md` importing all four, with
      layer diagram, debounce timeline, timing-policy comparison, cleanup rules.
- [x] Wire into sidebar (`docs/.vitepress/config.ts`), `docs/react/index.md`,
      and cross-link from `custom-hooks-and-chaining.md`.
- [x] Verify with `npm run check`.

## Review

New examples (all under `examples/react/hooks/`, all type-checked by
`npm run typecheck`):

| File | Chain |
| --- | --- |
| `stable-callback.tsx` | `useLatestRef` → `useEventCallback` → `useTimeout` → `Toast` |
| `debounced-callback.tsx` | `useEventCallback` → `useDebouncedCallback` → `useDebouncedSearch` → `SearchBox` |
| `use-interval.tsx` | `useLatestRef` → `useInterval` → `usePolling` → `HealthWidget` |
| `frame-throttled-callback.tsx` | `useEventCallback` → `useFrameThrottledCallback` → `useScrollProgress` → `ReadingProgressBar` |

The examples import each other rather than re-declaring the base hooks, so the
chaining is real across module boundaries, not just narrative.

Verification: `npm run check` (typecheck + VitePress build) passes; the built
page contains the imported snippets. Mermaid blocks were parsed with the
`mermaid` package — the `sequenceDiagram` parses clean, and the flowchart's
headless parse failure (`DOMPurify.addHook is not a function`) reproduces
identically on the pre-existing diagrams in `rendering-and-lifecycle.md`, so it
is an environment limitation, not a syntax error.

Not done: no runtime/browser verification of the examples (the repo has no test
runner or React dev harness — correctness is enforced by `tsc` only, as with
every other example in the repo).
