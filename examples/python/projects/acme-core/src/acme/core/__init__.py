"""acme.core - shipped by the acme-core distribution."""

# region core
from dataclasses import dataclass


@dataclass(frozen=True)
class Sale:
    region: str
    amount_cents: int


# endregion core
