/**
 * Visitor: a union plus an ordinary function.
 *
 * Visitor exists in object-oriented languages to add an operation to a closed
 * hierarchy without editing every class in it - double dispatch as a workaround
 * for the absence of pattern matching. A discriminated union plus a `switch`
 * *is* that: each new operation is a new function, and no existing type is
 * touched.
 */

type Expr =
  | { readonly kind: "literal"; readonly value: number }
  | { readonly kind: "add"; readonly left: Expr; readonly right: Expr }
  | { readonly kind: "multiply"; readonly left: Expr; readonly right: Expr }
  | { readonly kind: "negate"; readonly operand: Expr };

// Operation one. Note that `Expr` did not have to know this function exists -
// no `accept(visitor)` method, no visitor interface.
function evaluate(node: Expr): number {
  switch (node.kind) {
    case "literal":
      return node.value;
    case "add":
      return evaluate(node.left) + evaluate(node.right);
    case "multiply":
      return evaluate(node.left) * evaluate(node.right);
    case "negate":
      return -evaluate(node.operand);
  }
}

// Operation two, added without touching operation one or the union.
function format(node: Expr): string {
  switch (node.kind) {
    case "literal":
      return String(node.value);
    case "add":
      return `(${format(node.left)} + ${format(node.right)})`;
    case "multiply":
      return `(${format(node.left)} * ${format(node.right)})`;
    case "negate":
      return `-${format(node.operand)}`;
  }
}

const expression: Expr = {
  kind: "multiply",
  left: { kind: "add", left: { kind: "literal", value: 2 }, right: { kind: "literal", value: 3 } },
  right: { kind: "negate", operand: { kind: "literal", value: 4 } },
};

console.log(format(expression)); // ((2 + 3) * -4)
console.log(evaluate(expression)); // -20

/**
 * The handler-record form, when you want the visitor as a *value*.
 *
 * A `switch` covers most cases, but a record of handlers can be passed around,
 * partially overridden, or built at runtime - the closest thing to a visitor
 * object. `match` gives it a fully checked signature: every kind must be
 * handled, and each handler receives its own narrowed member.
 */
function match<T extends { kind: string }, R>(
  value: T,
  handlers: { [K in T["kind"]]: (value: Extract<T, { kind: K }>) => R },
): R {
  const handler = handlers[value.kind as T["kind"]];
  // The single cast in the pattern, contained in one helper: indexing with a
  // union key yields a *union of functions*, whose callable parameter is the
  // intersection of theirs - `never` for a discriminated union. The discriminant
  // guarantees the pairing at runtime; the signature above keeps every caller
  // honest.
  return handler(value as Extract<T, { kind: T["kind"] }>);
}

// Counting nodes: a different result type, same union, still no changes to it.
const depth = (node: Expr): number =>
  match<Expr, number>(node, {
    literal: () => 1,
    add: (n) => 1 + Math.max(depth(n.left), depth(n.right)),
    multiply: (n) => 1 + Math.max(depth(n.left), depth(n.right)),
    negate: (n) => 1 + depth(n.operand),
  });

console.log(depth(expression)); // 3

export { evaluate, format, match, depth };
export type { Expr };
