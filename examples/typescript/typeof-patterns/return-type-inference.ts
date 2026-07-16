/**
 * Deriving types from function return values with `ReturnType<typeof fn>`
 * instead of hand-writing (and duplicating) a matching interface.
 */

// ANTI-PATTERN: a hand-written type that mirrors a function's return shape.
// The moment `createInvoiceBad` changes - a renamed field, a new discount
// field, a status field going from `string` to a union - this interface
// silently drifts out of sync, because nothing forces it to be updated.
interface InvoiceBad {
  id: string;
  total: number;
  currency: string;
}

function createInvoiceBad(items: { price: number }[]): InvoiceBad {
  return {
    id: crypto.randomUUID(),
    total: items.reduce((sum, item) => sum + item.price, 0),
    currency: "USD",
  };
}

// RECOMMENDED: let the function be the single source of truth, and derive
// the type from it. Now the type *cannot* drift, because it's computed from
// the implementation on every compile.
function createInvoice(items: { price: number }[]) {
  return {
    id: crypto.randomUUID(),
    total: items.reduce((sum, item) => sum + item.price, 0),
    currency: "USD" as const,
    issuedAt: new Date(),
  };
}

type Invoice = ReturnType<typeof createInvoice>;
// Invoice = { id: string; total: number; currency: "USD"; issuedAt: Date }

function sendInvoice(invoice: Invoice): void {
  console.log(`sending invoice ${invoice.id} for ${invoice.total} ${invoice.currency}`);
}

sendInvoice(createInvoice([{ price: 10 }, { price: 25 }]));

// The same idea applies to function *arguments* via `Parameters<typeof fn>`,
// which is handy for wrapping/decorating an existing function without
// retyping its signature.
type CreateInvoiceArgs = Parameters<typeof createInvoice>;
// CreateInvoiceArgs = [items: { price: number }[]]

function createInvoiceWithLogging(...args: CreateInvoiceArgs): Invoice {
  console.log("creating invoice with", args[0].length, "items");
  return createInvoice(...args);
}

// And for async functions, combine with `Awaited<...>` to unwrap the Promise.
async function fetchInvoice(id: string) {
  const response = await fetch(`/api/invoices/${id}`);
  return (await response.json()) as Invoice;
}

type FetchedInvoice = Awaited<ReturnType<typeof fetchInvoice>>;
// FetchedInvoice = Invoice (the Promise<Invoice> gets unwrapped to Invoice)

export { createInvoiceBad, createInvoice, createInvoiceWithLogging, fetchInvoice, sendInvoice };
export type { InvoiceBad, Invoice, CreateInvoiceArgs, FetchedInvoice };
