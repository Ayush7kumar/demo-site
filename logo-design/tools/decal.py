"""One Click Works: retro micrographic decal logo. Outlined exploration type (system fonts)."""
import math
from lib import *

NAME = "ONE CLICK WORKS"

PAL = {
    "paper": dict(ground="#efe6d0", ink="#17191b", acc="#e2531f"),
    "dark": dict(ground="#101315", ink="#ece7da", acc="#ff6a2b"),
}


class Ctx:
    def __init__(self, pal):
        self.G, self.I, self.A = pal["ground"], pal["ink"], pal["acc"]
        self.o = []
        self.defs = []
        self._id = 0
        self.fm = font("bahnschrift.ttf", {"wght": 500, "wdth": 85})
        self.fl = font("bahnschrift.ttf", {"wght": 300, "wdth": 85})
        self.fb = font("bahnschrift.ttf", {"wght": 700, "wdth": 85})
        self.rb = font("ROCKEB.TTF")
        self.rr = font("ROCK.TTF")

    def nid(self, p="c"):
        self._id += 1
        return f"{p}{self._id}"

    def add(self, s):
        self.o.append(s)

    def path(self, d, fill=None, stroke=None, sw=1, op=1, rule="nonzero", extra=""):
        fl = fill if fill else "none"
        st = f' stroke="{stroke}" stroke-width="{f(sw)}" stroke-linejoin="miter"' if stroke else ""
        self.add(f'<path d="{d}" fill="{fl}" fill-rule="{rule}"{st} opacity="{op}" {extra}/>')

    def line(self, x1, y1, x2, y2, sw=1, col=None, op=1):
        self.path(f"M{f(x1)} {f(y1)}L{f(x2)} {f(y2)}", None, col or self.I, sw, op)

    def text(self, txt, x, y, cap=12, anchor="start", trk=.18, col=None, op=1, tt=None):
        tt = tt or self.fm
        self.path(text_d(tt, txt, cap / cap_height(tt), x, y, trk, anchor), col or self.I, None, 0, op)


