/**
 * Mapped types: build your own utility types.
 *
 * A mapped type iterates the keys of one type to produce another. Combined
 * with modifiers (`readonly`, `?`, and their `-` removers) and key remapping
 * via `as`, you can express transformations the built-in utilities don't
 * cover - and understand how `Partial`, `Required`, and `Readonly` work.
 */

interface Account {
  id: string;
  balance: number;
  owner: string;
}

// Reimplementing the built-ins, to see the machinery:
type MyPartial<T> = { [K in keyof T]?: T[K] }; // add `?`
type MyRequired<T> = { [K in keyof T]-?: T[K] }; // remove `?`
type MyReadonly<T> = { readonly [K in keyof T]: T[K] }; // add readonly
type MyMutable<T> = { -readonly [K in keyof T]: T[K] }; // remove readonly

const draft: MyPartial<Account> = { balance: 100 }; // all keys optional
console.log(draft);

// Key remapping with `as`: transform the KEYS, not just the values.
// Generate getter method names from properties: id -> getId, etc.
type Getters<T> = {
  [K in keyof T as `get${Capitalize<string & K>}`]: () => T[K];
};

// Getters<Account> = { getId: () => string; getBalance: () => number; getOwner: () => string }
const accountGetters: Getters<Account> = {
  getId: () => "acc_1",
  getBalance: () => 100,
  getOwner: () => "Ada",
};
console.log(accountGetters.getBalance());

// Filter keys by value type: keep only the keys whose value is a `number`.
// Remapping a key to `never` removes it from the result.
type KeysOfType<T, V> = {
  [K in keyof T as T[K] extends V ? K : never]: T[K];
};

type NumericFields = KeysOfType<Account, number>; // { balance: number }
const numeric: NumericFields = { balance: 0 };
console.log(numeric);

export type { MyPartial, MyRequired, MyReadonly, MyMutable, Getters, KeysOfType };
