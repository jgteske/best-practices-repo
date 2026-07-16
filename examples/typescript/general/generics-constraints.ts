/**
 * Constraining generics instead of leaving them wide open, and preferring
 * a constrained generic over an overload set when the logic is identical
 * across types.
 */

// ANTI-PATTERN: an unconstrained generic gives no information to the
// compiler (or the reader) about what can actually be done with `T` inside
// the function, and callers get no feedback if they pass something that
// doesn't make sense for "the thing with the most votes."
function pickWinnerBad<T>(items: T[]): T {
  return items[0] as T; // has to fall back to a cast - nothing about T is known
}

// RECOMMENDED: constrain the generic to exactly what the function needs.
// `extends { votes: number }` documents the requirement in the signature
// itself, and callers passing something without a `votes` field get a
// compile error pointing at the actual mismatch.
function pickWinner<T extends { votes: number }>(items: readonly T[]): T {
  return items.reduce((best, item) => (item.votes > best.votes ? item : best));
}

interface Candidate {
  name: string;
  votes: number;
}

const winner = pickWinner<Candidate>([
  { name: "Ada", votes: 120 },
  { name: "Grace", votes: 340 },
]);
console.log(`${winner.name} won with ${winner.votes} votes`);

// `keyof` constraints keep a generic "key" parameter tied to the actual
// keys of the object it indexes, so typos are caught and the return type
// is precise instead of `unknown`.
function getProperty<TObject, TKey extends keyof TObject>(
  object: TObject,
  key: TKey,
): TObject[TKey] {
  return object[key];
}

const candidateVotes = getProperty(winner, "votes"); // inferred as number
console.log(`votes: ${candidateVotes}`);
// getProperty(winner, "rank"); // <- compile error: "rank" is not a key of Candidate

// Default type parameters reduce boilerplate at call sites that almost
// always use the same type argument, while still allowing an override.
class Cache<TValue = string> {
  #store = new Map<string, TValue>();

  set(key: string, value: TValue): void {
    this.#store.set(key, value);
  }

  get(key: string): TValue | undefined {
    return this.#store.get(key);
  }
}

const stringCache = new Cache(); // TValue defaults to string
stringCache.set("greeting", "hello");

const candidateCache = new Cache<Candidate>(); // explicit override
candidateCache.set(winner.name, winner);

export { pickWinnerBad, pickWinner, getProperty, Cache, stringCache, candidateCache };
export type { Candidate };
