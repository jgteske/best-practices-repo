import { useCallback, useState } from "react";

// A REF CALLBACK runs the moment the element is attached (argument = the node)
// and again with `null` when it detaches. Use it when you need to react to
// availability itself - e.g. measure an element as soon as it exists, including
// when it mounts conditionally later. This is more precise than an effect,
// which can't easily observe a node that appears after the first render.

export function MeasuredBox() {
  const [width, setWidth] = useState<number | null>(null);
  const [shown, setShown] = useState(false);

  // The callback fires with the node on attach, and with null on detach.
  // useCallback keeps its identity stable so React doesn't call it spuriously.
  const measureRef = useCallback((node: HTMLDivElement | null) => {
    if (node !== null) {
      // Element is now available - safe to read layout immediately.
      setWidth(node.getBoundingClientRect().width);
    } else {
      // Element was removed.
      setWidth(null);
    }
  }, []);

  return (
    <div>
      <button onClick={() => setShown((s) => !s)}>
        {shown ? "Hide" : "Show"} box
      </button>
      {shown && (
        <div ref={measureRef} style={{ width: "50%" }}>
          Measured on attach
        </div>
      )}
      <p>Width: {width === null ? "not mounted" : `${Math.round(width)}px`}</p>
    </div>
  );
}
