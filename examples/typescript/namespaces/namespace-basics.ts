// A namespace is TypeScript's pre-modules way of grouping things under one name.
// It predates `import`/`export` in JavaScript and was originally called an
// "internal module". It is a TypeScript-only construct: unlike types, it emits
// real JavaScript (an object plus an IIFE that fills it in).
//
// In new code this is almost never what you want - a module already gives you a
// namespace, and the file system already gives you the grouping. This file shows
// what it does so the version you meet in a .d.ts is readable.

// --- A namespace with values in it -------------------------------------------------

export namespace Geometry {
  // Only what is exported is reachable from outside. Everything else is private
  // to the namespace, closed over by the emitted IIFE.
  const TAU = Math.PI * 2;

  export interface Point {
    readonly x: number;
    readonly y: number;
  }

  export function circumference(radius: number): number {
    return TAU * radius;
  }

  // Namespaces nest, which is where the dotted access comes from.
  export namespace polar {
    export function toCartesian(radius: number, angle: number): Point {
      return { x: radius * Math.cos(angle), y: radius * Math.sin(angle) };
    }
  }
}

// Used as a value and as a type container in the same expression:
const origin: Geometry.Point = Geometry.polar.toCartesian(0, 0);
export const ring = Geometry.circumference(3) + origin.x;

// --- The same thing as a module ----------------------------------------------------
//
// A module file `geometry.ts` exporting `Point`, `circumference` and `polar`
// gives you the identical shape at the use site:
//
//   import * as Geometry from "./geometry.js";
//   const origin: Geometry.Point = Geometry.polar.toCartesian(0, 0);
//
// ...with three advantages the namespace cannot match:
//
//   * it is tree-shakeable - unused exports are dropped by any bundler, whereas
//     a namespace is one object literal that has to be built in full;
//   * it is lazy - a module is only evaluated when imported;
//   * it needs no build-time coordination - namespaces spread across files rely
//     on being concatenated in the right order, which is why they pair with the
//     legacy `--outFile` mode and break under `isolatedModules`.

// --- The anti-pattern: a namespace inside a module ---------------------------------
//
// This is the one to avoid. The file is already a module, so the namespace adds
// a second, redundant layer of grouping and an object that cannot be shaken out:
//
//   // ❌ utils.ts
//   export namespace StringUtils {
//     export function slugify(input: string) { /* ... */ }
//   }
//   // callers write StringUtils.slugify(...) and bundle ALL of StringUtils
//
//   // ✅ string-utils.ts
//   export function slugify(input: string) { /* ... */ }
//   // callers write `import { slugify }` and bundle only slugify
