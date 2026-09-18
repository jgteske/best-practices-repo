"""Inheritance, super(), abstract base classes, and when to use a Protocol instead.

Run it: python3 inheritance_and_protocols.py
"""

from abc import ABC, abstractmethod
from typing import Protocol, override


# region inheritance
class Animal:
    def __init__(self, name: str) -> None:
        self.name = name

    def speak(self) -> str:
        return "..."

    def introduce(self) -> str:
        return f"{self.name} says {self.speak()}"  # dispatches to the subclass


class Dog(Animal):
    def __init__(self, name: str, breed: str) -> None:
        super().__init__(name)  # always let the parent initialise its own state
        self.breed = breed

    @override  # 3.12+: mypy errors if the parent has no such method (catches typos)
    def speak(self) -> str:
        return "woof"


rex = Dog("Rex", "collie")
assert rex.introduce() == "Rex says woof"
assert isinstance(rex, Animal) and issubclass(Dog, Animal)
# endregion inheritance


# region mro
# With multiple inheritance, super() follows the Method Resolution Order - the
# next class in the MRO, which is not necessarily the direct parent.
class Base:
    def setup(self) -> list[str]:
        return ["Base"]


class Logging(Base):
    @override
    def setup(self) -> list[str]:
        return ["Logging", *super().setup()]


class Caching(Base):
    @override
    def setup(self) -> list[str]:
        return ["Caching", *super().setup()]


class Service(Logging, Caching):
    @override
    def setup(self) -> list[str]:
        return ["Service", *super().setup()]


assert [cls.__name__ for cls in Service.__mro__] == ["Service", "Logging", "Caching", "Base", "object"]
assert Service().setup() == ["Service", "Logging", "Caching", "Base"]  # each class runs once
# endregion mro


# region abc
# An ABC is nominal: implementers must inherit from it. It can share code
# (template methods) and refuses to instantiate while anything is abstract.
class Exporter(ABC):
    def export(self, rows: list[dict[str, str]]) -> str:
        return self.header() + "\n".join(self.format_row(row) for row in rows)

    @abstractmethod
    def format_row(self, row: dict[str, str]) -> str: ...

    def header(self) -> str:  # a hook with a default
        return ""


class CsvExporter(Exporter):
    @override
    def format_row(self, row: dict[str, str]) -> str:
        return ",".join(row.values())

    @override
    def header(self) -> str:
        return "name,city\n"


rows = [{"name": "Ada", "city": "London"}]
assert CsvExporter().export(rows) == "name,city\nAda,London"
try:
    Exporter()  # type: ignore[abstract]
except TypeError as error:
    print(f"  {error}")
# endregion abc


# region protocol-vs-abc
# A Protocol is structural: nothing inherits from it. Prefer it for the
# parameter types of functions ("what do I need from the argument?"), and
# especially for classes you do not own.
class Renderer(Protocol):
    def render(self, text: str) -> str: ...


class Markdown:  # knows nothing about Renderer
    def render(self, text: str) -> str:
        return f"**{text}**"


def publish(renderer: Renderer, text: str) -> str:
    return renderer.render(text)


assert publish(Markdown(), "hi") == "**hi**"
# endregion protocol-vs-abc


# region composition
# Inheritance says "is a". Most of the time you want "has a": pass the
# collaborator in, and the class stays small and trivially testable.
class ReportService:
    def __init__(self, exporter: Exporter) -> None:
        self._exporter = exporter

    def build(self, rows: list[dict[str, str]]) -> str:
        return self._exporter.export(rows)


assert ReportService(CsvExporter()).build(rows).startswith("name,city")
# endregion composition

print("all inheritance examples hold")
