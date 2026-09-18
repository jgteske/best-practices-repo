# Errors & Context Managers

Python uses exceptions for every failure, including ordinary ones like "key not
found" and "not a number". This page covers designing your own exceptions,
raising and catching them well, and the `with` statement, which guarantees
cleanup however a block exits.

Examples: [`examples/python/errors`](https://github.com/jgteske/best-practices-repo/tree/main/examples/python/errors).

## Design an exception hierarchy

<<< ../../examples/python/errors/exceptions.py#custom-errors

- **One base class per application or library** (`AppError`). Callers can
  catch everything *you* raise on purpose, without also catching the
  `TypeError`s and `KeyError`s that are really bugs.
- **Subclass the most meaningful built-in** when one fits. For example,
  `class SlugError(ValueError)` means "bad argument value" to anyone who already
  catches `ValueError`.
- **Carry data, not just a message.** `error.key` lets a handler react without
  parsing strings.
- Name them `...Error`, and don't define a new class for every failure. Add one
  when a caller would handle that failure differently.

## `try` / `except` / `else` / `finally`

<<< ../../examples/python/errors/exceptions.py#try-structure

```
  {                    -> config key 'port': config is not valid JSON  (cause: JSONDecodeError)
  {}                   -> config key 'port': missing  (cause: None)
  {"port": "http"}     -> config key 'port': not an integer (invalid literal for int() with base 10: 'http')  (cause: ValueError)
  {"port": 70000}      -> config key 'port': out of range: 70000  (cause: None)
```

| Block | Runs when |
| --- | --- |
| `try` | always, and it should hold only the lines that can raise what you catch |
| `except E` | an `E` (or subclass) was raised in `try` |
| `else` | `try` finished **without** raising |
| `finally` | always, after everything else, even after `return` or an uncaught exception |

**`raise New(...) from error`** chains the original as `__cause__`. The traceback
shows both, joined by *"The above exception was the direct cause of the
following exception"*. **`from None`** hides the original when it's just noise.
A `raise` inside `except` *without* `from` still keeps the original (as
`__context__`), but the traceback then says *"During handling of the above
exception, another exception occurred"*, which reads like a second bug.

## EAFP: ask forgiveness, not permission

<<< ../../examples/python/errors/exceptions.py#eafp

Python style prefers trying the operation and handling the failure (EAFP) over
checking first (LBYL, "look before you leap"). EAFP avoids a double lookup. For
files, sockets and anything shared, it is also the only race-free option: the
file you checked for can disappear before you open it. When the API has a
non-raising form (`dict.get`, `getattr(obj, name, default)`,
`next(it, default)`), use that instead.

## Catch narrowly

<<< ../../examples/python/errors/exceptions.py#catch-narrowly

::: danger Never `except:` or `except Exception: pass`
A bare `except:` also catches `KeyboardInterrupt` and `SystemExit`, so Ctrl-C
stops working. `except Exception:` with no logging turns every bug in the
`try` block into silent wrong behaviour. Catch the specific exceptions you
expect. At the top level of a program, where catching everything is legitimate,
**log the traceback** and exit non-zero.
:::

## Notes and exception groups (3.11+)

<<< ../../examples/python/errors/exceptions.py#notes-and-groups

```
  value errors: ['email is invalid']
  missing keys: ["'name'"]
```

`add_note` adds context ("while parsing row 17") to an exception without
wrapping it in a new type, and the note is printed under the traceback.
`ExceptionGroup` carries several unrelated failures at once. `asyncio.TaskGroup`
wraps the failures of its tasks in one, even when only one task fails. Every
`except*` clause runs for its matching part of the group.

## At the top of the program

<<< ../../examples/python/errors/exceptions.py#traceback

Let exceptions propagate up to one place, usually `main()`. That place turns
them into a log entry (use `logging.exception(...)`, which records the
traceback) and an exit code. [Command-Line Apps](./cli-apps) shows the pattern
end to end.

## Context managers

`with` runs setup code, runs the block, then runs cleanup, **even if the block
raises or returns**. Use it for anything you acquire and must release: files,
locks, connections, temporary directories, and changed global state.

<<< ../../examples/python/errors/context_managers.py#with-files

Always pass `encoding="utf-8"` when opening text files. The default depends on
the operating system, and on Windows it is often not UTF-8. `Path.read_text` /
`write_text` open and close the file for you when you only need the whole
contents.

### Writing one: the class form

<<< ../../examples/python/errors/context_managers.py#class-based

`__exit__` receives the exception, if there was one. Returning a truthy value
*suppresses* it. That is almost never what you want, so return `None`.

### Writing one: the generator form

<<< ../../examples/python/errors/context_managers.py#generator-based

`@contextmanager` is the shorter form for most cases. Everything before `yield`
is setup, everything after it is cleanup, and the `try`/`finally` makes the
cleanup unconditional. Without it, an exception in the `with` block would skip
the cleanup.

### The `contextlib` toolbox

<<< ../../examples/python/errors/context_managers.py#contextlib-helpers

```
  ExitStack closed 3 files
```

| Helper | Purpose |
| --- | --- |
| `suppress(E)` | ignore one expected exception, instead of `try: ... except E: pass` |
| `ExitStack` | enter a number of context managers only known at runtime, and clean all of them up |
| `closing(obj)` | call `obj.close()` on exit, for objects that aren't context managers |
| `chdir(path)` (3.11+) | change the working directory temporarily |
| `nullcontext()` | a do-nothing placeholder for "maybe a context manager" |
| `asynccontextmanager` | the `async with` version of `@contextmanager` |

## Checklist

- One `AppError` base class, and subclasses only where handling differs.
- `raise ... from error` when translating exceptions, `from None` to hide noise.
- Keep `try` blocks minimal, and put the follow-up code in `else`.
- Catch specific exceptions. Catch everything only at the top level, and log
  the traceback when you do.
- Anything that needs releasing is acquired in a `with`.
- `encoding="utf-8"` on every text-mode `open`.
