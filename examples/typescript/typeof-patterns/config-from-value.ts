/**
 * Deriving types from *values* (objects, arrays, tuples) with `typeof`,
 * instead of writing a parallel interface that has to be kept in sync by
 * hand.
 */

// ANTI-PATTERN: the interface and the object are two separate sources of
// truth. Adding a key to `themeBad` does not add it to `ThemeBad`, and vice
// versa - the compiler cannot help you keep them aligned.
interface ThemeBad {
  primary: string;
  secondary: string;
  spacingScale: number[];
}

const themeBad: ThemeBad = {
  primary: "#1d4ed8",
  secondary: "#9333ea",
  spacingScale: [4, 8, 16, 32],
};

// RECOMMENDED: define the value first (usually with `as const` so literal
// types and tuple shapes are preserved instead of widened to `string`/
// `number[]`), then derive the type from it with `typeof`.
const theme = {
  primary: "#1d4ed8",
  secondary: "#9333ea",
  spacingScale: [4, 8, 16, 32],
} as const;

type Theme = typeof theme;
// Theme = {
//   readonly primary: "#1d4ed8";
//   readonly secondary: "#9333ea";
//   readonly spacingScale: readonly [4, 8, 16, 32];
// }

function applyTheme(target: Theme): void {
  document.documentElement.style.setProperty("--color-primary", target.primary);
  document.documentElement.style.setProperty("--color-secondary", target.secondary);
}

applyTheme(theme);

// The same pattern works for a fixed set of allowed string values - derive a
// union type from an array of values instead of writing the union by hand
// and hoping it stays in sync with whatever validates against it at runtime.
const supportedLocales = ["en-US", "de-DE", "fr-FR", "ja-JP"] as const;
type SupportedLocale = (typeof supportedLocales)[number];
// SupportedLocale = "en-US" | "de-DE" | "fr-FR" | "ja-JP"

function isSupportedLocale(value: string): value is SupportedLocale {
  return (supportedLocales as readonly string[]).includes(value);
}

function setLocale(locale: SupportedLocale): void {
  console.log(`locale set to ${locale}`);
}

const requested = "de-DE" as string; // e.g. read from a query param at runtime
if (isSupportedLocale(requested)) {
  setLocale(requested); // narrowed to SupportedLocale, no cast needed
}

export { themeBad, theme, supportedLocales, isSupportedLocale, setLocale, applyTheme };
export type { ThemeBad, Theme, SupportedLocale };
