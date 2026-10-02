import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { hideExpectedErrors } from "../test-utils";
import { ErrorBoundary, ErrorFallback } from "./error-boundary";

function Bomb({ explode }: { explode: boolean }) {
  if (explode) throw new Error("kaboom");
  return <p>all good</p>;
}

describe("ErrorBoundary", () => {
  it("shows the fallback, reports the error, and recovers on reset", async () => {
    hideExpectedErrors();
    const onError = vi.fn();

    function Harness() {
      const [explode, setExplode] = useState(true);
      return (
        <ErrorBoundary fallback={ErrorFallback} onError={onError} onReset={() => setExplode(false)}>
          <Bomb explode={explode} />
        </ErrorBoundary>
      );
    }

    render(<Harness />);
    expect(screen.getByRole("alert").textContent).toContain("kaboom");
    expect(onError).toHaveBeenCalledOnce();

    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(screen.getByText("all good")).toBeTruthy();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("resets automatically when a reset key changes", () => {
    hideExpectedErrors();
    const view = (id: string, explode: boolean) => (
      <ErrorBoundary fallback={ErrorFallback} resetKeys={[id]}>
        <Bomb explode={explode} />
      </ErrorBoundary>
    );

    const { rerender } = render(view("a", true));
    expect(screen.getByRole("alert")).toBeTruthy();

    rerender(view("b", false)); // e.g. the user navigated to another item
    expect(screen.getByText("all good")).toBeTruthy();
  });
});
