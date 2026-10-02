import { useId, useState, type FormEvent } from "react";
import { z } from "zod";

// A complete form: uncontrolled inputs read with FormData, one zod schema for
// validation and types, field errors wired up for screen readers, a pending
// state that prevents double submits, and server errors mapped onto fields.

export const SignupSchema = z.object({
  email: z.email("Enter a valid email address"),
  password: z.string().min(8, "Use at least 8 characters"),
  // An unchecked checkbox is simply absent from FormData.
  terms: z.literal("on", "Accept the terms to continue"),
});
export type Signup = z.infer<typeof SignupSchema>;
type Field = keyof Signup;
type FieldErrors = Partial<Record<Field, string>>;

// What the server can answer. A known problem comes back as data for one field.
export type SubmitResult = { ok: true } | { ok: false; field: Field; message: string };

type FormStatus = { state: "editing" } | { state: "submitting" } | { state: "done" } | { state: "failed"; message: string };

export function SignupForm({ onSubmit }: { onSubmit: (data: Signup) => Promise<SubmitResult> }) {
  const [errors, setErrors] = useState<FieldErrors>({});
  const [status, setStatus] = useState<FormStatus>({ state: "editing" });

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const parsed = SignupSchema.safeParse(Object.fromEntries(new FormData(form)));

    if (!parsed.success) {
      const fieldErrors = z.flattenError(parsed.error).fieldErrors;
      const next: FieldErrors = {};
      for (const field of Object.keys(SignupSchema.shape) as Field[]) {
        const message = fieldErrors[field]?.[0];
        if (message !== undefined) next[field] = message;
      }
      setErrors(next);
      focusFirstInvalid(form, next);
      return;
    }

    setErrors({});
    setStatus({ state: "submitting" });
    try {
      const result = await onSubmit(parsed.data);
      if (result.ok) {
        setStatus({ state: "done" });
      } else {
        setErrors({ [result.field]: result.message });
        setStatus({ state: "editing" });
        focusFirstInvalid(form, { [result.field]: result.message });
      }
    } catch {
      setStatus({ state: "failed", message: "Something went wrong. Please try again." });
    }
  }

  if (status.state === "done") return <p role="status">Check your inbox to confirm your account.</p>;

  const submitting = status.state === "submitting";
  return (
    // noValidate: the schema is the single source of validation messages.
    <form onSubmit={handleSubmit} noValidate aria-label="Sign up">
      <TextField name="email" label="Email" type="email" autoComplete="email" error={errors.email} />
      <TextField name="password" label="Password" type="password" autoComplete="new-password" error={errors.password} />
      <CheckboxField name="terms" label="I accept the terms" error={errors.terms} />
      {status.state === "failed" && <p role="alert">{status.message}</p>}
      <button type="submit" disabled={submitting}>
        {submitting ? "Creating account…" : "Create account"}
      </button>
    </form>
  );
}

function focusFirstInvalid(form: HTMLFormElement, errors: FieldErrors) {
  const first = (Object.keys(SignupSchema.shape) as Field[]).find((field) => errors[field] !== undefined);
  const element = first === undefined ? null : form.elements.namedItem(first);
  if (element instanceof HTMLElement) element.focus();
}

type TextFieldProps = {
  name: Field;
  label: string;
  type: "email" | "password" | "text";
  autoComplete: string;
  error: string | undefined;
};

function TextField({ name, label, type, autoComplete, error }: TextFieldProps) {
  const id = useId();
  const errorId = `${id}-error`;
  return (
    <div>
      {/* A real <label> (not a placeholder) gives the input its accessible name. */}
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        name={name}
        type={type}
        autoComplete={autoComplete}
        // Screen readers announce the field as invalid and read the message with it.
        aria-invalid={error !== undefined}
        aria-describedby={error === undefined ? undefined : errorId}
      />
      {error !== undefined && <p id={errorId}>{error}</p>}
    </div>
  );
}

function CheckboxField({ name, label, error }: { name: Field; label: string; error: string | undefined }) {
  const id = useId();
  const errorId = `${id}-error`;
  return (
    <div>
      <input
        id={id}
        name={name}
        type="checkbox"
        aria-invalid={error !== undefined}
        aria-describedby={error === undefined ? undefined : errorId}
      />
      <label htmlFor={id}>{label}</label>
      {error !== undefined && <p id={errorId}>{error}</p>}
    </div>
  );
}
