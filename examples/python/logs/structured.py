"""Structured (JSON) logs with per-record and per-request context.

Run it: python3 structured.py
"""

import contextvars
import json
import logging
import sys
from typing import Any


# region json-formatter
class JsonFormatter(logging.Formatter):
    """One JSON object per line: easy for log collectors to parse and query."""

    # Attributes every LogRecord has; anything else came from `extra=`.
    STANDARD = frozenset(vars(logging.makeLogRecord({})))

    def format(self, record: logging.LogRecord) -> str:
        entry: dict[str, Any] = {
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }
        entry.update({key: value for key, value in vars(record).items() if key not in self.STANDARD})
        if record.exc_info:
            entry["exception"] = self.formatException(record.exc_info)
        return json.dumps(entry, default=str)


# endregion json-formatter


# region request-context
request_id: contextvars.ContextVar[str] = contextvars.ContextVar("request_id", default="-")


class RequestIdFilter(logging.Filter):
    """Stamps every record with the id of the request being handled."""

    def filter(self, record: logging.LogRecord) -> bool:
        record.request_id = request_id.get()
        return True  # a filter may also drop records by returning False


# endregion request-context


# region usage
handler = logging.StreamHandler(sys.stdout)
handler.setFormatter(JsonFormatter())
handler.addFilter(RequestIdFilter())
log = logging.getLogger("shop.orders")
log.addHandler(handler)
log.setLevel(logging.INFO)
log.propagate = False


def handle_order(req: str, order_id: int, total: float) -> None:
    request_id.set(req)  # set once per request; every log call below picks it up
    log.info("order placed", extra={"order_id": order_id, "total": total})


handle_order("req-7f3a", 1001, 59.9)
# endregion usage


# region check
class Capture(logging.Handler):
    def __init__(self) -> None:
        super().__init__()
        self.records: list[dict[str, Any]] = []

    def emit(self, record: logging.LogRecord) -> None:
        self.records.append(json.loads(self.format(record)))


capture = Capture()
capture.setFormatter(JsonFormatter())
capture.addFilter(RequestIdFilter())
log.addHandler(capture)
handle_order("req-91bc", 1002, 12.5)
assert capture.records == [
    {
        "level": "INFO",
        "logger": "shop.orders",
        "message": "order placed",
        "order_id": 1002,
        "total": 12.5,
        "request_id": "req-91bc",
    }
]
# endregion check
