"""if/elif, loops with else, match statements, and the walrus operator.

Run it: python3 control_flow.py
"""

from dataclasses import dataclass


# region if-and-loops
def classify(temperature: float) -> str:
    if temperature < 0:
        return "freezing"
    elif temperature < 20:
        return "mild"
    else:
        return "hot"


assert [classify(t) for t in (-5, 10, 30)] == ["freezing", "mild", "hot"]

# Conditional expression - for choosing a value, not for side effects.
label = "even" if 4 % 2 == 0 else "odd"
assert label == "even"

# Chained comparisons read like maths.
assert 0 < 5 <= 10


# A loop's `else` runs only when the loop was NOT left through `break`.
def first_negative(numbers: list[int]) -> str:
    for number in numbers:
        if number < 0:
            result = f"found {number}"
            break
    else:
        result = "no negatives"
    return result


assert first_negative([3, -1, -2]) == "found -1"
assert first_negative([3, 4]) == "no negatives"
# endregion if-and-loops


# region match
@dataclass
class Point:
    x: float
    y: float


def describe(value: object) -> str:
    match value:
        case None:
            return "nothing"
        case 0 | 0.0:
            return "zero"
        case int(n) if n < 0:  # class pattern + guard
            return f"negative int {n}"
        case str() as text:
            return f"text of length {len(text)}"
        case [x, y]:  # any 2-item sequence (not str)
            return f"pair {x}, {y}"
        case [first, *rest]:
            return f"sequence starting {first} (+{len(rest)})"
        case {"type": "user", "name": name}:  # mapping pattern, extra keys allowed
            return f"user {name}"
        case Point(x=0, y=0):
            return "origin"
        case Point(x=x, y=y):
            return f"point at {x}, {y}"
        case _:
            return "something else"


for sample in [
    None,
    0,
    -3,
    "hey",
    (1, 2),
    [1, 2, 3],
    {"type": "user", "name": "ada", "id": 1},
    Point(0, 0),
    Point(1, 2),
    4.5,
]:
    print(f"  {sample!r:45} -> {describe(sample)}")

assert describe((1, 2)) == "pair 1, 2"
assert describe({"type": "user", "name": "ada", "id": 1}) == "user ada"
# endregion match


# region match-capture-pitfall
# A bare name in a case is a CAPTURE, not a comparison. This matches anything
# and silently rebinds `expected`. Compare against constants with a dotted name
# (an Enum member, a module attribute) or a guard instead.
def is_expected(value: int, expected: int) -> bool:
    match value:
        case n if n == expected:
            return True
        case _:
            return False


assert is_expected(3, 3)
assert not is_expected(3, 4)
# endregion match-capture-pitfall

# region walrus
# `:=` assigns inside an expression. Best use: avoid computing a value twice.
lines = ["", "config=1", "", "debug=true"]
settings = [stripped for line in lines if (stripped := line.strip())]
assert settings == ["config=1", "debug=true"]
# endregion walrus

print("all control-flow assertions hold")
