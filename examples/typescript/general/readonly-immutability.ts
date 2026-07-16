/**
 * `readonly` and immutability: making accidental mutation a compile error
 * instead of a runtime surprise (or a debugging session three files away
 * from where the mutation actually happened).
 */

interface MutablePoint {
  x: number;
  y: number;
}

function badTranslate(point: MutablePoint, dx: number, dy: number): MutablePoint {
  // Mutating the input is a common source of "spooky action at a distance"
  // bugs: whoever called `badTranslate` still holds a reference to `point`
  // and now sees it silently changed underneath them.
  point.x += dx;
  point.y += dy;
  return point;
}

interface Point {
  readonly x: number;
  readonly y: number;
}

function translate(point: Point, dx: number, dy: number): Point {
  // point.x += dx;  // <- compile error: x is readonly
  return { x: point.x + dx, y: point.y + dy };
}

// `readonly` on arrays and `ReadonlyArray<T>` prevent mutating methods
// (`push`, `splice`, `sort`, ...) from even type-checking.
function sumOf(values: readonly number[]): number {
  // values.push(1);  // <- compile error: push does not exist on readonly number[]
  return values.reduce((total, value) => total + value, 0);
}

// `as const` is the same idea applied to object/array *literals*: it makes
// every property readonly and every array a readonly tuple, recursively.
const ORIGIN = { x: 0, y: 0 } as const;
// ORIGIN.x = 1; // <- compile error

// For deeply nested structures, a small recursive `DeepReadonly` utility
// extends the same guarantee below the top level, where plain `readonly`
// stops (readonly only applies to the properties it's written on).
type DeepReadonly<T> = T extends (infer U)[]
  ? readonly DeepReadonly<U>[]
  : T extends object
    ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
    : T;

interface Settings {
  theme: { primary: string; secondary: string };
  featureFlags: string[];
}

function applySettings(settings: DeepReadonly<Settings>): void {
  // settings.theme.primary = "#000"; // <- compile error, nested too
  console.log(settings.theme.primary, settings.featureFlags.length);
}

export { badTranslate, translate, sumOf, applySettings, ORIGIN };
export type { MutablePoint, Point, DeepReadonly, Settings };
