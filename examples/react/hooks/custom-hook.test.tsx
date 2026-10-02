import { act, render, renderHook, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { Disclosure, useToggle } from "./custom-hook";

describe("useToggle", () => {
  it("toggles, and keeps its actions' identity across renders", () => {
    // renderHook mounts a throwaway component that calls the hook.
    const { result, rerender } = renderHook(() => useToggle());
    const firstActions = result.current[1];

    // State updates outside a user event go through act(), so React applies them.
    act(() => result.current[1].toggle());
    expect(result.current[0]).toBe(true);

    rerender();
    expect(result.current[1].toggle).toBe(firstActions.toggle);
  });
});

describe("<Disclosure />", () => {
  it("reveals the details on click", async () => {
    render(<Disclosure />);
    expect(screen.queryByText("Extra details revealed on demand.")).toBeNull();

    await userEvent.click(screen.getByRole("button", { name: "Show details" }));
    expect(screen.getByText("Extra details revealed on demand.")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Hide details" })).toBeTruthy();
  });
});
