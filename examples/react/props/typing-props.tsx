import { useId } from "react";

// Passing parameters into a component = passing props. Type them precisely so
// the *call site* is checked: a missing or wrong prop is a compile error, not a
// runtime surprise.

type TextFieldProps = {
  label: string;
  value: string;
  onChange: (next: string) => void;
  // A union instead of `string` restricts callers to real options and enables
  // autocomplete at the call site.
  kind?: "text" | "email" | "password";
  // `readonly` arrays communicate "I will not mutate this" to the caller.
  hints?: readonly string[];
};

export function TextField({
  label,
  value,
  onChange,
  kind = "text",
  hints,
}: TextFieldProps) {
  // useId gives a stable, SSR-safe id to wire the label to the input.
  const id = useId();
  return (
    <div>
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        type={kind}
        value={value}
        // Adapt the DOM event to the component's simpler `(next: string)` API,
        // so consumers never touch `e.target.value` themselves.
        onChange={(e) => onChange(e.target.value)}
      />
      {hints && hints.length > 0 && (
        <ul>
          {hints.map((hint) => (
            <li key={hint}>{hint}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
