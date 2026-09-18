"""`python -m slugkit` - the same CLI without relying on the console script."""

import sys

from slugkit.cli import main

sys.exit(main())
