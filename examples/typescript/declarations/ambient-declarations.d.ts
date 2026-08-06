// A SCRIPT-mode declaration file: it has no top-level `import` or `export`, so
// everything in it lands in the GLOBAL scope of the project. That single
// property decides what `declare module` means here, and it is the thing people
// get wrong. See module-augmentation.d.ts for the other mode.
//
// A .d.ts contains types only. There is no runtime code in this file, nothing is
// emitted from it, and `declare` is what says "this exists somewhere else -
// trust me". If the promise is a lie, the compiler cannot tell.

// 1. An ambient module: types for a package that ships JavaScript with no types
//    of its own. Without this, `import ... from "legacy-analytics"` is TS2307.
declare module "legacy-analytics" {
  export interface TrackOptions {
    /** Sent as-is to the collector. */
    readonly context?: Record<string, string | number | boolean>;
    readonly immediate?: boolean;
  }

  export function track(event: string, options?: TrackOptions): void;
  export function identify(userId: string): void;

  const version: string;
  export default version;
}

// 2. A wildcard module: the shim every bundler-based project needs, because
//    `import logo from "./logo.svg"` is not something TypeScript can resolve on
//    its own - the bundler invents that module at build time.
declare module "*.svg" {
  const source: string;
  export default source;
}

declare module "*.module.css" {
  const classes: Readonly<Record<string, string>>;
  export default classes;
}

// 3. Interface merging with the DOM's own `Window`. In a script-mode file this
//    is a plain declaration - no `declare global` needed, because there is no
//    module scope to escape from.
interface Window {
  /** Injected by the build as an inline <script>. */
  readonly buildId: string;
}

// 4. A namespace: the right tool for a library loaded by a <script> tag, which
//    puts one object on the global scope with everything hanging off it. This is
//    what `declare namespace React` in @types/react is doing.
declare namespace LegacyWidgets {
  interface MountOptions {
    readonly container: HTMLElement;
    readonly locale?: string;
  }

  /** Namespaces nest, which is how a global API gets its shape. */
  namespace themes {
    type Name = "light" | "dark";
    function apply(name: Name): void;
  }

  function mount(options: MountOptions): () => void;
  const version: string;
}
