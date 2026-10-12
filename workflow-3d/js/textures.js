/* Workflow 3D — everything drawn on a 2D canvas: icons, labels, tile shapes, the wall surface, shadows, glows.
   Engine source: after editing run the build (see tools/3d-build). */
import * as THREE from 'three';

const CONFIG = window.W3D.CONFIG;                                // from js/config.js (loaded first)
const COL = CONFIG.colors;
const FONT = '"Inter", "Segoe UI", system-ui, -apple-system, sans-serif';
const R = 2;                                                     // drawing scale: 2 = sharp on 4K screens
const cv = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; };
const hi = (w, h) => { const [c, x] = cv(w * R, h * R); x.scale(R, R); return [c, x]; };
const tx = c => { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 16; return t; };
const cache = new Map();
const memo = (key, make) => { if (!cache.has(key)) cache.set(key, make()); return cache.get(key); };

/* ---------------------------------------------------------------- icons
   Original glyphs for common automation steps, drawn in a 256 x 256 cell (centre 128,128).
   To use a real logo instead, set a node's icon to an image path, e.g. 'icons/my-tool.svg'. */
const line = (x, ...p) => { x.beginPath(); x.moveTo(p[0], p[1]); for (let i = 2; i < p.length; i += 2) x.lineTo(p[i], p[i + 1]); x.stroke(); };
const poly = (x, fill, ...p) => { x.beginPath(); x.moveTo(p[0], p[1]); for (let i = 2; i < p.length; i += 2) x.lineTo(p[i], p[i + 1]); x.closePath(); fill ? x.fill() : x.stroke(); };
const disc = (x, cx, cy, r) => { x.beginPath(); x.arc(cx, cy, r, 0, 7); x.fill(); };
const circ = (x, cx, cy, r) => { x.beginPath(); x.arc(cx, cy, r, 0, 7); x.stroke(); };
const rect = (x, a, b, w, h, r, fill) => { x.beginPath(); x.roundRect(a, b, w, h, r); fill ? x.fill() : x.stroke(); };

