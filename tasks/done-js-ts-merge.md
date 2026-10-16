# TODO - Merge JavaScript, TypeScript & React into one section

One nav entry ("JavaScript & TypeScript"), one sidebar, grouped by *topic* with
the JS, TS and React pages for that topic side by side.

## Proposed sidebar (topic order: language -> types -> classes -> errors -> async -> modules -> packages -> Node -> React)

- Overview (combined landing) + JS / TS / React intros
- Language Fundamentals: values, scope & this, functions, arrays (JS)
- Types & Modeling: unions, typeof, as const, template literals (TS)
- Type-Level Programming: generics, mapped/conditional, signatures (TS)
- Objects & Classes: JS objects/prototypes, classes at runtime, then the 6 TS class pages
- Design Patterns: factory functions, design patterns (TS)
- Correctness & Validation: exhaustive never, validation (TS)
- Error Handling: TS Result types, JS errors & shutdown, React error boundaries
- Async, Events & Concurrency: event loop, TS async, promise queues, timers, cancellation, event listeners
- Modules & Declarations: ESM/CJS, .ts/.tsx/.d.ts, namespaces
- Packages & Dependencies: 4 npm pages
- Node Runtime: running node, core APIs, streams, HTTP, node:test
- React: Components & Props / State, Context & Refs / Hooks / Rendering & Events
- Reference: JS cheat sheet, TS general best practices, React general best practices

## Steps

- [x] config.ts: single nav entry + one merged sidebar
- [x] combined overview page; existing index pages become JS/TS/React intros
- [x] home page hero + README + guide/ references updated
- [x] fix any links/paths broken by the change
- [x] verify: `npm run docs:build` (dead-link check) + `npm run typecheck`

## Review

Decision: kept URLs. Files stay in docs/javascript, docs/typescript and docs/react.

- `config.ts`: one `jsTsSidebar` shared by all three prefixes, organized into 17
  topic groups. A script confirmed that each of the 60 pages appears exactly once.
  The nav is now a single "JavaScript & TypeScript" dropdown.
- The home hero has one button instead of three. README updated (now 3 guides),
  and `guide/writing-docs.md` explains where new JS/TS/React pages go.
- Each overview page has a tip that links its two sibling guides.
- `npm run typecheck` and `npm run docs:build` (with dead-link check) both pass.
