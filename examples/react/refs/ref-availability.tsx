import { useEffect, useRef } from "react";

// "When is the DOM element available?" NOT during render - `ref.current` is
// `null` while React is still computing JSX. React fills it in during COMMIT,
// before effects run. So the first place you may safely touch the node is an
// effect (or an event handler), never the render body.

export function AutoFocusInput() {
  // Initialise to null; the element type is the generic parameter.
  const inputRef = useRef<HTMLInputElement>(null);

  // ❌ Reading inputRef.current here would be null - the <input> doesn't exist
  //    yet on the first render.

  useEffect(() => {
    // ✅ By the time effects run, React has attached the node. Guard for null to
    //    satisfy the type (and the rare case the element isn't mounted).
    inputRef.current?.focus();
  }, []); // run once, after mount.

  return <input ref={inputRef} placeholder="Focused on mount" />;
}

// Timeline:  render (ref = null) -> commit (ref = <input>) -> effect (focus)
