"""Three flat symbols (256 box) + small-size cuts. Returns path 'd' strings."""
from lib import *


# ------------------------------------------------------------ A  Crossbar Works
def sym_a(arm=38, bar=20, node=23, spine_x=40, arm_end=190, top=44, bot=212, bar_end=244, node_cx=128, r=18):
    """Aperture-C: a signal bar crosses the open side of the gate and lands on a contact node."""
    cy = (top + bot) / 2
    c = (f"M{f(spine_x)} {f(top + r)}A{r} {r} 0 0 1 {f(spine_x + r)} {f(top)}H{f(arm_end)}V{f(top + arm)}"
         f"H{f(spine_x + arm)}V{f(bot - arm)}H{f(arm_end)}V{f(bot)}H{f(spine_x + r)}A{r} {r} 0 0 1 {f(spine_x)} {f(bot - r)}Z")
    barp = rect(node_cx, cy - bar / 2, bar_end - node_cx, bar) + circle(node_cx, cy, node)
    return c + barp


# ------------------------------------------------------------ B  Signalbox Works
def sym_b(cx=128, r=40, w=40, cy1=88, gap_deg=7.2, per=4, term=20):
    """Build via 180° rotation of the top half so the S is exactly point-symmetric."""
    ri, ro = r - w / 2, r + w / 2
    cy2 = cy1 + 2 * r
    mid = (cx, (cy1 + cy2) / 2)

    def run(cyy, a_start, a_end):
        n = per
        total = a_end - a_start
        seg = (total - (n - 1) * gap_deg) / n
        out = []
        a = a_start
        for _ in range(n):
            out.append((a, a + seg))
            a += seg + gap_deg
        return out
    segs_top = run(cy1, term, 270 - gap_deg / 2)
    d = ""
    for a0, a1 in segs_top:
        d += sector(cx, cy1, ri, ro, a0, a1)
        # 180° rotation about the S centre: circle centre cy1→cy2, angles +180
        d += sector(cx, cy2, ri, ro, a0 + 180, a1 + 180)
    return d


# ------------------------------------------------------------ C  Hollerith Works
def sym_c(cols=(56, 92, 128, 164, 200), rows=(72, 100, 128, 156, 184), hw=26, hh=18, chamfer=36,
          x0=24, x1=232, y0=36, y1=220, rc=9):
    card = round_poly([(x0 + chamfer, y0), (x1, y0), (x1, y1), (x0, y1), (x0, y0 + chamfer)], [rc * 1.2, rc, rc, rc, rc * 1.2])
    holes = ""
    for ci, cxx in enumerate(cols):
        for ri_, cyy in enumerate(rows):
            on = (ci in (0, 4)) or (ri_ == 2)
            if on:
                holes += rect(cxx - hw / 2, cyy - hh / 2, hw, hh)
    return card + holes


def sym_c_small():
    card = round_poly([(24 + 52, 30), (232, 30), (232, 226), (24, 226), (24, 30 + 52)], [12, 8, 8, 8, 12])
    pts=[(64,74),(102,74),(102,112),(154,112),(154,74),(192,74),(192,182),(154,182),(154,144),(102,144),(102,182),(64,182)]
    h = 'M'+'L'.join(f'{x} {y}' for x,y in pts)+'Z'
    return card + h
