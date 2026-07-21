import { useMemo, useState } from "react";

// Don't store in state what you can compute from existing state or props.
// Duplicated state drifts out of sync; derived values never can. Compute during
// render, and reach for `useMemo` only when the computation is genuinely heavy.

type Product = { id: string; name: string; price: number };

export function ProductList({ products }: { products: readonly Product[] }) {
  // The ONLY real state is the search query. Everything else is derived.
  const [query, setQuery] = useState("");

  // Derived: filtered list. Memoized because it maps/filters on every keystroke.
  const filtered = useMemo(
    () =>
      products.filter((p) =>
        p.name.toLowerCase().includes(query.toLowerCase()),
      ),
    [products, query],
  );

  // Derived: a plain calculation - cheap, so no memo needed. Storing this in a
  // separate useState would be a bug waiting to happen.
  const total = filtered.reduce((sum, p) => sum + p.price, 0);

  return (
    <div>
      <input
        value={query}
        placeholder="Search products"
        onChange={(e) => setQuery(e.target.value)}
      />
      <ul>
        {filtered.map((p) => (
          <li key={p.id}>
            {p.name} - ${p.price}
          </li>
        ))}
      </ul>
      <strong>Total: ${total}</strong>
    </div>
  );
}
