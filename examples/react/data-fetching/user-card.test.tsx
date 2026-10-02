import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { UserCard } from "./user-card";

const ada = { id: "1", name: "Ada Lovelace", email: "ada@example.com" };
const grace = { id: "2", name: "Grace Hopper", email: "grace@example.com" };

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

// A fetch whose responses the test releases by hand, to control the timing.
function deferredFetch() {
  const pending = new Map<string, { resolve: (response: Response) => void; signal: AbortSignal | undefined }>();
  const fetchMock = vi.fn(
    (url: string, init?: RequestInit) =>
      new Promise<Response>((resolve, reject) => {
        pending.set(url, { resolve, signal: init?.signal ?? undefined });
        init?.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")));
      }),
  );
  return { fetchMock, respond: (url: string, response: Response) => pending.get(url)?.resolve(response), pending };
}

describe("<UserCard />", () => {
  it("shows loading, then the validated user", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => json(ada)));
    render(<UserCard userId="1" />);

    expect(screen.getByRole("status").textContent).toBe("Loading user…");
    // findBy* waits (polls) until the element appears.
    expect(await screen.findByRole("heading", { name: "Ada Lovelace" })).toBeTruthy();
  });

  it("treats a response that fails validation as an error, and can retry", async () => {
    const fetchMock = vi.fn(async () => json({ id: "1", name: "Ada" })); // no email
    vi.stubGlobal("fetch", fetchMock);
    render(<UserCard userId="1" />);

    expect((await screen.findByRole("alert")).textContent).toContain("Could not load the user.");

    fetchMock.mockImplementation(async () => json(ada));
    await userEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(await screen.findByRole("heading", { name: "Ada Lovelace" })).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("maps a 404 to a friendly message", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => json({ message: "not found" }, 404)));
    render(<UserCard userId="nobody" />);
    expect((await screen.findByRole("alert")).textContent).toContain("No such user.");
  });

  it("cancels the old request when the id changes, so a late response can't win", async () => {
    const { fetchMock, respond, pending } = deferredFetch();
    vi.stubGlobal("fetch", fetchMock);

    const { rerender } = render(<UserCard userId="1" />);
    rerender(<UserCard userId="2" />); // the user clicked through before "1" loaded

    expect(pending.get("/api/users/1")?.signal?.aborted).toBe(true);
    respond("/api/users/2", json(grace));
    respond("/api/users/1", json(ada)); // arrives last, but was cancelled

    expect(await screen.findByRole("heading", { name: "Grace Hopper" })).toBeTruthy();
    expect(screen.queryByText("Ada Lovelace")).toBeNull();
  });
});
