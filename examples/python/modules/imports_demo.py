"""Every way to import from the `shop` package next to this file, and what each binds.

Run it from this directory: python3 imports_demo.py
"""

import importlib
import subprocess
import sys

# region import-forms
import shop  # binds the name `shop` to the package
import shop.pricing  # loads the submodule; `shop` is bound, reach it as shop.pricing
import shop.pricing as pricing  # binds only `pricing`
from shop import Product, total  # binds the objects themselves
from shop.payments.card import charge  # deep import of a subpackage module

book = Product("B-1", "Python Book", 3999)
pen = shop.Product("P-1", "Pen", 199)

assert total([book, pen]) == 4198
assert shop.pricing.apply_discount(book, 10) == 3599
assert pricing is shop.pricing  # one module object, however you reach it
assert charge("4111111111111111", [pen]) == "charged 199 cents to card ending 1111"
# endregion import-forms

# region module-cache
# A module's code runs once per process. Every later import is a dict lookup.
assert sys.modules["shop.pricing"] is pricing
assert importlib.import_module("shop.models").Product is Product  # import by string (plugins)
# endregion module-cache

# region module-attributes
print("shop.__name__    ", shop.__name__)
print("pricing.__name__ ", pricing.__name__)
print("this file        ", __name__)  # "__main__" because it is being run, not imported
print("shop.__all__     ", shop.__all__)
print("shop.__file__    ", shop.__file__.removeprefix(sys.path[0] + "/"))
# endregion module-attributes

# region run-as-module
# `python -m shop` puts the CURRENT DIRECTORY on sys.path and runs shop/__main__.py.
result = subprocess.run(
    [sys.executable, "-B", "-m", "shop", "25"], capture_output=True, text=True, check=True
)
print("python -m shop 25 ->", result.stdout.strip())
# endregion run-as-module
