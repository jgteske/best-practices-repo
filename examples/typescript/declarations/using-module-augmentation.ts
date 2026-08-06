// The consumer that proves the augmentations landed.
import type { CSSProperties } from "react";

// Without the `react` augmentation this object is an error: `CSSProperties` has
// no index signature, so `--brand-hue` is "not a known property".
export const themedCard: CSSProperties = {
  "--brand-hue": 210,
  "--brand-saturation": "80%",
  color: "hsl(var(--brand-hue) var(--brand-saturation) 40%)",
  padding: 16,
};

// Added through `declare global` from inside a module file.
export const betaEnabled = window.featureFlags.has("beta");

export function firstOrThrow<T>(values: T[]): T {
  // `atOrThrow` exists only because the global augmentation declared it. Note
  // what that means: the type system is now describing a runtime that only
  // exists if the polyfill is actually loaded. A declaration is a claim, and
  // this one is only as true as the app entry point makes it.
  return values.atOrThrow(0);
}
