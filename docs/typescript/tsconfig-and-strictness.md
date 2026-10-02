# tsconfig & Strictness Flags

`tsconfig.json` decides how much the compiler is allowed to catch. Most
projects turn on `strict` and stop there, but the flags that matter most in
day-to-day bugs (`undefined` from an array index, `undefined` written into an
optional field) are **not** part of `strict`. This page walks through this
repository's own config and shows what each flag catches.

## This repository's config

<<< ../../tsconfig.json{json}

It falls into three groups: **what to compile for** (`target`, `lib`, `module`,
`moduleResolution`, `jsx`), **how strict to be** (`strict` and the four flags
after it), and **project hygiene** (`isolatedModules`, `skipLibCheck`,
`forceConsistentCasingInFileNames`, `noEmit`).

## What each strictness flag catches

Every `@ts-expect-error` below marks a line that compiles **without** the flag
and is rejected **with** it. `npm run typecheck` fails if a marked line ever
stops being an error, so the claims on this page are checked like everything else.

<<< ../../examples/typescript/tsconfig/strict-flags.ts

| Flag | In `strict`? | Catches |
| --- | --- | --- |
| `strictNullChecks` | yes | using a value that may be `null`/`undefined` |
| `noImplicitAny` | yes | parameters and variables whose type silently became `any` |
| `strictPropertyInitialization` | yes | class fields that are declared but never assigned |
| `useUnknownInCatchVariables` | yes | touching `error.message` before checking what was thrown |
| `strictFunctionTypes` | yes | unsound callback assignments (but [not for method syntax](./generics-in-depth#variance-annotations-4-7)) |
| `noUncheckedIndexedAccess` | **no** | `array[i]` and `record[key]` treated as always present |
| `exactOptionalPropertyTypes` | **no** | `{ timeout: undefined }` where the field may only be *absent* |
| `noImplicitOverride` | **no** | a subclass method that overrides by accident, or stops overriding after a rename |
| `noUnusedLocals` / `noUnusedParameters` | **no** | dead variables and parameters (linters also catch these) |

::: tip Turning them on in an existing codebase
`strict` is non-negotiable for new code. For an existing project, enable
`noUncheckedIndexedAccess` first. It finds the most real bugs, and the fixes
(`?? default`, a guard, or `for...of` instead of indexing) are mechanical.
`exactOptionalPropertyTypes` is the noisiest, because it touches every spread of
partial objects, so leave it for last.
:::

## Target, lib and module settings

| Option | What it controls | Sensible default |
| --- | --- | --- |
| `target` | which syntax is down-levelled in the output | the oldest runtime you support, e.g. `ES2022` for Node 18+ and modern browsers |
| `lib` | which built-in APIs are *typed* (`Array.prototype.at`, `DOM`, ...) | match `target`. Add `DOM` only for browser code |
| `module` | the module syntax of the output | `NodeNext` for Node packages. `ESNext`/`Preserve` when a bundler runs next |
| `moduleResolution` | how `import "x"` is found | `NodeNext` for Node (requires `.js` extensions in relative imports). `Bundler` for Vite/esbuild/webpack |

This repo uses `Bundler` because no output is ever emitted (`noEmit`): `tsc` only checks
types, and the examples import each other without extensions. A library
published to npm and run directly by Node should use `NodeNext` so that
TypeScript resolves imports exactly as Node will. See
[ESM vs CommonJS](/javascript/modules-esm-and-cjs) for the runtime side.

## Hygiene flags

- **`isolatedModules`**: errors on code that a single-file transpiler
  (esbuild, swc, Babel, Node's type stripping) can't compile without type
  information, such as re-exporting a type without `export type`. Turn it on whenever
  anything other than `tsc` produces your JavaScript.
- **`verbatimModuleSyntax`** (5.0): the stricter successor. Imports
  without `type` are kept and `import type` is dropped, exactly as written,
  so you must write `import { type User }`. Prefer it in new projects. This repo
  sticks with `isolatedModules` for now.
- **`skipLibCheck`**: skips type-checking `.d.ts` files. It's almost always on,
  because conflicts between dependency typings are not your bug to fix. The cost is
  that errors in your *own* `.d.ts` files go unchecked too.
- **`forceConsistentCasingInFileNames`**: catches `import "./User"` vs
  `./user`, which works on macOS and Windows and breaks on Linux CI.

## Larger repositories: `extends` and project references

Share settings with `extends` instead of copy-pasting them:

```jsonc
// packages/api/tsconfig.json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": { "outDir": "dist", "rootDir": "src" },
  "include": ["src"]
}
```

In a monorepo, **project references** (`"composite": true` plus a
`"references": [{ "path": "../core" }]` list) let `tsc --build` compile packages
in dependency order and skip the ones that haven't changed. Editors also load
only the projects you are working in.

## Summary

- Use `strict`, plus `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`
  and `noImplicitOverride`. These three catch real bugs that `strict` misses.
- Make `@ts-expect-error` part of your toolkit: it's a checked claim that a line
  *must* fail to compile. Never use `@ts-ignore`.
- Choose `moduleResolution` by who runs the output: `NodeNext` for Node itself, `Bundler`
  for a bundler.
- Enable `isolatedModules` (or `verbatimModuleSyntax`) whenever a fast
  transpiler is in the toolchain.
