/* Lab variant — patches the shared 3D config before the engine reads it.
   Loaded AFTER config.js (sets window.W3D) and BEFORE the engine. */
(function () {
  const C = window.W3D.CONFIG;
  C.scroll.screens = 6;         // page is 6 screens of scroll over the wall, then the footer
  C.scroll.hint = '';           // no hint text over the art

  // Refined pipeline lighting: eliminates harsh vertex/edge scattering and glare
  if (C.active) {
    C.active.light = 2.4;       // smooth traveling illumination (down from 9) to prevent vertex normal blowout
    C.active.wallGlow = 0.16;   // tighter, cleaner conduit wall glow
    C.active.intensity = 1.35;
  }
  if (C.post) {
    C.post.aberration = 0.001;  // removes chromatic color splitting on sharp pipeline corners
    if (C.post.bloom) {
      C.post.bloom.strength = 0.2; // reduced for smoother performance
      C.post.bloom.threshold = 0.99; // slightly higher to avoid overbright
    }
  }
  // Refined node bursts: subtle elegant pulse instead of jagged starburst flare
  if (window.W3D.BURSTS) {
    window.W3D.BURSTS.forEach(b => { b.size = 0.45; });
  }
})();
