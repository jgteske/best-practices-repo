import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { CardNumberInput, NewsletterForm } from "./controlled-vs-uncontrolled";
import { SignupForm, type Signup, type SubmitResult } from "./signup-form";

async function fillValidForm(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText("Email"), "ada@example.com");
  await user.type(screen.getByLabelText("Password"), "correct horse");
  await user.click(screen.getByLabelText("I accept the terms"));
}

describe("<SignupForm />", () => {
  it("shows every field error, marks fields invalid, and focuses the first one", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn<(data: Signup) => Promise<SubmitResult>>();
    render(<SignupForm onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText("Password"), "short");
    await user.click(screen.getByRole("button", { name: "Create account" }));

    const email = screen.getByLabelText("Email");
    expect(email.getAttribute("aria-invalid")).toBe("true");
    // The error is part of the field's accessible description.
    expect(screen.getByRole("textbox", { name: "Email", description: "Enter a valid email address" })).toBe(email);
    expect(screen.getByText("Use at least 8 characters")).toBeTruthy();
    expect(screen.getByText("Accept the terms to continue")).toBeTruthy();
    expect(document.activeElement).toBe(email);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("submits typed data once, with a pending state", async () => {
    const user = userEvent.setup();
    let finish: (result: SubmitResult) => void = () => {};
    const onSubmit = vi.fn(() => new Promise<SubmitResult>((resolve) => (finish = resolve)));
    render(<SignupForm onSubmit={onSubmit} />);

    await fillValidForm(user);
    await user.click(screen.getByRole("button", { name: "Create account" }));

    const pendingButton = screen.getByRole("button", { name: "Creating account…" });
    expect(pendingButton).toHaveProperty("disabled", true);
    await user.click(pendingButton); // a second click does nothing
    expect(onSubmit).toHaveBeenCalledOnce();
    expect(onSubmit).toHaveBeenCalledWith({ email: "ada@example.com", password: "correct horse", terms: "on" });

    finish({ ok: true });
    expect(await screen.findByRole("status")).toBeTruthy();
  });

  it("puts a server-side error on the field it belongs to", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn(async (): Promise<SubmitResult> => ({ ok: false, field: "email", message: "That email is already registered" }));
    render(<SignupForm onSubmit={onSubmit} />);

    await fillValidForm(user);
    await user.click(screen.getByRole("button", { name: "Create account" }));

    expect(await screen.findByText("That email is already registered")).toBeTruthy();
    expect(document.activeElement).toBe(screen.getByLabelText("Email"));
  });
});

describe("controlled vs uncontrolled", () => {
  it("reads uncontrolled fields once, on submit", async () => {
    const user = userEvent.setup();
    const onSubscribe = vi.fn();
    render(<NewsletterForm onSubscribe={onSubscribe} />);

    await user.type(screen.getByLabelText("Email"), "ada@example.com");
    await user.click(screen.getByLabelText("Events"));
    await user.click(screen.getByRole("button", { name: "Subscribe" }));
    expect(onSubscribe).toHaveBeenCalledWith("ada@example.com", ["releases", "events"]);
  });

  it("formats a controlled field as the user types", async () => {
    const user = userEvent.setup();
    render(<CardNumberInput />);
    const input = screen.getByLabelText("Card number");

    await user.type(input, "4242x4242424242424242");
    expect(input).toHaveProperty("value", "4242 4242 4242 4242");
  });
});
