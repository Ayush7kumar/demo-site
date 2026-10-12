/* Lab chrome. Runs after the 3D engine (scroll-driven). Pure vanilla.
   - Morphs and shrinks the glass bar into a pill on scroll down
   - Cycles the accent (bar, orb, lens, markers) through the 3D's own palette as you scroll
   - Real-time seamless liquid glass magnifying lens cursor
   - Node tap card opens smoothly without any upward scroll jump
   - Translucent texture on bottom footer with live counter stats */
(function () {
  const W = window.W3D, D = document, root = D.documentElement;
  const $ = s => D.querySelector(s), $$ = s => [...D.querySelectorAll(s)];
  const clamp01 = v => Math.min(1, Math.max(0, v));

  /* accent cycle: walk the 3D palette as scroll progresses */
  const pal = (W && W.CONFIG && W.CONFIG.active && W.CONFIG.active.palette) || {
    orange: '#ff8a1e', teal: '#2fe0da', blue: '#5b9bff', purple: '#a594ff', pink: '#ff6fa0'
  };
  const stops = ['orange', 'teal', 'blue', 'purple', 'pink'].map(k => pal[k]).filter(Boolean);
  const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  const rgb = stops.map(hex);
  const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
  function accentAt(f) {
    const x = clamp01(f) * (rgb.length - 1), i = Math.min(rgb.length - 2, Math.floor(x)), c = mix(rgb[i], rgb[i + 1], x - i);
    return `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
  }

  const dock = $('#dock');
  const scrollMax = () => (root.scrollHeight - innerHeight) || 1;

  /* Dock bar shrinks on scroll down */
  function onScroll() {
    const y = window.scrollY, f = y / scrollMax();
    const p = Math.min(1, y / 140);
    if (dock) {
      dock.style.setProperty('--p', p.toFixed(3));
      dock.classList.toggle('compact', y > 40);
    }
    root.style.setProperty('--accent', accentAt(f));
  }
  let ticking = false;
  addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => { onScroll(); ticking = false; });
  }, { passive: true });
  addEventListener('resize', onScroll);
  onScroll();

  /* Prevent node tap card from jumping or triggering page scroll */
  const card = $('#card');
  if (card) {
    card.addEventListener('focusin', e => e.preventDefault());
    card.addEventListener('pointerdown', e => e.stopPropagation());
  }

  /* footer: stat counter display */
  const pad2 = v => String(v).padStart(2, '0');
  $$('#end .n[data-count]').forEach(el => {
    const to = +el.dataset.count;
    el.textContent = el.dataset.pad ? pad2(to) : to;
  });

  $('#orb').addEventListener('click', () => D.body.classList.toggle('light'));
  $$('#dock a[href^="#"], #end a[href^="#"]').forEach(a => a.addEventListener('click', e => {
    const href = a.getAttribute('href');
    if (href === '#end') {
      e.preventDefault();
      window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' });
    } else if (href && href !== '#') {
      const t = $(href);
      if (t) {
        e.preventDefault();
        t.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }));

  /* ---------------------------------------------------------------- seamless liquid-glass magnifying lens cursor */
  if (matchMedia('(pointer: fine)').matches) {
    D.body.classList.add('fine');
    const lens = $('#lens');
    const label = $('#lens span');
    const lensCv = $('#lens-cv');
    const lensCtx = lensCv ? lensCv.getContext('2d') : null;

    let x = innerWidth / 2, y = innerHeight / 2, tx = x, ty = y;
    let isHot = false;
    const cvSize = 140;

    if (lensCv) {
      lensCv.width = cvSize;
      lensCv.height = cvSize;
    }

    addEventListener('pointermove', e => {
      tx = e.clientX;
      ty = e.clientY;
      const hit = e.target.closest('[data-cursor]');
      if (hit) {
        isHot = true;
        lens.className = 'hot';
        label.textContent = hit.dataset.cursor;
      } else {
        isHot = false;
        lens.className = '';
        label.textContent = '';
      }
    }, { passive: true });

    addEventListener('pointerdown', () => { if (lens) lens.style.scale = '.88'; });
    addEventListener('pointerup', () => { if (lens) lens.style.scale = '1'; });

    let stageCanvas = null;

    function renderMagnifier() {
      if (!lensCtx || isHot) return;
      if (!stageCanvas) stageCanvas = D.querySelector('#stage canvas');
      if (!stageCanvas || !stageCanvas.width || !stageCanvas.height) return;

      const r = 36;        // radius of lens in screen CSS pixels
      const zoom = 1.65;   // 1.65x optical magnification

      const scaleX = stageCanvas.width / innerWidth;
      const scaleY = stageCanvas.height / innerHeight;

      const sw = (2 * r / zoom) * scaleX;
      const sh = (2 * r / zoom) * scaleY;
      const sx = (x - r / zoom) * scaleX;
      const sy = (y - r / zoom) * scaleY;

      lensCtx.clearRect(0, 0, cvSize, cvSize);
      lensCtx.save();
      lensCtx.beginPath();
      lensCtx.arc(cvSize / 2, cvSize / 2, cvSize / 2 - 1, 0, Math.PI * 2);
      lensCtx.clip();

      try {
        lensCtx.drawImage(stageCanvas, sx, sy, sw, sh, 0, 0, cvSize, cvSize);
      } catch (err) {
        // Fallback gracefully
      }
      lensCtx.restore();
    }

    (function loop() {
      x += (tx - x) * 0.22;
      y += (ty - y) * 0.22;
      if (lens) {
        lens.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`;
      }
      renderMagnifier();
      requestAnimationFrame(loop);
    })();
  }
})();
