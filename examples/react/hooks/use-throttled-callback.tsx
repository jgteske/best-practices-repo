import { useCallback, useEffect, useMemo, useRef } from "react";
import { useEventCallback } from "./stable-callback";

// Debounce waits for the calls to STOP, so a user who types for a minute
// straight sends nothing for a minute. That is right for a search box and wrong
// for anything the other side is waiting on - presence, live cursors, autosave,
// analytics. Those want a steady trickle: at most one call per `wait`, with the
// first one going out immediately.
//
// This is the time-based sibling of useFrameThrottledCallback: the frame version
// is for work the SCREEN is waiting on, this one is for work the NETWORK is.

export type Throttled<A extends unknown[]> = ((...args: A) => void) & {
  cancel: () => void;
  flush: () => void;
};

/**
 * Layer 2: at most one call per `wait`ms, on the leading edge, plus a trailing
 * call carrying the newest arguments so the last event of a burst is never lost.
 */
export function useThrottledCallback<A extends unknown[]>(
  fn: (...args: A) => void,
  wait: number,
): Throttled<A> {
  const stableFn = useEventCallback(fn);
  const lastRun = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pending = useRef<A | null>(null);

  const cancel = useCallback(() => {
    if (timer.current !== null) clearTimeout(timer.current);
    timer.current = null;
    pending.current = null;
  }, []);

  const flush = useCallback(() => {
    const args = pending.current;
    cancel();
    if (args !== null) {
      lastRun.current = Date.now();
      stableFn(...args);
    }
  }, [cancel, stableFn]);

  useEffect(() => cancel, [cancel]);

  return useMemo(() => {
    const throttled = (...args: A) => {
      const remaining = wait - (Date.now() - lastRun.current);

      if (remaining <= 0) {
        // Leading edge: the first call of a burst goes out now, not `wait` later.
        cancel();
        lastRun.current = Date.now();
        stableFn(...args);
        return;
      }

      // Inside the window: keep only the NEWEST arguments and fire them when the
      // window closes. Dropping them instead would lose the final position of a
      // drag, or the last character typed before a pause.
      pending.current = args;
      if (timer.current === null) {
        timer.current = setTimeout(() => {
          timer.current = null;
          const latest = pending.current;
          pending.current = null;
          if (latest !== null) {
            lastRun.current = Date.now();
            stableFn(...latest);
          }
        }, remaining);
      }
    };
    return Object.assign(throttled, { cancel, flush });
  }, [stableFn, wait, cancel, flush]);
}

// Layer 3: "someone is typing" presence. The server needs a heartbeat while the
// user types, not one message per keystroke and not silence until they stop.
export function useTypingPresence(roomId: string, { every = 2_000 }: { every?: number } = {}) {
  const notifyTyping = useThrottledCallback(() => {
    // `keepalive` lets the last beacon survive the page being closed.
    void fetch(`/api/rooms/${roomId}/typing`, { method: "POST", keepalive: true });
  }, every);

  // Leaving the room must not fire a queued "still typing" a second later.
  useEffect(() => () => notifyTyping.cancel(), [notifyTyping]);

  return { onKeyPress: notifyTyping, stopTyping: notifyTyping.cancel } as const;
}

// Layer 4: the component knows nothing about timing.
export function MessageComposer({ roomId }: { roomId: string }) {
  const { onKeyPress, stopTyping } = useTypingPresence(roomId);

  return (
    <textarea
      onChange={onKeyPress}
      onBlur={stopTyping}
      placeholder="Message"
    />
  );
}
