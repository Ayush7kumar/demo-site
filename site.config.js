/* ==========================================================================
   SITE CONFIG — the one file to edit.
   Every word on the screen and every tunable (colours, filter, eye, motion)
   lives here. assets/js/site.js reads it on load; nothing else needs touching
   for normal customisation. Reload the page after saving.

   Positions and sizes of the HUD parts are NOT here: they are the --x --y --w --h
   numbers on each element in index.html (see docs/DESIGN.md for the layout map).
   ========================================================================== */
window.SITE_CONFIG = {

  /* ---------------------------------------------------------------- text */
  text: {
    userLabel: "USER:",
    userName: "VISITOR",                       // was "VIKTOR" in the reference
    badge: "82",

    tabs: {
      notes: "NOTES",
      codes: ["S-A.5", "S-B.9", "S-C.1", "S-D.2"],
      engine: "WORKFLOW ENGINE"
    },

    headline: "AUTOMATION PROTOCOL INITIATED",
    headlineRunning: "WORKFLOW RUNNING",       // shown while a run is in progress
    headlineDone: "WORKFLOW COMPLETE",         // shown briefly when a run ends
    counter: { value: 12, total: 886 },        // the small "12/886" under the headline

    /* right-hand status list. level: 1 = normal, 2 = bright, 3 = dim, 4 = dim (last row).
       { bar: true } draws the red bar instead of a text row. */
    status: [
      { label: "SYS:CORE",      value: "OK", level: 1 },
      { label: "SYS:MODULE",    value: "OK", level: 1 },
      { label: "NET:ONLINE",    value: "OK", level: 1 },
      { label: "DB: CONNECTED", value: "OK", level: 1 },
      { label: "LOG: READY",    value: "OK", level: 2 },
      { label: "CB1:188",       value: "OK", level: 3 },
      { label: "SOT:1H66",      value: "OK", level: 3 },
      { label: "SUT:PASS",      value: "OK", level: 3 },
      { bar: true },
      { label: "T08:159",       value: "OK", level: 4 }
    ],

    process: {
      label: "PROCESS",
      timeLabel: "TIME",
      time: "00:11",                            // resting value; also where the boot count-up stops (seconds)
      done: "COMPLETE",
      running: "RUNNING",
      online: "SYSTEM ONLINE"
    },

    model: "SR-A",
    smallCode: "4S208",

    /* the six boxes: [first line, second line] */
    checks: [
      ["CHK S/A", "SET"], ["CHK S/A", "READY"], ["CHK S/A", "READY"],
      ["CHK S/A", "SET"], ["CHK S/A", "SYNC"],  ["CHK S/A", "END"]
    ],
    checkRunning: "RUN",                        // second line while that box is active
    checkDone: "OK",                            // second line once that box has finished

    statusBox: { title: "SYSTEM STS", idle: "ONLINE_", running: "RUNNING_", done: "COMPLETE_" },
    testBox: ["SYS TEST", "ENTER PRM."],

    command: { label: "ENTER WORKFLOW", button: "ENTER" },
    bars: ["FL:588", "FL:849_PB", "FL:K98_A", "CORE INJECTION"],
    console: { label: "CONSOLE :", idle: "OK: ALL", received: "RECEIVED: ", started: "RUN STARTED" }
  },

  /* ---------------------------------------------------------------- colours
     Written to CSS variables of the same name (--hot, --pale, ...). */
  colors: {
    screen: "#0c1214",      // the tube itself; kept slightly lit so the pixel grid shows, as in the reference
    hot: "#b8ffcb",         // headline core
    hotGlow: "#2cff6e",     // glow colour around bright text
    text: "#c4ffd9",        // normal HUD text
    pale: "#a6eebb",        // box borders
    fill: "#53f66f",        // the solid bright box and active states
    badge: "#19d159",
    teal: "#10a37e",        // solid bars
    tealDark: "#0b7e66",
    user: "#35c46f",
    red: "#d11b35"
  },

  /* ---------------------------------------------------------------- screen filter (the "old monitor" look) */
  filter: {
    gridSize: 4,            // px between the dark pixel-grid lines. 3 = finer, 5 = chunkier
    gridStrength: 0.50,     // 0..1 darkness of those lines. This is the main texture from the reference
    scanlines: 0.10,        // 0..1 extra horizontal line darkness
    softness: 0.45,         // px of blur over the whole HUD (low-res video feel). 0 = razor sharp
    glow: 1.0,              // multiplier on text and line glow
    aberration: 1.0,        // multiplier on the red/blue colour fringe
    vignette: 0.92,         // 0..1 how black the corners get
    noise: 0.035,           // 0..1 animated grain
    flicker: true,          // tiny brightness flicker
    rollBar: true,          // slow light band rolling down the screen
    glitch: { enabled: true, minGapSec: 6, maxGapSec: 15 }
  },

  /* ---------------------------------------------------------------- the eye */
  eye: {
    x: 610, y: 482,         // where the centre of the iris sits, in stage units (1671 x 941)
    width: 780,             // width of the whole eye image in stage units. Bigger = larger ASCII letters
    opacity: 1,   
    brightness: 1.45,       // overall exposure of the eye
    contrast: 1.12,
    greenTint: 0.42,        // 0 = the eye's own colours, 1 = fully green like the HUD
    bloom: 0.55,            // soft glow copy on top
    closedGain: 0.36,       // exposure of the closed-eye frame relative to the open one (its export is much brighter)
    fadeX: 0.46, fadeY: 0.52, // how far (fraction of the image) the eye stays visible before fading to black

    track: {                // the iris follows the pointer
      enabled: true,
      rangeX: 9,            // max travel, in character columns
      rangeY: 3,            // max travel, in character rows
      ease: 0.14,           // 0..1 how quickly it catches up
      reachPx: 520,         // pointer distance at which the iris is at full travel
      idleAfterSec: 4,      // with no pointer movement it starts glancing around by itself
      idleEverySec: [1.4, 3.6]
    },

    blink: {
      enabled: true,
      everySec: [2.6, 6.5], // random gap between blinks
      closeMs: 95, holdMs: 55, openMs: 170,
      doubleChance: 0.18,   // chance of a quick second blink
      onRunStart: true      // blink when a workflow run starts
    }
  },

  /* ---------------------------------------------------------------- motion */
  motion: {
    boot: true,             // power-on sequence when the page loads
    bootSpeed: 1,           // 2 = twice as fast
    chevronStepMs: 130,     // speed of the marching chevrons in the process panel
    runStepMs: 620,         // time each of the six boxes stays active during a run
    typeMs: 26              // per-letter speed of the headline typing
  }
};
