"""Turn titles into URL slugs."""

# region init
from importlib.metadata import version

from slugkit.core import SlugError, slugify, unique_slug

__all__ = ["SlugError", "slugify", "unique_slug"]
__version__ = version("slugkit")  # single source of truth: pyproject.toml
# endregion init
