import { isValidElement } from "react";

// #region forged
// Why is `$$typeof` a Symbol and not a string like "react.element"?
//
// Imagine a server that stores user profiles as JSON and an app that renders a
// field it expected to be a string. An attacker saves this instead:
const attackerJson = JSON.stringify({
  $$typeof: "react.element", // the best JSON can do: a string, not a Symbol
  type: "a",
  key: null,
  ref: null,
  props: { href: "javascript:alert(document.cookie)", children: "Click me" },
});

// If React trusted any object shaped like an element, rendering `bio` would
// create a real <a href="javascript:..."> link. It doesn't: JSON can't contain
// Symbols, so a parsed object never carries the real `$$typeof` and React
// refuses to treat it as an element.
export const bio: unknown = JSON.parse(attackerJson);

export const looksLikeElement = isValidElement(bio); // false
// #endregion forged

// #region round-trip
// The same rule means a real element doesn't survive serialization either:
// JSON.stringify silently drops Symbol-valued properties.
export const real = <a href="/docs">Docs</a>;
export const afterRoundTrip: unknown = JSON.parse(JSON.stringify(real));
// isValidElement(real) === true, isValidElement(afterRoundTrip) === false
// #endregion round-trip

// #region render-untrusted
// Treat data from outside as data. Render strings as text (React escapes them),
// and refuse anything else instead of passing it to JSX.
export function UntrustedField({ value }: { value: unknown }) {
  if (typeof value === "string" || typeof value === "number") return <span>{value}</span>;
  return <span className="invalid">[unsupported value]</span>;
}
// #endregion render-untrusted

// Symbol.for() uses the global symbol registry, so two copies of React in one
// bundle still agree on what an element is. Duplicate copies still break hooks,
// though - see "Dependency Resolution" in the JavaScript guide.
export const ELEMENT_SYMBOL = Symbol.for("react.element");
