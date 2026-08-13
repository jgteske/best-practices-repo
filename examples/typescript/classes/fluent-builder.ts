/**
 * Method chaining: the mutable kind, the immutable kind, and the kind that
 * refuses to build until it has everything it needs.
 *
 * A chainable API is just methods that return a value with more methods on it.
 * The interesting decisions are *what* they return - `this`, a new instance, or
 * a differently-typed instance - and each answer fixes a different problem.
 */

type HttpMethod = "GET" | "POST" | "PUT" | "DELETE";

interface HttpRequest {
  readonly url: string;
  readonly method: HttpMethod;
  readonly headers: Readonly<Record<string, string>>;
  readonly body?: string;
}

// --- 1. Mutable chaining: return `this` ------------------------------------------

// The simplest chain. Every method mutates and hands the same object back, so
// `this` is both the correct return type (it survives subclassing - see
// ./polymorphic-this) and an accurate description of what happens.
class MutableRequestBuilder {
  #url = "";
  #method: HttpMethod = "GET";
  readonly #headers: Record<string, string> = {};

  url(url: string): this {
    this.#url = url;
    return this;
  }

  method(method: HttpMethod): this {
    this.#method = method;
    return this;
  }

  header(name: string, value: string): this {
    this.#headers[name] = value;
    return this;
  }

  build(): HttpRequest {
    if (this.#url === "") throw new Error("url is required");
    return { url: this.#url, method: this.#method, headers: { ...this.#headers } };
  }
}

console.log(
  new MutableRequestBuilder().url("/users").method("POST").header("accept", "json").build(),
);
// { url: '/users', method: 'POST', headers: { accept: 'json' } }

// ⚠️ The cost of returning `this`: there is only ever one object, so a "branch"
// is not a branch.
const shared = new MutableRequestBuilder().url("/users");
const asJson = shared.header("accept", "json");
const asXml = shared.header("accept", "xml");
console.log(asJson === asXml, asJson.build().headers["accept"]); // true xml
// Both names point at the same builder, and the second call overwrote the
// first. Mutable builders are fine when built and thrown away in one
// expression, and a bug generator the moment one is stored in a variable.

// --- 2. Immutable chaining: return a new instance --------------------------------

// Each step returns a fresh instance, so a partially configured builder is a
// safe thing to share, reuse, and pass around.
class RequestBuilder {
  // A private constructor keeps `new` out of callers' hands: they start from
  // `RequestBuilder.to(...)`, which reads better and validates once.
  private constructor(private readonly config: HttpRequest) {}

  static to(url: string): RequestBuilder {
    if (!url.startsWith("/")) throw new TypeError(`expected a path, got ${url}`);
    return new RequestBuilder({ url, method: "GET", headers: {} });
  }

  method(method: HttpMethod): RequestBuilder {
    return new RequestBuilder({ ...this.config, method });
  }

  header(name: string, value: string): RequestBuilder {
    return new RequestBuilder({
      ...this.config,
      headers: { ...this.config.headers, [name]: value },
    });
  }

  build(): HttpRequest {
    return this.config;
  }
}

const base = RequestBuilder.to("/users").header("accept", "json");
const post = base.method("POST");
const del = base.method("DELETE");
console.log(base.build().method, post.build().method, del.build().method); // GET POST DELETE

// The trade is one allocation per step for branches that actually branch. For
// configuration objects - built once, at startup, from a handful of calls -
// that cost is not measurable and the safety is.

// --- 3. Type-state: `build()` that only exists once it is legal -------------------

// The builder carries a type parameter listing which required fields have been
// supplied. `build` uses a `this` parameter to demand the full set, so calling
// it too early is a compile error rather than a runtime `throw`.
type RequiredField = "url" | "method";

class SafeRequestBuilder<Supplied extends RequiredField = never> {
  private constructor(private readonly config: Partial<HttpRequest>) {}

  static create(): SafeRequestBuilder {
    return new SafeRequestBuilder({});
  }

  url(url: string): SafeRequestBuilder<Supplied | "url"> {
    return new SafeRequestBuilder<Supplied | "url">({ ...this.config, url });
  }

  method(method: HttpMethod): SafeRequestBuilder<Supplied | "method"> {
    return new SafeRequestBuilder<Supplied | "method">({ ...this.config, method });
  }

  // Optional steps do not change the type parameter.
  header(name: string, value: string): SafeRequestBuilder<Supplied> {
    return new SafeRequestBuilder<Supplied>({
      ...this.config,
      headers: { ...this.config.headers, [name]: value },
    });
  }

  // The `this` parameter is the whole trick: this method is only callable when
  // the receiver's `Supplied` covers every required field.
  build(this: SafeRequestBuilder<RequiredField>): HttpRequest {
    const { url, method, headers = {} } = this.config;
    // Inside, the fields are still optional - the *caller* was constrained, not
    // the storage. A single assertion at the boundary is the honest price.
    return { url: url as string, method: method as HttpMethod, headers };
  }
}

console.log(SafeRequestBuilder.create().url("/users").method("PUT").header("x", "1").build());
// { url: '/users', method: 'PUT', headers: { x: '1' } }

// SafeRequestBuilder.create().url("/users").build();
// ❌ The 'this' context of type 'SafeRequestBuilder<"url">' is not assignable to
//    method's 'this' of type 'SafeRequestBuilder<"url" | "method">'.

// --- When not to build a builder ---------------------------------------------------

// A chain earns its keep when there are many optional steps, an order worth
// enforcing, or a configuration reused across branches. For three fields, an
// options object says the same thing with no API to learn and no partially
// constructed state to reason about:
function request(options: {
  url: string;
  method?: HttpMethod;
  headers?: Readonly<Record<string, string>>;
}): HttpRequest {
  return { url: options.url, method: options.method ?? "GET", headers: options.headers ?? {} };
}

console.log(request({ url: "/users", method: "POST" }));
// { url: '/users', method: 'POST', headers: {} }

export { MutableRequestBuilder, RequestBuilder, SafeRequestBuilder, request };
export type { HttpMethod, HttpRequest, RequiredField };
