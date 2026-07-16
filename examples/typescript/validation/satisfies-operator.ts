/**
 * `satisfies`: validate an object literal against a type without widening
 * the literal's inferred type the way a `: Type` annotation would.
 */

type Route = "home" | "settings" | "billing";

interface RouteConfig {
  path: string;
  requiresAuth: boolean;
}

// OPTION A: no check at all. Typos in keys or values are invisible to the
// compiler - `route: "hmoe"` would compile just fine.
const routesUnchecked = {
  home: { path: "/", requiresAuth: false },
  settings: { path: "/settings", requiresAuth: true },
  billing: { path: "/settings/billing", requiresAuth: true },
};

// OPTION B: a `: Record<Route, RouteConfig>` annotation checks the shape
// (and, as a bonus, is exhaustive over `Route` - a missing key is an error)
// but *widens* every `path` to `string`, so `routesAnnotated.home.path` is
// typed `string`, not the literal `"/"`.
const routesAnnotated: Record<Route, RouteConfig> = {
  home: { path: "/", requiresAuth: false },
  settings: { path: "/settings", requiresAuth: true },
  billing: { path: "/settings/billing", requiresAuth: true },
};

// RECOMMENDED: `satisfies` checks the literal against `Record<Route,
// RouteConfig>` - wrong keys, missing keys, and wrong-shaped values are all
// still compile errors - but the *inferred type* of `routes` stays the
// literal object type, so `routes.home.path` is the literal `"/"`, not
// `string`, and `routes.home.requiresAuth` is literal `false`, not `boolean`.
const routes = {
  home: { path: "/", requiresAuth: false },
  settings: { path: "/settings", requiresAuth: true },
  billing: { path: "/settings/billing", requiresAuth: true },
} satisfies Record<Route, RouteConfig>;

// routes.home.path has type "/" here, so this is a compile error:
// const target: "/settings" = routes.home.path;

function navigate(route: Route): void {
  console.log(`navigating to ${routes[route].path}`);
}

navigate("billing");

export { routesUnchecked, routesAnnotated, routes, navigate };
export type { Route, RouteConfig };
