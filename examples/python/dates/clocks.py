"""Which clock to read: wall time for "when", monotonic for "how long" - and a clock you can fake.

Run it: python3 clocks.py
"""

import time
from collections.abc import Callable
from dataclasses import dataclass, field
from datetime import UTC, datetime, timedelta

# region durations
# time.time() can jump (NTP corrections, someone changing the clock), so a duration
# measured with it can even come out negative. Measure elapsed time with a monotonic clock.
start = time.perf_counter()  # highest resolution; also monotonic
sum(range(100_000))
elapsed = time.perf_counter() - start
assert elapsed >= 0

deadline = time.monotonic() + 5.0  # timeouts and deadlines: monotonic()
assert time.monotonic() < deadline
# endregion durations


# region injectable-clock
Clock = Callable[[], datetime]


def utc_now() -> datetime:
    return datetime.now(UTC)


@dataclass
class Session:
    ttl: timedelta
    clock: Clock = utc_now  # the default reads the real clock...
    created: datetime = field(init=False)

    def __post_init__(self) -> None:
        self.created = self.clock()

    def expired(self) -> bool:
        return self.clock() - self.created >= self.ttl


# ...and a test passes a clock it controls, instead of sleeping or patching datetime.
class FakeClock:
    def __init__(self, start: datetime) -> None:
        self.now = start

    def __call__(self) -> datetime:
        return self.now

    def advance(self, **kwargs: float) -> None:
        self.now += timedelta(**kwargs)


clock = FakeClock(datetime(2026, 1, 1, tzinfo=UTC))
session = Session(ttl=timedelta(minutes=30), clock=clock)
clock.advance(minutes=29)
assert not session.expired()
clock.advance(minutes=1)
assert session.expired()
print("  session expired after exactly 30 fake minutes")
# endregion injectable-clock
