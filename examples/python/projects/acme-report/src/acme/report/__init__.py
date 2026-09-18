"""acme.report - shipped by the acme-report distribution, importing across the namespace."""

# region report
from collections import defaultdict

from acme.core import Sale  # a DIFFERENT distribution, same top-level `acme`


def totals_by_region(sales: list[Sale]) -> dict[str, int]:
    totals: defaultdict[str, int] = defaultdict(int)
    for sale in sales:
        totals[sale.region] += sale.amount_cents
    return dict(totals)


# endregion report
