/* Abuja Life — player controller and camera.
   Third-person movement (WASD / arrows / on-screen joystick), run, collisions,
   ground following, sitting, activity animations, taxi trips and the camera
   (follow view and a zoomed-out map view). */
(function (AL) {
  'use strict';
  const T = AL.T;
  if (!T) return;
  const W = AL.W;
  const P = {
    char: null, root: null, pos: new T.Vector3(), vel: new T.Vector2(), facing: Math.PI, y: 0,
    speed: 0, running: false, runToggle: false, sitting: null, activity: null, trip: null,
    cam: { yaw: 0.6, pitch: 0.36, dist: 8, mapView: false, target: new T.Vector3() },
    keys: {}, joy: { x: 0, y: 0, active: false }, lastDistrict: null, saveT: 0,
  };
  const WALK = 3.4, RUN = 7.2, RADIUS = 0.35;

  P.spawnPoint = () => {
    const S = AL.S;
    if (S.pos) return { x: S.pos.x, z: S.pos.z };
    const r = AL.residence();
    if (r) return AL.City.districtWorld(r.at, 0, -5.2);
    return AL.City.districtWorld('garki', -1.6, 4.6);
  };
  P.init = (scene) => {
    P.scene = scene;
    P.rebuild();
    const sp = P.spawnPoint();
    P.place(sp.x, sp.z, Math.PI);
    bindInput();
  };
  P.rebuild = () => {
    const old = P.root;
    P.char = AL.Character.create(AL.S.look);
    P.root = new T.Group(); P.root.add(P.char.root);
    if (old) { P.root.position.copy(old.position); P.root.rotation.copy(old.rotation); P.scene.remove(old); }
    P.scene.add(P.root);
  };
  P.place = (x, z, facing) => {
    const s = AL.City.resolve(x, z, RADIUS);
    P.pos.set(s.x, 0, s.z); P.y = AL.City.groundY(s.x, s.z);
    if (facing !== undefined) P.facing = facing;
    P.root.position.set(P.pos.x, P.y, P.pos.z); P.root.rotation.y = P.facing;
    P.cam.target.set(P.pos.x, P.y + 1.5, P.pos.z);
    P.cam.yaw = P.facing + Math.PI;
    P.sitting = null; P.char.setState('idle');
  };
  P.district = () => AL.City.districtAt(P.pos.x, P.pos.z).key;

  /* ---------- input ---------- */
  function keyDown(e) {
    if (e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
    const k = e.key.toLowerCase();
    if (AL.UI && AL.UI.modalOpen() && k !== 'escape') return;
    P.keys[k] = true;
    if (k === 'e' || k === 'enter') { AL.Interact.use(); }
    if (k === 'm') AL.emit('toggle-map');
    if (k === 'p' || k === 'tab') { e.preventDefault(); AL.emit('toggle-phone'); }
    if (k === 'shift') P.running = true;
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) e.preventDefault();
  }
  function keyUp(e) { const k = e.key.toLowerCase(); P.keys[k] = false; if (k === 'shift') P.running = false; }
  function bindInput() {
    window.addEventListener('keydown', keyDown);
    window.addEventListener('keyup', keyUp);
    window.addEventListener('blur', () => { P.keys = {}; P.running = false; });
    const cv = AL.$('scene');
    const pts = new Map(); let pinch0 = 0, dist0 = 0, downAt = null, moved = 0;
    cv.addEventListener('pointerdown', (e) => {
      cv.setPointerCapture(e.pointerId);
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY }); AL.dragging = true;
      if (pts.size === 1) { downAt = { x: e.clientX, y: e.clientY }; moved = 0; }
      if (pts.size === 2) { const [a, b] = [...pts.values()]; pinch0 = Math.hypot(a.x - b.x, a.y - b.y); dist0 = P.cam.dist; moved = 99; }
    });
    cv.addEventListener('pointermove', (e) => {
      if (!pts.has(e.pointerId)) return;
      const p = pts.get(e.pointerId); const dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY;
      if (pts.size === 1) {
        moved += Math.abs(dx) + Math.abs(dy);
        P.cam.yaw -= dx * 0.006;
        P.cam.pitch = AL.clamp(P.cam.pitch + dy * 0.004, P.cam.mapView ? 0.5 : 0.05, P.cam.mapView ? 1.45 : 1.25);
      } else if (pts.size === 2) {
        const [a, b] = [...pts.values()]; const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (pinch0) P.cam.dist = clampDist(dist0 * pinch0 / d);
      }
    });
    const up = (e) => {
      if (!pts.has(e.pointerId)) return; pts.delete(e.pointerId);
      if (pts.size === 0 && moved < 8 && downAt && P.cam.mapView) mapTap(e.clientX, e.clientY);
      if (pts.size === 0) { downAt = null; AL.dragging = false; }
    };
    cv.addEventListener('pointerup', up);
    cv.addEventListener('pointercancel', (e) => { pts.delete(e.pointerId); if (!pts.size) AL.dragging = false; });
    cv.addEventListener('wheel', (e) => { e.preventDefault(); P.cam.dist = clampDist(P.cam.dist * (1 + Math.sign(e.deltaY) * 0.1)); }, { passive: false });
  }
  function clampDist(d) { return P.cam.mapView ? AL.clamp(d, 160, 1000) : AL.clamp(d, 3, 28); }
  const ray = new T.Raycaster(), ndc = new T.Vector2();
  function mapTap(cx, cy) {
    const cv = AL.$('scene'), r = cv.getBoundingClientRect();
    ndc.set(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, AL.camera);
    const hits = ray.intersectObjects(AL.City.pickables, true);
    for (const h of hits) { let o = h.object; while (o && !o.userData.key) o = o.parent; if (o) { AL.emit('map-pick', o.userData.key); return; } }
  }
  P.setMapView = (on) => {
    P.cam.mapView = on;
    P.cam.dist = on ? 520 : 8; P.cam.pitch = on ? 1.05 : 0.36;
    AL.emit('mapview', on);
  };

  /* ---------- activities, sitting, trips ---------- */
  P.sitAt = (x, z, facing) => {
    P.pos.set(x, 0, z); P.facing = facing; P.sitting = { x, z }; P.char.setState('sit');
  };
  P.standUp = () => { if (P.sitting) { P.sitting = null; P.char.setState('idle'); } };
  AL.on('activity', ({ anim, secs, label }) => {
    if (!P.char) return;
    P.activity = { anim, left: AL.reduceMotion ? 0.6 : secs, label, total: secs };
    AL.busy = true; P.char.setState(anim); AL.emit('activity-start', P.activity);
  });
  AL.on('slept', ({ at, home }) => {
    const p = home ? AL.City.districtWorld(at, 0, -5.2) : AL.City.districtWorld('garki', -1.6, 4.6);
    P.place(p.x, p.z, home ? 0 : Math.PI);
    AL.emit('fade');
  });
  P.skipTrip = () => { if (P.trip) P.trip.s = P.trip.len; };
  /* place the player at a location's arrival point, facing it */
  P.arriveAt = (loc) => {
    const p = AL.Sim.arrivalWorld(loc);
    P.root.visible = true; P.place(p.x, p.z, Math.PI);
  };
  /* watch the ride: a car drives the road route while the clock advances with it */
  P.watchTrip = (loc, q, mode, onEnd) => {
    const from = AL.City.districtAt(P.pos.x, P.pos.z).key, to = loc.district;
    const A = AL.D[from], B = AL.D[to];
    const raw = [[P.pos.x / W, P.pos.z / W], [A.x + 1.5, A.z + 24], [A.x + 24, A.z + 24], [A.x + 24, B.z + 24], [B.x + 1.5, B.z + 24], [loc.ax, loc.az]];
    const pts = [];
    raw.forEach(([x, z]) => { const v = new T.Vector3(x * W, 0, z * W); if (!pts.length || pts[pts.length - 1].distanceTo(v) > 0.5) pts.push(v); });
    const seg = []; let len = 0; for (let i = 1; i < pts.length; i++) { const l = pts[i].distanceTo(pts[i - 1]); seg.push(l); len += l; }
    const color = mode === 'ride' ? '#c9ced6' : mode === 'bus' ? '#2e9e5b' : '#2e9e5b';
    const car = AL.Kit.car(color, mode === 'taxi'); car.scale.setScalar(W * (mode === 'bus' ? 0.62 : 0.42)); P.scene.add(car);
    P.standUp(); P.root.visible = false; AL.busy = true;
    const secs = AL.reduceMotion ? 0.3 : AL.clamp(len / 70, 6, 16);
    P.trip = { pts, seg, len, s: 0, speed: len / secs, car, loc, hours: q.mins / 60, onEnd };
    AL.emit('trip-start', { to: to, loc });
  };
  function endTrip() {
    const t = P.trip; P.scene.remove(t.car); P.trip = null;
    P.arriveAt(t.loc);
    AL.busy = false; AL.emit('trip-end', { to: t.loc.district, loc: t.loc });
    if (t.onEnd) t.onEnd();
    AL.Interact.refresh();
  }

  /* ---------- per-frame ---------- */
  const tmp = new T.Vector3();
  P.update = (dt) => {
    if (!P.char) return;
    // taxi trip
    if (P.trip) {
      const t = P.trip; const before = t.s; t.s = Math.min(t.len, t.s + t.speed * dt);
      AL.S.t += t.hours * ((t.s - before) / t.len);
      if (t.s >= t.len) { endTrip(); }
      else {
        AL.City.followPath(t.car, t.pts, t.seg, t.s);
        t.car.position.y = AL.City.groundY(t.car.position.x, t.car.position.z) * 0.35;
        P.pos.set(t.car.position.x, 0, t.car.position.z);
        updateCamera(dt, t.car.position, 1.2);
      }
      return;
    }
    // activity in progress
    if (P.activity) {
      P.activity.left -= dt;
      if (P.activity.left <= 0) { P.activity = null; AL.busy = false; P.char.setState(P.sitting ? 'sit' : 'idle'); AL.emit('activity-end'); AL.Interact.refresh(); }
    }
    let ix = 0, iz = 0;
    const k = P.keys;
    if (!P.activity && !(AL.UI && AL.UI.modalOpen())) {
      if (k.w || k.arrowup) iz += 1; if (k.s || k.arrowdown) iz -= 1;
      if (k.d || k.arrowright) ix += 1; if (k.a || k.arrowleft) ix -= 1;
      if (P.joy.active) { ix += P.joy.x; iz += P.joy.y; }
    }
    const mag = Math.min(1, Math.hypot(ix, iz));
    P.follow = mag > 0.05 && iz > 0.4 && Math.abs(ix) < 0.6;
    const S = AL.S;
    const wantRun = (P.running || P.runToggle || (P.joy.active && Math.hypot(P.joy.x, P.joy.y) > 0.92)) && S.energy > 5;
    if (mag > 0.05 && P.sitting) P.standUp();
    let target = 0;
    if (mag > 0.05 && !P.sitting) {
      const y = P.cam.yaw;
      const fx = -Math.sin(y), fz = -Math.cos(y), rx = Math.cos(y), rz = -Math.sin(y);
      let mx = fx * iz + rx * ix, mz = fz * iz + rz * ix; const ml = Math.hypot(mx, mz) || 1; mx /= ml; mz /= ml;
      target = (wantRun ? RUN : WALK) * mag;
      P.facing = AL.angleDamp(P.facing, Math.atan2(mx, mz), 12, dt);
      P.vel.x = AL.damp(P.vel.x, mx * target, 10, dt); P.vel.y = AL.damp(P.vel.y, mz * target, 10, dt);
      if (wantRun) S.energy = Math.max(0, S.energy - dt * 0.12);
    } else {
      P.vel.x = AL.damp(P.vel.x, 0, 12, dt); P.vel.y = AL.damp(P.vel.y, 0, 12, dt);
    }
    if (!P.sitting) {
      let nx = P.pos.x + P.vel.x * dt, nz = P.pos.z + P.vel.y * dt;
      const lim = 160 * W; nx = AL.clamp(nx, -lim, lim); nz = AL.clamp(nz, -lim, lim);
      const r = AL.City.resolve(nx, nz, RADIUS);
      P.pos.x = r.x; P.pos.z = r.z;
    }
    P.speed = Math.hypot(P.vel.x, P.vel.y);
    if (!P.activity && !P.sitting) P.char.setState(P.speed > 4.6 ? 'run' : P.speed > 0.35 ? 'walk' : 'idle');
    const g = AL.City.groundY(P.pos.x, P.pos.z);
    P.y = AL.damp(P.y, g, P.sitting ? 20 : 9, dt);
    P.root.position.set(P.pos.x, P.y + (P.sitting ? 0.0 : 0), P.pos.z);
    P.root.rotation.y = P.facing;
    P.char.update(dt, P.speed);

    // district changes
    const dk = AL.City.districtAt(P.pos.x, P.pos.z);
    const here = dk.inside ? dk.key : null;
    if (here !== P.lastDistrict) { P.lastDistrict = here; if (here) { S.at = here; } AL.emit('district', here); }
    AL.Interact.update(P.pos.x, P.pos.z, P.facing);
    // remember where we are
    P.saveT += dt;
    if (P.saveT > 4) { P.saveT = 0; S.pos = { x: Math.round(P.pos.x * 10) / 10, z: Math.round(P.pos.z * 10) / 10 }; AL.saveLocal(); }
    tmp.set(P.pos.x, P.y, P.pos.z);
    updateCamera(dt, tmp, 0);
  };
  function updateCamera(dt, focus, extra) {
    const c = P.cam, cam = AL.camera;
    const lift = c.mapView ? 0 : 1.45 + extra;
    c.target.x = AL.damp(c.target.x, focus.x, c.mapView ? 4 : 10, dt);
    c.target.y = AL.damp(c.target.y, focus.y + lift, 8, dt);
    c.target.z = AL.damp(c.target.z, focus.z, c.mapView ? 4 : 10, dt);
    // auto-orbit gently behind the player while walking (not while dragging)
    if (!c.mapView && P.follow && P.speed > 1 && !AL.dragging) c.yaw = AL.angleDamp(c.yaw, P.facing + Math.PI, 1.2, dt);
    const d = P.trip ? 26 : c.dist;
    const pitch = P.trip ? 0.5 : c.pitch;
    cam.position.set(
      c.target.x + Math.sin(c.yaw) * Math.cos(pitch) * d,
      c.target.y + Math.sin(pitch) * d,
      c.target.z + Math.cos(c.yaw) * Math.cos(pitch) * d,
    );
    // keep the camera out of buildings: walk from the player towards the camera and stop at the first wall
    if (!c.mapView) {
      const tx = c.target.x, ty = c.target.y, tz = c.target.z;
      const dx = cam.position.x - tx, dy = cam.position.y - ty, dz = cam.position.z - tz, len = Math.hypot(dx, dy, dz);
      for (let t = 0.6; t < len; t += 0.4) {
        const f = t / len;
        if (AL.City.pointBlocked(tx + dx * f, ty + dy * f, tz + dz * f)) { const k = Math.max(0.8, t - 0.5) / len; cam.position.set(tx + dx * k, ty + dy * k, tz + dz * k); break; }
      }
    }
    const floor = AL.City.groundY(cam.position.x, cam.position.z) + 0.6;
    if (cam.position.y < floor) cam.position.y = floor;
    cam.lookAt(c.target);
  }
  AL.Player = P;
})(window.AL);
