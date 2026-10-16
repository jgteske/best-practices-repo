/**
 * Formatting dates for people with Intl: always name the locale and the zone.
 *
 * Run: node examples/javascript/datetime/intl-formatting.mjs
 */

import assert from "node:assert/strict";

const instant = new Date("2026-03-01T08:30:00Z");

// #region date-time-format
// Pass an explicit timeZone: the default is the host's zone, which on a server is
// usually UTC and in a browser is wherever the user is.
const fmt = (locale, timeZone) =>
  new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short", timeZone }).format(instant);

console.log(fmt("en-US", "America/New_York"));
console.log(fmt("de-DE", "Europe/Berlin"));
console.log(fmt("ja-JP", "Asia/Tokyo"));

// Create a formatter once and reuse it; constructing one is far slower than calling format().
const berlinTime = new Intl.DateTimeFormat("en-GB", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Berlin",
  timeZoneName: "short",
});
assert.equal(berlinTime.format(instant), "09:30 CET");
// #endregion date-time-format

// #region parts
// formatToParts() when you need the pieces - never parse the output of format().
const parts = Object.fromEntries(
  new Intl.DateTimeFormat("en-US", { year: "numeric", month: "2-digit", day: "2-digit", timeZone: "Asia/Tokyo" })
    .formatToParts(instant)
    .map(({ type, value }) => [type, value]),
);
assert.deepEqual([parts.year, parts.month, parts.day], ["2026", "03", "01"]);
// #endregion parts

// #region relative
// "3 days ago" / "in 2 hours", correctly pluralised and translated.
const relative = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
assert.equal(relative.format(-1, "day"), "yesterday");
assert.equal(relative.format(-3, "day"), "3 days ago");
assert.equal(relative.format(2, "hour"), "in 2 hours");
// #endregion relative

// #region iso-out
// For machines, toISOString(): always UTC, always the same shape.
assert.equal(instant.toISOString(), "2026-03-01T08:30:00.000Z");
// JSON.stringify calls it for you; JSON.parse does NOT turn it back into a Date.
const roundTrip = JSON.parse(JSON.stringify({ at: instant }));
assert.equal(typeof roundTrip.at, "string");
assert.equal(new Date(roundTrip.at).getTime(), instant.getTime());
// #endregion iso-out
