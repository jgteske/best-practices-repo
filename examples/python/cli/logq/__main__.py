"""`python -m logq` runs the same entry point as the installed `logq` command."""

import sys

from logq.cli import entry

sys.exit(entry())
