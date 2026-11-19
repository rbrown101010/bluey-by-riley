/*
 * Keramik 3D: the Keramik avatar (capsule shape) as a real 3D head, built with three.js (global THREE).
 * The face lives on the head's display as a glowing texture: eyes and mouth glance across the display
 * quickly, and the head follows the same gaze more slowly, so face and head move independently.
 *
 * Page needs <div id="ka3d"></div>. Optional: window.KA_FILL (0…1, how much of the view the head fills).
 * API on window.ka: setMood(id), react(id|null), look(x, y) (-1…1, y down; null = wander), boot().
 * Moods: neutral, happy, think, focus, sleep. Reactions: stop, wave, confetti.
 */
(function () {
  'use strict';
  var T = window.THREE;
  var root = document.getElementById('ka3d');
  if (!T || !root) return;
  var FILL = window.KA_FILL || 0.8;

  // ---------- renderer, camera, light ----------
  var renderer = new T.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 3));
  renderer.outputEncoding = T.sRGBEncoding;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.setClearColor(0x000000, 0);
  root.appendChild(renderer.domElement);
  var fx = document.createElement('canvas');   // confetti on top of the 3D view
  fx.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none';
  root.appendChild(fx);
  var fxc = fx.getContext('2d');

  var scene = new T.Scene();
  var camera = new T.PerspectiveCamera(24, 1, 10, 5000);

  // A soft studio environment, so the glazed ceramic gets real reflections.
  (function () {
    var env = new T.Scene();
    env.background = new T.Color(0x4a4d55);
    var panel = function (w, h, x, y, z, c) {
      var m = new T.Mesh(new T.PlaneGeometry(w, h), new T.MeshBasicMaterial({ color: c, side: T.DoubleSide }));
      m.position.set(x, y, z); m.lookAt(0, 0, 0); env.add(m);
    };
    panel(6, 3, 0, 6, 2, 0xffffff);       // big softbox above
    panel(3, 4, -6, 1, 3, 0xdfe6ff);      // key from the left
    panel(2, 4, 6, 0, -2, 0xfff1e0);      // warm rim on the right
    panel(10, 2, 0, -5, 0, 0x22242a);     // dark floor
    var pm = new T.PMREMGenerator(renderer);
    scene.environment = pm.fromScene(env, 0.035).texture;
  })();
  var key = new T.DirectionalLight(0xffffff, 0.9); key.position.set(-120, 160, 220); scene.add(key);
  scene.add(new T.HemisphereLight(0xffffff, 0x30323a, 0.35));

  // ---------- the head ----------
  var W = 176, H = 116, D = 92;            // overall size, like the 2D capsule (176 × 116)
  var BS = 12, BT = 18;                     // rounded edges: bevel size / thickness
  function pill(w, h, r) {
    var s = new T.Shape(), x = -w / 2, y = -h / 2;
    r = Math.min(r, w / 2, h / 2);
    s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.absarc(x + w - r, y + r, r, -Math.PI / 2, 0, false);
    s.lineTo(x + w, y + h - r); s.absarc(x + w - r, y + h - r, r, 0, Math.PI / 2, false);
    s.lineTo(x + r, y + h); s.absarc(x + r, y + h - r, r, Math.PI / 2, Math.PI, false);
    s.lineTo(x, y + r); s.absarc(x + r, y + r, r, Math.PI, Math.PI * 1.5, false);
    return s;
  }
  var head = new T.Group();
  var pivot = new T.Group();               // turns, nods and bobs the whole head
  pivot.add(head); scene.add(pivot);

  var ceramic = new T.MeshPhysicalMaterial({ color: 0xf3f3f1, roughness: 0.32, metalness: 0, clearcoat: 1,
    clearcoatRoughness: 0.12, envMapIntensity: 1.0 });
  var bodyGeo = new T.ExtrudeGeometry(pill(W - 2 * BS, H - 2 * BS, (H - 2 * BS) / 2), {
    depth: D - 2 * BT, bevelEnabled: true, bevelThickness: BT, bevelSize: BS, bevelSegments: 14, curveSegments: 72 });
  bodyGeo.center();
  head.add(new T.Mesh(bodyGeo, ceramic));
  var FRONT = D / 2;

  // Display: dark glass set into the front, with the face drawn on it.
  var SW = 140, SH = 88, SR = 40;
  var FW = 700, FH = Math.round(FW * SH / SW), K = FW / SW;
  var faceCanvas = document.createElement('canvas'); faceCanvas.width = FW; faceCanvas.height = FH;
  var fc = faceCanvas.getContext('2d');
  var faceTex = new T.CanvasTexture(faceCanvas);
  faceTex.encoding = T.sRGBEncoding;
  faceTex.anisotropy = 4;
  var screenGeo = new T.ShapeGeometry(pill(SW, SH, SR), 48);
  // ShapeGeometry UVs are in shape units; map them onto the canvas.
  (function () {
    var uv = screenGeo.attributes.uv, pos = screenGeo.attributes.position;
    for (var i = 0; i < uv.count; i++) uv.setXY(i, pos.getX(i) / SW + 0.5, pos.getY(i) / SH + 0.5);
  })();
  var screen = new T.Mesh(screenGeo, new T.MeshBasicMaterial({ map: faceTex, toneMapped: false }));
  screen.position.z = FRONT + 0.15;
  head.add(screen);
  var glass = new T.Mesh(screenGeo, new T.MeshPhysicalMaterial({ color: 0x000000, roughness: 0.04, metalness: 0,
    clearcoat: 1, clearcoatRoughness: 0.02, transparent: true, opacity: 0.18, envMapIntensity: 1.6, depthWrite: false }));
  glass.position.z = FRONT + 0.6;
  head.add(glass);
  // a thin dark rim where the glass meets the ceramic
  var rimGeo = new T.ShapeGeometry((function () { var s = pill(SW + 4, SH + 4, SR + 2); s.holes.push(pill(SW, SH, SR)); return s; })(), 48);
  var rim = new T.Mesh(rimGeo, new T.MeshStandardMaterial({ color: 0xd7d8db, roughness: 0.5 }));
  rim.position.z = FRONT + 0.1; head.add(rim);

  // Side pods, the top slot.
  var trim = new T.MeshPhysicalMaterial({ color: 0xe9eaec, roughness: 0.4, clearcoat: 0.6 });
  [-1, 1].forEach(function (side) {
    var pod = new T.Mesh(new T.CapsuleGeometry(4.2, 20, 8, 16), trim);
    pod.position.set(side * (W / 2 - 1.2), 0, 6); head.add(pod);
  });
  var slot = new T.Mesh(new T.CapsuleGeometry(3.4, 14, 8, 16), trim);
  slot.rotation.z = Math.PI / 2; slot.position.set(0, H / 2 - 2.6, 8); head.add(slot);

  // Soft contact shadow under him.
  var shCanvas = document.createElement('canvas'); shCanvas.width = shCanvas.height = 128;
  (function () {
    var c = shCanvas.getContext('2d'), g = c.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, 'rgba(0,0,0,0.55)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = g; c.fillRect(0, 0, 128, 128);
  })();
  var shadow = new T.Mesh(new T.PlaneGeometry(W * 1.1, D * 0.9),
    new T.MeshBasicMaterial({ map: new T.CanvasTexture(shCanvas), transparent: true, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2; shadow.position.y = -H / 2 - 16;
  scene.add(shadow);

  // ---------- framing ----------
  function resize() {
    var w = root.clientWidth || window.innerWidth, h = root.clientHeight || window.innerHeight;
    renderer.setSize(w, h, false);
    renderer.domElement.style.cssText = 'position:absolute;inset:0;width:100%;height:100%';
    var dpr = Math.min(window.devicePixelRatio || 1, 3);
    fx.width = w * dpr; fx.height = h * dpr; fxc.setTransform(dpr, 0, 0, dpr, 0, 0);
    camera.aspect = w / h;
    var tan = Math.tan(camera.fov * Math.PI / 360);
    var needH = (H + 46) / FILL, needW = (W + 30) / FILL;
    var dist = Math.max(needH, needW / camera.aspect) / (2 * tan) + D / 2;
    camera.position.set(0, 6, dist);
    camera.lookAt(0, -6, 0);
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);
  resize();

  // ---------- expressions ----------
  var MOODS = {
    neutral: { rx: 9.5, ry: 13, arc: 0, closed: 0, mw: 7, curve: 5, open: 0, brow: 0, browTilt: 0, red: 0 },
    happy:   { rx: 10, ry: 13, arc: 1, closed: 0, mw: 10, curve: 7, open: 6, brow: 0, browTilt: 0, red: 0 },
    think:   { rx: 8.5, ry: 11, arc: 0, closed: 0, mw: 5, curve: 1, open: 0, brow: 1, browTilt: -0.25, red: 0, look: [0.75, -0.8] },
    focus:   { rx: 10, ry: 6, arc: 0, closed: 0, mw: 6, curve: 0.5, open: 0, brow: 0, browTilt: 0, red: 0 },
    sleep:   { rx: 9.5, ry: 13, arc: 0, closed: 1, mw: 4, curve: 2, open: 0, brow: 0, browTilt: 0, red: 0 },
    stop:    { rx: 10, ry: 10, arc: 0, closed: 0, mw: 6, curve: -4, open: 1.5, brow: 1, browTilt: 0.35, red: 1 }
  };
  var NUM = ['rx', 'ry', 'arc', 'closed', 'mw', 'curve', 'open', 'brow', 'browTilt', 'red'];
  var mood = 'neutral', reaction = null, reactAt = 0;
  var cur = Object.assign({}, MOODS.neutral);
  function target() {
    if (reaction === 'stop') return MOODS.stop;
    if (reaction === 'wave' || reaction === 'confetti') return MOODS.happy;
    return MOODS[mood] || MOODS.neutral;
  }

  // ---------- motion state ----------
  var gazeTarget = null;                    // set by look(); null = wander on his own
  var wander = { x: 0, y: 0 }, nextWander = 0;
  var faceG = { x: 0, y: 0 }, headG = { x: 0, y: 0 };
  var blinkAt = 1.5, blinkStart = -1, bootAt = 0;
  var confetti = [];
  var t0 = performance.now() / 1000, last = t0;

  function spring(o, x, y, k) { o.x += (x - o.x) * k; o.y += (y - o.y) * k; }

  // ---------- drawing the face ----------
  function drawFace(t, f, bootK) {
    var c = fc;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.clearRect(0, 0, FW, FH);
    // the display: near-black with a soft lift in the middle
    var bg = c.createRadialGradient(FW / 2, FH * 0.55, 0, FW / 2, FH * 0.55, FW * 0.6);
    bg.addColorStop(0, '#24262b'); bg.addColorStop(1, '#101114');
    c.fillStyle = bg; c.fillRect(0, 0, FW, FH);
    c.setTransform(K, 0, 0, K, FW / 2, FH / 2);  // screen units, origin in the middle

    var glow = f.red > 0.5 ? '#FF453A' : '#F4F7FF';
    var alpha = bootK;
    c.globalAlpha = alpha;
    c.shadowColor = f.red > 0.5 ? 'rgba(255,69,58,0.9)' : 'rgba(225,235,255,0.85)';
    c.shadowBlur = 9 * K;
    c.fillStyle = glow; c.strokeStyle = glow; c.lineCap = 'round'; c.lineJoin = 'round';

    // eyes glance ahead of the head
    var ex = faceG.x * 22, ey = faceG.y * 11;
    var blink = 0;
    if (blinkStart >= 0) { var b = (t - blinkStart) / 0.16; blink = b < 0.5 ? b * 2 : Math.max(0, (1 - b) * 2); }
    [-1, 1].forEach(function (side) {
      var cx = side * 23 + ex, cy = -7 + ey;
      // open eye
      var open = (1 - f.arc) * (1 - f.closed);
      if (open > 0.02) {
        c.globalAlpha = alpha * Math.min(1, open * 1.4);
        var ry = Math.max(0.8, f.ry * (1 - 0.92 * blink));
        c.beginPath(); c.ellipse(cx, cy, f.rx, ry, 0, 0, Math.PI * 2); c.fill();
      }
      // happy arc ∩
      if (f.arc > 0.02) {
        c.globalAlpha = alpha * f.arc; c.lineWidth = 4.2;
        c.beginPath(); c.moveTo(cx - f.rx, cy + 3); c.quadraticCurveTo(cx, cy - f.ry * 1.25, cx + f.rx, cy + 3); c.stroke();
      }
      // closed (sleep) ∪
      if (f.closed > 0.02) {
        c.globalAlpha = alpha * f.closed; c.lineWidth = 3.6;
        c.beginPath(); c.moveTo(cx - f.rx, cy); c.quadraticCurveTo(cx, cy + 7, cx + f.rx, cy); c.stroke();
      }
      // brows
      if (f.brow > 0.02) {
        c.globalAlpha = alpha * f.brow; c.lineWidth = 3;
        var by = cy - f.ry - 6, tilt = f.browTilt * side;
        c.beginPath(); c.moveTo(cx - 9, by - 9 * tilt); c.lineTo(cx + 9, by + 9 * tilt); c.stroke();
      }
    });
    // mouth follows the eyes, a little less
    c.globalAlpha = alpha;
    var mx = ex * 0.7, my = 21 + ey * 0.6, w = f.mw, cv = f.curve, op = f.open;
    c.lineWidth = 3.4;
    c.beginPath();
    c.moveTo(mx - w, my);
    c.quadraticCurveTo(mx, my + cv * 0.9, mx + w, my);
    if (op > 0.3) { c.quadraticCurveTo(mx, my + cv * 0.9 + op * 2.2, mx - w, my); c.closePath(); c.fill(); }
    c.stroke();
    // z z Z while asleep
    if (f.closed > 0.5) {
      c.shadowBlur = 5 * K; c.font = '700 9px Inter, system-ui, sans-serif';
      for (var i = 0; i < 3; i++) {
        var p = ((t * 0.45 + i / 3) % 1);
        c.globalAlpha = alpha * Math.sin(p * Math.PI) * 0.9;
        c.font = '700 ' + (7 + i * 2.5) + 'px Inter, system-ui, sans-serif';
        c.fillText(i === 2 ? 'Z' : 'z', 34 + i * 7 + p * 6, -14 - p * 18);
      }
    }
    c.globalAlpha = 1; c.shadowBlur = 0;
    // glass reflection (top left), as on the 2D avatar
    c.strokeStyle = 'rgba(255,255,255,0.22)'; c.lineWidth = 2.4;
    c.beginPath(); c.moveTo(-56, -14); c.quadraticCurveTo(-52, -32, -36, -36); c.stroke();
    faceTex.needsUpdate = true;
  }

  // ---------- confetti ----------
  var COLORS = ['#FF453A', '#FFD60A', '#30D158', '#64D2FF', '#BF5AF2', '#FF9F0A'];
  function burst() {
    var w = root.clientWidth, h = root.clientHeight;
    for (var i = 0; i < 90; i++) {
      var a = -Math.PI / 2 + (Math.random() - 0.5) * 2.2, s = 4 + Math.random() * 7;
      confetti.push({ x: w / 2, y: h * 0.45, vx: Math.cos(a) * s, vy: Math.sin(a) * s, r: Math.random() * 6,
        vr: (Math.random() - 0.5) * 0.4, c: COLORS[i % COLORS.length], life: 1 });
    }
  }
  function drawConfetti(dt) {
    var w = root.clientWidth, h = root.clientHeight;
    fxc.clearRect(0, 0, w, h);
    if (!confetti.length) return;
    var n = dt * 60;
    confetti = confetti.filter(function (p) {
      p.vy += 0.22 * n; p.vx *= Math.pow(0.99, n); p.x += p.vx * n; p.y += p.vy * n; p.r += p.vr * n; p.life -= 0.006 * n;
      if (p.life <= 0 || p.y > h + 20) return false;
      fxc.save(); fxc.globalAlpha = Math.min(1, p.life * 2); fxc.translate(p.x, p.y); fxc.rotate(p.r);
      fxc.fillStyle = p.c; fxc.fillRect(-3, -1.6, 6, 3.2); fxc.restore();
      return true;
    });
  }

  // ---------- loop ----------
  function frame() {
    var now = performance.now() / 1000, t = now - t0, dt = Math.min(0.05, now - last);
    last = now;
    var n = dt * 60;   // per-frame easing scaled to 60 fps

    // expression
    var tg = target(), ke = 1 - Math.pow(1 - 0.16, n);
    NUM.forEach(function (k) { cur[k] += (tg[k] - cur[k]) * ke; });

    // where to look
    var want;
    var ml = MOODS[mood] && MOODS[mood].look;
    if (ml && !reaction) want = { x: ml[0], y: ml[1] };
    else if (gazeTarget) want = gazeTarget;
    else {
      if (t > nextWander) { wander = { x: Math.random() * 1.6 - 0.8, y: Math.random() * 1.0 - 0.6 }; nextWander = t + 0.8 + Math.random() * 2.2; }
      want = wander;
    }
    spring(faceG, want.x, want.y, 1 - Math.pow(1 - 0.22, n));   // eyes: quick
    spring(headG, want.x, want.y, 1 - Math.pow(1 - 0.045, n));  // head: follows slowly

    // blinking
    if (t > blinkAt && blinkStart < 0) blinkStart = t;
    if (blinkStart >= 0 && t - blinkStart > 0.16) {
      blinkStart = -1;
      blinkAt = t + (Math.random() < 0.22 ? 0.18 : 2.2 + Math.random() * 3.4);
    }

    // head pose
    var bootK = Math.min(1, Math.max(0, (t - bootAt) / 0.9));
    var ease = 1 - Math.pow(1 - bootK, 3);
    var rt = t - reactAt;
    var yaw = headG.x * 0.38, pitch = headG.y * 0.2, roll = Math.sin(t * 0.7) * 0.015 - headG.x * 0.03;
    var bob = Math.sin(t * 1.8) * 1.2;
    if (mood === 'think' && !reaction) roll += 0.07;
    if (mood === 'sleep' && !reaction) { pitch += 0.16; bob = Math.sin(t * 1.1) * 2; }
    if (reaction === 'stop') yaw += Math.sin(rt * 28) * 0.07 * Math.max(0, 1 - rt / 0.7);
    if (reaction === 'wave') roll += Math.sin(rt * 9) * 0.1 * Math.max(0, 1 - rt / 2.2);
    if (reaction === 'confetti') bob += Math.max(0, Math.sin(Math.min(rt, 0.5) * Math.PI * 2)) * 10;
    pivot.rotation.set(pitch, yaw, roll);
    pivot.position.y = bob;
    var sc = 0.86 + 0.14 * ease;
    pivot.scale.set(sc, sc, sc);
    shadow.material.opacity = 0.9 * ease * (1 - bob / 30);
    shadow.scale.setScalar(1 - bob / 80);

    drawFace(t, cur, Math.min(1, Math.max(0, (t - bootAt - 0.35) / 0.4)));
    renderer.render(scene, camera);
    drawConfetti(dt);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  // ---------- API ----------
  var api = {
    setMood: function (id) { mood = MOODS[id] ? id : 'neutral'; reaction = null; return api; },
    react: function (id) { reaction = id || null; reactAt = performance.now() / 1000 - t0; if (id === 'confetti') burst(); return api; },
    look: function (x, y) {
      gazeTarget = x == null ? null : { x: Math.max(-1, Math.min(1, +x || 0)), y: Math.max(-1, Math.min(1, +y || 0)) };
      return api;
    },
    boot: function () { bootAt = performance.now() / 1000 - t0; return api; },
    // the 2D avatar's other calls are accepted and ignored
    setShape: function () { return api; }, shutdown: function () { return api; }, activity: function () { return api; }
  };
  window.ka = api;
})();
