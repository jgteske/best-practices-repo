import { useEffect, useMemo, useRef, useState } from "react";
import { useEventCallback } from "./stable-callback";

// Debouncing is the wrong timing tool for scroll, pointermove, and resize:
// those fire faster than the screen refreshes, and you want the LATEST value on
// every frame, not one value after the burst ends. Throttle to the frame clock
// instead - at most one call per repaint, with the newest arguments.

// Layer 2: coalesce a burst of calls into one call per animation frame.
export function useFrameThrottledCallback<A extends unknown[]>(fn: (...args: A) => void) {
  const stableFn = useEventCallback(fn);
  const frame = useRef<number | null>(null);
  const pending = useRef<A | null>(null);

  useEffect(
    () => () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current);
    },
    [],
  );

  // `stableFn` never changes identity, so the throttled callback doesn't
  // either - listeners registered with it are never re-attached.
  return useMemo(
    () =>
      (...args: A) => {
        // Always keep the newest arguments, even if a frame is already queued.
        pending.current = args;
        if (frame.current !== null) return;

        frame.current = requestAnimationFrame(() => {
          frame.current = null;
          const latestArgs = pending.current;
          pending.current = null;
          if (latestArgs !== null) stableFn(...latestArgs);
        });
      },
    [stableFn],
  );
}

// Layer 3: a reading-progress value that updates at most once per frame.
export function useScrollProgress() {
  const [progress, setProgress] = useState(0);

  const handleScroll = useFrameThrottledCallback(() => {
    const { scrollTop, scrollHeight, clientHeight } = document.documentElement;
    const scrollable = scrollHeight - clientHeight;
    setProgress(scrollable <= 0 ? 0 : scrollTop / scrollable);
  });

  useEffect(() => {
    // `passive: true` promises the listener won't preventDefault, letting the
    // browser scroll without waiting for it.
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll(); // establish the initial value without waiting for a scroll
    return () => window.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  return progress;
}

// Layer 4: no listeners, no frames, no cleanup - just a number.
export function ReadingProgressBar() {
  const progress = useScrollProgress();
  return <div role="progressbar" style={{ width: `${progress * 100}%` }} />;
}
