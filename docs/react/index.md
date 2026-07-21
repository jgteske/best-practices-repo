# React Best Practice Patterns

This guide focuses on the patterns that keep React components predictable as an
app grows: declaring and typing components, passing parameters (props) safely,
building and **chaining custom hooks**, composing **`onEvent` handlers**, and
keeping state and effects honest. Like the TypeScript guide, every code sample
on these pages is a real, `strict`-mode type-checked `.tsx` file under
[`examples/react`](https://github.com/jgteske/best-practices-repo/tree/main/examples/react)
in this repository, imported directly into the page - so the code you read here
is guaranteed to actually compile against React's own types.

## What's covered

<div class="vp-doc">

**Structure & Declarations**

| Page | Focus |
| --- | --- |
| [Component Declarations](./component-declarations) | Declaring components as plain typed functions, destructuring props with defaults, and why to skip `React.FC`. |
| [Props & Passing Parameters](./props-and-parameters) | Typing props precisely, `children` and slots, discriminated props that make illegal combinations impossible, and composition over prop drilling. |

**Sharing State & APIs**

| Page | Focus |
| --- | --- |
| [Context: State & APIs](./context) | Typed contexts with a guard hook, passing functions and whole APIs through context, modeling async readiness as a `status` union, and splitting contexts to avoid re-renders. |
| [When Elements & APIs Are Ready](./refs-and-availability) | The ref availability timeline, reacting to attach/detach with ref callbacks, and exposing a child's imperative API with `forwardRef` + `useImperativeHandle`. |

**Hooks**

| Page | Focus |
| --- | --- |
| [Custom Hooks & Hook Chaining](./custom-hooks-and-chaining) | Extracting logic into `use*` hooks, returning `[value, actions]` tuples, and *chaining* higher-level hooks on top of lower-level ones under the Rules of Hooks. |
| [When to useEffect / useCallback / useMemo](./hooks-when-to-use) | A decision guide for the built-in hooks - what each is for, and when a plain calculation or event handler is the right answer instead. |
| [State & Effects](./state-and-effects) | Deriving values instead of duplicating state, and writing effects with correct dependencies and race-safe cleanup. |

**Rendering**

| Page | Focus |
| --- | --- |
| [Rendering & Component Lifecycle](./rendering-and-lifecycle) | The render → commit → effects pipeline, mount order (render top-down, effects bottom-up), how a hook behaves across mount/update/unmount, and StrictMode. |

**Events**

| Page | Focus |
| --- | --- |
| [Event Handlers & Function Chaining](./event-handlers) | Typing `onEvent` handlers with React's synthetic event types, and composing several single-purpose handlers into one. |

**Reference**

| Page | Focus |
| --- | --- |
| [General Best Practices](./general-best-practices) | Keys, memoization, colocation, controlled inputs, and a quick checklist. |

</div>

## How to use this guide

Each page follows the same shape as the TypeScript guide: the problem, an
anti-pattern (what goes wrong without the practice), the recommended pattern
with a full working example, and a short summary. The pages are independent -
jump straight to whichever topic is relevant.

::: info Version
Examples are type-checked against React 18's types (`react-jsx` runtime), but
the patterns apply equally to React 19.
:::
