"""Vintage 'plate' studies: engraved-style micro-graphics around each flat mark.
Preview artwork: outlined exploration type (system fonts; final fonts to be swapped for open-licence ones)."""
import math
from lib import *
from symbols import *

GROUND = "#0e1215"
INK = "#e9e5d9"
CYAN = "#8fd8e6"


def line(x1, y1, x2, y2, sw=1, col=INK, op=1):
    return f'<path d="M{f(x1)} {f(y1)}L{f(x2)} {f(y2)}" stroke="{col}" stroke-width="{sw}" stroke-opacity="{op}" fill="none"/>'


def pth(d, fill=INK, rule="nonzero", extra=""):
    return f'<path fill="{fill}" fill-rule="{rule}" d="{d}" {extra}/>'


def strokepath(d, sw=1, col=INK, op=1):
    return f'<path d="{d}" fill="none" stroke="{col}" stroke-width="{sw}" stroke-opacity="{op}"/>'


def ring(cx, cy, r, sw=1, col=INK, op=1):
    return f'<circle cx="{f(cx)}" cy="{f(cy)}" r="{f(r)}" fill="none" stroke="{col}" stroke-width="{sw}" stroke-opacity="{op}"/>'


# =========================================================== A  nameplate
def plate_a():
    W, H = 900, 560
    o = [f'<rect width="{W}" height="{H}" fill="{GROUND}"/>']
    plate = round_poly([(40, 40), (860, 40), (860, 520), (40, 520)], 30)
    o.append(strokepath(plate, 5))
    inset = round_poly([(58, 58), (842, 58), (842, 502), (58, 502)], 16)
    o.append(strokepath(inset, 1.5, INK, .7))
    # screws
    for i, (sx, sy) in enumerate([(88, 88), (812, 88), (88, 472), (812, 472)]):
        o.append(ring(sx, sy, 11, 2))
        a = math.radians(25 + i * 53)
        o.append(line(sx - 8 * math.cos(a), sy - 8 * math.sin(a), sx + 8 * math.cos(a), sy + 8 * math.sin(a), 2.4))
    # crossbar matrix lives behind the mark; the signal route lands on the bar tip
    sx, sy, sc = 92, 150, 1.0
    pitch = 32
    gx0, gx1, gy0, gy1 = 76, 396, 150, 406
    for x in range(gx0, gx1 + 1, pitch):
        o.append(line(x, gy0, x, gy1, 1, INK, .14))
    for y in range(gy0, gy1 + 1, pitch):
        o.append(line(gx0, y, gx1, y, 1, INK, .14))
    dots = ""
    for x in range(gx0, gx1 + 1, pitch):
        for y in range(gy0, gy1 + 1, pitch):
            dots += circle(x, y, 2.2)
    o.append(pth(dots, INK, extra='fill-opacity=".4"'))
    tipx, tipy = sx + 244, sy + 128
    route = f"M{tipx} {tipy}H{gx1}V{gy0 + 7 * pitch}"
    o.append(strokepath(route, 2.6, CYAN))
    o.append(pth(circle(gx1, gy0 + 7 * pitch, 6), CYAN))
    for (cx_, cy_, dx, dy) in [(60, 128, 1, 1), (412, 128, -1, 1), (60, 428, 1, -1), (412, 428, -1, -1)]:
        o.append(strokepath(f"M{cx_} {cy_ + 26 * dy}V{cy_}H{cx_ + 26 * dx}", 2.5))
    o.append(f'<g transform="translate({sx} {sy}) scale({sc})">{pth(sym_a())}</g>')
    # type
    tb = font("bahnschrift.ttf", {"wght": 700, "wdth": 82})
    tl = font("bahnschrift.ttf", {"wght": 300, "wdth": 82})
    capb, capl = cap_height(tb), cap_height(tl)
    x0 = 470
    o.append(pth(text_d(tb, "CROSSBAR", 56 / capb, x0, 252, .03)))
    o.append(pth(text_d(tl, "WORKS", 56 / capl, x0, 324, .03)))
    o.append(line(x0, 356, 802, 356, 2))
    for i in range(0, 60):
        x = x0 + i * 8
        if x > 802:
            break
        L = 14 if i % 5 == 0 else 7
        o.append(line(x, 356, x, 356 + L, 1.4))
    for i, lab in enumerate(["0", "10", "20", "30", "40"]):
        o.append(pth(text_d(tl, lab, 12 / capl, x0 + i * 40, 392, .02)))
    ts = font("bahnschrift.ttf", {"wght": 500, "wdth": 82})
    o.append(pth(text_d(ts, "AUTOMATION ENGINEERING", 12 / cap_height(ts), x0, 436, .22)))
    o.append(pth(text_d(ts, "PLATE 01  •  MMXXVI", 11 / cap_height(ts), 802, 106, .2, "end"), INK, extra='fill-opacity=".7"'))
    return svg(W, H, "".join(o), "Crossbar Works — nameplate study")


