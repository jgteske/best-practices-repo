import { useCallback, useState } from "react";

// A custom hook is just a function whose name starts with `use` and that calls
// other hooks. Extract stateful logic into one so components stay declarative
// and the logic becomes testable and reusable.

// Returning a `[value, actions]` tuple with `as const` gives callers precise,
// positional types (like useState) and lets them rename on destructure.
export function useToggle(initial = false) {
  const [on, setOn] = useState(initial);

  // Wrap updater callbacks in useCallback so their identity is stable across
  // renders. Stable handlers are safe to pass to memoized children and to list
  // in other hooks' dependency arrays without causing needless re-runs.
  const toggle = useCallback(() => setOn((prev) => !prev), []);
  const setTrue = useCallback(() => setOn(true), []);
  const setFalse = useCallback(() => setOn(false), []);

  return [on, { toggle, setTrue, setFalse }] as const;
}

// Consuming component reads like plain English - all the wiring lives in the hook.
export function Disclosure() {
  const [open, { toggle }] = useToggle();
  return (
    <div>
      <button onClick={toggle}>{open ? "Hide" : "Show"} details</button>
      {open && <p>Extra details revealed on demand.</p>}
    </div>
  );
}