# ------------------------------------------------------------------ the push-button (isometric, engraved)
def draw_key(c, cx, cy, k=1.0, press=0.0):
    """cx,cy = centre of the keycap TOP face. k scales everything. press shifts the cap down."""
    I, G, A = c.I, c.G, c.A
    cy = cy + press * k
    a, b = 150 * k, 86.6 * k          # top face half-width / half-height
    H = 160 * k
    Af, Bf = 185 * k, 106.8 * k       # base half sizes
    # housing slab (static, does not move when pressed)
    sc_y = cy - press * k + H + 16 * k
    S1, S2, T = 222 * k, 128.2 * k, 26 * k
    slab_top = [(cx, sc_y - S2), (cx + S1, sc_y), (cx, sc_y + S2), (cx - S1, sc_y)]
    c.path(round_poly(slab_top, 8 * k), G, I, 3.2 * k)
    # slab sides
    c.path(f"M{f(cx - S1)} {f(sc_y)}L{f(cx)} {f(sc_y + S2)}V{f(sc_y + S2 + T)}L{f(cx - S1)} {f(sc_y + T)}Z", I, I, 3 * k)
    rid = c.nid("hs")
    c.defs.append(f'<clipPath id="{rid}"><path d="M{f(cx)} {f(sc_y + S2)}L{f(cx + S1)} {f(sc_y)}V{f(sc_y + T)}L{f(cx)} {f(sc_y + S2 + T)}Z"/></clipPath>')
    c.path(f"M{f(cx)} {f(sc_y + S2)}L{f(cx + S1)} {f(sc_y)}V{f(sc_y + T)}L{f(cx)} {f(sc_y + S2 + T)}Z", G, I, 3 * k)
    hs = "".join(f"M{f(cx + dx)} {f(sc_y + 200 * k)}l{f(60 * k)} {f(-120 * k)}" for dx in range(-40, 260, 9))
    c.add(f'<g clip-path="url(#{rid})"><path d="{hs}" fill="none" stroke="{I}" stroke-width="{f(1.3 * k)}"/></g>')
    # slab screws
    for sx, sy in [(cx - S1 * .62, sc_y + S2 * .03), (cx + S1 * .62, sc_y + S2 * .03)]:
        c.path(circle(sx, sy, 5 * k), None, I, 2 * k)
    # keycap faces
    top = [(cx, cy - b), (cx + a, cy), (cx, cy + b), (cx - a, cy)]
    bl = (cx - Af, cy + H); bb = (cx, cy + H + Bf); br = (cx + Af, cy + H)
    left = [top[3], top[2], bb, bl]
    right = [top[2], top[1], br, bb]
    c.path(round_poly(left, 5 * k), I, I, 3 * k)
    rid2 = c.nid("hr")
    rd = round_poly(right, 5 * k)
    c.defs.append(f'<clipPath id="{rid2}"><path d="{rd}"/></clipPath>')
    c.path(rd, G, I, 3.2 * k)
    hatch = "".join(f"M{f(cx + dx * k)} {f(cy + 40 * k)}L{f(cx + dx * k - 90 * k)} {f(cy + 40 * k + 240 * k)}" for dx in range(-40, 420, 11))
    c.add(f'<g clip-path="url(#{rid2})"><path d="{hatch}" fill="none" stroke="{I}" stroke-width="{f(1.7 * k)}"/></g>')
    # grip lines on the left face (knocked out)
    for j in range(4):
        u = .18 + j * .17
        # line parallel to the top edge, on the left face
        p1 = (left[0][0] + (left[3][0] - left[0][0]) * u, left[0][1] + (left[3][1] - left[0][1]) * u)
        p2 = (left[1][0] + (left[2][0] - left[1][0]) * u, left[1][1] + (left[2][1] - left[1][1]) * u)
        c.line(p1[0] + 14 * k, p1[1] + 3 * k, p2[0] - 14 * k, p2[1] - 3 * k, 2 * k, G, .95)
    # top face
    c.path(round_poly(top, 9 * k), G, I, 3.6 * k)
    inner = [(cx, cy - b * .78), (cx + a * .78, cy), (cx, cy + b * .78), (cx - a * .78, cy)]
    c.path(round_poly(inner, 7 * k), None, I, 1.4 * k)
    # legend: flat play triangle (squashed to lie on the face) + two tiny rails
    sx_, sy_ = 1.2247 * 173.2 * k, 0.7071 * 173.2 * k
    tri = [(cx + sx_ * -.17, cy + sy_ * -.22), (cx + sx_ * .22, cy), (cx + sx_ * -.17, cy + sy_ * .22)]
    c.path("M" + "L".join(f"{f(x)} {f(y)}" for x, y in tri) + "Z", A, I, 2.4 * k)
    # engraved legend lines
    for q in (-.38, .38):
        c.line(cx - sx_ * .3, cy + sy_ * q * .62, cx + sx_ * .3, cy + sy_ * q * .62, 1.4 * k, I, .9)
    # motion ticks: "it was clicked"
    for s in (-1, 1):
        for i, (dx, dy) in enumerate([(0, 0), (16, 14)]):
            x0 = cx + s * (a + 26 * k + dx * k)
            c.line(x0, cy - 30 * k + dy * k, x0 + s * 26 * k, cy - 52 * k + dy * k, 3 * k, A if i == 0 else I)
    return dict(top=(cx, cy), a=a, b=b, right_edge=lambda y: right[1][0] + (br[0] - right[1][0]) * ((y - right[1][1]) / (br[1] - right[1][1])),
                base_y=cy + H, slab_bottom=sc_y + S2 + T)


