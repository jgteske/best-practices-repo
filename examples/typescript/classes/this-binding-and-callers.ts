/**
 * Calling a class method: who `this` is, and how callers lose it.
 *
 * `this` is decided by the *call*, not by the definition. `obj.method()` binds
 * `this` to `obj`; every other call form - a detached reference, a callback, a
 * destructured method - does not. TypeScript can catch some of that, but only
 * if you tell it to.
 */

// --- The failure, and the three fixes ------------------------------------------

class Stopwatch {
  #ticks = 0;

  // A prototype method: one copy shared by every instance, and `this` supplied
  // by the call site. Cheap, but detachable - which is the whole problem.
  tick(): number {
    return (this.#ticks += 1);
  }

  // An arrow-function field: one closure per instance, `this` captured
  // lexically when the field initializes. Survives any call form.
  tickBound = (): number => {
    return (this.#ticks += 1);
  };

  get ticks(): number {
    return this.#ticks;
  }
}

const stopwatch = new Stopwatch();

// ✅ method call: `this` is `stopwatch`
stopwatch.tick();

// ❌ compiles, throws at runtime:
//    TypeError: Cannot read private member #ticks from an object whose class
//    did not declare it. The compiler sees a `() => number` and is satisfied.
const detached = stopwatch.tick;
try {
  detached();
} catch (error) {
  console.log(error instanceof TypeError); // true
}

// ✅ fix 1: keep the call a method call
const viaArrow = () => stopwatch.tick();

// ✅ fix 2: bind once, and keep the bound reference if you will need to
//    unregister it later
const viaBind = stopwatch.tick.bind(stopwatch);

// ✅ fix 3: an arrow field - already bound, and the same identity every time
const viaField = stopwatch.tickBound;

viaArrow();
viaBind();
viaField();
console.log(stopwatch.ticks); // 4

// --- Where this actually bites -------------------------------------------------

// Every one of these compiles. The first three are broken.
//
//   setTimeout(stopwatch.tick, 0);
//   [1, 2, 3].forEach(stopwatch.tick);
//   button.addEventListener("click", stopwatch.tick);
//   const { tick } = stopwatch;                    // destructuring detaches too
//
// The rule of thumb: the moment a method is *passed* rather than *called*, it
// needs `.bind`, an arrow wrapper, or to have been an arrow field all along.

// --- Making the compiler see it: the `this` parameter --------------------------

// `this` as the first parameter is a type annotation, not a real parameter - it
// disappears at runtime. It makes the requirement part of the signature, so a
// wrong call site is a compile error rather than a 3am stack trace.
class Toggle {
  on = false;

  // Only callable with a `Toggle` as `this`.
  flip(this: Toggle): boolean {
    return (this.on = !this.on);
  }
}

const toggle = new Toggle();
const flip = toggle.flip;
// flip();                                    // ❌ 'this' context of type 'void' is not
//                                            //    assignable to 'Toggle'
console.log(flip.call(toggle)); // true - and `.call` is checked too

// The same annotation is what types a callback that a framework will invoke
// with a `this` of its own choosing:
function handleClick(this: HTMLButtonElement, event: MouseEvent): string {
  // `this` is the element the listener was attached to - correctly typed,
  // with no cast and no `any`.
  return `${this.name}: ${event.type}`;
}

// `ThisParameterType` and `OmitThisParameter` read that annotation off a
// function type - useful when wrapping or re-exporting one.
type ClickTarget = ThisParameterType<typeof handleClick>; // HTMLButtonElement
type BoundClick = OmitThisParameter<typeof handleClick>; // (event: MouseEvent) => string

declare const button: HTMLButtonElement;
const boundClick: BoundClick = handleClick.bind(button);
button.addEventListener("click", (event) => console.log(boundClick(event)));

// --- Callers that pass more arguments than you expect --------------------------

class Parser {
  constructor(private readonly radix: number) {}

  parse(text: string): number {
    return Number.parseInt(text, this.radix);
  }

  // ❌ `["8", "9"].map(this.parse)` would break twice over: `this` is lost, and
  //    `map` passes (value, index, array) into a one-parameter function.
  //    Wrapping the call fixes both, and is the reason the wrapper is worth
  //    writing even when `this` is not involved.
  parseAll(texts: readonly string[]): number[] {
    return texts.map((text) => this.parse(text));
  }
}

console.log(new Parser(16).parseAll(["ff", "10"])); // [255, 16]

// --- Static methods have a `this` too ------------------------------------------

class Registry {
  static #items = new Set<string>();

  // Inside a static method, `this` is the class. Naming the class explicitly
  // (`Registry.#items`) is one less thing to think about when the method is
  // later called as `const { add } = Registry`.
  static add(item: string): number {
    Registry.#items.add(item);
    return Registry.#items.size;
  }
}

const { add } = Registry;
console.log(add("a"), add("b")); // 1 2 - fine, because it never used `this`

export { Stopwatch, Toggle, Parser, Registry, handleClick };
export type { ClickTarget, BoundClick };
