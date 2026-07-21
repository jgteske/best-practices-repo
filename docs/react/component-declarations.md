# Component Declarations

How you *declare* a component sets the tone for everything else - its props
contract, its defaults, and how it reads at a glance. The recommendation is
boring on purpose: **a plain function with an explicit, named props type.**

## The recommended shape

<<< ../../examples/react/component-declarations/function-component.tsx

Three things are deliberate here:

1. **A named `type` for props** (`AvatarProps`), exported alongside the
   component. Consumers can import the type; tooling can show it on hover; and
   the contract has one obvious home.
2. **Destructuring with defaults in the parameter list.** The signature answers
   "what does this accept, and what are the defaults?" in one place. No separate
   `defaultProps` object to drift out of sync.
3. **No explicit return type.** TypeScript infers `JSX.Element`; annotating it
   adds noise without adding safety.

## Anti-pattern: `React.FC`

```tsx
// Avoid:
const Avatar: React.FC<AvatarProps> = ({ src, alt, size = 40 }) => { /* ... */ };
```

`React.FC` was the old default, but it:

- historically injected an implicit `children` prop even for components that
  render none;
- makes **generic** components awkward (you can't write `React.FC<Props<T>>`
  and keep `T` inferable);
- buys you nothing a plainly-typed function parameter doesn't already give.

Type the **props parameter**, not the function variable.

## Function declaration vs. arrow const

Both compile to the same thing. Prefer a **function declaration**
(`function Avatar(...)`) for top-level components because it:

- hoists, so file ordering is free;
- shows a real name in React DevTools and stack traces;
- reads as "this file exports a component."

Reach for an arrow const when you genuinely need an expression - e.g. wrapping
in `memo` (see [General Best Practices](./general-best-practices)) or defining a
tiny local component inside another function.

## Summary

- Declare components as **plain functions** with an **exported, named props
  type**.
- **Destructure props and set defaults in the parameter list.**
- **Skip `React.FC`**; type the props parameter instead.
- Let the return type be **inferred**.
