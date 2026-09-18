"""Names, values, mutability and truthiness - the model everything else rests on.

Run it: python3 values_and_names.py
"""

import copy

# region names
# A variable is a name bound to an object. Assignment never copies - it binds
# a second name to the same object.
scores = [90, 72]
alias = scores
alias.append(100)
print("scores after alias.append:", scores)
assert scores is alias  # `is`: same object
assert scores == [90, 72, 100]  # `==`: equal value

# Rebinding a name does not touch the object it used to point at.
alias = [0]
assert scores == [90, 72, 100]
# endregion names

# region mutability
# Immutable: int, float, bool, str, bytes, tuple, frozenset, None.
# Mutable:   list, dict, set, bytearray, and (by default) your own classes.
word = "py"
same = word
word += "thon"  # builds a NEW str and rebinds `word`
assert same == "py"

items = [1, 2]
same_list = items
items += [3]  # mutates in place: list.__iadd__ extends the list
assert same_list == [1, 2, 3]

# A tuple is immutable, but the objects inside it can still be mutable.
pair = ([1], [2])
pair[0].append(99)
assert pair == ([1, 99], [2])
# endregion mutability

# region copying
nested = {"tags": ["a", "b"], "owners": ["jo"]}
shallow = dict(nested)  # same as nested.copy() or {**nested}
deep = copy.deepcopy(nested)

nested["tags"].append("c")
assert shallow["tags"] == ["a", "b", "c"]  # shares the inner list
assert deep["tags"] == ["a", "b"]  # fully independent
# endregion copying

# region truthiness
# Falsy: None, False, 0, 0.0, 0j, "", b"", and every empty container.
# Everything else is truthy - including "0", " ", [0] and [[]].
falsy: list[object] = [None, False, 0, 0.0, "", b"", [], (), {}, set(), range(0)]
truthy: list[object] = ["0", " ", [0], [[]], -1, 0.1]
assert not any(falsy)
assert all(truthy)

# `or` returns the first truthy operand - not a bool. Fine for "", wrong when
# 0 is a valid value:
retries = 0
assert (retries or 3) == 3  # 0 was replaced - probably a bug
assert (3 if retries is None else retries) == 0  # explicit None check
# endregion truthiness

# region equality
# `is` compares identity. Use it only for singletons: None, True, False,
# and sentinel objects. Everything else compares with ==.
value = None
assert value is None

# Floats are binary fractions, exactly as in every other language.
assert 0.1 + 0.2 != 0.3
assert abs((0.1 + 0.2) - 0.3) < 1e-9
# ints never overflow; / always returns float, // floors.
assert 2**100 == 1267650600228229401496703205376
assert 7 / 2 == 3.5
assert 7 // 2 == 3
assert -7 // 2 == -4  # floors toward negative infinity, not toward zero
assert -7 % 2 == 1
# endregion equality

print("all value/name assertions hold")
