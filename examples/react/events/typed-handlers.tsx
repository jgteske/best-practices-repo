import { useState, type ChangeEvent, type FormEvent } from "react";

// Type event handlers with React's synthetic event types so `e.target`,
// `e.currentTarget`, `preventDefault`, etc. are all checked. The generic
// parameter is the *element* the handler is attached to.

type LoginFormProps = {
  onSubmit: (credentials: { email: string; password: string }) => void;
};

export function LoginForm({ onSubmit }: LoginFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // ChangeEvent<HTMLInputElement>: `e.target.value` is known to be a string.
  const handleEmail = (e: ChangeEvent<HTMLInputElement>) =>
    setEmail(e.target.value);

  // FormEvent<HTMLFormElement>: `preventDefault` is available and typed.
  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    onSubmit({ email, password });
  };

  return (
    <form onSubmit={handleSubmit}>
      <input type="email" value={email} onChange={handleEmail} />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <button type="submit">Sign in</button>
    </form>
  );
}