# ------------------------------------------------------------------ pictograms
def picto(c, i, cx, cy, sw=5):
    I, G, A = c.I, c.G, c.A
    s = lambda d, col=None, w=sw, fill=None: c.path(d, fill, col or I, w)
    if i == 0:      # envelope
        s(rect(cx - 42, cy - 28, 84, 56))
        s(f"M{cx - 42} {cy - 28}L{cx} {cy + 6}L{cx + 42} {cy - 28}")
    elif i == 1:    # sheet with table
        s(rect(cx - 32, cy - 40, 64, 80))
        s(f"M{cx - 32} {cy - 14}H{cx + 32}M{cx - 32} {cy + 12}H{cx + 32}M{cx} {cy - 40}V{cy + 40}", None, 3.4)
    elif i == 2:    # decision gate (diamond with branch)
        s(f"M{cx} {cy - 40}L{cx + 40} {cy}L{cx} {cy + 40}L{cx - 40} {cy}Z")
        c.path(circle(cx, cy, 8), I)
        s(f"M{cx - 62} {cy}H{cx - 40}M{cx + 40} {cy}H{cx + 62}", None, 4)
    elif i == 3:    # route / fork
        s(f"M{cx - 46} {cy}H{cx - 6}L{cx + 16} {cy - 30}H{cx + 34}M{cx - 6} {cy}H{cx + 34}M{cx - 6} {cy}L{cx + 16} {cy + 30}H{cx + 34}")
        for yy in (-30, 0, 30):
            c.path(f"M{cx + 34} {cy + yy - 9}L{cx + 50} {cy + yy}L{cx + 34} {cy + yy + 9}Z", I)
    else:           # done
        s(f"M{cx - 34} {cy + 2}L{cx - 10} {cy + 28}L{cx + 36} {cy - 28}", G, 11)


def tile(c, i, x, y, w=150, last=False):
    I, G, A = c.I, c.G, c.A
    ch = 22
    pts = [(x + ch, y), (x + w, y), (x + w, y + w), (x, y + w), (x, y + ch)]
    c.path(round_poly(pts, 3), A if last else G, I, 4)
    c.path(round_poly([(x + ch + 9, y + 9), (x + w - 9, y + 9), (x + w - 9, y + w - 9), (x + 9, y + w - 9), (x + 9, y + ch + 9)], 2), None, I, 1.1, .7)
    c.text(f"0{i + 1}", x + w - 14, y + 30, 12, "end", .12)
    picto(c, i, x + w / 2, y + w / 2 + 6, 5)


# ------------------------------------------------------------------ plate helpers
def plate(c, x0, y0, x1, y1, ch=44):
    pts = [(x0 + ch, y0), (x1, y0), (x1, y1 - ch), (x1 - ch, y1), (x0, y1), (x0, y0 + ch)]
    c.path(round_poly(pts, 7), None, c.I, 6)
    i = 14
    pts2 = [(x0 + ch + i * .4, y0 + i), (x1 - i, y0 + i), (x1 - i, y1 - ch - i * .4), (x1 - ch - i * .4, y1 - i), (x0 + i, y1 - i), (x0 + i, y0 + ch + i * .4)]
    c.path(round_poly(pts2, 4), None, c.I, 1.4, .75)


def hazard(c, x0, y0, x1, y1):
    rid = c.nid("hz")
    c.defs.append(f'<clipPath id="{rid}"><rect x="{x0}" y="{y0}" width="{x1 - x0}" height="{y1 - y0}"/></clipPath>')
    st = "".join(f"M{x}{' '}{y1 + 2}l{y1 - y0 + 4} {-(y1 - y0 + 4)}" for x in range(int(x0 - (y1 - y0)), int(x1), 26))
    c.add(f'<g clip-path="url(#{rid})"><path d="{st}" fill="none" stroke="{c.I}" stroke-width="11"/></g>')
    c.path(rect(x0, y0, x1 - x0, y1 - y0), None, c.I, 2.2)


