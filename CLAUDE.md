# Automation Protocol — project guide

Read this first in any new chat. It says what this site is, what must not change, where everything lives, and how to edit it.

## What this is

A **single-screen** website: a green "old monitor" HUD for an AI workflow-automation studio, rebuilt from the owner's reference screenshot (`docs/reference/reference-layout-hires.png`), with their ASCII-art eye in the middle. The eye blinks and its iris follows the pointer. Typing a task in the command line and pressing Enter plays a short simulated workflow run.

## Rules from the owner (do not break these)

1. **Only this one section.** No extra sections, pages, navigation, forms, footers, marketing copy or logo blocks unless the owner asks for them by name. An earlier multi-section version was rejected.
2. **Match the reference.** Layout follows `reference-layout-hires.png`. The screen filter follows `reference-filter-look.png`: a dark pixel grid over everything, soft glow, heavy vignette, deep blacks.
3. **The eye is the owner's ASCII art.** It comes from the two files in `source/`. Do not replace it with a photo, an SVG or generated art.
4. **Old-UI feel over polish.** Dim, soft, slightly low-res. Do not make it crisp, bright or "modern SaaS". Overlays must never lift the blacks into grey haze.
5. No invented clients, metrics or case studies. The run animation is a simulation and sends nothing anywhere.

## Where things live

