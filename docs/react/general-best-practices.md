# General Best Practices

A reference checklist of smaller patterns that don't need a page of their own.

## Stable, unique keys - never the array index

`key` tells React which list item is which across renders. It must be a
**stable, unique identity** for the item - a domain id, not the array index.

<<< ../../examples/react/general/list-keys.tsx

Index keys break the instant the list is reordered, filtered, or has an item
inserted: React reuses the wrong DOM node and component state "teleports" to the
wrong row. Only use the index when the list is static and never reordered.

## Memoize children only when it pays off

`memo` skips a child's re-render when its props are unchanged **by reference** -
which only helps if the callbacks and objects you pass are *also* stable. That's
why `memo` and `useCallback` come as a pair:

<<< ../../examples/react/general/memo-child.tsx

Apply this to fix a **measured** re-render problem, not reflexively. For most
components, re-rendering is cheap and the memoization machinery costs more than
it saves. See
[When to useEffect / useCallback / useMemo](./hooks-when-to-use).

## Controlled inputs

Prefer **controlled** form inputs - `value` comes from state, `onChange` updates
it - so React state is the single source of truth (as in
[Event Handlers](./event-handlers)). Reach for uncontrolled inputs with a `ref`
only for simple, write-once forms or when integrating non-React widgets.

## Colocate state; lift only when shared

Keep state as **close to where it's used** as possible. Lift it to a common
ancestor only when two siblings genuinely need to share it. Global state (and
Context) is a last resort, not a starting point - it makes components harder to
move and test.

## A few more quick rules

- **Don't mutate state.** Produce a new object/array (`setItems([...items, x])`);
  React compares by reference to decide what changed.
- **Prefer functional updates** when the next state depends on the previous:
  `setCount((c) => c + 1)`. It's correct even across batched updates.
- **One component per concern.** If a component juggles several unrelated
  responsibilities, split it - or extract a [custom hook](./custom-hooks-and-chaining).
- **Type children as `React.ReactNode`**, event handlers with React's
  [synthetic event types](./event-handlers), and props with
  [precise unions](./props-and-parameters).
- **Turn on the ESLint hooks plugin** (`rules-of-hooks`, `exhaustive-deps`) and
  fix its warnings rather than silencing them.

## Checklist

- [ ] Stable domain-id keys, never array indices
- [ ] State derived, not duplicated
- [ ] Effects only for external systems, with correct deps and cleanup
- [ ] `useCallback`/`useMemo`/`memo` used only where identity/cost matters
- [ ] Controlled inputs; state colocated and lifted only when shared
- [ ] Props, handlers, and children precisely typed
- [ ] `eslint-plugin-react-hooks` enabled and green
