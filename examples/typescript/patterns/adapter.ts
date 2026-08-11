/**
 * Adapter: a function from someone else's shape to yours.
 *
 * The pattern's real value is not the translation, it is the *boundary*: the
 * vendor's vocabulary - snake_case keys, amounts as strings, `"DENIED"` - stops
 * at the adapter, and the rest of the codebase only ever sees the domain type.
 * When the vendor changes, or a second vendor is added, one file changes.
 */

// ---------------------------------------------------------------------------
// The domain. Written the way *we* want it, with no trace of any provider.
// ---------------------------------------------------------------------------
type Payment = {
  readonly id: string;
  readonly cents: number;
  readonly at: Date;
  readonly status: "paid" | "failed" | "pending";
};

// ---------------------------------------------------------------------------
// What each provider actually sends.
// ---------------------------------------------------------------------------
type StripeCharge = {
  readonly id: string;
  readonly amount_cents: string; // yes, a string
  readonly created: number; // unix seconds
  readonly status: "succeeded" | "failed" | "pending";
};

type PaypalTransaction = {
  readonly transactionId: string;
  readonly gross: { readonly value: string }; // "12.50", i.e. major units
  readonly createTime: string; // ISO 8601
  readonly state: "COMPLETED" | "DENIED" | "IN_PROGRESS";
};

/**
 * Mapping the status through a `Record` keyed by the provider's own union - not
 * a `switch` with a `default` - means a status the provider adds later shows up
 * as a compile error the moment the vendor's types are updated, instead of
 * silently falling through to "pending".
 */
const stripeStatus: Record<StripeCharge["status"], Payment["status"]> = {
  succeeded: "paid",
  failed: "failed",
  pending: "pending",
};

const paypalStatus: Record<PaypalTransaction["state"], Payment["status"]> = {
  COMPLETED: "paid",
  DENIED: "failed",
  IN_PROGRESS: "pending",
};

const fromStripe = (charge: StripeCharge): Payment => ({
  id: charge.id,
  cents: Number(charge.amount_cents),
  at: new Date(charge.created * 1000),
  status: stripeStatus[charge.status],
});

const fromPaypal = (transaction: PaypalTransaction): Payment => ({
  id: transaction.transactionId,
  cents: Math.round(Number(transaction.gross.value) * 100),
  at: new Date(transaction.createTime),
  status: paypalStatus[transaction.state],
});

console.log(
  fromStripe({
    id: "ch_1",
    amount_cents: "1250",
    created: 1709283600,
    status: "succeeded",
  }),
);
// { id: 'ch_1', cents: 1250, at: 2024-03-01T09:00:00.000Z, status: 'paid' }

console.log(
  fromPaypal({
    transactionId: "ch_1",
    gross: { value: "12.50" },
    createTime: "2024-03-01T09:00:00Z",
    state: "COMPLETED",
  }),
);
// { id: 'ch_1', cents: 1250, at: 2024-03-01T09:00:00.000Z, status: 'paid' }

/**
 * Adapting a whole client to a port.
 *
 * The port is the interface the application depends on. Each provider gets a
 * factory that takes the vendor's client and returns the port - so swapping
 * providers is a one-line change in the composition root, and a fake gateway
 * for tests is just another object of the same shape.
 */
type PaymentGateway = {
  charge: (cents: number) => Promise<Payment>;
};

type StripeClient = {
  createCharge: (args: { amount_cents: string }) => Promise<StripeCharge>;
};

function createStripeGateway(client: StripeClient): PaymentGateway {
  return {
    charge: async (cents) =>
      fromStripe(await client.createCharge({ amount_cents: String(cents) })),
  };
}

const gateway = createStripeGateway({
  createCharge: async ({ amount_cents }) => ({
    id: "ch_2",
    amount_cents,
    created: 1709283600,
    status: "succeeded",
  }),
});

void gateway.charge(999).then((payment) => console.log(payment.cents)); // 999

export { fromStripe, fromPaypal, createStripeGateway };
export type {
  Payment,
  StripeCharge,
  PaypalTransaction,
  PaymentGateway,
  StripeClient,
};
