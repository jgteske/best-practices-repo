/**
 * A factory is a function that returns an object.
 *
 * Where a class attaches behaviour to `this` and hands out instances via `new`,
 * a factory closes over its state and hands back a plain object. Both model the
 * same thing, but the factory gets three properties for free: state that is
 * genuinely unreachable, methods that survive being detached, and structural
 * typing - no `implements`, no inheritance, no `instanceof`.
 */

// The contract, as a plain type. Nothing needs to declare that it implements
// this: TypeScript is structural, so any object of this shape *is* a Counter.
type Counter = {
  increment: () => number;
  readonly value: number;
};

// The class version. `#count` is genuinely private at runtime (an ES2022
// private field), but every method still depends on `this` being correct.
class ClassCounter {
  #count = 0;

  increment(): number {
    this.#count += 1;
    return this.#count;
  }

  get value(): number {
    return this.#count;
  }
}

// The factory version: `count` is an ordinary local that the returned closures
// capture. There is no `this` anywhere, so a method can be pulled off the
// object and passed as a callback without ceremony.
function createCounter(start = 0): Counter {
  let count = start;

  return {
    increment: () => (count += 1),
    get value() {
      return count;
    },
  };
}

// A class method detached from its instance loses `this`. The compiler is
// happy - this is a runtime failure, and it is the single most common way
// class-based APIs break when passed to `setTimeout`, `map`, or an event
// listener. The fix is `.bind(this)` or an arrow property, remembered every
// time.
const classCounter = new ClassCounter();
const detachedIncrement = classCounter.increment;
try {
  detachedIncrement();
} catch (error) {
  // TypeError: Cannot read private member #count from an object whose class
  // did not declare it
  console.log(error instanceof Error ? error.name : "unknown"); // TypeError
}

// The factory's method has no `this` to lose, so detaching is a non-event.
const counter = createCounter();
const increment = counter.increment;
increment();
increment();
console.log(counter.value); // 2

// `new` is not a value, so a class cannot be passed where a function is
// expected. A factory can: it *is* a function.
const counters = [0, 10].map(createCounter);
console.log(counters.map((each) => each.increment())); // [1, 11]

// Structural typing means a test double needs no subclass and no mocking
// library - just an object of the right shape. If `Counter` grows a member,
// this stub stops compiling, which is exactly the reminder you want.
const stubCounter: Counter = { increment: () => 99, value: 99 };
console.log(stubCounter.increment()); // 99

export { createCounter, ClassCounter };
export type { Counter };
