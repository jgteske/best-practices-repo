# region pricing
from collections.abc import Iterable

from ._rounding import round_half_up  # relative: "the _rounding module next to me"
from .models import Product


def apply_discount(product: Product, percent: int) -> int:
    return round_half_up(product.price_cents * (100 - percent) / 100)


def total(products: Iterable[Product]) -> int:
    return sum(product.price_cents for product in products)


# endregion pricing
