"""A minimal desktop window for slugkit, using tkinter from the standard library."""

# region gui
import tkinter as tk
from tkinter import ttk

from slugkit.core import SlugError, slugify


def build_window(root: tk.Tk) -> tk.StringVar:
    root.title("slugkit")
    frame = ttk.Frame(root, padding=12)
    frame.grid()

    title = tk.StringVar()
    result = tk.StringVar(value="type a title...")

    def update(*_: object) -> None:
        try:
            result.set(slugify(title.get()))
        except SlugError:
            result.set("")

    title.trace_add("write", update)  # re-slugify on every keystroke
    ttk.Label(frame, text="Title").grid(column=0, row=0, sticky="w")
    entry = ttk.Entry(frame, textvariable=title, width=40)
    entry.grid(column=0, row=1)
    ttk.Label(frame, textvariable=result, font=("TkFixedFont", 11)).grid(
        column=0, row=2, sticky="w"
    )
    entry.focus()
    return title


def main() -> None:
    root = tk.Tk()
    build_window(root)
    root.mainloop()


# endregion gui
