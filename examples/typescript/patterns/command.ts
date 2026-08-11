/**
 * Command: a tagged union you can serialize, log, replay and invert.
 *
 * The classic form is an `ICommand` interface with `execute()` and `undo()`
 * methods, one class per action. Modelling commands as *data* instead of
 * objects keeps the pattern's benefits - queueing, logging, undo, replay - and
 * adds one the class version cannot have: a command survives `JSON.stringify`,
 * so it can cross a network boundary or sit in `localStorage`.
 */

type Command =
  | { readonly type: "addItem"; readonly sku: string; readonly quantity: number }
  | { readonly type: "removeItem"; readonly sku: string }
  | { readonly type: "applyCoupon"; readonly code: string };

type CartState = {
  readonly items: Readonly<Record<string, number>>;
  readonly coupon: string | null;
};

const emptyCart: CartState = { items: {}, coupon: null };

/**
 * One reducer replaces every `execute()` method. The `switch` is exhaustive:
 * add a member to `Command` and this stops compiling, which is the same
 * guarantee the class hierarchy gave you, checked at build time instead of
 * discovered when a case is missing.
 */
function apply(state: CartState, command: Command): CartState {
  switch (command.type) {
    case "addItem": {
      // `noUncheckedIndexedAccess` makes this `number | undefined`, so the
      // "first time this sku is added" case cannot be forgotten.
      const current = state.items[command.sku] ?? 0;
      return {
        ...state,
        items: { ...state.items, [command.sku]: current + command.quantity },
      };
    }

    case "removeItem": {
      const remaining = Object.entries(state.items).filter(
        ([sku]) => sku !== command.sku,
      );
      return { ...state, items: Object.fromEntries(remaining) };
    }

    case "applyCoupon":
      return { ...state, coupon: command.code };
  }
}

// A history is an array, and replaying it is a fold. Persist the log rather
// than the state and every past state is recoverable.
const history: readonly Command[] = [
  { type: "addItem", sku: "book", quantity: 2 },
  { type: "addItem", sku: "pen", quantity: 1 },
  { type: "addItem", sku: "book", quantity: 1 },
  { type: "removeItem", sku: "pen" },
  { type: "applyCoupon", code: "SPRING" },
];

const cart = history.reduce(apply, emptyCart);
console.log(cart); // { items: { book: 3 }, coupon: 'SPRING' }

// Commands are plain data, so the log round-trips through JSON untouched -
// send it to a server, replay it in a test, store it for an audit trail. (Parse
// it back with a type guard rather than a cast; see the validation page.)
console.log(JSON.parse(JSON.stringify(history)).length); // 5

/**
 * Undo: an inverse command computed against the state it applied to.
 *
 * Returning `undefined` for commands that cannot be inverted keeps the caller
 * honest - "this action is not undoable" becomes a value to handle rather than
 * a silently missing method.
 */
function invert(command: Command, before: CartState): Command | undefined {
  switch (command.type) {
    case "addItem":
      return { type: "removeItem", sku: command.sku };

    case "removeItem": {
      const quantity = before.items[command.sku];
      return quantity === undefined
        ? undefined
        : { type: "addItem", sku: command.sku, quantity };
    }

    case "applyCoupon":
      return before.coupon === null
        ? undefined
        : { type: "applyCoupon", code: before.coupon };
  }
}

const beforeRemove = history.slice(0, 3).reduce(apply, emptyCart);
const undoRemove = invert({ type: "removeItem", sku: "pen" }, beforeRemove);
console.log(undoRemove); // { type: 'addItem', sku: 'pen', quantity: 1 }

export { apply, invert, emptyCart };
export type { Command, CartState };
