# Elements, `$$typeof` & Special Types

Components return **elements**: plain, immutable objects that describe what
should be on screen. Knowing what is inside that object helps you read React's
error messages and use keys correctly. It also explains why `<Fragment>`,
`<Suspense>`, `memo()` or a portal behave differently from your own components.
Every claim on this page is checked by
[`elements.test.tsx`](https://github.com/jgteske/best-practices-repo/tree/main/examples/react/elements/elements.test.tsx)
against the real React.

## What JSX turns into

JSX is only syntax. The compiler rewrites each tag into a function call
(`jsx(...)` with the `react-jsx` runtime, `React.createElement(...)` with the
classic one), and that call returns an object:

<<< ../../examples/react/elements/element-anatomy.tsx#anatomy

| Field | Meaning |
| --- | --- |
| `$$typeof` | The brand. `Symbol.for("react.element")` marks the object as a genuine element. |
| `type` | What to render. A string (`"div"`) is a DOM node, a function or class is a component, and a symbol or tagged object is one of the special types below. |
| `key` | Identity among siblings. Pulled out of props. |
| `ref` | Pulled out of props (React 18; React 19 passes `ref` as a normal prop). |
| `props` | Everything else, including `children`. |

Creating an element does **not** call your component. `<Greeting />` is just a
note that says "call `Greeting` with these props". React calls it later, while
rendering. That is why you can create elements freely and store them in
variables or pass them as props, and it costs almost nothing.

### `key` is not a prop

<<< ../../examples/react/elements/element-anatomy.tsx#key-not-a-prop

### Elements are immutable

<<< ../../examples/react/elements/element-anatomy.tsx#immutable

In development the element and its `props` are `Object.freeze`d. Never edit an
element after it is created. Build a new one, or change the state that produced it.

## Why `$$typeof` is a Symbol

`$$typeof` could have been a string. It is a Symbol for **security**. Suppose
your app renders a value from the server that it expected to be a string, and
an attacker has stored an object shaped like an element:

<<< ../../examples/react/elements/symbol-guard.tsx#forged

JSON has no Symbols, so data parsed from JSON can never carry the real brand.
React checks `$$typeof` before treating an object as an element. A forged
object fails that check, and rendering it throws *"Objects are not valid as a
React child"*. No `<a href="javascript:...">` is created. The same rule means a
real element cannot be sent through JSON:

<<< ../../examples/react/elements/symbol-guard.tsx#round-trip

This protects you from forged elements, but it is not a sanitizer. Keep treating
outside data as data:

<<< ../../examples/react/elements/symbol-guard.tsx#render-untrusted

::: tip `Symbol.for`, not `Symbol`
React uses the **global** symbol registry (`Symbol.for`), so two copies of React
in one bundle still agree on what an element is. Two copies still break hooks,
though. See [Dependency Resolution](../javascript/dependency-resolution).
:::

## Special element types

React decides what to do with an element by looking at its `type`. There are
three shapes:

1. **Host**: a string such as `"div"`. React creates a DOM node.
2. **Component**: a function or class. React calls it.
3. **Built-in**: the type *is* a `Symbol.for("react.*")` (`Fragment`,
   `StrictMode`, `Suspense`, `Profiler`), or it is an object whose `$$typeof` is
   one (`memo`, `forwardRef`, `lazy`, context `Provider`/`Consumer`).

This function sorts element types into those cases, much like React's own
reconciler does:

<<< ../../examples/react/elements/special-types.tsx#kind-of

<div class="vp-doc">

| You write | `type` / `$$typeof` | What React does |
| --- | --- | --- |
| `<div>` | `"div"` | Creates a DOM node |
| `<Button>` | the function | Calls it with props |
| `<>` / `<Fragment>` | `Symbol(react.fragment)` | Renders its children with no wrapper node |
| `<StrictMode>` | `Symbol(react.strict_mode)` | Adds development-only checks (double render, double effects) |
| `<Suspense>` | `Symbol(react.suspense)` | Shows the `fallback` while a child is loading |
| `<Profiler>` | `Symbol(react.profiler)` | Reports render timings to `onRender` |
| `memo(C)` | `{ $$typeof: Symbol(react.memo) }` | Skips re-rendering when props are shallow-equal |
| `forwardRef(fn)` | `{ $$typeof: Symbol(react.forward_ref) }` | Passes `ref` as a second argument |
| `lazy(load)` | `{ $$typeof: Symbol(react.lazy) }` | Loads the code first, suspending until it arrives |
| `<Ctx.Provider>` | `{ $$typeof: Symbol(react.provider) }` | Provides a context value |
| `<Ctx.Consumer>` | `{ $$typeof: Symbol(react.context) }` | Reads it through a render function |
| `createPortal(...)` | element `$$typeof` is `Symbol(react.portal)` | Renders the children into another DOM node |

</div>

Note that `memo`, `forwardRef` and `lazy` **return objects, not functions**:

<<< ../../examples/react/elements/special-types.tsx#wrappers

So you can't call `MemoLabel(props)` directly, and `typeof MemoLabel` is
`"object"`. Libraries that check "is this a component?" with
`typeof x === "function"` get these wrong.

### Fragment

<<< ../../examples/react/elements/special-types.tsx#fragment

The rendered `<dl>` contains only `dt`/`dd` pairs. The fragments leave no trace
in the DOM.

### Suspense + lazy

<<< ../../examples/react/elements/special-types.tsx#suspense-lazy

<<< ../../examples/react/elements/lazy-chart.tsx

### Profiler

<<< ../../examples/react/elements/special-types.tsx#profiler

`onRender(id, phase, actualDuration, baseDuration, startTime, commitTime)` runs
after every commit of that subtree. Profiling adds overhead, and production
builds turn it off unless you use the profiling build.

### Portals

<<< ../../examples/react/elements/special-types.tsx#portal

A portal moves the **DOM** but not the **React tree**. The dialog's DOM is
inside `document.body`, yet a click inside it still reaches an `onClick` on
the React parent that rendered `<Modal>`, and context from above still applies.
Use portals for modals, tooltips and toasts that must escape `overflow: hidden`
or stacking contexts.

## Working with `children` as elements

`children` can be one element, a string, an array, nested arrays, or `null`.
Use the `Children` helpers instead of assuming it is an array:

<<< ../../examples/react/elements/children-utilities.tsx#to-array

`isValidElement` answers "is this an element?", which is what a slot needs:

<<< ../../examples/react/elements/children-utilities.tsx#slot-guard

### Avoid `cloneElement` for passing props

<<< ../../examples/react/elements/children-utilities.tsx#clone-anti

<<< ../../examples/react/elements/children-utilities.tsx#explicit

React's own docs list `Children` and `cloneElement` as legacy APIs. They are
fine for reading children. For giving children data, use explicit props,
render props or [context](./context).

## React 19 differences

| | React 18 | React 19 |
| --- | --- | --- |
| Element brand | `Symbol.for("react.element")` | `Symbol.for("react.transitional.element")` |
| `ref` | Separate field, not in props | A regular prop; `forwardRef` is no longer needed |
| Context | `<Ctx.Provider>` (`react.provider`) | `<Ctx>` is the provider (`react.context`); `Consumer` is `react.consumer` |

Because the brand changed, elements made by React 18 are not valid in React 19.
This is one more reason to have exactly one copy of React in your bundle.

## Summary

- JSX creates **plain, frozen objects**. Creating an element does not render it.
- `key` and (in React 18) `ref` are **taken out of props**.
- `$$typeof` is a **Symbol so that JSON can't forge elements**. That stops
  element injection, but you still have to validate outside data.
- An element's `type` is a host string, a component, or a **`react.*` symbol /
  tagged object**. `memo`, `forwardRef` and `lazy` return objects, not functions.
- Use **Fragment** to group siblings, **Suspense** for loading states,
  **Profiler** to measure, and **portals** to render elsewhere in the DOM while
  staying in the same React tree.
- Read children with `Children.toArray` / `isValidElement`. Pass data with
  **explicit props or context**, not `cloneElement`.
