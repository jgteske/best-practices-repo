/**
 * When you do throw: Error subclasses, `cause`, and AggregateError.
 *
 * Exceptions are still the right tool for failures the caller can't handle
 * locally (a broken invariant, an unreachable database). Make them easy to
 * identify, keep the original error as `cause`, and don't lose failures when
 * several happen at once.
 */

// A base class per app/library, so callers can catch "anything from us".
class AppError extends Error {
  // `override` is required by noImplicitOverride: Error already has `name`.
  override name = "AppError";
}

class NotFoundError extends AppError {
  override name = "NotFoundError";

  constructor(
    readonly resource: string,
    readonly id: string,
  ) {
    super(`${resource} ${id} not found`);
  }
}

class DatabaseError extends AppError {
  override name = "DatabaseError";
}

function queryUser(id: string): string {
  if (id === "missing") throw new NotFoundError("user", id);
  if (id === "boom") throw new TypeError("socket closed"); // a low-level failure
  return `user ${id}`;
}

function getUser(id: string): string {
  try {
    return queryUser(id);
  } catch (caught: unknown) {
    if (caught instanceof AppError) throw caught; // already meaningful
    // Wrap the low-level error, keep it as `cause`: logs show both stack traces.
    throw new DatabaseError(`loading user ${id} failed`, { cause: caught });
  }
}

for (const id of ["42", "missing", "boom"]) {
  try {
    console.log(getUser(id));
  } catch (caught: unknown) {
    // instanceof narrows `unknown` to the subclass, with its extra fields.
    if (caught instanceof NotFoundError) {
      console.log(`404: ${caught.resource} ${caught.id}`); // 404: user missing
    } else if (caught instanceof DatabaseError) {
      console.log(`${caught.message} (cause: ${String(caught.cause)})`);
      // loading user boom failed (cause: TypeError: socket closed)
    } else {
      throw caught; // never swallow what you don't recognise
    }
  }
}

// Several independent failures: keep all of them, not just the first.
async function notifyAll(channels: string[]): Promise<void> {
  const results = await Promise.allSettled(
    channels.map(async (channel) => {
      if (channel !== "email") throw new Error(`${channel} unavailable`);
    }),
  );
  const failures = results
    .filter((result): result is PromiseRejectedResult => result.status === "rejected")
    .map((result): unknown => result.reason);
  if (failures.length > 0) {
    throw new AggregateError(failures, `${failures.length} of ${channels.length} channels failed`);
  }
}

notifyAll(["email", "sms", "push"]).catch((caught: unknown) => {
  if (caught instanceof AggregateError) {
    console.log(caught.message, caught.errors.length); // 2 of 3 channels failed 2
  }
});

export { AppError, DatabaseError, NotFoundError, getUser, notifyAll };
