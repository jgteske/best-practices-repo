/**
 * A registry of factories: one table, checked for completeness.
 *
 * When the thing to build is described by data - a config file, a JSON payload,
 * a plugin manifest - the choice of constructor is a lookup. Keying that lookup
 * off a discriminated union turns "did we forget one?" into a compile error:
 * add a variant to the union and the registry below stops type-checking until
 * its factory exists.
 */

type WidgetSpec =
  | { kind: "chart"; series: readonly number[] }
  | { kind: "table"; columns: readonly string[]; rows: number }
  | { kind: "text"; body: string };

type Widget = {
  readonly kind: WidgetSpec["kind"];
  render: () => string;
};

// Key remapping turns the union into a lookup from discriminant to member, so
// the registry can demand that each factory receives *its own* spec type and
// nothing wider. See the mapped & conditional types page for the `as` clause.
type SpecByKind = { [S in WidgetSpec as S["kind"]]: S };

type WidgetFactories = {
  [K in keyof SpecByKind]: (spec: SpecByKind[K]) => Widget;
};

// Each factory is checked against its own spec: `spec.series` is available in
// the chart factory and nowhere else. Omit a kind, or hand one the wrong
// builder, and this object literal fails to compile.
const widgetFactories: WidgetFactories = {
  chart: (spec) => ({
    kind: "chart",
    render: () => `chart(${spec.series.join(", ")})`,
  }),
  table: (spec) => ({
    kind: "table",
    render: () => `table(${spec.columns.join(" | ")} x${spec.rows})`,
  }),
  text: (spec) => ({
    kind: "text",
    render: () => `text(${spec.body})`,
  }),
};

/**
 * Dispatch.
 *
 * The intersection in the parameter type is doing real work: it tells the
 * compiler that this spec's `kind` is the same `K` the factory was registered
 * under, so `widgetFactories[spec.kind]` resolves to a single function rather
 * than a union of three. `K` still infers from a plain `WidgetSpec` value, so
 * callers never write a type argument.
 *
 * Without it, `widgetFactories[spec.kind]` is a *union* of function types, and
 * calling a union requires an argument assignable to the intersection of their
 * parameters - which for a discriminated union is `never`. That error is the
 * single most confusing thing about table-driven dispatch in TypeScript.
 */
function createWidget<K extends WidgetSpec["kind"]>(
  spec: SpecByKind[K] & { kind: K },
): Widget {
  return widgetFactories[spec.kind](spec);
}

// A dashboard is now just data, and rendering it is a map.
const dashboard: readonly WidgetSpec[] = [
  { kind: "text", body: "Revenue" },
  { kind: "chart", series: [3, 7, 4] },
  { kind: "table", columns: ["region", "total"], rows: 12 },
];

console.log(dashboard.map((spec) => createWidget(spec).render()));
// [ 'text(Revenue)', 'chart(3, 7, 4)', 'table(region | total x12)' ]

export { createWidget, widgetFactories };
export type { WidgetSpec, Widget, SpecByKind, WidgetFactories };
