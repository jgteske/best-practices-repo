import { createElement, type ReactElement } from "react";

// JSX is only syntax. With the `react-jsx` runtime, the compiler turns
//
//   <Greeting key="g1" name="Ada">Hi</Greeting>
//
// into roughly `jsx(Greeting, { name: "Ada", children: "Hi" }, "g1")`. The
// classic runtime produced `React.createElement(...)`. Either way the result is
// a plain object - a *description* of UI, not the UI itself.

export function Greeting({ name, children }: { name: string; children?: React.ReactNode }) {
  return (
    <p>
      {children}, {name}
    </p>
  );
}

// #region anatomy
// The fields React puts on every element. `$$typeof` is not part of the public
// `ReactElement` type, so we read it through a narrow structural type.
export type ElementInternals = {
  $$typeof: symbol;
  type: ReactElement["type"];
  key: string | null;
  ref: unknown;
  props: Record<string, unknown>;
};

export const internals = (element: ReactElement) => element as unknown as ElementInternals;

export const viaJsx = (
  <Greeting key="g1" name="Ada">
    Hi
  </Greeting>
);

// The same element, written without JSX.
export const viaCreateElement = createElement(Greeting, { key: "g1", name: "Ada" }, "Hi");

// internals(viaJsx) looks like:
// {
//   $$typeof: Symbol(react.element),     // "this object is a React element"
//   type: Greeting,                      // a string ("div") or a component
//   key: "g1",                           // pulled OUT of props
//   ref: null,                           // pulled OUT of props (React 18)
//   props: { name: "Ada", children: "Hi" },
// }
// #endregion anatomy

// #region key-not-a-prop
// `key` (and `ref` in React 18) are consumed by React and never reach the
// component: `props.key` is undefined (and warns in development). A component
// that needs the id must receive it under another name.
function Row({ id, label }: { id: string; label: string }) {
  return <li data-id={id}>{label}</li>;
}

export const rows = ["a", "b"].map((id) => <Row key={id} id={id} label={id.toUpperCase()} />);
// #endregion key-not-a-prop

// #region immutable
// Elements are snapshots. In development React freezes the element and its
// props, so mutating one throws in strict-mode code (ES modules are strict).
// To "change" an element, create a new one - which is what re-rendering does.
export function tryToMutate(element: ReactElement<{ name: string }>): "threw" | "mutated" {
  try {
    element.props.name = "Grace";
    return "mutated";
  } catch {
    return "threw";
  }
}
// #endregion immutable
