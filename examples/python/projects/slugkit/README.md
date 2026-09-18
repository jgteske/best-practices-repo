# slugkit

The example library for the Python guide's packaging pages: a `src/`-layout
Poetry project with a typed public API, a `py.typed` marker, a console script,
and a pytest suite.

```bash
poetry install          # creates .venv, installs slugkit (editable) + the dev group
poetry run slugkit slug "Hello, World!"
poetry run pytest
poetry build            # dist/slugkit-0.3.0-py3-none-any.whl and .tar.gz
```
