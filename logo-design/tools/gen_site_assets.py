import os, lib
SITE = r"C:\Users\uradk\OneDrive\Pictures\demo site\assets\img"
lib.OUT = SITE
import decal
from decal import *
decal.write = lib.write
HUD = dict(ground="#020705", ink="#d6ffe8", acc="#22f08a")
lib.write("logo-plate.svg", primary(HUD, "hud"))
lib.write("logo-stamp.svg", stamp(HUD, "hud"))
# key only (transparent canvas; knock-outs use the site background colour)
def key_only(pal, bg=False, pad=0):
    c = Ctx(pal)
    draw_key(c, 240, 110, 1.0, press=0)
    W, H = 480, 452
    defs = f"<defs>{''.join(c.defs)}</defs>" if c.defs else ""
    g = f'<rect width="{W}" height="{H}" rx="72" fill="{c.G}"/>' if bg else ""
    return svg(W, H, defs + g + "".join(c.o), "One Click Works key")
lib.write("key.svg", key_only(HUD))
# favicon: square, key centred on dark tile
def favicon(pal):
    c = Ctx(pal)
    draw_key(c, 256, 150, 0.92, press=0)
    defs = f"<defs>{''.join(c.defs)}</defs>"
    return svg(512, 512, defs + f'<rect width="512" height="512" rx="96" fill="{c.G}"/>' + "".join(c.o), "One Click Works")
lib.write("favicon.svg", favicon(dict(ground="#020705", ink="#d6ffe8", acc="#22f08a")))
print("assets ok")
