import { useCallback, useEffect, useState } from "react";

// "Hook chaining" = building higher-level hooks by composing lower-level ones.
// Each hook does one job; a hook one layer up calls it and adds behaviour. The
// Rules of Hooks still apply: every hook here is called unconditionally, at the
// top level of the function, never inside a condition, loop, or callback.

// Layer 1: a generic, reusable "sync a value to localStorage" hook.
function useLocalStorage<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => {
    const raw = localStorage.getItem(key);
    return raw === null ? initial : (JSON.parse(raw) as T);
  });

  // Persist on every change. The effect depends on both key and value.
  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);

  return [value, setValue] as const;
}

type Theme = "light" | "dark";

// Layer 2: `useTheme` CHAINS on top of `useLocalStorage`, adding
// domain-specific behaviour (a typed toggle and a DOM side effect) without
// re-implementing persistence.
export function useTheme() {
  const [theme, setTheme] = useLocalStorage<Theme>("theme", "light");

  const toggle = useCallback(
    () => setTheme((t) => (t === "light" ? "dark" : "light")),
    [setTheme],
  );

  // Reflect the current theme onto the document element.
  useEffect(() => {
    document.documentElement.dataset["theme"] = theme;
  }, [theme]);

  return { theme, toggle } as const;
}

// The component consumes only the top of the chain and stays trivial.
export function ThemeSwitch() {
  const { theme, toggle } = useTheme();
  return <button onClick={toggle}>Theme: {theme}</button>;
}
