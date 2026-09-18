# region card
from ..models import Product  # `..` = the parent package, shop
from ..pricing import total


def charge(card_number: str, products: list[Product]) -> str:
    return f"charged {total(products)} cents to card ending {card_number[-4:]}"


# endregion card
