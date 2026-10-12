# Design spec — Automation Protocol

The plan behind the page: what it should feel like, how it is laid out, and how each effect is built. Keep this in sync when the design changes.

## 1. Intent

A terminal from an imagined machine room, seen through an old display. The viewer should feel they have walked up to a running system that is watching them back.

- **Appeal:** one strong image (the eye) inside a dense, believable interface. Curiosity first, then the invitation to type.
- **Aesthetic:** early-2000s film HUD on a low-resolution LED/CRT panel. Monochrome green on near-black, one red warning accent.
- **Behaviour:** always slightly alive (blink, glance, marching chevrons, flicker), never busy. One clear action: type a task, press Enter.
- **Not:** a marketing page, a dashboard with real data, a game UI, or a crisp modern app.

References: `docs/reference/reference-layout-hires.png` (layout and wording), `docs/reference/reference-filter-look.png` (screen texture). Current state: `docs/reference/current-build.png`, `eye-states.png`.

## 2. Stage and layout

The stage is **1671 x 941 units**, the pixel size of the layout reference, so any position can be measured directly on that image. It scales to fit the window (`--u` = one unit). Every part is absolutely placed with `--x --y --w --h`.

| Part | x | y | w | h | Notes |
|---|---|---|---|---|---|
| Pips (top squares) | 513 | 29 | 180 | 18 | 7 squares, lit count cycles |
| USER label + name | 125 | 78 | 420 | 44 | 33u type |
| Badge | 571 | 82 | 61 | 30 | solid green, dark text |
| Top rule + arrow | 730 | 83 | 230 | 2 | arrow at 726,88 |
| Tab: NOTES | 121 | 137 | 91 | 25 | lighter teal |
| Tab: blank | 322 | 137 | 184 | 25 | |
| Tab: codes | 528 | 137 | 524 | 25 | slanted right end, 4 labels |
| Tab: engine | 1056 | 137 | 188 | 25 | slanted left end |
| Headline frame | 140 | 205 | 840 | 157 | 4 corner brackets, 47u type, counter at +695,+116 |
| Status list | 1299 | 205 | 187 | 277 | 10 rows incl. red bar |
| **Eye (iris centre)** | 610 | 482 | – | – | size from config `eye.width` |
| Process panel | 127 | 518 | 271 | 246 | readouts, 9 chevrons, SYSTEM ONLINE |
| Solo chevrons | 458 / 764 | 628 | 27 | 39 | bright one nudges |
| Model label | 1300 | 521 | 160 | 44 | "SR-A" |
| Check boxes x6 | 814 | 606 | 640 | 60 | 9u gaps |
| Status box (solid) | 814 | 681 | 147 | 74 | |
| Test box (outline) | 970 | 681 | 135 | 74 | |
| Small code + red bar | 1420 | 680 / 705 | 60 / 37 | 12 / 9 | |
| Command line | 112 | 787 | 1242 | 41 | real text input, mirrored |
| ENTER + arrow | 1362 / 1494 | 787 | 126 / 38 | 41 | |
| Bottom bars | 806 | 833 | 727 | 23 | 3 labelled, slants, CORE INJECTION |
| Console label / box | 97 / 95 | 843 / 864 | 90 / 128 | 14 / 21 | |

Composition: weight sits on a diagonal from the headline (top left) to the check boxes (bottom right). The eye fills the quiet centre-left. The right edge is a thin column of status. The command line is a full-width base that anchors everything.

**Phones** (narrow or portrait): the same parts reflow into one column in this order: user, badge, headline, status, process, check boxes, status boxes, command line, ENTER, console. Decoration, tabs and bars are hidden. The eye sits behind the headline at reduced strength.

## 3. Colour

| Token | Value | Use |
|---|---|---|
| `screen` | `#0c1214` | the tube, slightly lit so the grid shows |
| `hot` | `#b8ffcb` | headline core |
| `hotGlow` | `#2cff6e` | glow around bright text |
| `text` | `#c4ffd9` | normal HUD text |
| `pale` | `#a6eebb` | box borders |
| `fill` | `#53f66f` | solid box, active states, chevrons |
| `badge` | `#19d159` | badge |
| `teal` / `tealDark` | `#10a37e` / `#0b7e66` | solid bars (gradient) |
| `user` | `#35c46f` | USER line |
| `red` | `#d11b35` | the only warm colour: warning bars |
| `ink` | `#03150e` | dark text on solid bars |

