"""Writes two modules that import each other into a temp dir and shows the failure.

Run it: python3 circular_imports_demo.py
"""

import subprocess
import sys
import tempfile
import textwrap
from pathlib import Path

# region circular
orders = """
    from app.customers import Customer   # (2) customers is only half-initialised here

    class Order:
        def __init__(self, customer: "Customer") -> None:
            self.customer = customer
"""
customers = """
    from app.orders import Order         # (1) starts loading orders before Customer exists

    class Customer:
        def orders(self) -> list["Order"]:
            return []
"""
# endregion circular

# region circular-fixed
fixed_customers = """
    from __future__ import annotations
    from typing import TYPE_CHECKING

    if TYPE_CHECKING:                # only the type checker follows this import
        from app.orders import Order

    class Customer:
        def orders(self) -> list[Order]:
            return []
"""
# endregion circular-fixed

with tempfile.TemporaryDirectory() as tmp:
    root = Path(tmp)
    (root / "app").mkdir()
    (root / "app" / "__init__.py").touch()
    (root / "app" / "orders.py").write_text(textwrap.dedent(orders))

    for label, source in [("broken", customers), ("fixed", fixed_customers)]:
        (root / "app" / "customers.py").write_text(textwrap.dedent(source))
        run = subprocess.run(
            [sys.executable, "-B", "-c", "import app.customers; print('imported fine')"],
            cwd=root,
            capture_output=True,
            text=True,
        )
        last_line = (run.stdout or run.stderr).strip().splitlines()[-1].replace(tmp, "<tmp>")
        print(f"{label:7} -> {last_line}")
        assert (run.returncode == 0) == (label == "fixed")
