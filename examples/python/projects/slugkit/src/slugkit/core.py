"""The pure functions behind slugkit. No I/O here, which makes them trivial to test."""

# region core
import re
import unicodedata
from collections.abc import Collection

_NOT_ALLOWED = re.compile(r"[^a-z0-9]+")


class SlugError(ValueError):
    """Raised when a text contains nothing a slug can be built from."""


def slugify(text: str, *, separator: str = "-", max_length: int | None = None) -> str:
    """Return a lowercase ASCII slug: ``"Héllo, World!"`` -> ``"hello-world"``."""
    ascii_text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode()
    slug = _NOT_ALLOWED.sub(separator, ascii_text.lower()).strip(separator)
    if not slug:
        raise SlugError(f"nothing to slugify in {text!r}")
    if max_length is not None:
        slug = slug[:max_length].rstrip(separator)
    return slug


def unique_slug(text: str, taken: Collection[str]) -> str:
    """Slugify, then append -2, -3, ... until the slug is not in ``taken``."""
    base = slugify(text)
    candidate, counter = base, 2
    while candidate in taken:
        candidate, counter = f"{base}-{counter}", counter + 1
    return candidate


# endregion core
