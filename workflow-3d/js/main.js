/* Workflow 3D — engine. three.js draws the wall, GSAP ties the story to the page scroll.
   Everything on screen is a pure function of one story time value, so scrolling back and forth is exact.
   Engine source: after editing run the build (see tools/3d-build). */
import * as THREE from 'three';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { iconTexture, labelTexture, maskTexture, glowTexture, flareTexture, ringTexture, shadowTexture, stripTexture, tickTexture,
  wallTextures, WALL_TILE, tileShape } from './textures.js';

const { CONFIG: C, INFO, NODES, EDGES, RUNS, MARKERS, BURSTS } = window.W3D;      // from js/config.js (loaded first)

/* ?still freezes the page and ignores scroll, ?t=0..1 picks the moment of the story (e.g. ?still&t=0.6) */
const query = new URLSearchParams(location.search);
const STILL = query.has('still');
let START = query.has('t') ? parseFloat(query.get('t')) : 0;
const LOW = matchMedia('(pointer: coarse)').matches && Math.min(screen.width, screen.height) < 820;   // phones: lighter effects

const lerp = (a, b, t) => a + (b - a) * t;
const clamp01 = v => Math.min(1, Math.max(0, v));
const smooth = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const rad = THREE.MathUtils.degToRad;
let seed = 11; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const P = (x, y, z = 0) => new THREE.Vector3(x, -y, z);          // layout coords (y down) -> world

/* ---------------------------------------------------------------- renderer + scene */
let renderer;
try { renderer = new THREE.WebGLRenderer({ powerPreference: 'high-performance' }); }
catch (err) { window.w3dFail && window.w3dFail('WebGL is not available: ' + err.message); throw err; }
renderer.toneMapping = THREE.NeutralToneMapping;                  // keeps the orange saturated instead of washing to white
renderer.toneMappingExposure = C.post.exposure;
document.getElementById('stage').appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(C.background);
scene.fog = new THREE.Fog(C.background, 10, 40);
{ // a dark room with a few light panels: this is what the glossy surfaces reflect
  const room = new THREE.Scene(), pmrem = new THREE.PMREMGenerator(renderer);
  const panel = (color, power, w, h, pos) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(power), side: THREE.DoubleSide }));
    m.position.set(...pos); m.lookAt(0, 0, 0); room.add(m);
  };
  panel('#cfe0ff', 7, 9, 3, [-6, 8, 6]); panel('#dfe6f2', 1.6, 2, 7, [9, -2, 4]); panel('#3fdcff', 3.5, 7, 1.2, [-2, -8, 5]); panel('#ffffff', 2.5, 3, 3, [1, 2, 10]);
  scene.environment = pmrem.fromScene(room, 0.03).texture; pmrem.dispose();
}
const camera = new THREE.PerspectiveCamera(C.camera.fov, 1, 0.5, 160);
const sun = new THREE.DirectionalLight(0xdfe9ff, 2.2); sun.position.set(-9, 11, 7);       // grazing key light from top-left
scene.add(sun, new THREE.AmbientLight(0x2a3038, 0.7));
const world = new THREE.Group(); scene.add(world);

/* ---------------------------------------------------------------- shared sizes, materials, small builders */
const S = C.node.size, BEV = 0.02, DEPTH = C.node.depth, STAND = C.node.standoff;
const FRONT = STAND + DEPTH + BEV * 2;                            // z of a node's front face
const PIPE_Z = STAND + (DEPTH + BEV * 2) / 2;                     // pipes run at mid-height of the node bodies
const bodyMat = new THREE.MeshStandardMaterial({ color: C.node.body, metalness: 0.65, roughness: 0.36, envMapIntensity: 1.2 });
const pipeMat = new THREE.MeshStandardMaterial({ color: C.pipe.color, metalness: 0.9, roughness: 0.4, envMapIntensity: 1.0 });
const sheenMat = new THREE.MeshStandardMaterial({ color: 0x000000, metalness: 0, roughness: 0.1, envMapIntensity: 5, transparent: true,
  blending: THREE.AdditiveBlending, depthWrite: false, fog: false, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -6 });   // glass reflection over the screen
const dims = (kind, w = 1) => kind === 'circle' ? [S * 0.7, S * 0.7] : [S * w, S];
const geos = {}, planes = {};
const tileGeo = (kind, w) => geos[kind + w] || (geos[kind + w] = (() => {
  const [W, H] = dims(kind, w);
  const g = new THREE.ExtrudeGeometry(tileShape(kind, W - 2 * BEV, H - 2 * BEV),
    { depth: DEPTH, bevelEnabled: true, bevelThickness: BEV, bevelSize: BEV, bevelSegments: 2, curveSegments: 8 });
  return g.translate(0, 0, -(DEPTH + BEV));                      // front face at z = 0
})());
const sheenGeo = (kind, w) => geos['s' + kind + w] || (geos['s' + kind + w] = (() => { const [W, H] = dims(kind, w); return new THREE.ShapeGeometry(tileShape(kind, W - 0.07, H - 0.07), 12); })());
const plane = (w, h) => planes[w + 'x' + h] || (planes[w + 'x' + h] = new THREE.PlaneGeometry(w, h));
const quad = (w, h, x, y, z) => new THREE.PlaneGeometry(w, h).translate(x, y, z);
const flat = (map, o = {}) => new THREE.MeshBasicMaterial({ map, transparent: true, depthWrite: false,
  polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4, ...o });
