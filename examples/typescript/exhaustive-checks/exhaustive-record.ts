/**
 * An alternative to `switch` + `assertNever`: a `Record<Union, T>` lookup
 * object. TypeScript already requires every key of a `Record<K, T>` to be
 * present, so this gets exhaustiveness checking "for free," with no helper
 * function needed - at the cost of only working for simple key -> value
 * mappings (not arbitrary branching logic).
 */

type OrderStatus = "pending" | "shipped" | "delivered" | "cancelled";

// If a new status is added to `OrderStatus` and this object isn't updated,
// TypeScript reports "Property '<newStatus>' is missing" right here - no
// `default` branch or `assertNever` call required.
const statusLabel: Record<OrderStatus, string> = {
  pending: "Pending",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

const statusColor: Record<OrderStatus, string> = {
  pending: "gray",
  shipped: "blue",
  delivered: "green",
  cancelled: "red",
};

function renderStatusBadge(status: OrderStatus): string {
  return `<span style="color:${statusColor[status]}">${statusLabel[status]}</span>`;
}

export { statusLabel, statusColor, renderStatusBadge };
export type { OrderStatus };
