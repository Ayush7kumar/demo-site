"""Detailed retro / micrographic emblem for the portfolio. Outlined exploration type (system fonts)."""
import math, sys
from lib import *
from symbols import sym_a as _sym_a_old

def sym_a(arm=38, bar=20, node=23, spine_x=40, arm_end=190, top=44, bot=212, bar_end=244, node_cx=128, r=18):
    cy = (top + bot) / 2
    c = (f"M{f(spine_x)} {f(top + r)}A{r} {r} 0 0 1 {f(spine_x + r)} {f(top)}H{f(arm_end)}V{f(top + arm)}"
         f"H{f(spine_x + arm)}V{f(bot - arm)}H{f(arm_end)}V{f(bot)}H{f(spine_x + r)}A{r} {r} 0 0 1 {f(spine_x)} {f(bot - r)}Z")
    dx = math.sqrt(node ** 2 - (bar / 2) ** 2)
    bn = (f"M{f(bar_end)} {f(cy - bar / 2)}H{f(node_cx + dx)}A{node} {node} 0 1 0 {f(node_cx + dx)} {f(cy + bar / 2)}H{f(bar_end)}Z")
    return c + bn

NAME = "CROSSBAR WORKS"
SUB = "AUTOMATION ENGINEERING"
MICRO = "ENGINEERED SYSTEMS • CONNECTED WORKFLOWS • SIGNAL IN • RESULT OUT • "
RIBBON = "EST. MMXXVI"

CX = CY = 600
W = H = 1200


