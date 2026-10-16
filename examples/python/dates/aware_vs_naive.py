"""Naive vs aware datetimes, and why "store UTC, convert at the edge" works.

Run it: python3 aware_vs_naive.py
"""

from datetime import UTC, datetime, timedelta
from zoneinfo import ZoneInfo

# region naive-vs-aware
naive = datetime(2026, 3, 1, 9, 30)  # no tzinfo: "9:30 somewhere"
aware = datetime(2026, 3, 1, 9, 30, tzinfo=UTC)  # 9:30 UTC - one exact instant
assert naive.tzinfo is None
assert aware.utcoffset() == timedelta(0)

# Python refuses to compare or subtract the two: it cannot know what `naive` means.
try:
    _ = aware - naive
except TypeError as error:
    print(f"  {error}")
# endregion naive-vs-aware


# region now
# The current instant, aware and in UTC. This is the one to use.
now = datetime.now(UTC)
assert now.tzinfo is UTC

# datetime.utcnow() is deprecated since 3.12: it returns a *naive* value holding
# UTC wall-clock time, which .timestamp() then misreads as local time.
# datetime.now() with no argument is naive local time - fine for display, wrong for storage.
# endregion now


# region store-utc
def to_storage(moment: datetime) -> str:
    """Normalise any aware datetime to a UTC ISO 8601 string."""
    if moment.tzinfo is None:
        raise ValueError("refusing to store a naive datetime")
    return moment.astimezone(UTC).isoformat()


def for_display(stored: str, zone: str) -> str:
    """Convert back to the reader's zone only when showing it."""
    return datetime.fromisoformat(stored).astimezone(ZoneInfo(zone)).strftime("%Y-%m-%d %H:%M %Z")


meeting = datetime(2026, 3, 1, 9, 30, tzinfo=ZoneInfo("Europe/Berlin"))
stored = to_storage(meeting)
assert stored == "2026-03-01T08:30:00+00:00"
print(f"  stored:   {stored}")
print(f"  Berlin:   {for_display(stored, 'Europe/Berlin')}")
print(f"  New York: {for_display(stored, 'America/New_York')}")
print(f"  Tokyo:    {for_display(stored, 'Asia/Tokyo')}")
# endregion store-utc
