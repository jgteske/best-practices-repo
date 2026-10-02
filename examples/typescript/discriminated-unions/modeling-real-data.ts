/**
 * Modeling real data with unions: payment methods, API responses, and
 * flags that should have been states.
 *
 * The rule from illegal-states.ts applied to everyday shapes: whenever
 * "field X only makes sense when Y", that's a union waiting to be written.
 */

// --- optional fields that depend on each other -----------------------------
// SMELL: which fields are set depends on `type`, but the type doesn't say so.
interface PaymentMethodBad {
  type: "card" | "paypal" | "invoice";
  last4?: string; // card only
  expires?: string; // card only
  email?: string; // paypal only
  dueDays?: number; // invoice only
}

// Each variant lists exactly its own fields.
type PaymentMethod =
  | { type: "card"; last4: string; expires: string }
  | { type: "paypal"; email: string }
  | { type: "invoice"; dueDays: number };

function describe(method: PaymentMethod): string {
  switch (method.type) {
    case "card":
      return `card ending ${method.last4}, expires ${method.expires}`;
    case "paypal":
      return `PayPal (${method.email})`;
    case "invoice":
      return `invoice, due in ${method.dueDays} days`;
  }
}

// @ts-expect-error - a card without its expiry date can't be constructed
const halfCard: PaymentMethod = { type: "card", last4: "4242" };

// --- boolean flags that are really one state -------------------------------
// SMELL: 2^3 = 8 combinations, only 4 are meaningful. Is `isLoading && isError` possible?
interface UploadFlags {
  isUploading: boolean;
  isDone: boolean;
  isError: boolean;
  progress?: number;
}

type Upload =
  | { state: "idle" }
  | { state: "uploading"; progress: number }
  | { state: "done"; url: string }
  | { state: "failed"; error: string; retryable: boolean };

// --- API responses ----------------------------------------------------------
// Model the wire format you actually get, then narrow once at the boundary.
type ApiResponse<T> =
  | { ok: true; data: T; nextCursor: string | null }
  | { ok: false; error: { code: "unauthorized" | "rate_limited" | "server"; retryAfter?: number } };

function handle(response: ApiResponse<string[]>): string {
  if (!response.ok) {
    // Narrowing on `ok` exposes `error`; the nested `code` is a union of its own.
    return response.error.code === "rate_limited"
      ? `retry in ${response.error.retryAfter ?? 1}s`
      : `failed: ${response.error.code}`;
  }
  return response.nextCursor === null
    ? `${response.data.length} items (last page)`
    : `${response.data.length} items, more after ${response.nextCursor}`;
}

// --- narrowing without a shared discriminant: `in` --------------------------
// For unions you don't control (third-party types), `in` checks for a key
// and narrows to the members that declare it.
type Circle = { radius: number };
type Rect = { width: number; height: number };

function area(shape: Circle | Rect): number {
  return "radius" in shape ? Math.PI * shape.radius ** 2 : shape.width * shape.height;
}

console.log(describe({ type: "paypal", email: "ada@example.com" })); // PayPal (ada@example.com)
console.log(handle({ ok: true, data: ["a", "b"], nextCursor: null })); // 2 items (last page)
console.log(handle({ ok: false, error: { code: "rate_limited", retryAfter: 30 } })); // retry in 30s
console.log(area({ width: 2, height: 3 })); // 6
console.log(halfCard);

export { describe, handle, area };
export type { PaymentMethodBad, PaymentMethod, UploadFlags, Upload, ApiResponse };