def barcode(c, x, y, w, h, seed=11):
    bars = ""
    xx = x
    while xx < x + w:
        seed = (seed * 1103515245 + 12345) & 0x7fffffff
        bw = 1.6 + (seed >> 8) % 4
        if (seed >> 5) % 3:
            bars += rect(xx, y, bw, h)
        xx += bw + 1.7
    c.path(bars, c.I, None, 0, .92)


def arrow_down(c, x, y0, y1, col=None):
    col = col or c.A
    c.path(f"M{x} {y0}V{y1 - 14}", None, col, 4, 1, extra='stroke-dasharray="9 7"')
    c.path(f"M{x - 13} {y1 - 16}L{x} {y1}L{x + 13} {y1 - 16}Z", col)


def callout(c, txt, tx, ty, px, py, below=False):
    c.line(tx, ty, px, py, 1.3, c.I, .9)
    c.path(circle(px, py, 3.2), c.I)
    c.text(txt, tx, ty + (20 if below else -6), 14, "middle", .1, tt=c.fb)


def finish(c, W, H, title):
    defs = f"<defs>{''.join(c.defs)}</defs>" if c.defs else ""
    return svg(W, H, defs + f'<rect width="{W}" height="{H}" fill="{c.G}"/>' + "".join(c.o), title)


# ------------------------------------------------------------------ PRIMARY: horizontal decal
def primary(pal, name="primary"):
    c = Ctx(pal)
    W, H = 1800, 760
    plate(c, 40, 40, 1760, 720)
    for i in range(0, 140):
        x = 120 + i * 11.5
        if x > 1700:
            break
        c.line(x, 54, x, 54 + (9 if i % 5 == 0 else 4), 1, c.I, .65)
    nx = 590
    sz = 78 / cap_height(c.rb)
    wfit = 1122 / text_width(c.rb, NAME, sz, .02)
    sz *= wfit
    c.path(text_d(c.rb, NAME, sz, nx, 130 + sz * cap_height(c.rb) * 0 + 56 + (78 * wfit) * .0 + 0, .02) if False else text_d(c.rb, NAME, sz, nx, 98 + sz * cap_height(c.rb), .02), c.I)
    c.line(nx, 212, 1712, 212, 3)
    c.line(nx, 220, 1712, 220, 1.1, c.I, .8)
    c.text("AI WORKFLOW AUTOMATION", nx, 262, 19, "start", .3)
    c.text("INTEGRATIONS  •  AGENTS  •  HANDOFFS", 1712, 262, 14, "end", .26, op=.8, tt=c.fl)
    # flow row
    wy = 430
    tx0, pitch, tw = 610, 210, 150
    bx0, bx1, by = tx0, tx0 + 4 * pitch + tw, 336
    c.path(f"M{bx0} {by + 10}V{by}H{bx1}V{by + 10}", None, c.I, 1.6)
    c.text("ONE PRESS", bx0 + 2, by - 10, 12, "start", .25)
    c.text("FIVE STEPS  •  ONE RESULT", bx1 - 2, by - 10, 12, "end", .25, op=.85, tt=c.fl)
    # accent wire first (key and tiles sit on top)
    wx0 = 478
    c.path(f"M{wx0} {wy}H{tx0 + 4 * pitch + tw + 40}", None, c.A, 5)
    for i in range(4):
        xa = tx0 + i * pitch + tw
        c.path(f"M{xa + 18} {wy - 10}L{xa + 38} {wy}L{xa + 18} {wy + 10}Z", c.A)
    xe = tx0 + 4 * pitch + tw + 40
    c.path(circle(xe, wy, 8), c.G, c.A, 4)
    c.text("OUT", xe + 22, wy + 5, 13, "start", .2, c.A, tt=c.fb)
    # key
    kinfo = draw_key(c, 300, 292, 1.0, press=12)
    c.path(circle(wx0, wy, 9), c.A, c.I, 2.5)
    # tiles
    names = ["CATCH", "READ", "DECIDE", "ROUTE", "DONE"]
    for i in range(5):
        x = tx0 + i * pitch
        tile(c, i, x, wy - tw / 2, tw, last=(i == 4))
        c.text(names[i], x + tw / 2, wy + tw / 2 + 30, 15, "middle", .3, tt=c.fb)
        c.line(x + tw / 2, wy + tw / 2 + 40, x + tw / 2, wy + tw / 2 + 50, 1.2, c.I, .8)
    # press arrow + label
    c.text("PRESS ONCE", 300, 108, 15, "middle", .32, tt=c.fb)
    arrow_down(c, 300, 124, 176)
    # patent-style reference numerals
    callout(c, "10", 118, 182, 170, 290)
    callout(c, "20", 548, 512, 548, wy + 6, below=True)
    # bottom micro-zone
    c.text("FIG. 1 — ONE PRESS, WHOLE WORKFLOW", tx0, 588, 12, "start", .22)
    for i in range(0, 62):
        x = tx0 + i * 10
        if x > 1210: break
        c.line(x, 606, x, 606 + (14 if i % 10 == 0 else 8 if i % 5 == 0 else 5), 1.2, c.I, .9)
    for i, lab in enumerate(["0", "10", "20", "30", "40", "50", "60"]):
        c.text(lab, tx0 + i * 100, 640, 9, "middle", .1, op=.8, tt=c.fl)
    # spec table
    tx, ty, tw_, th = 1290, 560, 420, 87
    c.path(rect(tx, ty, tw_, th), None, c.I, 1.8)
    for r in (1, 2):
        c.line(tx, ty + r * th / 3, tx + tw_, ty + r * th / 3, 1.2)
    c.line(tx + 130, ty, tx + 130, ty + th, 1.2)
    for r, (a_, b_) in enumerate([("MODEL", "OC-001"), ("INPUT", "1 CLICK"), ("OUTPUT", "1 RESULT")]):
        yy = ty + (r + .5) * th / 3 + 5
        c.text(a_, tx + 12, yy, 11, "start", .22, op=.75, tt=c.fl)
        c.text(b_, tx + 144, yy, 12, "start", .22, tt=c.fb)
    # barcode (left)
    barcode(c, 84, 640, 130, 22)
    c.text("0 0 0 1", 84, 676 - 4, 9, "start", .4, op=.7, tt=c.fl)
    hazard(c, 66, 676, 1734, 704)
    return finish(c, W, H, f"One Click Works — decal logo ({name})")


