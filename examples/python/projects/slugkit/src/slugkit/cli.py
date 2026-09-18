"""The `slugkit` command. Installed as a console script via [project.scripts]."""

# region cli
import argparse
import sys
from collections.abc import Sequence

from slugkit import __version__
from slugkit.core import SlugError, slugify, unique_slug


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="slugkit", description="Turn titles into URL slugs.")
    parser.add_argument("--version", action="version", version=f"%(prog)s {__version__}")
    commands = parser.add_subparsers(dest="command", required=True)

    slug = commands.add_parser("slug", help="slugify each title (or each line of stdin)")
    slug.add_argument("titles", nargs="*", help="titles to convert; reads stdin when omitted")
    slug.add_argument(
        "-s", "--separator", default="-", help="word separator (default: %(default)s)"
    )
    slug.add_argument("-m", "--max-length", type=int, metavar="N", help="truncate slugs to N chars")

    dedupe = commands.add_parser("dedupe", help="slugify titles, making repeats unique")
    dedupe.add_argument("titles", nargs="+")
    return parser


def main(argv: Sequence[str] | None = None) -> int:
    """Entry point. Takes argv so tests can call it without a subprocess."""
    args = build_parser().parse_args(argv)  # None -> sys.argv[1:]

    try:
        if args.command == "slug":
            titles = args.titles or [line.strip() for line in sys.stdin if line.strip()]
            for title in titles:
                print(slugify(title, separator=args.separator, max_length=args.max_length))
        elif args.command == "dedupe":
            taken: set[str] = set()
            for title in args.titles:
                slug = unique_slug(title, taken)
                taken.add(slug)
                print(slug)
    except SlugError as error:
        print(f"slugkit: error: {error}", file=sys.stderr)  # errors go to stderr...
        return 1  # ...and the exit code says it failed
    return 0


# endregion cli
