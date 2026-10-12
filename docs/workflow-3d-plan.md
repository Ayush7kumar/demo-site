# Workflow 3D — master brief (v2)

This is the brief for rebuilding `workflow-3d/` into the owner's showpiece page. Read it before touching that page. Status: **phases 1 to 3 are built** (look, scroll, tap) with these defaults, because the owner said "create it" without answering the open questions: camera slides only at a fixed distance, hardware-wall look, tap shows a card first and the card's button opens the link. Not built: keyboard Tab through nodes, foreground hardware shapes, crisp-at-any-zoom text (labels are 2x canvas textures), phase 4 and phase 5.

## The goal in one paragraph

A dark wall of automation hardware, seen from one fixed low angle. Nodes are real objects mounted on the wall, joined by pipes. As the visitor scrolls down, an orange light travels through the pipes and the view slides down the wall with it. Tapping a node makes it glow and opens a small card with a link. It must look like a film render, hold up on a 4K screen, and be easy to re-skin later.

## Hard rules from the owner

1. **Do not change the angle.** The viewing angle is the one in `docs/reference/workflow-3d/ref-12-angle-closeup.webp`: camera low and to the left, looking up and to the right, near side on the left, rows sloping down to the right. Yaw, pitch, roll and lens are constants. The camera may only slide (pan along the wall) and, if the owner agrees, move slightly closer. No orbit, no rotation on scroll, no rotation on mouse move.
2. *(The owner said there were two rules and gave one. Ask for the second before building.)*
3. Scroll drives the light. Scroll down = the glow flows forward along the workflow. Scroll up = it flows back.
4. Tap a node = it glows. From there the visitor can open a website. Links are placeholders for now and the owner will edit them.
5. Everything must stay easy to customise: the owner will restyle and extend it heavily.

## Why the current build looks flat ("PS2")

The tool is not the problem; three.js is what the best 3D sites use. The build is the problem:

| What is wrong now | What a film-quality scene has |
|---|---|
| Nodes are 5 cm slabs with a flat picture on top | Thick bodies with bevels, a glass front, the icon set *behind* the glass |
| Nodes float on an empty black void | A real wall: panels, seams, surface grain, things mounted on it |
| Light is the same everywhere | Glow that lands on the wall and on neighbours; dark elsewhere |
| No shadows at all | Soft contact shadow under every node and pipe |
| Pipes are hair-thin unlit lines | Conduits with thickness, clamps and junction boxes |
| Nothing reflects | Glossy black surfaces picking up the orange and cyan |
| Blur is grainy | Clean lens blur with round highlights |
| Bright orange washes out to white | Colour grade that keeps orange orange |

Target look: `docs/reference/workflow-3d/ref-11-target-look-hardware-wall.webp`.

## What will be built

### 1. Camera (locked)
- Perspective lens, not orthographic. The references have strong perspective (near nodes large, far nodes small); an orthographic camera would be a different look and breaks rule 1.
- Angle constants measured once against `ref-12` and never animated.
- Scroll slides the camera down and right along the wall so the light stays in frame.
- Focus distance follows the light, so the lit node is sharp and the far side falls into blur.
- Mouse: a few centimetres of sideways drift for depth, no rotation. Off on touch screens.

### 2. The wall
- Dark panels with seams and bolts, built in code, laid out on the same grid as the nodes.
- Subtle surface grain so glow has something to land on.
- A few large out-of-focus hardware shapes in the near-left foreground for depth.

### 3. Nodes as objects
- Body 3 to 4 times thicker than now, bevelled, dark satin metal.
- Glass front plate with a glossy coat. The icon sits behind it and lights up.
- Each node stands off the wall on short posts, with a mounting bracket and tick-mark strip underneath (as in `ref-11`).
- Three states: idle, running (cyan), done (orange rim).
- Labels drawn as sharp text at any zoom.

### 4. Pipes
- Round conduits about 3 times thicker than now, right-angle routing with rounded corners (already in place).
- Clamps along long runs and a small box at each junction.
- Lit pipes get a bright core and light the wall along their length.

### 5. Light, shadow, reflection
- Contact shadow under every node and pipe.
- Glow pools on the wall under lit pipes and nodes.
- A small number of real moving lights following the head of the signal.
- Reflections from an environment map tuned for a dark room.
- Bloom only on the lit route and lit nodes. Idle parts stay crisp and dark.
- Colour grade that keeps deep blacks and saturated orange.

### 6. Scroll
- Page scroll position = position in the story. The engine already computes every frame from a single time value, so scroll replaces the clock.
- Smoothed so it glides instead of stepping with the wheel.
- When the visitor stops, idle life continues (small data dots, slight shimmer) but the story does not advance.
- Story steps are named, so later text can appear beside each step.

