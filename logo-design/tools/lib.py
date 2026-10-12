"""Shared helpers: geometry, type outlining (exploration fonts), svg writing."""
import math, os
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.boundsPen import BoundsPen

OUT = r"C:\Users\uradk\OneDrive\Pictures\demo site\logo-design\svg"
FONTS = r"C:\Windows\Fonts"


def f(x):
    s = f"{x:.2f}".rstrip("0").rstrip(".")
    return "0" if s in ("-0", "") else s


# ---------------------------------------------------------------- geometry
def P(cx, cy, r, a):
    """Point on circle; angle in degrees, counter-clockwise on screen."""
    t = math.radians(a)
    return (cx + r * math.cos(t), cy - r * math.sin(t))


def sector(cx, cy, ri, ro, a0, a1):
    """Annular sector between angles a0<a1 (CCW on screen)."""
    large = 1 if (a1 - a0) > 180 else 0
    p0, p1 = P(cx, cy, ro, a0), P(cx, cy, ro, a1)
    q1, q0 = P(cx, cy, ri, a1), P(cx, cy, ri, a0)
    return (f"M{f(p0[0])} {f(p0[1])}A{f(ro)} {f(ro)} 0 {large} 0 {f(p1[0])} {f(p1[1])}"
            f"L{f(q1[0])} {f(q1[1])}A{f(ri)} {f(ri)} 0 {large} 1 {f(q0[0])} {f(q0[1])}Z")


def circle(cx, cy, r):
    return f"M{f(cx - r)} {f(cy)}a{f(r)} {f(r)} 0 1 1 {f(2 * r)} 0a{f(r)} {f(r)} 0 1 1 {f(-2 * r)} 0Z"


def rect(x, y, w, h):
    return f"M{f(x)} {f(y)}h{f(w)}v{f(h)}h{f(-w)}Z"


def round_poly(pts, r):
    """Closed polygon with filleted corners. r may be a number or list per vertex."""
    n = len(pts)
    rs = r if isinstance(r, (list, tuple)) else [r] * n
    d = ""
    for i in range(n):
        A, B, C = pts[i - 1], pts[i], pts[(i + 1) % n]
        rr = rs[i]
        if rr <= 0:
            d += ("M" if i == 0 else "L") + f"{f(B[0])} {f(B[1])}"
            continue
        u = (A[0] - B[0], A[1] - B[1]); lu = math.hypot(*u); u = (u[0] / lu, u[1] / lu)
        v = (C[0] - B[0], C[1] - B[1]); lv = math.hypot(*v); v = (v[0] / lv, v[1] / lv)
        cosang = max(-1, min(1, u[0] * v[0] + u[1] * v[1]))
        th = math.acos(cosang)
        t = rr / math.tan(th / 2)
        T1 = (B[0] + u[0] * t, B[1] + u[1] * t)
        T2 = (B[0] + v[0] * t, B[1] + v[1] * t)
        z = (B[0] - A[0]) * (C[1] - B[1]) - (B[1] - A[1]) * (C[0] - B[0])
        sw = 1 if z > 0 else 0
        d += ("M" if i == 0 else "L") + f"{f(T1[0])} {f(T1[1])}"
        d += f"A{f(rr)} {f(rr)} 0 0 {sw} {f(T2[0])} {f(T2[1])}"
    return d + "Z"


# ---------------------------------------------------------------- type
_cache = {}


def font(name, axes=None):
    key = (name, tuple(sorted((axes or {}).items())))
    if key not in _cache:
        tt = TTFont(os.path.join(FONTS, name))
        if axes:
            from fontTools.varLib import instancer
            tt = instancer.instantiateVariableFont(tt, axes)
        _cache[key] = tt
    return _cache[key]


def glyph_info(tt, ch):
    gname = tt.getBestCmap().get(ord(ch))
    gs = tt.getGlyphSet()
    return gname, gs, tt["hmtx"][gname][0]


def cap_height(tt):
    gs = tt.getGlyphSet()
    bp = BoundsPen(gs)
    gs[tt.getBestCmap()[ord("H")]].draw(bp)
    return bp.bounds[3] / tt["head"].unitsPerEm


