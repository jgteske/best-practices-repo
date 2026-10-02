# Python Cheat Sheet

One-line reminders, grouped by the question you're trying to answer. Each
section links to the page with the full explanation.

## Names, values & truthiness: [details](./basics)

```python
a is b                        # same object: use only for None / True / False / sentinels
a == b                        # equal value
x is None                     # never x == None
value if value is not None else default   # when 0 / "" are valid values
value or default              # replaces EVERY falsy value (0, "", [], None)
copy.copy(x) ; copy.deepcopy(x) ; dict(d) ; list(xs) ; xs[:]
7 / 2 == 3.5 ; 7 // 2 == 3 ; -7 // 2 == -4 ; 2**100    # no overflow
"report.csv".removesuffix(".csv")   # not rstrip(".csv") - that strips characters
f"{x!r} {n:,.2f} {ratio:.1%} {name:>10} {value=}"
```

## Collections & iteration: [details](./basics#the-four-collections)

```python
for i, item in enumerate(items, start=1): ...
for a, b in zip(xs, ys, strict=True): ...
first, *rest = items ; a, b = b, a
d.get(key, default) ; d | other ; d.setdefault(k, []).append(v)
[x * 2 for x in xs if x] ; {k: v for k, v in pairs} ; {x for x in xs}
sum(x * x for x in xs)                     # generator: no list is built
Counter(words).most_common(3) ; defaultdict(list)
itertools.batched(xs, 3) ; itertools.pairwise(xs) ; itertools.islice(it, 10)
sorted(xs, key=len, reverse=True) ; max(d, key=d.__getitem__)
```

## Functions: [details](./basics#functions)

```python
def f(pos_only, /, normal, *, kw_only): ...
def f(*args: int, **kwargs: str): ...      # annotation = type of EACH item
def f(items: list[int] | None = None):     # never `= []`
    items = [] if items is None else items
nonlocal count                             # rebind an enclosing variable
@functools.wraps(func)                     # in every decorator
@functools.cache                           # memoise a pure function
```

## Typing: [details](./function-typing)

```python
def f(x: str | None) -> list[int]: ...    # Iterable/Sequence/Mapping in, concrete out
type UserId = int ; type Json = dict[str, Json] | list[Json] | str | int | None
def first[T](xs: Sequence[T]) -> T: ...   # generic function
def top[T: Base](xs: Sequence[T]) -> T:   # bound
class Box[T]: ...                         # generic class
Callable[[int, str], bool] ; Literal["a", "b"] ; Final ; NewType("OrderId", int)
class P(Protocol): def close(self) -> None: ...   # structural
class Opts(TypedDict, total=False): timeout: float
def deco[**P, R](fn: Callable[P, R]) -> Callable[P, R]: ...
-> Self ; -> TypeIs[str] ; -> Never ; assert_never(x) ; @overload ; @override
```

## Classes: [details](./classes)

```python
@dataclass(frozen=True, slots=True, kw_only=True)
class Point:
    x: float
    tags: list[str] = field(default_factory=list)
    def __post_init__(self) -> None: ...   # validate here
dataclasses.replace(p, x=1) ; dataclasses.asdict(p)
@property ; @x.setter ; @classmethod def from_csv(cls, ...) -> Self ; @staticmethod
class Status(StrEnum): DRAFT = auto()
super().__init__(...) ; Cls.__mro__ ; isinstance(obj, Cls)
return NotImplemented                      # from __eq__ / __add__ on unknown types
```

## Errors & `with`: [details](./errors-and-context-managers)

```python
class AppError(Exception): ...
raise ConfigError("port") from error       # keep the cause ; `from None` hides it
try: ... except (KeyError, ValueError) as e: ... else: ... finally: ...
error.add_note("while parsing row 17")
except* ValueError as group: ...           # ExceptionGroup handling
with path.open("w", encoding="utf-8") as f: ...
@contextlib.contextmanager                 # setup; try: yield; finally: cleanup
contextlib.suppress(FileNotFoundError) ; contextlib.ExitStack()
```

## asyncio: [details](./asyncio)

```python
asyncio.run(main())                        # once, at the entry point
task = asyncio.create_task(coro()) ; result = await task
async with asyncio.TaskGroup() as tg: t = tg.create_task(coro())   # cancels siblings on failure
except* ConnectionError as group: ...      # TaskGroup raises an ExceptionGroup
async with asyncio.timeout(5): ...         # raises TimeoutError
async with sem: ...                        # sem = asyncio.Semaphore(10): limit fan-out
await asyncio.to_thread(blocking_fn, arg)  # never block the loop
except asyncio.CancelledError: cleanup(); raise   # always re-raise
```

## Logging: [details](./logging)

