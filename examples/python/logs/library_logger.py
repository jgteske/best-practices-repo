"""How a library should log: named loggers, no configuration, lazy formatting.

Run it: python3 library_logger.py
"""

import logging


# region capture
class ListHandler(logging.Handler):
    """Collects formatted records so the examples can assert on them."""

    def __init__(self) -> None:
        super().__init__()
        self.lines: list[str] = []

    def emit(self, record: logging.LogRecord) -> None:
        self.lines.append(self.format(record))


# endregion capture


# region library-side
# --- inside a library module, e.g. payments/charge.py ---
# One logger per module, named after the module: "payments.charge" in a real
# package. The dotted name puts it under the "payments" logger, so an app can
# configure the whole library at once.
logger = logging.getLogger("payments.charge")

# A library adds a NullHandler and nothing else. It never calls basicConfig(),
# never sets levels, and never adds real handlers: those decisions belong to the app.
logging.getLogger("payments").addHandler(logging.NullHandler())


def charge(customer: str, cents: int) -> bool:
    logger.debug("charging %s %d cents", customer, cents)
    if cents <= 0:
        logger.warning("refusing non-positive charge for %s: %d", customer, cents)
        return False
    logger.info("charged %s", customer)
    return True


# endregion library-side


# region app-side
# --- in the application that uses the library ---
handler = ListHandler()
handler.setFormatter(logging.Formatter("%(levelname)s %(name)s: %(message)s"))
payments_logger = logging.getLogger("payments")
payments_logger.addHandler(handler)
payments_logger.setLevel(logging.INFO)  # DEBUG records are dropped

charge("ada", 500)
charge("bob", -1)
for line in handler.lines:
    print(f"  {line}")
assert handler.lines == [
    "INFO payments.charge: charged ada",
    "WARNING payments.charge: refusing non-positive charge for bob: -1",
]
# endregion app-side


# region lazy-formatting
class Expensive:
    renders = 0

    def __str__(self) -> str:
        Expensive.renders += 1
        return "a big report"


# %-style arguments are only formatted if the record is actually emitted.
logger.debug("state: %s", Expensive())
assert Expensive.renders == 0

# An f-string is formatted *before* the call, even when DEBUG is disabled.
logger.debug(f"state: {Expensive()}")
assert Expensive.renders == 1

# For work that is expensive to even *compute*, check the level first.
if logger.isEnabledFor(logging.DEBUG):
    raise AssertionError("not reached: DEBUG is disabled for payments.*")
# endregion lazy-formatting
