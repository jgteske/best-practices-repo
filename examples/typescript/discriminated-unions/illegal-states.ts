/**
 * Make illegal states unrepresentable.
 *
 * A "bag of optional fields" lets the compiler accept combinations that
 * should never occur. A discriminated union encodes the rule that only
 * certain field combinations are valid, so the bad states can't be
 * constructed at all.
 */

// ANTI-PATTERN: every field optional, all combinations "valid".
// Nothing stops `{ status: "loading", data: [...], error: "..." }` -
// a loading request that somehow also has data AND an error.
interface BadRequestState<T> {
  status: "idle" | "loading" | "success" | "error";
  data?: T;
  error?: string;
}

// Because any field can be present in any status, every read needs
// defensive checks and the compiler can't help you get them right.
function renderBad<T>(state: BadRequestState<T>): string {
  if (state.status === "success") {
    // `data` is `T | undefined` even though logically it must exist here.
    return `ok: ${JSON.stringify(state.data)}`;
  }
  return state.status;
}

// PATTERN: one variant per legal state. Each variant carries exactly the
// data that state has - no more, no less.
type RequestState<T> =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; data: T }
  | { status: "error"; error: string };

// Now `data` is guaranteed to exist in the "success" branch, and trying to
// read `state.error` there is a compile error. Illegal states can't even be
// typed, let alone reached.
function render<T>(state: RequestState<T>): string {
  switch (state.status) {
    case "idle":
      return "idle";
    case "loading":
      return "loading...";
    case "success":
      return `ok: ${JSON.stringify(state.data)}`; // data: T, no `?`
    case "error":
      return `error: ${state.error}`;
  }
}

// Constructing an illegal state is now a type error, caught before it runs:
// const broken: RequestState<number> = { status: "loading", data: 1 };
//                                                            ^ not allowed

const example: RequestState<number[]> = { status: "success", data: [1, 2, 3] };
console.log(render(example));

export { renderBad, render };
export type { BadRequestState, RequestState };
