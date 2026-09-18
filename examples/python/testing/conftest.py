# region conftest
# conftest.py is discovered automatically; its fixtures are available to every
# test file in this directory and below - no import needed.
import pytest
from inventory import Inventory


@pytest.fixture
def stocked() -> Inventory:
    """A fresh inventory for every test that asks for it."""
    return Inventory({"apple": 3, "pear": 1})


# endregion conftest
