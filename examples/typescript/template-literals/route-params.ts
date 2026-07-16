/**
 * Derive a typed params object from a route string.
 *
 * This is the pattern behind type-safe routers: the route `"/users/:id/posts/:postId"`
 * is parsed *at the type level* into `{ id: string; postId: string }`, so the
 * params you pass are checked against the route you declared - no manual
 * duplication, no drift.
 */

// Recursively walk the path, collecting every `:param` segment into a union.
type PathParam<Path extends string> =
  Path extends `${string}:${infer Param}/${infer Rest}`
    ? Param | PathParam<`/${Rest}`>
    : Path extends `${string}:${infer Param}`
      ? Param
      : never;

// Turn that union of names into a params object of `{ name: string }`.
type RouteParams<Path extends string> = {
  [K in PathParam<Path>]: string;
};

// A `navigate` function that demands exactly the params its route declares.
function navigate<Path extends string>(
  path: Path,
  params: RouteParams<Path>,
): string {
  // Replace each :param with its value to build the concrete URL.
  return Object.entries(params).reduce<string>(
    (url, [key, value]) => url.replace(`:${key}`, String(value)),
    path,
  );
}

// `params` is required to be exactly { id: string; postId: string }.
const url = navigate("/users/:id/posts/:postId", { id: "7", postId: "99" });
console.log(url); // /users/7/posts/99

// navigate("/users/:id", {});             // error: missing `id`
// navigate("/users/:id", { id: "1", x: 1 }); // error: unknown `x` / wrong type

export { navigate };
export type { PathParam, RouteParams };
