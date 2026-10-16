"""Parsing and formatting dates: ISO 8601 for machines, strftime for people.

Run it: python3 parsing_and_formatting.py
"""

from datetime import UTC, date, datetime, timedelta, timezone

# region iso-8601
# fromisoformat() accepts (since 3.11) almost all of ISO 8601, including a trailing "Z".
moment = datetime.fromisoformat("2026-03-01T08:30:00Z")
assert moment == datetime(2026, 3, 1, 8, 30, tzinfo=UTC)
assert datetime.fromisoformat("2026-03-01T09:30:00+01:00") == moment  # same instant

# isoformat() is the round trip. An offset in the string means the value is aware.
assert moment.isoformat() == "2026-03-01T08:30:00+00:00"
assert date.fromisoformat("2026-03-01").isoformat() == "2026-03-01"

# A string without an offset parses to a *naive* datetime. Attach the zone you know it is in.
local = datetime.fromisoformat("2026-03-01T09:30").replace(tzinfo=timezone(timedelta(hours=1)))
assert local == moment
# endregion iso-8601


# region strptime
# For other formats, strptime() with an explicit pattern. %z parses "+0100" and "Z".
parsed = datetime.strptime("01/03/2026 09:30 +0100", "%d/%m/%Y %H:%M %z")
assert parsed == moment

# A format that does not match fails loudly - no guessing between day-first and month-first.
try:
    datetime.strptime("2026-03-01", "%d/%m/%Y")
except ValueError as error:
    print(f"  {error}")
# endregion strptime


# region strftime
# strftime() for display. %A/%B use the process locale; pin it or use a library for i18n.
print(f"  {moment:%Y-%m-%d %H:%M %Z}")
print(f"  {moment:%a %d %b %Y}")
assert f"{moment:%Y-%m-%dT%H:%M:%S%z}" == "2026-03-01T08:30:00+0000"
# endregion strftime


# region timestamps
# A Unix timestamp is seconds since 1970-01-01 UTC. Always pass tz= when converting back,
# or fromtimestamp() returns naive *local* time.
assert moment.timestamp() == 1772353800.0
assert datetime.fromtimestamp(1772353800, tz=UTC) == moment
# endregion timestamps
