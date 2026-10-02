# Logging

`print` is fine for a script's output. Diagnostics belong in `logging`: they get a
level, a timestamp and the module they came from. They can be switched on or off
per module without touching the code, and sent to a file, the journal or a log
collector instead of stdout.

Examples: [`examples/python/logs`](https://github.com/jgteske/best-practices-repo/tree/main/examples/python/logs).

## The model in one paragraph

Code calls a **logger** (`logging.getLogger("payments.charge")`). Loggers form a
tree by dotted name, and records **propagate** up to their parents and finally
to the root logger. **Handlers** attached along the way decide where records go,
and their **formatters** decide what records look like. A record passes if
it is at or above the logger's effective **level**. Libraries create loggers.
Applications attach handlers and set levels.

## In a library (or any module): log, don't configure

<<< ../../examples/python/logs/library_logger.py#library-side

- **`logging.getLogger(__name__)`** at the top of each module is the idiom. The
  logger names then mirror your package structure (`payments.charge`), so the
  app can tune `payments` as a whole or one module on its own.
- A library **never** calls `basicConfig()`, sets levels, or adds real handlers.
  Those decisions belong to the application. The `NullHandler` only stops Python
  from printing the "no handlers" fallback.

## In the application: configure once

The application chooses what is shown and where. Here the app attaches one
handler to the library's top-level logger:

<<< ../../examples/python/logs/library_logger.py#app-side

```
  INFO payments.charge: charged ada
  WARNING payments.charge: refusing non-positive charge for bob: -1
```

A real application usually configures everything in one place with
`dictConfig`, called **once at startup** in `main()`:

<<< ../../examples/python/logs/app_config.py#dict-config

```
09:39:25 DEBUG   myapp.jobs: shown: myapp.* is at DEBUG
09:39:25 INFO    myapp.jobs: job 42 started
```

- Attach handlers to the **root** logger and let records propagate. Per-logger
  `level`s then work as volume knobs, here up for your own code and down for a noisy dependency.
- `"disable_existing_loggers": False` matters: the default `True` silences every
  logger that was created at import time, *before* this config ran.
- `logging.basicConfig(level=logging.INFO)` is the one-liner equivalent for
  small scripts.

## Choosing a level

<<< ../../examples/python/logs/app_config.py#levels

## Log arguments, not f-strings

<<< ../../examples/python/logs/library_logger.py#lazy-formatting

Pass the values as arguments: `logger.debug("user %s", user_id)`. The message
is only formatted if a handler will actually emit it. An f-string does the work
up front, even when DEBUG is off. Log collectors can also group every
`"charged %s"` record by its template, which they can't do with pre-formatted strings.

## Logging exceptions

<<< ../../examples/python/logs/app_config.py#log-exception

Inside an `except` block, use **`logger.exception(...)`**. It logs at ERROR and
attaches the full traceback. `logger.error(str(error))` keeps only the message
and throws away the line numbers you will need. Log an exception **once**, where
it is handled, not at every level it passes through.

## Structured (JSON) logs

Log aggregators (Loki, Elasticsearch, CloudWatch, Datadog) query fields, not
free text. A small formatter turns each record into one JSON object per line:

<<< ../../examples/python/logs/structured.py#json-formatter

Values passed with `extra={...}` become attributes on the record, and the formatter
copies them into the JSON. For context that should appear on *every* record
during a request, such as a request id or user id, store it in a `ContextVar` and
add it with a filter:

<<< ../../examples/python/logs/structured.py#request-context

<<< ../../examples/python/logs/structured.py#usage

```
{"level": "INFO", "logger": "shop.orders", "message": "order placed", "order_id": 1001, "total": 59.9, "request_id": "req-7f3a"}
```

A `ContextVar` is per-task under asyncio and per-thread with threads, so
concurrent requests don't mix up each other's ids. If you'd rather not maintain
a formatter yourself, `python-json-logger` and `structlog` are the common libraries.

::: warning Don't log secrets
Passwords, tokens, full card numbers and session cookies end up in log files,
and log files get copied around much more freely than databases. Log an id
or a masked value (`****4242`) instead.
:::

## Summary

- `logger = logging.getLogger(__name__)` in every module. Libraries only add a `NullHandler`.
- The application configures logging **once**, at startup, with `dictConfig` or `basicConfig`.
- Use `%s` arguments instead of f-strings, and `logger.exception` inside `except`.
- In production, use JSON lines, with per-request context from a `ContextVar` filter.
