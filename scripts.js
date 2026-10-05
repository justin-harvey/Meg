/* Meghan Hair Studio — Win95 Desktop Manager */

var Desktop = (function () {
  'use strict';

  var zNext = 20;
  var startOpen = false;
  var state = {};          // { winId: { open, minimized, savedRect } }
  var lbPhotos = [];
  var lbIndex = 0;

  /* ── Public API ───────────────────────────────────────── */
  function open(id) {
    var win = document.getElementById(id);
    if (!win) return;
    if (!state[id]) state[id] = { open: false, minimized: false, savedRect: null };
    var s = state[id];

    var firstOpen = !s.open && !s.minimized;

    if (s.minimized) {
      win.classList.add('is-open');
      s.minimized = false;
    } else if (!s.open) {
      win.classList.add('is-open');
      s.open = true;
    }

    /* Center on touch devices when first opening — direct px, no transform,
       pointer:coarse covers landscape phones and tablets that exceed 768px */
    if (firstOpen && window.matchMedia('(pointer: coarse)').matches) {
      var vw = window.innerWidth;
      var vh = window.innerHeight;
      var mw = Math.round(vw * 0.92);
      win.style.position  = 'fixed';
      win.style.transform = '';
      win.style.width     = mw + 'px';
      win.style.height    = '';
      win.style.maxHeight = 'calc(88vh - 28px)';
      win.style.left      = Math.round((vw - mw) / 2) + 'px';
      win.style.top       = Math.round(vh * 0.04) + 'px';

      /* iframe windows have no intrinsic height — give them an explicit tall size */
      if (win.querySelector('.aim-iframe')) {
        win.style.height    = Math.round(vh * 0.82) + 'px';
        win.style.maxHeight = 'none';
      }
    }

    bringToFront(id);
    addTask(id);
  }

  function close(id) {
    var win = document.getElementById(id);
    if (!win) return;
    win.classList.remove('is-open', 'is-active', 'is-maximized', 'is-inactive');
    if (state[id]) { state[id].open = false; state[id].minimized = false; }
    removeTask(id);
  }

  function minimize(id) {
    var win = document.getElementById(id);
    if (!win) return;
    win.classList.remove('is-open', 'is-active');
    if (state[id]) state[id].minimized = true;
    var btn = document.querySelector('.tb-task[data-wid="' + id + '"]');
    if (btn) btn.classList.remove('is-active');
  }

  function maximize(id) {
    var win = document.getElementById(id);
    if (!win) return;
    if (win.classList.contains('is-maximized')) {
      win.classList.remove('is-maximized');
      var r = state[id] && state[id].savedRect;
      if (r) { win.style.top = r.top; win.style.left = r.left; win.style.width = r.width; win.style.height = r.height; win.style.transform = r.transform || ''; win.style.maxHeight = r.maxHeight || ''; }
    } else {
      if (state[id]) state[id].savedRect = { top: win.style.top, left: win.style.left, width: win.style.width, height: win.style.height, transform: win.style.transform, maxHeight: win.style.maxHeight };
      win.classList.add('is-maximized');
    }
    bringToFront(id);
  }

  function toggleStart() {
    startOpen ? closeStart() : openStart();
  }

  function closeStart() {
    var sm = document.getElementById('start-menu');
    var sb = document.getElementById('start-btn');
    if (sm) sm.classList.remove('is-open');
    if (sb) sb.classList.remove('is-active');
    startOpen = false;
  }

  /* ── Private helpers ──────────────────────────────────── */
  function openStart() {
    var sm = document.getElementById('start-menu');
    var sb = document.getElementById('start-btn');
    if (sm) sm.classList.add('is-open');
    if (sb) sb.classList.add('is-active');
    startOpen = true;
  }

  function bringToFront(id) {
    document.querySelectorAll('.win95').forEach(function (w) {
      w.classList.remove('is-active');
      if (w.classList.contains('is-open')) w.classList.add('is-inactive');
    });
    var win = document.getElementById(id);
    if (!win) return;
    win.classList.remove('is-inactive');
    win.classList.add('is-active');
    win.style.zIndex = ++zNext;

    document.querySelectorAll('.tb-task').forEach(function (b) { b.classList.remove('is-active'); });
    var btn = document.querySelector('.tb-task[data-wid="' + id + '"]');
    if (btn) btn.classList.add('is-active');
  }

  function addTask(id) {
    if (document.querySelector('.tb-task[data-wid="' + id + '"]')) {
      bringToFront(id);
      return;
    }
    var win = document.getElementById(id);
    var icon = win ? (win.querySelector('.win-icon') || {}).textContent || '' : '';
    var label = win ? (win.querySelector('.win-ttext') || {}).textContent || id : id;

    var btn = document.createElement('button');
    btn.className = 'tb-task is-active';
    btn.dataset.wid = id;
    btn.innerHTML = (icon ? '<span>' + icon + '</span> ' : '') + label;
    btn.addEventListener('click', function () {
      var s = state[id];
      var w = document.getElementById(id);
      if (s && s.minimized) { open(id); }
      else if (w && w.classList.contains('is-active')) { minimize(id); }
      else { open(id); }
    });
    document.getElementById('tb-tasks').appendChild(btn);
  }

  function removeTask(id) {
    var btn = document.querySelector('.tb-task[data-wid="' + id + '"]');
    if (btn) btn.remove();
  }

  /* Snap a transform-centered window to absolute px coords so drag/resize
     math works correctly. Call before reading offsetLeft/offsetTop. */
  function snapToPixels(win) {
    if (win.style.transform) {
      var r = win.getBoundingClientRect();
      win.style.transform = '';
      win.style.position  = 'fixed';
      win.style.left      = r.left + 'px';
      win.style.top       = r.top  + 'px';
      win.style.width     = r.width  + 'px';
      win.style.height    = r.height + 'px';
      win.style.maxHeight = '';
    }
  }

  /* ── Dragging ─────────────────────────────────────────── */
  function makeDraggable(win, handle) {
    var sx, sy, sl, st, dragging = false;

    handle.addEventListener('pointerdown', function (e) {
      if (e.target.closest('.win-btns')) return;
      if (win.classList.contains('is-maximized')) return;
      e.preventDefault();              /* must come first — before compositor decides gesture */
      e.stopPropagation();             /* don't let win95 pointerdown redundantly call bringToFront */
      snapToPixels(win);
      dragging = true;
      sx = e.clientX; sy = e.clientY;
      var r = win.getBoundingClientRect();
      sl = r.left; st = r.top;
      bringToFront(win.id);
      try { handle.setPointerCapture(e.pointerId); } catch (_) {}
    });

    handle.addEventListener('pointermove', function (e) {
      if (!dragging) return;
      var nl = sl + (e.clientX - sx);
      var nt = st + (e.clientY - sy);
      nl = Math.max(-(win.offsetWidth - 40), Math.min(window.innerWidth - 40, nl));
      nt = Math.max(0, Math.min(window.innerHeight - 50, nt));
      win.style.left = nl + 'px';
      win.style.top  = nt + 'px';
    });

    handle.addEventListener('pointerup',     function () { dragging = false; });
    handle.addEventListener('pointercancel', function () { dragging = false; });

    handle.addEventListener('dblclick', function (e) {
      if (e.target.closest('.win-btns')) return;
      maximize(win.id);
    });
  }

  /* ── Portfolio filters ────────────────────────────────── */
  function initFilters() {
    var btns   = document.querySelectorAll('.pf-btn');
    var thumbs = document.querySelectorAll('.photo-thumb');

    btns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        btns.forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
        var filter = btn.dataset.filter;
        var count = 0;
        thumbs.forEach(function (t) {
          var show = filter === 'all' || t.classList.contains(filter);
          t.classList.toggle('hidden', !show);
          if (show) count++;
        });
        var el = document.getElementById('portfolio-count');
        if (el) el.textContent = 'Showing ' + count + ' photo' + (count !== 1 ? 's' : '');
      });
    });
  }

  /* ── Photo lightbox ───────────────────────────────────── */
  function initPhotoGrid() {
    document.querySelectorAll('.photo-thumb').forEach(function (thumb) {
      thumb.addEventListener('click', function () {
        lbPhotos = Array.from(document.querySelectorAll('.photo-thumb:not(.hidden)'));
        lbIndex  = lbPhotos.indexOf(thumb);
        if (lbIndex < 0) lbIndex = 0;
        showLb(lbIndex);
      });
    });

    var prev = document.getElementById('lb-prev');
    var next = document.getElementById('lb-next');
    if (prev) prev.addEventListener('click', function () { showLb(lbIndex - 1); });
    if (next) next.addEventListener('click', function () { showLb(lbIndex + 1); });

    /* Swipe support for lightbox on touch */
    var lbBody = document.querySelector('#win-lightbox .lb-body');
    if (lbBody) {
      var swipeX = null;
      lbBody.addEventListener('touchstart', function (e) {
        swipeX = e.touches[0].clientX;
      }, { passive: true });
      lbBody.addEventListener('touchend', function (e) {
        if (swipeX === null) return;
        var dx = e.changedTouches[0].clientX - swipeX;
        if (Math.abs(dx) > 40) showLb(dx < 0 ? lbIndex + 1 : lbIndex - 1);
        swipeX = null;
      }, { passive: true });
    }
  }

  function showLb(idx) {
    lbPhotos = Array.from(document.querySelectorAll('.photo-thumb:not(.hidden)'));
    if (!lbPhotos.length) return;
    lbIndex = ((idx % lbPhotos.length) + lbPhotos.length) % lbPhotos.length;
    var thumb = lbPhotos[lbIndex];
    var img   = document.getElementById('lb-img');
    var title = document.getElementById('lb-title');
    var status = document.getElementById('lb-status');
    if (img)    img.src = thumb.dataset.src;
    if (title)  title.textContent = (thumb.dataset.label || 'Photo') + ' — Photo Viewer';
    if (status) status.textContent = 'Photo ' + (lbIndex + 1) + ' of ' + lbPhotos.length;
    open('win-lightbox');
  }

  /* ── Featured 3D round carousel (Win95-framed) ─────────────
     Vanilla port of the "Round Carousel" component. Builds a 3D
     ring of framed photos, auto-spins it, supports drag + inertia,
     and opens the existing lightbox when a frame is clicked. */
  function initRoundCarousel() {
    var stage = document.getElementById('rc-stage');
    var ring  = document.getElementById('rc-ring');
    if (!stage || !ring) return;

    /* Curated subset — each src/label also exists in the grid below,
       so a click maps cleanly onto the lightbox. */
    var FEATURED = [
      { src: 'images/photos-1-2.jpeg', label: 'Color Transformation' },
      { src: 'images/img_3197.jpg',    label: 'Color & Dimension' },
      { src: 'images/photos-1-7.jpeg', label: 'Cut & Texture' },
      { src: 'images/img_5895.jpg',    label: 'Ready' },
      { src: 'images/IMG_5896.JPG',    label: 'Vivid Result' },
      { src: 'images/IMG_3200.JPG',    label: 'Final Look' },
      { src: 'images/img_3624.jpg',    label: 'Studio Styling' },
      { src: 'images/photos-1-8.jpeg', label: 'Textured Layers' },
      { src: 'images/72CB9D5F-D97F-4E5A-8C3C-2FA5B465DCBA.jpg', label: 'Color Expression' }
    ];

    var count       = FEATURED.length;
    var W = 190, H = 145;          // must match .rc-ring in styles.css
    var spacing     = 3;
    var speedDegS   = 21;          // component speed 3.5 * 6 deg/s (half of original 42)
    var sensitivity = 5;
    var angle  = 360 / count;
    var factor = 1 + spacing * 0.15;
    var radius = (W * factor) / (2 * Math.tan(Math.PI / count));

    FEATURED.forEach(function (img, i) {
      var item = document.createElement('div');
      item.className = 'rc-item';
      item.style.transform = 'rotateY(' + (i * angle) + 'deg) translateZ(' + radius + 'px)';
      item.appendChild(buildFace(img, false));
      item.appendChild(buildFace(img, true));
      ring.appendChild(item);
    });

    function buildFace(img, isBack) {
      var face = document.createElement('div');
      face.className = 'rc-face' + (isBack ? ' rc-face-back' : '');
      var tb = document.createElement('div');
      tb.className = 'rc-titlebar';
      var icon = document.createElement('span');
      icon.className = 'rc-tb-icon';
      icon.textContent = '🖼';
      var text = document.createElement('span');
      text.className = 'rc-tb-text';
      text.textContent = img.label;
      tb.appendChild(icon);
      tb.appendChild(text);
      var pic = document.createElement('div');
      pic.className = 'rc-pic';
      pic.style.backgroundImage = 'url("' + img.src + '")';
      face.appendChild(tb);
      face.appendChild(pic);
      if (!isBack) { face.dataset.src = img.src; face.dataset.label = img.label; }
      return face;
    }

    /* ── Animation + drag (mirrors the component's RAF loop) ── */
    var reduce = window.matchMedia &&
                 window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var degPerSec = reduce ? 0 : speedDegS;
    var rotY = 0, vel = 0, last = 0, raf = 0;
    var drag = { active: false, x: 0, moved: 0 };

    function apply() {
      ring.style.transform = 'translateZ(' + (-radius) + 'px) rotateY(' + rotY + 'deg)';
    }
    apply();

    function draw(now) {
      var dt = last ? (now - last) / 1000 : 0;
      last = now;
      var f = Math.min(dt, 0.1);
      if (stage.offsetParent !== null) {   // only spin while the window is visible
        if (!drag.active) {
          if (Math.abs(vel) > 0.01) {
            rotY += vel * f;
            vel  *= 0.94;
          } else {
            rotY += degPerSec * f;
          }
        }
        apply();
      }
      raf = requestAnimationFrame(draw);
    }
    raf = requestAnimationFrame(draw);

    stage.addEventListener('pointerdown', function (e) {
      if (stage.setPointerCapture) stage.setPointerCapture(e.pointerId);
      drag = { active: true, x: e.clientX, moved: 0 };
      vel = 0;
      stage.classList.add('is-grabbing');
    });
    stage.addEventListener('pointermove', function (e) {
      if (!drag.active) return;
      var dx = e.clientX - drag.x;
      drag.x = e.clientX;
      drag.moved += Math.abs(dx);
      var k = 0.3 * sensitivity;
      rotY += dx * k;
      vel = dx * k * 60;
    });
    function endDrag(e) {
      if (stage.releasePointerCapture) {
        try { stage.releasePointerCapture(e.pointerId); } catch (err) {}
      }
      var wasClick = drag.active && drag.moved < 6;
      drag.active = false;
      stage.classList.remove('is-grabbing');
      if (wasClick) openFace(e);
    }
    stage.addEventListener('pointerup', endDrag);
    stage.addEventListener('pointercancel', function (e) {
      drag.active = false;
      stage.classList.remove('is-grabbing');
    });

    function openFace(e) {
      var face = e.target.closest('.rc-face');
      if (!face || !face.dataset.src) return;   // ignore dim back faces
      var src = face.dataset.src;
      var thumbs = Array.from(document.querySelectorAll('.photo-thumb:not(.hidden)'));
      var idx = thumbs.findIndex(function (t) { return t.dataset.src === src; });
      if (idx >= 0) {
        showLb(idx);   // showLb re-reads the visible thumbs itself
      } else {
        /* featured image filtered out of the grid — show it directly */
        var img   = document.getElementById('lb-img');
        var title = document.getElementById('lb-title');
        if (img)   img.src = src;
        if (title) title.textContent = (face.dataset.label || 'Photo') + ' — Photo Viewer';
        open('win-lightbox');
      }
    }
  }

  /* ── Clock ────────────────────────────────────────────── */
  function updateClock() {
    var now = new Date();
    var h   = now.getHours();
    var m   = now.getMinutes();
    var ap  = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    var el = document.getElementById('tb-clock');
    if (el) el.textContent = h + ':' + (m < 10 ? '0' + m : m) + ' ' + ap;
  }

  /* ── Resize handles ───────────────────────────────────── */
  function addResizeHandles(win) {
    ['n','s','e','w','nw','ne','sw','se'].forEach(function (dir) {
      var h = document.createElement('div');
      h.className = 'win-rh win-rh-' + dir;
      win.appendChild(h);

      var rs = null;

      h.addEventListener('pointerdown', function (e) {
        if (win.classList.contains('is-maximized')) return;
        e.preventDefault();            /* before compositor decides gesture */
        e.stopPropagation();
        bringToFront(win.id);
        snapToPixels(win);
        var r = win.getBoundingClientRect();
        rs = { sx: e.clientX, sy: e.clientY, sw: r.width, sh: r.height, sl: r.left, st: r.top };
        try { h.setPointerCapture(e.pointerId); } catch (_) {}
      });

      h.addEventListener('pointermove', function (e) {
        if (!rs) return;
        var dx = e.clientX - rs.sx, dy = e.clientY - rs.sy;
        var nw = rs.sw, nh = rs.sh, nl = rs.sl, nt = rs.st;
        if (dir.includes('e')) nw = Math.max(220, rs.sw + dx);
        if (dir.includes('s')) nh = Math.max(100, rs.sh + dy);
        if (dir.includes('w')) { nw = Math.max(220, rs.sw - dx); nl = rs.sl + rs.sw - nw; }
        if (dir.includes('n')) { nh = Math.max(100, rs.sh - dy); nt = rs.st + rs.sh - nh; }
        win.style.width     = nw + 'px';
        win.style.height    = nh + 'px';
        win.style.maxHeight = 'none';
        win.style.left      = nl + 'px';
        win.style.top       = nt + 'px';
      });

      h.addEventListener('pointerup',     function () { rs = null; });
      h.addEventListener('pointercancel', function () { rs = null; });
    });
  }

  /* ── Init ─────────────────────────────────────────────── */
  function init() {
    /* Wire up all windows */
    document.querySelectorAll('.win95').forEach(function (win) {
      var id = win.id;
      state[id] = { open: false, minimized: false, savedRect: null };

      addResizeHandles(win);
      var title = win.querySelector('.win-title');
      if (title) makeDraggable(win, title);

      /* Buttons */
      win.querySelectorAll('.wbtn-min').forEach(function (b) {
        b.addEventListener('click', function (e) { e.stopPropagation(); minimize(id); });
      });
      win.querySelectorAll('.wbtn-max').forEach(function (b) {
        b.addEventListener('click', function (e) { e.stopPropagation(); maximize(id); });
      });
      win.querySelectorAll('.wbtn-cls').forEach(function (b) {
        b.addEventListener('click', function (e) { e.stopPropagation(); close(id); });
      });

      /* Any pointer on window → bring to front */
      win.addEventListener('pointerdown', function () { bringToFront(id); });
    });

    /* Desktop icons — single click to open */
    document.querySelectorAll('.d-icon').forEach(function (icon) {
      icon.addEventListener('click', function () {
        document.querySelectorAll('.d-icon').forEach(function (i) { i.classList.remove('sel'); });
        icon.classList.add('sel');
        open(icon.dataset.win);
      });
    });

    /* Start menu close on outside click */
    document.addEventListener('click', function (e) {
      if (startOpen && !e.target.closest('#start-menu') && !e.target.closest('#start-btn')) {
        closeStart();
      }
    });

    /* Keyboard nav */
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        closeStart();
        var lb = document.getElementById('win-lightbox');
        if (lb && lb.classList.contains('is-open') && lb.classList.contains('is-active')) {
          close('win-lightbox');
        }
      }
      if (e.key === 'ArrowLeft')  { showLb(lbIndex - 1); }
      if (e.key === 'ArrowRight') { showLb(lbIndex + 1); }
    });

    initFilters();
    initPhotoGrid();
    initRoundCarousel();

    /* Dynamic portfolio object count */
    var photoCount = document.querySelectorAll('.photo-thumb').length;
    var pfCountEl = document.querySelector('#win-portfolio .win-status span:first-child');
    if (pfCountEl) pfCountEl.textContent = photoCount + ' objects';

    /* Clock */
    updateClock();
    setInterval(updateClock, 10000);

    /* Boot screen → then open welcome */
    initBoot(function () { open('win-welcome'); });
  }

  /* ── Boot screen ───────────────────────────────────────── */
  function initBoot(onDone) {
    var screen = document.getElementById('boot-screen');
    var bar    = document.getElementById('boot-bar');
    var msg    = document.getElementById('boot-msg');
    if (!screen) { onDone(); return; }

    var messages = [
      'Starting Windows 95…',
      'Loading system files…',
      'Initialising hair studio…',
      'Almost ready…'
    ];
    var pct = 0, msgIdx = 0;

    var iv = setInterval(function () {
      pct += Math.random() * 9 + 3;
      if (pct >= 100) pct = 100;
      bar.style.width = pct + '%';
      var newIdx = Math.min(messages.length - 1, Math.floor(pct / 28));
      if (newIdx !== msgIdx) { msgIdx = newIdx; if (msg) msg.textContent = messages[msgIdx]; }
      if (pct >= 100) {
        clearInterval(iv);
        setTimeout(function () {
          screen.classList.add('fade-out');
          setTimeout(function () { screen.style.display = 'none'; onDone(); }, 500);
        }, 300);
      }
    }, 80);
  }

  document.addEventListener('DOMContentLoaded', init);

  return { open: open, close: close, toggleStart: toggleStart, closeStart: closeStart };
})();

