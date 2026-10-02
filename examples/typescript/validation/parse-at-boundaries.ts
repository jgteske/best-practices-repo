/**
 * Parse at the boundary, trust inside: environment variables and API
 * responses validated once, where they enter the program.
 */
import { z } from "zod";

// --- environment variables ---------------------------------------------------
// Everything in process.env is a string (or missing). Coerce, default, and
// fail at startup with every problem listed - not deep inside a request later.
const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  DATABASE_URL: z.url(),
  FEATURE_FLAGS: z
    .string()
    .default("")
    .transform((raw) => raw.split(",").filter(Boolean)),
});
type Env = z.infer<typeof EnvSchema>;

function loadEnv(source: Record<string, string | undefined>): Env {
  const parsed = EnvSchema.safeParse(source);
  if (!parsed.success) {
    throw new Error(`invalid environment:\n${z.prettifyError(parsed.error)}`);
  }
  return parsed.data;
}

const env = loadEnv({ PORT: "8080", DATABASE_URL: "postgres://db:5432/app", FEATURE_FLAGS: "beta,dark" });
console.log(env.PORT + 1, env.FEATURE_FLAGS); // 8081 [ 'beta', 'dark' ]  - a real number and array

try {
  loadEnv({ PORT: "eighty" });
} catch (error) {
  console.log(error instanceof Error ? error.message : error);
  // invalid environment:
  // ✖ Invalid input: expected number, received NaN
  //   → at PORT
  // ✖ Invalid input: expected string, received undefined
  //   → at DATABASE_URL
}

// --- API responses ---------------------------------------------------------
// Validate what the server sent instead of casting `await res.json() as T`.
const OrderSchema = z.object({
  id: z.string(),
  total: z.number().nonnegative(),
  status: z.enum(["open", "paid", "shipped"]),
});
const OrdersResponseSchema = z.object({ orders: z.array(OrderSchema), next: z.string().nullable() });
type Order = z.infer<typeof OrderSchema>;

async function fetchOrders(fetchJson: () => Promise<unknown>): Promise<Order[]> {
  const body = OrdersResponseSchema.parse(await fetchJson()); // throws with a precise path on drift
  return body.orders;
}

// A stand-in for fetch(): the server added a status the client doesn't know yet.
const drifted = async (): Promise<unknown> => ({
  orders: [{ id: "o1", total: 10, status: "refunded" }],
  next: null,
});
fetchOrders(drifted).catch((error: unknown) => {
  if (error instanceof z.ZodError) {
    console.log(error.issues[0]?.path.join(".")); // orders.0.status
  }
});

// --- branded output types ------------------------------------------------------
// .brand() makes "validated" part of the type, like branded-types.ts, without
// a hand-written constructor.
const EmailSchema = z.email().brand<"Email">();
type Email = z.infer<typeof EmailSchema>;

function sendWelcome(to: Email): string {
  return `sent to ${to}`;
}
console.log(sendWelcome(EmailSchema.parse("ada@example.com"))); // sent to ada@example.com
// @ts-expect-error - a plain string has not been through the schema
sendWelcome("ada@example.com");

export { EnvSchema, loadEnv, OrderSchema, fetchOrders, EmailSchema, sendWelcome };
export type { Env, Order, Email };
