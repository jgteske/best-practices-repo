/**
 * Attaching DOM event listeners from inside a class.
 *
 * The classic pitfall: `this.element.addEventListener("click", this.onClick)`
 * silently breaks `this` binding unless `onClick` is bound. This file shows
 * the three viable fixes and recommends one.
 */

class NaiveWidget {
  private button = document.createElement("button");
  private clicks = 0;

  constructor() {
    // BAD: a regular method passed as a callback loses its `this`.
    // Calling `this.clicks++` inside `handleClick` would throw at runtime
    // because `this` is `undefined` (strict mode) or the button element.
    this.button.addEventListener("click", this.handleClick);
  }

  private handleClick(): void {
    this.clicks++;
  }
}

class BoundInConstructorWidget {
  private button = document.createElement("button");
  private clicks = 0;
  // Keep a reference to the *bound* function so removeEventListener can
  // find the exact same function identity later.
  private readonly boundHandleClick = this.handleClick.bind(this);

  constructor() {
    this.button.addEventListener("click", this.boundHandleClick);
  }

  private handleClick(): void {
    this.clicks++;
  }

  destroy(): void {
    this.button.removeEventListener("click", this.boundHandleClick);
  }
}

/**
 * RECOMMENDED: declare the handler as an arrow-function class field.
 *
 * Arrow function class fields capture `this` lexically at construction
 * time, so the method is already bound - no `.bind()` calls, no separate
 * "bound" reference to keep track of, and `this.handleClick` used for
 * `removeEventListener` is guaranteed to be the *same* function reference
 * used for `addEventListener`.
 */
class Widget {
  private readonly button: HTMLButtonElement;
  private clicks = 0;

  constructor(button: HTMLButtonElement) {
    this.button = button;
    this.button.addEventListener("click", this.handleClick);
  }

  // Arrow function class field: bound once per instance, reused forever.
  private readonly handleClick = (event: MouseEvent): void => {
    this.clicks++;
    console.log(`clicked ${this.clicks} times at (${event.clientX}, ${event.clientY})`);
  };

  destroy(): void {
    // Same function reference as the one passed to addEventListener,
    // so this actually removes it (unlike passing a fresh arrow function).
    this.button.removeEventListener("click", this.handleClick);
  }
}

export { NaiveWidget, BoundInConstructorWidget, Widget };
