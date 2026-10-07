/* Abuja Life — pedestrians with names, jobs and daily routines.
   Each NPC has a home, a workplace and a leisure spot. The schedule decides
   where they want to be at the current hour; they walk the road edges between
   districts, wander and chat on plazas, and go indoors at night. Far from the
   player they move quickly (as if by bus) so the city keeps its rhythm. */
(function (AL) {
  'use strict';
  const T = AL.T;
  if (!T) return;
  const W = AL.W, D = AL.D;
  const NPC = { list: [], others: {} };
  const R = AL.rand(20261007); // fixed seed: the same people live in Abuja every session
  const LEISURE = ['wuse', 'jabi', 'garki', 'maitama', 'cbd'];
  const HOMES = ['kubwa', 'gwarinpa', 'karu', 'nyanya', 'lugbe', 'gwagwalada', 'apo', 'kuje', 'bwari', 'asokoro'];

  function lookFor(role, fem) {
    const style = role.style === 'ankara' && !fem ? 'kaftan' : role.style;
    const hairF = ['braids', 'gele', 'bun', 'afro'], hairM = ['lowcut', 'bald', 'cap', 'fila', 'afro'];
    return AL.cleanLook({
      skin: AL.pick(AL.SKINS.slice(1), R), hair: AL.pick(fem ? hairF : hairM, R), outfit: style,
      color: AL.pick(AL.OUTFIT_COLORS, R), frame: fem ? 'f' : 'm', body: AL.pick(['slim', 'regular', 'regular', 'broad'], R),
    });
  }
  function plazaPoint(k) { const a = R() * Math.PI * 2, r = 4 + R() * 9; return { x: D[k].x * W + Math.cos(a) * r, z: D[k].z * W + Math.sin(a) * r }; }

  NPC.spawn = (scene, count) => {
    NPC.scene = scene;
    for (let i = 0; i < count; i++) {
      const role = AL.NPC_ROLES[i % AL.NPC_ROLES.length];
      const fem = role.style === 'ankara' ? true : R() < 0.45;
      const first = AL.pick(fem ? AL.NPC_FIRST_F : AL.NPC_FIRST_M, R), last = AL.pick(AL.NPC_LAST, R);
      const look = lookFor(role, fem);
      const ch = AL.Character.create(look);
      const n = {
        id: 'npc' + i, name: first + ' ' + last, first, role: role.role, work: role.work,
        home: AL.pick(HOMES, R), leisure: AL.pick(LEISURE, R), start: role.start + (R() - 0.5), end: role.end + (R() - 0.5),
        char: ch, root: ch.root, at: null, path: null, s: 0, wait: R() * 4, target: null, hidden: false, talking: false,
        speed: 1.25 + R() * 0.4, facing: 0, chat: null,
      };
      n.at = desired(n).k;
      const p = plazaPoint(n.at);
      n.root.position.set(p.x, AL.City.groundY(p.x, p.z), p.z);
      scene.add(n.root);
      NPC.list.push(n);
      AL.Interact.add({
        id: n.id, r: 2.6, priority: 0.5,
        getPos: () => n.root.position,
        hidden: () => n.hidden || !n.root.visible,
        verb: () => 'Talk',
        title: () => n.name,
        sub: () => n.role + (AL.S.rel[n.id] ? ' · friendship ' + AL.S.rel[n.id].f : ''),
        use: () => AL.emit('talk', n),
      });
    }
  };

  /* where the schedule says this person should be now */
  function desired(n) {
    const h = AL.hour();
    const inRange = (a, b) => (b > 24 ? (h >= a || h < b - 24) : (h >= a && h < b));
    if (inRange(n.start, n.end)) return { k: n.work, mode: 'work' };
    if (inRange(n.start - 1.2, n.start)) return { k: n.work, mode: 'commute' };
    const e = n.end % 24;
    if (inRange(e, e + 3.5) && n.leisure) return { k: n.leisure, mode: 'leisure' };
    if (h >= 6 && h < 21) return { k: n.home, mode: 'errand' };
    return { k: n.home, mode: 'home' };
  }
  function routeBetween(from, to, start, end) {
    const A = D[from], B = D[to], e = 20.8;
    const raw = [[A.x + 1.5, A.z + 11], [A.x + 1.5, A.z + e], [A.x + e, A.z + e], [A.x + e, B.z + e], [B.x + 1.5, B.z + e], [B.x + 1.5, B.z + 11]];
    const pts = [new T.Vector3(start.x, 0, start.z)];
    raw.forEach(([x, z]) => { const v = new T.Vector3(x * W, 0, z * W); if (pts[pts.length - 1].distanceTo(v) > 0.5) pts.push(v); });
    pts.push(new T.Vector3(end.x, 0, end.z));
    const seg = []; let len = 0; for (let i = 1; i < pts.length; i++) { const l = pts[i].distanceTo(pts[i - 1]); seg.push(l); len += l; }
    return { pts, seg, len };
  }
  function localRoute(start, end) {
    const pts = [new T.Vector3(start.x, 0, start.z), new T.Vector3(end.x, 0, end.z)];
    const l = pts[0].distanceTo(pts[1]);
    return { pts, seg: [l], len: l };
  }

  const tmp = new T.Vector3();
  NPC.update = (dt, playerPos) => {
    const near = AL.LITE ? 110 : 160;
    NPC.list.forEach((n) => {
      const dx = n.root.position.x - playerPos.x, dz = n.root.position.z - playerPos.z;
      const dist = Math.hypot(dx, dz);
      if (n.talking) {
        n.root.visible = true; n.char.setState('talk');
        n.facing = AL.angleDamp(n.facing, Math.atan2(-dx, -dz), 8, dt); n.root.rotation.y = n.facing;
        n.char.update(dt, 0); return;
      }
      const want = desired(n);
      if (want.mode === 'home' && n.at === n.home && !n.path) { n.hidden = true; }
      else if (n.hidden && want.mode !== 'home') { n.hidden = false; const p = plazaPoint(n.home); n.root.position.set(p.x, AL.City.groundY(p.x, p.z), p.z); }
      // plan
      if (!n.path) {
        if (want.k !== n.at) {
          n.path = routeBetween(n.at, want.k, n.root.position, plazaPoint(want.k)); n.s = 0; n.dest = want.k; n.hidden = false;
        } else if (!n.hidden) {
          n.wait -= dt;
          if (n.wait <= 0) {
            if (R() < 0.35) { n.chat = 2 + R() * 4; n.wait = n.chat + 1; }
            else { n.path = localRoute(n.root.position, plazaPoint(n.at)); n.s = 0; n.dest = n.at; }
          }
        }
      }
      // move
      let moving = false;
      if (n.path) {
        const fast = dist > 140;
        const sp = fast ? 28 : n.speed;
        n.s += sp * dt;
        if (n.s >= n.path.len) {
          const end = n.path.pts[n.path.pts.length - 1];
          n.root.position.x = end.x; n.root.position.z = end.z; n.at = n.dest; n.path = null; n.wait = 2 + R() * 8;
        } else {
          AL.City.followPath(n.root, n.path.pts, n.path.seg, n.s);
          n.facing = n.root.rotation.y; moving = true;
          if (dist < 60) { const r = AL.City.resolve(n.root.position.x, n.root.position.z, 0.3); n.root.position.x = r.x; n.root.position.z = r.z; }
        }
      }
      n.root.position.y = AL.damp(n.root.position.y, AL.City.groundY(n.root.position.x, n.root.position.z), 8, dt);
      n.root.rotation.y = n.facing;
      n.root.visible = !n.hidden && dist < near;
      if (n.root.visible && dist < near * 0.7) {
        if (moving) n.char.setState('walk');
        else if (n.chat > 0) { n.chat -= dt; n.char.setState('talk'); }
        else n.char.setState('idle');
        n.char.update(dt, moving ? n.speed : 0);
      }
    });
  };

  /* ---- other online players: shown standing on the plaza of the district where they last acted ---- */
  NPC.syncOthers = () => {
    if (!NPC.scene) return;
    const now = Date.now(), active = {};
    const list = Object.entries(AL.others).filter(([id, p]) => id !== AL.uid && p && D[p.at] && (now - (Number(p.updatedAt) || 0)) < 30 * 60 * 1000).slice(0, 24);
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
  NPC.animateOthers = (dt) => { Object.values(NPC.others).forEach((o) => o.ch.update(dt, 0)); };
  AL.NPC = NPC;
})(window.AL);
