import { useState, type MouseEvent } from "react";

// "Function chaining" for events: instead of cramming several concerns into one
// giant handler, write small single-purpose handlers and compose them into the
// one function you hand to `onClick`. Each stays independently testable.

// A tiny combinator: run every handler in order for the same event. It is
// generic over the event type, so it works for clicks, changes, submits, etc.
function chain<E>(...handlers: Array<((event: E) => void) | undefined>) {
  return (event: E) => {
    for (const handler of handlers) handler?.(event);
  };
}

type TrackedButtonProps = {
  label: string;
  // The consumer's own click handler, run alongside our built-in behaviour.
  onClick?: (e: MouseEvent<HTMLButtonElement>) => void;
};

export function TrackedButton({ label, onClick }: TrackedButtonProps) {
  const [clicks, setClicks] = useState(0);

  const track = (e: MouseEvent<HTMLButtonElement>) => {
    console.log("clicked", e.currentTarget.name);
  };
  const count = () => setClicks((n) => n + 1);

  return (
    <button
      name={label}
      // Analytics, local state, and the caller's handler all fire in order -
      // without any of them knowing about the others.
      onClick={chain(track, count, onClick)}
    >
      {label} ({clicks})
    </button>
  );
}
