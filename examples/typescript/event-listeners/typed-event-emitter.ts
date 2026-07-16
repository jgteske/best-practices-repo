/**
 * A strongly-typed event emitter for use inside classes.
 *
 * Instead of a generic `emit(name: string, ...args: any[])`, we describe every
 * event and its payload in a single "event map" interface. TypeScript then
 * checks event names AND payload shapes at every call site.
 */

// 1. Describe every event this class can emit, and the payload each one carries.
interface UserServiceEvents {
  "user:created": { id: string; email: string };
  "user:deleted": { id: string };
  "user:error": { message: string; cause: unknown };
}

// 2. A small reusable base class other classes can extend.
class TypedEventTarget<TEvents extends object> {
  #listeners = new Map<keyof TEvents, Set<(payload: never) => void>>();

  on<TEvent extends keyof TEvents>(
    event: TEvent,
    listener: (payload: TEvents[TEvent]) => void,
  ): () => void {
    const set = this.#listeners.get(event) ?? new Set();
    set.add(listener as (payload: never) => void);
    this.#listeners.set(event, set);

    // Returning the "unsubscribe" function is more ergonomic than forcing
    // callers to hold onto the original listener reference for `off()`.
    return () => set.delete(listener as (payload: never) => void);
  }

  off<TEvent extends keyof TEvents>(
    event: TEvent,
    listener: (payload: TEvents[TEvent]) => void,
  ): void {
    this.#listeners.get(event)?.delete(listener as (payload: never) => void);
  }

  protected emit<TEvent extends keyof TEvents>(
    event: TEvent,
    payload: TEvents[TEvent],
  ): void {
    for (const listener of this.#listeners.get(event) ?? []) {
      (listener as (payload: TEvents[TEvent]) => void)(payload);
    }
  }
}

// 3. Real usage: extend the base class and get full autocomplete + type
// checking for every `on(...)` call, with zero casts at the call site.
class UserService extends TypedEventTarget<UserServiceEvents> {
  async createUser(email: string): Promise<void> {
    const id = crypto.randomUUID();
    // ...persist the user...
    this.emit("user:created", { id, email });
  }

  async deleteUser(id: string): Promise<void> {
    // ...delete the user...
    this.emit("user:deleted", { id });
  }
}

const users = new UserService();

// payload is inferred as { id: string; email: string } - no annotation needed.
const unsubscribe = users.on("user:created", (payload) => {
  console.log(`created user ${payload.id} <${payload.email}>`);
});

// users.on("user:created", (payload) => payload.doesNotExist); // <- compile error
// users.on("user:unknown", () => {});                          // <- compile error

void users.createUser("ada@example.com");
unsubscribe();

export { TypedEventTarget, UserService };
export type { UserServiceEvents };