const G = {
  webhook(x)  { circ(x, 128, 80, 17); circ(x, 80, 170, 17); circ(x, 176, 170, 17); line(x, 120, 96, 90, 154); line(x, 136, 96, 166, 154); line(x, 98, 170, 158, 170); },
  cart(x)     { line(x, 66, 84, 88, 84, 106, 150, 164, 150, 180, 104, 96, 104); disc(x, 114, 176, 10); disc(x, 158, 176, 10); },
  branch(x)   { line(x, 70, 128, 106, 128, 138, 90, 170, 90); line(x, 106, 128, 138, 166, 170, 166); disc(x, 180, 90, 11); disc(x, 180, 166, 11); },
  code(x)     { x.font = '700 112px Consolas, "Courier New", monospace'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('{}', 128, 136); },
  globe(x)    { circ(x, 128, 128, 58); x.beginPath(); x.ellipse(128, 128, 24, 58, 0, 0, 7); x.stroke(); line(x, 70, 128, 186, 128); },
  db(x)       { x.beginPath(); x.ellipse(128, 88, 48, 17, 0, 0, 7); x.stroke(); line(x, 80, 88, 80, 168); line(x, 176, 88, 176, 168);
                [128, 168].forEach(y => { x.beginPath(); x.ellipse(128, y, 48, 17, 0, 0, Math.PI); x.stroke(); }); },
  chat(x)     { rect(x, 66, 72, 124, 92, 24); poly(x, true, 96, 160, 90, 194, 128, 160); [102, 128, 154].forEach(a => disc(x, a, 118, 8)); },
  image(x)    { rect(x, 70, 74, 116, 108, 16); line(x, 84, 166, 114, 128, 134, 150, 150, 134, 172, 166); disc(x, 152, 104, 9); },
  sheet(x, bg){ rect(x, 78, 64, 100, 128, 16, true); x.save(); x.strokeStyle = bg; x.shadowBlur = 0; x.lineWidth = 9;
                line(x, 78, 108, 178, 108); line(x, 78, 148, 178, 148); line(x, 118, 108, 118, 192); x.restore(); },
  hourglass(x){ poly(x, false, 90, 72, 166, 72, 128, 128, 166, 184, 90, 184, 128, 128); },
  spark(x)    { const st = (cx, cy, s) => { x.beginPath(); x.moveTo(cx, cy - s); x.quadraticCurveTo(cx, cy, cx + s, cy); x.quadraticCurveTo(cx, cy, cx, cy + s);
                  x.quadraticCurveTo(cx, cy, cx - s, cy); x.quadraticCurveTo(cx, cy, cx, cy - s); x.fill(); }; st(116, 138, 58); st(178, 82, 26); },
  mail(x)     { rect(x, 64, 82, 128, 94, 16); line(x, 70, 92, 128, 138, 186, 92); },
  calendar(x) { rect(x, 70, 78, 116, 108, 16); line(x, 70, 112, 186, 112); line(x, 100, 62, 100, 88); line(x, 156, 62, 156, 88); disc(x, 128, 150, 10); },
  filter(x)   { poly(x, false, 66, 78, 190, 78, 146, 132, 146, 186, 110, 168, 110, 132); },
  merge(x)    { line(x, 66, 88, 100, 88, 138, 128, 190, 128); line(x, 66, 168, 100, 168, 138, 128); disc(x, 190, 128, 11); },
  clock(x)    { circ(x, 128, 128, 58); line(x, 128, 90, 128, 128, 156, 144); },
  cloud(x)    { x.beginPath(); x.arc(96, 146, 30, Math.PI * .5, Math.PI * 1.5); x.arc(128, 112, 38, Math.PI * 1.1, Math.PI * 1.9);
                x.arc(164, 144, 32, Math.PI * 1.5, Math.PI * .5); x.closePath(); x.stroke(); },
  bot(x)      { rect(x, 74, 90, 108, 86, 22); disc(x, 108, 132, 10); disc(x, 148, 132, 10); line(x, 128, 90, 128, 68); disc(x, 128, 62, 9);
                line(x, 58, 122, 58, 146); line(x, 198, 122, 198, 146); },
  user(x)     { circ(x, 128, 100, 28); x.beginPath(); x.arc(128, 204, 62, Math.PI * 1.17, Math.PI * 1.83); x.stroke(); },
  chip(x)     { rect(x, 86, 86, 84, 84, 12); [106, 128, 150].forEach(a => { line(x, a, 86, a, 66); line(x, a, 170, a, 190); line(x, 86, a, 66, a); line(x, 170, a, 190, a); }); },
  bolt(x)     { poly(x, true, 142, 56, 82, 140, 122, 140, 112, 200, 174, 114, 134, 114); },
  doc(x)      { rect(x, 82, 62, 92, 132, 14); line(x, 104, 102, 152, 102); line(x, 104, 130, 152, 130); line(x, 104, 158, 136, 158); },
  send(x)     { poly(x, false, 62, 124, 194, 66, 150, 194, 122, 146); line(x, 122, 146, 194, 66); }
};

/* ---------------------------------------------------------------- tile outline (shared by the canvas and the 3D shape) */
function tracePath(x, kind, W, H, inset) {
  const r = H * .2; x.beginPath();
  if (kind === 'circle') x.arc(W / 2, H / 2, H / 2 - inset, 0, 7);
  else x.roundRect(inset, inset, W - 2 * inset, H - 2 * inset, kind === 'trigger' ? [H * .5 - inset, r, r, H * .5 - inset] : r);
}
export function tileShape(kind, w, h) {
  const s = new THREE.Shape(), hw = w / 2, hh = h / 2;
  if (kind === 'circle') { s.absarc(0, 0, hh, 0, Math.PI * 2); return s; }
  const rr = h * .2, rl = kind === 'trigger' ? hh : rr;
  s.moveTo(-hw + rl, -hh); s.lineTo(hw - rr, -hh); s.absarc(hw - rr, -hh + rr, rr, -Math.PI / 2, 0);
  s.lineTo(hw, hh - rr); s.absarc(hw - rr, hh - rr, rr, 0, Math.PI / 2);
  s.lineTo(-hw + rl, hh); s.absarc(-hw + rl, hh - rl, rl, Math.PI / 2, Math.PI);
  s.lineTo(-hw, -hh + rl); s.absarc(-hw + rl, -hh + rl, rl, Math.PI, Math.PI * 1.5);
  return s;
}

