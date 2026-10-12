/* Lab variant — patches the shared 3D config before the engine reads it.
   Loaded AFTER ../workflow-3d/js/config.js (sets window.W3D) and BEFORE the engine.
   The 3D stays the star (vivid, uncovered); the lab only adds chrome around it. Scroll drives the flow (default). */
(function () {
  const C = window.W3D.CONFIG;
  C.scroll.screens = 6;         // page is 6 screens of scroll over the wall, then the footer
  C.scroll.hint = '';           // no hint text over the art
})();
