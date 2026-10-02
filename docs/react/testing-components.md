# Testing Components

The examples in this guide are tested with **Vitest** and **React Testing
Library** in a simulated DOM (jsdom). `npm run check:react` runs every
`*.test.tsx` under `examples/react`. This page explains the approach and the
handful of tools you need.

## The principle: test what the user sees

> The more your tests resemble the way your software is used, the more
> confidence they can give you. *(Testing Library's guiding principle)*

Find elements the way a user (or a screen reader) does: by **role and
accessible name**. Don't use class names, component internals or state. Tests written
this way survive refactors, and they fail when the UI becomes inaccessible,
which is a bug too.

| Query | Use for |
| --- | --- |
| `getByRole("button", { name: "Save" })` | almost everything. It's the first choice |
| `getByLabelText("Email")` | form fields (also proves the label is wired up) |
| `getByText("No such user.")` | non-interactive text |
| `getByTestId(...)` | last resort, when nothing user-visible identifies the element |

The prefix says what happens if the element isn't there:

- **`getBy*`** throws immediately. Use it for "this must be on screen now".
- **`queryBy*`** returns `null`. Use it to assert that something is **absent**.
- **`findBy*`** returns a promise and retries until the element appears. Use it after async work.

## Setup

<<< ../../vitest.config.ts

<<< ../../examples/react/test-setup.ts

`restoreMocks` and `unstubGlobals` undo every `vi.spyOn` and `vi.stubGlobal`
after each test, so a mocked `fetch` can't leak into the next file.

## Simulating users: `user-event`

```tsx
const user = userEvent.setup();
await user.type(screen.getByLabelText("Email"), "ada@example.com");
await user.click(screen.getByRole("button", { name: "Create account" }));
```

`@testing-library/user-event` fires the full sequence of events a browser would
(focus, keydown, input, keyup, click) and respects `disabled`. `fireEvent`
dispatches a single synthetic event. Prefer `user-event`, and **await** every call.

## Testing a component end to end

<<< ../../examples/react/reducers/cart-reducer.test.tsx#component-test

Render, interact, then assert on what is visible. The [forms
tests](./forms#testing-the-form) and [data fetching
tests](./data-fetching#testing-it) follow the same pattern with validation and
network mocks.

## Testing a hook

<<< ../../examples/react/hooks/custom-hook.test.tsx

`renderHook` mounts a throwaway component that calls your hook and exposes
the latest return value as `result.current`. Updates triggered outside a
user-event call must be wrapped in **`act()`**, which applies them and runs the
effects before your assertion. Prefer testing a hook through a real component when
one exists (`<Disclosure />` above). Use `renderHook` for hooks that are
libraries in their own right.

## Time: fake timers

<<< ../../examples/react/hooks/use-loading-delay.test.tsx

`vi.useFakeTimers()` replaces `setTimeout`, `setInterval` and `performance.now`
with a clock that the test moves forward itself with `vi.advanceTimersByTime(ms)`. A
"shown for at least 400 ms" rule takes no real time to test, and the result
is deterministic. Wrap the clock advance in `act()` because it triggers state updates.

## Network: stub `fetch`

```ts
vi.stubGlobal("fetch", vi.fn(async () => Response.json(ada)));
```

Replace `fetch` itself and return real `Response` objects, so the code under
test runs its actual `response.ok` and `.json()` paths. For timing-sensitive
cases, return promises the test resolves by hand. The
[race test](./data-fetching#testing-it) releases two responses in the
"wrong" order on purpose. For larger apps, **MSW** (Mock Service Worker)
intercepts requests at the network level and shares the same handlers between
tests and the browser.

## Errors on purpose

<<< ../../examples/react/test-utils.ts

<<< ../../examples/react/error-handling/error-boundary.test.tsx

Tests that throw on purpose (error boundaries) would otherwise fill the output
with expected stack traces. `hideExpectedErrors()` silences them **for that one
test only**, so unexpected errors elsewhere still show up.

## What not to test

- **Implementation details**: internal state, which hook was called, how
  often a component rendered. Refactors break these tests while
  users notice no difference.
- **React and the libraries themselves**: that `useState` stores a value, or
  that zod rejects a bad email. Test *your* rules: the messages, the wiring,
  the flow.
- **Snapshots of whole components**: they change on every markup tweak and get
  re-approved without anyone reading them. Assert on the specific text or
  attribute that matters instead.

For flows that span pages, real browsers, or layout (scrolling, focus traps,
CSS), add a few end-to-end tests with **Playwright** on top of these.

## Summary

- Query by role and label, the way users and screen readers find things.
- Use `getBy` for present, `queryBy` for absent and `findBy` for async. Drive interactions with `user-event`.
- Use `renderHook` + `act` for hooks, fake timers for time, and `vi.stubGlobal("fetch")` with real `Response`s for the network.
- Test behaviour and your own rules, not implementation details or snapshots.