# =========================================================== B  roundel
def plate_b():
    W = H = 720
    cx = cy = 360
    o = [f'<rect width="{W}" height="{H}" fill="{GROUND}"/>']
    o.append(ring(cx, cy, 336, 7))
    o.append(ring(cx, cy, 321, 1.5, INK, .8))
    # tick ring
    for i in range(120):
        a = math.radians(i * 3)
        major = i % 10 == 0
        mid = i % 5 == 0
        r1 = 308
        r2 = 308 - (26 if major else 17 if mid else 10)
        o.append(line(cx + r1 * math.cos(a), cy - r1 * math.sin(a), cx + r2 * math.cos(a), cy - r2 * math.sin(a), 2 if major else 1.2))
    o.append(ring(cx, cy, 272, 2))
    o.append(ring(cx, cy, 214, 2))
    # type on the ring
    tb = font("ROCKEB.TTF"); tr = font("ROCK.TTF")
    capb, capr = cap_height(tb), cap_height(tr)
    o.append(pth(text_on_circle(tb, "SIGNALBOX WORKS", 31 / capb, cx, cy, 230, 90, .07)))
    o.append(pth(text_on_circle(tr, "AUTOMATION • INTERLOCKED • MMXXVI", 17 / capr, cx, cy, 250, 270, .1, inside=True)))
    # diamonds at 3 and 9 o'clock
    for sgn in (-1, 1):
        px = cx + sgn * 243
        d = f"M{px - 11} {cy}L{px} {cy - 11}L{px + 11} {cy}L{px} {cy + 11}Z"
        o.append(pth(d))
    # lamp-lens radial lines
    for i in range(72):
        a = math.radians(i * 5 + 2.5)
        o.append(line(cx + 150 * math.cos(a), cy - 150 * math.sin(a), cx + 190 * math.cos(a), cy - 190 * math.sin(a), 1, INK, .55))
    o.append(ring(cx, cy, 150, 1.5))
    o.append(ring(cx, cy, 190, 1, INK, .8))
    # lit lamp
    a = math.radians(48)
    o.append(pth(circle(cx + 170 * math.cos(a), cy - 170 * math.sin(a), 8), CYAN))
    # centre well + mark
    o.append(f'<circle cx="{cx}" cy="{cy}" r="146" fill="{GROUND}"/>')
    sc = .8
    o.append(f'<g transform="translate({cx - 128 * sc} {cy - 128 * sc}) scale({sc})">{pth(sym_b(r=44, w=30, cy1=84, gap_deg=6))}</g>')
    return svg(W, H, "".join(o), "Signalbox Works — roundel study")


# =========================================================== C  card
def plate_c():
    W, H = 980, 460
    o = [f'<rect width="{W}" height="{H}" fill="{GROUND}"/>']
    x0, y0, x1, y1, ch = 40, 40, 940, 420, 64
    card = round_poly([(x0 + ch, y0), (x1, y0), (x1, y1), (x0, y1), (x0, y0 + ch)], [14, 14, 14, 14, 14])
    o.append(strokepath(card, 4.5))
    ins = 12
    card2 = round_poly([(x0 + ch + ins * .4, y0 + ins), (x1 - ins, y0 + ins), (x1 - ins, y1 - ins), (x0 + ins, y1 - ins), (x0 + ins, y0 + ch + ins * .4)], 8)
    o.append(strokepath(card2, 1.2, INK, .6))
    # micro hole row along the top (80-column feel, 40 shown)
    holes = ""
    for i in range(46):
        hx = 150 + i * 17
        holes += rect(hx, 62, 8, 14)
    o.append(pth(holes, INK, extra='fill-opacity=".85"'))
    o.append(pth(rect(150 + 7 * 17, 62, 8, 14) + rect(150 + 19 * 17, 62, 8, 14) + rect(150 + 20 * 17, 62, 8, 14), CYAN))
    # symbol
    sc = .86
    o.append(f'<g transform="translate({96} {104}) scale({sc})">{pth(sym_c(), INK, "evenodd")}</g>')
    # type (Engravers)
    te = font("ENGR.TTF"); cap = cap_height(te)
    xt = 372
    o.append(pth(text_d(te, "HOLLERITH", 46 / cap, xt, 226, .03)))
    o.append(pth(text_d(te, "WORKS", 27 / cap, xt, 280, .62)))
    o.append(line(xt, 316, 905, 316, 1.6))
    o.append(line(xt, 322, 905, 322, .8, INK, .7))
    # guilloché band
    for k in range(6):
        ph = k * math.pi / 3
        pts = []
        for xx in range(xt, 906, 4):
            yy = 352 + 11 * math.sin((xx - xt) / 26 * 2 * math.pi / 2 + ph)
            pts.append(f"{'M' if not pts else 'L'}{xx} {f(yy)}")
        o.append(strokepath("".join(pts), 1, INK, .75))
    # numeral strip along bottom (punched-card print)
    ts = te
    digits = "0123456789" * 8
    o.append(pth(text_d(ts, " ".join(digits[:24]), 9 / cap, xt, 398, .22), INK, extra='fill-opacity=".55"'))
    return svg(W, H, "".join(o), "Hollerith Works — card study")


if __name__ == "__main__":
    write("a-plate.svg", plate_a())
    write("b-plate.svg", plate_b())
    write("c-plate.svg", plate_c())
    print("plates ok")
