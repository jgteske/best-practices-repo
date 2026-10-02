import { useState, type FormEvent } from "react";

// UNCONTROLLED: the DOM owns the value. React sets the starting value with
// `defaultValue` and reads everything once, on submit, through FormData.
// Fewer renders and less code - the default choice for most forms.
export function NewsletterForm({ onSubscribe }: { onSubscribe: (email: string, topics: string[]) => void }) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    // getAll() collects every checked checkbox that shares a name.
    onSubscribe(String(form.get("email")), form.getAll("topic").map(String));
  }

  return (
    <form onSubmit={handleSubmit}>
      <label>
        Email <input name="email" type="email" defaultValue="" required />
      </label>
      <label>
        <input type="checkbox" name="topic" value="releases" defaultChecked /> Releases
      </label>
      <label>
        <input type="checkbox" name="topic" value="events" /> Events
      </label>
      <button type="submit">Subscribe</button>
    </form>
  );
}

// CONTROLLED: React state owns the value, and every keystroke goes through
// it. Use this when the UI must react while the user types: formatting,
// live validation, dependent fields, or a value that other code can reset.
export function CardNumberInput({ onChange }: { onChange?: (digits: string) => void }) {
  const [digits, setDigits] = useState("");
  const formatted = digits.replace(/(\d{4})(?=\d)/g, "$1 ");

  return (
    <label>
      Card number
      <input
        inputMode="numeric"
        autoComplete="cc-number"
        value={formatted}
        onChange={(event) => {
          const next = event.target.value.replace(/\D/g, "").slice(0, 16);
          setDigits(next);
          onChange?.(next);
        }}
      />
    </label>
  );
}