const additive = (map, o = {}) => flat(map, { blending: THREE.AdditiveBlending, color: 0x000000, fog: false, ...o });
const tube = (path, len, r, radial) => new THREE.TubeGeometry(path, Math.max(2, Math.ceil(len * 26)), r, radial);
function ribbon(path, len, width, ox = 0, oy = 0, z = 0.004) {   // flat strip lying on the wall along a path (shadow / glow)
  const n = Math.max(2, Math.ceil(len * 12)), pos = [], uv = [], idx = [], p = new THREE.Vector3(), tn = new THREE.Vector3(), h = width / 2;
  for (let i = 0; i <= n; i++) {
    const u = i / n; path.getPointAt(u, p); path.getTangentAt(u, tn);
    pos.push(p.x - tn.y * h + ox, p.y + tn.x * h + oy, z, p.x + tn.y * h + ox, p.y - tn.x * h + oy, z); uv.push(u, 0, u, 1);
    if (i < n) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); return g;
}
const metalG = [], cableG = [], shadowQ = [], shadowR = [], tickQ = [];     // static parts, merged into a few meshes at the end

/* ---------------------------------------------------------------- the wall */
const F = C.filler, wallW = F.x[1] - F.x[0] + 40, wallH = F.y[1] - F.y[0] + 40;
{
  const [col, rel] = wallTextures(); [col, rel].forEach(t => t.repeat.set(wallW / WALL_TILE, wallH / WALL_TILE));
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(wallW, wallH), new THREE.MeshStandardMaterial({ map: col, bumpMap: rel, bumpScale: C.wall.bump,
    roughnessMap: rel, roughness: C.wall.roughness, metalness: C.wall.metalness, envMapIntensity: C.wall.reflect }));
  wall.position.set((F.x[0] + F.x[1]) / 2, -(F.y[0] + F.y[1]) / 2, 0); world.add(wall);
}

/* what every node gets behind it: soft shadow on the wall, mounting bracket with a tick strip, posts holding it off the wall */
function mount(x, y, W, H, kind, posts) {
  shadowQ.push(quad(W * 1.9, H * 1.9, x + 0.07, -y - 0.11, 0.004));
  if (kind !== 'circle') {
    const by = -y - (H / 2 + 0.12);
    metalG.push(new THREE.BoxGeometry(W * 0.86, 0.06, 0.05).translate(x, by, 0.025)); tickQ.push(quad(W * 0.8, 0.04, x, by, 0.052));
  }
  if (!posts) return;
  const post = (px, py) => metalG.push(new THREE.CylinderGeometry(0.022, 0.022, STAND, 8).rotateX(Math.PI / 2).translate(px, py, STAND / 2));
  if (kind === 'circle') post(x, -y);
  else [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sy]) => post(x + sx * (W / 2 - 0.12), -y + sy * (H / 2 - 0.12)));
}

/* ---------------------------------------------------------------- nodes */
const N = {}, mains = [], pickables = [];
NODES.forEach(([id, x, y, icon, color, title, sub, kind = 'square', w = 1]) => {
  const [W, H] = dims(kind, w);
  const n = N[id] = { id, x, y, icon, color, kind, w, W, H, title, sub, hw: W / 2, pos: P(x, y, PIPE_Z), arrive: Infinity, depart: Infinity, sel: 0, hov: 0 };
  const g = n.grp = new THREE.Group(); g.position.copy(P(x, y, FRONT));
  const body = new THREE.Mesh(tileGeo(kind, w), bodyMat); body.userData.node = n; pickables.push(body); g.add(body);
  const face = new THREE.Mesh(plane(W - 2 * BEV, H - 2 * BEV), flat(iconTexture({ icon, color, kind, w, title }))); face.position.z = 0.002; g.add(face);
  const sheen = new THREE.Mesh(sheenGeo(kind, w), sheenMat); sheen.position.z = 0.006; g.add(sheen);
  n.lit = new THREE.Mesh(plane(W - 2 * BEV, H - 2 * BEV), additive(maskTexture(kind, w, 'face'))); n.lit.position.z = 0.004;
  n.ring = new THREE.Mesh(plane(W, H), additive(maskTexture(kind, w, 'ring'))); n.ring.position.z = 0.008;
  n.halo = new THREE.Mesh(plane(W + 2.4, H + 2.4), additive(glowTexture())); n.halo.position.z = -FRONT + 0.008;
  n.c3 = new THREE.Color(C.colors[color] || C.active.color);      // the node glows in its own icon colour as the flow passes
  n.lit.visible = n.ring.visible = n.halo.visible = false; g.add(n.lit, n.ring, n.halo);
  if (title && w === 1) {
    const circle = kind === 'circle', lw = circle ? 0.95 : 1.5, label = new THREE.Mesh(plane(lw, lw / 4), flat(labelTexture(title, sub)));
    label.position.set(0, -(H / 2 + (circle ? 0.05 : 0.19) + lw / 8), -FRONT + 0.012); g.add(label);
  }
  mount(x, y, W, H, kind, true); world.add(g); mains.push(n);
});

