/**
 * The unit under test: a tiny shopping cart with one injected dependency.
 *
 * Note what makes it testable - the clock and the tax lookup arrive as
 * arguments rather than being imported. There is nothing to monkey-patch.
 */

export class EmptyCartError extends Error {
  name = "EmptyCartError";
}

export function subtotal(items) {
  return items.reduce((sum, item) => sum + item.priceInCents * item.quantity, 0);
}

export function checkout(items, { taxRate = 0, now = () => new Date() } = {}) {
  if (items.length === 0) throw new EmptyCartError("cannot check out an empty cart");

  const goods = subtotal(items);
  const tax = Math.round(goods * taxRate);

  return {
    goods,
    tax,
    total: goods + tax,
    placedAt: now().toISOString(),
  };
}

export async function fetchPrice(sku, { lookup }) {
  const price = await lookup(sku);
  if (price === undefined) throw new Error(`unknown sku: ${sku}`, { cause: { sku } });
  return price;
}
