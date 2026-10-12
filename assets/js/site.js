/* Automation Protocol — engine.
   Reads window.SITE_CONFIG (site.config.js) and window.EYE (assets/js/eye-data.js).
   To change words, colours, filter strength, eye behaviour or timings, edit site.config.js, not this file.

   Sections: 1 helpers · 2 apply config · 3 eye (ASCII, blink, pupil tracking) · 4 noise + glitch
             5 HUD (boot sequence, idle life, workflow run) · 6 boot

   URL switches for testing:  ?still  = no animation, eye open, everything in its resting state
                              ?closed = with ?still, show the eye closed
                              ?look=x,y = with ?still, fix the gaze (-1..1 each) */
(function () {
  "use strict";

  var C = window.SITE_CONFIG;
  var stage = document.getElementById("stage");
  if (!C) {
    console.error("site.config.js did not load: showing the static fallback text.");
    if (stage) stage.classList.remove("booting");
    return;
  }

  /* ------------------------------------------------------------------ 1. helpers */
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var root = document.documentElement;
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var q = location.search;
  var still = /[?&]still\b/.test(q);
  var startClosed = /[?&]closed\b/.test(q);
  var lookParam = (q.match(/[?&]look=(-?[\d.]+),(-?[\d.]+)/) || []).slice(1).map(Number);
  var calm = reduced || still;                       // no timed animation at all
  var wait = function (ms) { return new Promise(function (r) { setTimeout(r, calm ? 0 : ms); }); };
  var pad2 = function (n) { return (n < 10 ? "0" : "") + n; };
  var rand = function (a, b) { return a + Math.random() * (b - a); };
  var clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
  var smooth = function (t) { return t * t * (3 - 2 * t); };
  var setText = function (id, v) { var el = document.getElementById(id); if (el && v != null) el.textContent = v; };

  function b64bytes(s) {
    var bin = atob(s), out = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }

  /* ------------------------------------------------------------------ 2. apply config (text, colours, filter) */
  function applyConfig() {
    var T = C.text, k;
    for (k in C.colors) root.style.setProperty("--" + k, C.colors[k]);

    var F = C.filter;
    root.style.setProperty("--grid", F.gridSize + "px");
    root.style.setProperty("--grid-a", F.gridStrength);
    root.style.setProperty("--scan-a", F.scanlines);
    root.style.setProperty("--soft", F.softness + "px");
    root.style.setProperty("--glow", F.glow);
    root.style.setProperty("--ab", F.aberration);
    root.style.setProperty("--vig", F.vignette);
    root.style.setProperty("--noise", F.noise);
    root.classList.toggle("no-flicker", !F.flicker || calm);
    root.classList.toggle("no-roll", !F.rollBar || calm);

    setText("t-user-label", T.userLabel); setText("t-user-name", T.userName); setText("badge", T.badge);
    setText("t-notes", T.tabs.notes); setText("t-engine", T.tabs.engine);
    $$("#t-codes b").forEach(function (b, i) { if (T.tabs.codes[i] != null) b.textContent = T.tabs.codes[i]; });
    setText("headline", T.headline);
    setText("counter", T.counter.value + "/" + T.counter.total);
    setText("t-proc-label", T.process.label); setText("t-time-label", T.process.timeLabel);
    setText("pr-time", T.process.time); setText("pr-state", T.process.done); setText("t-online", T.process.online);
    setText("t-model", T.model); setText("t-small", T.smallCode);
    setText("sts-title", T.statusBox.title); setText("sts-t", T.statusBox.idle);
    var tb = $$("#test > *"); if (tb[0]) tb[0].textContent = T.testBox[0]; if (tb[1]) tb[1].textContent = T.testBox[1];
    setText("t-cmd", T.command.label); setText("enter", T.command.button);
    ["t-bar1", "t-bar2", "t-bar3", "t-bar4"].forEach(function (id, i) { setText(id, T.bars[i]); });
    setText("t-console", T.console.label); setText("console", T.console.idle);

    // status rows
    var ul = $("#status"); ul.textContent = "";
    T.status.forEach(function (row) {
      var li = document.createElement("li");
      if (row.bar) { li.className = "r3 redrow"; li.appendChild(document.createElement("i")).className = "redbar"; }
      else {
        li.className = "r" + (row.level || 1);
        li.appendChild(document.createElement("span")).textContent = row.label;
        li.appendChild(document.createElement("b")).textContent = row.value;
      }
      ul.appendChild(li);
    });
    // check boxes
    var ol = $("#checks"); ol.textContent = "";
    T.checks.forEach(function (pair) {
      var li = document.createElement("li");
      li.appendChild(document.createElement("b")).textContent = pair[0];
      li.appendChild(document.createElement("span")).textContent = pair[1];
      ol.appendChild(li);
    });
  }

  /* ------------------------------------------------------------------ 3. the eye
     Two ASCII frames of the same eye: open and closed. The open frame is drawn once; the cells inside the
     eye opening (sclera, iris, pupil) are redrawn whenever the gaze moves, sampling the open frame through
     a smooth warp centred on the iris, so the iris slides under the eyelids. A blink wipes the closed frame
     down over it. A small blurred copy on a second canvas gives the bloom. */
  var Eye = { blink: function () {}, open: function () {} };

  function initEye() {
    var E = window.EYE, cfg = C.eye, box = $("#eye-box"), canvas = $("#eye"), bloom = $("#bloom");
    if (!E || !canvas) return;
    var ctx = canvas.getContext("2d"), bctx = bloom.getContext("2d");
    var W = E.w, H = E.h, N = W * H, ASPECT = 0.6;               // a cell is 0.6 wide for every 1 tall
    var openC = E.open.c, openK = b64bytes(E.open.k), closedC = E.closed.c, closedK = b64bytes(E.closed.k);
    var mask = b64bytes(E.mask), iris = E.iris;
    var maskCells = [], rowMin = H, rowMax = 0, k;
    for (k = 0; k < N; k++) if (mask[k]) { maskCells.push(k); var r0 = (k / W) | 0; if (r0 < rowMin) rowMin = r0; if (r0 > rowMax) rowMax = r0; }
    var lidTop = Math.max(0, rowMin - 3), lidBottom = Math.min(H, rowMax + 4);

    // place the box so the iris centre lands on (cfg.x, cfg.y)
    var hUnits = cfg.width * H / (W * ASPECT);
    var fx = (iris.cx + 0.5) / W, fy = (iris.cy + 0.5) / H;
    box.style.setProperty("--w", cfg.width); box.style.setProperty("--h", hUnits);
    box.style.setProperty("--x", cfg.x - fx * cfg.width); box.style.setProperty("--y", cfg.y - fy * hUnits);
    root.style.setProperty("--eye-cx", (fx * 100).toFixed(2) + "%"); root.style.setProperty("--eye-cy", (fy * 100).toFixed(2) + "%");
    root.style.setProperty("--eye-fx", (cfg.fadeX * 100) + "%"); root.style.setProperty("--eye-fy", (cfg.fadeY * 100) + "%");
    root.style.setProperty("--eye-o", cfg.opacity); root.style.setProperty("--eye-bloom", cfg.bloom);

    // colour of one cell: exposure and contrast, then mixed towards HUD green
    function fills(K, gain) {
      var out = new Array(N), tint = clamp(cfg.greenTint, 0, 1);
      for (var i = 0; i < N; i++) {
        var r = K[i * 3], g = K[i * 3 + 1], b = K[i * 3 + 2];
        var l = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        if (l < 0.03) { out[i] = null; continue; }
        var f = cfg.brightness * gain * Math.pow(l, cfg.contrast - 1);
        r *= f; g *= f; b *= f;
        var l2 = Math.min(1, l * f * 1.15);
        r = r + (l2 * 70 - r) * tint; g = g + (l2 * 255 - g) * tint; b = b + (l2 * 150 - b) * tint;
        out[i] = "rgba(" + Math.min(255, r | 0) + "," + Math.min(255, g | 0) + "," + Math.min(255, b | 0) + "," + Math.min(1, 0.32 + l * 1.3).toFixed(2) + ")";
      }
      return out;
    }
    var openFill = fills(openK, 1), closedFill = fills(closedK, cfg.closedGain == null ? 0.36 : cfg.closedGain);

    var cw = 0, ch = 0, font = "", openCv, closedCv, irisCv, irisCtx, built = false, irisKey = "";
    function layer() {
      var c = document.createElement("canvas"); c.width = canvas.width; c.height = canvas.height;
      var x = c.getContext("2d"); x.font = font; x.textAlign = "center"; x.textBaseline = "middle";
      return x;
    }
    function build() {
      // layout size, not getBoundingClientRect: the power-on animation squashes the stage while this runs
      var bw = box.offsetWidth, bh = box.offsetHeight;
      if (!bw || !bh) return;
      var dpr = Math.min(window.devicePixelRatio || 1, 2, 1700 / bw);
      canvas.width = Math.round(bw * dpr); canvas.height = Math.round(bh * dpr);
      bloom.width = Math.max(64, Math.round(canvas.width / 6)); bloom.height = Math.max(36, Math.round(canvas.height / 6));
      cw = canvas.width / W; ch = canvas.height / H;
      font = Math.max(4, Math.round(ch * 1.04)) + 'px "Share Tech Mono", Consolas, monospace';
      var a = layer(), b = layer(), col, row;
      for (var i = 0; i < N; i++) {
        col = i % W; row = (i - col) / W;
        if (!mask[i] && openFill[i]) { a.fillStyle = openFill[i]; a.fillText(openC[i], (col + 0.5) * cw, (row + 0.5) * ch); }
        if (closedFill[i]) { b.fillStyle = closedFill[i]; b.fillText(closedC[i], (col + 0.5) * cw, (row + 0.5) * ch); }
      }
      openCv = a.canvas; closedCv = b.canvas;
      irisCtx = layer(); irisCv = irisCtx.canvas; irisKey = "";
      built = true;
    }

    // redraw the eyeball cells for a gaze offset (sx columns, sy rows)
    function drawIris(sx, sy) {
      irisCtx.clearRect(0, 0, irisCv.width, irisCv.height);
      for (var j = 0; j < maskCells.length; j++) {
        var i = maskCells[j], col = i % W, row = (i - col) / W;
        var dx = (col - iris.cx) * ASPECT, dy = row - iris.cy;
        var d = Math.sqrt(dx * dx + dy * dy) / iris.r;
        var w = d <= 0.8 ? 1 : d >= 1.75 ? 0 : 1 - smooth((d - 0.8) / 0.95);
        var sc = Math.round(col - sx * w), sr = Math.round(row - sy * w), src = sr * W + sc;
        if (sc < 0 || sc >= W || sr < 0 || sr >= H || !mask[src]) src = i;
        var fill = openFill[src];
        if (!fill) continue;
        irisCtx.fillStyle = fill;
        irisCtx.fillText(openC[src], (col + 0.5) * cw, (row + 0.5) * ch);
      }
    }

    // gaze
    var T = cfg.track, gx = 0, gy = 0, tx = 0, ty = 0, pointer = null, lastMove = -1e9, nextGlance = 0;
    window.addEventListener("pointermove", function (e) { pointer = { x: e.clientX, y: e.clientY }; lastMove = performance.now(); }, { passive: true });
    function aim(now) {
      if (lookParam.length === 2) { tx = lookParam[0] * T.rangeX; ty = lookParam[1] * T.rangeY; gx = tx; gy = ty; return; }
      if (!T.enabled) return;
      if (pointer && now - lastMove < T.idleAfterSec * 1000) {
        var r = box.getBoundingClientRect();
        var vx = (pointer.x - (r.left + fx * r.width)) / T.reachPx, vy = (pointer.y - (r.top + fy * r.height)) / T.reachPx;
        var len = Math.sqrt(vx * vx + vy * vy); if (len > 1) { vx /= len; vy /= len; }
        tx = vx * T.rangeX; ty = vy * T.rangeY;
      } else if (!calm && now > nextGlance) {                    // nobody is moving the pointer: glance around
        var far = Math.random() < 0.3;
        tx = far ? rand(-T.rangeX, T.rangeX) * 0.8 : rand(-T.rangeX, T.rangeX) * 0.3;
        ty = rand(-T.rangeY, T.rangeY) * (far ? 0.6 : 0.25);
        nextGlance = now + rand(T.idleEverySec[0], T.idleEverySec[1]) * 1000;
      }
      gx += (tx - gx) * T.ease; gy += (ty - gy) * T.ease;
    }

    // blink: lid goes 0 (open) -> 1 (closed) -> 0
    var B = cfg.blink, lid = (still && !startClosed) ? 0 : 1, phase = null, phaseStart = 0, held = !still, nextBlink = Infinity, again = false, openMs = B.openMs;
    function startBlink(now) { if (phase || held) return; phase = "close"; phaseStart = now; openMs = B.openMs; again = Math.random() < B.doubleChance; }
    function schedule(now) { nextBlink = B.enabled && !calm ? now + rand(B.everySec[0], B.everySec[1]) * 1000 : Infinity; }
    function stepBlink(now) {
      if (held) { lid = 1; return; }
      if (!phase) { if (now > nextBlink) startBlink(now); return; }
      var t = now - phaseStart;
      if (phase === "close") { lid = clamp(t / B.closeMs, 0, 1); lid = lid * lid; if (t >= B.closeMs) { phase = "hold"; phaseStart = now; } }
      else if (phase === "hold") { lid = 1; if (t >= B.holdMs) { phase = "open"; phaseStart = now; } }
      else {
        lid = Math.pow(1 - clamp(t / openMs, 0, 1), 2.2);
        if (t >= openMs) { lid = 0; phase = null; if (again) { again = false; nextBlink = now + 110; } else schedule(now); }
      }
    }
    Eye.blink = function () { if (!calm) startBlink(performance.now()); };
    Eye.open = function (ms) {                                     // used by the boot sequence: the eye starts shut
      if (!held) return;
      held = false; again = false;
      if (calm) { lid = 0; phase = null; frame(performance.now()); return; }
      phase = "open"; phaseStart = performance.now(); openMs = ms || 420;
    };

    var lastBloom = 0;
    function frame(now) {
      if (!built) return;
      aim(now); stepBlink(now);
      var qx = Math.round(gx * 3) / 3, qy = Math.round(gy * 3) / 3, key = qx + "," + qy;
      if (key !== irisKey) { irisKey = key; drawIris(qx, qy); }
      ctx.globalCompositeOperation = "source-over"; ctx.globalAlpha = 1;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.globalAlpha = calm ? 1 : 0.92 + Math.random() * 0.08;    // phosphor shimmer
      ctx.drawImage(openCv, 0, 0); ctx.drawImage(irisCv, 0, 0);
      if (lid > 0.001) {                                           // eyelid: the closed frame, wiped down with a curved edge
        var y0 = lidTop * ch, y1 = lidBottom * ch, edge = y0 + (y1 - y0) * lid, sag = ch * 3.2 * (1 - lid);
        ctx.save();
        ctx.beginPath(); ctx.moveTo(0, y0); ctx.lineTo(canvas.width, y0); ctx.lineTo(canvas.width, edge - sag);
        ctx.quadraticCurveTo(canvas.width * fx, edge + sag * 1.6, 0, edge - sag); ctx.closePath(); ctx.clip();
        ctx.clearRect(0, y0, canvas.width, y1 - y0 + ch * 6);
        ctx.drawImage(closedCv, 0, 0);
        ctx.restore();
      }
      ctx.globalAlpha = 1;
      if (calm || now - lastBloom > 60) { lastBloom = now; bctx.clearRect(0, 0, bloom.width, bloom.height); bctx.drawImage(canvas, 0, 0, bloom.width, bloom.height); }
    }
    var visible = true;
    document.addEventListener("visibilitychange", function () { visible = !document.hidden; });
    function loop(now) { if (visible) frame(now); requestAnimationFrame(loop); }

    var rt;
    window.addEventListener("resize", function () { clearTimeout(rt); rt = setTimeout(function () { build(); frame(performance.now()); }, 200); });

    function start() {
      build();
      if (still) { held = startClosed; lid = startClosed ? 1 : 0; frame(performance.now()); return; }
      if (reduced) { held = false; lid = 0; }
      schedule(performance.now() + 1500);
      requestAnimationFrame(loop);
    }
    if (document.fonts && document.fonts.load) {
      var done = false, go = function () { if (!done) { done = true; start(); } };
      document.fonts.load('16px "Share Tech Mono"').then(go, go); setTimeout(go, 1500);
    } else start();
  }

  /* ------------------------------------------------------------------ 4. grain and signal glitch */
  function initNoise() {
    var c = $("#noise");
    if (!c || !(C.filter.noise > 0)) return;
    var w = 320, h = 180; c.width = w; c.height = h;
    var x = c.getContext("2d"), img = x.createImageData(w, h), d = img.data;
    function draw() {
      for (var i = 0; i < d.length; i += 4) {
        var v = Math.random() * 255;
        d[i] = v * 0.7; d[i + 1] = v; d[i + 2] = v * 0.8; d[i + 3] = Math.random() < 0.55 ? 255 : 0;
      }
      x.putImageData(img, 0, 0);
    }
    draw();
    if (!calm) setInterval(draw, 110);
  }

  function initGlitch() {
    var G = C.filter.glitch;
    if (calm || !G || !G.enabled) return;
    (function next() {
      setTimeout(function () {
        stage.classList.add("glitch");
        setTimeout(function () { stage.classList.remove("glitch"); }, 300);
        next();
      }, rand(G.minGapSec, G.maxGapSec) * 1000);
    })();
  }

  /* ------------------------------------------------------------------ 5. HUD: boot sequence, idle life, workflow run */
  function initHud() {
    var T = C.text, M = C.motion;
    var headline = $("#headline"), counter = $("#counter"), con = $("#console"), badge = $("#badge");
    var chevs = $$("#chevs i"), pips = $$("#pips i"), checks = $$("#checks li"), rows = $$("#status li:not(.redrow)");
    var pct = $("#pr-pct"), time = $("#pr-time"), state = $("#pr-state"), ghost = $("#pr-ghost"), sts = $("#sts-t");
    var form = $("#cmd"), input = $("#cmd-input"), echo = $("#echo");
    var spans = checks.map(function (li) { return $("span", li); });
    var count = T.counter.value, busy = true;                     // busy = booting or running: idle loops stand down
    var REST = ["t", "", "", "", "mid", "on", "on", "", "on"];    // resting chevron pattern, as in the reference
    var restSeconds = (function (s) { var p = String(s).split(":"); return (+p[0] || 0) * 60 + (+p[1] || 0); })(T.process.time);

    function setChevs(fn) { chevs.forEach(function (c, i) { c.className = fn(i) || ""; }); }
    function setPips(n) { pips.forEach(function (p, i) { p.className = i < n ? "on" : i === n ? "half" : ""; }); }
    function rest() {
      setChevs(function (i) { return REST[i]; });
      checks.forEach(function (li, i) { li.className = ""; spans[i].textContent = T.checks[i][1]; });
      rows.forEach(function (r) { r.classList.remove("live"); $("b", r).style.visibility = ""; });
      pct.textContent = "100%"; time.textContent = T.process.time; state.textContent = T.process.done;
      sts.textContent = T.statusBox.idle; con.textContent = T.console.idle; headline.textContent = T.headline;
      setPips(4);
    }
    function typeTo(text) {
      if (calm) { headline.textContent = text; return Promise.resolve(); }
      return new Promise(function (resolve) {
        var i = 0;
        (function tick() { headline.textContent = text.slice(0, ++i); if (i < text.length) setTimeout(tick, M.typeMs); else resolve(); })();
      });
    }
    function countUp(ms, onStep) {                                // 0..1 over ms
      return new Promise(function (resolve) {
        var t0 = performance.now();
        (function tick() { var p = clamp((performance.now() - t0) / ms, 0, 1); onStep(p); if (p < 1) setTimeout(tick, 33); else resolve(); })();
      });
    }

    /* ---- power-on: the tube lights, parts switch on in order, readouts count up, the eye opens */
    function boot() {
      if (!M.boot || calm) { stage.classList.remove("booting"); rest(); Eye.open(1); busy = false; return Promise.resolve(); }
      var k = 1 / (M.bootSpeed || 1), groups = {};
      $$("[data-b]", stage).forEach(function (el) { (groups[el.dataset.b] = groups[el.dataset.b] || []).push(el); });
      var order = Object.keys(groups).map(Number).sort(function (a, b) { return a - b; });
      var has = function (n, node) { return groups[n].some(function (el) { return el === node || el.contains(node); }); };
      headline.textContent = ""; pct.textContent = "0%"; time.textContent = "00:00"; state.textContent = T.process.running;
      setChevs(function () { return ""; }); setPips(0);
      rows.forEach(function (r) { $("b", r).style.visibility = "hidden"; });
      stage.classList.add("poweron");
      setTimeout(function () { stage.classList.remove("poweron"); }, 700);
      setTimeout(function () { Eye.open(520 * k); }, 900 * k);

      var jobs = order.map(function (n, idx) {
        return wait((480 + idx * 115) * k).then(function () {
          groups[n].forEach(function (el) { el.classList.add("b-on"); });
          if (has(n, headline)) return typeTo(T.headline);
          if (rows[0] && has(n, rows[0])) {
            return rows.reduce(function (p, r) { return p.then(function () { $("b", r).style.visibility = ""; return wait(70 * k); }); }, wait(120 * k));
          }
          if (has(n, pct)) {
            return countUp(1250 * k, function (p) {
              pct.textContent = Math.round(p * 100) + "%";
              var s = Math.round(p * restSeconds); time.textContent = pad2(Math.floor(s / 60)) + ":" + pad2(s % 60);
              var lit = Math.round(p * chevs.length); setChevs(function (i) { return i < lit ? "on" : ""; });
              setPips(Math.round(p * 4));
            }).then(function () { state.textContent = T.process.done; });
          }
          if (checks[0] && has(n, checks[0])) {
            return checks.reduce(function (p, li) {
              return p.then(function () { li.classList.add("on"); return wait(85 * k); }).then(function () { li.classList.remove("on"); });
            }, wait(60 * k));
          }
        });
      });
      return Promise.all(jobs).then(function () { return wait(250 * k); }).then(function () {
        stage.classList.remove("booting"); rest(); busy = false;
      });
    }

    /* ---- idle life */
    function idle() {
      if (calm) return;
      var head = -6;                                               // chevrons: a bright pair marches across, then rests
      setInterval(function () {
        if (busy) return;
        head++;
        if (head > chevs.length + 1) { if (head > chevs.length + 14) head = -1; setChevs(function (i) { return REST[i]; }); return; }
        setChevs(function (i) { return i === head || i === head - 1 ? "on" : i === head - 2 ? "mid" : i === 0 ? "t" : ""; });
      }, M.chevronStepMs);
      var pipN = 4;
      setInterval(function () { if (busy) return; pipN = pipN >= 6 ? 3 : pipN + 1; setPips(pipN); }, 1400);
      setInterval(function () { if (!busy) ghost.textContent = (1000 + Math.floor(Math.random() * 8999)) + "." + Math.floor(Math.random() * 9); }, 1700);
      setInterval(function () {
        if (busy || rows.length < 6) return;
        var r = rows[5 + Math.floor(Math.random() * (rows.length - 5))];
        r.style.opacity = "0.3"; setTimeout(function () { r.style.opacity = ""; }, 140);
      }, 1300);
      var base = parseInt(T.badge, 10);
      if (!isNaN(base)) setInterval(function () { if (!busy) badge.textContent = base - 2 + Math.floor(Math.random() * 5); }, 2300);
    }

    /* ---- a workflow run (Enter) */
    function run(text) {
      if (busy) return Promise.resolve();
      busy = true;
      if (C.eye.blink.onRunStart) Eye.blink();
      checks.forEach(function (li, i) { li.className = ""; spans[i].textContent = T.checks[i][1]; });
      rows.forEach(function (r) { r.classList.remove("live"); });
      state.textContent = T.process.running; pct.textContent = "0%"; time.textContent = "00:00"; sts.textContent = T.statusBox.running;
      con.textContent = text ? T.console.received + text.toUpperCase() : T.console.started;
      setChevs(function () { return ""; });
      var started = Date.now();
      var timer = setInterval(function () { var s = Math.floor((Date.now() - started) / 1000); time.textContent = pad2(Math.floor(s / 60)) + ":" + pad2(s % 60); }, 250);
      var p = typeTo(T.headlineRunning);
      checks.forEach(function (li, i) {
        p = p.then(function () {
          if (i > 0) { checks[i - 1].classList.remove("on"); checks[i - 1].classList.add("done"); spans[i - 1].textContent = T.checkDone; }
          li.classList.add("on"); spans[i].textContent = T.checkRunning;
          var share = (i + 1) / checks.length, lit = Math.round(share * chevs.length), upto = Math.round(share * rows.length);
          setChevs(function (j) { return j < lit ? "on" : ""; });
          pct.textContent = Math.round(share * 100) + "%";
          rows.forEach(function (r, j) { r.classList.toggle("live", j < upto); });
          setPips(Math.round(share * 6));
          return wait(M.runStepMs);
        });
      });
      return p.then(function () {
        clearInterval(timer);
        var last = checks.length - 1;
        if (last >= 0) { checks[last].classList.remove("on"); checks[last].classList.add("done"); spans[last].textContent = T.checkDone; }
        state.textContent = T.process.done; sts.textContent = T.statusBox.done; con.textContent = T.console.idle;
        count += 1; counter.textContent = count + "/" + T.counter.total;
        return typeTo(T.headlineDone);
      }).then(function () { return wait(1700); })
        .then(function () { return typeTo(T.headline); })
        .then(function () { rest(); busy = false; });
    }

    // the typed text is mirrored into the visible terminal line; the real input sits invisibly on top
    input.addEventListener("input", function () { echo.textContent = input.value; });
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (busy) return;
      var text = input.value.trim();
      input.value = ""; echo.textContent = "";
      run(text);
    });
    form.addEventListener("click", function () { input.focus(); });

    boot().then(function () {
      idle();
      if (!window.matchMedia("(max-width: 760px), (max-aspect-ratio: 1/1)").matches) input.focus({ preventScroll: true });
    });
  }

  /* ------------------------------------------------------------------ 6. boot */
  function start() { applyConfig(); initEye(); initNoise(); initGlitch(); initHud(); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})();
