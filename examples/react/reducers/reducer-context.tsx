import { createContext, useContext, useReducer, type Dispatch, type ReactNode } from "react";
import { cartReducer, cartTotal, emptyCart, type CartAction, type CartState } from "./cart-reducer";

// A reducer plus context replaces prop drilling for state that many components
// read and change. State and dispatch go in SEPARATE contexts: `dispatch` never
// changes identity, so components that only send actions (an "Add" button deep
// in a product list) don't re-render when the cart changes.

const CartStateContext = createContext<CartState | null>(null);
const CartDispatchContext = createContext<Dispatch<CartAction> | null>(null);

export function CartProvider({ children, initial = emptyCart }: { children: ReactNode; initial?: CartState }) {
  const [state, dispatch] = useReducer(cartReducer, initial);
  return (
    <CartStateContext.Provider value={state}>
      <CartDispatchContext.Provider value={dispatch}>{children}</CartDispatchContext.Provider>
    </CartStateContext.Provider>
  );
}

// Guard hooks: a missing provider fails loudly, and callers get non-null types.
export function useCart(): CartState {
  const state = useContext(CartStateContext);
  if (state === null) throw new Error("useCart must be used inside <CartProvider>");
  return state;
}

export function useCartDispatch(): Dispatch<CartAction> {
  const dispatch = useContext(CartDispatchContext);
  if (dispatch === null) throw new Error("useCartDispatch must be used inside <CartProvider>");
  return dispatch;
}

// Only sends actions: subscribes to dispatch, not to the cart's state.
export function AddToCartButton({ sku, name, price }: { sku: string; name: string; price: number }) {
  const dispatch = useCartDispatch();
  return (
    <button type="button" onClick={() => dispatch({ type: "added", item: { sku, name, price } })}>
      Add {name}
    </button>
  );
}

// Only reads state.
export function CartBadge() {
  const cart = useCart();
  const count = cart.items.reduce((sum, item) => sum + item.qty, 0);
  return (
    <span aria-label="Cart summary">
      {count} items, {cartTotal(cart)} total
    </span>
  );
}

export function Shop() {
  return (
    <CartProvider>
      <header>
        <CartBadge />
      </header>
      <AddToCartButton sku="pen" name="Pen" price={2} />
      <AddToCartButton sku="book" name="Book" price={20} />
    </CartProvider>
  );
}
