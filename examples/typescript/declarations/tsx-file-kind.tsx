// What changes when a file is .tsx rather than .ts:
//
//   1. JSX syntax is allowed (and requires a `jsx` setting in tsconfig).
//   2. `<T>` is parsed as a JSX tag, so the angle-bracket type ASSERTION
//      (`<string>value`) is gone, and a generic arrow function needs a hint.
//
// That is the entire difference. .tsx is not "TypeScript for React" - it is
// "TypeScript that also parses JSX". A React file with no JSX in it (a hook, a
// context factory, a reducer) should be a plain .ts.

// --- The trap ---------------------------------------------------------------------
//
// This is a syntax error in a .tsx file, and perfectly fine in a .ts one:
//
//   const identity = <T>(value: T): T => value;
//                     ^ TS17008: JSX element 'T' has no corresponding closing tag
//
// Three ways to write it that all work in .tsx:

/** 1. A trailing comma disambiguates the type parameter list from a JSX tag. */
export const identity = <T,>(value: T): T => value;

/** 2. A constraint does the same job, and reads better when one is meaningful. */
export const first = <T extends readonly unknown[]>(values: T): T[number] | undefined => values[0];

/** 3. A function declaration has no ambiguity at all - often the simplest answer. */
export function last<T>(values: readonly T[]): T | undefined {
  return values[values.length - 1];
}

// --- The other .tsx-only casualty --------------------------------------------------
//
// Angle-bracket assertions (`<HTMLInputElement>element`) do not parse in .tsx.
// `as` works in both file kinds, which is why it is the one to standardise on.

export function focusInput(node: Element): void {
  const input = node as HTMLInputElement; // ✅ works in .ts and .tsx
  input.focus();
}

// --- JSX, the reason the file kind exists ------------------------------------------

type BadgeProps = {
  readonly label: string;
  readonly hue?: number;
};

export function Badge({ label, hue = 210 }: BadgeProps) {
  // The `--badge-hue` key is legal here only because module-augmentation.d.ts
  // widened React's CSSProperties - a declaration file changing what compiles in
  // a completely different file, which is exactly what they are for.
  return <span style={{ "--badge-hue": hue }}>{label}</span>;
}

// A generic component: the same `<T,>` hint applies, since a generic arrow is
// still a generic arrow when it returns JSX.
export const List = <T,>({ items, render }: { items: readonly T[]; render: (item: T) => string }) => (
  <ul>
    {items.map((item, index) => (
      <li key={index}>{render(item)}</li>
    ))}
  </ul>
);