def text_width(tt, text, size, tracking=0.0):
    upm = tt["head"].unitsPerEm
    w = 0.0
    for i, ch in enumerate(text):
        _, _, adv = glyph_info(tt, ch)
        w += adv * size / upm
        if i < len(text) - 1:
            w += tracking * size
    return w


def text_d(tt, text, size, x, y, tracking=0.0, anchor="start"):
    """Outlined text as one path 'd' string. tracking in em. anchor start|middle|end."""
    upm = tt["head"].unitsPerEm
    s = size / upm
    width = text_width(tt, text, size, tracking)
    if anchor == "middle":
        x -= width / 2
    elif anchor == "end":
        x -= width
    d = ""
    cx = x
    for ch in text:
        gname, gs, adv = glyph_info(tt, ch)
        pen = SVGPathPen(gs, ntos=lambda v: f(v))
        gs[gname].draw(TransformPen(pen, (s, 0, 0, -s, cx, y)))
        d += pen.getCommands()
        cx += adv * s + tracking * size
    return d


def text_on_circle(tt, text, size, cx, cy, r, center_angle, tracking=0.0, inside=False):
    """Outlined text along a circle. Reads left→right across the top (inside=False)
    or left→right along the bottom (inside=True, glyph tops pointing to the centre)."""
    upm = tt["head"].unitsPerEm
    s = size / upm
    total = text_width(tt, text, size, tracking)
    d = ""
    pos = 0.0
    for ch in text:
        gname, gs, adv = glyph_info(tt, ch)
        w = adv * s
        mid = pos + w / 2
        off = mid - total / 2                       # arc length from centre
        ang = off / r                               # radians
        if not inside:
            a = math.radians(center_angle) - ang    # screen CCW angle (top reads clockwise)
            px, py = cx + r * math.cos(a), cy - r * math.sin(a)
            rot = math.degrees(math.pi / 2 - a)     # rotate so glyph "up" points outward
        else:
            a = math.radians(center_angle) + ang
            px, py = cx + r * math.cos(a), cy - r * math.sin(a)
            rot = math.degrees(-(a + math.pi / 2))
        ra = math.radians(rot)
        ca, sa = math.cos(ra), math.sin(ra)
        pen = SVGPathPen(gs, ntos=lambda v: f(v))
        gs[gname].draw(TransformPen(pen, (ca * s, sa * s, sa * s, -ca * s, px - ca * w / 2, py - sa * w / 2)))
        d += pen.getCommands()
        pos += w + tracking * size
    return d


def bake(cmds, ca, sa, tx, ty):
    """Apply rotation (ca,sa) + translation to an absolute SVG path string (M/L/Q/C/Z)."""
    import re
    out = []
    toks = re.findall(r"[MLQCZ]|-?\d*\.?\d+(?:e-?\d+)?", cmds)
    i = 0
    cur = None
    while i < len(toks):
        t = toks[i]
        if t == "Z":
            out.append("Z"); i += 1; continue
        cur = t; i += 1
        n = {"M": 1, "L": 1, "Q": 2, "C": 3}[cur]
        seg = [cur]
        for _ in range(n):
            x, y = float(toks[i]), float(toks[i + 1]); i += 2
            X = x * ca - y * sa + tx
            Y = x * sa + y * ca + ty
            seg.append(f"{f(X)} {f(Y)}")
        out.append(seg[0] + " ".join(seg[1:]))
    return "".join(out)


# ---------------------------------------------------------------- svg
def svg(w, h, body, title, bg=None, extra=""):
    b = f'<rect width="{w}" height="{h}" fill="{bg}"/>' if bg else ""
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {f(w)} {f(h)}" width="{f(w)}" height="{f(h)}" '
            f'role="img" aria-label="{title}"><title>{title}</title>{extra}{b}{body}</svg>\n')


def write(name, content):
    path = os.path.join(OUT, name)
    with open(path, "w", encoding="utf-8") as fh:
        fh.write(content)
    return path
