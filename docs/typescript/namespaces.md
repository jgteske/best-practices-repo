# Namespaces & Declaration Merging

`namespace` is the construct people meet by accident - in an old tutorial, in a
`.d.ts` inside `node_modules`, or in a codebase that predates ES modules. It is
worth understanding for two opposite reasons: you will read a lot of it, and you
should write almost none of it.

## What a namespace is

A namespace groups declarations under a single name. TypeScript originally
called them "internal modules", because they were the answer to code
organisation before JavaScript had `import` and `export` of its own.

Unlike a type or an interface, a namespace with values in it **emits real
JavaScript**:

<<< ../../examples/typescript/namespaces/namespace-basics.ts

That compiles to an object plus an IIFE that fills it in - this is `tsc` output
for the example above, comments stripped:

```js
export var Geometry;
(function (Geometry) {
    const TAU = Math.PI * 2;
    function circumference(radius) {
        return TAU * radius;
    }
    Geometry.circumference = circumference;
    let polar;
    (function (polar) {
        function toCartesian(radius, angle) {
            return { x: radius * Math.cos(angle), y: radius * Math.sin(angle) };
        }
        polar.toCartesian = toCartesian;
    })(polar = Geometry.polar || (Geometry.polar = {}));
})(Geometry || (Geometry = {}));
```

Everything the emitted code does is visible there: `TAU` stays private because
it is closed over, exported members are assigned onto the object, and the
`Geometry.polar || (Geometry.polar = {})` dance is what lets a namespace be
*reopened* - by a later block, or by another file entirely.

## Why modules replaced them

A module already is a namespace. `import * as Geometry from "./geometry.js"`
gives you the identical dotted access at the use site, with three things the
namespace cannot offer:

| | `namespace` | ES module |
| --- | --- | --- |
| Tree-shaking | ✗ - one object literal, built in full | ✓ - unused exports are dropped |
| Evaluation | eager, whenever the file runs | lazy, on import |
| Cross-file composition | relies on files being concatenated in the right order | explicit, per-file imports |
| Tooling | TypeScript-only | standard JavaScript |

The last row matters most: `namespace` is a TypeScript-only language feature
that survives into the output. Everything else this guide recommends is either
erased at compile time or standard JavaScript.

::: warning A namespace inside a module is redundant
```ts
// ❌ utils.ts — the file is already a module
export namespace StringUtils {
  export function slugify(input: string) { /* … */ }
}
```
Callers now write `StringUtils.slugify(…)` and bundle *all* of `StringUtils`,
because the namespace object has to be constructed whole. Export the functions
directly and let the module do the grouping it was already doing. TypeScript's
own coding guidelines have said this since ES modules landed.
:::

## Where namespaces are still correct

Three cases, all of which share a property: you are describing or extending a
name that already exists, which is something modules cannot do.

### Global libraries in a declaration file

A library loaded by a `<script>` tag puts one object on the global scope. A
namespace is the only way to describe that shape, which is why
`node_modules/@types/react/index.d.ts` opens with exactly this:

```ts
export = React;
export as namespace React;

declare namespace React {
  // …every React type, nested under one global name
}
```

`export as namespace React` is the UMD flourish: importable as a module *and*
available as a global if the page loaded it with a script tag. The
[declarations page](./file-kinds-and-declarations#script-mode-ambient-modules-asset-shims-globals)
covers writing one of these.

### Adding types to something that already exists

This is declaration merging, and it is the reason the keyword has not been
retired:

<<< ../../examples/typescript/namespaces/declaration-merging.ts

**Function + namespace** attaches statics *and types* to a callable, so
`parseDuration("1m")`, `parseDuration.safe("1m")` and the type
`parseDuration.Unit` all live under one name. Reach for it only when you need
that type: if you just want statics, `Object.assign(fn, { … })` is plainer
JavaScript and needs no TypeScript-only syntax.

**Class + namespace** does the same for a class, which is how `HttpClient.Options`
ends up sitting next to the class it configures instead of floating in the
module as `HttpClientOptions`.

### Interface merging

Two interfaces of the same name in the same scope add up. No namespace involved,
same mechanism:

```ts
interface PluginRegistry { readonly markdown: (input: string) => string; }
interface PluginRegistry { readonly sanitize: (input: string) => string; }
// PluginRegistry now has both.
```

Every `declare module "x" { interface Y { … } }` augmentation is this, reached
through a module - including the React `CSSProperties` widening on the
[declarations page](./file-kinds-and-declarations#module-mode-augmenting-what-already-exists).

::: warning Merging is additive and silent
Nothing warns you that a second declaration of a name exists. The merge just
happens, a conflicting property type errors somewhere that may be far from
either declaration, and readers of one file have no signal that another file
changed the type. It is the right tool for extending types you do not own, and
the wrong one for organising types you do.
:::

## Deciding

| You want to… | Use |
| --- | --- |
| Group your own code | a module (a file), and folders |
| Group your own types | a module - `import type { … }` |
| Attach statics to a function | `Object.assign`, unless you also need types under that name |
| Attach types to a function or class | function/class + `namespace` merging |
| Describe a `<script>`-tag global | `declare namespace` in a script-mode `.d.ts` |
| Add a property to another package's type | `declare module "pkg" { interface … }` |
| Add a global | `declare global { … }` from a module |

::: tip The other TypeScript-only runtime construct
`namespace` and `enum` are the two features that emit JavaScript of their own
rather than being erased. Both have plain alternatives worth preferring - see
[Const Assertions & Enum Alternatives](./const-assertions-and-enums) for `enum`,
and modules for `namespace`.
:::

## Summary

- A namespace is pre-modules code organisation, and one of the few TypeScript
  features that emits runtime JavaScript.
- It compiles to an object plus an IIFE, which is why it cannot be tree-shaken.
- In new code, a module is the namespace. A `namespace` inside a module is pure
  redundancy.
- Namespaces remain correct for **declaration merging** and for describing
  **global/UMD libraries** in a `.d.ts` - both things modules cannot express.
- Function + namespace and class + namespace are the merging patterns worth
  knowing; use them when you need a *type* under the existing name, not just a
  static.
- Merging is silent and additive: excellent for extending other people's types,
  poor for structuring your own.
