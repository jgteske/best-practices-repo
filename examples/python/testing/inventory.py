"""The code under test for the pytest examples in this folder."""

# region inventory
import json
import os
from dataclasses import dataclass, field
from pathlib import Path
from typing import Self


class OutOfStockError(Exception):
    pass


@dataclass
class Inventory:
    items: dict[str, int] = field(default_factory=dict)

    def add(self, sku: str, quantity: int = 1) -> None:
        if quantity <= 0:
            raise ValueError("quantity must be positive")
        self.items[sku] = self.items.get(sku, 0) + quantity

    def remove(self, sku: str, quantity: int = 1) -> None:
        if self.items.get(sku, 0) < quantity:
            raise OutOfStockError(sku)
        self.items[sku] -= quantity

    def save(self, path: Path) -> None:
        path.write_text(json.dumps(self.items, sort_keys=True), encoding="utf-8")

    @classmethod
    def load(cls, path: Path) -> Self:
        return cls(json.loads(path.read_text(encoding="utf-8")))


def warehouse_name() -> str:
    return os.environ.get("WAREHOUSE", "main")


# endregion inventory