| Path | What it is | Edit it? |
|---|---|---|
| `site.config.js` | **All text and all tunables**: words, colours, filter strengths, eye size/position/tracking/blink, animation timings | Yes, first stop for almost every change |
| `index.html` | The parts of the HUD and their positions (`--x --y --w --h` in stage units) | Yes, to move, resize, add or remove a part |
| `tools/site.src.css` | Stylesheet source (`12u` = 12 stage units) | Yes, then run the build |
| `assets/css/site.css` | Generated stylesheet | No, it is overwritten by the build |
| `assets/js/site.js` | Engine: applies config, draws the eye, runs boot / idle / run animations | Only for new behaviour |
| `assets/js/eye-data.js` | Generated eye data (both frames + eyeball mask) | No, generated |
| `source/ascii-eye-open.html`, `source/ascii-eye-closed.html` | The owner's original ASCII scene exports (open eye, closed eye) | Replace to change the eye, then rebuild |
| `tools/build_css.py`, `tools/build_eye_data.py` | The two build scripts | Rarely |
| `docs/DESIGN.md` | Design spec: layout map, palette, type, filter stack, motion | Keep in sync when the design changes |
| `docs/reference/` | Reference screenshots and captures of the current build | Add new references here |
| `workflow-3d/` | **Separate 3D page**, open at `/workflow-3d/` (also works by double-clicking `index.html`, offline: three.js and GSAP are bundled in, no CDN). A 3D hardware wall rebuilt from the references in `docs/reference/workflow-3d/` (v2): **page scroll drives** an orange light through the pipes and slides the view with it; tapping a node makes it glow, dims the rest and opens a card (dark glass, accent = the node's colour, a mini-node logo chip) with an Open link (`INFO` in config: per-node `text`, `url`, and optional `logo` image path; `#nodeId` in the address opens with that node selected). **The camera angle is locked** (owner's hard rule): yaw/pitch/roll/fov/dist are constants in `CONFIG.camera`, the camera only slides. The owner asked for it explicitly; the "only this one section" rule above applies to `index.html`, not to this page. No UI yet (empty `#ui` layer is reserved for widgets, taskbar, menu, type). | Yes, on request |
| `docs/workflow-3d-plan.md` | **Master brief for the 3D page.** Hard rule: the camera angle must not change. Phases 1 to 3 (look, scroll, tap) are built; phase 4 (intro, polish) and 5 (owner's UI) are not. The owner mentioned a second hard rule but has not said what it is. Read before any work on `workflow-3d/` | Keep in sync |
| `workflow-3d/js/config.js` | All tunables (colours, speeds, camera keyframes, blur, glow) **and the graph**: `NODES`, `EDGES`, and `RUNS` (the route the light travels). A plain script, **no rebuild needed** after editing | Yes, first stop for this page |
| `workflow-3d/js/textures.js`, `js/main.js` | Engine source. `textures.js` = icons, labels, tile shapes drawn on canvas (a node's icon can instead be an image path). `main.js` = wall, nodes, pipes, run scheduling, locked camera track, scroll, tap, depth of field, bloom; `?still` freezes and ignores scroll, `?t=0..1` picks the moment, `window.workflow3d` (`select(id)`, `goTo(marker)`, `timeline`) is the handle for later UI. **Editing these needs a rebuild** | Only for new behaviour |
| `workflow-3d/dist/engine.js` | Generated bundle of the two files above plus three.js and GSAP. This is what the page loads | No, generated |
| `tools/3d-build/` | Rebuild: `cd tools/3d-build; npm install; npm run build`, then delete its `node_modules` (the folder is in OneDrive; do not leave it synced) | Rarely |
| `logo-design/` | Earlier, separate logo exploration ("One Click Works"). Not used by the page except the favicon | Leave alone unless asked |

## How to make common changes

- **Change any word** (user name, headline, box labels, status rows): `site.config.js` → `text`.
- **Change a colour**: `site.config.js` → `colors`. Each key becomes a CSS variable of the same name.
- **Stronger or weaker screen filter**: `site.config.js` → `filter` (`gridStrength`, `gridSize`, `softness`, `vignette`, `glow`, `noise`, ...).
- **Eye bigger, smaller, moved, brighter**: `site.config.js` → `eye` (`width`, `x`, `y`, `brightness`, `greenTint`, `fadeX/Y`).
- **Pupil tracking / blinking**: `site.config.js` → `eye.track`, `eye.blink`.
- **Animation speed**: `site.config.js` → `motion`.
- **Move or resize a HUD part**: change its `--x --y --w --h` in `index.html`. Units are pixels of the 1671 x 941 reference image, so you can measure straight off the screenshot.
- **Restyle a part**: edit `tools/site.src.css`, then `python tools/build_css.py`.
- **New eye artwork**: put two exports with the same 213 x 72 grid in `source/` under the existing names, run `python tools/build_eye_data.py`, then check `iris` (centre and radius) in that script matches the new image.

## Run and check

- Preview: the `demo-site` entry in `.claude/launch.json` serves the folder on port 4173 (`python -m http.server 4173`). It can stop between turns; start it again.
- `?still` freezes everything in the resting state (use for screenshots). `?still&closed` shows the eye shut. `?still&look=1,0.5` fixes the gaze (each value -1..1).
- Sharp full-size capture: headless Chrome, window 1671 x 941, **GPU on** (with `--disable-gpu` the eye canvas renders wrong).
- Checking `workflow-3d`: the preview pane only gives small screenshots and pauses when hidden. For sharp frames use headless Chrome on `?still&t=…` (do not use `--virtual-time-budget` for the scrolling page: scroll smoothing ignores fast-forwarded time and the frame comes out black). For scroll and tap, drive a real-time session (puppeteer-core with the installed Chrome).
- If the preview pane is hidden, the browser pauses frame-driven animation: the eye will look frozen. That is the pane, not a bug.

## Things that have gone wrong before (learn from them)

- `workflow-3d` first shipped as `<script type="module" src="js/main.js">` with a CDN import map. Opened by double-click (`file://`) browsers block module scripts, and the page showed "3D view could not start" even though WebGL worked. Fix: classic scripts only, everything bundled. Do not go back to ES modules or CDN imports for that page.

- Treating the closed-eye file as "the eye" produced a bright smear. The two source files are two frames of one eye.
- Sizing the eye canvas with `getBoundingClientRect()` during the power-on animation gave a 2px-tall canvas stretched into vertical stripes. Use `offsetWidth/offsetHeight`.
- Screen-blended dots and noise turned the blacks milky. The texture is now dark grid lines (multiply-style), not light dots.
- On phones the parts must have `left:0; top:0`, otherwise they keep their desktop offsets and leave the screen.

## Open items

- `text.userName` is "VISITOR". The owner asked to change it from "VIKTOR" but has not said to what.
- Fonts load from Google Fonts (Share Tech Mono); offline it falls back to Consolas.