/* ---------------------------------------------------------------- pipes */
function roundedPath(pts, r) {
  const path = new THREE.CurvePath(); let cur = pts[0].clone();
  for (let i = 1; i < pts.length - 1; i++) {
    const a = pts[i - 1], b = pts[i], c = pts[i + 1], d1 = b.clone().sub(a), d2 = c.clone().sub(b);
    const rr = Math.min(r, d1.length() / 2, d2.length() / 2);
    const p1 = b.clone().sub(d1.normalize().multiplyScalar(rr)), p2 = b.clone().add(d2.normalize().multiplyScalar(rr));
    if (cur.distanceTo(p1) > 1e-4) path.add(new THREE.LineCurve3(cur.clone(), p1));
    path.add(new THREE.QuadraticBezierCurve3(p1, b.clone(), p2)); cur = p2;
  }
  path.add(new THREE.LineCurve3(cur.clone(), pts[pts.length - 1].clone()));
  return path;
}
function addPipe(path, len, style) {                             // conduit or cable + its shadow, end collars and wall clamps
  const cable = style === 'teal';
  (cable ? cableG : metalG).push(tube(path, len, cable ? C.pipe.cable : C.pipe.radius, 8));
  shadowR.push(ribbon(path, len, cable ? 0.14 : 0.22, 0.05, -0.08));
  [0, 1].forEach(u => { const p = path.getPointAt(u); metalG.push(new THREE.BoxGeometry(0.07, 0.1, 0.1).translate(p.x, p.y, p.z)); });
  if (len > 1.6) for (let s = 0.8; s < len - 0.5; s += C.pipe.clampEvery) {
    const p = path.getPointAt(s / len); metalG.push(new THREE.BoxGeometry(0.06, 0.06, PIPE_Z + 0.02).translate(p.x, p.y, (PIPE_Z + 0.02) / 2));
  }
}
const edges = [], edgeMap = {};
EDGES.forEach(([a, b, style = 'gray', o = {}]) => {
  const A = N[a], B = N[b]; let pts;
  if (o.via) pts = o.via.map(p => P(p[0], p[1], PIPE_Z));
  else {
    const ax = A.x + A.hw, bx = B.x - B.hw;
    if (Math.abs(A.y - B.y) < 0.02) pts = [P(ax, A.y, PIPE_Z), P(bx, B.y, PIPE_Z)];
    else { const mx = lerp(ax, bx, o.bend ?? 0.5); pts = [P(ax, A.y, PIPE_Z), P(mx, A.y, PIPE_Z), P(mx, B.y, PIPE_Z), P(bx, B.y, PIPE_Z)]; }
  }
  const path = roundedPath(pts, 0.22), len = path.getLength(), e = { a, b, path, len };
  addPipe(path, len, style); edges.push(e); edgeMap[a + '>' + b] = e;
});

/* ---------------------------------------------------------------- background filler (out-of-focus hardware around the real workflow) */
{
  const [x0, x1] = F.x, [y0, y1] = F.y, [bx0, bx1, by0, by1] = F.keepOut, list = [], byIcon = new Map();
  const POOL = [['sheet', 'green'], ['code', 'orange'], ['chat', 'pink'], ['globe', 'purple'], ['db', 'blue'], ['mail', 'red'], ['branch', 'teal'],
    ['spark', 'purple'], ['filter', 'teal'], ['clock', 'gray'], ['doc', 'white'], ['cloud', 'white'], ['send', 'blue'], ['bolt', 'orange'], ['user', 'blue']];
  for (let y = y0; y <= y1; y += F.step) {
    let x = x0 + rnd() * 3;
    while (x < x1) {
      const count = 2 + Math.floor(rnd() * 4), yy = y + (rnd() - 0.5) * 0.5, chain = [];
      for (let i = 0; i < count; i++) { const nx = x + i * 1.6; if (nx > bx0 && nx < bx1 && yy > by0 && yy < by1) break; chain.push(nx); }
      chain.forEach((nx, i) => {
        const pick = POOL[Math.floor(rnd() * POOL.length)], key = pick.join('|');
        list.push([nx, yy]); mount(nx, yy, S, S, 'square', false);
        if (!byIcon.has(key)) byIcon.set(key, { pick, geo: [] });
        byIcon.get(key).geo.push(quad(S - 2 * BEV, S - 2 * BEV, nx, -yy, FRONT + 0.002));
        if (i) { const p0 = P(chain[i - 1] + S / 2, yy, PIPE_Z), p1 = P(nx - S / 2, yy, PIPE_Z); addPipe(new THREE.LineCurve3(p0, p1), p0.distanceTo(p1), rnd() < 0.3 ? 'teal' : 'gray'); }
      });
      x += count * 1.6 + F.gap[0] + rnd() * (F.gap[1] - F.gap[0]);
    }
  }
  const bodies = new THREE.InstancedMesh(tileGeo('square', 1), bodyMat, list.length), sheens = new THREE.InstancedMesh(sheenGeo('square', 1), sheenMat, list.length), m = new THREE.Matrix4();
  list.forEach(([x, y], i) => { bodies.setMatrixAt(i, m.makeTranslation(x, -y, FRONT)); sheens.setMatrixAt(i, m.makeTranslation(x, -y, FRONT + 0.006)); });
  world.add(bodies, sheens);
  byIcon.forEach(({ pick, geo }) => world.add(new THREE.Mesh(mergeGeometries(geo), flat(iconTexture({ icon: pick[0], color: pick[1] })))));
}

/* merge every static part into a handful of meshes */
{
  const dark = (map, opacity) => flat(map, { color: 0x000000, opacity, side: THREE.DoubleSide });
  const add = (geo, mat, order = 0) => { const m = new THREE.Mesh(mergeGeometries(geo), mat); m.renderOrder = order; world.add(m); };
  add(shadowQ, dark(shadowTexture(), 0.8), 1);
  add(shadowR, dark(stripTexture(), 0.7), 1);
  add(tickQ, flat(tickTexture()), 2);
  add(metalG, pipeMat);
  add(cableG, new THREE.MeshBasicMaterial({ color: C.pipe.teal }));
}

