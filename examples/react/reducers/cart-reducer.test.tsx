import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { Cart, cartReducer, cartTotal, emptyCart, type CartAction, type CartState } from "./cart-reducer";
import { Shop } from "./reducer-context";

// Replaying a list of actions is all it takes to test a reducer.
const replay = (actions: CartAction[], from: CartState = emptyCart) => actions.reduce(cartReducer, from);
const pen = { sku: "pen", name: "Pen", price: 2 };

describe("cartReducer (no React needed)", () => {
  it("merges repeated items and derives the total", () => {
    const cart = replay([
      { type: "added", item: pen },
      { type: "added", item: pen },
      { type: "couponApplied", code: " save10 " },
    ]);
    expect(cart.items).toEqual([{ ...pen, qty: 2 }]);
    expect(cart.coupon).toBe("SAVE10");
    expect(cartTotal(cart)).toBe(3.6);
  });

  it("removes a line when its quantity drops to zero", () => {
    const cart = replay([{ type: "added", item: pen }, { type: "quantityChanged", sku: "pen", qty: 0 }]);
    expect(cart.items).toEqual([]);
  });

  it("refuses to check out an empty cart and freezes after ordering", () => {
    expect(replay([{ type: "checkoutStarted" }]).status).toBe("editing");

    const ordered = replay([{ type: "added", item: pen }, { type: "checkoutStarted" }, { type: "orderPlaced" }]);
    expect(ordered.status).toBe("ordered");
    expect(cartReducer(ordered, { type: "added", item: pen })).toBe(ordered); // same object: nothing changed
  });
});

// #region component-test
describe("<Cart />", () => {
  it("walks from an empty cart to a placed order", async () => {
    const user = userEvent.setup();
    render(<Cart />);

    await user.click(screen.getByRole("button", { name: "Add book" }));
    await user.click(screen.getByRole("button", { name: "Add book" }));
    expect(screen.getByText("Book × 2")).toBeTruthy();
    expect(screen.getByText("Total: 40")).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Checkout" }));
    await user.click(screen.getByRole("button", { name: "Place order" }));
    expect(screen.getByRole("status").textContent).toBe("Thanks for your order!");
  });
});
// #endregion component-test

describe("<Shop /> with reducer + context", () => {
  it("updates the badge from buttons that only dispatch", async () => {
    const user = userEvent.setup();
    render(<Shop />);

    await user.click(screen.getByRole("button", { name: "Add Pen" }));
    await user.click(screen.getByRole("button", { name: "Add Book" }));
    expect(screen.getByLabelText("Cart summary").textContent).toBe("2 items, 22 total");
  });
});
