# Dates, Times & Intl

A JavaScript `Date` is simpler than it looks, and that is the trap. Inside, it
is **one number**: milliseconds since 1970-01-01 UTC. It has no time zone of
its own. Every method that seems to have one (`getHours`, `setDate`,
`toString`, parsing a string without an offset) quietly uses the **host's**
local zone. Code that is correct on your laptop in Berlin can be off by hours
on a server set to UTC.

Examples: [`examples/javascript/datetime`](https://github.com/jgteske/best-practices-repo/tree/main/examples/javascript/datetime).
The Python version of this page is [Dates, Times & Time Zones](../python/dates-and-times).

::: info Deterministic output
`date-pitfalls.mjs` sets `process.env.TZ = "Europe/Berlin"` before it runs, so
its "local time" results are the same on every machine. Node re-reads `TZ` when
it changes. Real code should never depend on the host zone at all.
:::

## The pitfalls of `Date`

### 0-based months and silent rollover

<<< ../../examples/javascript/datetime/date-pitfalls.mjs#month-index{js}

`new Date(2026, 1, 30)` doesn't throw. It quietly becomes March 2nd. Validate
input before it reaches the constructor, for example with a
[schema](../typescript/schema-validation).

### Parsing: same-looking strings, different zones

<<< ../../examples/javascript/datetime/date-pitfalls.mjs#parsing{js}

| Input | Interpreted as |
| --- | --- |
| `"2026-01-01"` | UTC midnight (date-only ISO form) |
| `"2026-01-01T00:00"` | **local** midnight (date-time with no offset) |
| `"2026-01-01T00:00:00Z"` / `"...+01:00"` | exactly that instant |
| `"01/02/2026"`, `"Jan 2 2026"` | implementation-defined. Don't. |

This inconsistency comes from the spec, not a bug in one engine. A
`<input type="date">` value parsed with `new Date(value)` is UTC midnight, and
shows as the *previous day* for anyone west of Greenwich. Exchange **full ISO
8601 strings with `Z` or an offset**, and nothing else.

An unparseable string doesn't throw either. You get an `Invalid Date`, whose
`getTime()` is `NaN`. Check `Number.isNaN(date.getTime())` at the boundary.

### Dates are mutable

<<< ../../examples/javascript/datetime/date-pitfalls.mjs#mutation{js}

Every `set*` method changes the object in place, and assignment copies the
reference, not the value. A Date shared through props or a cache gets changed
for everyone who holds it. Treat Dates as values: build a new one rather than
calling setters on one that was passed in.

### Milliseconds vs calendar days across DST

<<< ../../examples/javascript/datetime/date-pitfalls.mjs#dst{js}

```
+24h:              Sun Mar 29 2026 13:00:00 GMT+0200 (Central European Summer Time)
same time tomorrow: Sun Mar 29 2026 12:00:00 GMT+0200 (Central European Summer Time)
```

Adding `24 * 60 * 60 * 1000` adds elapsed time. `setDate(getDate() + 1)` adds
a calendar day in the **host** zone. Neither one is wrong, but they answer
different questions. There is no built-in way to do calendar math in a zone
*other* than the host's. That is what Temporal adds (below).

## Formatting with `Intl`

<<< ../../examples/javascript/datetime/intl-formatting.mjs#date-time-format{js}

```
Mar 1, 2026, 3:30 AM
01.03.2026, 09:30
2026/03/01 17:30
```

`Intl.DateTimeFormat` uses the tz database built into the runtime, so it can
format any instant in **any** zone, not only the host's. Always pass
`timeZone` explicitly. Leaving it out means "the server's zone" in Node and
"wherever the user is" in a browser. Constructing a formatter is expensive, so
make one at module level (or `useMemo` it in React) and call `.format()` many
times. `toLocaleString(locale, options)` is the same engine without the cache.

### Use `formatToParts`, never parse `format()`

<<< ../../examples/javascript/datetime/intl-formatting.mjs#parts{js}

The output of `format()` is for people. Its spacing, punctuation and even the
Unicode space characters can change between runtime versions.

### Relative times

<<< ../../examples/javascript/datetime/intl-formatting.mjs#relative{js}

### ISO strings for machines, and JSON

<<< ../../examples/javascript/datetime/intl-formatting.mjs#iso-out{js}

`JSON.stringify` serialises a Date through `toJSON()`, which is
`toISOString()`. `JSON.parse` gives you back a **string**. Convert it, ideally
with the same validation schema that checks the rest of the payload.

## Durations and testable time

<<< ../../examples/javascript/datetime/durations.mjs#elapsed{js}

`Date.now()` answers "when". `performance.now()` answers "how long". It is
monotonic (it never jumps back) and sub-millisecond, but meaningful only as a
difference. [Timers, Rate Limits & Scheduling](./timers-and-scheduling) uses it
throughout for this reason.

<<< ../../examples/javascript/datetime/durations.mjs#injectable-clock{js}

```
session expired after exactly 30 fake minutes
```

Pass `now` in rather than calling `Date.now()` deep inside. Tests then step
time forward exactly, without sleeping. When you can't change the code,
`mock.timers.enable({ apis: ["Date"] })` in [node:test](./testing-with-node-test)
or `vi.useFakeTimers()` in Vitest replaces the global clock.

## Temporal

<<< ../../examples/javascript/datetime/durations.mjs#temporal{js}

```
Temporal: not available in this runtime
```

[Temporal](https://tc39.es/proposal-temporal/docs/) replaces `Date`. Its values
are immutable, and each concept has its own type:

| Type | Means |
| --- | --- |
| `Temporal.Instant` | an exact moment (what `Date` really is) |
| `Temporal.ZonedDateTime` | an instant **plus** a zone name, with DST-correct math in that zone |
| `Temporal.PlainDate` / `PlainTime` / `PlainDateTime` | wall-clock values with no zone ("my birthday", "09:00") |
| `Temporal.Duration` | months, days, hours... with calendar-aware arithmetic |

Browsers have started shipping it (Firefox first). In Node 24 it is still behind
`--harmony-temporal`. Running the example with that flag prints
`Temporal: 2026-02-28`: January 31st plus one month is clamped, and doesn't
roll over to March. Until all your runtimes have it, feature-detect it or use
the official `@js-temporal/polyfill`. Libraries like `date-fns` (plus
`date-fns-tz`) and Luxon cover the same ground today.

## Rules of thumb

- Send and store ISO 8601 with `Z` or an offset. Parse nothing else with `new Date()`.
- Never rely on the host zone. Pass `timeZone` to every `Intl.DateTimeFormat`.
- Treat `Date` as immutable: create new ones instead of calling setters on shared ones.
- Decide whether you mean elapsed milliseconds or calendar days. Across DST they differ.
- Use `performance.now()` for durations and an injected `now()` for testable code.
- Reach for Temporal (or its polyfill) when you need calendar math in a zone other than the host's.
