/**
 * Strategy: a record of functions, not a hierarchy of classes.
 *
 * The classic form is an interface with one method and N classes implementing
 * it. In TypeScript the interface *is* a function type, the implementations are
 * functions, and the "context object that holds a strategy" is a lookup table.
 * The pattern survives; the ceremony does not.
 */

type Tier = "standard" | "member" | "staff";

// The strategy interface, in full.
type Pricing = (cents: number) => number;

// Keying by a union rather than `string` buys two things: a missing tier is a
// compile error, and the lookup below needs no `undefined` check even under
// `noUncheckedIndexedAccess`, because these are known properties rather than an
// index signature.
const pricing: Record<Tier, Pricing> = {
  standard: (cents) => cents,
  member: (cents) => Math.round(cents * 0.9),
  staff: (cents) => Math.round(cents * 0.6),
};

function priceFor(tier: Tier, cents: number): number {
  return pricing[tier](cents);
}

console.log(priceFor("standard", 2000)); // 2000
console.log(priceFor("member", 2000)); // 1800
console.log(priceFor("staff", 2000)); // 1200

/**
 * A strategy that needs configuration is a factory returning a strategy - the
 * equivalent of a constructor argument, without the constructor.
 */
const percentOff =
  (percent: number): Pricing =>
  (cents) =>
    Math.round(cents * (1 - percent / 100));

const clampTo = (maxCents: number): Pricing => (cents) => Math.min(cents, maxCents);

// Because strategies are values, they compose. `reduce` over an array of them
// is the whole "chain of responsibility" pattern.
const combine =
  (...strategies: readonly Pricing[]): Pricing =>
  (cents) =>
    strategies.reduce((current, strategy) => strategy(current), cents);

const blackFriday = combine(percentOff(30), clampTo(5000));
console.log(blackFriday(10000)); // 5000
console.log(blackFriday(2000)); // 1400

/**
 * When the strategy needs state as well as behaviour, return an object - which
 * is the same factory pattern one level up, and still no class.
 */
type Sampler = {
  shouldSample: () => boolean;
  readonly seen: number;
};

const everyNth = (n: number): Sampler => {
  let seen = 0;
  return {
    shouldSample: () => {
      seen += 1;
      return seen % n === 0;
    },
    get seen() {
      return seen;
    },
  };
};

const sampler = everyNth(3);
console.log([1, 2, 3, 4, 5, 6].map(() => sampler.shouldSample()));
// [ false, false, true, false, false, true ]

export { pricing, priceFor, percentOff, clampTo, combine, everyNth };
export type { Tier, Pricing, Sampler };
