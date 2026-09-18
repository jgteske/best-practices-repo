"""Helpers for sales_exploration.ipynb.

Code that a notebook relies on lives in a module: it can be imported, tested,
type-checked and diffed - none of which works well for code inside cells.
"""

# region analysis
import statistics
from collections import defaultdict
from dataclasses import dataclass


@dataclass(frozen=True)
class Sale:
    month: str
    region: str
    amount: float


def load_sales() -> list[Sale]:
    # Stands in for pandas.read_csv / a database query in a real notebook.
    rows = [
        ("2026-01", "eu", 1200.0),
        ("2026-01", "us", 950.0),
        ("2026-02", "eu", 1320.0),
        ("2026-02", "us", 1010.0),
        ("2026-03", "eu", 1105.0),
        ("2026-03", "us", 1400.0),
    ]
    return [Sale(*row) for row in rows]


def monthly_totals(sales: list[Sale]) -> dict[str, float]:
    totals: defaultdict[str, float] = defaultdict(float)
    for sale in sales:
        totals[sale.month] += sale.amount
    return dict(totals)


def summary(values: list[float]) -> dict[str, float]:
    return {
        "mean": round(statistics.mean(values), 1),
        "median": statistics.median(values),
        "stdev": round(statistics.stdev(values), 1),
    }


# endregion analysis
