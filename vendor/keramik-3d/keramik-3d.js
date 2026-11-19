/*
 * Keramik 3D: the Keramik avatar (capsule shape) as a real 3D head, built with three.js (global THREE).
 *
 * Everything the 2D component (vendor/keramik-avatar) can do, rebuilt in 3D:
 *   - the same 12 moods (faces drawn on the head's display, eyes glancing independently of the head)
 *   - the same 12 reactions, with mechanical choreography: side hatches lift and glide away along the
 *     body (like the Rolls-Royce Spirit of Ecstasy flap), arms telescope out, tools unfold piece by
 *     piece (the confetti cannon assembles like a Transformers weapon), the antenna rises from a lid
 *   - activities: he takes glasses out of a hatch, puts them on with both hands, then a curved
 *     three-panel hologram HUD unfolds in front of him
 *   - boot (progress bar becomes his eyes) and shutdown (old-TV collapse)
 *
 * Page needs <div id="ka3d"></div>. Optional: window.KA_FILL (0…1, how much of the view he fills).
 * API on window.ka: setMood(id), react(id|null), activity(id|null, {query}), look(x, y) (-1…1, y down;
 * null = wander), boot(), shutdown(). The HUD shows sample data except the clock and the query.
 *   moods: neutral happy think wow focus oops wink sleep question alert meh confused
 *   reactions: stop idea heart timer confetti coffee thumb wave umbrella magnifier music battery
 *   activities: search tasks mail cal run
 */
