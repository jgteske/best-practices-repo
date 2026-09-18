# Standalone Executables

A wheel needs Python on the target machine, and so do `pip install` and
`pipx install`. When the audience is *users* rather than developers (a desktop
tool for a colleague, an app for customers, a utility for locked-down
machines), ship a program that runs with **nothing installed**: a `.exe` on
Windows, a binary on Linux.

A bundler does this by packing **the Python interpreter, the standard library,
every dependency, and your code** into one folder or one file. This page does it
for `slugkit`'s command-line tool and its small desktop window, using
[PyInstaller](https://pyinstaller.org/). `npm run check:python` builds the
Linux executable on every CI run and executes it with an empty environment, so
there is no Python on its `PATH`.

::: warning No cross-compiling
PyInstaller bundles the interpreter it runs on, so **a Windows `.exe` must be
built on Windows, and a Linux binary on Linux.** Use one CI runner per
target operating system. [See the workflow below](#building-for-windows-and-linux-in-ci).
:::

## Choosing a tool

| Tool | Produces | Needs Python on the target | Good for |
| --- | --- | --- | --- |
| **[PyInstaller](https://pyinstaller.org/)** | a folder or a single executable | no | most CLIs and desktop apps. Mature, and handles most libraries through hooks |
| **[Nuitka](https://nuitka.net/)** | a compiled executable (Python translated to C) | no | faster startup, code that is harder to decompile. Slower builds, needs a C compiler |
| **[Briefcase](https://briefcase.readthedocs.io/)** | native installers: `.msi`, `.AppImage`, `.dmg`, `.deb` | no | GUI apps that should install like native apps |
| `zipapp` / [shiv](https://shiv.readthedocs.io/) | one `.pyz` file | **yes** | internal tools where Python is already everywhere |
| `pipx install` | a command in the user's PATH | **yes** | developer-facing CLIs |
| a container image | an image | no (Docker instead) | servers and services, not desktop programs |

The rest of this page uses PyInstaller. The concepts (one-file vs one-dir,
building per OS, data files, signing) apply to the others too.

## Setting it up in a Poetry project

PyInstaller is a build tool, so it belongs in a dependency group of its own. It
isn't a runtime dependency, and it isn't needed by everyone who runs the tests:

<<< ../../examples/python/projects/slugkit/pyproject.toml#poetry{toml}

::: details Why the `python_version < '3.16'` marker?
PyInstaller releases declare the Python versions they support, with an upper
bound, and `slugkit` declares `requires-python = ">=3.13"` with none. Without
the marker, Poetry refuses to lock, because it must find versions that work for
*every* Python the project allows:

```
The current project's supported Python range (>=3.15) is not compatible with some of the required packages Python requirement:
  - pyinstaller requires Python <3.16,>=3.8, so it will not be installable for Python >=3.16
```

The marker says "this group only applies on Python < 3.16". Don't cap
`requires-python` to silence the error. That would stop *users* of the library
from installing it on newer Pythons, for the sake of one build tool.
:::

PyInstaller bundles a script, not a `module:function` entry point, so each
executable gets a tiny launcher that imports the *installed* package:

<<< ../../examples/python/projects/slugkit/packaging/slugkit_cli.py#entry

The launchers live in `packaging/`, outside `src/`, so they are not part of the
wheel.

## Building the command-line tool

```
$ poetry sync --with bundle
  - Installing pyinstaller (6.22.3)
  - Installing pyinstaller-hooks-contrib (2026.7)

$ poetry run pyinstaller --onefile --name slugkit packaging/slugkit_cli.py
...
Building EXE from EXE-00.toc completed successfully.
Build complete! The results are available in: .../dist

$ ls -la dist/
-rwxr-xr-x 1 jo jo 21580960 Sep 18 07:34 slugkit
```

That's a 21 MB, self-contained ELF executable. `env -i` starts it with a
completely empty environment, so there's no `PATH` to a Python, no venv, and no
`PYTHONPATH`:

```
$ env -i ./dist/slugkit slug "Hello, World!" "Crème brûlée"
hello-world
creme-brulee

$ env -i ./dist/slugkit --version
slugkit 0.3.0
```

`--version` works because PyInstaller also bundled `slugkit`'s package
metadata, which `importlib.metadata.version("slugkit")` reads at runtime. On
Windows, the same command run on a Windows machine produces
`dist\slugkit.exe`.

## Building a desktop (GUI) program

The GUI is a small tkinter window, from the standard library, that slugifies as
you type:

<<< ../../examples/python/projects/slugkit/src/slugkit/gui.py#gui

```
$ poetry run pyinstaller --windowed --name slugkit-gui packaging/slugkit_gui.py

$ ls dist/slugkit-gui
_internal
slugkit-gui

$ ls dist/slugkit-gui/_internal
base_library.zip
libbz2.so.1.0
libcrypto.so.3
liblzma.so.5
libmpdec.so.4
libpython3.13.so.1.0
libtcl8.6.so
libtk8.6.so
libX11.so.6
...
slugkit-0.3.0.dist-info
_tcl_data
_tk_data

$ du -sh dist/slugkit-gui
58M     dist/slugkit-gui
```

This is a **one-dir** build (the default): a launcher next to an `_internal/`
folder that holds the interpreter (`libpython3.13.so`), Tcl/Tk for the window,
and the compiled standard library (`base_library.zip`).

- **`--windowed`** (`--noconsole`) matters on Windows. Without it, a console
  window opens behind the GUI. On Linux it has no effect.
- **`--icon app.ico`** sets the Windows executable's icon.
- Sizes depend on the Python build and your dependencies. The numbers above
  come from a conda-based Python, and a Qt-based GUI is much bigger than a
  tkinter one.

## One file or one directory?

| | `--onefile` | one-dir (default) |
| --- | --- | --- |
| Hand-over | a single file | a folder: zip it or wrap it in an installer |
| Startup | unpacks itself to a temp dir on *every* launch. 0.3 s here, several seconds for big apps | immediate |
| Antivirus | self-extracting executables trigger more false positives on Windows | fewer |
| Debugging | harder: files only exist while running | you can see exactly what was bundled |
| Pick it for | small CLIs you email or drop on a share | GUI apps, anything large, anything with an installer |

## Data files, hidden imports, and other surprises

PyInstaller follows `import` statements to decide what to bundle, so anything
imported or loaded dynamically needs a hint:

| Symptom when the executable runs | Fix |
| --- | --- |
| `ModuleNotFoundError` for a module you use | `--hidden-import pkg.module` (it was imported by string, e.g. a plugin) |
| a data file, template or image is missing | `--add-data "assets:assets"` (source:destination), or `--collect-data pkg` for a package's own data |
| `PackageNotFoundError` from `importlib.metadata` | `--copy-metadata pkg` |
| a third-party library misbehaves | check for a hook in `pyinstaller-hooks-contrib`, or `--collect-all pkg` as a blunt fix |

Read your *own* data files with `importlib.resources.files("slugkit") / "data.json"`.
It works in a normal install, in an editable install, and in a PyInstaller
bundle. Paths built from `os.getcwd()` do not.

After the first build, PyInstaller writes `slugkit.spec`, a Python file that
records every option. Commit it and build with `pyinstaller slugkit.spec` from
then on. It's also where complex options (several data folders, excludes, two
executables sharing one folder) are easier to express than on the command
line.

## Building for Windows and Linux in CI

One job per operating system, each building its own executable and uploading
it as an artifact:

```yaml
name: Build executables

on:
  push:
    tags: ["v*"]

jobs:
  bundle:
    strategy:
      matrix:
        # the oldest Linux you support: the binary needs a glibc at least this old
        os: [windows-latest, ubuntu-22.04]
    runs-on: ${{ matrix.os }}
    defaults:
      run:
        working-directory: examples/python/projects/slugkit
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.13"
      - run: pipx install poetry
      - run: poetry sync --with bundle
      - run: poetry run pyinstaller --onefile --name slugkit packaging/slugkit_cli.py
      - run: poetry run pyinstaller --windowed --name slugkit-gui packaging/slugkit_gui.py
      - uses: actions/upload-artifact@v4
        with:
          name: slugkit-${{ runner.os }}
          path: examples/python/projects/slugkit/dist/
```

## Shipping it

**Windows**

- **Sign the executable** (`signtool` with a code-signing certificate).
  Unsigned executables trigger a SmartScreen "Windows protected your PC" warning,
  and unsigned one-file builds are what antivirus heuristics flag most often.
- For an app people install, wrap the one-dir build in an installer
  ([Inno Setup](https://jrsoftware.org/isinfo.php) or WiX) that adds a Start-menu
  entry and an uninstaller. Briefcase can produce an `.msi` directly.

**Linux**

- **Build on the oldest distribution you support.** The bundle links against
  the build machine's glibc, and it runs on that version *or newer*, not older.
  An Ubuntu 22.04 build runs on 24.04, but not the other way round.
- `chmod +x` survives a `.tar.gz` but not every zip tool. Ship tarballs.
- For desktop integration (an icon in the app menu), add a `.desktop` file, or
  package the one-dir build as an [AppImage](https://appimage.org/).

**Both**

- A bundle is a snapshot. Security fixes in Python or a dependency reach users
  only when you rebuild and redistribute.
- Test the artifact on a clean machine or VM without Python, not on the build
  machine. `env -i ./app` is a quick first check on Linux.

## Checklist

- The bundler lives in its own optional dependency group, never in runtime
  dependencies.
- Launcher scripts sit outside `src/` and import the installed package.
- Builds run on each target OS, in CI, from a committed `.spec` file.
- Use one-dir for GUI apps and anything large, one-file for small CLIs.
- Data files are read with `importlib.resources`, and hidden imports and
  metadata are declared.
- Windows builds are signed. Linux builds are made on the oldest supported
  distro.