### 7. Tap and hover
- Hover (desktop): cursor changes, node lifts slightly, soft highlight.
- Tap or click: the node glows, the pipes touching it light up, everything else dims (spotlight), and a small card appears next to the node with its name, one line of description and an **Open** button.
- **Open** goes to that node's `url` in a new tab. Tap elsewhere or press Esc to close.
- Two steps on purpose: a stray tap on a phone must not throw the visitor off the site.
- Keyboard: Tab moves through nodes, Enter opens the card.

### 8. Resolution ("4K")
- A web page draws at the screen's own pixel count. On a 4K monitor this page will draw at full 4K; it cannot draw more pixels than the screen has.
- What makes it look sharp there: icons at twice today's resolution, text that stays crisp at any zoom, proper edge smoothing, and no blur noise.
- Three quality tiers picked automatically: high (desktop GPU), medium (laptop), low (phone). All three keep the same angle and layout.

### 9. Built to be customised
- One data file describes the whole wall: nodes (`id`, position, icon, title, description, `url`, state), connections, and the route the light takes. This already exists (`workflow-3d/js/config.js`) and gains `url`, `description` and theme values.
- One theme block: colours, glow strength, materials, blur, speeds.
- Icons can be the built-in drawings or the owner's own image files.
- An empty layer above the canvas for the owner's own menu, taskbar, widgets and type.
- A small public handle (`window.workflow3d`) so outside code can jump to a step, light a node, or pause.
- Stays plain three.js + GSAP in one bundled script. Works offline and by double-click.

## Advice the owner was given elsewhere, and what this plan does with it

| Suggestion | Decision | Reason |
|---|---|---|
| Orthographic (isometric) camera | **No** | Removes the perspective in the references. That is a change of angle. |
| Frosted see-through glass on every node | **No, glossy dark glass instead** | See-through glass redraws the whole scene an extra time. With 60 nodes at 4K it stutters. The references show dark glossy plates, not see-through ones. |
| Rewrite in React Three Fiber | **No** | Same engine underneath, no visual gain, a full rewrite, and it would stop the page opening by double-click. |
| A* / ELK.js automatic routing | **No** | The layout is hand-placed like the reference. Routing is already right-angled. |
| Selective bloom | **Yes** | Already works this way: only very bright parts bloom. |
| Scroll moves the light | **Yes** | Rule 3. The camera also has to slide, because the wall is taller than the screen. |
| Physical pipes | **Yes** | Section 4. |
| Spotlight focus on tap | **Yes** | Section 7. |
| Floating data card on tap | **Yes, simple version** | Section 7. Live data in the card can come later. |
| Structure under the pipes ("motherboard") | **Yes, as the wall** | Section 2. |
| Stack the workflow on several floors | **Not now** | Changes the composition away from the references. Can be revisited. |
| Data-driven JSON | **Yes** | Already the case, extended in section 9. |

## Extra features worth adding (owner picks)

- **Power-on intro**: on load the wall is dark, then panels and nodes switch on in a wave.
- **Step captions**: a short line of text for each story step, tied to scroll. Needs the owner's wording and type.
- **Progress rail**: a thin vertical line at the screen edge showing where you are in the workflow, with step names.
- **Link to a node**: `…/workflow-3d/#agent` opens with that node selected.
- **Auto-play**: if nobody scrolls for a while, the light runs by itself, and stops the moment they scroll.
- **Live mode later**: feed real run data from an automation tool so the wall shows actual executions.

## Honest limits

- `ref-11` is an offline render: every light ray is simulated, which takes seconds per frame. A browser has 16 milliseconds. Expect the same mood and materials and clearly real depth, not a pixel match.
- The finest detail in `ref-11` (mesh grilles, rivets, cable bundles) is hand-modelled art. Code-built parts cover panels, brackets, posts, clamps and boxes. If the owner later wants that last level, the route is modelled parts made in Blender and loaded as files; the page will be ready to accept them.
- Phones get the low tier: same picture, fewer effects.

## Build order (stop for approval after each)

1. **Look, one still frame.** Locked angle, new wall, new nodes, new pipes, shadows and glow, one moment of the story frozen. This is the risky part and decides whether the direction is right. No scroll, no tap yet.
2. **Scroll.** Scroll drives the light and slides the camera. Quality tiers.
3. **Tap.** Hover, tap glow, spotlight, card, links, keyboard.
4. **Polish.** Intro, 4K sharpness pass, phone pass, speed pass.
5. **Owner's layer.** Menu, taskbar, widgets, type, captions.

## Decisions needed from the owner before phase 1

1. What is the second rule?
2. Angle: lock to `ref-12` exactly, or to the wider view in `ref-3`/`ref-7`? (Same angle, different distance.) May the camera move closer during the scroll, or slide only?
3. Look: the heavy hardware wall of `ref-11`, or the cleaner flat-panel look of the video frames with real depth added? Or between the two?
4. Tap behaviour: glow and card first, then **Open** (recommended), or go straight to the website on first tap?
