/**
 * Functions that return classes.
 *
 * A mixin is one shape of this (take a class, return a subclass). The general
 * form is more useful still: parameterise a whole class over values that belong
 * to the *class* rather than to an instance - a name, a schema, a shared cache -
 * and get a new, fully typed class back.
 *
 * The test for whether this is the right tool: if the parameter varies per
 * instance it is a constructor argument. If it varies per class - it appears in
 * statics, in the type, or in something shared by every instance - it belongs
 * to the factory.
 */

// --- Typed error hierarchies in one line each ---------------------------------------

// Every application ends up wanting several error classes that differ only by
// name. Writing them out is five lines apiece; a factory makes each one a line,
// and keeps `instanceof` and the stack trace that a class gives you.
function createErrorClass<const Name extends string>(name: Name) {
  return class extends Error {
    static readonly errorName = name;

    override readonly name: Name = name;

    constructor(message: string, options?: ErrorOptions) {
      super(message, options);
    }
  };
}

// The `const` type parameter keeps the literal, so `error.name` is
// "ValidationError" rather than `string`.
const ValidationError = createErrorClass("ValidationError");
const NotFoundError = createErrorClass("NotFoundError");

// Naming the instance type is the one piece of ceremony this pattern needs. A
// `type` alias with the same name as the `const` merges the two declaration
// spaces, so `ValidationError` works as both a value and a type - exactly like a
// real class declaration.
type ValidationError = InstanceType<typeof ValidationError>;
type NotFoundError = InstanceType<typeof NotFoundError>;

function assertFound<T>(value: T | undefined, what: string): asserts value is T {
  if (value === undefined) throw new NotFoundError(`${what} not found`);
}

const failure: ValidationError = new ValidationError("email is required");
console.log(failure.name, failure instanceof ValidationError, failure instanceof Error);
// ValidationError true true
console.log(ValidationError.errorName); // ValidationError

try {
  assertFound(undefined, "user");
} catch (error) {
  console.log(error instanceof NotFoundError, (error as NotFoundError).name);
  // true NotFoundError
}

// ⚠️ Each *call* creates a distinct class. `createErrorClass("X") !== createErrorClass("X")`,
// so export the constant, never the factory call, or two modules will produce
// two classes with the same name and `instanceof` will disagree with both.

// --- A class parameterised by a schema -------------------------------------------------

// Here the factory argument shapes the *type* of every instance, which a
// constructor parameter cannot do.
type FieldType = "string" | "number";

type Shape = Readonly<Record<string, FieldType>>;

type ModelOf<S extends Shape> = {
  readonly [K in keyof S]: S[K] extends "number" ? number : string;
};

function defineModel<const S extends Shape>(modelName: string, shape: S) {
  return class Model {
    static readonly modelName = modelName;
    static readonly fields = Object.keys(shape) as readonly (keyof S & string)[];

    constructor(readonly data: ModelOf<S>) {}

    // Shared by every instance of this model, and unavailable to any other -
    // the reason the schema lives on the class rather than in each object.
    validate(): readonly string[] {
      return Model.fields.flatMap((field) => {
        const expected = shape[field];
        const actual = typeof this.data[field];
        return actual === expected ? [] : [`${field}: expected ${expected}, got ${actual}`];
      });
    }

    toString(): string {
      return `${Model.modelName}(${JSON.stringify(this.data)})`;
    }
  };
}

const UserModel = defineModel("User", { id: "string", age: "number" } as const);
type UserModel = InstanceType<typeof UserModel>;

const validUser: UserModel = new UserModel({ id: "u_1", age: 41 });
console.log(String(validUser), validUser.validate()); // User({"id":"u_1","age":41}) []
console.log(UserModel.modelName, UserModel.fields); // User [ 'id', 'age' ]

// new UserModel({ id: "u_1", age: "41" });
// ❌ Type 'string' is not assignable to type 'number' - the schema became types.

// --- Returning an abstract class for consumers to extend ---------------------------------

// A factory can hand back a base class that is deliberately incomplete: the
// configuration is baked in, the behaviour is left to the subclass.
interface Handler {
  handle(path: string): string;
}

function createController(config: { readonly prefix: string }) {
  abstract class Controller implements Handler {
    static readonly prefix = config.prefix;

    protected route(path: string): string {
      return `${config.prefix}${path}`;
    }

    abstract handle(path: string): string;
  }

  return Controller;
}

class UsersController extends createController({ prefix: "/api" }) {
  override handle(path: string): string {
    return `GET ${this.route(path)}`;
  }
}

console.log(new UsersController().handle("/users"), UsersController.prefix); // GET /api/users /api

// --- When a plain factory function is the better answer -------------------------------------

// If the result has no statics, no `instanceof` requirement, and nobody extends
// it, the class adds nothing over a closure returning an object - see
// ./factory-functions. The class factory earns its place when the *class* is
// the product: something to extend, to check with `instanceof`, or to hang
// statics on.
function createCounter(start = 0) {
  let count = start;
  return {
    increment: () => (count += 1),
    get value() {
      return count;
    },
  };
}

const counter = createCounter();
counter.increment();
console.log(counter.value); // 1

export { createErrorClass, ValidationError, NotFoundError, assertFound };
export { defineModel, UserModel, createController, UsersController, createCounter };
export type { FieldType, Shape, ModelOf, Handler };
