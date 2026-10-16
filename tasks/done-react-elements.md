# DONE - React: Elements, `$$typeof` symbols & special element types

New page `docs/react/elements-and-special-types.md` backed by `examples/react/elements/`.

- [x] `element-anatomy.tsx` - what JSX compiles to, the element object, key/ref outside props, frozen in dev
- [x] `symbol-guard.tsx` - why `$$typeof` is a Symbol (JSON can't forge an element), `isValidElement`
- [x] `special-types.tsx` (+ `lazy-chart.tsx`) - `kindOf()` over every element type symbol, plus Fragment/Suspense+lazy/Profiler/portal/memo/forwardRef/Provider in use
- [x] `children-utilities.tsx` - `Children.toArray`, `isValidElement` slots, `cloneElement` vs. explicit props
- [x] `elements.test.tsx` - 26 tests proving each claim against the real React 18.3.1
- [x] page + sidebar (React: Components & Props) + index table

## Review

- `npm run typecheck`, `npm run check:react` (7 files, 46 tests) and `npm run docs:build` all pass.
- Symbol values were checked directly against the installed React 18.3.1 before writing the docs.
- The first draft of the test asserted that `props` has no `key` property. In React's dev build, `props.key`
  is a getter that returns undefined and warns, so the test now asserts that behavior instead.
- The page has a React 19 table (`react.transitional.element`, ref as a prop, `<Ctx>` as provider).
  Nothing tests it, because the repo pins React 18.
