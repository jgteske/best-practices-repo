"""Private helper module - the leading underscore says "not part of the API"."""

import math


def round_half_up(value: float) -> int:
    # round() uses banker's rounding (round(2.5) == 2); money usually wants half-up.
    return math.floor(value + 0.5)
