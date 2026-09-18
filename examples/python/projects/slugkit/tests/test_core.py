# region test-core
import pytest

from slugkit import SlugError, slugify, unique_slug


@pytest.mark.parametrize(
    ("title", "expected"),
    [
        ("Hello World", "hello-world"),
        ("  Hello,   World!  ", "hello-world"),
        ("Crème brûlée", "creme-brulee"),
        ("Python 3.13 is out", "python-3-13-is-out"),
    ],
)
def test_slugify(title: str, expected: str) -> None:
    assert slugify(title) == expected


def test_custom_separator_and_length() -> None:
    assert slugify("A long title here", separator="_", max_length=6) == "a_long"


def test_rejects_text_without_letters() -> None:
    with pytest.raises(SlugError, match="nothing to slugify"):
        slugify("!!!")


def test_unique_slug_counts_up() -> None:
    assert unique_slug("Post", taken={"post", "post-2"}) == "post-3"


# endregion test-core
