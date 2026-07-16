/**
 * Exhaustiveness checking with `never`.
 *
 * The goal: when someone adds a new member to a union type (a discriminated
 * union, a `type` alias of string literals, or a `string enum`), every
 * `switch`/`if` chain that's supposed to handle *all* members should fail to
 * compile until it's updated - instead of silently falling through at
 * runtime.
 */

// The `never` type has no values. A function parameter typed `never` can
// only ever be called with something TypeScript has already narrowed to
// "nothing left" - i.e. every other case has been handled. If any case was
// missed, the "leftover" type at the call site is not `never`, and passing
// it where `never` is expected is a compile error.
function assertNever(value: never): never {
  throw new Error(`Unhandled case: ${JSON.stringify(value)}`);
}

// --- Discriminated union -----------------------------------------------

type PaymentEvent =
  | { type: "succeeded"; amount: number }
  | { type: "failed"; reason: string }
  | { type: "refunded"; amount: number; reason: string };

function describePaymentEvent(event: PaymentEvent): string {
  switch (event.type) {
    case "succeeded":
      return `Payment of ${event.amount} succeeded`;
    case "failed":
      return `Payment failed: ${event.reason}`;
    case "refunded":
      return `Refunded ${event.amount} (${event.reason})`;
    default:
      // If a fourth member (e.g. `{ type: "disputed"; ... }`) is added to
      // PaymentEvent and this switch isn't updated, `event` here is no
      // longer `never` - it's the new, unhandled member - and this line
      // fails to compile. That's the whole point: the *build* breaks
      // instead of this function silently returning `undefined` at runtime.
      return assertNever(event);
  }
}

// --- String union (the "enum without `enum`" pattern) -------------------

type OrderStatus = "pending" | "shipped" | "delivered" | "cancelled";

function nextPossibleStatuses(status: OrderStatus): OrderStatus[] {
  switch (status) {
    case "pending":
      return ["shipped", "cancelled"];
    case "shipped":
      return ["delivered"];
    case "delivered":
      return [];
    case "cancelled":
      return [];
    default:
      return assertNever(status);
  }
}

// --- Native `enum` ---------------------------------------------------

enum LogLevel {
  Debug,
  Info,
  Warn,
  Error,
}

function logLevelColor(level: LogLevel): string {
  switch (level) {
    case LogLevel.Debug:
      return "gray";
    case LogLevel.Info:
      return "blue";
    case LogLevel.Warn:
      return "orange";
    case LogLevel.Error:
      return "red";
    default:
      return assertNever(level);
  }
}

export { assertNever, describePaymentEvent, nextPossibleStatuses, logLevelColor, LogLevel };
export type { PaymentEvent, OrderStatus };