/* the screen on the front of a node: dark glass, thin border, self-lit icon (+ the title inside, for wide tiles) */
export const iconTexture = ({ icon, color, kind = 'square', w = 1, title = '' }) => memo(`i|${icon}|${color}|${kind}|${w}|${title}`, () => {
  const H = 256, W = Math.round(H * w), [c, x] = hi(W, H), t = tx(c), col = COL[color] || color, bg = CONFIG.node.screen;
  tracePath(x, kind, W, H, 5); x.fillStyle = bg; x.fill();
  x.lineWidth = 3; x.strokeStyle = `rgba(255,255,255,${CONFIG.node.border})`; x.stroke();
  const wide = w > 1, cx = wide ? H * .5 : W / 2, sc = wide ? .74 : kind === 'circle' ? .8 : .94;
  if (wide) { x.font = `600 58px ${FONT}`; x.textBaseline = 'middle'; x.fillStyle = 'rgba(236,239,243,.95)'; x.fillText(title, H * .9, 132, W - H * .9 - 26); }
  if (icon.includes('.')) {                                   // image file instead of a drawn glyph
    const im = new Image(); im.onload = () => { const s = 136 * sc; x.drawImage(im, cx - s / 2, 128 - s / 2, s, s); t.needsUpdate = true; }; im.src = icon;
  } else {
    x.save(); x.translate(cx, 128); x.scale(sc, sc); x.translate(-128, -128);
    x.fillStyle = x.strokeStyle = col; x.lineWidth = 13; x.lineCap = x.lineJoin = 'round'; x.shadowColor = col; x.shadowBlur = 14;
    (G[icon] || G.doc)(x, bg); x.restore();
  }
  return t;
});

export const labelTexture = (title, sub) => memo(`l|${title}|${sub}`, () => {
  const [c, x] = hi(512, 128); x.textAlign = 'center'; x.textBaseline = 'middle';
  x.font = `500 40px ${FONT}`; x.fillStyle = 'rgba(232,236,240,.92)'; x.fillText(title, 256, 42, 500);
  if (sub) { x.font = `400 30px ${FONT}`; x.fillStyle = 'rgba(150,157,165,.9)'; x.fillText(sub, 256, 94, 500); }
  return tx(c);
});

/* white masks tinted at runtime: 'face' = whole screen lit up, 'ring' = glowing outline */
export const maskTexture = (kind, w, mode) => memo(`m|${kind}|${w}|${mode}`, () => {
  const H = 256, W = Math.round(H * w), [c, x] = cv(W, H);
  if (mode === 'face') { tracePath(x, kind, W, H, 5); x.fillStyle = 'rgba(255,255,255,.82)'; x.fill(); }
  else { x.shadowColor = '#fff'; x.shadowBlur = 7; x.lineWidth = 6; x.strokeStyle = '#fff'; tracePath(x, kind, W, H, 8); x.stroke(); x.stroke(); }
  return tx(c);
});

const radial = (size, stops) => { const [c, x] = cv(size, size), h = size / 2, g = x.createRadialGradient(h, h, 0, h, h, h);
  stops.forEach(([o, a]) => g.addColorStop(o, `rgba(255,255,255,${a})`)); x.fillStyle = g; x.fillRect(0, 0, size, size); return [c, x]; };
export const glowTexture = () => memo('glow', () => tx(radial(128, [[0, 1], [.25, .35], [1, 0]])[0]));
export const ringTexture = () => memo('ring', () => tx(radial(256, [[0, 0], [.62, 0], [.8, .9], [.9, .25], [1, 0]])[0]));
export const flareTexture = () => memo('flare', () => {
  const [c, x] = radial(256, [[0, 1], [.1, .55], [.38, .08], [1, 0]]); x.globalCompositeOperation = 'lighter';
  [[1, .03, .95], [.03, 1, .6]].forEach(([sx, sy, a]) => {             // horizontal + vertical streaks
    x.save(); x.translate(128, 128); x.scale(sx, sy);
    const g = x.createRadialGradient(0, 0, 0, 0, 0, 128); g.addColorStop(0, `rgba(255,255,255,${a})`); g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g; x.beginPath(); x.arc(0, 0, 128, 0, 7); x.fill(); x.restore();
  });
  return tx(c);
});

