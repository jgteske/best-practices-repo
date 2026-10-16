# TODO - React error handling

## Examples (`examples/react/error-handling/`)

- [x] `errors.ts` - catch helpers: `toError`, `isAbortError`, `tryCatch` (Result), `logError`
- [x] `error-boundary.tsx` - typed class boundary: render-prop fallback, `onError`, `resetKeys`
- [x] `use-show-boundary.tsx` - escalate async/handler errors into the nearest boundary
- [x] `handling-errors.tsx` - expected errors as state (handler + effect), unexpected ones escalated
- [x] `boundary-placement.tsx` - root / route / widget boundaries, reset by key

## Docs & wiring

- [x] `docs/react/error-handling.md`
- [x] sidebar in `docs/.vitepress/config.ts`, table row in `docs/react/index.md`

## Verification

- [x] `npm run typecheck`
- [x] runtime check in scratch (jsdom + react-dom/client): boundary catches, resets, resetKeys, showBoundary
- [x] `npm run docs:build`

## Review

Five examples in `examples/react/error-handling/` and one page, `docs/react/error-handling.md`.
`npm run typecheck` and `npm run docs:build` both pass.

The examples were compiled to JS in the scratchpad and run under jsdom with
React 18.3.1. All 14 runtime checks passed: the boundary catches and resets,
`resetKeys` resets, handler errors bypass the boundary, `useShowBoundary`
escalates, ProfileForm handles 409 inline and escalates 500, OrderList handles
404, 200, 500 and abort-on-unmount, the App isolates a failing widget, and the
`key` reset works.
That harness is not committed, because the repo has no runtime check for React
examples.