/* ---------------------------------------------------------------- story timing */
const M = C.motion, T = { start: 0 };
const edgeDur = len => (Math.min(len, 3) + Math.max(0, len - 3) * M.longEdge) / M.speed;
const dwell = id => M.dwellOf[id] ?? M.dwell;
function timeRun(run, start) {
  const segs = []; let t = start;
  run.path.forEach((id, i) => {
    if (i) {
      const e = edgeMap[run.path[i - 1] + '>' + id]; if (!e) throw new Error(`RUNS: no edge ${run.path[i - 1]} > ${id}`);
      const d = edgeDur(e.len); segs.push({ e, t0: t, t1: t + d }); t += d;
    }
    const last = i === run.path.length - 1, d = i === 0 && run.after ? 0 : dwell(id);
    segs.push({ n: N[id], t0: t, t1: last ? (run.main ? Infinity : t + d * 2.5) : t + d }); t += d;
  });
  return segs;
}
RUNS.forEach(run => {
  let start = run.start ?? 0;
  if (run.after) start = N[run.after].arrive + (run.delay || 0);
  if (run.sync) start = N[run.sync].arrive - timeRun(run, 0).find(s => s.n === N[run.sync]).t0;
  const segs = run.segs = timeRun(run, start);
  segs.forEach((s, i) => {
    if (s.e) { s.e.act = s.e.act || { t0: s.t0, t1: s.t1, color: run.color }; return; }
    if (i || !run.after) { s.n.arrive = Math.min(s.n.arrive, s.t0); s.n.depart = Math.min(s.n.depart, s.t1); }
    s.pin = i ? segs[i - 1].e.path.getPointAt(1) : s.n.pos;
    s.pout = i < segs.length - 1 ? segs[i + 1].e.path.getPointAt(0) : s.n.pos;
  });
});
const mainRun = RUNS.find(r => r.main), follows = RUNS.filter(r => r.follow);
T.fire = RUNS[0].segs[0].t0;
Object.entries(MARKERS).forEach(([name, id]) => { T[name] = N[id].arrive; });
T.end = mainRun.segs[mainRun.segs.length - 1].t0;
T.total = T.end + M.hold;

/* where a run's light is at story time t; returns its visibility 0..1 (hidden while a node is "running") */
function headAt(run, t, out) {
  const s = run.segs;
  if (t < s[0].t0) { out.copy(s[0].pin); return 0; }
  for (let i = 0; i < s.length; i++) {
    const g = s[i]; if (t >= g.t1) continue;
    if (g.e) { g.e.path.getPointAt(clamp01((t - g.t0) / (g.t1 - g.t0)), out); return 1; }
    const finite = isFinite(g.t1) && g.t1 > g.t0;
    out.lerpVectors(g.pin, g.pout, finite ? (t - g.t0) / (g.t1 - g.t0) : 0);
    return Math.max(0, 1 - (t - g.t0) / 0.12, finite ? 1 - (g.t1 - t) / 0.1 : 0);
  }
  out.copy(s[s.length - 1].pout); return 0;
}

/* ---------------------------------------------------------------- lit route, sparks, moving lamps */
const cAct = new THREE.Color(C.active.color), cHead = new THREE.Color(C.active.head), cLit = new THREE.Color(C.active.litColor);
const white = new THREE.Color(0xffffff), tmpCol = new THREE.Color(), tmp2 = new THREE.Color();
const flowCol = name => new THREE.Color((C.active.palette && C.active.palette[name]) || C.colors[name] || C.active.color);
const uTime = { value: 0 };
const VS = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }';
const actives = edges.filter(e => e.act);
actives.forEach(e => {
  const fc = flowCol(e.act.color);                                // this pipe flows in its route's colour
  const uniforms = e.u = { uHead: { value: 0 }, uLen: { value: e.len }, uColor: { value: fc.clone().multiplyScalar(C.active.intensity) },
    uHot: { value: fc.clone().lerp(white, 0.55).multiplyScalar(0.55) }, uGlow: { value: C.active.wallGlow }, uTime };
  e.mesh = new THREE.Mesh(tube(e.path, e.len, C.active.radius, 10), new THREE.ShaderMaterial({ uniforms, vertexShader: VS, fragmentShader: `
    uniform float uHead, uLen, uTime; uniform vec3 uColor, uHot; varying vec2 vUv;
    void main(){
      float d = (uHead - vUv.x) * uLen;                           // distance behind the light, in units
      if (d < 0.0) discard;
      float flow = 0.5 + 0.5 * sin((vUv.x * uLen - uTime * 1.6) * 5.0);
      gl_FragColor = vec4(uColor * (1.0 + 0.3 * flow) + uHot * exp(-d * 1.6), 1.0);
    }` }));
  e.glow = new THREE.Mesh(ribbon(e.path, e.len, 1.3, 0, 0, 0.006), new THREE.ShaderMaterial({ uniforms, vertexShader: VS, transparent: true, depthWrite: false,
    blending: THREE.AdditiveBlending, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4, fragmentShader: `
    uniform float uHead, uLen, uGlow; uniform vec3 uColor; varying vec2 vUv;
    void main(){                                                   // orange light the pipe throws on the wall
      float d = (uHead - vUv.x) * uLen; if (d < 0.0) discard;
      float a = 1.0 - abs(vUv.y * 2.0 - 1.0); a = a * a * a;
      gl_FragColor = vec4(uColor * a * uGlow * (0.45 + 1.2 * exp(-d * 1.2)) * smoothstep(0.0, 0.25, d), 1.0);
    }` }));
  e.glow.renderOrder = 2; e.mesh.visible = e.glow.visible = false; world.add(e.mesh, e.glow);
});

const sprite = (map, color, scale) => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map, color, transparent: true, depthWrite: false,
  depthTest: false, blending: THREE.AdditiveBlending, fog: false })); s.scale.setScalar(scale); return s; };
