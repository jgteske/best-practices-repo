"""Configuring logging once, in the application's entry point.

Run it: python3 app_config.py
"""

import io
import logging
import logging.config
from typing import Any

# region dict-config
LOGGING: dict[str, Any] = {
    "version": 1,
    # Keep loggers that modules created at import time, before this config ran.
    "disable_existing_loggers": False,
    "formatters": {
        "plain": {"format": "%(asctime)s %(levelname)-7s %(name)s: %(message)s", "datefmt": "%H:%M:%S"},
    },
    "handlers": {
        "console": {"class": "logging.StreamHandler", "formatter": "plain", "stream": "ext://sys.stdout"},
    },
    "loggers": {
        # Turn the volume up for your own code and down for a chatty dependency.
        "myapp": {"level": "DEBUG"},
        "urllib3": {"level": "WARNING"},
    },
    # Everything propagates up to the root logger, which owns the handler.
    "root": {"level": "INFO", "handlers": ["console"]},
}


def main() -> None:
    logging.config.dictConfig(LOGGING)  # once, at startup, before any work
    log = logging.getLogger("myapp.jobs")
    log.debug("shown: myapp.* is at DEBUG")
    logging.getLogger("urllib3.pool").info("hidden: urllib3.* is at WARNING")
    log.info("job %s started", 42)


if __name__ == "__main__":
    main()
# endregion dict-config


# region levels
# DEBUG    - detail for diagnosing a problem; off in production
# INFO     - normal milestones: started, finished, handled request
# WARNING  - something unexpected that the program recovered from
# ERROR    - an operation failed; the program carries on
# CRITICAL - the program itself cannot continue
assert logging.DEBUG < logging.INFO < logging.WARNING < logging.ERROR < logging.CRITICAL
# endregion levels


# region log-exception
buffer = io.StringIO()
stream_handler = logging.StreamHandler(buffer)
jobs = logging.getLogger("myapp.billing")
jobs.addHandler(stream_handler)
jobs.propagate = False  # keep this demo's output out of the console handler


def close_month(invoices: list[int]) -> float:
    return sum(invoices) / len(invoices)


try:
    close_month([])
except ZeroDivisionError:
    # logger.exception() logs at ERROR *and* appends the full traceback.
    # Use it inside `except`; logger.error(...) alone would lose the traceback.
    jobs.exception("closing the month failed for %d invoices", 0)

logged = buffer.getvalue()
assert logged.startswith("closing the month failed for 0 invoices\nTraceback")
assert logged.rstrip().endswith("ZeroDivisionError: division by zero")
# endregion log-exception
