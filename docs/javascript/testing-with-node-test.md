# Testing with `node:test`

Node has a test runner built in: `node --test`. No dependency, no config file, no
transform step. For most projects that is the whole testing setup, and the
interesting question stops being "which framework" and becomes "is this code
testable at all".

## What makes code testable

<<< ../../examples/javascript/testing/cart.mjs{js}

Nothing in that file is clever. What makes it easy to test is what it *does not*
do: it never reads the clock directly, and it never imports the price lookup. The
clock arrives as `now`, the lookup arrives as `lookup`, and both have sensible
defaults so ordinary callers never notice.

That is the whole trick. Code that reaches out to `Date.now()`, `process.env`,
`fetch`, or a module-level singleton can only be tested by monkey-patching
globals - which is fragile, order-dependent, and leaks between tests. Code that
takes its dependencies as arguments needs no mocking framework because there is
nothing to intercept.

::: tip Push side effects to the edges
A function that computes is trivial to test. A function that computes *and*
writes to a database is not. Splitting them - a pure core with a thin I/O shell -
buys you the ability to test the part where the logic actually lives, with no
setup at all.
:::

## The tests

<<< ../../examples/javascript/testing/cart.test.mjs{js}

```
✔ subtotal multiplies price by quantity (0.630971ms)
▶ checkout
  ✔ applies tax to the subtotal (3.875219ms)
  ✔ stamps the order with the injected clock (0.130751ms)
  ✔ compares whole objects in one assertion (0.697442ms)
  ✔ rejects an empty cart (0.377691ms)
✔ checkout (5.810455ms)
▶ fetchPrice
  ✔ rejects with the sku attached as a cause (0.368141ms)
  ✔ records how a dependency was called (0.345351ms)
✔ fetchPrice (0.888633ms)
✔ handles multi-currency carts (0.08959ms) # waiting on the FX service
ℹ tests 9
ℹ pass 8
ℹ fail 0
ℹ todo 1
```

## Running it

```bash
node --test                              # discover every *.test.* file, skipping node_modules
node --test path/to/one.test.mjs         # a single file
node --test 'src/**/*.test.mjs'          # a glob (Node 21+)
node --test --watch                      # re-run on save
node --test --only                       # run only tests marked { only: true }
node --test --test-name-pattern="cart"   # filter by name
node --test --experimental-test-coverage # coverage report, no nyc/c8
node --test --test-concurrency=1         # serialise files that share a resource
```

Test **files** run in parallel processes; tests **within** a file run in
sequence. That isolation is why `mock` state resets between files without you
doing anything, and why two files that both bind port 3000 will collide -
`server.listen(0)` for an OS-assigned port, as in the
[HTTP example](./http-and-networking).

The conventional script is `"test": "node --test"`, which is what `npm test`
then runs.

## Assertions

**Always import `node:assert/strict`.** The non-strict `node:assert` makes
`assert.equal` a `==` comparison, so `assert.equal(1, "1")` passes - which is
precisely the class of bug you wrote the test to catch.

| Assertion | For |
| --- | --- |
| `assert.equal(a, b)` | primitives, with `===` |
| `assert.deepEqual(a, b)` | whole objects and arrays |
| `assert.ok(value)` | truthiness - the weakest one; prefer a specific check |
| `assert.match(str, /re/)` | a substring or shape of a string |
| `assert.throws(fn, Type)` | synchronous failure |
| `await assert.rejects(fn, Type)` | asynchronous failure |
| `assert.fail("reason")` | a branch that should be unreachable |

Two habits worth forming:

**Compare whole objects.** `assert.deepEqual(receipt, { goods, tax, total,
placedAt })` beats four separate property assertions: one failure message shows
you everything that differs, instead of stopping at the first.

**Assert on error type, not message text.** `assert.throws(fn, EmptyCartError)`
survives a reworded message; `assert.throws(fn, { message: /empty cart/ })` is
the looser form when there is no distinct type.

::: warning `assert.rejects` needs `await`
A rejected promise you forgot to await makes the test pass while the code is
broken - the test function returns before the rejection happens. `await
assert.rejects(…)` and `await assert.doesNotReject(…)` are the async forms, and
they must both be awaited.
:::

## Structure and lifecycle

`test` and `it` are the same function; `describe` groups. Pick one style per
project rather than mixing.

| Hook | Runs |
| --- | --- |
| `before` | once, before the tests in its scope |
| `after` | once, after them - and after a failure, so cleanup happens |
| `beforeEach` / `afterEach` | around every test in scope |

Put cleanup in `after`/`afterEach`, never at the end of the test body: a failing
assertion throws, and everything after it never runs. `t.after(…)` inside a test
registers cleanup scoped to that test alone.

`{ todo: "reason" }` and `{ skip: condition }` are first-class options, so a
known-broken or platform-specific test stays **visible in the output** rather
than being commented out and forgotten.

## Mocking

`mock.fn` wraps a function and records every call:

```js
const lookup = mock.fn(async (sku) => (sku === "book" ? 1_200 : undefined));

assert.equal(await fetchPrice("book", { lookup }), 1_200);
assert.equal(lookup.mock.callCount(), 1);
assert.deepEqual(lookup.mock.calls[0].arguments, ["book"]);
```

`mock.method(obj, "name")` replaces a method in place, and `mock.restore()` puts
it back - useful for a global you do not control. `mock.timers.enable()` fakes
timers so a test for a 30-second retry backoff runs instantly.

The mocks reset automatically between test files. Within a file, restore what you
replaced in an `afterEach`.

::: tip Assert on behaviour, not on call counts
`lookup.mock.callCount() === 1` is a test of your implementation, not of what the
code is for. It is worth asserting when "exactly once" is the actual requirement
(no duplicate charge, no double send) and noise otherwise - it will fail on every
refactor that changes nothing a user can observe.
:::

## When to reach for a framework

`node:test` covers unit and integration testing well. Vitest or Jest start
earning their keep when you need:

- **a browser-like DOM** (`jsdom`/`happy-dom`) for testing
  [React components](/react/);
- **snapshot testing** with a mature update workflow;
- **module mocking** - intercepting an `import` without changing the code under
  test (which, per the top of this page, is a need you can often design away);
- **a transform pipeline** for TypeScript or JSX, though `--experimental-strip-types`
  is closing that gap.

Starting with the built-in runner and moving when you hit a real limit is a
better trade than the reverse.

## Summary

- Inject the clock and the collaborators; testable code needs no mocking
  framework.
- `node --test` discovers, runs, watches, and reports coverage with no
  dependency.
- Import `node:assert/strict` - the non-strict version compares with `==`.
- `deepEqual` on whole objects; assert on error **type**, not message text.
- `await assert.rejects` - an unawaited rejection makes a broken test pass.
- Cleanup belongs in `after`/`afterEach`, because a failed assertion skips the
  rest of the body.
- `{ todo }` and `{ skip }` keep known gaps visible instead of commented out.
