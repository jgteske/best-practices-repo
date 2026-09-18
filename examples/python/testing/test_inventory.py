# region basics
from collections.abc import Iterator
from pathlib import Path

import pytest
from inventory import Inventory, OutOfStockError, warehouse_name


def test_add_new_item() -> None:  # a test is a function named test_*, using plain assert
    inventory = Inventory()
    inventory.add("apple", 2)
    assert inventory.items == {"apple": 2}


def test_remove_uses_fixture(stocked: Inventory) -> None:  # fixtures arrive as parameters
    stocked.remove("apple")
    assert stocked.items["apple"] == 2


def test_remove_too_many_raises(stocked: Inventory) -> None:
    with pytest.raises(OutOfStockError, match="pear"):
        stocked.remove("pear", 5)


# endregion basics


# region parametrize
@pytest.mark.parametrize("quantity", [0, -1, -100])
def test_add_rejects_non_positive(quantity: int) -> None:
    with pytest.raises(ValueError, match="positive"):
        Inventory().add("apple", quantity)


@pytest.mark.parametrize(
    ("adds", "expected"),
    [
        pytest.param([("a", 1)], {"a": 1}, id="single"),
        pytest.param([("a", 1), ("a", 2)], {"a": 3}, id="accumulates"),
        pytest.param([("a", 1), ("b", 1)], {"a": 1, "b": 1}, id="separate-skus"),
    ],
)
def test_add_many(adds: list[tuple[str, int]], expected: dict[str, int]) -> None:
    inventory = Inventory()
    for sku, quantity in adds:
        inventory.add(sku, quantity)
    assert inventory.items == expected


# endregion parametrize


# region builtin-fixtures
def test_round_trip_through_a_file(stocked: Inventory, tmp_path: Path) -> None:
    # tmp_path: a fresh, empty directory per test, cleaned up by pytest.
    target = tmp_path / "inventory.json"
    stocked.save(target)
    assert Inventory.load(target) == stocked


def test_reads_warehouse_from_env(monkeypatch: pytest.MonkeyPatch) -> None:
    # monkeypatch: every change is undone after the test, even if it fails.
    monkeypatch.setenv("WAREHOUSE", "berlin")
    assert warehouse_name() == "berlin"
    monkeypatch.delenv("WAREHOUSE")
    assert warehouse_name() == "main"


# endregion builtin-fixtures


# region yield-fixture
@pytest.fixture
def log_file(tmp_path: Path) -> Iterator[Path]:
    path = tmp_path / "app.log"
    path.write_text("", encoding="utf-8")
    yield path  # the test runs here
    # teardown: runs after the test, pass or fail
    assert path.exists(), "the test must not delete the log file"


def test_appends_to_log(log_file: Path) -> None:
    with log_file.open("a", encoding="utf-8") as handle:
        handle.write("started\n")
    assert log_file.read_text(encoding="utf-8") == "started\n"


# endregion yield-fixture