(function () {
  'use strict';
  var T = window.THREE;
  var root = document.getElementById('ka3d');
  if (!T || !root) return;
  var FILL = window.KA_FILL || 0.8;
  var SNAP = !!window.KA_SNAP;   // previews: time only moves through ka._advance(sec)

  // ======================================================================================
  // renderer, camera, light
  // ======================================================================================
  var renderer = new T.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: SNAP });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 3));
  renderer.outputEncoding = T.sRGBEncoding;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.setClearColor(0x000000, 0);
  root.appendChild(renderer.domElement);
  var fx = document.createElement('canvas');   // hearts, notes, rain, steam, confetti on top
  fx.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none';
  root.appendChild(fx);
  var fxc = fx.getContext('2d');

  var scene = new T.Scene();
  var camera = new T.PerspectiveCamera(24, 1, 10, 5000);

  (function () {   // a soft studio environment, so the glazed ceramic gets real reflections
    var env = new T.Scene();
    env.background = new T.Color(0x4a4d55);
    var panel = function (w, h, x, y, z, c) {
      var m = new T.Mesh(new T.PlaneGeometry(w, h), new T.MeshBasicMaterial({ color: c, side: T.DoubleSide }));
      m.position.set(x, y, z); m.lookAt(0, 0, 0); env.add(m);
    };
    panel(6, 3, 0, 6, 2, 0xffffff);
    panel(3, 4, -6, 1, 3, 0xdfe6ff);
    panel(2, 4, 6, 0, -2, 0xfff1e0);
    panel(10, 2, 0, -5, 0, 0x22242a);
    var pm = new T.PMREMGenerator(renderer);
    scene.environment = pm.fromScene(env, 0.035).texture;
  })();
  var key = new T.DirectionalLight(0xffffff, 0.9); key.position.set(-120, 160, 220); scene.add(key);
  scene.add(new T.HemisphereLight(0xffffff, 0x30323a, 0.35));

  // ======================================================================================
  // helpers
  // ======================================================================================
  function clamp(v) { return v < 0 ? 0 : (v > 1 ? 1 : v); }
  function sm(t) { t = clamp(t); return t * t * (3 - 2 * t); }
  function eob(k) { k = clamp(k); var c1 = 1.6, c3 = c1 + 1; return 1 + c3 * Math.pow(k - 1, 3) + c1 * Math.pow(k - 1, 2); }
  function seg(v, a, b) { return sm((v - a) / (b - a)); }
  function V3(x, y, z) { return new T.Vector3(x, y, z); }
  function lerpV(a, b, t) { return a.clone().lerp(b, t); }
  function quadV(a, c, b, t) { var u = 1 - t; return a.clone().multiplyScalar(u * u).addScaledVector(c, 2 * u * t).addScaledVector(b, t * t); }

  // Rounded rectangle (a full capsule when r = h / 2) as one clean outline, no repeated points.
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
  function pillRing(w, h, r, t) {
    var s = pill(w, h, r);
    s.holes.push(new T.Path(pill(w - 2 * t, h - 2 * t, Math.max(0.5, r - t)).getPoints().reverse()));
    return s;
  }
  function canvasTex(w, h) {
    var c = document.createElement('canvas'); c.width = w; c.height = h;
    var tex = new T.CanvasTexture(c); tex.encoding = T.sRGBEncoding; tex.anisotropy = 4;
    return { c: c, x: c.getContext('2d'), tex: tex };
  }
  var UP = V3(0, 1, 0);
  function placeBetween(mesh, a, b) {   // a unit-height cylinder stretched from a to b
    var d = V3(0, 0, 0).subVectors(b, a), len = Math.max(0.001, d.length());
    mesh.position.copy(a).addScaledVector(d, 0.5);
    mesh.scale.set(1, len, 1);
    mesh.quaternion.setFromUnitVectors(UP, d.normalize());
  }
  // two equal segments from S to T; the elbow bends toward `pole`
  function ik(S, Tg, L, pole) {
    var d = V3(0, 0, 0).subVectors(Tg, S), dist = Math.max(0.001, d.length());
    var dm = Math.min(dist, 2 * L - 0.01), dir = d.multiplyScalar(1 / dist);
    var a = Math.sqrt(Math.max(0, L * L - dm * dm / 4));
    var perp = pole.clone().addScaledVector(dir, -pole.dot(dir));
    if (perp.lengthSq() < 1e-6) perp = V3(0, -1, 0);
    perp.normalize();
    var mid = S.clone().addScaledVector(dir, dm / 2);
    return { e: mid.addScaledVector(perp, a), h: S.clone().addScaledVector(dir, dm) };
  }

  // ======================================================================================
  // materials
  // ======================================================================================
  var ceramic = new T.MeshPhysicalMaterial({ color: 0xf3f3f1, roughness: 0.32, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.12 });
  var trim = new T.MeshPhysicalMaterial({ color: 0xe9eaec, roughness: 0.4, clearcoat: 0.6 });
  var metal = new T.MeshStandardMaterial({ color: 0x3b3e46, roughness: 0.32, metalness: 0.75 });
  var gun = new T.MeshStandardMaterial({ color: 0x2a2d33, roughness: 0.38, metalness: 0.8 });
  var dark = new T.MeshStandardMaterial({ color: 0x111215, roughness: 0.8 });
  var glowBlue = new T.MeshBasicMaterial({ color: 0x64d2ff, toneMapped: false });
  var orange = new T.MeshStandardMaterial({ color: 0xff9f0a, roughness: 0.4, metalness: 0.3, emissive: 0x6b3500 });
  var red = new T.MeshBasicMaterial({ color: 0xd8231a, toneMapped: false });   // a sign is flat, saturated red
  var white = new T.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 });

  // ======================================================================================
  // the head
  // ======================================================================================
  var W = 176, H = 116, D = 56;
  var BS = 12, BT = 13;
  var head = new T.Group();
  var pivot = new T.Group();   // turns, nods and bobs the whole head
  pivot.add(head); scene.add(pivot);
  var bodyGeo = new T.ExtrudeGeometry(pill(W - 2 * BS, H - 2 * BS, (H - 2 * BS) / 2), {
    depth: D - 2 * BT, bevelEnabled: true, bevelThickness: BT, bevelSize: BS, bevelSegments: 14 });
  bodyGeo.center();
  head.add(new T.Mesh(bodyGeo, ceramic));
  var FRONT = D / 2;

  // display
  var SW = 140, SH = 88, SR = 40;
  var FW = 700, FH = Math.round(FW * SH / SW), K = FW / SW;
  var face = canvasTex(FW, FH), fc = face.x;
  var screenGeo = new T.ShapeGeometry(pill(SW, SH, SR));
  (function () {
    var uv = screenGeo.attributes.uv, pos = screenGeo.attributes.position;
    for (var i = 0; i < uv.count; i++) uv.setXY(i, pos.getX(i) / SW + 0.5, pos.getY(i) / SH + 0.5);
  })();
  var screen = new T.Mesh(screenGeo, new T.MeshBasicMaterial({ map: face.tex, toneMapped: false }));
  screen.position.z = FRONT + 0.15; head.add(screen);
  var glass = new T.Mesh(screenGeo, new T.MeshPhysicalMaterial({ color: 0x000000, roughness: 0.04, clearcoat: 1,
    clearcoatRoughness: 0.02, transparent: true, opacity: 0.18, envMapIntensity: 1.6, depthWrite: false }));
  glass.position.z = FRONT + 0.6; head.add(glass);
  var rim = new T.Mesh(new T.ShapeGeometry(pillRing(SW + 4, SH + 4, SR + 2, 2)), new T.MeshStandardMaterial({ color: 0xd7d8db, roughness: 0.5 }));
  rim.position.z = FRONT + 0.1; head.add(rim);

  // ---- side hatches: a door lifts off the surface and glides down along the curve; a lit bay opens
  var SIDE_R = H / 2;                                // the side ends are half circles of this radius
  function makeHatch(side) {
    var g = { side: side };
    var cx = side * (W / 2 - SIDE_R);                 // centre of the side's curve
    var bay = new T.Mesh(new T.ExtrudeGeometry(pill(13, 28, 6.5), { depth: 0.6, bevelEnabled: false }), dark);
    bay.rotation.y = side * Math.PI / 2; bay.position.set(side * (W / 2 - 0.5), 0, 2); head.add(bay);
    var light = new T.Mesh(new T.ShapeGeometry(pill(9, 22, 4.5)), new T.MeshBasicMaterial({ color: 0x9be3ff, transparent: true, opacity: 0, toneMapped: false, side: T.DoubleSide }));
    light.rotation.y = side * Math.PI / 2; light.position.set(side * (W / 2 + 0.2), 0, 2); head.add(light);
    var hinge = new T.Group(); hinge.position.set(cx, 0, 0); head.add(hinge);   // rides on the curve's centre
    var door = new T.Mesh(new T.ExtrudeGeometry(pill(14, 30, 7), { depth: 1.6, bevelEnabled: true, bevelThickness: 0.6, bevelSize: 0.6, bevelSegments: 3 }), trim);
    door.rotation.y = side * Math.PI / 2;
    hinge.add(door);
    g.update = function (d) {
      var lift = 1.8 * sm(d / 0.22), glide = sm((d - 0.22) / 0.78);
      door.position.set(side * (SIDE_R - 0.4 + lift * (1 - glide * 0.6)), 0, 2);
      hinge.rotation.z = -side * glide * 0.72;       // down along the curve
      light.material.opacity = 0.85 * sm((d - 0.15) / 0.5);
    };
    g.update(0);
    return g;
  }
  var hatchR = makeHatch(1), hatchL = makeHatch(-1);

  // ---- top: a lid over the antenna bay, and the little timer button
  var TOPY = H / 2;
  var antBay = new T.Mesh(new T.ShapeGeometry(pill(20, 8, 4)), dark);
  antBay.rotation.x = -Math.PI / 2; antBay.position.set(0, TOPY + 0.05, 4); head.add(antBay);
  var lidHinge = new T.Group(); lidHinge.position.set(0, TOPY, -0.5); head.add(lidHinge);   // hinged at the back edge
  var lid = new T.Mesh(new T.ExtrudeGeometry(pill(21, 9, 4.5), { depth: 1.2, bevelEnabled: true, bevelThickness: 0.4, bevelSize: 0.4, bevelSegments: 2 }), trim);
  lid.rotation.x = -Math.PI / 2; lid.position.set(0, 0, 4.5); lidHinge.add(lid);
  var btn = new T.Mesh(new T.CylinderGeometry(4, 4.4, 2.4, 28), new T.MeshStandardMaterial({ color: 0xff9f0a, roughness: 0.35, emissive: 0x5a2c00 }));
  btn.position.set(-30, TOPY + 0.6, 6); head.add(btn);

  // ---- antenna (rises out of the top bay)
  var antenna = new T.Group(); antenna.position.set(0, TOPY, 4); head.add(antenna);
  var rod1 = new T.Mesh(new T.CylinderGeometry(1.7, 1.9, 12, 14), metal), rod2 = new T.Mesh(new T.CylinderGeometry(1.2, 1.4, 12, 14), metal);
  antenna.add(rod1, rod2);
  var lampMat = new T.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 1.2, roughness: 0.25 });
  var lamp = new T.Mesh(new T.SphereGeometry(4.6, 22, 16), lampMat); antenna.add(lamp);
  var raysTex = canvasTex(128, 128);
  (function (c, w) {
    c.strokeStyle = '#FFD60A'; c.lineWidth = 7; c.lineCap = 'round';
    for (var i = 0; i < 8; i++) {
      var a = i * Math.PI / 4;
      c.beginPath(); c.moveTo(w / 2 + Math.cos(a) * w * 0.26, w / 2 + Math.sin(a) * w * 0.26);
      c.lineTo(w / 2 + Math.cos(a) * w * 0.42, w / 2 + Math.sin(a) * w * 0.42); c.stroke();
    }
  })(raysTex.x, 128);
  var rays = new T.Sprite(new T.SpriteMaterial({ map: raysTex.tex, transparent: true, depthWrite: false }));
  antenna.add(rays);

  // ---- shadow
  var sh = canvasTex(128, 128);
  (function (c) { var g = c.createRadialGradient(64, 64, 0, 64, 64, 64); g.addColorStop(0, 'rgba(0,0,0,0.55)'); g.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = g; c.fillRect(0, 0, 128, 128); })(sh.x);
  var shadow = new T.Mesh(new T.PlaneGeometry(W * 1.1, D * 1.2), new T.MeshBasicMaterial({ map: sh.tex, transparent: true, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2; shadow.position.y = -H / 2 - 16; scene.add(shadow);

  // ======================================================================================
  // arms: shoulder collar in the bay, telescoping upper arm and forearm, metal joints
  // ======================================================================================
  function makeArm(side) {
    var a = { side: side, group: new T.Group() };
    head.add(a.group);
    var cyl = new T.CylinderGeometry(4.4, 4.4, 1, 18), inner = new T.CylinderGeometry(3.3, 3.3, 1, 14);
    a.upper = new T.Mesh(cyl, ceramic); a.fore = new T.Mesh(cyl, ceramic);
    a.upperIn = new T.Mesh(inner, metal); a.foreIn = new T.Mesh(inner, metal);   // telescoping inner sleeves
    a.collar = new T.Mesh(new T.TorusGeometry(5.6, 1.4, 10, 24), metal); a.collar.rotation.y = Math.PI / 2;
    a.elbow = new T.Mesh(new T.SphereGeometry(5.4, 18, 14), metal);
    a.wrist = new T.Mesh(new T.SphereGeometry(4.6, 16, 12), metal);
    a.group.add(a.upper, a.fore, a.upperIn, a.foreIn, a.collar, a.elbow, a.wrist);
    a.S = V3(side * (W / 2 - 3), 0, 2);
    a.collar.position.copy(a.S).add(V3(side * 2.4, 0, 0));
    a.group.visible = false;
    a.set = function (hand, reach, pole) {
      a.group.visible = reach > 0.01;
      if (!a.group.visible) return a.S.clone();
      var L = 4 + 30 * Math.min(1.3, reach);
      var r = ik(a.S, hand, L, pole || V3(0.2 * side, -1, -0.3));
      var midU = lerpV(a.S, r.e, 0.55), midF = lerpV(r.e, r.h, 0.55);
      placeBetween(a.upper, a.S, midU); placeBetween(a.upperIn, midU, r.e);
      placeBetween(a.fore, r.e, midF); placeBetween(a.foreIn, midF, r.h);
      a.elbow.position.copy(r.e); a.wrist.position.copy(r.h);
      return r.h;
    };
    return a;
  }
  var armR = makeArm(1), armL = makeArm(-1);

  // ======================================================================================
  // tools
  // ======================================================================================
  var tools = {};
  function tool(name) { var g = new T.Group(); g.visible = false; head.add(g); tools[name] = g; return g; }

  // STOP: pole telescopes up out of the hand in three sections, then the sign fans open from 8 petals
  (function () {
    var g = tool('stop');
    g.poles = [0, 1, 2].map(function (i) { var m = new T.Mesh(new T.CylinderGeometry(1.7 - i * 0.35, 1.7 - i * 0.35, 1, 12), metal); g.add(m); return m; });
    g.sign = new T.Group(); g.add(g.sign);
    var R = 16, petal = function (r, depth, mat) {
      var s = new T.Shape(); s.moveTo(0, 0);
      s.lineTo(r * Math.cos(Math.PI / 8), r * Math.sin(Math.PI / 8)); s.lineTo(r * Math.cos(-Math.PI / 8), r * Math.sin(-Math.PI / 8)); s.lineTo(0, 0);
      return new T.Mesh(new T.ExtrudeGeometry(s, { depth: depth, bevelEnabled: false }), mat);
    };
    g.petals = [];
    for (var i = 0; i < 8; i++) {
      var p = new T.Group(), wp = petal(R, 1.2, white), rp = petal(R * 0.86, 0.6, red);
      rp.position.z = 1.25; p.add(wp, rp); g.sign.add(p); g.petals.push(p);
    }
    var lbl = canvasTex(256, 128);
    lbl.x.fillStyle = '#fff'; lbl.x.font = '800 92px Inter, system-ui, sans-serif'; lbl.x.textAlign = 'center'; lbl.x.textBaseline = 'middle'; lbl.x.fillText('STOP', 128, 68);
    g.label = new T.Mesh(new T.PlaneGeometry(22, 11), new T.MeshBasicMaterial({ map: lbl.tex, transparent: true, depthWrite: false }));
    g.label.position.z = 2.0; g.sign.add(g.label);
    g.update = function (t, hand) {
      g.position.copy(hand);
      var lens = [0, 1, 2].map(function (i) { return 10 * seg(t, i * 0.13, (i + 1) * 0.13 + 0.05); });
      var y = 0;
      g.poles.forEach(function (m, i) { m.visible = lens[i] > 0.05; placeBetween(m, V3(0, y, 0), V3(0, y + Math.max(0.05, lens[i]), 0)); y += lens[i] * 0.92; });
      g.sign.position.set(0, y + 14, 0);
      var open = clamp((t - 0.38) / 0.62);
      g.sign.visible = open > 0;
      g.petals.forEach(function (p, i) {
        var k = eob(clamp(open * 1.5 - i * 0.06));   // fan out, one after another
        p.rotation.z = Math.PI / 8 + i * Math.PI / 4 * k;
        p.scale.setScalar(0.2 + 0.8 * clamp(open * 3));
      });
      g.label.material.opacity = sm((t - 0.82) / 0.18);
    };
  })();

  // CONFETTI CANNON (Gunface style): receiver locks on, barrels slide out in stages, fins and side
  // panels flip open, the cannon swings up, the muzzle ring lights, it fires with recoil
  (function () {
    var g = tool('confetti');
    g.body = new T.Group(); g.add(g.body);
    var recv = new T.Mesh(new T.BoxGeometry(14, 10, 10), gun); recv.position.x = 2; g.body.add(recv);
    var stripe = new T.Mesh(new T.BoxGeometry(14.2, 2, 10.2), orange); stripe.position.set(2, 2.2, 0); g.body.add(stripe);
    g.barrels = [[4.6, 12], [3.8, 11], [3.0, 10]].map(function (b) {
      var m = new T.Mesh(new T.CylinderGeometry(b[0], b[0], b[1], 20), gun); m.rotation.z = -Math.PI / 2; m.userData.len = b[1]; g.body.add(m); return m;
    });
    g.rings = [0, 1].map(function () { var m = new T.Mesh(new T.TorusGeometry(4.1, 0.6, 8, 24), orange); m.rotation.y = Math.PI / 2; g.body.add(m); return m; });
    g.muzzle = new T.Mesh(new T.TorusGeometry(3.1, 0.9, 10, 28), glowBlue); g.muzzle.rotation.y = Math.PI / 2; g.body.add(g.muzzle);
    g.fins = [1, -1].map(function (s) {
      var h = new T.Group(); h.position.set(-4, s * 5, 0);
      var fin = new T.Mesh(new T.BoxGeometry(12, 0.9, 7), gun); fin.position.set(6, s * 0.4, 0); h.add(fin);
      var tip = new T.Mesh(new T.BoxGeometry(3, 1, 7.2), orange); tip.position.set(11, s * 0.4, 0); h.add(tip);
      g.body.add(h); h.userData.s = s; return h;
    });
    g.panels = [1, -1].map(function (s) {
      var h = new T.Group(); h.position.set(-5, 0, s * 5);
      var p = new T.Mesh(new T.BoxGeometry(10, 8, 0.8), gun); p.position.set(5, 0, s * 0.4); h.add(p);
      var gl = new T.Mesh(new T.BoxGeometry(6, 1, 0.9), glowBlue); gl.position.set(5, 0, s * 0.85); h.add(gl);
      g.body.add(h); h.userData.s = s; return h;
    });
    var flashTex = canvasTex(128, 128);
    (function (c) { var gr = c.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.3, 'rgba(255,214,10,0.9)'); gr.addColorStop(1, 'rgba(255,120,0,0)'); c.fillStyle = gr; c.fillRect(0, 0, 128, 128); })(flashTex.x);
    g.flash = new T.Sprite(new T.SpriteMaterial({ map: flashTex.tex, transparent: true, depthWrite: false, blending: T.AdditiveBlending }));
    g.body.add(g.flash);
    g.update = function (t, hand, recoilK, flashK) {
      g.position.copy(hand);
      var lock = eob(clamp(t / 0.18));
      g.body.scale.setScalar(0.3 + 0.7 * lock);
      var s1 = seg(t, 0.12, 0.32), s2 = seg(t, 0.26, 0.46), s3 = seg(t, 0.4, 0.6);
      var b = g.barrels;
      b[0].position.x = 9 + b[0].userData.len / 2 - 12 * (1 - s1);
      b[1].position.x = b[0].position.x + (b[0].userData.len / 2 + b[1].userData.len / 2 - 2) * s2;
      b[2].position.x = b[1].position.x + (b[1].userData.len / 2 + b[2].userData.len / 2 - 2) * s3;
      b[0].visible = s1 > 0.02; b[1].visible = s2 > 0.02; b[2].visible = s3 > 0.02;
      g.rings[0].position.x = b[0].position.x + b[0].userData.len / 2; g.rings[0].visible = s2 > 0.2;
      g.rings[1].position.x = b[1].position.x + b[1].userData.len / 2; g.rings[1].visible = s3 > 0.2;
      var mz = b[2].position.x + b[2].userData.len / 2;
      g.muzzle.position.x = mz; g.muzzle.scale.setScalar(Math.max(0.01, seg(t, 0.8, 1)));
      g.flash.position.x = mz + 4; g.flash.scale.setScalar(Math.max(0.01, 26 * flashK)); g.flash.visible = flashK > 0.01;
      var finK = eob(seg(t, 0.36, 0.6));
      g.fins.forEach(function (f) { f.rotation.z = f.userData.s * 1.15 * finK; });
      var panK = eob(seg(t, 0.46, 0.7));
      g.panels.forEach(function (p) { p.rotation.y = -p.userData.s * 1.0 * panK; });
      var aim = eob(seg(t, 0.55, 0.85));
      g.body.rotation.set(0, -1.25 * aim, 0.42 * aim);   // swings toward the viewer and up
      g.body.position.x = -3.5 * recoilK;
    };
  })();

  // COFFEE: a cup rises out of the palm, steam follows
  (function () {
    var g = tool('coffee');
    g.add(new T.Mesh(new T.CylinderGeometry(6, 4.8, 10, 28, 1, true), ceramic));
    var bottom = new T.Mesh(new T.CircleGeometry(4.8, 24), ceramic); bottom.rotation.x = Math.PI / 2; bottom.position.y = -5; g.add(bottom);
    var coffee = new T.Mesh(new T.CircleGeometry(5.6, 24), new T.MeshStandardMaterial({ color: 0x4a2a14, roughness: 0.2 })); coffee.rotation.x = -Math.PI / 2; coffee.position.y = 3.6; g.add(coffee);
    var handle = new T.Mesh(new T.TorusGeometry(3, 0.9, 8, 20, Math.PI), ceramic); handle.rotation.z = -Math.PI / 2; handle.position.x = 5.6; g.add(handle);
    g.add(new T.Mesh(new T.CylinderGeometry(5.7, 4.6, 9.6, 28, 1, true), new T.MeshStandardMaterial({ color: 0xeeeeec, side: T.BackSide })));
    g.update = function (t, hand) {
      var k = eob(seg(t, 0, 0.7));
      g.position.copy(hand).add(V3(0, 6 * k + 2, 0));
      g.scale.setScalar(Math.max(0.01, k));
      g.updateMatrixWorld(true);
      g.top = g.localToWorld(V3(0, 5, 0));
    };
  })();

  // THUMB: a fist forms, the thumb flips up
  (function () {
    var g = tool('thumb');
    g.add(new T.Mesh(new T.BoxGeometry(9, 9, 8), ceramic));
    for (var i = 0; i < 4; i++) { var f = new T.Mesh(new T.CapsuleGeometry(1.6, 5.5, 4, 10), ceramic); f.rotation.x = Math.PI / 2; f.position.set(-4.6, 3.3 - i * 2.2, 1); g.add(f); }
    g.thumbPivot = new T.Group(); g.thumbPivot.position.set(1.5, 4.5, 0); g.add(g.thumbPivot);
    var th = new T.Mesh(new T.CapsuleGeometry(1.9, 6, 4, 10), ceramic); th.position.y = 4; g.thumbPivot.add(th);
    g.update = function (t, hand) {
      g.position.copy(hand).add(V3(2, 4, 0));
      g.scale.setScalar(Math.max(0.01, eob(seg(t, 0, 0.4))));
      g.thumbPivot.rotation.z = -Math.PI / 2 * (1 - eob(seg(t, 0.35, 0.8)));
    };
  })();

  // WAVE: an open hand, fingers fan out, then it waves
  (function () {
    var g = tool('wave');
    g.add(new T.Mesh(new T.BoxGeometry(10, 9, 3), ceramic));
    g.fingers = [0, 1, 2, 3].map(function (i) {
      var p = new T.Group(); p.position.set(-3.6 + i * 2.4, 4.5, 0);
      var f = new T.Mesh(new T.CapsuleGeometry(1.1, 5.5 + (i === 1 || i === 2 ? 1 : 0), 4, 10), ceramic); f.position.y = 3.6; p.add(f); g.add(p); return p;
    });
    var tp = new T.Group(); tp.position.set(-5, -1, 0); var th = new T.Mesh(new T.CapsuleGeometry(1.2, 4.5, 4, 10), ceramic); th.position.y = 2.8; tp.add(th); tp.rotation.z = 0.9; g.add(tp);
    g.update = function (t, hand, time) {
      g.position.copy(hand).add(V3(1, 6, 1));
      g.scale.setScalar(Math.max(0.01, eob(seg(t, 0, 0.4))));
      var fan = eob(seg(t, 0.3, 0.75));
      g.fingers.forEach(function (f, i) { f.rotation.z = (1.5 - i) * 0.16 * fan; });
      g.rotation.z = t > 0.75 ? Math.sin(time * 9) * 0.35 * seg(t, 0.75, 1) : 0;
    };
  })();

  // UMBRELLA: the shaft telescopes over his head, the canopy snaps open
  (function () {
    var g = tool('umbrella');
    g.shaft = new T.Mesh(new T.CylinderGeometry(1.4, 1.4, 1, 10), metal); g.add(g.shaft);
    g.canopy = new T.Mesh(new T.ConeGeometry(1, 1, 8, 1, true), new T.MeshPhysicalMaterial({ color: 0x0a84ff, roughness: 0.4, clearcoat: 0.6, side: T.DoubleSide }));
    g.add(g.canopy);
    g.ribs = [];
    for (var i = 0; i < 8; i++) { var r = new T.Mesh(new T.CylinderGeometry(0.35, 0.35, 1, 6), metal); g.add(r); g.ribs.push(r); }
    g.tip = new T.Mesh(new T.SphereGeometry(1.4, 10, 8), metal); g.add(g.tip);
    g.update = function (t, hand) {
      g.position.set(0, 0, 0);
      var top = V3(10, TOPY + 42, 6), grow = sm(t / 0.42);
      var end = lerpV(hand, top, grow);
      placeBetween(g.shaft, hand, end);
      var open = eob(seg(t, 0.42, 1));
      var radius = 4 + 44 * open, height = 30 - 8 * open;
      g.canopy.visible = grow > 0.95;
      g.canopy.position.copy(end).add(V3(0, -height / 2 + 2, 0));
      g.canopy.scale.set(radius, height, radius);
      g.tip.position.copy(end).add(V3(0, 2.2, 0));
      g.ribs.forEach(function (r, i) {
        var a = i * Math.PI / 4 + Math.PI / 8;
        var rimP = end.clone().add(V3(Math.cos(a) * radius * 0.92, -height + 2.5, Math.sin(a) * radius * 0.92));
        r.visible = g.canopy.visible; placeBetween(r, end.clone().add(V3(0, 1.5, 0)), rimP);
      });
      g.span = { c: end.clone(), r: radius };
    };
  })();

  // MAGNIFIER: the ring unfolds from the handle and moves in front of his right eye
  (function () {
    var g = tool('magnifier');
    g.handle = new T.Mesh(new T.CylinderGeometry(1.3, 1.5, 1, 12), new T.MeshStandardMaterial({ color: 0x1c1c1e, roughness: 0.5 })); g.add(g.handle);
    g.lens = new T.Group(); g.add(g.lens);
    g.lens.add(new T.Mesh(new T.TorusGeometry(10, 1.3, 12, 40), metal));
    g.lens.add(new T.Mesh(new T.CircleGeometry(9.6, 40), new T.MeshPhysicalMaterial({ color: 0xbfe3ff, roughness: 0.02, transparent: true, opacity: 0.28, clearcoat: 1, depthWrite: false })));
    var EYE = V3((120 - 100) * 0.978, 2, FRONT + 7);
    g.update = function (t, hand) {
      g.position.set(0, 0, 0);
      var k = sm(t / 0.6), lensP = lerpV(hand.clone().add(V3(0, 6, 0)), EYE, k);
      placeBetween(g.handle, hand, lensP.clone().add(V3(0, -9.5 * clamp(t * 3), 0)));
      g.lens.position.copy(lensP);
      var unfold = eob(seg(t, 0.1, 0.6));
      g.lens.scale.set(Math.max(0.05, unfold), Math.max(0.05, unfold), 1);
      g.lens.rotation.x = (1 - unfold) * Math.PI / 2;
    };
  })();

  // HEADPHONES: ear cups slide out of both hatches, then the band builds itself over his head
  var phones = new T.Group(); head.add(phones); phones.visible = false;
  var cups = [1, -1].map(function (s) {
    var c = new T.Group();
    var shell = new T.Mesh(new T.CylinderGeometry(12, 12, 8, 30), gun); shell.rotation.z = Math.PI / 2; c.add(shell);
    var cushion = new T.Mesh(new T.TorusGeometry(10, 2.4, 10, 30), new T.MeshStandardMaterial({ color: 0x1b1b1d, roughness: 0.9 })); cushion.rotation.y = Math.PI / 2; cushion.position.x = -s * 4; c.add(cushion);
    var ring = new T.Mesh(new T.TorusGeometry(8, 0.7, 8, 30), glowBlue); ring.rotation.y = Math.PI / 2; ring.position.x = s * 4.1; c.add(ring);
    phones.add(c); c.userData.s = s; return c;
  });
  var bandSegs = [];
  for (var bi = 0; bi < 26; bi++) { var bseg = new T.Mesh(new T.BoxGeometry(5, 3.2, 8), gun); phones.add(bseg); bandSegs.push(bseg); }

  // GLASSES: two rounded lenses with white frames and a blinking status light
  var glasses = new T.Group(); head.add(glasses); glasses.visible = false;
  (function () {
    var frameMat = new T.MeshPhysicalMaterial({ color: 0xe5e5ea, roughness: 0.3, clearcoat: 0.8 });
    var lensMat = new T.MeshBasicMaterial({ color: 0x64d2ff, transparent: true, opacity: 0.22, depthWrite: false, toneMapped: false });
    [-1, 1].forEach(function (s) {
      var f = new T.Mesh(new T.ExtrudeGeometry(pillRing(34, 26, 10, 2.2), { depth: 2, bevelEnabled: false }), frameMat);
      f.position.set(s * 20, 0, 0); glasses.add(f);
      var l = new T.Mesh(new T.ShapeGeometry(pill(30, 22, 8)), lensMat); l.position.set(s * 20, 0, 1); glasses.add(l);
      var glint = new T.Mesh(new T.PlaneGeometry(1.6, 12), new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.45, depthWrite: false }));
      glint.position.set(s * 20 - 6, 1, 1.2); glint.rotation.z = -0.55; glasses.add(glint);
    });
    var bridge = new T.Mesh(new T.TorusGeometry(3.4, 1.1, 8, 16, Math.PI), frameMat); bridge.position.set(0, 2.5, 1); glasses.add(bridge);
    glasses.led = new T.Mesh(new T.SphereGeometry(1.3, 10, 8), glowBlue); glasses.led.position.set(31, 7, 2.2); glasses.add(glasses.led);
  })();
  var EYES_AT = V3(0, (98 - 96) * 0.978, FRONT + 3);

  // ======================================================================================
  // HUD: a curved hologram in three panels that unfolds in front of him
  // ======================================================================================
  var hud = new T.Group(); head.add(hud); hud.visible = false;
  var HUD_R = 104, HUD_Y = -50, HUD_H = 44;
  function hudPanel(a0, a1, w) {
    var ct = canvasTex(w, Math.round(w * HUD_H / (HUD_R * (a1 - a0) * Math.PI / 180)));
    var geo = new T.CylinderGeometry(HUD_R, HUD_R, HUD_H, 40, 1, true, a0 * Math.PI / 180, (a1 - a0) * Math.PI / 180);
    var m = new T.Mesh(geo, new T.MeshBasicMaterial({ map: ct.tex, transparent: true, side: T.DoubleSide, depthWrite: false, toneMapped: false }));
    var holder = new T.Group(); holder.add(m); holder.position.y = HUD_Y; hud.add(holder);
    return { ct: ct, mesh: m, holder: holder };
  }
  var pC = hudPanel(-27, 27, 640), pL = hudPanel(-78, -30, 512), pR = hudPanel(30, 78, 512);
  hud.position.z = -10;

  var ACTS = {
    search: { title: 'RECHERCHE', status: 'sucht …', icon: 'M11 5 A6 6 0 1 1 10.99 5 Z M15.5 15.5 L20 20', rl: 'FORTSCHRITT', rv: '68 %', bars: [4, 7, 5, 9, 6, 10] },
    cal: { title: 'KALENDER', status: 'plant …', icon: 'M4 6 H20 V20 H4 Z M4 10 H20 M9 3 V7 M15 3 V7', rl: 'KONFLIKTE', rv: '1', bars: [5, 6, 8, 7, 4, 3] },
    tasks: { title: 'AUFGABEN', status: 'hakt ab …', icon: 'M10 6 H20 M10 12 H20 M10 18 H20 M4 6 L5.5 7.5 L8 5 M4 12 L5.5 13.5 L8 11 M4 18 L5.5 19.5 L8 17', rl: 'OFFEN', rv: '4', bars: [3, 5, 4, 7, 6, 9] },
    mail: { title: 'POSTEINGANG', status: 'liest …', icon: 'M3 6 H21 V19 H3 Z M3 7 L12 13 L21 7', rl: 'UNGELESEN', rv: '12', bars: [2, 4, 3, 8, 5, 6] },
    run: { title: 'TERMINAL', status: 'tippt …', icon: 'M3 5 H21 V19 H3 Z M7 10 L10 12.5 L7 15 M12 15 H16', rl: 'FORTSCHRITT', rv: '68 %', bars: [6, 8, 7, 9, 10, 8] }
  };
  var CYAN = '#64D2FF', ICE = '#BFE3FF', DEEP = 'rgba(10,79,184,0.62)';
  function roundRect(c, x, y, w, h, r) { c.beginPath(); if (c.roundRect) c.roundRect(x, y, w, h, r); else c.rect(x, y, w, h); }
  function panelBase(c, w, h, sweepX) {
    c.clearRect(0, 0, w, h);
    c.fillStyle = DEEP; c.strokeStyle = 'rgba(100,210,255,0.9)'; c.lineWidth = 3;
    roundRect(c, 4, 4, w - 8, h - 8, 18); c.fill(); c.stroke();
    for (var y = 8; y < h; y += 6) { c.fillStyle = 'rgba(155,227,255,0.05)'; c.fillRect(6, y, w - 12, 2); }   // scan lines
    var g = c.createLinearGradient(sweepX - 40, 0, sweepX + 40, 0);
    g.addColorStop(0, 'rgba(155,227,255,0)'); g.addColorStop(0.5, 'rgba(155,227,255,0.25)'); g.addColorStop(1, 'rgba(155,227,255,0)');
    c.fillStyle = g; c.fillRect(6, 6, w - 12, h - 12);
  }
  function txt(c, s, x, y, size, weight, color, align) {
    c.fillStyle = color; c.font = (weight || 600) + ' ' + size + 'px Inter, system-ui, sans-serif'; c.textAlign = align || 'left'; c.textBaseline = 'alphabetic'; c.fillText(s, x, y);
  }
  function drawHud(time) {
    var id = act || lastAct || 'search', A = ACTS[id], at = time - hudAt;
    var sweep = (time * 0.35) % 1.6 - 0.3;
    var appear = function (i) { return clamp((at - 0.4 - i * 0.35) / 0.3); };
    // centre: the activity itself
    var c = pC.ct.x, w = pC.ct.c.width, h = pC.ct.c.height, s = h / 200;
    panelBase(c, w, h, sweep * w);
    c.save(); c.translate(28, 26 * s); c.scale(1.6 * s, 1.6 * s); c.strokeStyle = ICE; c.lineWidth = 2.4; c.lineCap = 'round'; c.lineJoin = 'round'; c.stroke(new Path2D(A.icon)); c.restore();
    txt(c, A.title, 74, 50 * s, 26 * s, 800, ICE);
    if (Math.floor(time * 2) % 2) txt(c, A.status, w - 28, 50 * s, 22 * s, 600, '#9BE3FF', 'right');
    c.fillStyle = 'rgba(100,210,255,0.45)'; c.fillRect(24, 64 * s, w - 48, 2);
    var y0 = 78 * s;
    if (id === 'search') {
      var q = query || 'Suche', typed = q.slice(0, Math.floor(clamp((at - 0.2) / 1.2) * q.length));
      c.fillStyle = 'rgba(255,255,255,0.95)'; roundRect(c, 24, y0, w - 48, 34 * s, 17 * s); c.fill();
      txt(c, typed + (Math.floor(time * 2) % 2 ? '|' : ''), 44, y0 + 23 * s, 20 * s, 600, '#0A2A5E');
      [['learn.microsoft.com', q + ' – Überblick'], ['heise.de › ratgeber', 'So richtest du es ein'], ['reddit.com › r/sysadmin', 'Erfahrungen aus der Praxis']].forEach(function (r, i) {
        c.globalAlpha = appear(i + 2); var y = y0 + 54 * s + i * 34 * s;
        txt(c, r[0], 30, y, 14 * s, 500, '#9BE3FF'); txt(c, r[1], 30, y + 18 * s, 19 * s, 700, '#FFFFFF'); c.globalAlpha = 1;
      });
    } else if (id === 'tasks') {
      ['Rechnung bezahlen', 'Backup prüfen', 'Mails beantworten', 'Einkaufsliste', 'Sport um 18:30'].forEach(function (s2, i) {
        var y = y0 + 8 * s + i * 22 * s, done = at > 1 + i * 0.7 && i < 3;
        c.globalAlpha = appear(i);
        c.strokeStyle = ICE; c.lineWidth = 2; c.strokeRect(30, y - 15 * s, 16 * s, 16 * s);
        if (done) { c.strokeStyle = '#30D158'; c.lineWidth = 3; c.beginPath(); c.moveTo(32, y - 7 * s); c.lineTo(30 + 6 * s, y - 2 * s); c.lineTo(30 + 15 * s, y - 13 * s); c.stroke(); }
        txt(c, s2, 40 + 18 * s, y, 17 * s, 600, done ? 'rgba(255,255,255,0.5)' : '#FFFFFF');
        c.globalAlpha = 1;
      });
    } else if (id === 'mail') {
      [['Stadtwerke', '08:12', 'Ihre Stromrechnung', true], ['Paketdienst', '07:45', 'Paket kommt heute'], ['Team', '07:30', 'Meeting verschoben'], ['Newsletter', 'Gestern', 'Neuigkeiten der Woche']].forEach(function (m, i) {
        var y = y0 + 12 * s + i * 28 * s; c.globalAlpha = appear(i);
        txt(c, m[0], 30, y, 16 * s, 800, '#FFFFFF'); txt(c, m[1], w - 30, y, 13 * s, 500, ICE, 'right');
        txt(c, m[2], 30, y + 14 * s, 14 * s, 500, '#D6ECFF');
        if (m[3]) { c.fillStyle = '#FF9F0A'; roundRect(c, w - 30 - 140 * s, y - 12 * s, 64 * s, 15 * s, 7 * s); c.fill(); txt(c, 'Wichtig', w - 30 - 108 * s, y, 11 * s, 700, '#1D1D1F', 'center'); }
        c.globalAlpha = 1;
      });
    } else if (id === 'cal') {
      var days = ['Mo', 'Di', 'Mi', 'Do', 'Fr'], cw = (w - 60) / 5;
      days.forEach(function (d, i) { txt(c, d, 30 + cw * i + cw / 2, y0 + 10 * s, 15 * s, 700, ICE, 'center'); });
      [[0, 0.05, 'Standup'], [1, 0.45, 'Arzt'], [2, 0.15, 'Projekt'], [3, 0.6, 'Sport'], [4, 0.3, 'Review'], [2, 0.65, 'Call']].forEach(function (e, i) {
        c.globalAlpha = appear(i * 0.6);
        var x = 32 + cw * e[0], y = y0 + 20 * s + e[1] * 80 * s;
        c.fillStyle = i === 1 ? 'rgba(255,159,10,0.85)' : 'rgba(100,210,255,0.55)'; c.fillRect(x, y, cw - 6, 22 * s);
        txt(c, e[2], x + 6, y + 16 * s, 13 * s, 700, '#FFFFFF'); c.globalAlpha = 1;
      });
    } else {
      ['$ ssh server', '$ rsync -av ~/daten backup/', 'sende Dateiliste …', '✓ db.sql  ✓ config/'].forEach(function (l, i) {
        var n = Math.floor(clamp((at - 0.3 - i * 0.9) / 0.7) * l.length);
        txt(c, l.slice(0, n) + (n < l.length && n > 0 && Math.floor(time * 3) % 2 ? '▌' : ''), 30, y0 + 14 * s + i * 22 * s, 16 * s, 600, i === 3 ? '#30D158' : '#FFFFFF');
      });
      var pr = clamp((at - 1) / 4);
      c.strokeStyle = ICE; c.lineWidth = 2; c.strokeRect(30, h - 30 * s, w - 60, 12 * s); c.fillStyle = CYAN; c.fillRect(32, h - 28 * s, (w - 64) * pr, 8 * s);
    }
    pC.ct.tex.needsUpdate = true;

    // left: weather (sample)
    c = pL.ct.x; w = pL.ct.c.width; h = pL.ct.c.height; s = h / 200;
    panelBase(c, w, h, (sweep + 0.35) * w);
    txt(c, 'WETTER', 30, 40 * s, 20 * s, 800, ICE);
    c.fillStyle = 'rgba(230,240,255,0.9)';
    [[50, 92, 18], [76, 82, 24], [102, 94, 16]].forEach(function (b) { c.beginPath(); c.arc(b[0] * s, b[1] * s, b[2] * s, 0, Math.PI * 2); c.fill(); });
    txt(c, '7°', w - 30, 108 * s, 60 * s, 800, '#FFFFFF', 'right');
    txt(c, 'Bewölkt', 30, 144 * s, 20 * s, 700, '#FFFFFF');
    txt(c, 'H 9°  ·  T 2°', 30, 168 * s, 16 * s, 500, ICE);
    txt(c, 'Regen 30 %', 30, 188 * s, 16 * s, 500, ICE);
    pL.ct.tex.needsUpdate = true;

    // right: now (real clock) and the activity's figures
    c = pR.ct.x; w = pR.ct.c.width; h = pR.ct.c.height; s = h / 200;
    panelBase(c, w, h, (sweep - 0.35) * w);
    var d = new Date(), hh = ('0' + d.getHours()).slice(-2), mm = ('0' + d.getMinutes()).slice(-2);
    txt(c, 'JETZT', 30, 40 * s, 20 * s, 800, ICE);
    txt(c, hh + (Math.floor(time) % 2 ? ':' : ' ') + mm, 30, 94 * s, 50 * s, 800, '#FFFFFF');
    txt(c, A.rl, 30, 124 * s, 14 * s, 700, ICE); txt(c, A.rv, w - 30, 124 * s, 19 * s, 800, '#FFFFFF', 'right');
    var bw = (w - 60) / A.bars.length;
    A.bars.forEach(function (b, i) {
      var bh = b * 5.5 * s * clamp((at - 0.3 - i * 0.12) / 0.5) * (1 + 0.08 * Math.sin(time * 3 + i));
      c.fillStyle = 'rgba(100,210,255,0.85)'; c.fillRect(30 + i * bw + 3, 190 * s - bh, bw - 6, bh);
    });
    pR.ct.tex.needsUpdate = true;
  }

  // ======================================================================================
  // framing
  // ======================================================================================
  function resize() {
    var w = root.clientWidth || window.innerWidth, h = root.clientHeight || window.innerHeight;
    renderer.setSize(w, h, false);
    renderer.domElement.style.cssText = 'position:absolute;inset:0;width:100%;height:100%';
    var dpr = Math.min(window.devicePixelRatio || 1, 3);
    fx.width = w * dpr; fx.height = h * dpr; fxc.setTransform(dpr, 0, 0, dpr, 0, 0);
    camera.aspect = w / h;
    var tan = Math.tan(camera.fov * Math.PI / 360);
    var needH = (H + 64) / FILL, needW = (W + 80) / FILL;   // room for arms, props and the HUD
    var dist = Math.max(needH, needW / camera.aspect) / (2 * tan) + D / 2;
    camera.position.set(0, 6, dist);
    camera.lookAt(0, -8, 0);
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);
  resize();

  // ======================================================================================
  // the original Keramik face (same geometry and expressions as the 2D component)
  // ======================================================================================
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
  var READ = { L: { dy: 5, sy: 0.85 }, R: { dy: 5, sy: 0.85 }, m: 'flat', t: { ty: -2 } };
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
  var BIG = { stop: 1.6, confetti: 1.7, thumb: 1.7, wave: 1.7, coffee: 1.6 };
  var SIDE = ['stop', 'coffee', 'confetti', 'thumb', 'wave', 'umbrella', 'magnifier'];
  var REACH = {   // where the right hand goes for each tool (head coordinates)
    stop: V3(W / 2 + 34, 14, 12), coffee: V3(W / 2 + 30, -4, 18), confetti: V3(W / 2 + 12, -6, 26),
    thumb: V3(W / 2 + 32, 10, 14), wave: V3(W / 2 + 32, 24, 10), umbrella: V3(W / 2 + 24, 16, 10),
    magnifier: V3(40, -26, FRONT + 18)
  };
  function bootProg(bk) {
    var p = clamp((bk - 0.2) / 0.35), e = function (t) { return 1 - Math.pow(1 - t, 3); };
    return 0.38 * e(clamp(p / 0.35)) + 0.22 * sm((p - 0.47) / 0.18) + 0.4 * e(clamp((p - 0.7) / 0.3));
  }
  function bootVec(bk) {   // the 2D boot: a progress bar grows, splits into two eyes, a mouth appears
    var sg = function (a, c) { return clamp((bk - a) / (c - a)); };
    var eoc = function (t) { return 1 - Math.pow(1 - t, 3); };
    var cy = CFG.ey, my = CFG.my, Hb = 2.5, pr = bootProg(bk);
    var x0 = 70, x1 = 70 + 2 * Hb + (60 - 2 * Hb) * pr, rx = (x1 - x0) / 2, ccx = (x0 + x1) / 2;
    var k3 = sm(sg(0.6, 0.72)), k4 = sg(0.72, 0.84), k5 = sm(sg(0.93, 0.99));
    rx = rx - 20 * k3;
    var ry = Hb + (CFG.ry - Hb) * eob(k4);
    var bt = sg(0.86, 0.92); if (bt > 0 && bt < 1) ry *= 1 - 0.85 * Math.sin(Math.PI * bt);
    var lx = ccx - (ccx - CFG.ex1) * k3, rxx = ccx + (CFG.ex2 - ccx) * k3;
    var eyes = [lx - rx, cy, lx + rx, cy, ry * KC, ry * KC, rxx - rx, cy, rxx + rx, cy, ry * KC, ry * KC];
    var mr = 2.6 * sm(sg(0.62, 0.74)), mY = cy + (my - cy) * eoc(sg(0.62, 0.76));
    var dot = [100 - mr, mY, 100 + mr, mY, -mr * KC, -mr * KC, mr * KC, mr * KC];
    var smile = mouthP(CFG, 'smile'), k4s = sm(k4);
    var mouth = dot.map(function (v, i) { return v + (smile[i] - v) * k4s; });
    var v = [].concat(eyes, mouth, browP(CFG, null), [0, 0, 1]);
    if (k5 > 0) { var hv = faceVec(MOODS.happy); v = v.map(function (x, i) { return x + (hv[i] - x) * k5; }); }
    return v;
  }

  // ======================================================================================
  // state, time and tweens (one clock drives everything, so previews can step through it)
  // ======================================================================================
  var clock = 0;
  var mood = 'neutral', reaction = null, act = null, lastAct = null, query = '';
  var shown = null;                    // tool currently in the right hand
  var timerDone = false, bootHappyUntil = 0, offDone = false;
  var hudAt = 0, fired = false, recoil = 0, flash = 0, firePending = false, reactAt = 0;
  var Vv = { ext: 0, extL: 0, press: 0, ant: 0, phones: 0, gk: 0, hud: 0, boot: 1, off: 0 };
  var tweens = {}, timers = [];
  function ease(k) { return k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2; }
  function tween(key, to, sec, done, linear) {
    if (Math.abs(Vv[key] - to) < 1e-4) { Vv[key] = to; delete tweens[key]; if (done) done(); return; }
    tweens[key] = { from: Vv[key], to: to, start: clock, dur: sec, done: done, lin: !!linear };
  }
  function after(sec, fn) { var t = { at: clock + sec, fn: fn }; timers.push(t); return t; }
  function cancel(t) { timers = timers.filter(function (x) { return x !== t; }); }
  function runTime() {
    Object.keys(tweens).forEach(function (k) {
      var tw = tweens[k]; if (!tw) return;
      var p = Math.min(1, (clock - tw.start) / tw.dur);
      Vv[k] = tw.from + (tw.to - tw.from) * (tw.lin ? p : ease(p));
      if (p >= 1 && tweens[k] === tw) { delete tweens[k]; if (tw.done) tw.done(); }
    });
    var due = timers.filter(function (t) { return t.at <= clock; });
    timers = timers.filter(function (t) { return t.at > clock; });
    due.forEach(function (t) { t.fn(); });
  }
  var seqTimers = [];

  // the 2D component's choreography, slowed a little so the 3D mechanics read well
  function sequence(next) {
    var side = SIDE.indexOf(next) >= 0 ? next : null;
    if (shown !== side) {
      var bringIn = function () { shown = side; Vv.ext = 0; fired = false; if (side) tween('ext', 1, 1.8); };
      if (shown && Vv.ext > 0) tween('ext', 0, 0.9, bringIn); else bringIn();
    } else if (side && Vv.ext < 1) tween('ext', 1, 1.8);
    var antOn = next === 'idea' || next === 'stop';
    tween('ant', antOn ? 1 : 0, antOn ? 1.4 : 0.9);
    tween('phones', next === 'music' ? 1 : 0, next === 'music' ? 2.0 : 1.1);
    seqTimers.forEach(cancel); seqTimers = [];
    timerDone = false; Vv.press = 0;
    if (next === 'timer') {
      seqTimers.push(after(1.5, function () {
        tween('extL', 1, 1.6, function () {
          tween('press', 1, 0.15, function () {
            timerDone = true;
            tween('press', 0, 0.26, function () { seqTimers.push(after(0.6, function () { tween('extL', 0, 1.2); })); });
          });
        });
      }));
    } else tween('extL', 0, 0.7);
  }
  var glassesTimer = null;
  function wearGlasses(on, delay) {
    if (glassesTimer) { cancel(glassesTimer); glassesTimer = null; }
    if (on) glassesTimer = after(delay || 0, function () { tween('gk', 1, 4.4, function () { hudAt = clock; tween('hud', 1, 1.3); }, true); });
    else tween('hud', 0, 0.6, function () { tween('gk', 0, 3.4, null, true); });
  }

  // ======================================================================================
  // display drawing
  // ======================================================================================
  var vec = faceVec(MOODS.neutral);
  var SC = Math.min(SW / 120, SH / 92);
  function currentDef() {
    if (reaction) return timerDone && reaction === 'timer' ? TIMER_DONE : REACTS[reaction];
    if (act && Vv.gk > 0.5) return READ;
    if (clock < bootHappyUntil && mood === 'neutral') return MOODS.happy;
    return MOODS[mood] || MOODS.neutral;
  }
  function drawFace(bl, faceG) {
    var c = fc;
    c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = 1; c.shadowBlur = 0;
    var bg = c.createRadialGradient(FW / 2, FH * 0.55, 0, FW / 2, FH * 0.55, FW * 0.6);
    bg.addColorStop(0, offDone ? '#141518' : '#24262b'); bg.addColorStop(1, '#101114');
    c.fillStyle = bg; c.fillRect(0, 0, FW, FH);
    var bk = Vv.boot, offK = Vv.off;
    if (!offDone) {
      // old-TV collapse while shutting down
      var crtY = 1 - 0.975 * sm(offK / 0.32), crtX = 1 - 0.98 * sm((offK - 0.36) / 0.3);
      var flashO = offK > 0 ? (offK < 0.32 ? 0.25 + 0.7 * clamp(offK / 0.32) : 0.95 * (1 - sm((offK - 0.68) / 0.32))) : 0;
      var redFace = reaction === 'stop';
      var glow = redFace ? '#FF453A' : '#F4F7FF';
      c.shadowColor = redFace ? 'rgba(255,69,58,0.9)' : 'rgba(225,235,255,0.85)';
      c.shadowBlur = 8 * K;
      c.fillStyle = glow; c.strokeStyle = glow; c.lineCap = 'round'; c.lineJoin = 'round';
      var crt = function (dx, dy, k) { c.setTransform(K * k * crtX, 0, 0, K * k * crtY, FW / 2 + dx * K * crtX, FH / 2 + dy * K * crtY); };
      var booting = bk < 1;
      var timerShow = reaction === 'timer' && !timerDone, battery = reaction === 'battery';
      if (timerShow || battery) {
        crt(0, 0, 1);
        if (timerShow) {
          c.globalAlpha = Math.floor(clock * 2) % 2 ? 0.3 : 1; c.textAlign = 'center';
          c.font = '700 30px Inter, system-ui, sans-serif'; c.fillText('00:00', 0, 8);
          c.font = '700 8.5px Inter, system-ui, sans-serif'; c.fillText('ABGELAUFEN', 0, 24);
        } else {
          c.lineWidth = 2.4; c.shadowBlur = 5 * K;
          roundRect(c, -24, -20, 44, 22, 4); c.stroke();
          c.fillRect(21.5, -13, 4, 8);
          c.fillStyle = '#FF453A'; c.globalAlpha = Math.floor(clock * 2) % 2 ? 0.25 : 1; c.fillRect(-20.5, -16.5, 6, 15);
          c.globalAlpha = 1; c.fillStyle = glow; c.textAlign = 'center';
          c.font = '700 8.5px Inter, system-ui, sans-serif'; c.fillText('AKKU 5 %', 0, 18);
        }
      } else {
        var ex = booting ? 0 : faceG.x * 20, ey = booting ? 0 : faceG.y * 10;
        var base = function (dx, dy) { crt(dx, dy, SC); c.translate(-100, -98); };
        base(ex, ey);
        c.globalAlpha = booting ? clamp((bk - 0.14) / 0.05) : 1;
        var eyes = new Path2D(eyeD(vec, 0, bl) + ' ' + eyeD(vec, 6, bl));
        c.fill(eyes); c.lineWidth = 1; c.stroke(eyes);
        var bo = Math.max(0, Math.min(1, vec[32]));
        if (bo > 0.01) { c.globalAlpha = bo; c.lineWidth = 3.5; c.stroke(new Path2D(browD(vec, 20))); }
        base(ex * 0.7, ey * 0.7);
        c.globalAlpha = booting && bk < 0.62 ? 0 : 1;
        var m = new Path2D(mouthD(vec, 12)); c.fill(m); c.lineWidth = 2.2; c.stroke(m);
        if (booting) {   // percentage under the growing bar
          var po = clamp((bk - 0.14) / 0.05) * (1 - clamp((bk - 0.55) / 0.05)) * 0.75;
          if (po > 0) { base(0, 0); c.globalAlpha = po; c.shadowBlur = 3 * K; c.textAlign = 'center'; c.font = '600 6.5px Inter, system-ui, sans-serif'; c.fillText(Math.round(bootProg(bk) * 100) + ' %', 100, 113); }
        } else {
          var def = currentDef();
          if (def.sym) {
            c.setTransform(K, 0, 0, K, FW / 2 + 48 * K, FH / 2 - 17 * K);
            if (def.sym === 'zzz') {
              c.shadowBlur = 5 * K;
              for (var i = 0; i < 3; i++) {
                var p = (clock / 2.4 + i / 3) % 1;
                c.globalAlpha = Math.sin(p * Math.PI);
                c.font = '700 ' + (10 + i * 3) + 'px Inter, system-ui, sans-serif';
                c.fillText(i === 2 ? 'Z' : 'z', -6 + p * 8, 4 - p * 22);
              }
            } else {
              var pulse = 1 + 0.08 * Math.sin(clock * 4.8);
              c.scale(pulse, pulse); c.globalAlpha = 1;
              c.textAlign = 'center'; c.font = '700 20px Inter, system-ui, sans-serif'; c.fillText(def.sym, 0, 7);
            }
          }
        }
      }
      if (flashO > 0.01) { c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = flashO; c.shadowBlur = 0; c.fillStyle = '#FFFFFF'; c.fillRect(FW / 2 - FW / 2 * crtX, FH / 2 - FH / 2 * crtY, FW * crtX, FH * crtY); }
    }
    c.setTransform(K, 0, 0, K, FW / 2, FH / 2);
    c.globalAlpha = 1; c.shadowBlur = 0;
    c.strokeStyle = 'rgba(255,255,255,0.22)'; c.lineWidth = 2.4;
    c.beginPath(); c.moveTo(-56, -14); c.quadraticCurveTo(-52, -32, -36, -36); c.stroke();
    face.tex.needsUpdate = true;
  }

  // ======================================================================================
  // overlay particles
  // ======================================================================================
  var parts = [], lastSpawn = 0, tmpV = V3(0, 0, 0);
  function toScreen(p) {
    tmpV.copy(p).project(camera);
    return { x: (tmpV.x + 1) / 2 * root.clientWidth, y: (1 - tmpV.y) / 2 * root.clientHeight };
  }
  function headPoint(x, y, z) { return head.localToWorld(V3(x, y, z)); }
  function pxPerUnit() {
    var a = toScreen(headPoint(-W / 2, 0, FRONT)), b = toScreen(headPoint(W / 2, 0, FRONT));
    return Math.max(0.2, Math.hypot(b.x - a.x, b.y - a.y) / W);
  }
  var COLORS = ['#FF453A', '#FFD60A', '#30D158', '#64D2FF', '#BF5AF2', '#FF9F0A'];
  function burst(at, u, dir) {
    for (var i = 0; i < 110; i++) {
      var a = dir + (Math.random() - 0.5) * 0.9, s = (3 + Math.random() * 7) * u * 1.6;
      parts.push({ k: 'confetti', x: at.x, y: at.y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, r: Math.random() * 6, vr: (Math.random() - 0.5) * 0.4, c: COLORS[i % COLORS.length], life: 1, u: u });
    }
  }
  function spawn(u) {
    var gap = reaction === 'umbrella' ? 0.03 : reaction === 'coffee' ? 0.18 : 0.35;
    if (clock - lastSpawn < gap) return;
    lastSpawn = clock;
    var top = toScreen(headPoint(0, H / 2, 0));
    if (reaction === 'heart') parts.push({ k: 'heart', x: top.x + (Math.random() - 0.5) * W * u, y: top.y + 10 * u, vx: (Math.random() - 0.5) * 0.4, vy: -1.1 * u, life: 1, s: (0.7 + Math.random() * 0.6) * u, r: 0, vr: 0 });
    else if (reaction === 'music' && Vv.phones > 0.9) {
      var side = Math.random() < 0.5 ? -1 : 1, ear = toScreen(headPoint(side * (W / 2 + 14), 6, 0));
      parts.push({ k: 'note', x: ear.x, y: ear.y, vx: side * 0.5 * u, vy: -0.9 * u, life: 1, s: u, ch: Math.random() < 0.5 ? '♪' : '♫', r: 0, vr: 0 });
    } else if (reaction === 'umbrella' && tools.umbrella.span && Vv.ext > 0.97) {
      var sp = tools.umbrella.span, cc = toScreen(head.localToWorld(sp.c.clone())), rr = sp.r * u;
      parts.push({ k: 'rain', x: cc.x + (Math.random() - 0.5) * rr * 3.2, y: cc.y - 120 * u, vx: -0.6 * u, vy: 7 * u, life: 1, s: u, r: 0, vr: 0, floorX: [cc.x - rr, cc.x + rr], floor: cc.y, bottom: top.y + H * u * 1.3 });
    } else if (reaction === 'coffee' && tools.coffee.top && Vv.ext > 0.95) {
      var cp = toScreen(tools.coffee.top);
      parts.push({ k: 'steam', x: cp.x + (Math.random() - 0.5) * 6 * u, y: cp.y, vx: 0, vy: -0.6 * u, life: 1, s: u, r: 0, vr: 0 });
    }
  }
  function heartPath(c, s) { c.beginPath(); c.moveTo(0, 3 * s); c.bezierCurveTo(-6 * s, -2 * s, -4 * s, -8 * s, 0, -5 * s); c.bezierCurveTo(4 * s, -8 * s, 6 * s, -2 * s, 0, 3 * s); c.fill(); }
  function drawParts(dt) {
    var w = root.clientWidth, h = root.clientHeight, n = dt * 60;
    fxc.clearRect(0, 0, w, h);
    parts = parts.filter(function (p) {
      if (p.k === 'confetti') { p.vy += 0.22 * n * p.u; p.vx *= Math.pow(0.99, n); p.life -= 0.006 * n; }
      else if (p.k === 'rain') { var under = p.x > p.floorX[0] && p.x < p.floorX[1]; if ((under && p.y > p.floor) || p.y > p.bottom) p.life = 0; }
      else if (p.k === 'steam') { p.life -= 0.015 * n; p.x += Math.sin((1 - p.life) * 8) * 0.25 * n; }
      else { p.life -= 0.012 * n; p.x += Math.sin((1 - p.life) * 9) * 0.3 * n; }
      p.x += p.vx * n; p.y += p.vy * n; p.r += p.vr * n;
      if (p.life <= 0 || p.y > h + 20 || p.y < -60) return false;
      fxc.save(); fxc.globalAlpha = Math.min(1, p.life * 2); fxc.translate(p.x, p.y); fxc.rotate(p.r);
      if (p.k === 'confetti') { fxc.fillStyle = p.c; fxc.fillRect(-3 * p.u, -1.6 * p.u, 6 * p.u, 3.2 * p.u); }
      else if (p.k === 'heart') { fxc.fillStyle = '#FF375F'; heartPath(fxc, p.s * 1.6); }
      else if (p.k === 'note') { fxc.fillStyle = '#F4F7FF'; fxc.font = '700 ' + Math.round(20 * p.s) + 'px Inter, system-ui, sans-serif'; fxc.fillText(p.ch, 0, 0); }
      else if (p.k === 'rain') { fxc.strokeStyle = 'rgba(120,190,255,0.8)'; fxc.lineWidth = 1.6 * p.s; fxc.beginPath(); fxc.moveTo(0, 0); fxc.lineTo(-1 * p.s, 8 * p.s); fxc.stroke(); }
      else if (p.k === 'steam') { fxc.globalAlpha = p.life * 0.5; fxc.fillStyle = '#FFFFFF'; fxc.beginPath(); fxc.arc(0, 0, (3 + (1 - p.life) * 6) * p.s, 0, Math.PI * 2); fxc.fill(); }
      fxc.restore();
      return true;
    });
  }

  // ======================================================================================
  // per-frame update
  // ======================================================================================
  var gazeTarget = null, wander = { x: 0, y: 0 }, nextWander = 0;
  var faceG = { x: 0, y: 0 }, headG = { x: 0, y: 0 };
  var blinkAt = 1.5, blinkStart = -1, posed = null;
  function spring(o, x, y, k) { o.x += (x - o.x) * k; o.y += (y - o.y) * k; }

  function update(dt) {
    clock += dt;
    runTime();
    var n = dt * 60;
    var bk = Vv.boot;

    // face vector: the boot animation, or a morph toward the current expression
    if (bk < 1) vec = bootVec(bk);
    else { var tv = faceVec(currentDef()), ke = 1 - Math.pow(1 - 0.18, n); for (var i = 0; i < vec.length; i++) vec[i] += (tv[i] - vec[i]) * ke; }

    // gaze: eyes glance quickly, the head follows slowly
    var want;
    if (gazeTarget) want = gazeTarget;
    else { if (clock > nextWander) { wander = { x: Math.random() * 1.6 - 0.8, y: Math.random() - 0.6 }; nextWander = clock + 0.8 + Math.random() * 2.2; } want = wander; }
    var still = reaction === 'magnifier' || reaction === 'battery' || reaction === 'timer' || (act && Vv.gk > 0.2) || bk < 1;
    spring(faceG, still ? 0 : want.x, still ? 0 : want.y, 1 - Math.pow(1 - 0.22, n));
    spring(headG, still ? want.x * 0.3 : want.x, still ? want.y * 0.3 : want.y, 1 - Math.pow(1 - 0.045, n));

    // blinking
    var def = currentDef(), eyesOpen = !def.L.s && !def.R.s && bk >= 1;
    if (clock > blinkAt && blinkStart < 0) blinkStart = clock;
    var blink = 0;
    if (blinkStart >= 0) { var b = (clock - blinkStart) / 0.17; if (b >= 1) { blinkStart = -1; blinkAt = clock + (Math.random() < 0.22 ? 0.18 : 2.4 + Math.random() * 3.2); } else blink = b < 0.5 ? b * 2 : (1 - b) * 2; }
    var bl = eyesOpen ? 1 - 0.92 * blink : 1;

    // ---- mechanics
    var ext = Vv.ext, extL = Vv.extL, gk = Vv.gk, ph = Vv.phones;
    var gArms = gk > 0.001 && gk < 0.999;
    var hOpenG = seg(gk, 0, 0.08) * (1 - seg(gk, 0.93, 1));
    hatchR.update(Math.max(shown ? clamp(ext / 0.2) : 0, gArms ? hOpenG : 0, clamp(ph / 0.15)));
    hatchL.update(Math.max(clamp(extL / 0.2), gArms ? hOpenG : 0, clamp(ph / 0.15)));

    Object.keys(tools).forEach(function (k) { tools[k].visible = false; });
    var restR = V3(W / 2 + 18, 12, 16), restL = V3(-W / 2 - 18, 12, 16);
    if (gArms) {
      // glasses: out of the right hatch, unfolded in front, put on with both hands
      var uf = seg(gk, 0, 0.12) * (1 - seg(gk, 0.86, 0.95));
      var pocket = V3(W / 2 + 2, 0, 2), C1 = V3(0, -H / 2 - 16, FRONT + 26), E0 = EYES_AT.clone();
      var RH, LH, gc = null, gsc = 1, grot = 0;
      if (gk < 0.12) { RH = lerpV(armR.S, restR, uf); LH = lerpV(armL.S, restL, uf); }
      else if (gk < 0.3) { RH = gk < 0.2 ? lerpV(restR, pocket, seg(gk, 0.12, 0.2)) : lerpV(pocket, restR, seg(gk, 0.2, 0.3)); LH = restL; if (gk >= 0.2) gc = RH.clone(); gsc = 0.25; grot = Math.PI / 2; }
      else if (gk < 0.55) { var tc = seg(gk, 0.3, 0.55); gc = lerpV(restR, C1, tc); gsc = 0.25 + 0.5 * tc; grot = Math.PI / 2 * (1 - tc); RH = gc.clone().add(V3(37 * gsc, 0, 0)); LH = lerpV(restL, gc.clone().add(V3(-37 * gsc, 0, 0)), tc); }
      else if (gk < 0.78) { var td = seg(gk, 0.55, 0.78); gc = lerpV(C1, E0, td); gsc = 0.75 + 0.25 * td; RH = gc.clone().add(V3(37 * gsc, 0, 0)); LH = gc.clone().add(V3(-37 * gsc, 0, 0)); }
      else { gc = E0.clone(); var te = seg(gk, 0.78, 0.88), tr = seg(gk, 0.86, 0.95); RH = lerpV(lerpV(E0.clone().add(V3(37, 0, 0)), restR, te), armR.S, tr); LH = lerpV(lerpV(E0.clone().add(V3(-37, 0, 0)), restL, te), armL.S, tr); }
      var reachG = hOpenG > 0.6 ? Math.max(uf, 0.15) * 1.25 : 0;   // only once the hatches are open
      armR.set(RH, reachG, V3(0.3, -1, 0.3)); armL.set(LH, reachG, V3(-0.3, -1, 0.3));
      glasses.visible = !!gc;
      if (gc) { glasses.position.copy(gc); glasses.scale.setScalar(gsc); glasses.rotation.set(0, grot, 0); }
    } else {
      glasses.visible = gk >= 0.999;
      if (glasses.visible) { glasses.position.copy(EYES_AT); glasses.scale.setScalar(1); glasses.rotation.set(0, 0, 0); }
      // right arm and its tool
      if (shown && ext > 0.001) {
        var u = clamp((ext - 0.2) / 0.4), tt = clamp((ext - 0.6) / 0.4);
        var TF = REACH[shown].clone();
        if (shown === 'wave' && ext > 0.95) { TF.x += Math.sin(clock * 9) * 4; TF.y += Math.cos(clock * 9) * 1.2; }
        var HT = lerpV(armR.S.clone().add(V3(6, 0, 0)), TF, u);
        var handR = armR.set(HT, clamp((ext - 0.13) / 0.25) * 1.1, shown === 'magnifier' ? V3(0.6, -1, -0.2) : V3(0.2, -1, -0.3));
        var tl = tools[shown]; tl.visible = tt > 0.001;
        if (tl.visible) {
          tl.scale.setScalar(1);
          if (shown === 'confetti') {
            if (!fired && ext >= 0.999) { fired = true; recoil = 1; flash = 1; firePending = true; }
            recoil *= Math.pow(0.86, n); flash *= Math.pow(0.8, n);
            tl.update(tt, handR, recoil, flash);
          } else tl.update(tt, handR, clock);
          if (BIG[shown]) tl.scale.multiplyScalar(BIG[shown]);   // hand-held tools read better a size up
        }
      } else armR.set(armR.S, 0);
      // left arm: reaches over the top and presses the timer button
      if (extL > 0.001) {
        var uL = clamp((extL - 0.2) / 0.4), tL = clamp((extL - 0.6) / 0.4);
        var Pm = V3(-W / 2 - 22, TOPY + 14, 8), Cc = V3(-W / 2 - 10, TOPY + 44, 8), Pt = V3(btn.position.x, TOPY + 5 - Vv.press * 3, btn.position.z);
        var TL = tL > 0 ? quadV(Pm, Cc, Pt, tL) : lerpV(armL.S.clone().add(V3(-6, 0, 0)), Pm, uL);
        armL.set(TL, clamp((extL - 0.13) / 0.25) * 1.3, V3(-1, 0.3, -0.2));
      } else armL.set(armL.S, 0);
    }
    btn.position.y = TOPY + 0.6 - Vv.press * 1.6;

    // antenna: the lid flips open, the rods rise one after the other, the lamp comes on top
    var ant = Vv.ant;
    lidHinge.rotation.x = -1.9 * eob(seg(ant, 0, 0.3));
    var r1 = sm((ant - 0.25) / 0.45), r2 = eob(seg(ant, 0.55, 1));
    antenna.visible = ant > 0.2;
    rod1.position.y = -6 + 12 * r1; rod2.position.y = rod1.position.y + 10 * r2;
    lamp.position.y = rod2.position.y + 7.5; lamp.scale.setScalar(Math.max(0.01, sm((ant - 0.5) / 0.3)));
    var lampColor = reaction === 'stop' ? (Math.floor(clock * 3) % 2 ? 0xff453a : 0x7a1410) : (reaction === 'idea' ? 0xffd60a : 0xffffff);
    lampMat.color.setHex(lampColor); lampMat.emissive.setHex(lampColor);
    rays.visible = reaction === 'idea' && ant > 0.95;
    rays.position.y = lamp.position.y; var rs = 30 + Math.sin(clock * 6) * 4; rays.scale.set(rs, rs, 1);

    // headphones: cups out of both hatches, then the band assembles from both sides toward the top
    phones.visible = ph > 0.12;
    if (phones.visible) {
      var cupK = eob(seg(ph, 0.12, 0.45));
      cups.forEach(function (c) { var s = c.userData.s; c.position.set(s * (W / 2 - 4 + 14 * cupK), 0, 2); c.scale.setScalar(Math.max(0.05, cupK)); });
      var bandK = seg(ph, 0.45, 1), N = bandSegs.length, half = N / 2;
      bandSegs.forEach(function (bs2, i) {
        var j = i < half ? i : N - 1 - i;
        var vis = clamp(bandK * half - j);
        var th = Math.PI * (i + 0.5) / N;
        bs2.position.set(Math.cos(th) * (W / 2 + 10), 8 + Math.sin(th) * (H / 2 + 6), 2);
        bs2.rotation.z = th - Math.PI / 2;
        bs2.scale.setScalar(Math.max(0.01, eob(vis))); bs2.visible = vis > 0.01;
      });
    }

    // HUD: the centre panel springs open, then the wings swing out from behind it
    var hk = Vv.hud;
    hud.visible = hk > 0.01 && !!(act || lastAct);
    if (hud.visible) {
      var cK = eob(seg(hk, 0, 0.45)), wK = eob(seg(hk, 0.35, 1));
      pC.holder.scale.set(Math.max(0.05, 0.15 + 0.85 * cK), Math.max(0.01, cK), Math.max(0.05, 0.15 + 0.85 * cK));
      pL.holder.rotation.y = -(1 - wK) * 51 * Math.PI / 180;
      pR.holder.rotation.y = (1 - wK) * 51 * Math.PI / 180;
      pL.mesh.material.opacity = pR.mesh.material.opacity = clamp(wK * 1.4);
      pC.mesh.material.opacity = clamp(cK * 1.5);
      drawHud(clock);
    }

    // ---- head pose
    var yaw = headG.x * 0.38, pitch = headG.y * 0.2;
    var roll = Math.sin(clock * 0.7) * 0.015 - headG.x * 0.03 - vec[33] * Math.PI / 180;
    var bob = Math.sin(clock * 1.8) * 1.2 - vec[34], sc = vec[35];
    var curMood = !reaction && !act ? mood : null;
    if (curMood === 'sleep') bob = Math.sin(clock * 1.1) * 2.2 - vec[34];
    if (curMood === 'oops' || curMood === 'meh') roll += Math.sin(clock * 3) * 0.02;
    if (curMood === 'confused') roll += Math.sin(clock * 1.3) * 0.05;
    if (reaction === 'music') { roll += Math.sin(clock * 3.2) * 0.07; bob += Math.abs(Math.sin(clock * 3.2)) * 1.5; }
    if (reaction === 'battery') { pitch += 0.12; bob += Math.sin(clock * 0.9) * 0.6; }
    if (reaction === 'stop') yaw += Math.sin((clock - reactAt) * 26) * 0.05 * Math.max(0, 1 - (clock - reactAt) / 0.6);
    if (act && Vv.hud > 0.5) pitch += 0.1;    // glancing down at the HUD
    if (posed) { yaw = posed[0]; pitch = posed[1]; roll = 0; }
    var offK = Vv.off, down = offDone ? 1 : sm(offK);
    pitch += 0.18 * down; bob -= 4 * down;
    pivot.rotation.set(pitch, yaw, roll);
    pivot.position.y = bob;
    pivot.scale.setScalar(sc);
    shadow.material.opacity = 0.9 * (1 - bob / 30);
    shadow.scale.setScalar(1 - bob / 80);

    drawFace(bl, faceG);
  }

  function render(dt) {
    renderer.render(scene, camera);
    pivot.updateMatrixWorld(true);
    var u = pxPerUnit();
    if (reaction) spawn(u);
    if (firePending && tools.confetti.visible) {
      firePending = false;
      burst(toScreen(tools.confetti.muzzle.getWorldPosition(V3(0, 0, 0))), u, -Math.PI / 2 + 0.75);
    }
    drawParts(dt);
  }

  var lastReal = performance.now();
  function frame() {
    var now = performance.now(), dt = Math.min(0.05, (now - lastReal) / 1000);
    lastReal = now;
    update(dt); render(dt);
    requestAnimationFrame(frame);
  }

  // ======================================================================================
  // API
  // ======================================================================================
  function startBoot() {
    offDone = false; Vv.off = 0; delete tweens.off;
    mood = 'neutral'; reaction = null; act = null;
    sequence(null); wearGlasses(false);
    Vv.boot = 0;
    tween('boot', 1, 5.4, function () { bootHappyUntil = clock + 1.8; }, true);
  }
  var api = {
    setMood: function (id) { mood = MOODS[id] ? id : 'neutral'; reaction = null; act = null; wearGlasses(false); sequence(null); return api; },
    react: function (id) {
      reaction = id && REACTS[id] ? id : null; reactAt = clock; act = null;
      wearGlasses(false); sequence(reaction);
      return api;
    },
    activity: function (id, opts) {
      if (opts && opts.query != null) query = String(opts.query);
      var busy = shown && Vv.ext > 0;
      act = id && ACTS[id] ? id : null; if (act) lastAct = act;
      reaction = null; sequence(null);
      wearGlasses(!!act, act && busy ? 0.9 : 0);
      return api;
    },
    look: function (x, y) {
      gazeTarget = x == null ? null : { x: Math.max(-1, Math.min(1, +x || 0)), y: Math.max(-1, Math.min(1, +y || 0)) };
      return api;
    },
    boot: function () { startBoot(); return api; },
    shutdown: function () {
      reaction = null; act = null; sequence(null); wearGlasses(false);
      tween('off', 1, 1.1, function () { offDone = true; Vv.off = 0; }, true);
      return api;
    },
    /** Holds the head at fixed angles (radians) to inspect the model; pose(null) releases it. */
    pose: function (yaw, pitch) { posed = yaw == null ? null : [yaw, pitch || 0]; return api; },
    setShape: function () { return api; },
    moods: Object.keys(MOODS), reactions: Object.keys(REACTS), activities: Object.keys(ACTS),
    // previews: move time forward and draw one frame
    _advance: function (sec) { var steps = Math.max(1, Math.round(sec / 0.02)); for (var i = 0; i < steps; i++) update(sec / steps); render(0.02); return api; },
    _canvas: renderer.domElement, _fx: fx
  };
  window.ka = api;

  if (!SNAP) { startBoot(); requestAnimationFrame(frame); }
})();
