import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

// The foundation of every timing hook: a callback that is scheduled *now* but
// invoked *later* (a timer, an interval, a frame, a subscription) must not run
// the closure it was created with - by the time it fires, that closure's props
// and state are stale.

// Layer 0: keep a ref pointing at the latest value of anything.
// The write happens in a LAYOUT effect so the ref is already current before any
// passive effect - or a timer scheduled by one - can read it in the same commit.
export function useLatestRef<T>(value: T) {
  const ref = useRef(value);
  useLayoutEffect(() => {
    ref.current = value;
  }, [value]);
  return ref;
}

// Layer 1: a callback with a permanently stable IDENTITY whose BODY is always
// the newest render's closure. This is the `useEffectEvent` pattern, and it is
// what lets higher-level hooks depend on a callback without re-subscribing,
// re-scheduling, or restarting a timer every render.
export function useEventCallback<A extends unknown[], R>(fn: (...args: A) => R) {
  const latest = useLatestRef(fn);
  // `latest` is a ref object - stable forever - so this useCallback never
  // recomputes, and neither does anything downstream that depends on it.
  return useCallback((...args: A) => latest.current(...args), [latest]);
}

// Layer 2: a self-cleaning timeout that always fires the LATEST callback.
// Note what is *not* in the dependency array: `onDone`. Because the body is
// read through the ref at fire time, a caller passing an inline arrow function
// does not restart the timer on every render.
export function useTimeout(onDone: () => void, delay: number | null) {
  const latest = useLatestRef(onDone);

  useEffect(() => {
    if (delay === null) return;
    const id = setTimeout(() => latest.current(), delay);
    // Cleanup cancels a timer that would otherwise fire after unmount.
    return () => clearTimeout(id);
  }, [delay, latest]);
}

// Layer 3: the component only expresses intent - "close this after 4s, unless
// the pointer is over it".
export function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  const [paused, setPaused] = useState(false);

  // `onClose` may be a fresh arrow function on every parent render; the timer is
  // still scheduled exactly once and calls the newest one. Passing `null` while
  // hovered cancels the timer (and restarts the full delay on leave, which is
  // the honest behaviour of a timeout - see useInterval for a resumable clock).
  useTimeout(onClose, paused ? null : 4_000);

  return (
    <div role="status" onPointerEnter={() => setPaused(true)} onPointerLeave={() => setPaused(false)}>
      {message}
    </div>
  );
}
