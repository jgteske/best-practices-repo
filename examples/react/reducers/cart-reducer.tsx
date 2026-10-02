import { useReducer } from "react";

// useReducer moves "how state changes" out of the event handlers and into one
// pure function. Handlers only say WHAT happened; the reducer decides what
// that means for the state. The reducer is plain TypeScript, so it can be
// tested without rendering anything.

export type CartItem = { sku: string; name: string; price: number; qty: number };

export type CartState = {
  items: CartItem[];
  coupon: string | null;
  status: "editing" | "checkingOut" | "ordered";
};

// Actions are a discriminated union, named as events in the past tense
// ("added", not "addItem"): they describe what the user did.
export type CartAction =
  | { type: "added"; item: Omit<CartItem, "qty"> }
  | { type: "quantityChanged"; sku: string; qty: number }
  | { type: "removed"; sku: string }
  | { type: "couponApplied"; code: string }
  | { type: "checkoutStarted" }
  | { type: "orderPlaced" };

export const emptyCart: CartState = { items: [], coupon: null, status: "editing" };

export function cartReducer(state: CartState, action: CartAction): CartState {
  // One rule for the whole cart, in one place: nothing changes after ordering.
  if (state.status === "ordered") return state;

  switch (action.type) {
    case "added": {
      const existing = state.items.find((item) => item.sku === action.item.sku);
      const items = existing
        ? state.items.map((item) => (item === existing ? { ...item, qty: item.qty + 1 } : item))
        : [...state.items, { ...action.item, qty: 1 }];
      return { ...state, items };
    }
    case "quantityChanged":
      // Setting the quantity to 0 removes the line - the reducer owns that rule.
      return {
        ...state,
        items: state.items
          .map((item) => (item.sku === action.sku ? { ...item, qty: action.qty } : item))
          .filter((item) => item.qty > 0),
      };
    case "removed":
      return { ...state, items: state.items.filter((item) => item.sku !== action.sku) };
    case "couponApplied":
      return { ...state, coupon: action.code.trim().toUpperCase() };
    case "checkoutStarted":
      return state.items.length > 0 ? { ...state, status: "checkingOut" } : state;
    case "orderPlaced":
      return state.status === "checkingOut" ? { ...state, status: "ordered" } : state;
    default: {
      // A new action type that isn't handled above is a compile error here.
      const unhandled: never = action;
      return unhandled;
    }
  }
}

// Derived values are computed from state, not stored in it.
export function cartTotal({ items, coupon }: CartState): number {
  const subtotal = items.reduce((sum, item) => sum + item.price * item.qty, 0);
  return coupon === "SAVE10" ? Math.round(subtotal * 0.9 * 100) / 100 : subtotal;
}

const book = { sku: "book", name: "Book", price: 20 };

export function Cart() {
  const [cart, dispatch] = useReducer(cartReducer, emptyCart);

  if (cart.status === "ordered") return <p role="status">Thanks for your order!</p>;

  return (
    <section aria-label="Cart">
      <button type="button" onClick={() => dispatch({ type: "added", item: book })}>
        Add book
      </button>
      <ul>
        {cart.items.map((item) => (
          <li key={item.sku}>
            {item.name} × {item.qty}
            <button type="button" onClick={() => dispatch({ type: "removed", sku: item.sku })}>
              Remove {item.name}
            </button>
          </li>
        ))}
      </ul>
      <p>Total: {cartTotal(cart)}</p>
      {cart.status === "editing" ? (
        <button type="button" onClick={() => dispatch({ type: "checkoutStarted" })}>
          Checkout
        </button>
      ) : (
        <button type="button" onClick={() => dispatch({ type: "orderPlaced" })}>
          Place order
        </button>
      )}
    </section>
  );
}
