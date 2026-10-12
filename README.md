# Demo Site — Automation Protocol & Studio

A multi-experience web application featuring an authentic CRT retro-monitor AI workflow terminal HUD and an interactive 3D hardware workflow wall.

## Experiences

1. **Main Webpage (`/index.html`)**
   - Single-screen green "old monitor" CRT terminal HUD.
   - Interactive ASCII-art eye tracking cursor movements and blinking.
   - Command-line simulator driven by custom stage layout.
   - Pure vanilla HTML/CSS/JS with custom CRT filters, noise, and scanlines.

2. **Lab (`/lab/`)**
   - Experimental landing with the 3D automation wall as an active background.
   - Morphing liquid-glass navigation dock that adapts to scroll depth.
   - Signal flow animation and live hardware readout metrics.
   - Liquid-glass lens cursor.

3. **Workflow 3D Wall (`/workflow-3d/`)**
   - Scroll-driven 3D hardware wall built with Three.js and GSAP.
   - Interactive nodes with glowing signal pulses, routing paths, and inspection readout cards.
   - Self-contained bundle (`dist/engine.js`) for offline and online compatibility.

## Project Structure

```
├── index.html            # Main CRT HUD terminal webpage
├── site.config.js        # Tunables and configuration for the terminal
├── assets/               # CSS, JS, and graphics for the terminal HUD
├── lab/                  # Experimental Lab experience
│   ├── index.html        # Lab interface
│   ├── css/lab.css       # Lab styles
│   └── js/               # Lab UI controller and overrides
├── workflow-3d/          # 3D workflow engine and standalone viewer
│   ├── index.html        # Standalone 3D wall viewer
│   ├── js/config.js      # Graph nodes, edges, routes, and camera track
│   ├── js/main.js        # 3D engine source
│   ├── js/textures.js    # Canvas icon and tile textures
│   └── dist/engine.js    # Pre-bundled 3D engine
├── tools/                # Build scripts (CSS compiler, eye data, esbuild)
├── source/               # Raw ASCII eye artwork sources
├── docs/                 # Design specs, plans, and reference material
└── logo-design/          # Logo explorations and generation tools
```

## Running Locally

Serve statically from the root folder:

```bash
# Using Python
python -m http.server 4173

# Or using Node.js
npx serve .
```

Navigate to:
- `http://localhost:4173/` for the Main Terminal HUD
- `http://localhost:4173/lab/` for the Lab
- `http://localhost:4173/workflow-3d/` for the 3D Wall
