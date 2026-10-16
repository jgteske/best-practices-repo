import { act, render, screen } from "@testing-library/react";
import { isValidElement, version } from "react";
import { createPortal } from "react-dom";
import { describe, expect, it, vi } from "vitest";
import { hideExpectedErrors } from "../test-utils";
import { CountedList, IconSlot } from "./children-utilities";
import { Greeting, internals, rows, tryToMutate, viaCreateElement, viaJsx } from "./element-anatomy";
import { Dashboard, Glossary, Measured, Modal, kindOf, samples, type ElementKind } from "./special-types";
import { ELEMENT_SYMBOL, UntrustedField, afterRoundTrip, bio, looksLikeElement, real } from "./symbol-guard";

describe("element anatomy", () => {
  it("JSX and createElement build the same plain object", () => {
    const el = internals(viaJsx);
    expect(el.$$typeof).toBe(Symbol.for("react.element"));
    expect(el.type).toBe(Greeting);
    expect(el.key).toBe("g1");
    expect(el.props).toEqual({ name: "Ada", children: "Hi" });
    expect(internals(viaCreateElement)).toMatchObject({ type: el.type, key: el.key, props: el.props });
  });

  it("keeps key out of props", () => {
    const first = internals(rows[0]!);
    expect(first.key).toBe("a");
    expect(first.props.id).toBe("a");

    // In development, reading props.key returns undefined and warns.
    const warn = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(first.props.key).toBeUndefined();
    expect(String(warn.mock.calls[0]?.[0])).toMatch(/`key` is not a prop/);
  });

  it("freezes elements in development", () => {
    expect(tryToMutate(<Greeting name="Ada" />)).toBe("threw");
  });
});

describe("$$typeof as a Symbol", () => {
  it("rejects objects that only look like elements", () => {
    expect(looksLikeElement).toBe(false);
    expect(isValidElement(real)).toBe(true);
    expect(isValidElement(afterRoundTrip)).toBe(false);
    expect(ELEMENT_SYMBOL).toBe(internals(real).$$typeof);
  });

  it("refuses to render a forged element instead of creating the link", () => {
    hideExpectedErrors();
    expect(() => render(<div>{bio as never}</div>)).toThrow(/Objects are not valid as a React child/);
    expect(document.querySelector("a")).toBeNull();
  });

  it("renders untrusted values as text only", () => {
    render(<UntrustedField value={bio} />);
    expect(screen.getByText("[unsupported value]")).toBeTruthy();
  });
});

describe("special element types", () => {
  it.each(Object.entries(samples))("classifies <%s>", (kind, element) => {
    expect(kindOf(element.type)).toBe(kind as ElementKind);
  });

  it("tags portals with their own symbol", () => {
    const portal = createPortal(<p />, document.createElement("div"));
    expect(internals(portal as never).$$typeof).toBe(Symbol.for("react.portal"));
  });

  it("keyed Fragments add no DOM node", () => {
    const { container } = render(<Glossary terms={[{ term: "JSX", meaning: "syntax" }, { term: "Fiber", meaning: "work unit" }]} />);
    expect([...container.querySelector("dl")!.children].map((n) => n.tagName)).toEqual(["DT", "DD", "DT", "DD"]);
  });

  it("Suspense shows the fallback until the lazy component loads", async () => {
    render(<Dashboard points={[3, 5]} />);
    expect(screen.getByRole("status").textContent).toBe("Loading chart…");
    expect((await screen.findByLabelText("chart")).textContent).toBe("35");
  });

  it("Profiler reports each commit", () => {
    const onRender = vi.fn();
    render(<Measured id="greeting" onRender={onRender}><Greeting name="Ada" /></Measured>);
    expect(onRender).toHaveBeenCalledWith("greeting", "mount", expect.any(Number), expect.any(Number), expect.any(Number), expect.any(Number));
  });

  it("portal content lands elsewhere in the DOM but still bubbles React events", async () => {
    const onClick = vi.fn();
    const { container } = render(
      <div onClick={onClick}>
        <Modal title="Confirm"><button>OK</button></Modal>
      </div>,
    );
    expect(container.querySelector("[role=dialog]")).toBeNull();
    const ok = screen.getByRole("button", { name: "OK" });
    expect(screen.getByRole("dialog").parentElement).toBe(document.body);
    await act(async () => ok.click());
    expect(onClick).toHaveBeenCalledOnce();
  });
});

describe("children utilities", () => {
  it("toArray flattens and drops empty children", () => {
    render(
      <CountedList>
        {"one"}
        {null}
        {false}
        {[<b key="x">two</b>, <i key="y">three</i>]}
      </CountedList>,
    );
    expect(screen.getByText("3 items")).toBeTruthy();
  });

  it("IconSlot passes elements through and wraps strings", () => {
    const { container } = render(<><IconSlot icon="star" /><IconSlot icon={<svg data-testid="custom" />} /></>);
    expect(container.querySelector(".icon-star")).toBeTruthy();
    expect(screen.getByTestId("custom")).toBeTruthy();
  });
});

it("runs against React 18", () => {
  // React 19 renamed the element tag to Symbol.for("react.transitional.element").
  expect(version.startsWith("18.")).toBe(true);
});
