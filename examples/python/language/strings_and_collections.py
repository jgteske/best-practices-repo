"""Strings, the four built-in collections, unpacking and comprehensions.

Run it: python3 strings_and_collections.py
"""

from collections import Counter, defaultdict

# region strings
name, price, ratio = "Widget", 1234.5, 0.4567

# f-strings: expressions in braces, a format spec after the colon.
assert f"{name!r}" == "'Widget'"  # !r uses repr()
assert f"{price:,.2f}" == "1,234.50"  # thousands separator, 2 decimals
assert f"{ratio:.1%}" == "45.7%"
assert f"{name:>10}|" == "    Widget|"  # right-align in 10 columns
assert f"{price=}" == "price=1234.5"  # self-documenting, handy for debugging

# Strings are immutable sequences of code points.
assert "python"[0] == "p"
assert "python"[-1] == "n"
assert "python"[1:4] == "yth"  # start inclusive, stop exclusive
assert "python"[::-1] == "nohtyp"

# Build with join, not with += in a loop.
assert ", ".join(["a", "b", "c"]) == "a, b, c"
assert "  padded  ".strip() == "padded"
assert "a,b,,c".split(",") == ["a", "b", "", "c"]
assert "report.csv".removesuffix(".csv") == "report"  # not rstrip(".csv")!
# endregion strings

# region collections
# list: ordered, mutable, duplicates allowed.
langs = ["python", "rust"]
langs.append("go")
langs.insert(0, "c")
assert langs == ["c", "python", "rust", "go"]
assert sorted(langs, key=len) == ["c", "go", "rust", "python"]

# tuple: ordered, immutable. Use for fixed-shape records and as dict keys.
point = (3, 4)
distances = {point: 5.0}
assert distances[(3, 4)] == 5.0

# dict: key -> value, insertion ordered since 3.7.
stock = {"apples": 3, "pears": 0}
stock["plums"] = 7
assert stock.get("kiwis", 0) == 0  # .get() never raises KeyError
assert list(stock) == ["apples", "pears", "plums"]
merged = stock | {"pears": 5}  # 3.9+: merge, right side wins
assert merged["pears"] == 5

# set: unordered, unique, O(1) membership.
seen = {"a", "b"}
assert "a" in seen
assert {"a", "b"} & {"b", "c"} == {"b"}  # intersection
assert {"a", "b"} | {"b", "c"} == {"a", "b", "c"}  # union
assert {"a", "b"} - {"b"} == {"a"}  # difference
# endregion collections

# region unpacking
first, *middle, last = [1, 2, 3, 4, 5]
assert (first, middle, last) == (1, [2, 3, 4], 5)

a, b = 1, 2
a, b = b, a  # swap without a temp variable
assert (a, b) == (2, 1)

for index, lang in enumerate(["py", "rs"], start=1):
    print(f"{index}. {lang}")

for key, count in {"x": 1, "y": 2}.items():
    assert isinstance(key, str) and isinstance(count, int)

# zip stops at the shortest input; strict=True turns a length mismatch into an error.
assert list(zip("ab", [1, 2], strict=True)) == [("a", 1), ("b", 2)]
# endregion unpacking

# region comprehensions
numbers = range(10)
squares = [n * n for n in numbers]
evens = [n for n in numbers if n % 2 == 0]
lengths = {word: len(word) for word in ["hi", "hello"]}
initials = {word[0] for word in ["apple", "avocado", "banana"]}
total = sum(n * n for n in numbers)  # generator expression - no list is built

assert squares[:4] == [0, 1, 4, 9]
assert evens == [0, 2, 4, 6, 8]
assert lengths == {"hi": 2, "hello": 5}
assert initials == {"a", "b"}
assert total == 285

# Flattening reads left to right, like the nested for-loops it replaces.
grid = [[1, 2], [3, 4]]
assert [cell for row in grid for cell in row] == [1, 2, 3, 4]
# endregion comprehensions

# region stdlib-collections
words = "the cat and the hat and the bat".split()
assert Counter(words).most_common(1) == [("the", 3)]

by_letter: defaultdict[str, list[str]] = defaultdict(list)
for word in words:
    by_letter[word[0]].append(word)  # no "if key not in dict" dance
assert by_letter["h"] == ["hat"]
# endregion stdlib-collections

print("all string/collection assertions hold")
