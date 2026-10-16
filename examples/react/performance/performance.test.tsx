import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { ColocatedPage, LiftedPage, WrappedPage } from "./colocation";
import { StableParent, UnstableParent, type Item } from "./memo";
import { RenderCounter, createRenderTally } from "./render-counter";
import { SearchPage, Tabs } from "./transitions";

const ITEMS: Item[] = [
  { id: 1, label: "Apples" },
  { id: 2, label: "Pears" },
];

function renderCounted(ui: ReactNode) {
  const tally = createRenderTally();
  render(<RenderCounter.Provider value={tally.count}>{ui}</RenderCounter.Provider>);
  return tally.counts;
}

// #region test-memo
describe("memo needs stable props", () => {
  it("re-renders the memoized list on every parent render when props are new each time", async () => {
    const counts = renderCounted(<UnstableParent items={ITEMS} />);
    for (let i = 0; i < 3; i++) await userEvent.click(screen.getByRole("button", { name: /Clicked/ }));
    expect(counts.get("ItemList")).toBe(4); // mount + 3 wasted re-renders
  });

  it("skips the list when every prop keeps its identity", async () => {
    const counts = renderCounted(<StableParent items={ITEMS} />);
    for (let i = 0; i < 3; i++) await userEvent.click(screen.getByRole("button", { name: /Clicked/ }));
    expect(counts.get("ItemList")).toBe(1); // mount only

    // ...and it still works: selecting re-renders the parent, not the list.
    await userEvent.click(screen.getByRole("button", { name: "Pears" }));
    expect(screen.getByText("Selected: 2")).toBeTruthy();
    expect(counts.get("ItemList")).toBe(1);
  });
});
// #endregion test-memo

// #region test-colocation
describe("state placement", () => {
  it("lifted state re-renders the chart on every keystroke", async () => {
    const counts = renderCounted(<LiftedPage />);
    await userEvent.type(screen.getByRole("textbox", { name: "Search" }), "hello");
    expect(counts.get("SlowChart")).toBe(6); // mount + 5 keystrokes
  });

  it("colocated state leaves the chart alone - no memo involved", async () => {
    const counts = renderCounted(<ColocatedPage />);
    await userEvent.type(screen.getByRole("textbox", { name: "Search" }), "hello");
    expect(counts.get("SlowChart")).toBe(1);
  });

  it("children passed in from above are not re-rendered by the wrapper's state", async () => {
    const counts = renderCounted(<WrappedPage />);
    for (let i = 0; i < 3; i++) await userEvent.click(screen.getByRole("button", { name: "Highlight" }));
    expect(counts.get("SlowChart")).toBe(1);
  });
});
// #endregion test-colocation

describe("non-urgent updates", () => {
  it("useDeferredValue: the input updates immediately and the results catch up", async () => {
    render(<SearchPage />);
    const input = screen.getByRole("textbox", { name: "Search" });
    await userEvent.type(input, "item 199");
    expect((input as HTMLInputElement).value).toBe("item 199");
    const results = await screen.findByRole("list", { name: "results" });
    expect(results.textContent).toContain("item 1999");
    expect(results.parentElement?.getAttribute("aria-busy")).toBe("false");
  });

  it("useTransition: switches tabs and ends with isPending false", async () => {
    render(<Tabs panels={{ about: <p>About us</p>, posts: <p>All posts</p> }} />);
    await userEvent.click(screen.getByRole("tab", { name: "posts" }));
    expect(await screen.findByText("All posts")).toBeTruthy();
    expect(screen.getByRole("tab", { name: "posts" }).getAttribute("aria-selected")).toBe("true");
    expect(screen.getByRole("tablist").getAttribute("aria-busy")).toBe("false");
  });
});
