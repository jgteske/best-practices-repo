# Validation with pydantic

Type hints are not checked at runtime. A function annotated to take a `User`
accepts any dict that `json.loads` produced, and the bug shows up three calls
later as a `KeyError`. [pydantic](https://docs.pydantic.dev/) closes that gap.
You declare the shape once as a class with type hints. pydantic **validates
and converts** untrusted input against it, and mypy treats it as a normal
class. It does the same job as [zod](../typescript/schema-validation) in
TypeScript.

Examples: [`examples/python/validation`](https://github.com/jgteske/best-practices-repo/tree/main/examples/python/validation).
These are the only standalone examples with a third-party dependency
(`pip install pydantic`). `check:python` skips them, with a message, when
pydantic isn't installed.

## A model is the check and the type

<<< ../../examples/python/validation/models.py#model

- Each annotation is a rule. `Annotated[str, Field(...)]` adds constraints
  (lengths, patterns, ranges) without changing the static type.
- `@field_validator` runs your own checks and normalisation after the type
  check. Raise `ValueError` to reject a value.
- `extra="forbid"` turns unknown keys into errors instead of dropping them
  silently. That catches typos like `"emial"` and clients sending fields you
  don't support. `frozen=True` makes instances immutable and hashable.
- Unlike a plain class or a dataclass, a mutable default like `tags: list[str] = []`
  is safe: pydantic copies it for each instance.

## Validate at the boundary

<<< ../../examples/python/validation/models.py#validate

`model_validate_json` parses and validates in one pass, in Rust, and is faster
than `json.loads` followed by `model_validate`. By default pydantic runs in
**lax** mode and converts obvious encodings. The string `"42"` becomes
`42`, and an ISO string becomes an aware `datetime`. That suits JSON and form
data, where everything arrives as strings.

## Errors: all of them, with paths

<<< ../../examples/python/validation/models.py#errors

```
  id: Input should be a valid integer, unable to parse string as an integer
  email: Value error, must contain @
  address.postcode: String should match pattern '^\d{5}$'
  created_at: Value error, must include a time zone
  is_admin: Extra inputs are not permitted
```

You get one `ValidationError` holding **every** problem, each with a `loc`
path into nested data. `error.errors()` is a list of dicts you can return as a
400 response body. Pass `include_url=False` to drop the documentation links.

## Strict mode and cross-field rules

<<< ../../examples/python/validation/models.py#strict-and-cross-field

`strict=True` turns off conversion. Use it for internal data that should
already have the right types, where `"1"` instead of `1` means a bug upstream.
You can also set strict mode on a single field with `Field(strict=True)`.
`@model_validator(mode="after")` sees the fully validated model, so it is the
place for rules that involve several fields. It runs only once every field is
valid.

## Beyond `BaseModel`: `TypeAdapter`

<<< ../../examples/python/validation/boundaries.py#type-adapter

```
  2 errors, e.g. Input should be 'click' or 'view'
```

`TypeAdapter` validates any type: `TypedDict`s, dataclasses, `list[...]`,
unions. Your domain code can keep using standard-library types while the
boundary still gets full validation. Building an adapter compiles a validator,
so build each one once, at module level.

### Discriminated unions

<<< ../../examples/python/validation/boundaries.py#discriminated-union

With a `discriminator`, pydantic reads the tag field first and validates only
the matching branch. Errors then say `card.last4`, instead of listing failures
for every branch the input never meant. This is the runtime side of
[making illegal states unrepresentable](../typescript/modeling-with-unions).

## Parse at the boundary, trust inside

<<< ../../examples/python/validation/boundaries.py#boundary

Validate **once**, where data enters: HTTP handlers, queue consumers, config
loading, file imports. From then on the code works with values whose type is
guaranteed, with no `isinstance` checks or defensive `.get()` calls. FastAPI
does exactly this from your function signatures. `pydantic-settings` does the
same for environment variables and `.env` files.

## dataclass, TypedDict or pydantic?

| | `@dataclass` | `TypedDict` | `pydantic.BaseModel` |
| --- | --- | --- | --- |
| Runtime validation | no | no | **yes** |
| Converts `"42"` → `42` | no | no | yes (lax mode) |
| Is a real class with methods | yes | no (a dict) | yes |
| Dependency | stdlib | stdlib | third-party (Rust core) |
| Best for | internal domain objects | typing existing dicts (JSON, kwargs) | **untrusted input** and serialisation |

Use pydantic at the edges and plain dataclasses inside. `TypeAdapter` lets the
two meet without converting your whole domain to `BaseModel`.

## Rules of thumb

- Validate untrusted data exactly once, at the boundary, and pass typed objects inward.
- Use `extra="forbid"` on input models, so typos and unexpected fields fail loudly.
- Use lax mode for JSON and forms, and strict mode for data that should already be typed.
- Put cross-field rules in `@model_validator(mode="after")`.
- Use discriminated unions for "one of these shapes" payloads.
- Build `TypeAdapter`s once, at module level.