```python
logger = logging.getLogger(__name__)       # every module
logging.getLogger("mylib").addHandler(logging.NullHandler())   # libraries: nothing else
logging.basicConfig(level=logging.INFO) ; logging.config.dictConfig(CONFIG)   # app, once
logger.info("user %s logged in", user_id)  # args, not f-strings
logger.exception("import failed")          # inside except: ERROR + traceback
logger.info("paid", extra={"order_id": 7}) # structured fields
```

## Files & paths: [details](./files-and-io)

```python
Path(__file__).resolve().parent / "data" / "x.csv"
p.name ; p.stem ; p.suffix ; p.parent ; p.with_suffix(".json")
p.mkdir(parents=True, exist_ok=True) ; p.rglob("*.py") ; p.unlink(missing_ok=True)
p.read_text(encoding="utf-8") ; p.write_text(s, encoding="utf-8") ; p.read_bytes()
with p.open(encoding="utf-8") as f: for line in f: ...   # stream big files
with p.open("w", encoding="utf-8", newline="") as f: csv.writer(f)
with tempfile.TemporaryDirectory() as tmp: ...
os.replace(tmp_path, path)                 # atomic swap, same filesystem
```

## Modules & imports: [details](./modules-and-imports)

```python
from pkg.models import Product             # absolute (preferred)
from .models import Product                # relative, inside a package only
__all__ = ["Product"]                      # the public API, in __init__.py
if __name__ == "__main__": sys.exit(main())
if TYPE_CHECKING: from pkg.orders import Order   # break an annotation-only import cycle
importlib.import_module("pkg.plugin") ; importlib.util.find_spec("pkg")
```

```bash
python -m pkg                  # run a package (its __main__.py), not python pkg/file.py
python -c "import sys; print(*sys.path, sep='\n')"   # where imports are searched
```

## Poetry & environments: [details](./poetry-and-virtualenvs)

```bash
pipx install poetry ; poetry config virtualenvs.in-project true
poetry new my-app ; poetry init           # new project ; existing folder
poetry install                            # venv + lock + deps + project (editable)
poetry env info ; poetry env use python3.13 ; poetry env remove --all
poetry run pytest ; eval $(poetry env activate) ; deactivate
python3 -m venv .venv && source .venv/bin/activate    # without Poetry
```

## Dependencies: [details](./dependencies)

```bash
poetry add httpx ; poetry add "rich@^13.0" ; poetry add "httpx[http2]"
poetry add --group dev pytest mypy ruff ; poetry remove rich
poetry add --editable ../lib ; poetry add git+https://github.com/org/repo.git#v1.2.0
poetry lock ; poetry check --lock ; poetry sync ; poetry sync --without dev
poetry show --tree ; poetry show --why --tree pkg ; poetry show --outdated --top-level
poetry update ; poetry add pkg@latest     # within ranges ; across a major version
```

## Build, publish & ship: [details](./building-packages)

```bash
poetry version minor ; poetry build ; python -m zipfile -l dist/*.whl
pip install dist/pkg-1.0.0-py3-none-any.whl         # test in a CLEAN venv first
poetry publish -r testpypi ; poetry publish
poetry run pyinstaller --onefile --name app packaging/app_cli.py    # standalone executable
```

```toml
[project.scripts]
app = "app.cli:main"                      # a console command on install
[project.gui-scripts]
app-gui = "app.gui:main"                  # no console window on Windows
```

## CLIs: [details](./cli-apps)

```python
parser.add_argument("files", nargs="*") ; ("-v", "--verbose", action="store_true")
parser.add_argument("-n", type=int, default=3, help="(default: %(default)s)")
sub = parser.add_subparsers(dest="command", required=True)
def main(argv: Sequence[str] | None = None) -> int: ...   # return 0 / 1; argparse exits 2
print("error: ...", file=sys.stderr)
```

## pytest: [details](./testing-with-pytest)

```bash
pytest -x ; pytest -k name ; pytest --lf ; pytest path::test_name ; pytest --cov=pkg
```

```python
with pytest.raises(ValueError, match="positive"): ...
@pytest.fixture                               # def thing() -> T: return ... / yield ...
@pytest.mark.parametrize(("a", "b"), [(1, 2), pytest.param(3, 4, id="big")])
tmp_path ; monkeypatch.setenv("X", "1") ; capsys.readouterr().out ; caplog
```

## Tooling: [details](./tooling)

```bash
ruff check --fix . ; ruff format . ; mypy src tests
pre-commit install ; pre-commit run --all-files
```

## Notebooks: [details](./jupyter-notebooks)

```bash
poetry add --group notebook jupyterlab ipykernel ; poetry run jupyter lab
poetry run python -m ipykernel install --user --name my-app
nbstripout --install ; jupytext --set-formats ipynb,py:percent nb.ipynb
jupyter nbconvert --to notebook --execute --stdout nb.ipynb > /dev/null
```

```python
%load_ext autoreload
%autoreload 2
import sys; sys.executable    # which venv is this kernel?
%pip install pkg              # into THIS kernel's environment
```
