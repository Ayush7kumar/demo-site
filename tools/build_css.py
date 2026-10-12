"""Build assets/css/site.css from tools/site.src.css.

    python tools/build_css.py

The source uses a shorthand: "12u" means 12 stage units (the stage is 1671 x 941 units, the size of the
reference screenshot). This script expands every "Nu" to calc(var(--u) * N) so the whole HUD scales together.
"""
import os, re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
src = open(os.path.join(ROOT, "tools", "site.src.css"), encoding="utf8").read()
src = src.split("*/\n\n", 1)[1]                                     # drop the source-only header
out = re.sub(r"(?<![\w#.])(-?\d*\.?\d+)u(?![\w-])", lambda m: "calc(var(--u) * %s)" % m.group(1), src)
banner = "/* GENERATED from tools/site.src.css by tools/build_css.py. Edit the source, not this file. */\n\n"
path = os.path.join(ROOT, "assets", "css", "site.css")
open(path, "w", encoding="utf8").write(banner + out)
print("wrote", path, len(out), "bytes")