def build(pal, name="emblem"):
    G, INK, ACC = pal["ground"], pal["ink"], pal["accent"]
    o = []
    defs = []

    def stroke(d, sw=1, col=INK, op=1, extra=""):
        return f'<path d="{d}" fill="none" stroke="{col}" stroke-width="{sw}" stroke-opacity="{op}" {extra}/>'

    def ln(x1, y1, x2, y2, sw=1, col=INK, op=1):
        return stroke(f"M{f(x1)} {f(y1)}L{f(x2)} {f(y2)}", sw, col, op)

    def fillp(d, col=INK, rule="nonzero", op=1):
        return f'<path fill="{col}" fill-rule="{rule}" fill-opacity="{op}" d="{d}"/>'

    def ring(r, sw=1, col=INK, op=1, cx=CX, cy=CY):
        return f'<circle cx="{cx}" cy="{cy}" r="{f(r)}" fill="none" stroke="{col}" stroke-width="{sw}" stroke-opacity="{op}"/>'

    o.append(f'<rect width="{W}" height="{H}" fill="{G}"/>')

    # ------------------------------------------------------------ technical frame (micro-graphics)
    o.append(f'<rect x="26" y="26" width="{W - 52}" height="{H - 52}" fill="none" stroke="{INK}" stroke-width="1.2" stroke-opacity=".7"/>')
    o.append(f'<rect x="38" y="38" width="{W - 76}" height="{H - 76}" fill="none" stroke="{INK}" stroke-width=".6" stroke-opacity=".5"/>')
    # edge tick scales
    for i in range(0, 120):
        p = 38 + i * (W - 76) / 119
        L = 10 if i % 10 == 0 else 5 if i % 5 == 0 else 3
        o.append(ln(p, 38, p, 38 + L, .8, INK, .6))
        o.append(ln(p, H - 38, p, H - 38 - L, .8, INK, .6))
        o.append(ln(38, p, 38 + L, p, .8, INK, .6))
        o.append(ln(W - 38, p, W - 38 - L, p, .8, INK, .6))
    # registration marks at side midpoints
    for (rx, ry) in [(CX, 62), (CX, H - 62), (62, CY), (W - 62, CY)]:
        o.append(ring(9, 1.3, INK, .9, rx, ry))
        o.append(ln(rx - 15, ry, rx + 15, ry, 1.3, INK, .9))
        o.append(ln(rx, ry - 15, rx, ry + 15, 1.3, INK, .9))
    # corner brackets
    for (x, y, dx, dy) in [(60, 60, 1, 1), (W - 60, 60, -1, 1), (60, H - 60, 1, -1), (W - 60, H - 60, -1, -1)]:
        o.append(stroke(f"M{x} {y + 40 * dy}V{y}H{x + 40 * dx}", 2.4, INK))
    # labels
    tm = font("bahnschrift.ttf", {"wght": 500, "wdth": 85})
    tl = font("bahnschrift.ttf", {"wght": 300, "wdth": 85})
    cm, cl = cap_height(tm), cap_height(tl)

    def label(txt, x, y, cap=11, anchor="start", trk=.18, op=.85, tt=tm, ct=cm):
        return fillp(text_d(tt, txt, cap / ct, x, y, trk, anchor), INK, op=op)
    o.append(label("FIG. 01 — EMBLEM", 84, 100, 13))
    o.append(label("CROSSBAR WORKS / PORTFOLIO", 84, 120, 10, op=.6, tt=tl, ct=cl))
    o.append(label("REV. A", W - 84, 100, 13, "end"))
    o.append(label("MMXXVI", W - 84, 120, 10, "end", op=.6, tt=tl, ct=cl))
    o.append(label("DRG. NO. XB-001", 84, 148, 10, op=.6, tt=tl, ct=cl))
    o.append(label("SCALE 1 : 1", 84, 168, 10, op=.6, tt=tl, ct=cl))
    # barcode
    seed = 7
    bx = W - 84 - 120
    bars = ""
    x = bx
    while x < W - 84:
        seed = (seed * 1103515245 + 12345) & 0x7fffffff
        w = 1.5 + (seed >> 8) % 4
        if (seed >> 4) % 3:
            bars += rect(x, H - 86, w, 24)
        x += w + 1.8
    o.append(fillp(bars, INK, op=.85))
    # dimension line (bottom)
    dy = 1106
    r0 = 120
    o.append(ln(r0, dy, CX - 40, dy, 1, INK, .8))
    o.append(ln(CX + 40, dy, W - r0, dy, 1, INK, .8))
    for (x, s) in [(r0, 1), (W - r0, -1)]:
        o.append(fillp(f"M{x} {dy}L{x + 12 * s} {dy - 4}V{dy + 4}Z", INK, op=.9))
        o.append(ln(x, dy - 9, x, dy + 9, 1, INK, .8))
    o.append(label("Ø 960", CX, dy + 4, 11, "middle"))
    # ------------------------------------------------------------ clip for the field
    FR = 334
    defs.append(f'<clipPath id="field"><circle cx="{CX}" cy="{CY}" r="{FR}"/></clipPath>')

    # ------------------------------------------------------------ gear-toothed seal band
    teeth = 48
    pitch = 360 / teeth
    pts = []
    for i in range(teeth):
        a = i * pitch
        for (ang, rr) in [(a - 2.3, 462), (a - 1.5, 480), (a + 1.5, 480), (a + 2.3, 462)]:
            p = P(CX, CY, rr, ang)
            pts.append(p)
    gear = "M" + "L".join(f"{f(x)} {f(y)}" for x, y in pts) + "Z"
    band = gear + circle(CX, CY, 400)
    # knock-outs in the band: rivets and stars
    for a in (14, -14, 166, 194):
        px, py = P(CX, CY, 431, a)
        band += circle(px, py, 5.5)
    def star(cx_, cy_, ro, ri, rot=-90):
        d = ""
        for k in range(10):
            r = ro if k % 2 == 0 else ri
            a = math.radians(rot + k * 36)
            d += ("M" if k == 0 else "L") + f"{f(cx_ + r * math.cos(a))} {f(cy_ + r * math.sin(a))}"
        return d + "Z"
    for a in (0, 180):
        sx_, sy_ = P(CX, CY, 431, a)
        band += star(sx_, sy_, 17, 7.5)
    # lettering (holes via evenodd)
    rb = font("ROCKEB.TTF"); rr_ = font("ROCKB.TTF")
    band += text_on_circle(rb, NAME, 38 / cap_height(rb), CX, CY, 417, 90, .13)
    band += text_on_circle(rr_, SUB, 22 / cap_height(rr_), CX, CY, 447, 270, .12, inside=True)
    o.append(fillp(band, INK, "evenodd"))

    # inner rings
    o.append(ring(392, 2.4))
    o.append(ring(385, .8))
    o.append(ring(377, .8, INK, .8))
    o.append(ring(355, .8, INK, .8))
    # micro text ring
    tmicro = font("bahnschrift.ttf", {"wght": 500, "wdth": 75})
    size = 11 / cap_height(tmicro)
    circ = 2 * math.pi * 361
    base = text_width(tmicro, MICRO, size, 0)
    reps = max(1, int(circ // (base * 1.0)))
    txt = MICRO * reps
    base = text_width(tmicro, txt, size, 0)
    trk = (circ - base) / len(txt) / size
    o.append(fillp(text_on_circle(tmicro, txt, size, CX, CY, 361, 90, trk), INK, op=.9))
    # tick ring
    for i in range(240):
        a = i * 1.5
        r1 = 340
        r2 = r1 + (15 if i % 10 == 0 else 10 if i % 5 == 0 else 6)
        p1, p2 = P(CX, CY, r1, a), P(CX, CY, r2, a)
        o.append(ln(p1[0], p1[1], p2[0], p2[1], 1.6 if i % 10 == 0 else 1, INK, .95))
    o.append(ring(337, 2.6))

    # ------------------------------------------------------------ field
    fld = []
    fld.append(f'<circle cx="{CX}" cy="{CY}" r="{FR}" fill="{G}"/>')
    # fine horizontal engraving lines
    hl = ""
    for y in range(CY - FR, CY + FR, 5):
        hl += f"M{CX - FR} {y}H{CX + FR}"
    fld.append(stroke(hl, .7, INK, .1))
    # crossbar matrix
    pitch = 48
    gl = ""
    for k in range(-8, 9):
        gl += f"M{CX + k * pitch} {CY - FR}V{CY + FR}M{CX - FR} {CY + k * pitch}H{CX + FR}"
    fld.append(stroke(gl, 1.1, INK, .3))
    sq = ""
    for kx in range(-8, 9):
        for ky in range(-8, 9):
            sq += rect(CX + kx * pitch - 3, CY + ky * pitch - 3, 6, 6)
    fld.append(fillp(sq, INK, op=.5))
    # routed bus on the left (decorative traces with pads)
    S = 1.6
    mtx = 600 - 142 * S
    mty = 590 - 128 * S
    bus = ""
    pads = ""
    for i, y in enumerate([548, 566, 584, 602, 620, 638]):
        jog = (i - 2.5) * 5
        x0 = CX - FR + 14 + abs(i - 2.5) * 10
        bus += f"M{f(x0)} {y}H{f(x0 + 40)}L{f(x0 + 58)} {f(y + jog)}H{f(mtx + 40 * S - 62)}"
        pads += circle(mtx + 40 * S - 62, y + jog, 3.6)
    fld.append(stroke(bus, 1.5, INK, .9))
    fld.append(fillp(pads, INK))
    # chips
    def chip(x, y, w_, h_, label_):
        d = rect(x, y, w_, h_)
        out = stroke(d, 1.6, INK)
        pins = ""
        n = 5
        for i in range(n):
            px = x + (i + .5) * w_ / n
            pins += f"M{f(px)} {y}v-9M{f(px)} {y + h_}v9"
        out += stroke(pins, 1.4, INK)
        out += fillp(circle(x + 9, y + 9, 2.4), INK)
        tl_ = font("bahnschrift.ttf", {"wght": 500, "wdth": 75})
        out += fillp(text_d(tl_, label_, 9 / cap_height(tl_), x + w_ / 2, y + h_ / 2 + 4, .15, "middle"), INK, op=.9)
        return out
    fld.append(chip(790, 372, 84, 46, "XB-1"))
    fld.append(chip(338, 690, 84, 46, "XB-2"))
    # accent route from the bar tip
    tipx, tipy = mtx + 244 * S, mty + 128 * S
    route = f"M{f(tipx)} {f(tipy)}H{f(tipx + 36)}L{f(tipx + 60)} {f(tipy + 24)}V{f(tipy + 90)}L{f(tipx + 84)} {f(tipy + 114)}H{f(tipx + 118)}"
    fld.append(stroke(route, 3, ACC))
    fld.append(f'<circle cx="{f(tipx + 126)}" cy="{f(tipy + 114)}" r="8" fill="{G}" stroke="{ACC}" stroke-width="3"/>')
    fld.append(f'<circle cx="{f(tipx + 60)}" cy="{f(tipy + 57)}" r="3.5" fill="{ACC}"/>')
    # the mark: engraved double line + hatch
    mark = sym_a()
    hatch = ""
    for k in range(-260, 262, 6):
        hatch += f"M{k} 0L{k + 256} 256"
    mk = (
        f'<g transform="translate({f(mtx)} {f(mty)}) scale({S})">'
        f'<path d="{mark}" fill="{INK}"/>'
        f'<g clip-path="url(#mk)">'
        f'<path d="{mark}" fill="none" stroke="{G}" stroke-width="12"/>'
        f'<path d="{mark}" fill="none" stroke="{INK}" stroke-width="4.5"/>'
        f'<path d="{hatch}" stroke="{G}" stroke-width="1.5" stroke-opacity=".55" fill="none"/>'
        f'</g>'
        f'<path d="{mark}" fill="none" stroke="{G}" stroke-width="5" paint-order="stroke" transform="translate(5 6)" opacity="0"/>'
        f'</g>'
    )
    defs.append(f'<clipPath id="mk"><path d="{mark}"/></clipPath>')
    fld.append(mk)
    # contact node highlight
    nx, ny = mtx + 128 * S, mty + 128 * S
    fld.append(f'<circle cx="{f(nx)}" cy="{f(ny)}" r="9" fill="{ACC}"/>')
    # ribbon
    ry0, ry1 = CY + 170, CY + 222
    tail_r = f"M{CX + 150} {ry0 + 10}H{CX + 238}L{CX + 214} {ry0 + 36}L{CX + 238} {ry1 + 10}H{CX + 150}Z"
    tail_l = f"M{CX - 150} {ry0 + 10}H{CX - 238}L{CX - 214} {ry0 + 36}L{CX - 238} {ry1 + 10}H{CX - 150}Z"
    fld.append(fillp(tail_r + tail_l, INK, "nonzero", .55))
    fld.append(stroke(tail_r + tail_l, 1.4, INK))
    fold = f"M{CX + 170} {ry1}L{CX + 150} {ry1 + 10}M{CX - 170} {ry1}L{CX - 150} {ry1 + 10}"
    fld.append(stroke(fold, 1.4, INK))
    rbn = rect(CX - 170, ry0, 340, ry1 - ry0)
    rf = font("ROCKB.TTF")
    rbn += text_d(rf, RIBBON, 24 / cap_height(rf), CX, ry0 + (ry1 - ry0) / 2 + 12, .16, "middle")
    fld.append(fillp(rbn, INK, "evenodd"))
    fld.append(stroke(rect(CX - 164, ry0 + 5, 328, ry1 - ry0 - 10), .8, G, .9))
    o.append(f'<g clip-path="url(#field)">{"".join(fld)}</g>')
    # ribbon tails overhang is clipped by the field; draw field edge ring again
    o.append(ring(FR, 1.2, INK, .9))

    body = f"<defs>{''.join(defs)}</defs>" + "".join(o)
    return svg(W, H, body, f"Crossbar Works emblem ({name})")


PAL_DARK = dict(ground="#0e1215", ink="#e9e5d9", accent="#8fd8e6")
PAL_PAPER = dict(ground="#efe6d0", ink="#16181a", accent="#b4412c")

if __name__ == "__main__":
    write("emblem-dark.svg", build(PAL_DARK, "dark"))
    write("emblem-paper.svg", build(PAL_PAPER, "paper"))
    print("ok")
