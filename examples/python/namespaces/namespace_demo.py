"""How `import acme.core` and `import acme.report` find code in two different folders.

Uses the two distributions in ../projects/acme-core and ../projects/acme-report
straight from their src/ folders, the way two editable installs would.

Run it: python3 namespace_demo.py
"""

import importlib.util
import subprocess
import sys
import tempfile
import textwrap
from pathlib import Path

HERE = Path(__file__).resolve().parent
PROJECTS = HERE.parent / "projects"

# region search-path
# sys.path is the ordered list of places `import` looks. Entry 0 is the running
# script's directory (or "" / the cwd for -c and -m). Then PYTHONPATH, the
# stdlib, and site-packages - where pip and Poetry install things.
print("sys.path[0]:", Path(sys.path[0]).name)
print("site-packages on the path:", any(p.endswith("site-packages") for p in sys.path))

# Two separate folders that BOTH contain an `acme/` directory without __init__.py:
sys.path[1:1] = [str(PROJECTS / "acme-core" / "src"), str(PROJECTS / "acme-report" / "src")]
# endregion search-path

# region namespace-import
import acme  # noqa: E402 - imported after the path setup on purpose
from acme.core import Sale  # noqa: E402
from acme.report import totals_by_region  # noqa: E402

# A namespace package has no __init__.py, so no __file__ - and a __path__ that
# spans every folder where an `acme/` directory was found.
print("acme.__file__:", acme.__file__)
print("acme.__path__:")
for part in acme.__path__:
    print("   ", Path(part).relative_to(PROJECTS))

sales = [Sale("eu", 500), Sale("us", 700), Sale("eu", 250)]
assert totals_by_region(sales) == {"eu": 750, "us": 700}
# endregion namespace-import

# region find-spec
# find_spec shows which file an import would load, without running it.
spec = importlib.util.find_spec("acme.report")
assert spec is not None and spec.origin is not None
print("acme.report loads from:", Path(spec.origin).relative_to(PROJECTS))
# endregion find-spec

# region regular-package-shadowing
# Now the classic mistake: each distribution ships its own acme/__init__.py.
# The first `acme` found on sys.path becomes a REGULAR package, its __path__ is
# that one folder, and the other distribution's subpackage becomes invisible.
broken = """
    import sys
    sys.path[1:1] = ["first", "second"]
    import acme.core
    print("acme.__path__ =", [p.split("/")[-2] for p in acme.__path__])
    import acme.report
"""
with tempfile.TemporaryDirectory() as tmp:
    for root, subpackage in [("first", "core"), ("second", "report")]:
        package = Path(tmp, root, "acme", subpackage)
        package.mkdir(parents=True)
        (package / "__init__.py").touch()
        (package.parent / "__init__.py").touch()  # <- the mistake
    run = subprocess.run(
        [sys.executable, "-B", "-c", textwrap.dedent(broken)], cwd=tmp, capture_output=True, text=True
    )
    print("with acme/__init__.py in both:")
    print("   ", run.stdout.strip())
    print("   ", run.stderr.strip().splitlines()[-1])
    assert run.returncode != 0
# endregion regular-package-shadowing
