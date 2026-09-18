"""The public face of the `shop` package.

`import shop` runs this file once; afterwards the module object is cached in
sys.modules. Re-exporting here gives callers one stable import path
(`from shop import Product`) no matter how the files behind it are arranged.
"""

# region init
from shop.models import Product
from shop.pricing import apply_discount, total

__all__ = ["Product", "apply_discount", "total"]  # the public API, and what `import *` takes
__version__ = "1.0.0"
# endregion init
