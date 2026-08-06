// A normal .ts file consuming everything ambient-declarations.d.ts declared.
// This file is the proof: if a declaration were wrong or missing, the failure
// shows up HERE, at the use site, not in the .d.ts - which is why a declaration
// file always needs a consumer to be worth anything.

// The package has no types of its own; the ambient module supplied them, and it
// is a normal import - nothing special at the call site.
import analyticsVersion, { track, identify } from "legacy-analytics";
import type { TrackOptions } from "legacy-analytics";

// Resolved by `declare module "*.svg"`.
import logoUrl from "./logo.svg";
import styles from "./widget.module.css";

const options: TrackOptions = {
  context: { plan: "pro", seats: 12 },
  immediate: true,
};

export function trackSignup(userId: string): void {
  identify(userId);
  track("signup", options);
}

// `window.buildId` exists because the .d.ts merged a property into the DOM's
// own Window interface - the two declarations add up rather than conflict.
export const buildInfo = `${window.buildId} (analytics ${analyticsVersion})`;

export const assets = {
  logo: logoUrl,
  className: styles["widget"],
} as const;

// The global namespace is used as a value AND as a type namespace: `mount` is a
// function, `MountOptions` and `themes.Name` are types inside it.
export function mountWidget(container: HTMLElement, theme: LegacyWidgets.themes.Name) {
  const config: LegacyWidgets.MountOptions = { container, locale: "en-GB" };
  LegacyWidgets.themes.apply(theme);
  return LegacyWidgets.mount(config);
}

// ⚠ The catch with `declare`: this compiles, and it is a lie. `declare` asserts
// that something exists at runtime without checking. If `legacy-analytics` ever
// renames `track`, nothing here fails until production does. Hand-written
// declarations are a promise the compiler holds you to only at the type level.
