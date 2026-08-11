/**
 * Observer: a closure over a set of listeners.
 *
 * No `Subject` base class, no `attach`/`detach`/`notify` trio. A factory holds
 * the listeners, `subscribe` returns the function that undoes it, and the event
 * payload is a type parameter so every listener is checked against what is
 * actually emitted.
 */

type Listener<T> = (event: T) => void;

type Observable<T> = {
  /** Returns the unsubscribe function - the caller never needs the listener again. */
  subscribe: (listener: Listener<T>) => () => void;
  emit: (event: T) => void;
  readonly size: number;
};

function createObservable<T>(): Observable<T> {
  const listeners = new Set<Listener<T>>();

  return {
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },

    emit: (event) => {
      // Iterate a copy: a listener that unsubscribes itself (or someone else)
      // while handling an event would otherwise mutate the set mid-iteration.
      for (const listener of [...listeners]) listener(event);
    },

    get size() {
      return listeners.size;
    },
  };
}

/**
 * Returning the unsubscribe function is the detail that makes this pleasant.
 * An `off(listener)` API forces callers to keep the original function
 * reference, and quietly does nothing when they pass a fresh arrow that merely
 * looks the same - a leak with no error message.
 */
type PriceChange = { readonly symbol: string; readonly cents: number };

const prices = createObservable<PriceChange>();

const seen: string[] = [];
const unsubscribe = prices.subscribe((event) => {
  seen.push(`${event.symbol}=${event.cents}`);
});

// A listener that removes itself after the first event: "once", in one line.
const unsubscribeOnce = prices.subscribe(() => {
  seen.push("once");
  unsubscribeOnce();
});

prices.emit({ symbol: "ACME", cents: 1200 });
prices.emit({ symbol: "ACME", cents: 1250 });
unsubscribe();
prices.emit({ symbol: "ACME", cents: 1300 });

console.log(seen); // [ 'ACME=1200', 'once', 'ACME=1250' ]
console.log(prices.size); // 0

/**
 * Where an object has *several* kinds of event, key the payloads by name and
 * make `subscribe`/`emit` generic over that map, so the payload type follows
 * the event name. The event-listeners page builds the full version of this,
 * including DOM cleanup with `AbortController`.
 */
type StoreEvents = {
  saved: { readonly id: string };
  failed: { readonly id: string; readonly error: string };
};

function createEmitter<Events extends Record<string, unknown>>() {
  const channels = new Map<keyof Events, Set<Listener<never>>>();

  return {
    on: <K extends keyof Events>(name: K, listener: Listener<Events[K]>) => {
      const existing = channels.get(name) ?? new Set<Listener<never>>();
      existing.add(listener as Listener<never>);
      channels.set(name, existing);
      return () => {
        existing.delete(listener as Listener<never>);
      };
    },
    emit: <K extends keyof Events>(name: K, event: Events[K]) => {
      for (const listener of [...(channels.get(name) ?? [])]) {
        (listener as Listener<Events[K]>)(event);
      }
    },
  };
}

const store = createEmitter<StoreEvents>();
store.on("failed", (event) => console.log(event.error)); // typed: { id, error }
store.emit("failed", { id: "u1", error: "conflict" }); // conflict
// store.emit("failed", { id: "u1" });  // ✗ missing `error`
// store.on("nope", () => {});          // ✗ not a known event name

export { createObservable, createEmitter };
export type { Observable, Listener, PriceChange, StoreEvents };
