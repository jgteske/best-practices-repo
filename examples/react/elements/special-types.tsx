import {
  Component,
  Fragment,
  Profiler,
  StrictMode,
  Suspense,
  createContext,
  forwardRef,
  lazy,
  memo,
  type ProfilerOnRenderCallback,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

// #region kind-of
// An element's `type` says what React should do with it. Host and component
// types are strings and functions; everything else is tagged with a
// `Symbol.for("react.*")` - either the type *is* the symbol (Fragment,
// StrictMode, ...) or it is an object whose `$$typeof` is (memo, lazy, ...).
// This mirrors the switch React's reconciler runs on every element.
export type ElementKind =
  | "host" | "function" | "class"
  | "fragment" | "strict_mode" | "suspense" | "profiler"
  | "memo" | "forward_ref" | "lazy" | "provider" | "context"
  | "unknown";

const SYMBOL_KINDS = new Map<symbol, ElementKind>([
  [Symbol.for("react.fragment"), "fragment"],
  [Symbol.for("react.strict_mode"), "strict_mode"],
  [Symbol.for("react.suspense"), "suspense"],
  [Symbol.for("react.profiler"), "profiler"],
  [Symbol.for("react.memo"), "memo"],
  [Symbol.for("react.forward_ref"), "forward_ref"],
  [Symbol.for("react.lazy"), "lazy"],
  [Symbol.for("react.provider"), "provider"], // React 18: <Ctx.Provider>
  [Symbol.for("react.context"), "context"], // React 18: <Ctx.Consumer>; React 19: <Ctx>
]);

export function kindOf(type: unknown): ElementKind {
  if (typeof type === "string") return "host"; // "div", "svg", ...
  if (typeof type === "function") {
    // Class components inherit this marker from React.Component.
    return (type as { prototype?: { isReactComponent?: unknown } }).prototype?.isReactComponent ? "class" : "function";
  }
  if (typeof type === "symbol") return SYMBOL_KINDS.get(type) ?? "unknown";
  if (typeof type === "object" && type !== null && "$$typeof" in type) {
    return SYMBOL_KINDS.get((type as { $$typeof: symbol }).$$typeof) ?? "unknown";
  }
  return "unknown";
}
// #endregion kind-of

// #region wrappers
// memo, forwardRef and lazy don't return functions - they return small tagged
// objects that wrap your component. React unwraps them while rendering.
function PlainLabel({ text }: { text: string }) {
  return <span>{text}</span>;
}

class ClassLabel extends Component<{ text: string }> {
  override render() {
    return <span>{this.props.text}</span>;
  }
}

export const MemoLabel = memo(PlainLabel); // { $$typeof: Symbol(react.memo), type: PlainLabel, compare: null }
export const FancyInput = forwardRef<HTMLInputElement, { label: string }>(function FancyInput({ label }, ref) {
  return <input aria-label={label} ref={ref} />; // { $$typeof: Symbol(react.forward_ref), render: FancyInput }
});
export const LazyChart = lazy(() => import("./lazy-chart")); // { $$typeof: Symbol(react.lazy), ... }

export const ThemeContext = createContext<"light" | "dark">("light");

export const samples = {
  host: <div />,
  function: <PlainLabel text="a" />,
  class: <ClassLabel text="a" />,
  fragment: <></>,
  strict_mode: <StrictMode />,
  suspense: <Suspense />,
  profiler: <Profiler id="p" onRender={() => {}} />,
  memo: <MemoLabel text="a" />,
  forward_ref: <FancyInput label="a" />,
  lazy: <LazyChart points={[]} />,
  provider: <ThemeContext.Provider value="dark" />,
  context: <ThemeContext.Consumer>{(theme) => theme}</ThemeContext.Consumer>,
} as const;
// #endregion wrappers

// #region fragment
// Fragment groups siblings without adding a DOM node. Use the long form only
// when you need a `key` - the `<>` shorthand can't take one.
export function Glossary({ terms }: { terms: { term: string; meaning: string }[] }) {
  return (
    <dl>
      {terms.map(({ term, meaning }) => (
        <Fragment key={term}>
          <dt>{term}</dt>
          <dd>{meaning}</dd>
        </Fragment>
      ))}
    </dl>
  );
}
// #endregion fragment

// #region suspense-lazy
// Suspense shows its fallback while anything below it is still loading - here,
// the code for a lazy component. Put the boundary where a loading state makes
// sense to the user, not around every lazy component.
export function Dashboard({ points }: { points: number[] }) {
  return (
    <section>
      <h2>Sales</h2>
      <Suspense fallback={<p role="status">Loading chart…</p>}>
        <LazyChart points={points} />
      </Suspense>
    </section>
  );
}
// #endregion suspense-lazy

// #region profiler
// Profiler measures how long a subtree took to render. The callback runs after
// each commit; send the numbers somewhere instead of logging every render.
export function Measured({ id, onRender, children }: { id: string; onRender: ProfilerOnRenderCallback; children: ReactNode }) {
  return (
    <Profiler id={id} onRender={onRender}>
      {children}
    </Profiler>
  );
}
// #endregion profiler

// #region portal
// createPortal returns an element tagged Symbol(react.portal). Its children
// render into another DOM node, but stay in the React tree: context still
// flows in and events still bubble to React ancestors.
export function Modal({ title, children, container = document.body }: { title: string; children: ReactNode; container?: Element }) {
  return createPortal(
    <div role="dialog" aria-modal="true" aria-label={title}>
      {children}
    </div>,
    container,
  );
}
// #endregion portal
