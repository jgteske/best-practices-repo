/**
 * Type-safe validation of `unknown` input (API responses, `JSON.parse`,
 * query params, form fields) against enums / union types, using
 * user-defined type guards and `never` to keep the guard itself exhaustive.
 */

// --- Guarding a string-literal union ------------------------------------

const ORDER_STATUSES = ["pending", "shipped", "delivered", "cancelled"] as const;
type OrderStatus = (typeof ORDER_STATUSES)[number];

// A type predicate (`value is OrderStatus`) narrows `unknown` to
// `OrderStatus` at every call site - no cast needed after the check.
function isOrderStatus(value: unknown): value is OrderStatus {
  return (
    typeof value === "string" && (ORDER_STATUSES as readonly string[]).includes(value)
  );
}

function parseOrderStatus(raw: unknown): OrderStatus {
  if (!isOrderStatus(raw)) {
    throw new TypeError(
      `Invalid order status: ${JSON.stringify(raw)}. Expected one of ${ORDER_STATUSES.join(", ")}`,
    );
  }
  return raw; // narrowed to OrderStatus, not just "checked and cast"
}

// --- Guarding a discriminated union, with an exhaustive validator -------

type Shape =
  | { kind: "circle"; radius: number }
  | { kind: "rectangle"; width: number; height: number };

function assertNever(value: never): never {
  throw new Error(`Unhandled case: ${JSON.stringify(value)}`);
}

// This validator does double duty: it checks *runtime* shape, and because
// the switch inside it ends in `assertNever`, adding a new `Shape` member
// without updating this function is a *compile-time* error too - runtime
// validation and compile-time exhaustiveness reinforce each other instead
// of being two unrelated concerns.
function isShape(value: unknown): value is Shape {
  if (typeof value !== "object" || value === null || !("kind" in value)) {
    return false;
  }
  const candidate = value as { kind: unknown };
  switch (candidate.kind) {
    case "circle":
      return "radius" in value && typeof (value as { radius: unknown }).radius === "number";
    case "rectangle":
      return (
        "width" in value &&
        "height" in value &&
        typeof (value as { width: unknown }).width === "number" &&
        typeof (value as { height: unknown }).height === "number"
      );
    default:
      // Reachable at runtime for genuinely invalid input (kind is neither
      // "circle" nor "rectangle"), so this returns `false` rather than
      // calling assertNever - but see the `computeArea` function below for
      // where the *compile-time* exhaustiveness guarantee actually pays off.
      return false;
  }
}

function computeArea(shape: Shape): number {
  switch (shape.kind) {
    case "circle":
      return Math.PI * shape.radius ** 2;
    case "rectangle":
      return shape.width * shape.height;
    default:
      return assertNever(shape);
  }
}

function parseShape(raw: unknown): Shape {
  if (!isShape(raw)) {
    throw new TypeError(`Invalid shape payload: ${JSON.stringify(raw)}`);
  }
  return raw;
}

export { isOrderStatus, parseOrderStatus, isShape, parseShape, computeArea, ORDER_STATUSES };
export type { OrderStatus, Shape };
