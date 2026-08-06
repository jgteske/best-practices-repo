// A MODULE-mode declaration file: it has a top-level `import`, so it is a module
// and nothing in it is global by default. The same `declare module` syntax now
// means something completely different - it AUGMENTS an existing module instead
// of declaring a new one.
//
//   script-mode .d.ts + declare module "x"  ->  "module x exists, here are its types"
//   module-mode .d.ts + declare module "x"  ->  "module x already exists, add to it"
//
// Getting this backwards is the single most common .d.ts failure: an augmentation
// of a package that does not exist silently declares nothing, and every import of
// it fails with TS2307.
import "react";

// Reopening an existing interface from another package. React's `CSSProperties`
// does not allow arbitrary keys, so `style={{ "--brand-hue": 210 }}` is an error
// until this augmentation says custom properties are welcome.
declare module "react" {
  interface CSSProperties {
    [customProperty: `--${string}`]: string | number | undefined;
  }
}

// `declare global` is how a MODULE reaches global scope. In a script-mode file
// this block is unnecessary (and an error); here it is the only way.
declare global {
  interface Window {
    readonly featureFlags: ReadonlySet<string>;
  }

  // Merging into an existing global interface works the same way. Every `Array`
  // in the project now has this method as far as the type system is concerned -
  // which is a good reason to be sparing: a global declaration is global.
  interface Array<T> {
    /** Provided by a polyfill loaded in the app entry point. */
    atOrThrow(index: number): T;
  }
}

// A module-mode .d.ts still needs an export to stay a module if it has no import.
// This one has `import "react"` above, so it is already a module - but
// `export {}` is the usual way to force module mode in a file that imports nothing.
export {};