RUNS.forEach(run => {
  run.head = new THREE.Group();
  run.col = flowCol(run.color);                                   // head, lamp and burst all take the route's colour
  run.head.add(sprite(glowTexture(), run.col.clone().lerp(white, 0.45), 0.36));           // a soft travelling dot, no star streaks (easy on the eyes)
  run.lamp = run.follow ? new THREE.PointLight(run.col, 0, 5, 2) : null;   // real light on the two main runs only (cost grows with every light)
  run.head.visible = false; world.add(run.head); if (run.lamp) world.add(run.lamp);
});
const bursts = BURSTS.map(b => {
  const n = N[b.node], flare = sprite(glowTexture(), 0x000000, 1), ring = new THREE.Mesh(plane(1, 1), additive(ringTexture()));
  flare.position.copy(n.pos); ring.position.copy(P(n.x, n.y, FRONT + 0.02)); world.add(flare, ring);
  return { t: n.arrive, size: b.size, col: flowCol(b.color).lerp(white, 0.4), flare, ring };
});
const packets = edges.filter(e => !e.act && e.len > 0.7).filter((e, i) => i % 3 === 0).slice(0, C.packets).map(e => {
  const s = sprite(glowTexture(), new THREE.Color(C.colors.teal).multiplyScalar(0.9), 0.16); world.add(s);
  return { s, e, speed: 0.5 + rnd() * 0.5, off: rnd() };
});

/* ---------------------------------------------------------------- camera: locked angle, slides along a smoothed track */
const cc = C.camera, YAW = rad(cc.yaw), PITCH = rad(cc.pitch), ROLL = rad(cc.roll);
const toCamera = new THREE.Vector3(Math.sin(YAW) * Math.cos(PITCH), Math.sin(PITCH), Math.cos(YAW) * Math.cos(PITCH));   // constant direction, never animated
const v = new THREE.Vector3(), target = new THREE.Vector3();
const subject = (t, out) => headAt(t < T.join ? follows[0] : follows[follows.length - 1], t, out);
const DT = 1 / 60, SAMPLES = Math.ceil(T.total / DT) + 1, trackX = new Float32Array(SAMPLES), trackY = new Float32Array(SAMPLES);
for (let i = 0; i < SAMPLES; i++) { subject(i * DT, v); trackX[i] = v.x; trackY[i] = v.y; }
{ // zero-phase smoothing: the view eases into every turn before the light gets there
  const a = 1 - Math.exp(-DT / cc.smoothing);
  for (let pass = 0; pass < 2; pass++) for (const arr of [trackX, trackY]) {
    for (let i = 1; i < SAMPLES; i++) arr[i] = arr[i - 1] + (arr[i] - arr[i - 1]) * a;
    for (let i = SAMPLES - 2; i >= 0; i--) arr[i] = arr[i + 1] + (arr[i] - arr[i + 1]) * a;
  }
}
const track = (t, out) => { const f = clamp01(t / T.total) * (SAMPLES - 1), i = Math.min(SAMPLES - 2, Math.floor(f)), k = f - i;
  out.set(lerp(trackX[i], trackX[i + 1], k), lerp(trackY[i], trackY[i + 1], k), 0); };

