/**
 * Tests using node:test - Node's built-in runner. No dependencies, no config.
 *
 * Run one file:  node --test examples/javascript/testing/cart.test.mjs
 * Run them all:  node --test          (discovers every *.test.* file under the
 *                                      current directory, skipping node_modules)
 * Add --watch to re-run on save, or --experimental-test-coverage for a report.
 */

import test, { describe, it, before, mock } from "node:test";
import assert from "node:assert/strict";

import { checkout, subtotal, fetchPrice, EmptyCartError } from "./cart.mjs";

// `test` and `it` are the same function; `describe` groups. Pick one style.
const items = [
  { sku: "book", priceInCents: 1_200, quantity: 2 },
  { sku: "pen", priceInCents: 150, quantity: 4 },
];

test("subtotal multiplies price by quantity", () => {
  // assert/strict means assert.equal is === - always import the strict variant.
  assert.equal(subtotal(items), 3_000);
  assert.equal(subtotal([]), 0);
});

describe("checkout", () => {
  let receipt;

  before(() => {
    // Injecting the clock is what makes the timestamp assertable.
    receipt = checkout(items, { taxRate: 0.2, now: () => new Date("2026-07-31T09:00:00Z") });
  });

  it("applies tax to the subtotal", () => {
    assert.equal(receipt.tax, 600);
    assert.equal(receipt.total, 3_600);
  });

  it("stamps the order with the injected clock", () => {
    assert.equal(receipt.placedAt, "2026-07-31T09:00:00.000Z");
  });

  it("compares whole objects in one assertion", () => {
    // deepEqual on the whole result beats four separate property assertions:
    // one failure message shows you everything that differs.
    assert.deepEqual(checkout([items[0]], { now: () => new Date(0) }), {
      goods: 2_400,
      tax: 0,
      total: 2_400,
      placedAt: "1970-01-01T00:00:00.000Z",
    });
  });

  it("rejects an empty cart", () => {
    // Assert on the error's *type*, not its message text - messages get reworded.
    assert.throws(() => checkout([]), EmptyCartError);
    assert.throws(() => checkout([]), { message: /empty cart/ });
  });
});

describe("fetchPrice", () => {
  it("rejects with the sku attached as a cause", async () => {
    // assert.rejects is the async form; without it, a rejected promise you forgot
    // to await makes the test pass while the code is broken.
    await assert.rejects(() => fetchPrice("ghost", { lookup: async () => undefined }), (error) => {
      assert.match(error.message, /unknown sku/);
      assert.deepEqual(error.cause, { sku: "ghost" });
      return true;
    });
  });

  it("records how a dependency was called", async () => {
    // mock.fn wraps a function and records every call. It is reset automatically
    // between test files, and mock.restore() undoes any method replacement.
    const lookup = mock.fn(async (sku) => (sku === "book" ? 1_200 : undefined));

    assert.equal(await fetchPrice("book", { lookup }), 1_200);
    assert.equal(lookup.mock.callCount(), 1);
    assert.deepEqual(lookup.mock.calls[0].arguments, ["book"]);
  });
});

// Skips and TODOs are first class, so a known-broken test stays visible in the
// output instead of being commented out and forgotten.
test("handles multi-currency carts", { todo: "waiting on the FX service" }, () => {});
test("runs only on Linux", { skip: process.platform !== "linux" }, () => {
  assert.ok(process.platform === "linux");
});
