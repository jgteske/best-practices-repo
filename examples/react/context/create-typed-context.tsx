import { createContext, useContext } from "react";

// The safest way to type a context: default it to `undefined`, then wrap
// `useContext` in a custom hook that THROWS if a consumer is outside the
// Provider. This turns "silently got the default value" into a loud, early
// error, and hands consumers a non-null type without a `!` everywhere.

type Theme = "light" | "dark";

// The context type is `Theme | undefined`; `undefined` means "no Provider above".
const ThemeContext = createContext<Theme | undefined>(undefined);

export const ThemeProvider = ThemeContext.Provider;

// Consumers call this hook, never useContext(ThemeContext) directly.
export function useTheme(): Theme {
  const theme = useContext(ThemeContext);
  if (theme === undefined) {
    // Runtime guard = the "when is this available?" answer: only inside a Provider.
    throw new Error("useTheme must be used within a <ThemeProvider>");
  }
  return theme; // narrowed to `Theme` - no `!`, no optional chaining downstream.
}

export function ThemedLabel() {
  const theme = useTheme(); // typed as Theme, guaranteed present.
  return <span data-theme={theme}>Current theme: {theme}</span>;
}
