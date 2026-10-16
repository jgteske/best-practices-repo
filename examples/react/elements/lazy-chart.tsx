// Loaded on demand by `lazy(() => import("./lazy-chart"))`. `lazy` needs the
// component as the module's default export.
export default function Chart({ points }: { points: number[] }) {
  return <ol aria-label="chart">{points.map((p, i) => <li key={i}>{p}</li>)}</ol>;
}
