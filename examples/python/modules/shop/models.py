# region models
from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class Product:
    sku: str
    name: str
    price_cents: int


# endregion models
