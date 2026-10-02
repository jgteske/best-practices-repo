import { useEffect, useState, type FormEvent } from "react";
import { HttpError, fetchJson, isAbortError, logError, tryCatch, toError } from "./errors";
import { useShowBoundary } from "./use-show-boundary";

type Profile = { name: string };
type Order = { id: string; total: number };

// Rule of thumb: an EXPECTED failure is UI state - show it next to the thing
// that failed and let the user fix it. An UNEXPECTED failure is a bug or an
// outage - escalate it to the nearest error boundary.

// #region event-handler
// Event handlers run outside render, so a boundary never sees their errors.
// try/catch is the right tool here.
export function ProfileForm({ initialName }: { initialName: string }) {
  const [name, setName] = useState(initialName);
  const [saving, setSaving] = useState(false);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const showBoundary = useShowBoundary();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setFieldError(null);
    try {
      await fetchJson<Profile>("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
    } catch (caught) {
      // Expected: the server rejected the input. Show it inline.
      if (caught instanceof HttpError && (caught.status === 400 || caught.status === 409)) {
        setFieldError("That name is invalid or already taken.");
        return;
      }
      // Unexpected: a 500, a network failure, a bug. Escalate.
      showBoundary(caught);
    } finally {
      // Runs on success, on `return` and on escalation, so the button can
      // never stay stuck in the "Saving..." state.
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <input value={name} onChange={(e) => setName(e.target.value)} aria-invalid={fieldError !== null} />
      {fieldError && <p role="alert">{fieldError}</p>}
      <button type="submit" disabled={saving}>
        {saving ? "Saving..." : "Save"}
      </button>
    </form>
  );
}
// #endregion event-handler

// #region effect
// Async work in an effect: tryCatch turns the rejection into a value, so the
// effect body reads top to bottom without a .then/.catch pyramid.
export function OrderList({ customerId }: { customerId: string }) {
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [notFound, setNotFound] = useState(false);
  const showBoundary = useShowBoundary();

  useEffect(() => {
    const controller = new AbortController();
    setOrders(null);
    setNotFound(false);

    void (async () => {
      const result = await tryCatch(
        fetchJson<Order[]>(`/api/customers/${customerId}/orders`, { signal: controller.signal }),
      );
      if (result.ok) {
        setOrders(result.value);
        return;
      }
      const { error } = result;
      if (isAbortError(error)) return; // our own cleanup cancelled it
      if (error instanceof HttpError && error.status === 404) {
        setNotFound(true); // expected: render an empty state
        return;
      }
      showBoundary(error); // unexpected
    })();

    return () => controller.abort();
  }, [customerId, showBoundary]);

  if (notFound) return <p>No such customer.</p>;
  if (orders === null) return <p>Loading orders...</p>;
  return (
    <ul>
      {orders.map((order) => (
        <li key={order.id}>
          {order.id}: {order.total.toFixed(2)}
        </li>
      ))}
    </ul>
  );
}
// #endregion effect

// #region fire-and-forget
// Work that does not affect the UI (analytics, prefetching) should never
// crash the page. Catch, report, carry on - but never swallow silently.
export function trackClick(label: string): void {
  fetch("/api/analytics", { method: "POST", body: JSON.stringify({ label }) }).catch((caught: unknown) =>
    logError(toError(caught), { label, source: "analytics" }),
  );
}
// #endregion fire-and-forget
