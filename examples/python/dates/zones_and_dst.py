"""Time zones and daylight saving time with zoneinfo.

Run it: python3 zones_and_dst.py
"""

import calendar
from datetime import UTC, datetime, timedelta
from zoneinfo import ZoneInfo

BERLIN = ZoneInfo("Europe/Berlin")

# region offsets-change
# A zone is a set of rules, not a fixed offset. Berlin is +01:00 in winter and +02:00 in summer.
winter = datetime(2026, 1, 15, 12, 0, tzinfo=BERLIN)
summer = datetime(2026, 7, 15, 12, 0, tzinfo=BERLIN)
assert winter.utcoffset() == timedelta(hours=1)
assert summer.utcoffset() == timedelta(hours=2)
assert (winter.tzname(), summer.tzname()) == ("CET", "CEST")
# endregion offsets-change


# region wall-clock-vs-elapsed
# 2026-03-29: clocks in Berlin jump from 02:00 straight to 03:00.
before = datetime(2026, 3, 28, 12, 0, tzinfo=BERLIN)

# Arithmetic on an aware datetime in the *same* zone is wall-clock arithmetic:
# "same time tomorrow", even though only 23 real hours pass.
next_day = before + timedelta(days=1)
assert next_day.hour == 12
assert next_day - before == timedelta(days=1)  # same-zone subtraction ignores the shift too

# To count real elapsed time, do the arithmetic in UTC.
elapsed = next_day.astimezone(UTC) - before.astimezone(UTC)
assert elapsed == timedelta(hours=23)

# And "24 real hours later" is computed in UTC and converted back.
plus_24h = (before.astimezone(UTC) + timedelta(hours=24)).astimezone(BERLIN)
assert plus_24h.hour == 13
print(f"  +1 day:  {next_day:%Y-%m-%d %H:%M %Z}  (23 h elapsed)")
print(f"  +24 h:   {plus_24h:%Y-%m-%d %H:%M %Z}")
# endregion wall-clock-vs-elapsed


# region gap-and-fold
# 02:30 on 2026-03-29 never happened in Berlin (the gap). zoneinfo does not raise;
# it applies the pre-transition offset, and a round trip through UTC moves it to 03:30.
gap = datetime(2026, 3, 29, 2, 30, tzinfo=BERLIN)
assert gap.astimezone(UTC).astimezone(BERLIN).hour == 3

# 02:30 on 2026-10-25 happened twice (the fold). `fold` picks which one.
first = datetime(2026, 10, 25, 2, 30, tzinfo=BERLIN)  # fold=0: the earlier, still CEST
second = first.replace(fold=1)  # fold=1: the later, already CET
assert (first.tzname(), second.tzname()) == ("CEST", "CET")
assert second.astimezone(UTC) - first.astimezone(UTC) == timedelta(hours=1)
# endregion gap-and-fold


# region no-months
# timedelta has days, seconds and microseconds - no months or years, because
# "one month" is not a fixed length. Decide what you mean, then write it out.
def add_months(moment: datetime, months: int) -> datetime:
    """Same day next month, clamped to the month's last day (Jan 31 + 1 -> Feb 28)."""
    month_index = moment.month - 1 + months
    year, month = moment.year + month_index // 12, month_index % 12 + 1
    last_day = calendar.monthrange(year, month)[1]
    return moment.replace(year=year, month=month, day=min(moment.day, last_day))


assert add_months(datetime(2026, 1, 31), 1) == datetime(2026, 2, 28)
assert add_months(datetime(2026, 11, 15), 3) == datetime(2027, 2, 15)
# endregion no-months
