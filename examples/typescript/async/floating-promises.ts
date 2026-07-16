/**
 * Don't let promises float.
 *
 * A "floating" promise is one that's never awaited and whose rejection is
 * never handled. Errors vanish, ordering guarantees disappear, and tests
 * pass while production silently drops work. TypeScript + the
 * `@typescript-eslint/no-floating-promises` rule can flag these; this file
 * shows the intent-revealing fixes.
 */

async function saveAnalytics(_event: string): Promise<void> {
  // ...network call...
}

async function handleClickBad(): Promise<void> {
  // BAD: the returned promise is dropped. If saveAnalytics rejects, you get
  // an unhandled rejection and the caller has no idea anything failed.
  saveAnalytics("click"); // floating
}

async function handleClickAwait(): Promise<void> {
  // GOOD (when you need it to finish first): await it.
  await saveAnalytics("click");
}

function handleClickFireAndForget(): void {
  // GOOD (when you truly want fire-and-forget): say so explicitly with
  // `void` AND attach a catch, so a rejection can't become an unhandled one.
  void saveAnalytics("click").catch((error: unknown) => {
    console.error("analytics failed", error);
  });
}

// Sequential vs parallel: awaiting in a loop serializes independent work.
async function loadUsersSequential(ids: readonly string[]): Promise<string[]> {
  const results: string[] = [];
  for (const id of ids) {
    results.push(await fetchName(id)); // each waits for the previous - slow
  }
  return results;
}

async function loadUsersParallel(ids: readonly string[]): Promise<string[]> {
  // Start them all, then await together. `Promise.all` preserves order and
  // its result type is inferred as string[] from fetchName's return type.
  return Promise.all(ids.map((id) => fetchName(id)));
}

async function fetchName(id: string): Promise<string> {
  return `user-${id}`;
}

export {
  handleClickBad,
  handleClickAwait,
  handleClickFireAndForget,
  loadUsersSequential,
  loadUsersParallel,
};
