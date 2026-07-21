import {
  createContext,
  useContext,
  useCallback,
  useMemo,
  useState,
  type ReactNode,
} from "react";

// Performance pattern: split VALUE and ACTIONS into two contexts. The actions
// are stable (they never change identity), so components that only dispatch
// don't re-render when the value changes. Only components reading the value do.

type CounterActions = {
  increment: () => void;
  reset: () => void;
};

const CountContext = createContext<number | undefined>(undefined);
const CounterActionsContext = createContext<CounterActions | undefined>(
  undefined,
);

export function CounterProvider({ children }: { children: ReactNode }) {
  const [count, setCount] = useState(0);

  // Actions object is memoized with empty deps -> identity NEVER changes.
  const actions = useMemo<CounterActions>(
    () => ({
      increment: () => setCount((c) => c + 1),
      reset: () => setCount(0),
    }),
    [],
  );

  return (
    <CounterActionsContext.Provider value={actions}>
      <CountContext.Provider value={count}>{children}</CountContext.Provider>
    </CounterActionsContext.Provider>
  );
}

export function useCount(): number {
  const count = useContext(CountContext);
  if (count === undefined) throw new Error("useCount needs <CounterProvider>");
  return count;
}

export function useCounterActions(): CounterActions {
  const actions = useContext(CounterActionsContext);
  if (actions === undefined)
    throw new Error("useCounterActions needs <CounterProvider>");
  return actions;
}

// Re-renders when `count` changes.
export function CountLabel() {
  return <output>{useCount()}</output>;
}

// Does NOT re-render when `count` changes - it only consumes the stable actions.
export function Controls() {
  const { increment, reset } = useCounterActions();
  const onReset = useCallback(() => reset(), [reset]);
  return (
    <div>
      <button onClick={increment}>+1</button>
      <button onClick={onReset}>reset</button>
    </div>
  );
}
