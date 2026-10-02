import { useCallback, useState } from "react";
import { toError } from "./errors";

// Boundaries only catch errors thrown while React is RENDERING. An error thrown
// in an event handler, a `setTimeout` or a rejected promise happens outside
// render, so no boundary ever sees it.
//
// The fix: hand the error back to React as a state update whose updater
// throws. React runs updaters during the next render, so the throw happens
// *inside* render, and the nearest boundary above this component catches it.

export function useShowBoundary(): (caught: unknown) => void {
  const [, setState] = useState<null>(null);

  // Stable identity (the setter never changes), so it is safe in dependency
  // arrays and as a prop.
  return useCallback((caught: unknown) => {
    setState(() => {
      throw toError(caught);
    });
  }, []);
}
