# Iterators & Generators

`for` loops, comprehensions, `sum()`, `list()`, unpacking and `in` all use one
protocol. Understanding it explains why some objects can be looped over twice
and others only once. It also lets you process a 10 GB file in constant memory.

Example: [`iterators_and_generators.py`](https://github.com/jgteske/best-practices-repo/tree/main/examples/python/iteration/iterators_and_generators.py).

## The protocol

<<< ../../examples/python/iteration/iterators_and_generators.py#protocol

| | Iterable | Iterator |
| --- | --- | --- |
| Has | `__iter__` returning an iterator | `__next__` (and `__iter__` returning itself) |
| Examples | `list`, `tuple`, `dict`, `set`, `str`, `range` | generators, `iter(list)`, file objects, `zip`, `map`, `enumerate` |
| Iterate twice? | yes, each `for` gets a fresh iterator | **no**, the second pass is empty |

::: warning Exhausted iterators fail silently
Passing a generator to two functions, or looping over a `map`/`zip`/file object
twice, gives an empty second pass with no error. If you need to iterate twice,
materialise it with `list(...)` or re-create it.
:::

## Generators

A function containing `yield` returns a generator. Its body runs only as values
are requested, and it pauses at each `yield`.

<<< ../../examples/python/iteration/iterators_and_generators.py#generators

```
  countdown(3) started
```

The message is printed at the first `next()`, not at `countdown(3)`. This
laziness lets you chain stages into a pipeline, where each stage pulls one item
at a time from the previous one, so memory stays flat whatever the input size.
Pass a file object instead of `raw` and `read_lines` streams a file of any size.

`yield from other` yields everything `other` produces. It is how recursive
generators such as `walk` stay short.

## `send()` and the full `Generator` type

<<< ../../examples/python/iteration/iterators_and_generators.py#generator-send

Most generators are annotated `Iterator[T]`. The full
`Generator[YieldType, SendType, ReturnType]` form is only needed for coroutine
style generators that receive values through `send()`. In 3.13, the last two
parameters default to `None`. In new code, `async` functions have mostly
replaced this pattern.

## Making your own class iterable

<<< ../../examples/python/iteration/iterators_and_generators.py#custom-iterable

Write `__iter__` as a generator. You never write `__next__` or raise
`StopIteration` yourself, and every `for` loop gets an independent iterator.

## `itertools`

<<< ../../examples/python/iteration/iterators_and_generators.py#itertools

| Need | Use |
| --- | --- |
| chunks of *n* | `batched(it, n)` (3.12+) |
| first *n* items of any iterator | `islice(it, n)` |
| sliding pairs `(a, b), (b, c)` | `pairwise(it)` |
| concatenate iterables | `chain(a, b)` / `chain.from_iterable(nested)` |
| running totals | `accumulate(it)` |
| every combination | `product`, `permutations`, `combinations` |
| group consecutive items | `groupby(sorted(it, key=k), key=k)` |
| infinite counters and cycles | `count()`, `cycle()`, `repeat()` |

`groupby` only groups *adjacent* equal keys, so sort by the same key first. To
group without sorting, use a `defaultdict(list)`, as in
[Python Basics](./basics#collections-the-batteries).

## Checklist

- Parameters that are only looped over are typed `Iterable[T]`, and
  generator functions return `Iterator[T]`.
- Use generator expressions, not list comprehensions, when feeding `sum`,
  `any`, `all`, `max`, `min` or `"".join`.
- Never iterate the same iterator twice by accident.
- Stream large inputs through generator pipelines instead of reading them into
  a list.
