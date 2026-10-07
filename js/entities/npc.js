/* Abuja Life — the people you can see. A small pool of reusable 3D actors is
   handed to the residents (AL.Sim.people) who, according to their schedule,
   are in the player's area right now. Everyone else stays as data.
   On roads between districts a few commuters walk past. */
(function (AL) {
  'use strict';
  const T = AL.T;
  if (!T) return;
  const W = AL.W, D = AL.D;
  const NPC = { pool: [], others: {}, area: null, reassignT: 0 };
  const R = Math.random;

  function plazaPoint(k) { const a = R() * Math.PI * 2, r = 4 + R() * 10; return { x: D[k].x * W + Math.cos(a) * r, z: D[k].z * W + Math.sin(a) * r }; }

  NPC.spawn = (scene, count) => {
    NPC.scene = scene;
    for (let i = 0; i < count; i++) {
      const a = { id: 'npc-a' + i, rec: null, char: null, root: new T.Group(), path: null, s: 0, wait: 0, chat: 0, talking: false, facing: 0, speed: 1.3, mode: 'idle' };
      a.root.visible = false; scene.add(a.root); NPC.pool.push(a);
      AL.Interact.add({
        id: a.id, r: 2.6, priority: 0.5,
        getPos: () => a.root.position,
        hidden: () => !a.rec || !a.root.visible,
        verb: () => 'Talk',
        title: () => (a.rec ? a.rec.name : ''),
        sub: () => (a.rec ? a.rec.role + (AL.S.rel[a.rec.id] ? ' · friendship ' + AL.S.rel[a.rec.id].f : '') : ''),
        use: () => AL.emit('talk', a),
      });
    }
  };
  /* give an actor a resident: rebuild its body only when the person changes */
  function assign(a, rec, pos) {
    if (a.rec !== rec) {
      if (a.char) a.root.remove(a.char.root);
      a.rec = rec; a.char = AL.Character.create(AL.Sim.lookFor(rec)); a.root.add(a.char.root);
      // the dialogue reads these fields
      a.relId = rec.id; a.name = rec.name; a.first = rec.first; a.role = rec.role; a.home = rec.home; a.work = rec.work; a.at = rec.work;
    }
    a.root.position.set(pos.x, AL.City.groundY(pos.x, pos.z), pos.z); a.root.visible = true;
    a.path = null; a.wait = R() * 3; a.chat = 0; a.speed = 1.2 + R() * 0.45;
  }
  function release(a) { a.root.visible = false; a.rec = null; a.path = null; a.mode = 'idle'; }

  /* decide who should be around the player (runs a few times a second, not every frame) */
  function reassign(playerPos) {
    const da = AL.City.districtAt(playerPos.x, playerPos.z);
    const area = da.inside || da.dist < 26 ? da.key : 'road';
    const want = [];
    if (area !== 'road') {
      const people = AL.Sim.peopleIn(area);
      people.forEach((p) => want.push(p));
    } else {
      // commuters on the road: anyone currently travelling between home and work
      AL.Sim.people.forEach((p) => { if (Sim().whereIs(p).moving) want.push(p); });
    }
    const max = NPC.pool.length;
    const pick = want.slice(0, area === 'road' ? Math.min(5, max) : max);
    const keep = new Set(pick);
    // free actors whose person has left the area
    NPC.pool.forEach((a) => { if (a.rec && (!keep.has(a.rec) || NPC.area !== area) && !a.talking) release(a); });
    const busy = new Set(NPC.pool.filter((a) => a.rec).map((a) => a.rec));
    pick.forEach((p) => {
      if (busy.has(p)) return;
      const a = NPC.pool.find((x) => !x.rec); if (!a) return;
      if (area === 'road') {
        const ang = R() * Math.PI * 2, r = 30 + R() * 50;
        assign(a, p, { x: playerPos.x + Math.cos(ang) * r, z: playerPos.z + Math.sin(ang) * r }); a.mode = 'walker';
        a.dir = { x: Math.cos(ang + Math.PI / 2), z: Math.sin(ang + Math.PI / 2) };
      } else { assign(a, p, plazaPoint(area)); a.mode = 'local'; a.k = area; }
    });
    NPC.area = area;
  }
  const Sim = () => AL.Sim;

  NPC.update = (dt, playerPos) => {
    NPC.reassignT -= dt;
    if (NPC.reassignT <= 0) { NPC.reassignT = 1.5; reassign(playerPos); }
    NPC.pool.forEach((a) => {
      if (!a.rec) return;
      const dx = a.root.position.x - playerPos.x, dz = a.root.position.z - playerPos.z;
      const dist = Math.hypot(dx, dz);
      if (a.talking) {
        a.char.setState('talk');
        a.facing = AL.angleDamp(a.facing, Math.atan2(-dx, -dz), 8, dt); a.root.rotation.y = a.facing;
        a.char.update(dt, 0); return;
      }
      let moving = false;
      if (a.mode === 'walker') {
        const nx = a.root.position.x + a.dir.x * a.speed * dt, nz = a.root.position.z + a.dir.z * a.speed * dt;
        const r = AL.City.resolve(nx, nz, 0.3); a.root.position.x = r.x; a.root.position.z = r.z;
        a.facing = Math.atan2(a.dir.x, a.dir.z); moving = true;
        if (dist > 140) { release(a); return; }
      } else {
        if (!a.path) {
          a.wait -= dt;
          if (a.wait <= 0) {
            if (R() < 0.3) { a.chat = 2 + R() * 4; a.wait = a.chat + 1; }
            else {
              const end = plazaPoint(a.k);
              const s0 = new T.Vector3(a.root.position.x, 0, a.root.position.z), s1 = new T.Vector3(end.x, 0, end.z);
              a.path = { pts: [s0, s1], seg: [s0.distanceTo(s1)], len: s0.distanceTo(s1) }; a.s = 0;
            }
          }
        }
        if (a.path) {
          a.s += a.speed * dt;
          if (a.s >= a.path.len) { a.path = null; a.wait = 2 + R() * 7; }
          else {
            AL.City.followPath(a.root, a.path.pts, a.path.seg, a.s); a.facing = a.root.rotation.y; moving = true;
            const r = AL.City.resolve(a.root.position.x, a.root.position.z, 0.3); a.root.position.x = r.x; a.root.position.z = r.z;
          }
        }
      }
      a.root.position.y = AL.damp(a.root.position.y, AL.City.groundY(a.root.position.x, a.root.position.z), 8, dt);
      a.root.rotation.y = a.facing;
      if (dist < 90) {
        if (moving) a.char.setState('walk');
        else if (a.chat > 0) { a.chat -= dt; a.char.setState('talk'); }
        else a.char.setState('idle');
        a.char.update(dt, moving ? a.speed : 0);
      }
    });
  };
  NPC.visibleCount = () => NPC.pool.filter((a) => a.rec).length;

  /* ---- other online players: shown standing on the plaza of the district where they last acted ---- */
  NPC.syncOthers = () => {
    if (!NPC.scene) return;
    const now = Date.now(), active = {};
    const list = Object.entries(AL.others).filter(([id, p]) => id !== AL.uid && p && D[p.at] && (now - (Number(p.updatedAt) || 0)) < 30 * 60 * 1000).slice(0, 12);
    const per = {};
    list.forEach(([id, p]) => {
      active[id] = true;
      let o = NPC.others[id];
      const key = AL.cleanName(p.name) + '|' + JSON.stringify(AL.cleanLook(p.look));
      if (!o || o.key !== key) {
        if (o) NPC.scene.remove(o.g);
        const g = new T.Group(); const ch = AL.Character.create(p.look); g.add(ch.root);
        const s = AL.Kit.label(AL.cleanName(p.name)); s.scale.multiplyScalar(0.12); s.position.y = 2.4; g.add(s);
        NPC.scene.add(g); o = NPC.others[id] = { g, key, ch };
      }
      const n = per[p.at] = (per[p.at] || 0) + 1;
      const ang = n * 1.3, r = 8;
      const x = D[p.at].x * W + Math.cos(ang) * r, z = D[p.at].z * W + Math.sin(ang) * r;
      o.g.position.set(x, AL.City.groundY(x, z), z); o.g.rotation.y = ang;
    });
    Object.keys(NPC.others).forEach((id) => { if (!active[id]) { NPC.scene.remove(NPC.others[id].g); delete NPC.others[id]; } });
  };
  NPC.animateOthers = (dt) => {
    const P = AL.Player && AL.Player.pos;
    Object.values(NPC.others).forEach((o) => {
      const near = !P || Math.hypot(o.g.position.x - P.x, o.g.position.z - P.z) < 120;
      o.g.visible = near; if (near) o.ch.update(dt, 0);
    });
  };
  AL.NPC = NPC;
})(window.AL);
