/**
 * Dependency injection, with no framework and no decorators.
 *
 * "Injecting a dependency" means nothing more than passing a collaborator in as
 * an argument instead of reaching for it inside the function. A factory is the
 * natural place to do it: take the collaborators once, close over them, and
 * return the API. The test then passes different objects - no module mocking,
 * no `jest.mock`, no container.
 */

// Each dependency is a small structural type: the *smallest* surface the
// service actually uses, not the whole library it happens to come from.
type Clock = { now: () => Date };
type Logger = { info: (message: string) => void };

type LineItem = {
  readonly sku: string;
  readonly cents: number;
  readonly quantity: number;
};

type Order = { readonly total: number; readonly placedAt: string };

type OrderDeps = {
  readonly clock: Clock;
  readonly logger: Logger;
  readonly taxRate: number;
};

function createOrderService({ clock, logger, taxRate }: OrderDeps) {
  // A private helper: reachable by the returned methods, invisible to callers.
  const subtotal = (items: readonly LineItem[]): number =>
    items.reduce((sum, item) => sum + item.cents * item.quantity, 0);

  return {
    place: (items: readonly LineItem[]): Order => {
      const total = Math.round(subtotal(items) * (1 + taxRate));
      const placedAt = clock.now().toISOString();
      logger.info(`order placed: ${total} at ${placedAt}`);
      return { total, placedAt };
    },
  };
}

const cart: readonly LineItem[] = [
  { sku: "book", cents: 1200, quantity: 2 },
  { sku: "pen", cents: 350, quantity: 1 },
];

// Production wiring. `console` already has the shape `Logger` describes, so it
// needs no adapter - structural typing means the real dependency is often
// something you already have.
const orders = createOrderService({
  clock: { now: () => new Date() },
  logger: console,
  taxRate: 0.2,
});
console.log(orders.place(cart).total); // 3300

// Test wiring: a frozen clock makes the timestamp assertable, and a recording
// logger turns "did it log?" into a plain array check. Both are object
// literals, checked against the same types the real ones satisfy.
const fixedClock: Clock = { now: () => new Date("2024-03-01T09:00:00Z") };
const logLines: string[] = [];
const recordingLogger: Logger = {
  info: (message) => {
    logLines.push(message);
  },
};

const testOrders = createOrderService({
  clock: fixedClock,
  logger: recordingLogger,
  taxRate: 0.2,
});
console.log(testOrders.place(cart));
// { total: 3300, placedAt: '2024-03-01T09:00:00.000Z' }
console.log(logLines.length); // 1

/**
 * The same idea one function deep: configuration first, data second.
 *
 * Ordering the parameters slow-changing-first means the partially applied
 * function is the useful one, and it can be handed straight to `map` or stored
 * as a module constant.
 */
const formatMoney =
  (locale: string, currency: string) =>
  (cents: number): string =>
    new Intl.NumberFormat(locale, { style: "currency", currency }).format(
      cents / 100,
    );

const usd = formatMoney("en-US", "USD");
console.log(cart.map((item) => usd(item.cents))); // [ '$12.00', '$3.50' ]

export { createOrderService, formatMoney };
export type { Clock, Logger, LineItem, Order, OrderDeps };
