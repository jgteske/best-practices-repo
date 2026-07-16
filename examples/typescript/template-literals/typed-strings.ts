/**
 * Template literal types: give strings real structure.
 *
 * A `string` type accepts any string. Template literal types let you describe
 * the *shape* of a string - a prefix, an id, a route with params - so typos
 * and malformed values are caught at compile time instead of at runtime.
 */

// A branded-by-shape id: any string starting with "user_".
type UserId = `user_${string}`;

function getUser(id: UserId): void {
  console.log(`fetching ${id}`);
}

getUser("user_42"); // ok
// getUser("42");   // compile error: not a `user_${string}`

// Combine unions to generate every valid combination automatically.
type Color = "red" | "green" | "blue";
type Shade = 100 | 500 | 900;
// Expands to "red-100" | "red-500" | ... | "blue-900" (9 members).
type ColorToken = `${Color}-${Shade}`;

const token: ColorToken = "green-500"; // only real combinations allowed
console.log(token);

// Extract structure back OUT of a string with `infer` in a conditional type.
// Given "GET /users/:id", pull the method and path apart at the type level.
type Method = "GET" | "POST" | "PUT" | "DELETE";
type Route = `${Method} /${string}`;

type MethodOf<R extends Route> = R extends `${infer M extends Method} /${string}`
  ? M
  : never;

type Example = MethodOf<"POST /orders">; // "POST"
const method: Example = "POST";
console.log(method);

export { getUser };
export type { UserId, ColorToken, Route, MethodOf };
