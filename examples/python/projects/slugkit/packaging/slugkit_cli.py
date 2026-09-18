# region entry
# PyInstaller bundles a *script*, not a `module:function` entry point, so each
# executable gets a two-line launcher that imports the installed package.
from slugkit.cli import main

raise SystemExit(main())
# endregion entry
