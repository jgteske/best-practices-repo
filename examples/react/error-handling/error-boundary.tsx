import { Component, type ErrorInfo, type ReactNode } from "react";
import { toError } from "./errors";

// Error boundaries are the one thing hooks still cannot do: catching an error
// thrown while a child RENDERS needs `getDerivedStateFromError`, which only
// exists on class components. Write one well-typed boundary and reuse it
// everywhere as an ordinary component.

export type FallbackProps = {
  error: Error;
  // Clears the error and renders `children` again (a "Try again" button).
  reset: () => void;
};

type ErrorBoundaryProps = {
  children: ReactNode;
  // A render function rather than a fixed element, so the fallback can show
  // the error and offer a retry wired to this boundary's `reset`.
  fallback: (props: FallbackProps) => ReactNode;
  // Side effects (logging, reporting) belong here, not in the fallback.
  onError?: (error: Error, info: ErrorInfo) => void;
  // Called before a reset, e.g. to clear a cache that produced the bad data.
  onReset?: () => void;
  // When any of these change while the fallback is showing, reset
  // automatically - typically the route or the id of the thing being shown.
  resetKeys?: readonly unknown[];
};

type ErrorBoundaryState = { error: Error | null };

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = { error: null };

  // Render phase: pure. Swap to the fallback on the next render. No side
  // effects here - React may call it more than once.
  static getDerivedStateFromError(caught: unknown): ErrorBoundaryState {
    return { error: toError(caught) };
  }

  // Commit phase: the place for side effects such as reporting.
  // `info.componentStack` shows which component threw.
  override componentDidCatch(caught: unknown, info: ErrorInfo): void {
    this.props.onError?.(toError(caught), info);
  }

  override componentDidUpdate(prevProps: ErrorBoundaryProps, prevState: ErrorBoundaryState): void {
    // `prevState.error !== null` matters: if the error was thrown in the very
    // update that changed the keys, resetting now would re-render the same
    // broken child straight away and loop. Only reset an error that was
    // already showing before the keys changed.
    if (
      prevState.error !== null &&
      this.state.error !== null &&
      keysChanged(prevProps.resetKeys, this.props.resetKeys)
    ) {
      this.reset();
    }
  }

  reset = (): void => {
    this.props.onReset?.();
    this.setState({ error: null });
  };

  override render(): ReactNode {
    const { error } = this.state;
    if (error !== null) return this.props.fallback({ error, reset: this.reset });
    return this.props.children;
  }
}

function keysChanged(a: readonly unknown[] = [], b: readonly unknown[] = []): boolean {
  return a.length !== b.length || a.some((key, i) => !Object.is(key, b[i]));
}

// A default fallback. `role="alert"` makes screen readers announce it.
export function ErrorFallback({ error, reset }: FallbackProps) {
  return (
    <div role="alert">
      <p>Something went wrong.</p>
      <pre>{error.message}</pre>
      <button type="button" onClick={reset}>
        Try again
      </button>
    </div>
  );
}
