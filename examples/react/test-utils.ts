import { onTestFinished, vi } from "vitest";

// For tests that throw on purpose (error boundaries). In development, React 18
// rethrows a caught render error so the browser reports it, and jsdom prints
// that as an uncaught error. React also logs it via console.error. Both are
// expected here, so silence them - for the current test only.
export function hideExpectedErrors(): void {
  vi.spyOn(console, "error").mockImplementation(() => {});
  const swallow = (event: ErrorEvent) => event.preventDefault();
  window.addEventListener("error", swallow);
  onTestFinished(() => window.removeEventListener("error", swallow));
}
