/**
 * Bulk-removing listeners with AbortController instead of tracking every
 * bound function reference by hand.
 *
 * `addEventListener`'s third argument accepts `{ signal }`. Aborting the
 * controller removes every listener registered with that signal in one call,
 * which scales much better than a hand-rolled array of `removeEventListener`
 * calls once a class wires up more than one or two events.
 */
class FormController {
  private readonly abortController = new AbortController();

  constructor(private readonly form: HTMLFormElement) {
    const { signal } = this.abortController;

    this.form.addEventListener("submit", this.handleSubmit, { signal });
    this.form.addEventListener("reset", this.handleReset, { signal });
    this.form.addEventListener("input", this.handleInput, { signal });
  }

  private readonly handleSubmit = (event: SubmitEvent): void => {
    event.preventDefault();
    console.log("form submitted", new FormData(this.form));
  };

  private readonly handleReset = (): void => {
    console.log("form reset");
  };

  private readonly handleInput = (event: Event): void => {
    console.log("field changed", event.target);
  };

  /** Call once, on unmount/teardown, to remove every listener above. */
  dispose(): void {
    this.abortController.abort();
  }
}

export { FormController };