# ------------------------------------------------------------------ SYMBOL: square stamp
def stamp(pal, name="stamp"):
    c = Ctx(pal)
    W = H = 900
    plate(c, 40, 40, 860, 860, 56)
    for i in range(0, 70):
        x = 100 + i * 11.5
        if x > 800: break
        c.line(x, 54, x, 54 + (9 if i % 5 == 0 else 4), 1, c.I, .65)
    c.text("PRESS ONCE", 450, 112, 16, "middle", .34, tt=c.fb)
    arrow_down(c, 450, 128, 186)
    draw_key(c, 450, 276, 0.95, press=12)
    callout(c, "10", 170, 236, 314, 288)
    c.line(110, 612, 790, 612, 1.4, c.I, .8)
    c.line(110, 618, 790, 618, .8, c.I, .6)
    c.path(text_d(c.rb, "ONE CLICK", 50 / cap_height(c.rb), 450, 684, .06, "middle"), c.I)
    c.path(text_d(c.rb, "WORKS", 50 / cap_height(c.rb), 450, 748, .06, "middle"), c.I)
    c.text("AI WORKFLOW AUTOMATION", 450, 792, 14, "middle", .34, tt=c.fl)
    hazard(c, 66, 822, 834, 842)
    return finish(c, W, H, f"One Click Works — stamp ({name})")


if __name__ == "__main__":
    for k, p in PAL.items():
        write(f"occ-primary-{k}.svg", primary(p, k))
        write(f"occ-stamp-{k}.svg", stamp(p, k))
    print("ok")
