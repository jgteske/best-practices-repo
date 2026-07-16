/**
 * A type-safe state machine built from a discriminated union.
 *
 * The union describes the states; a transition function maps (state, event)
 * to the next state. Because each state only exposes the data it actually
 * has, transitions that don't make sense are impossible to express.
 */

// The states of a simple checkout flow.
type Checkout =
  | { step: "cart"; items: readonly string[] }
  | { step: "shipping"; items: readonly string[]; address: string }
  | { step: "payment"; items: readonly string[]; address: string; card: string }
  | { step: "confirmed"; orderId: string };

// Events that can drive the machine forward.
type CheckoutEvent =
  | { type: "addAddress"; address: string }
  | { type: "addCard"; card: string }
  | { type: "confirm"; orderId: string };

/**
 * Transitions are only defined for valid (state, event) pairs. Any event
 * arriving in a state that can't handle it returns the state unchanged -
 * a single, explicit place where "impossible" transitions are rejected.
 */
function transition(state: Checkout, event: CheckoutEvent): Checkout {
  switch (state.step) {
    case "cart":
      // From the cart, the only meaningful event is adding an address.
      return event.type === "addAddress"
        ? { step: "shipping", items: state.items, address: event.address }
        : state;

    case "shipping":
      return event.type === "addCard"
        ? {
            step: "payment",
            items: state.items,
            address: state.address,
            card: event.card,
          }
        : state;

    case "payment":
      return event.type === "confirm"
        ? { step: "confirmed", orderId: event.orderId }
        : state;

    case "confirmed":
      // Terminal state: no further transitions.
      return state;
  }
}

let checkout: Checkout = { step: "cart", items: ["book", "pen"] };
checkout = transition(checkout, { type: "addAddress", address: "1 Main St" });
checkout = transition(checkout, { type: "addCard", card: "**** 4242" });
checkout = transition(checkout, { type: "confirm", orderId: "order_1" });
console.log(checkout);

export { transition };
export type { Checkout, CheckoutEvent };