/* soft dark blob under a node, and a soft strip under a pipe (white, tinted black or orange by the material) */
export const shadowTexture = () => memo('shadow', () => {
  const [c, x] = cv(128, 128); x.shadowColor = '#fff'; x.shadowBlur = 20; x.fillStyle = '#fff';
  x.beginPath(); x.roundRect(32, 32, 64, 64, 14); x.fill(); x.fill(); return tx(c);
});
export const stripTexture = () => memo('strip', () => {
  const [c, x] = cv(4, 64), g = x.createLinearGradient(0, 0, 0, 64);
  [[0, 0], [.3, .35], [.5, 1], [.7, .35], [1, 0]].forEach(([o, a]) => g.addColorStop(o, `rgba(255,255,255,${a})`));
  x.fillStyle = g; x.fillRect(0, 0, 4, 64); return tx(c);
});
export const tickTexture = () => memo('tick', () => {
  const [c, x] = cv(256, 16); x.fillStyle = 'rgba(220,226,232,.55)';
  for (let i = 0; i <= 32; i++) x.fillRect(i * 8 - 1, 0, 2, i % 4 ? 7 : 14);
  return tx(c);
});

/* ---------------------------------------------------------------- the wall: metal panels, seams, bolts, grain
   Returns [colour, relief]. One tile covers 8 x 8 units and repeats. */
export const WALL_TILE = 8;
export function wallTextures() {
  const SZ = 2048, U = SZ / WALL_TILE, [cc, c] = cv(SZ, SZ), [bc, b] = cv(SZ, SZ);
  let seed = 5; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  c.fillStyle = '#040405'; c.fillRect(0, 0, SZ, SZ); b.fillStyle = '#303030'; b.fillRect(0, 0, SZ, SZ);     // seams show through between panels
  const rows = [[2, [2, 3, 1.5, 1.5], 0], [1.5, [3, 2, 3], 1], [2.5, [1.5, 2.5, 2, 2], .5], [2, [4, 2, 2], 1.75]];
  let y = 0;
  rows.forEach(([h, widths, shift]) => {
    let x0 = -shift;
    widths.forEach(w => {
      const v = 25 + rnd() * 12, k = 120 + rnd() * 24, inner = rnd() < .4;
      [x0, x0 + WALL_TILE].forEach(px => {                              // drawn twice so the tile wraps
        const X = px * U + 3, Y = y * U + 3, W = w * U - 6, H = h * U - 6;
        c.fillStyle = `rgb(${v},${v + 1},${v + 3})`; c.fillRect(X, Y, W, H);
        c.fillStyle = 'rgba(255,255,255,.05)'; c.fillRect(X, Y, W, 2); c.fillRect(X, Y, 2, H);                   // lit edge
        b.fillStyle = `rgb(${k},${k},${k})`; b.fillRect(X, Y, W, H);
        if (inner) { c.strokeStyle = 'rgba(0,0,0,.55)'; c.lineWidth = 4; c.strokeRect(X + 44, Y + 44, W - 88, H - 88);
          b.strokeStyle = '#484848'; b.lineWidth = 6; b.strokeRect(X + 44, Y + 44, W - 88, H - 88); }
        [[20, 20], [W - 20, 20], [20, H - 20], [W - 20, H - 20]].forEach(([dx, dy]) => {                          // bolts
          c.fillStyle = 'rgba(0,0,0,.6)'; c.beginPath(); c.arc(X + dx, Y + dy, 7, 0, 7); c.fill();
          c.fillStyle = 'rgba(255,255,255,.10)'; c.beginPath(); c.arc(X + dx - 1, Y + dy - 1, 4, 0, 7); c.fill();
          b.fillStyle = '#d8d8d8'; b.beginPath(); b.arc(X + dx, Y + dy, 6, 0, 7); b.fill();
        });
      });
      x0 += w;
    });
    y += h;
  });
  for (let i = 0; i < 26000; i++) {                                     // grain, so light has something to catch
    const px = rnd() * SZ, py = rnd() * SZ, s = 1 + rnd() * 2, a = rnd();
    c.fillStyle = a < .5 ? 'rgba(255,255,255,.035)' : 'rgba(0,0,0,.16)'; c.fillRect(px, py, s, s);
    b.fillStyle = a < .5 ? 'rgba(255,255,255,.10)' : 'rgba(0,0,0,.10)'; b.fillRect(px, py, s * 2, s * 2);
  }
  const col = tx(cc), rel = new THREE.CanvasTexture(bc);
  [col, rel].forEach(t => { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 16; });
  return [col, rel];
}
