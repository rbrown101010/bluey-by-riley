/*
 * Keramik 3D: the Keramik avatar (capsule shape) as a real 3D head, built with three.js (global THREE).
 * The face lives on the head's display as a glowing texture: eyes and mouth glance across the display
 * quickly, and the head follows the same gaze more slowly, so face and head move independently.
 *
 * Page needs <div id="ka3d"></div>. Optional: window.KA_FILL (0…1, how much of the view the head fills).
 * API on window.ka: setMood(id), react(id|null), look(x, y) (-1…1, y down; null = wander), boot().
 * Moods and reactions are the same as the 2D avatar's (vendor/keramik-avatar), with the same faces:
 *   moods: neutral happy think wow focus oops wink sleep question alert meh confused
 *   reactions: stop idea heart timer confetti coffee thumb wave umbrella magnifier music battery
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
  var W = 176, H = 116, D = 56;            // overall size, like the 2D capsule (176 × 116), fairly slim
  var BS = 12, BT = 13;                     // rounded edges: bevel size / thickness
  // Rounded rectangle (a full capsule when r = h / 2) as one clean outline: corner arcs sampled
  // evenly and no repeated points, so the surfaces triangulate without gaps or creases.
  function pill(w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    var hw = w / 2 - r, hh = h / 2 - r, pts = [], N = 24;
    [[hw, hh, 0], [-hw, hh, 0.5], [-hw, -hh, 1], [hw, -hh, 1.5]].forEach(function (c) {
      for (var i = 0; i <= N; i++) {
        var a = (c[2] + 0.5 * i / N) * Math.PI;
        var p = new T.Vector2(c[0] + r * Math.cos(a), c[1] + r * Math.sin(a));
        var prev = pts[pts.length - 1];
        if (!prev || prev.distanceTo(p) > 1e-3) pts.push(p);
      }
    });
    if (pts[0].distanceTo(pts[pts.length - 1]) < 1e-3) pts.pop();
    return new T.Shape(pts);
  }
  var head = new T.Group();
  var pivot = new T.Group();               // turns, nods and bobs the whole head
  pivot.add(head); scene.add(pivot);

  var ceramic = new T.MeshPhysicalMaterial({ color: 0xf3f3f1, roughness: 0.32, metalness: 0, clearcoat: 1,
    clearcoatRoughness: 0.12, envMapIntensity: 1.0 });
  var bodyGeo = new T.ExtrudeGeometry(pill(W - 2 * BS, H - 2 * BS, (H - 2 * BS) / 2), {
    depth: D - 2 * BT, bevelEnabled: true, bevelThickness: BT, bevelSize: BS, bevelSegments: 14 });
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
  var screenGeo = new T.ShapeGeometry(pill(SW, SH, SR));
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
  var rimGeo = new T.ShapeGeometry((function () { var s = pill(SW + 4, SH + 4, SR + 2); s.holes.push(new T.Path(pill(SW, SH, SR).getPoints())); return s; })());
  var rim = new T.Mesh(rimGeo, new T.MeshStandardMaterial({ color: 0xd7d8db, roughness: 0.5 }));
  rim.position.z = FRONT + 0.1; head.add(rim);

  // Side pods, the top slot.
  var trim = new T.MeshPhysicalMaterial({ color: 0xe9eaec, roughness: 0.4, clearcoat: 0.6 });
  [-1, 1].forEach(function (side) {
    var pod = new T.Mesh(new T.CapsuleGeometry(4.2, 20, 8, 16), trim);
    pod.position.set(side * (W / 2 - 1.2), 0, 2); head.add(pod);
  });
  var slot = new T.Mesh(new T.CapsuleGeometry(3.4, 14, 8, 16), trim);
  slot.rotation.z = Math.PI / 2; slot.position.set(0, H / 2 - 2.6, 4); head.add(slot);

  // Soft contact shadow under him.
  var shCanvas = document.createElement('canvas'); shCanvas.width = shCanvas.height = 128;
  (function () {
    var c = shCanvas.getContext('2d'), g = c.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, 'rgba(0,0,0,0.55)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = g; c.fillRect(0, 0, 128, 128);
  })();
  var shadow = new T.Mesh(new T.PlaneGeometry(W * 1.1, D * 1.2),
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
    var needH = (H + 60) / FILL, needW = (W + 70) / FILL;   // room for the arm and props
    var dist = Math.max(needH, needW / camera.aspect) / (2 * tan) + D / 2;
    camera.position.set(0, 6, dist);
    camera.lookAt(0, -6, 0);
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);
  resize();


  // ---------- extras: arm, antenna, headphones ----------
  var armMat = new T.MeshPhysicalMaterial({ color: 0xf1f1ef, roughness: 0.35, clearcoat: 0.8 });
  var arm = new T.Group(); head.add(arm);
  var unitCyl = new T.CylinderGeometry(3.6, 3.6, 1, 16);
  var upper = new T.Mesh(unitCyl, armMat), lower = new T.Mesh(unitCyl, armMat);
  var elbowJ = new T.Mesh(new T.SphereGeometry(4.4, 16, 12), armMat);
  var handJ = new T.Mesh(new T.SphereGeometry(6, 18, 14), armMat);
  arm.add(upper, lower, elbowJ, handJ);
  var UP = new T.Vector3(0, 1, 0);
  function segment(mesh, a, b) {
    var d = new T.Vector3().subVectors(b, a), len = Math.max(0.001, d.length());
    mesh.position.copy(a).addScaledVector(d, 0.5);
    mesh.scale.set(1, len, 1);
    mesh.quaternion.setFromUnitVectors(UP, d.normalize());
  }
  var SHOULDER = new T.Vector3(W / 2 - 2, -4, 2);

  // props are camera-facing sprites drawn on canvases
  function spriteFrom(draw, w, h) {
    var c = document.createElement('canvas'); c.width = w; c.height = h;
    draw(c.getContext('2d'), w, h);
    var tex = new T.CanvasTexture(c); tex.encoding = T.sRGBEncoding;
    var s = new T.Sprite(new T.SpriteMaterial({ map: tex, transparent: true, depthTest: true }));
    s.userData.aspect = h / w;
    return s;
  }
  function emoji(ch) {
    return spriteFrom(function (c, w, h) {
      c.font = Math.round(w * 0.78) + 'px "Apple Color Emoji","Noto Color Emoji","Segoe UI Emoji",sans-serif';
      c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(ch, w / 2, h / 2 + w * 0.05);
    }, 160, 160);
  }
  var PROPS = {
    stop: spriteFrom(function (c, w, h) {     // red octagon sign on a pole
      c.fillStyle = '#C7C7CC'; c.fillRect(w / 2 - 5, h * 0.5, 10, h * 0.5);
      var r = w * 0.44, cx = w / 2, cy = w / 2;
      c.beginPath();
      for (var i = 0; i < 8; i++) { var a = Math.PI / 8 + i * Math.PI / 4; c.lineTo(cx + r * Math.cos(a), cy + r * Math.sin(a)); }
      c.closePath(); c.fillStyle = '#FFFFFF'; c.fill();
      c.save(); c.translate(cx, cy); c.scale(0.86, 0.86); c.translate(-cx, -cy);
      c.fillStyle = '#FF3B30'; c.fill(); c.restore();
      c.fillStyle = '#FFFFFF'; c.font = '800 ' + Math.round(w * 0.2) + 'px Inter, system-ui, sans-serif';
      c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('STOP', cx, cy + 2);
    }, 160, 260),
    coffee: emoji('☕️'), thumb: emoji('👍'), wave: emoji('👋'), umbrella: emoji('☂️'),
    magnifier: emoji('🔍'), confetti: emoji('🎉')
  };
  Object.keys(PROPS).forEach(function (k) { PROPS[k].visible = false; head.add(PROPS[k]); });

  // where the hand goes (head coordinates), prop size and offset from the hand
  var HOLD = {
    stop:      { hand: [W / 2 + 28, 20, 12], size: 56, off: [0, 38, 2] },
    coffee:    { hand: [W / 2 + 26, -6, 18], size: 48, off: [4, 12, 3] },
    thumb:     { hand: [W / 2 + 28, 10, 14], size: 52, off: [2, 10, 3] },
    wave:      { hand: [W / 2 + 28, 30, 10], size: 52, off: [2, 10, 3] },
    umbrella:  { hand: [W / 2 + 6, 44, 8], size: 120, off: [-58, 40, 0] },
    confetti:  { hand: [W / 2 + 28, 16, 12], size: 52, off: [2, 12, 3] },
    magnifier: { hand: [44, -24, FRONT + 20], size: 58, off: [-8, 14, 2] }
  };

  var antenna = new T.Group(); antenna.position.set(0, H / 2 - 1.5, -2); head.add(antenna);
  var stem = new T.Mesh(new T.CylinderGeometry(1.3, 1.6, 16, 10), trim); stem.position.y = 8; antenna.add(stem);
  var lampMat = new T.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 1, roughness: 0.3 });
  var lamp = new T.Mesh(new T.SphereGeometry(4.6, 20, 16), lampMat); lamp.position.y = 18; antenna.add(lamp);
  var rays = spriteFrom(function (c, w, h) {
    c.strokeStyle = '#FFD60A'; c.lineWidth = 7; c.lineCap = 'round';
    for (var i = 0; i < 8; i++) {
      var a = i * Math.PI / 4;
      c.beginPath(); c.moveTo(w / 2 + Math.cos(a) * w * 0.26, h / 2 + Math.sin(a) * h * 0.26);
      c.lineTo(w / 2 + Math.cos(a) * w * 0.42, h / 2 + Math.sin(a) * h * 0.42); c.stroke();
    }
  }, 128, 128);
  rays.position.y = 18; rays.scale.set(34, 34, 1); antenna.add(rays);
  antenna.scale.set(1, 0.001, 1); antenna.visible = false;

  var phones = new T.Group(); head.add(phones);
  var phoneMat = new T.MeshPhysicalMaterial({ color: 0x2c2c30, roughness: 0.45, clearcoat: 0.5 });
  var band = new T.Mesh(new T.TorusGeometry(W / 2 + 6, 3, 10, 60, Math.PI), phoneMat);
  band.scale.y = (H / 2 + 12) / (W / 2 + 6); phones.add(band);
  [-1, 1].forEach(function (side) {
    var cup = new T.Mesh(new T.CylinderGeometry(13, 13, 9, 28), phoneMat);
    cup.rotation.z = Math.PI / 2; cup.position.set(side * (W / 2 + 4), 0, 0); phones.add(cup);
  });
  phones.scale.setScalar(0.001); phones.visible = false;

  // ---------- the original Keramik face, drawn on the display ----------
  // Same geometry and expressions as the 2D component (vendor/keramik-avatar), in its 200 × 196 face space.
  var KC = 1.333;
  var CFG = { ex1: 80, ex2: 120, ey: 96, rx: 10, ry: 15, look: 0.9, aw: 11, ah: 8, bg: 20, bw: 8, my: 126, mw: 8 };
  function nr(v) { return Math.round(v * 100) / 100; }
  function P() { var a = []; for (var i = 0; i < arguments.length; i++) { var x = arguments[i]; a.push(typeof x === 'number' ? nr(x) : x); } return a.join(' '); }
  function eyeP(C, e, cx) {
    var s = e.s || 'open', k = e.sc || 1, sy = e.sy || 1, look = C.look || 1, cy = C.ey;
    if (s === 'arc') { var Hh = C.ah * 1.4; return [cx - C.aw, cy + C.ah * 0.4, cx + C.aw, cy + C.ah * 0.4, Hh * KC, -(Hh - 4.5) * KC]; }
    if (s === 'closed') { var Dd = C.ah * 0.7; return [cx - C.aw, cy, cx + C.aw, cy, -Dd * KC, (Dd + 4) * KC]; }
    var px = cx + (e.dx || 0) * look, py = cy + (e.dy || 0) * look, rx = C.rx * k, ry = C.ry * k * sy;
    return [px - rx, py, px + rx, py, ry * KC, ry * KC];
  }
  function mouthP(C, m) {
    var x = 100, y = C.my, w = C.mw;
    switch (m) {
      case 'big': return [x - w * 1.2, y - 2, x + w * 1.2, y - 2, 0, 0, w * 1.3 * KC, w * 1.3 * KC];
      case 'side': return [x - w * 0.5, y + 3, x + w * 0.8, y - 2, 2.5, 2.5, 6.5, 6.5];
      case 'o': return [x - w * 0.34, y + 3, x + w * 0.34, y + 3, -w * 0.44 * KC, -w * 0.44 * KC, w * 0.44 * KC, w * 0.44 * KC];
      case 'flat': return [x - w * 0.5, y + 3, x + w * 0.5, y + 3, -1, -1, 1, 1];
      case 'frown': return [x - w * 0.7, y + 6, x + w * 0.7, y + 6, -9, -9, -4.5, -4.5];
      case 'wave': return [x - w * 0.8, y + 4, x + w * 0.8, y + 4, -7, 7, -3.5, 10.5];
      case 'smirk': return [x - w * 0.7, y + 1, x + w * 0.9, y - 4, 5, 5, 9, 9];
      default: return [x - w, y, x + w, y, w * 0.6 * KC, w * 0.6 * KC, (w * 0.6 + 3.2) * KC, (w * 0.6 + 3.2) * KC];
    }
  }
  function browP(C, b) {
    var a = C.ex1, c = C.ex2, by = C.ey - C.bg, w = C.bw;
    switch (b) {
      case 'raise': return [a - w, by + 1, a, by - 2, a + w, by + 1, c - w, by - 5, c, by - 12, c + w, by - 5, 1];
      case 'up': return [a - w, by - 4, a, by - 11, a + w, by - 4, c - w, by - 4, c, by - 11, c + w, by - 4, 1];
      case 'sad': return [a - w, by + 2, a, by - 1, a + w, by - 4, c - w, by - 4, c, by - 1, c + w, by + 2, 1];
      case 'angry': return [a - w, by - 3, a, by, a + w, by + 3, c - w, by + 3, c, by, c + w, by - 3, 1];
      default: return [a - w, by, a, by - 3, a + w, by, c - w, by, c, by - 3, c + w, by, 0];
    }
  }
  function faceVec(md) {
    var t = md.t || {};
    return [].concat(eyeP(CFG, md.L, CFG.ex1), eyeP(CFG, md.R, CFG.ex2), mouthP(CFG, md.m), browP(CFG, md.b), [t.r || 0, t.ty || 0, t.s || 1]);
  }
  function eyeD(v, i, bl) {
    var x0 = v[i], y0 = v[i + 1], x1 = v[i + 2], y1 = v[i + 3], kt = v[i + 4] * bl, kb = v[i + 5] * bl;
    return P('M', x0, y0, 'C', x0, y0 - kt, x1, y1 - kt, x1, y1, 'C', x1, y1 + kb, x0, y0 + kb, x0, y0, 'Z');
  }
  function mouthD(v, i) {
    var x0 = v[i], y0 = v[i + 1], x1 = v[i + 2], y1 = v[i + 3], Wd = x1 - x0;
    return P('M', x0, y0, 'C', x0 + Wd * 0.1, y0 + v[i + 4], x1 - Wd * 0.1, y1 + v[i + 5], x1, y1,
      'C', x1 - Wd * 0.1, y1 + v[i + 7], x0 + Wd * 0.1, y0 + v[i + 6], x0, y0, 'Z');
  }
  function browD(v, i) {
    return P('M', v[i], v[i + 1], 'Q', v[i + 2], v[i + 3], v[i + 4], v[i + 5], 'M', v[i + 6], v[i + 7], 'Q', v[i + 8], v[i + 9], v[i + 10], v[i + 11]);
  }

  var MOODS = {
    neutral:  { L: {}, R: {}, m: 'smile', t: {} },
    happy:    { L: { s: 'arc' }, R: { s: 'arc' }, m: 'big', t: { ty: -6, s: 1.04 } },
    think:    { L: { dx: 5, dy: -6, sy: 0.9 }, R: { dx: 5, dy: -6, sy: 0.9 }, m: 'side', b: 'raise', t: { r: -6 } },
    wow:      { L: { sc: 1.18 }, R: { sc: 1.18 }, m: 'o', b: 'up', t: { ty: -8, s: 1.06 } },
    focus:    { L: { sy: 0.42, dy: 3 }, R: { sy: 0.42, dy: 3 }, m: 'flat', t: { ty: 2, s: 0.97 } },
    oops:     { L: { dy: 4, sy: 0.85 }, R: { dy: 4, sy: 0.85 }, m: 'wave', b: 'sad', t: { r: 5, ty: 3, s: 0.96 } },
    wink:     { L: {}, R: { s: 'arc' }, m: 'smirk', t: { r: 4, ty: -2 } },
    sleep:    { L: { s: 'closed' }, R: { s: 'closed' }, m: 'flat', t: { ty: 4, s: 0.95 }, sym: 'zzz' },
    question: { L: { dx: -4, dy: -5, sy: 0.9 }, R: { dx: -4, dy: -5, sy: 0.9 }, m: 'side', b: 'raise', t: { r: -5 }, sym: '?' },
    alert:    { L: { sc: 1.2 }, R: { sc: 1.2 }, m: 'o', b: 'up', t: { ty: -6, s: 1.05 }, sym: '!' },
    meh:      { L: { sy: 0.55, dy: 2 }, R: { sy: 0.55, dy: 2 }, m: 'frown', b: 'angry', t: { r: 3 }, sym: '!?' },
    confused: { L: { sc: 0.85 }, R: { sc: 1.15, dy: -2 }, m: 'wave', b: 'raise', t: { r: -5 }, sym: '??' }
  };
  var REACTS = {
    stop:      { L: { sy: 0.55, dy: 1 }, R: { sy: 0.55, dy: 1 }, m: 'frown', b: 'angry', t: { r: -3 } },
    idea:      { L: { sc: 1.12, dy: -4 }, R: { sc: 1.12, dy: -4 }, m: 'smile', b: 'up', t: { ty: -6, s: 1.04 } },
    heart:     { L: { s: 'arc' }, R: { s: 'arc' }, m: 'big', t: { ty: -4 } },
    timer:     { L: {}, R: {}, m: 'flat', t: { r: 2 } },
    confetti:  { L: { s: 'arc' }, R: { s: 'arc' }, m: 'big', t: { ty: -10, s: 1.07 } },
    coffee:    { L: { s: 'arc' }, R: { s: 'arc' }, m: 'smile', t: { ty: 2, r: 2 } },
    thumb:     { L: { s: 'arc' }, R: { s: 'arc' }, m: 'big', t: { ty: -3 } },
    wave:      { L: {}, R: { s: 'arc' }, m: 'big', t: { r: -3 } },
    umbrella:  { L: { dy: -5 }, R: { dy: -5 }, m: 'smile', t: {} },
    magnifier: { L: { sy: 0.55 }, R: { sc: 1.5 }, m: 'flat', b: 'raise', t: { r: -3 } },
    music:     { L: { s: 'closed' }, R: { s: 'closed' }, m: 'smile', t: {} },
    battery:   { L: { s: 'closed' }, R: { s: 'closed' }, m: 'flat', t: { ty: 5, r: 4, s: 0.95 } }
  };
  var TIMER_DONE = { L: { s: 'arc' }, R: { s: 'arc' }, m: 'smile', t: {} };

  // ---------- state ----------
  var mood = 'neutral', reaction = null, reactAt = 0, bootAt = 0;
  var vec = faceVec(MOODS.neutral);
  var gazeTarget = null, wander = { x: 0, y: 0 }, nextWander = 0;
  var faceG = { x: 0, y: 0 }, headG = { x: 0, y: 0 };
  var blinkAt = 1.5, blinkStart = -1;
  var armK = 0, antK = 0, phonesK = 0, prop = null;
  var parts = [];      // hearts, notes, rain, confetti (2D overlay)
  var posed = null;    // fixed head angles for inspection, see pose()
  var t0 = performance.now() / 1000, last = t0, lastSpawn = 0;

  function now() { return performance.now() / 1000 - t0; }
  function spring(o, x, y, k) { o.x += (x - o.x) * k; o.y += (y - o.y) * k; }
  function timerDone(t) { return reaction === 'timer' && t - reactAt > 3; }
  function currentDef(t) {
    if (reaction) return timerDone(t) ? TIMER_DONE : REACTS[reaction];
    return MOODS[mood] || MOODS.neutral;
  }

  // ---------- drawing the display ----------
  var SC = Math.min(SW / 120, SH / 92);   // the 2D component's face scale for this display
  function drawFace(t, bl, faceAlpha) {
    var c = fc;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.clearRect(0, 0, FW, FH);
    var bg = c.createRadialGradient(FW / 2, FH * 0.55, 0, FW / 2, FH * 0.55, FW * 0.6);
    bg.addColorStop(0, '#24262b'); bg.addColorStop(1, '#101114');
    c.fillStyle = bg; c.fillRect(0, 0, FW, FH);

    var red = reaction === 'stop';
    var glow = red ? '#FF453A' : '#F4F7FF';
    c.shadowColor = red ? 'rgba(255,69,58,0.9)' : 'rgba(225,235,255,0.85)';
    c.shadowBlur = 8 * K;
    c.fillStyle = glow; c.strokeStyle = glow; c.lineCap = 'round'; c.lineJoin = 'round';
    c.globalAlpha = faceAlpha;

    var screenOnly = (reaction === 'timer' && !timerDone(t)) || reaction === 'battery';
    if (reaction === 'timer' && !timerDone(t)) {
      c.setTransform(K, 0, 0, K, FW / 2, FH / 2);
      c.globalAlpha = faceAlpha * (Math.floor(t * 2) % 2 ? 0.3 : 1);
      c.textAlign = 'center'; c.font = '700 30px Inter, system-ui, sans-serif'; c.fillText('00:00', 0, 8);
      c.font = '700 8.5px Inter, system-ui, sans-serif'; c.fillText('ABGELAUFEN', 0, 24);
    } else if (reaction === 'battery') {
      c.setTransform(K, 0, 0, K, FW / 2, FH / 2);
      c.lineWidth = 2.4; c.shadowBlur = 5 * K;
      c.beginPath(); c.roundRect ? c.roundRect(-24, -20, 44, 22, 4) : c.rect(-24, -20, 44, 22); c.stroke();
      c.fillRect(21.5, -13, 4, 8);
      c.fillStyle = '#FF453A'; c.globalAlpha = faceAlpha * (Math.floor(t * 2) % 2 ? 0.25 : 1);
      c.fillRect(-20.5, -16.5, 6, 15);
      c.globalAlpha = faceAlpha; c.fillStyle = glow; c.textAlign = 'center';
      c.font = '700 8.5px Inter, system-ui, sans-serif'; c.fillText('AKKU 5 %', 0, 18);
    }
    if (!screenOnly) {
      // eyes glance ahead of the head; the mouth follows a little less
      var ex = faceG.x * 20, ey = faceG.y * 10;
      var base = function (dx, dy) { c.setTransform(K * SC, 0, 0, K * SC, FW / 2 + dx * K, FH / 2 + dy * K); c.translate(-100, -98); };
      base(ex, ey);
      var eyes = new Path2D(eyeD(vec, 0, bl) + ' ' + eyeD(vec, 6, bl));
      c.fill(eyes); c.lineWidth = 1; c.stroke(eyes);
      var bo = Math.max(0, Math.min(1, vec[32]));
      if (bo > 0.01) { c.globalAlpha = faceAlpha * bo; c.lineWidth = 3.5; c.stroke(new Path2D(browD(vec, 20))); c.globalAlpha = faceAlpha; }
      base(ex * 0.7, ey * 0.7);
      var m = new Path2D(mouthD(vec, 12));
      c.fill(m); c.lineWidth = 2.2; c.stroke(m);

      // the mood's symbol, top right of the display (as on the 2D avatar)
      var def = currentDef(t);
      c.setTransform(K, 0, 0, K, FW / 2 + 48 * K, FH / 2 - 17 * K);
      if (def.sym === 'zzz') {
        c.shadowBlur = 5 * K;
        for (var i = 0; i < 3; i++) {
          var p = (t / 2.4 + i / 3) % 1;
          c.globalAlpha = faceAlpha * Math.sin(p * Math.PI);
          c.font = '700 ' + (10 + i * 3) + 'px Inter, system-ui, sans-serif';
          c.fillText(i === 2 ? 'Z' : 'z', -6 + p * 8, 4 - p * 22);
        }
      } else if (def.sym) {
        var pulse = 1 + 0.08 * Math.sin(t * 4.8);
        c.scale(pulse, pulse); c.globalAlpha = faceAlpha;
        c.textAlign = 'center'; c.font = '700 20px Inter, system-ui, sans-serif'; c.fillText(def.sym, 0, 7);
      }
    }
    c.setTransform(K, 0, 0, K, FW / 2, FH / 2);
    c.globalAlpha = 1; c.shadowBlur = 0;
    c.strokeStyle = 'rgba(255,255,255,0.22)'; c.lineWidth = 2.4;
    c.beginPath(); c.moveTo(-56, -14); c.quadraticCurveTo(-52, -32, -36, -36); c.stroke();
    faceTex.needsUpdate = true;
  }

  // ---------- overlay effects (hearts, notes, rain, confetti) ----------
  var tmpV = new T.Vector3();
  function toScreen(x, y, z, obj) {
    tmpV.set(x, y, z).applyMatrix4((obj || head).matrixWorld).project(camera);
    return { x: (tmpV.x + 1) / 2 * root.clientWidth, y: (1 - tmpV.y) / 2 * root.clientHeight };
  }
  function pxPerUnit() {
    var a = toScreen(-W / 2, 0, FRONT), b = toScreen(W / 2, 0, FRONT);
    return Math.max(0.2, Math.hypot(b.x - a.x, b.y - a.y) / W);
  }
  var COLORS = ['#FF453A', '#FFD60A', '#30D158', '#64D2FF', '#BF5AF2', '#FF9F0A'];
  function burst(at, u) {
    for (var i = 0; i < 90; i++) {
      var a = -Math.PI / 2 + 0.5 + (Math.random() - 0.5) * 1.8, s = (3 + Math.random() * 6) * u * 2;
      parts.push({ kind: 'confetti', x: at.x, y: at.y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, r: Math.random() * 6,
        vr: (Math.random() - 0.5) * 0.4, c: COLORS[i % COLORS.length], life: 1, u: u });
    }
  }
  function spawnAmbient(t, u) {
    if (t - lastSpawn < (reaction === 'umbrella' ? 0.03 : 0.35)) return;
    lastSpawn = t;
    var top = toScreen(0, H / 2, 0);
    if (reaction === 'heart') {
      parts.push({ kind: 'heart', x: top.x + (Math.random() - 0.5) * W * u, y: top.y + 10 * u, vx: (Math.random() - 0.5) * 0.4, vy: -1.1 * u, life: 1, s: (0.7 + Math.random() * 0.6) * u, r: 0, vr: 0 });
    } else if (reaction === 'music') {
      var side = Math.random() < 0.5 ? -1 : 1, ear = toScreen(side * (W / 2 + 8), 6, 0);
      parts.push({ kind: 'note', x: ear.x, y: ear.y, vx: side * 0.5 * u, vy: -0.9 * u, life: 1, s: u, ch: Math.random() < 0.5 ? '♪' : '♫', r: 0, vr: 0 });
    } else if (reaction === 'umbrella' && armK > 0.95) {
      var span = W * 1.3 * u;
      parts.push({ kind: 'rain', x: top.x + 20 * u + (Math.random() - 0.5) * span, y: top.y - 90 * u, vx: -0.6 * u, vy: 7 * u, life: 1, s: u, r: 0, vr: 0, floor: top.y - 40 * u });
    }
  }
  function heartPath(c, s) {
    c.beginPath(); c.moveTo(0, 3 * s);
    c.bezierCurveTo(-6 * s, -2 * s, -4 * s, -8 * s, 0, -5 * s);
    c.bezierCurveTo(4 * s, -8 * s, 6 * s, -2 * s, 0, 3 * s); c.fill();
  }
  function drawParts(dt) {
    var w = root.clientWidth, h = root.clientHeight;
    fxc.clearRect(0, 0, w, h);
    if (!parts.length) return;
    var n = dt * 60;
    parts = parts.filter(function (p) {
      if (p.kind === 'confetti') { p.vy += 0.22 * n * p.u; p.vx *= Math.pow(0.99, n); p.life -= 0.006 * n; }
      else if (p.kind === 'rain') { if (p.y > p.floor) p.life = 0; }
      else { p.life -= 0.012 * n; p.x += Math.sin((1 - p.life) * 9) * 0.3 * n; }
      p.x += p.vx * n; p.y += p.vy * n; p.r += p.vr * n;
      if (p.life <= 0 || p.y > h + 20 || p.y < -40) return false;
      fxc.save(); fxc.globalAlpha = Math.min(1, p.life * 2); fxc.translate(p.x, p.y); fxc.rotate(p.r);
      if (p.kind === 'confetti') { fxc.fillStyle = p.c; fxc.fillRect(-3 * p.u, -1.6 * p.u, 6 * p.u, 3.2 * p.u); }
      else if (p.kind === 'heart') { fxc.fillStyle = '#FF375F'; heartPath(fxc, p.s * 1.6); }
      else if (p.kind === 'note') { fxc.fillStyle = '#F4F7FF'; fxc.font = '700 ' + Math.round(20 * p.s) + 'px Inter, system-ui, sans-serif'; fxc.fillText(p.ch, 0, 0); }
      else if (p.kind === 'rain') { fxc.strokeStyle = 'rgba(120,190,255,0.8)'; fxc.lineWidth = 1.6 * p.s; fxc.beginPath(); fxc.moveTo(0, 0); fxc.lineTo(-1 * p.s, 8 * p.s); fxc.stroke(); }
      fxc.restore();
      return true;
    });
  }

  // ---------- loop ----------
  var easeK = function (k) { var c1 = 1.4, c3 = c1 + 1; return 1 + c3 * Math.pow(k - 1, 3) + c1 * Math.pow(k - 1, 2); };
  var SNAP = !!window.KA_SNAP;   // previews: jump straight to each pose instead of animating
  function step() {
    var tNow = performance.now() / 1000, t = tNow - t0, dt = Math.min(0.05, tNow - last);
    last = tNow;
    var n = SNAP ? 1000 : dt * 60;
    var def = currentDef(t);

    // expression: morph the face vector toward the target, like the 2D avatar
    var tv = faceVec(def), ke = 1 - Math.pow(1 - 0.18, n);
    for (var i = 0; i < vec.length; i++) vec[i] += (tv[i] - vec[i]) * ke;

    // gaze
    var want;
    if (gazeTarget) want = gazeTarget;
    else {
      if (t > nextWander) { wander = { x: Math.random() * 1.6 - 0.8, y: Math.random() * 1.0 - 0.6 }; nextWander = t + 0.8 + Math.random() * 2.2; }
      want = wander;
    }
    var busyFace = reaction === 'magnifier' || reaction === 'battery' || reaction === 'timer';
    spring(faceG, busyFace ? 0 : want.x, busyFace ? 0 : want.y, 1 - Math.pow(1 - 0.22, n));
    spring(headG, want.x, want.y, 1 - Math.pow(1 - 0.045, n));

    // blinking (open eyes only)
    var eyesOpen = !def.L.s && !def.R.s;
    if (t > blinkAt && blinkStart < 0) blinkStart = t;
    var blink = 0;
    if (blinkStart >= 0) {
      var b = (t - blinkStart) / 0.17;
      if (b >= 1) { blinkStart = -1; blinkAt = t + (Math.random() < 0.22 ? 0.18 : 2.4 + Math.random() * 3.2); }
      else blink = b < 0.5 ? b * 2 : (1 - b) * 2;
    }
    var bl = eyesOpen ? 1 - 0.92 * blink : 1;

    // arm, antenna, headphones
    var hold = reaction && HOLD[reaction];
    armK += ((hold ? 1 : 0) - armK) * (1 - Math.pow(1 - 0.12, n));
    if (hold) prop = reaction;
    antK += (((reaction === 'idea' || reaction === 'stop') ? 1 : 0) - antK) * (1 - Math.pow(1 - 0.12, n));
    phonesK += ((reaction === 'music' ? 1 : 0) - phonesK) * (1 - Math.pow(1 - 0.12, n));

    arm.visible = armK > 0.02;
    Object.keys(PROPS).forEach(function (k) { PROPS[k].visible = false; });
    if (arm.visible && prop) {
      var hd = HOLD[prop], k = easeK(Math.min(1, armK));
      var handT = new T.Vector3(hd.hand[0], hd.hand[1], hd.hand[2]);
      if (prop === 'wave') { handT.x += Math.sin(t * 9) * 5; handT.y += Math.cos(t * 9) * 1.5; }
      var hand = SHOULDER.clone().lerp(handT, k);
      var elbow = SHOULDER.clone().lerp(hand, 0.5).add(new T.Vector3(8 * k, -10 * k, prop === 'magnifier' ? 10 * k : 2 * k));
      segment(upper, SHOULDER, elbow); segment(lower, elbow, hand);
      elbowJ.position.copy(elbow); handJ.position.copy(hand);
      var ps = PROPS[prop], size = hd.size * Math.max(0, Math.min(1, (armK - 0.55) / 0.4));
      if (size > 0.5) {
        ps.visible = true;
        ps.position.set(hand.x + hd.off[0], hand.y + hd.off[1], hand.z + hd.off[2]);
        ps.scale.set(size, size * ps.userData.aspect, 1);
        ps.material.rotation = prop === 'wave' ? Math.sin(t * 9) * 0.35 : 0;
      }
    }
    antenna.visible = antK > 0.01;
    antenna.scale.set(1, Math.max(0.001, easeK(Math.min(1, antK))), 1);
    var lampColor = reaction === 'stop' ? 0xff453a : (reaction === 'idea' ? 0xffd60a : 0xffffff);
    lampMat.color.setHex(lampColor); lampMat.emissive.setHex(lampColor);
    rays.visible = reaction === 'idea' && antK > 0.9;
    if (rays.visible) { var rs = 30 + Math.sin(t * 6) * 4; rays.scale.set(rs, rs, 1); }
    phones.visible = phonesK > 0.01;
    phones.scale.setScalar(Math.max(0.001, easeK(Math.min(1, phonesK))));

    // head pose: gaze turn plus the expression's own tilt, lift and scale
    var bootK = SNAP ? 1 : Math.min(1, Math.max(0, (t - bootAt) / 0.9));
    var ease = 1 - Math.pow(1 - bootK, 3);
    var yaw = headG.x * 0.38, pitch = headG.y * 0.2;
    var roll = Math.sin(t * 0.7) * 0.015 - headG.x * 0.03 - vec[33] * Math.PI / 180;
    var bob = Math.sin(t * 1.8) * 1.2 - vec[34];
    var sc = vec[35];
    if (mood === 'sleep' && !reaction) bob = Math.sin(t * 1.1) * 2.2 - vec[34];
    if (reaction === 'music') { roll += Math.sin(t * 3.2) * 0.07; bob += Math.abs(Math.sin(t * 3.2)) * 1.5; }
    if (reaction === 'battery') { pitch += 0.12; bob += Math.sin(t * 0.9) * 0.6; }
    if (reaction === 'stop') yaw += Math.sin((t - reactAt) * 26) * 0.06 * Math.max(0, 1 - (t - reactAt) / 0.6);
    if (posed) { yaw = posed[0]; pitch = posed[1]; roll = 0; }
    pivot.rotation.set(pitch, yaw, roll);
    pivot.position.y = bob;
    var s = (0.86 + 0.14 * ease) * sc;
    pivot.scale.set(s, s, s);
    shadow.material.opacity = 0.9 * ease * (1 - bob / 30);
    shadow.scale.setScalar(1 - bob / 80);

    drawFace(t, bl, SNAP ? 1 : Math.min(1, Math.max(0, (t - bootAt - 0.35) / 0.4)));
    renderer.render(scene, camera);

    pivot.updateMatrixWorld(true);
    var u = pxPerUnit();
    if (reaction) spawnAmbient(t, u);
    if (reaction === 'confetti' && !confettiFired && armK > 0.9) {
      confettiFired = true;
      var hp = HOLD.confetti.hand;
      burst(toScreen(hp[0] + 6, hp[1] + 10, hp[2]), u);
    }
    drawParts(dt);
  }
  function frame() { step(); requestAnimationFrame(frame); }
  var confettiFired = false;
  if (!SNAP) requestAnimationFrame(frame);

  // ---------- API ----------
  var api = {
    setMood: function (id) { mood = MOODS[id] ? id : 'neutral'; reaction = null; return api; },
    react: function (id) {
      reaction = id && REACTS[id] ? id : null; reactAt = now(); confettiFired = false;
      return api;
    },
    look: function (x, y) {
      gazeTarget = x == null ? null : { x: Math.max(-1, Math.min(1, +x || 0)), y: Math.max(-1, Math.min(1, +y || 0)) };
      return api;
    },
    /** Holds the head at fixed angles (radians) to inspect the model; pose(null) releases it. */
    pose: function (yaw, pitch) { posed = yaw == null ? null : [yaw, pitch || 0]; return api; },
    boot: function () { bootAt = now(); return api; },
    // the 2D avatar's other calls are accepted and ignored
    setShape: function () { return api; }, shutdown: function () { return api; }, activity: function () { return api; },
    moods: Object.keys(MOODS), reactions: Object.keys(REACTS),
    _step: step, _canvas: renderer.domElement
  };
  window.ka = api;
})();
