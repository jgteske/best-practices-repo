"""A class from the ground up: attributes, properties, class/static methods, dunders.

Run it: python3 class_anatomy.py
"""

from __future__ import annotations

from functools import total_ordering
from typing import ClassVar


# region anatomy
class BankAccount:
    """A deliberately small class that shows every kind of member."""

    interest_rate: ClassVar[float] = 0.02  # class attribute: shared by every instance
    _next_id: ClassVar[int] = 1

    def __init__(self, owner: str, balance: float = 0.0) -> None:
        # __init__ initialises an already-created instance; it returns None.
        self.owner = owner  # instance attributes live in self.__dict__
        self._balance = balance  # leading underscore: internal by convention
        self.id = BankAccount._next_id
        BankAccount._next_id += 1

    # A property is a computed attribute: read like a field, runs like a method.
    @property
    def balance(self) -> float:
        return self._balance

    def deposit(self, amount: float) -> None:
        if amount <= 0:
            raise ValueError("deposit must be positive")
        self._balance += amount

    # classmethod: receives the class. The idiomatic "alternative constructor".
    @classmethod
    def from_csv(cls, line: str) -> BankAccount:
        owner, balance = line.split(",")
        return cls(owner.strip(), float(balance))

    # staticmethod: receives nothing implicit. A plain function namespaced here.
    @staticmethod
    def is_valid_iban(iban: str) -> bool:
        return len(iban.replace(" ", "")) in range(15, 35)

    def __repr__(self) -> str:  # for developers: unambiguous, ideally eval()-able
        return f"BankAccount(owner={self.owner!r}, balance={self._balance!r})"

    def __str__(self) -> str:  # for users: str(), print(), f"{...}"
        return f"{self.owner}: {self._balance:.2f} EUR"


account = BankAccount.from_csv("Ada, 100")
account.deposit(50)
assert account.balance == 150
assert repr(account) == "BankAccount(owner='Ada', balance=150.0)"
assert str(account) == "Ada: 150.00 EUR"
assert BankAccount.is_valid_iban("DE89 3704 0044 0532 0130 00")
# account.balance = 0  -> AttributeError: property 'balance' of 'BankAccount' object has no setter
# endregion anatomy


# region class-vs-instance
class Counter:
    shared: ClassVar[list[str]] = []  # ONE list, on the class

    def __init__(self) -> None:
        self.own: list[str] = []  # a new list per instance


a, b = Counter(), Counter()
a.shared.append("x")
a.own.append("x")
assert b.shared == ["x"]  # every instance sees the class attribute
assert b.own == []
# endregion class-vs-instance


# region property-setter
class Temperature:
    def __init__(self, celsius: float) -> None:
        self.celsius = celsius  # goes through the setter, so it is validated too

    @property
    def celsius(self) -> float:
        return self._celsius

    @celsius.setter
    def celsius(self, value: float) -> None:
        if value < -273.15:
            raise ValueError("below absolute zero")
        self._celsius = value

    @property
    def fahrenheit(self) -> float:  # read-only derived value
        return self._celsius * 9 / 5 + 32


temp = Temperature(20)
temp.celsius = 100
assert temp.fahrenheit == 212
try:
    temp.celsius = -300
except ValueError as error:
    assert str(error) == "below absolute zero"
# endregion property-setter


# region dunders
@total_ordering  # derives <=, >, >= from __eq__ and __lt__
class Money:
    __slots__ = ("amount", "currency")  # fixed attributes: less memory, no typos

    def __init__(self, amount: int, currency: str = "EUR") -> None:
        self.amount = amount  # cents - never use float for money
        self.currency = currency

    def __eq__(self, other: object) -> bool:
        if not isinstance(other, Money):
            return NotImplemented  # let Python try the other operand
        return (self.amount, self.currency) == (other.amount, other.currency)

    def __hash__(self) -> int:  # defining __eq__ removes the default __hash__
        return hash((self.amount, self.currency))

    def __lt__(self, other: Money) -> bool:
        return self.amount < other.amount

    def __add__(self, other: Money) -> Money:
        if other.currency != self.currency:
            raise ValueError("currency mismatch")
        return Money(self.amount + other.amount, self.currency)

    def __bool__(self) -> bool:
        return self.amount != 0

    def __repr__(self) -> str:
        return f"Money({self.amount}, {self.currency!r})"


total = Money(250) + Money(100)
assert total == Money(350)
assert Money(1) < Money(2) and Money(3) >= Money(2)
assert not Money(0)
assert len({Money(1), Money(1)}) == 1  # hashable -> usable in sets and as dict keys
assert sorted([Money(3), Money(1)]) == [Money(1), Money(3)]
# endregion dunders

print("all class anatomy examples hold")