/* ── Desktop ripple background ──────────────────────────── */
(function () {
  var canvas = document.getElementById('desktop-canvas');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');

  /* Simulation runs at 1/SCALE of screen resolution, then scaled up.
     This cuts pixel work by SCALE² while canvas smoothing hides the loss. */
  var SCALE = 3;
  var DAMP  = 0.988;
  var STR   = 0.12;   /* displacement strength in sim-pixels */

  var W, H, sW, sH;           /* screen size, sim size */
  var b0, b1;                  /* wave buffers */
  var srcPixels;               /* source image pixel data (at sim resolution) */
  var outBuf, outData;         /* output ImageData */
  var simCanvas, simCtx;       /* low-res canvas for scaling */
  var running = false;

  /* Load source image */
  var img = new Image();
  img.onload = function () { resize(); drawStatic(); };
  img.src = 'images/hero%20image.jpg';

  function resize() {
    W = canvas.offsetWidth  || window.innerWidth;
    H = canvas.offsetHeight || window.innerHeight;
    canvas.width  = W;
    canvas.height = H;

    sW = Math.ceil(W / SCALE);
    sH = Math.ceil(H / SCALE);

    /* Low-res canvas for putImageData + scale-up */
    if (!simCanvas) { simCanvas = document.createElement('canvas'); simCtx = simCanvas.getContext('2d'); }
    simCanvas.width  = sW;
    simCanvas.height = sH;

    /* Bake source image at sim resolution (cover-fit) */
    var ir = img.width / img.height, cr = sW / sH;
    var sw, sh, sx, sy;
    if (ir > cr) { sh = img.height; sw = sh * cr; sx = (img.width - sw) / 2; sy = 0; }
    else         { sw = img.width;  sh = sw / cr; sy = (img.height - sh) / 2; sx = 0; }
    simCtx.drawImage(img, sx, sy, sw, sh, 0, 0, sW, sH);
    srcPixels = simCtx.getImageData(0, 0, sW, sH).data;

    b0     = new Float32Array(sW * sH);
    b1     = new Float32Array(sW * sH);
    outBuf = simCtx.createImageData(sW, sH);
    outData = outBuf.data;
  }

  function drawStatic() {
    if (!W) return;
    /* Draw baked source then overlay */
    ctx.drawImage(simCanvas, 0, 0, W, H);
    applyOverlay();
  }

  function applyOverlay() {
    var g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0,    'rgba(0,0,0,0.50)');
    g.addColorStop(0.45, 'rgba(0,0,0,0.26)');
    g.addColorStop(1,    'rgba(0,0,0,0.54)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }

  function drop(mx, my, strength) {
    /* Convert screen coords to sim coords */
    var cx = Math.floor(mx / SCALE);
    var cy = Math.floor(my / SCALE);
    var r  = Math.ceil(55 / SCALE);
    for (var dy = -r; dy <= r; dy++) {
      for (var dx = -r; dx <= r; dx++) {
        var d = Math.sqrt(dx * dx + dy * dy);
        if (d <= r) {
          var nx = cx + dx, ny = cy + dy;
          if (nx >= 0 && nx < sW && ny >= 0 && ny < sH) {
            var f = 1 - d / r;
            b0[ny * sW + nx] += strength * f * f;
          }
        }
      }
    }
  }

  function step() {
    for (var y = 1; y < sH - 1; y++) {
      for (var x = 1; x < sW - 1; x++) {
        var i = y * sW + x;
        b1[i] = (b0[i-1] + b0[i+1] + b0[i-sW] + b0[i+sW]) * 0.5 - b1[i];
        b1[i] *= DAMP;
      }
    }
    var t = b0; b0 = b1; b1 = t;
  }

  function draw() {
    /* Single-pass pixel displacement — one putImageData per frame */
    var sd = srcPixels, od = outData;
    var maxAmp = 0;

    for (var y = 0; y < sH; y++) {
      for (var x = 0; x < sW; x++) {
        var i   = y * sW + x;
        var ddx = (x > 0 && x < sW-1) ? (b0[i+1]  - b0[i-1] ) * STR : 0;
        var ddy = (y > 0 && y < sH-1) ? (b0[i+sW] - b0[i-sW]) * STR : 0;
        var amp = b0[i] < 0 ? -b0[i] : b0[i];
        if (amp > maxAmp) maxAmp = amp;

        var sx = x + ddx | 0;
        var sy = y + ddy | 0;
        if (sx < 0) sx = 0; else if (sx >= sW) sx = sW - 1;
        if (sy < 0) sy = 0; else if (sy >= sH) sy = sH - 1;

        var oi = i * 4, si = (sy * sW + sx) * 4;
        od[oi]   = sd[si];
        od[oi+1] = sd[si+1];
        od[oi+2] = sd[si+2];
        od[oi+3] = 255;
      }
    }

    simCtx.putImageData(outBuf, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'medium';
    ctx.drawImage(simCanvas, 0, 0, W, H);
    applyOverlay();
    return maxAmp;
  }

  function loop() {
    step();
    var maxAmp = draw();
    if (maxAmp > 0.08) {
      requestAnimationFrame(loop);
    } else {
      running = false;
      drawStatic();
    }
  }

  function splash(e, strength) {
    if (e.target.closest('.win95, #taskbar, #icon-grid, #start-menu')) return;
    var r = canvas.getBoundingClientRect();
    drop(e.clientX - r.left, e.clientY - r.top, strength);
    if (!running) { running = true; requestAnimationFrame(loop); }
  }

  var desktop = document.getElementById('desktop');
  desktop.addEventListener('click',     function (e) { splash(e, 600); });
  desktop.addEventListener('touchstart',function (e) {
    if (e.target.closest('.win95, #taskbar, #icon-grid, #start-menu')) return;
    var t = e.touches[0], r = canvas.getBoundingClientRect();
    drop(t.clientX - r.left, t.clientY - r.top, 600);
    if (!running) { running = true; requestAnimationFrame(loop); }
  }, { passive: true });

  var lastMove = 0;
  desktop.addEventListener('mousemove', function (e) {
    if (e.target.closest('.win95, #taskbar, #icon-grid, #start-menu')) return;
    var now = Date.now();
    if (now - lastMove < 40) return;
    lastMove = now;
    splash(e, 80);
  });

  if (window.ResizeObserver) {
    new ResizeObserver(function () { resize(); drawStatic(); }).observe(canvas);
  } else {
    window.addEventListener('resize', function () { resize(); drawStatic(); });
  }
})();
