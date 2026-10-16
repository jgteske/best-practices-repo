/**
 * The JavaScript Date object: one UTC instant (milliseconds since 1970), plus
 * a pile of methods that silently read or write it in the *host's* local zone.
 *
 * Run: node examples/javascript/datetime/date-pitfalls.mjs
 */

import assert from "node:assert/strict";

// Pin the process zone so the "local time" results below are the same on every
// machine. Node re-reads TZ when it changes; in real code, never rely on the host zone.
process.env.TZ = "Europe/Berlin";

// #region month-index
// Months are 0-based, days are 1-based. This is March 1st, not January 3rd... and not February.
const march = new Date(2026, 2, 1);
assert.equal(march.getMonth(), 2);
assert.equal(march.getDate(), 1);

// Out-of-range parts roll over instead of failing: "February 30th" is March 2nd.
assert.equal(new Date(2026, 1, 30).toDateString(), "Mon Mar 02 2026");
// #endregion month-index

// #region parsing
// The same-looking strings parse in different zones:
const dateOnly = new Date("2026-01-01"); // date-only ISO form: UTC midnight
const dateTime = new Date("2026-01-01T00:00"); // date-time without offset: LOCAL midnight
assert.equal(dateOnly.toISOString(), "2026-01-01T00:00:00.000Z");
assert.equal(dateTime.toISOString(), "2025-12-31T23:00:00.000Z"); // Berlin is UTC+1 in winter

// Always send and store a full ISO 8601 string with an offset (or Z). Anything else
// ("01/02/2026", "Jan 2 2026") is implementation-defined.
const instant = new Date("2026-03-01T08:30:00Z");
assert.equal(instant.getTime(), 1772353800000); // milliseconds, not seconds

// An unparseable string does not throw: it gives an "Invalid Date" whose time is NaN.
const broken = new Date("next tuesday");
assert.ok(Number.isNaN(broken.getTime()));
assert.throws(() => broken.toISOString(), RangeError);
// #endregion parsing

// #region mutation
// Date is mutable, and the setters work in local time.
const start = new Date("2026-03-01T08:30:00Z");
const end = start; // not a copy!
end.setDate(end.getDate() + 7);
assert.equal(start.toISOString(), "2026-03-08T08:30:00.000Z"); // start moved too

// Copy before changing, or (better) treat Dates as values and build new ones.
const begin = new Date("2026-03-01T08:30:00Z");
const nextWeek = new Date(begin.getTime() + 7 * 24 * 60 * 60 * 1000);
assert.equal(begin.toISOString(), "2026-03-01T08:30:00.000Z");
assert.equal(nextWeek.toISOString(), "2026-03-08T08:30:00.000Z");
// #endregion mutation

// #region dst
// "Add a day" by milliseconds vs by calendar day differ across a DST change
// (Berlin skips 02:00-03:00 on 2026-03-29).
const saturdayNoon = new Date("2026-03-28T12:00:00+01:00");
const plus24h = new Date(saturdayNoon.getTime() + 24 * 60 * 60 * 1000);
const sameTimeTomorrow = new Date(saturdayNoon);
sameTimeTomorrow.setDate(sameTimeTomorrow.getDate() + 1); // local calendar arithmetic

assert.equal(plus24h.getHours(), 13);
assert.equal(sameTimeTomorrow.getHours(), 12);
console.log(`+24h:              ${plus24h.toString()}`);
console.log(`same time tomorrow: ${sameTimeTomorrow.toString()}`);
// #endregion dst
