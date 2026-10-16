# Dates, Times & Time Zones

Most date bugs come from one confusion: a value that **looks** like a moment in
time but doesn't say which time zone it is in. Python makes the difference
explicit. A `datetime` is either **naive** (no zone, so "9:30 somewhere") or
**aware** (a zone or offset is attached, so one exact instant). Pick aware
values, store them in UTC, convert only when showing them to a person, and most
of the bugs go away.

Examples: [`examples/python/dates`](https://github.com/jgteske/best-practices-repo/tree/main/examples/python/dates).
The JavaScript version of this page is [Dates, Times & Intl](../javascript/dates-and-times).

## Naive vs aware

<<< ../../examples/python/dates/aware_vs_naive.py#naive-vs-aware

```
  can't subtract offset-naive and offset-aware datetimes
```

Python refuses to mix the two, and that helps you. The bug the `TypeError`
prevents is real: subtracting a naive "9:30" from an aware "9:30 UTC" can only
give a meaningful answer if Python guesses the zone, and it won't guess.

### Getting "now"

<<< ../../examples/python/dates/aware_vs_naive.py#now

| Call | Returns | Use it for |
| --- | --- | --- |
| `datetime.now(UTC)` | aware, UTC | timestamps you store, log or compare |
| `datetime.now(ZoneInfo("Europe/Berlin"))` | aware, that zone | "what time is it there" |
| `datetime.now()` | **naive**, host local time | quick local display only |
| `datetime.utcnow()` | **naive**, UTC wall time | nothing. It is deprecated since 3.12 |

`UTC` is `datetime.UTC` (3.11+), an alias of `timezone.utc`.

## Store UTC, convert at the edge

<<< ../../examples/python/dates/aware_vs_naive.py#store-utc

```
  stored:   2026-03-01T08:30:00+00:00
  Berlin:   2026-03-01 09:30 CET
  New York: 2026-03-01 03:30 EST
  Tokyo:    2026-03-01 17:30 JST
```

Normalise every incoming value to UTC as soon as it enters the program, and
reject naive values at that boundary instead of guessing. Keep it in UTC
through the database, queues and logs. Convert to a reader's zone only in the
last step, when you format it for display.

There is one exception. **Future events that people schedule on a local clock**,
like "every Monday at 09:00 in Berlin", should store the wall-clock time plus
the zone name, and not a precomputed UTC instant. If the government changes the
DST rules before the date arrives, the precomputed UTC instant is now an hour
off. The zone name gets the new rules from the tz database.

## Time zones and DST with `zoneinfo`

`zoneinfo.ZoneInfo` (3.9+) reads the IANA tz database, which is the same data
your OS and browser use. A zone is a **set of rules**, not a fixed offset:

<<< ../../examples/python/dates/zones_and_dst.py#offsets-change

So never store "+01:00" when you mean "Europe/Berlin". An offset fits one
instant. A zone name is the only thing that answers "what offset will it be in
July". Use `datetime.timezone(timedelta(hours=1))` only for values that really
carry a fixed offset, such as a parsed `+01:00` string.

::: tip Windows
Windows ships no tz database. Add the `tzdata` package as a dependency, and
`zoneinfo` will find it automatically.
:::

### Wall-clock arithmetic vs elapsed time

<<< ../../examples/python/dates/zones_and_dst.py#wall-clock-vs-elapsed

```
  +1 day:  2026-03-29 12:00 CEST  (23 h elapsed)
  +24 h:   2026-03-29 13:00 CEST
```

Arithmetic between datetimes in the **same** `ZoneInfo` is wall-clock
arithmetic. `+ timedelta(days=1)` means "same time tomorrow", and subtracting
two of them ignores the DST jump. That is usually what you want for calendars.
For real elapsed time (rate limits, billing, timeouts), convert to UTC first.

### The gap and the fold

<<< ../../examples/python/dates/zones_and_dst.py#gap-and-fold

When clocks spring forward, some local times never happen (the **gap**). When
they fall back, some happen twice (the **fold**). `zoneinfo` doesn't raise for
either one. For an ambiguous time, the `fold` attribute (PEP 495) chooses the
first (`0`) or second (`1`) occurrence. If user input can land in a gap, check
it with a UTC round trip and ask the user, or move it forward, deliberately.

### There is no `timedelta(months=1)`

<<< ../../examples/python/dates/zones_and_dst.py#no-months

A month has 28 to 31 days, so `timedelta` doesn't offer one. Write down which
rule you mean (clamp to the month end, roll over, or "last business day") as a
small named function. `dateutil.relativedelta` implements the clamping rule if
you already depend on `python-dateutil`.

## Parsing and formatting

### ISO 8601 for machines

<<< ../../examples/python/dates/parsing_and_formatting.py#iso-8601

Use ISO 8601 with an offset for every value that leaves the process: JSON,
databases, logs, URLs. Since 3.11 `fromisoformat()` parses nearly every form,
including `Z`. A string **without** an offset parses to a naive value, so
attach the zone you know it came from right away.

### `strptime` for everything else

<<< ../../examples/python/dates/parsing_and_formatting.py#strptime

```
  time data '2026-03-01' does not match format '%d/%m/%Y'
```

Use an explicit format string and never a "smart" parser for input whose
format you know. `01/03/2026` is March 1st in Berlin and January 3rd in New
York, and a parser that guesses will get one of them wrong without telling you.

### `strftime` for people

<<< ../../examples/python/dates/parsing_and_formatting.py#strftime

```
  2026-03-01 08:30 UTC
  Sun 01 Mar 2026
```

`%a`, `%b`, `%A` and `%B` follow the process locale. For real
internationalisation (month names, word order, 12/24 h), use
[Babel](https://babel.pocoo.org/) rather than `locale.setlocale`, which is
process-global and not thread-safe.

### Unix timestamps

<<< ../../examples/python/dates/parsing_and_formatting.py#timestamps

## Which clock to read

<<< ../../examples/python/dates/clocks.py#durations

| Question | Clock |
| --- | --- |
| *When* did this happen? | `datetime.now(UTC)` |
| *How long* did it take? | `time.perf_counter()` |
| Has the deadline passed? | `time.monotonic()` |

Wall-clock time can jump backwards. NTP corrects it, laptops wake from sleep,
and admins change it. A duration measured with `time.time()` can then come out
negative. Monotonic clocks only go forward, but their value has no meaning on
its own, only differences between two readings do. `asyncio` uses
`loop.time()`, which is monotonic, for the same reason.

## Make time injectable

<<< ../../examples/python/dates/clocks.py#injectable-clock

```
  session expired after exactly 30 fake minutes
```

Code that calls `datetime.now()` deep inside is hard to test: you end up
sleeping, or patching a C type. Pass the clock in as a parameter with the real
clock as the default. Tests then move time forward exactly and instantly. This
is the same dependency-injection idea as the [CLI pages](./cli-patterns) use
for I/O. If you can't change the code, the `time-machine` and `freezegun`
libraries patch the clock for you.

## Rules of thumb

- Make every `datetime` you store or compare **aware**. Reject naive values at the boundary.
- Use `datetime.now(UTC)`, never `utcnow()`.
- Store and transmit UTC as ISO 8601. Convert to a zone only for display.
- Store a zone **name** (`Europe/Berlin`), not an offset, when you need future local times.
- Do elapsed-time arithmetic in UTC, and calendar arithmetic in the local zone.
- Measure durations with `perf_counter()`/`monotonic()`, not `time.time()`.
- Inject the clock instead of patching it.