/* ---------------------------------------------------------------- post-processing */
const DofShader = taps => ({   // depth of field. The scene is one flat wall, so depth is exact per pixel from ray-plane maths — no depth buffer needed
  defines: { TAPS: taps },
  uniforms: { tDiffuse: { value: null }, uInvVP: { value: new THREE.Matrix4() }, uCamPos: { value: new THREE.Vector3() }, uCamDir: { value: new THREE.Vector3() },
    uRes: { value: new THREE.Vector2(1, 1) }, uFocus: { value: 10 }, uAperture: { value: 20 }, uMaxCoc: { value: C.post.dof.max }, uScale: { value: 1 }, uSeed: { value: 0 }, uTaps: { value: taps } },
  vertexShader: VS,
  fragmentShader: `
    uniform sampler2D tDiffuse; uniform mat4 uInvVP; uniform vec3 uCamPos, uCamDir; uniform vec2 uRes;
    uniform float uFocus, uAperture, uMaxCoc, uScale, uSeed, uTaps; varying vec2 vUv;
    void main(){
      vec4 p = uInvVP * vec4(vUv * 2.0 - 1.0, 1.0, 1.0);
      vec3 d = normalize(p.xyz / p.w - uCamPos);
      float t = d.z < -1e-4 ? -uCamPos.z / d.z : 1e4;             // ray hits the wall (z = 0)
      float z = max(t * dot(d, uCamDir), 0.01);
      float coc = min(uAperture * abs(z - uFocus) / z, uMaxCoc) * uRes.y / 1080.0 * uScale;
      if (coc < 0.6) { gl_FragColor = texture2D(tDiffuse, vUv); return; }
      float n = fract(52.9829189 * fract(dot(gl_FragCoord.xy + uSeed, vec2(0.06711056, 0.00583715))));
      vec4 acc = vec4(0.0); float wsum = 0.0;
      for (int i = 0; i < TAPS; i++) {
        if (float(i) >= uTaps) break;
        float fi = float(i), th = fi * 2.39996323 + n * 6.2831853;
        vec4 s = textureLod(tDiffuse, vUv + vec2(cos(th), sin(th)) * sqrt((fi + 0.5) / uTaps) * coc / uRes, 0.0);
        float w = 1.0 + 1.5 * max(0.0, max(s.r, max(s.g, s.b)) - 0.8);   // bright points keep their bokeh
        acc += s * w; wsum += w;
      }
      gl_FragColor = acc / wsum;
    }`
});
const GradeShader = {   // lens: slight colour fringing, vignette, film grain, and the spotlight used when a node is tapped
  uniforms: { tDiffuse: { value: null }, uTime: { value: 0 }, uVig: { value: C.post.vignette }, uGrain: { value: C.post.grain }, uCA: { value: C.post.aberration },
    uSpot: { value: new THREE.Vector2(0.5, 0.5) }, uSpotAmt: { value: 0 }, uSpotR: { value: C.tap.radius }, uDim: { value: C.tap.dim }, uAspect: { value: 1 } },
  vertexShader: VS,
  fragmentShader: `
    uniform sampler2D tDiffuse; uniform float uTime, uVig, uGrain, uCA, uSpotAmt, uSpotR, uDim, uAspect; uniform vec2 uSpot; varying vec2 vUv;
    void main(){
      vec2 q = vUv - 0.5, off = q * dot(q, q) * uCA;
      vec3 c = vec3(texture2D(tDiffuse, vUv + off).r, texture2D(tDiffuse, vUv).g, texture2D(tDiffuse, vUv - off).b);
      c *= mix(1.0 - uVig, 1.0, smoothstep(0.85, 0.2, length(q * vec2(1.0, 1.1))));
      float sd = length((vUv - uSpot) * vec2(uAspect, 1.0));
      c *= mix(1.0, mix(uDim, 1.0, smoothstep(uSpotR * 1.9, uSpotR * 0.5, sd)), uSpotAmt);
      float g = fract(sin(dot(gl_FragCoord.xy + uTime * 61.0, vec2(12.9898, 78.233))) * 43758.5453) - 0.5;
      gl_FragColor = vec4(max(c + g * uGrain * (0.25 + c), 0.0), 1.0);
    }`
};
const composer = new EffectComposer(renderer);
const dofA = new ShaderPass(DofShader(LOW ? 14 : 34)); dofA.textureID = 'none'; dofA.uniforms.uTaps.value = LOW ? 12 : 20;       // reads the scene target directly (set in resize)
const dofB = new ShaderPass(DofShader(LOW ? 8 : 16)); dofB.uniforms.uTaps.value = LOW ? 6 : 10; dofB.uniforms.uScale.value = 0.4; dofB.uniforms.uSeed.value = 17;   // second, smaller pass smooths the first
const dofs = [dofA, dofB];
const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), C.post.bloom.strength, C.post.bloom.radius, C.post.bloom.threshold);
const grade = new ShaderPass(GradeShader);
[dofA, dofB, bloom, grade, new OutputPass()].forEach(p => composer.addPass(p));

let sceneRT = null, quality = 1, fit = 1, msaa = 4;
function resize() {
  const w = innerWidth, h = innerHeight;
  const pr = Math.min(devicePixelRatio, LOW ? 1.5 : C.quality.maxPixelRatio, Math.sqrt(C.quality.pixelBudget / (w * h))) * quality;
  const W = Math.max(2, Math.floor(w * pr)), H = Math.max(2, Math.floor(h * pr));
  renderer.setPixelRatio(pr); renderer.setSize(w, h); composer.setPixelRatio(pr); composer.setSize(w, h);
  if (sceneRT) sceneRT.dispose();                                 // only the scene itself is multisampled; the effect chain is not
  sceneRT = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, samples: Math.min(msaa, W * H > 2e6 || LOW ? 2 : 4) });
  dofA.uniforms.tDiffuse.value = sceneRT.texture;
  camera.aspect = w / h; camera.updateProjectionMatrix();
  fit = Math.max(1, Math.pow(1.25 / camera.aspect, 0.8));         // tall screens: same angle, further back
  dofs.forEach(p => p.uniforms.uRes.value.set(W, H)); grade.uniforms.uAspect.value = w / h;
}
addEventListener('resize', resize); resize();

/* quality levels, lowest cost first. 0 = full. Each step drops the most expensive effect that is least visible. Resolution is touched last and never below the floor */
let level = 0;
function setLevel(n) {
  level = n;
  if (n >= 1) { dofB.enabled = false; dofA.uniforms.uTaps.value = LOW ? 8 : 14; }          // one blur pass, fewer taps
  if (n >= 2) { bloom.enabled = false; msaa = 0; resize(); }                                // no glow pass, no multisampling
}
const GPU = (() => { try { const g = renderer.getContext(), x = g.getExtension('WEBGL_debug_renderer_info'); return x ? String(g.getParameter(x.UNMASKED_RENDERER_WEBGL)) : ''; } catch (e) { return ''; } })();
if (query.has('lite')) setLevel(3); else if (/Intel|Mali|PowerVR|SwiftShader|llvmpipe/i.test(GPU)) setLevel(1);   // weak/integrated GPUs start lighter

