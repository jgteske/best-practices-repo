import { useState, type ReactNode } from "react";
import { ErrorBoundary, ErrorFallback } from "./error-boundary";
import { logError } from "./errors";
import { OrderList, ProfileForm } from "./handling-errors";

// A boundary replaces EVERYTHING below it with the fallback. Where you put it
// decides how much of the page one bug takes down - so use several, nested
// from coarse to fine.

function report(error: Error, info: { componentStack?: string | null }) {
  logError(error, { componentStack: info.componentStack });
}

// 1. Root: the last line of defence. Without it, an uncaught render error
//    unmounts the whole tree and leaves a blank page.
export function App({ path }: { path: string }) {
  return (
    <ErrorBoundary
      onError={report}
      fallback={() => (
        <main role="alert">
          <h1>Something went wrong</h1>
          <button type="button" onClick={() => window.location.reload()}>
            Reload
          </button>
        </main>
      )}
    >
      <Layout>
        {/* 2. Route: navigation stays usable when one page breaks.
               `resetKeys` clears the error when the user navigates away. */}
        <ErrorBoundary onError={report} resetKeys={[path]} fallback={ErrorFallback}>
          <Page path={path} />
        </ErrorBoundary>
      </Layout>
    </ErrorBoundary>
  );
}

function Layout({ children }: { children: ReactNode }) {
  return (
    <>
      <nav>
        <a href="/">Home</a> <a href="/account">Account</a>
      </nav>
      <main>{children}</main>
    </>
  );
}

// 3. Widget: independent panels each get their own boundary, so a broken
//    order list does not hide the profile form next to it.
function Page({ path }: { path: string }) {
  if (path !== "/account") return <p>Welcome!</p>;
  return (
    <>
      <ErrorBoundary onError={report} fallback={ErrorFallback}>
        <ProfileForm initialName="Ada" />
      </ErrorBoundary>
      <ErrorBoundary onError={report} fallback={ErrorFallback}>
        <OrderList customerId="c-42" />
      </ErrorBoundary>
    </>
  );
}

// Resetting with `key`: changing a component's key unmounts and remounts it,
// which throws away the boundary's error AND all state below it. Use it when
// "Try again" should start from scratch instead of re-rendering stale state.
export function RetryFromScratch({ children }: { children: ReactNode }) {
  const [attempt, setAttempt] = useState(0);
  return (
    <ErrorBoundary
      key={attempt}
      onError={report}
      fallback={({ error }) => (
        <div role="alert">
          <p>{error.message}</p>
          <button type="button" onClick={() => setAttempt((n) => n + 1)}>
            Start over
          </button>
        </div>
      )}
    >
      {children}
    </ErrorBoundary>
  );
}
