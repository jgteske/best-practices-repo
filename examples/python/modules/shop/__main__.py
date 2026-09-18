"""Runs for `python -m shop`, the way a package becomes executable."""

# region main
import sys

from shop import Product, apply_discount


def main(argv: list[str]) -> int:
    percent = int(argv[0]) if argv else 10
    book = Product("B-1", "Python Book", 3999)
    print(f"{book.name}: {book.price_cents} -> {apply_discount(book, percent)} cents ({percent}% off)")
    return 0


if __name__ == "__main__":  # true when run, false when imported
    sys.exit(main(sys.argv[1:]))
# endregion main