/* ---------------------------------------------------------------- tap / hover */
const canvas = renderer.domElement, raycaster = new THREE.Raycaster(), ndc = new THREE.Vector2();
const card = document.getElementById('card'), cardTitle = document.getElementById('card-title'), cardText = document.getElementById('card-text'), cardLink = document.getElementById('card-link'), cardLogo = document.getElementById('card-logo');
const mouse = { x: 0, y: 0, tx: 0, ty: 0, px: 0, py: 0, dirty: false };
let hovered = null, selected = null, spot = 0;
const selGroup = new THREE.Group(); world.add(selGroup);
const pick = (cx, cy) => {
  ndc.set(cx / innerWidth * 2 - 1, -(cy / innerHeight * 2 - 1)); raycaster.setFromCamera(ndc, camera);
  const hit = raycaster.intersectObjects(pickables, false)[0]; return hit ? hit.object.userData.node : null;
};
function select(node) {
  if (typeof node === 'string') node = N[node];
  selected = node || null;
  selGroup.children.slice().forEach(m => { selGroup.remove(m); m.geometry.dispose(); });
  if (!selected) { card.classList.remove('show'); card.hidden = true; return; }
  const mat = new THREE.MeshBasicMaterial({ color: cLit.clone().multiplyScalar(1.5), fog: false });       // light up the pipes that touch it
  edges.filter(e => e.a === selected.id || e.b === selected.id).forEach(e => selGroup.add(new THREE.Mesh(tube(e.path, e.len, C.active.radius * 0.9, 8), mat)));
  const info = { ...INFO.default, ...(INFO[selected.id] || {}) };
  cardLogo.src = info.logo || iconTexture({ icon: selected.icon, color: selected.color }).image.toDataURL();   // a mini node chip, or an image path set in INFO
  card.style.setProperty('--accent', C.colors[selected.color] || '#3fdcff');                                   // card picks up the tapped node's colour
  cardTitle.textContent = selected.title; cardText.textContent = info.text || selected.sub || '';
  cardLink.href = info.url; cardLink.hidden = !info.url; card.hidden = false;
  requestAnimationFrame(() => card.classList.add('show'));
}
canvas.addEventListener('pointermove', e => {
  mouse.tx = e.clientX / innerWidth * 2 - 1; mouse.ty = e.clientY / innerHeight * 2 - 1;
  if (e.pointerType === 'mouse') { mouse.px = e.clientX; mouse.py = e.clientY; mouse.dirty = true; }
});
canvas.addEventListener('pointerleave', () => { hovered = null; canvas.style.cursor = ''; });
canvas.addEventListener('click', e => select(pick(e.clientX, e.clientY)));
addEventListener('keydown', e => { if (e.key === 'Escape') select(null); });
/* the card belongs to where you tapped: any real scroll closes it (otherwise it drifts up the screen as the wall slides) */
const loadedAt = performance.now();
addEventListener('scroll', () => { if (selected && performance.now() - loadedAt > 1200) select(null); }, { passive: true });
addEventListener('wheel', () => { if (selected) select(null); }, { passive: true });
addEventListener('touchmove', () => { if (selected) select(null); }, { passive: true });

/* ---------------------------------------------------------------- frame */
const invVP = new THREE.Matrix4(), clock = { t: 0 }, hint = document.getElementById('hint');
if (hint) hint.textContent = C.scroll.hint;
let lastNow = performance.now(), slowSum = 0, slowCount = 0;

