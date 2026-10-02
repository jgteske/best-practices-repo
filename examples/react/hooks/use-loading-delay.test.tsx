import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useLoadingDelay } from "./use-loading-delay";

describe("useLoadingDelay", () => {
  // Fake timers: the test moves the clock itself, so a 400ms rule takes 0ms to check.
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  const options = { delayMs: 200, minDurationMs: 400 };

  it("never shows a spinner for a fast response", () => {
    const { result, rerender } = renderHook(({ loading }) => useLoadingDelay(loading, options), {
      initialProps: { loading: true },
    });
    act(() => vi.advanceTimersByTime(150));
    rerender({ loading: false }); // finished before the 200ms delay
    act(() => vi.advanceTimersByTime(1000));
    expect(result.current).toBe(false);
  });

  it("keeps a shown spinner up for the minimum duration", () => {
    const { result, rerender } = renderHook(({ loading }) => useLoadingDelay(loading, options), {
      initialProps: { loading: true },
    });
    act(() => vi.advanceTimersByTime(200));
    expect(result.current).toBe(true);

    act(() => vi.advanceTimersByTime(50));
    rerender({ loading: false }); // done 50ms after the spinner appeared...
    act(() => vi.advanceTimersByTime(300));
    expect(result.current).toBe(true); // ...but it stays until 400ms have passed
    act(() => vi.advanceTimersByTime(50));
    expect(result.current).toBe(false);
  });
});