Rule: brightness is rationed. Only the headline, the solid status box, the lit chevrons and the active check box are fully bright. Everything else is dim so those read.

## 4. Type

One face: **Share Tech Mono**, uppercase, small letter-spacing. Sizes in stage units: headline 47, USER 33, model 38, command line 21, SYSTEM ONLINE 19.5, status boxes 15, check boxes 13.5, panel text 13.5, status list 12.5, micro labels 11.

## 5. Screen filter (bottom to top)

1. **Stage glow** – every glyph has a green glow plus a faint red (left) and blue (right) fringe via `text-shadow`; boxes get the same via `box-shadow`. Scales with `filter.glow`, `filter.aberration`.
2. **Softness** – `blur(filter.softness)` on the whole stage for the low-res video feel, with a small contrast and saturation lift.
3. **Pixel grid** (`.fx-grid`) – dark 1px lines both ways every `filter.gridSize` px at `filter.gridStrength`. This is the signature texture.
4. **Scanlines** (`.fx-scan`) – extra horizontal lines every second grid row, slowly crawling.
5. **Roll bar** (`.fx-roll`) – a faint light band travelling down every 8.5 s.
6. **Grain** (`.fx-noise`) – a 320 x 180 noise canvas, stretched and redrawn ~9 times a second, at `filter.noise`.
7. **Vignette** (`.fx-vig`) – radial fall-off to black plus top and bottom shading.
8. **Flicker and glitch** – tiny opacity flicker on the stage; every 6–15 s a 0.28 s horizontal jump with a hue shift.

Guard rail: nothing in this stack may use a light, screen-blended fill over the whole frame at more than a few percent. That is what greys the blacks.

## 6. The eye

- **Source:** two ASCII exports of one photo, 213 x 72 characters, each character with its own colour: eye open (HUD reflected in the iris) and eye closed.
- **Drawing:** characters are drawn on a canvas in Share Tech Mono. Colour = source colour, exposure and contrast adjusted, then mixed towards HUD green by `eye.greenTint`. A radial mask fades the image to black beyond the eye.
- **Gaze:** the cells inside the eye opening (found automatically: cool, near-white or very dark cells near the centre) are redrawn through a smooth warp centred on the iris: full shift inside 0.8 of the iris radius, easing to none at 1.75. The iris slides under the lids and the white stretches slightly, so there are no holes. Travel is `eye.track.rangeX` columns and `rangeY` rows. With no pointer movement for a few seconds the eye glances around by itself.
- **Blink:** the closed frame is wiped down over the opening with a curved lower edge: ~95 ms down, 55 ms held, 170 ms up; random 2.6–6.5 s apart, sometimes double. Also blinks when a run starts. At page load the eye starts shut and opens during power-on.
- **Bloom:** a 1/6-size copy on a second canvas, blurred and screen-blended.

## 7. Motion

**Power-on (about 2.6 s):** a bright horizontal line opens into the picture; parts switch on in `data-b` order with a three-flash flicker; the headline types; status values tick in one by one; the process readout counts 0→100 % and 00:00→00:11 while the chevrons fill; the six boxes flash in sequence; the eye opens.

**Idle:** caret blink; a bright chevron pair marches across the process panel, then rests in the reference pattern; pips cycle; ghost digits change; dim status rows blip; the badge number wobbles by ±2; red bars stutter; the solo chevron nudges; blink, glance, flicker, roll bar, occasional glitch.

**Run (Enter):** headline types "WORKFLOW RUNNING"; the six boxes activate left to right (620 ms each) and turn to "OK"; chevrons and percentage fill; status rows light; the timer counts real seconds; the solid box reads RUNNING then COMPLETE; the console echoes the typed task; the counter goes up by one; headline "WORKFLOW COMPLETE", then back to rest.

**Reduced motion:** all timed animation is skipped; the page shows the resting state with the eye open (pointer tracking still works, since the user drives it).

## 8. Accessibility and limits

- Real `<form>`, labelled input, a real ENTER button; headline and console are live regions.
- Text is small and low-contrast by design in secondary areas; the headline and command line stay readable.
- The run is a simulation. Nothing typed is stored or sent.
