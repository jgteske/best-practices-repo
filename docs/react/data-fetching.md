# Data Fetching

Fetching in an effect looks like three lines of code. Doing it **correctly** means
handling loading and error states, cancelling stale requests, never showing the
previous item's data for the new id, validating the response and supporting
retries. This page builds a small `useQuery` hook that gets each of these right, and
then explains when to replace it with a library.

Examples: [`examples/react/data-fetching`](https://github.com/jgteske/best-practices-repo/tree/main/examples/react/data-fetching).

## A `useQuery` hook

<<< ../../examples/react/data-fetching/use-query.tsx

What each part protects against:

| Part | Bug it prevents |
| --- | --- |
| `QueryState<T>` status union | impossible combinations like "loading *and* error *and* stale data" (see [modeling with unions](/typescript/modeling-with-unions)) |
| `AbortController` + cleanup | a slow response for the **old** id arriving last and overwriting the new one |
| `controller.signal.aborted` check | treating a cancellation as an error and flashing an error message |
| state tagged with its `url` | one frame of the previous user's data after the id changes |
| `schema.parse(json)` | trusting `await res.json() as User`, which is a cast and not a check ([schema validation](/typescript/schema-validation)) |
| `response.ok` check | treating a 404/500 body as data, because `fetch` only rejects on network failure |
| `reload` + `isFetching` | no way to retry, and blanking the screen on refresh (old data stays visible) |

::: warning Stable dependencies
`schema` is in the effect's dependency array, so callers must pass a stable
object: a module-level schema, not `z.object(...)` written inline in the
component. An inline schema is a new object on every render, which would restart the fetch on every render.
:::

## Using it

<<< ../../examples/react/data-fetching/user-card.tsx

A `switch` on `status` makes each state an explicit branch. TypeScript only lets
you read `user.data` in the `success` branch and `user.error` in the `error`
branch. `aria-busy` tells assistive technology that a refresh is in progress while the
old content is still shown.

## Testing it

The tests replace `fetch` with `vi.stubGlobal` and check the behaviour
users see, including the race:

<<< ../../examples/react/data-fetching/user-card.test.tsx

The last test controls exactly when each response arrives. It answers request
`2` first and request `1` last, and checks that request `1` was aborted and its
data never appears. Remove the `return () => controller.abort()` cleanup and
this test fails.

## When to use a library instead

This hook keeps state **per component**. Two components that show the same user
fetch it twice, and navigating away and back fetches it again. Once you need
any of these, use [TanStack Query](https://tanstack.com/query) (or SWR, or your
framework's loader):

- a **shared cache** with deduplicated requests
- **stale-while-revalidate**, refetch on window focus, polling
- **retries** with backoff, pagination and infinite scroll
- **mutations** that update or invalidate cached data

The concepts carry over directly: `useQuery({ queryKey, queryFn })` returns a
`status` union, and its `queryFn` receives an `AbortSignal`.

::: tip Suspense and server components
Frameworks built on React 19 (Next.js App Router, React Router loaders)
increasingly fetch **before** rendering, either on the server or in a route loader,
and use Suspense for the loading state. The rules on this page still apply
wherever the fetching happens: validate, cancel, and model the states.
:::

## Summary

- Model fetch state as a `pending | error | success` union, not three booleans.
- Abort the previous request in the effect's cleanup, and ignore aborted errors.
- Check `response.ok`, and validate the body with a schema.
- Use a library once data is shared between components or needs caching.