function frame() {
  const t = clock.t, now = STILL ? 0 : performance.now() / 1000;
  uTime.value = now;

  for (const e of actives) {
    const h = (t - e.act.t0) / (e.act.t1 - e.act.t0);
    e.mesh.visible = e.glow.visible = h > 0; e.u.uHead.value = Math.min(h, 60);
  }
  for (const run of RUNS) {
    const on = headAt(run, t, v);
    run.head.visible = on > 0.01; if (run.lamp) run.lamp.intensity = on * C.active.light;
    if (on > 0.01) { run.head.position.copy(v); run.head.scale.setScalar(on * (1 + 0.06 * Math.sin(now * 9))); if (run.lamp) run.lamp.position.set(v.x, v.y, FRONT + 0.25); }
  }
  for (const b of bursts) {
    const u = (t - b.t) / 0.9, live = u > 0 && u < 1; b.flare.visible = b.ring.visible = live;
    if (!live) continue;
    const out = 1 - Math.pow(1 - u, 3);
    b.flare.scale.setScalar(b.size * (0.9 + out * 1.6)); b.flare.material.color.copy(b.col).multiplyScalar(0.8 * (1 - u) * (1 - u));
    b.ring.scale.setScalar(b.size * (0.3 + out * 2.2)); b.ring.material.color.copy(b.col).multiplyScalar(0.6 * Math.pow(1 - u, 1.5));
  }
  for (const p of packets) p.e.path.getPointAt((now * p.speed / p.e.len + p.off) % 1, p.s.position);

  // camera: the direction is a constant; only the point it looks at slides
  track(t, v);
  mouse.x += (mouse.tx - mouse.x) * 0.04; mouse.y += (mouse.ty - mouse.y) * 0.04;
  target.set(v.x + cc.lead[0] + mouse.x * cc.drift, v.y - cc.lead[1] - mouse.y * cc.drift, 0);
  const dist = cc.dist * fit;
  camera.position.copy(target).addScaledVector(toCamera, dist);
  camera.up.set(0, 1, 0); camera.lookAt(target); camera.rotateZ(ROLL); camera.updateMatrixWorld();
  scene.fog.near = dist; scene.fog.far = dist + 26;

  if (mouse.dirty) { mouse.dirty = false; hovered = pick(mouse.px, mouse.py); canvas.style.cursor = hovered ? 'pointer' : ''; }
  for (const n of mains) {                                        // node states: story (running / done) + hover + tapped
    let lit = 0, done = 0;
    if (t >= n.arrive) {
      done = Math.min(1, (t - n.arrive) / 0.15);
      lit = t < n.depart ? Math.min(1, (t - n.arrive) / 0.1) * (0.86 + 0.14 * Math.sin((t - n.arrive) * 13)) : Math.exp(-(t - n.depart) / 0.7);
    }
    n.sel += ((n === selected ? 1 : 0) - n.sel) * 0.14; n.hov += ((n === hovered ? 1 : 0) - n.hov) * 0.2;
    const selp = n.sel * (0.8 + 0.2 * Math.sin(now * 4));         // story glow is the node's own colour; a tap glows cyan on top
    const any = done > 0.002 || n.sel > 0.002 || n.hov > 0.002;
    n.lit.visible = n.ring.visible = n.halo.visible = any;
    n.grp.position.z = FRONT + n.hov * 0.04 + n.sel * 0.03;
    if (!any) continue;
    n.lit.material.color.copy(n.c3).multiplyScalar(lit * C.active.lit * 0.9).add(tmp2.copy(cLit).multiplyScalar(selp * C.active.lit));
    n.ring.material.color.copy(n.c3).multiplyScalar(done * 0.95 * (1 - lit * 0.6) * (1 - n.sel)).add(tmp2.copy(cLit).multiplyScalar(n.sel * 1.3 + n.hov * 0.45));
    n.halo.material.color.copy(n.c3).multiplyScalar(lit * 0.28).add(tmp2.copy(cLit).multiplyScalar(selp * 0.3));
  }
  spot += ((selected ? 1 : 0) - spot) * 0.1; grade.uniforms.uSpotAmt.value = spot;
  if (selected) {                                                 // spotlight + card follow the tapped node
    v.copy(selected.pos).project(camera); grade.uniforms.uSpot.value.set(v.x * 0.5 + 0.5, v.y * 0.5 + 0.5);
    v.copy(selected.pos); v.x += selected.hw; v.project(camera);
    let sx = (v.x * 0.5 + 0.5) * innerWidth + 22, sy = (-v.y * 0.5 + 0.5) * innerHeight - 34;
    const cw = card.offsetWidth, ch = card.offsetHeight;
    if (sx + cw > innerWidth - 12) {                              // no room beside the node (phones): put the card under it instead
      v.copy(selected.pos); v.y -= selected.H / 2 + 0.45; v.project(camera);
      sx = (v.x * 0.5 + 0.5) * innerWidth - cw / 2; sy = (-v.y * 0.5 + 0.5) * innerHeight;
    }
    card.style.transform = `translate(${Math.round(Math.max(12, Math.min(sx, innerWidth - cw - 12)))}px, ${Math.round(Math.max(12, Math.min(sy, innerHeight - ch - 12)))}px)`;
  }
  if (hint) hint.style.opacity = String(1 - smooth(0.2, 0.9, t));

  invVP.multiplyMatrices(camera.matrixWorld, camera.projectionMatrixInverse);
  camera.getWorldDirection(v);
  for (const pass of dofs) {
    const u = pass.uniforms;
    u.uInvVP.value.copy(invVP); u.uCamPos.value.copy(camera.position); u.uCamDir.value.copy(v);
    u.uFocus.value = dist; u.uAperture.value = C.post.dof.aperture * C.post.dof.strength;
  }
  grade.uniforms.uTime.value = now;
  renderer.setRenderTarget(sceneRT); renderer.render(scene, camera); renderer.setRenderTarget(null);
  composer.render();

  // if the machine can't keep up, drop resolution a step (never raises it again)
  const ms = performance.now() - lastNow; lastNow += ms;
  if (!STILL && ms < 200 && ++slowCount > 30 && (slowSum += ms) && slowCount === 90) {      // first 30 frames ignored (shader compile)
    if (slowSum / 60 > 22) {                                                                  // under ~45 fps: step down one level
      if (level < 2) setLevel(level + 1);
      else if (quality > (C.quality.minScale ?? 0.85)) { quality = Math.max(C.quality.minScale ?? 0.85, quality * 0.9); resize(); }
    }
    slowSum = slowCount = 0;
  }
}

/* ---------------------------------------------------------------- playback: scroll-driven story (default) or an ambient auto loop (lab) */
gsap.registerPlugin(ScrollTrigger);
const AUTO = C.playback === 'auto';                                     // lab pages set this so page scroll stays free for HTML content
const linked = N[decodeURIComponent(location.hash.slice(1))];           // .../#agent opens with that node selected
if (linked) { if (isFinite(linked.arrive)) START = Math.min(1, (linked.arrive + 0.6) / T.total); select(linked); }
const spacer = document.getElementById('scroll');
let tl;
if (STILL) { tl = gsap.timeline({ paused: true }); tl.to(clock, { t: T.total, duration: T.total, ease: 'none', lazy: false }); tl.progress(START); }
else if (AUTO) {                                                        // play forward then ease back, so the ambient loop never pops
  tl = gsap.timeline({ repeat: -1, yoyo: true, repeatDelay: C.autoHold ?? 0.8 });
  tl.to(clock, { t: T.total, duration: T.total, ease: 'none' });
  tl.timeScale(C.autoSpeed ?? 1);
} else {
  if (spacer) spacer.style.height = C.scroll.screens * 100 + 'vh';
  tl = gsap.timeline({ paused: true });
  tl.to(clock, { t: T.total, duration: T.total, ease: 'none', lazy: false });
  ScrollTrigger.create({ trigger: spacer, start: 'top top', end: 'bottom bottom', scrub: C.scroll.smooth, animation: tl });
  if (START) scrollTo(0, START * (document.documentElement.scrollHeight - innerHeight));
}
renderer.setAnimationLoop(frame);
gsap.to(canvas, { opacity: 1, duration: STILL ? 0 : 1.4, ease: 'power2.out' });

/* handle for the owner's own UI: workflow3d.select('agent'), workflow3d.goTo('agent'), workflow3d.timeline ... */
window.workflow3d = {
  timeline: tl, markers: T, config: C, select, data: window.W3D,
  goTo(marker) { if (AUTO || !spacer) return; const t = typeof marker === 'number' ? marker : T[marker] ?? 0; scrollTo({ top: t / T.total * (document.documentElement.scrollHeight - innerHeight), behavior: 'smooth' }); }
};
