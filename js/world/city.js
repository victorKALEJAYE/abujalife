/* Abuja Life — the city. Builds the existing 16-district Abuja map inside a
   `world` group scaled to human size, plus landmarks, venues, traffic and the
   collision / ground-height data the player and NPCs walk on. */
(function (AL) {
  'use strict';
  const T = AL.T;
  if (!T) return;
  const K = AL.Kit, W = AL.W, D = AL.D;
  const City = { world: null, colliders: [], grid: new Map(), cell: 12, traffic: [], pickables: [], venues: [], ready: false };
  const ROADS = [-96, -48, 0, 48, 96];

  /* ---------- ground height (world metres) ---------- */
  City.districtAt = (wx, wz) => {
    const mx = wx / W, mz = wz / W;
    let best = null, bd = 1e9;
    AL.DKEYS.flat().forEach((k) => { const d = Math.max(Math.abs(D[k].x - mx), Math.abs(D[k].z - mz)); if (d < bd) { bd = d; best = k; } });
    return { key: best, inside: bd <= 20, dist: bd };
  };
  City.groundY = (wx, wz) => {
    const { key, inside } = City.districtAt(wx, wz);
    if (inside) {
      const dx = Math.abs(wx / W - D[key].x), dz = Math.abs(wz / W - D[key].z);
      if (dx <= 4.5 && dz <= 4.5) return 0.64 * W;
      return 0.6 * W;
    }
    const mx = wx / W, mz = wz / W;
    const onRoad = ROADS.some((v) => (Math.abs(mx - v) <= 4 && Math.abs(mz) <= 100) || (Math.abs(mz - v) <= 4 && Math.abs(mx) <= 100));
    return onRoad ? 0.1 * W : 0;
  };

  /* ---------- collision ---------- */
  function addCollider(minX, maxX, minZ, maxZ, top) {
    const c = { minX, maxX, minZ, maxZ, top };
    City.colliders.push(c);
    const cs = City.cell;
    for (let gx = Math.floor(minX / cs); gx <= Math.floor(maxX / cs); gx++) {
      for (let gz = Math.floor(minZ / cs); gz <= Math.floor(maxZ / cs); gz++) {
        const key = gx + ',' + gz;
        if (!City.grid.has(key)) City.grid.set(key, []);
        City.grid.get(key).push(c);
      }
    }
  }
  City.addCollider = addCollider;
  const bb = new T.Box3();
  function collectColliders(root) {
    root.updateMatrixWorld(true);
    root.traverse((o) => {
      if (!o.isMesh || o.userData.noCollide) return;
      bb.setFromObject(o);
      const w = bb.max.x - bb.min.x, d = bb.max.z - bb.min.z;
      if (w > 70 || d > 70 || w < 0.05 || d < 0.05) return;
      const cx = (bb.min.x + bb.max.x) / 2, cz = (bb.min.z + bb.max.z) / 2;
      const g = City.groundY(cx, cz);
      if (bb.max.y - g > 0.9 && bb.min.y < g + 1.0) addCollider(bb.min.x, bb.max.x, bb.min.z, bb.max.z, bb.max.y);
    });
  }
  /* push a circle (x,z,r) out of every box it overlaps; returns the corrected position */
  City.resolve = (x, z, r) => {
    const cs = City.cell;
    const seen = new Set();
    for (let pass = 0; pass < 2; pass++) {
      for (let gx = Math.floor((x - r) / cs); gx <= Math.floor((x + r) / cs); gx++) {
        for (let gz = Math.floor((z - r) / cs); gz <= Math.floor((z + r) / cs); gz++) {
          const list = City.grid.get(gx + ',' + gz); if (!list) continue;
          for (const c of list) {
            if (pass === 0 && seen.has(c)) continue; seen.add(c);
            const nx = AL.clamp(x, c.minX, c.maxX), nz = AL.clamp(z, c.minZ, c.maxZ);
            const dx = x - nx, dz = z - nz, d2 = dx * dx + dz * dz;
            if (d2 >= r * r) continue;
            if (d2 > 1e-6) { const d = Math.sqrt(d2), push = r - d; x += (dx / d) * push; z += (dz / d) * push; }
            else {
              // centre is inside the box: leave by the nearest face
              const l = x - c.minX, rr = c.maxX - x, t = z - c.minZ, b = c.maxZ - z, m = Math.min(l, rr, t, b);
              if (m === l) x = c.minX - r; else if (m === rr) x = c.maxX + r; else if (m === t) z = c.minZ - r; else z = c.maxZ + r;
            }
          }
        }
      }
    }
    return { x, z };
  };
  City.blocked = (x, z, r) => { const p = City.resolve(x, z, r); return Math.abs(p.x - x) + Math.abs(p.z - z) > 0.01; };

  /* ---------- builders ---------- */
  function buildGround(world) {
    const g = K.mesh(new T.PlaneGeometry(900, 900), K.mat('#a9c57d'), world, false); g.rotation.x = -Math.PI / 2; g.receiveShadow = true; g.userData.noCollide = true;
  }
  function buildRoads(world) {
    const rm = K.mat('#4b5058'), dash = K.mat('#f1e9c9'), kerb = K.mat('#d8d2c4');
    ROADS.forEach((v) => {
      const a = K.mesh(K.BOX, rm, world, false); a.scale.set(8, 0.1, 200); a.position.set(v, 0.05, 0);
      const b = K.mesh(K.BOX, rm, world, false); b.scale.set(200, 0.1, 8); b.position.set(0, 0.06, v);
      for (let t = -96; t <= 96; t += AL.LITE ? 12 : 8) {
        const d1 = K.mesh(K.BOX, dash, world, false); d1.scale.set(0.3, 0.12, 2.4); d1.position.set(v, 0.08, t);
        const d2 = K.mesh(K.BOX, dash, world, false); d2.scale.set(2.4, 0.12, 0.3); d2.position.set(t, 0.08, v);
      }
      [-4.1, 4.1].forEach((o) => {
        const k1 = K.mesh(K.BOX, kerb, world, false); k1.scale.set(0.25, 0.14, 200); k1.position.set(v + o, 0.07, 0);
        const k2 = K.mesh(K.BOX, kerb, world, false); k2.scale.set(200, 0.14, 0.25); k2.position.set(0, 0.07, v + o);
      });
    });
    const ar = K.mesh(K.BOX, rm, world, false); ar.scale.set(70, 0.1, 8); ar.position.set(-131, 0.05, 24);
  }

  function buildDistrict(world, k) {
    const d = D[k], g = new T.Group(); g.position.set(d.x, 0, d.z); g.userData.key = k; world.add(g); City.pickables.push(g);
    K.box(g, 40, 0.6, 40, d.base, 0, 0, 0).castShadow = false;
    K.box(g, 6, 0.62, 12, '#7d8289', 0, 0, 14).castShadow = false;
    K.box(g, 9, 0.64, 9, '#ece6d6', 0, 0, 0).castShadow = false;
    const R = AL.rand(k.length * 977 + k.charCodeAt(0) * 31);
    const lots = []; for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) { if (i === 0 && (j === 0 || j === 1)) continue; lots.push([i * 13.3, j * 13.3]); }
    const pick = (a) => a[Math.floor(R() * a.length)];
    const walls = ['#f2e6cf', '#e9d3b0', '#f4f0e6', '#dfe8e2', '#f0d9c4', '#e6e0f0'];
    const { box, roof, tree, house, tower, stall, wall, pool, car, bus, plane, mesh, ICO, CYL, ROOF, mat } = K;
    lots.forEach(([x, z], n) => {
      switch (k) {
        case 'kubwa': house(g, x - 2.6, z - 2, 4.4, 4, 3, pick(walls), pick(['#b5523b', '#8e3b2e', '#c4693f'])); house(g, x + 2.6, z + 2.4, 4, 4, 2.8, pick(walls), pick(['#b5523b', '#6f7f8f']), Math.PI); if (R() < 0.5) tree(g, x + 3, z - 3.5, 0.7); break;
        case 'gwarinpa': house(g, x, z, 7, 6, 3.6, '#f1ebdc', '#3e7a5a'); tree(g, x + 4.5, z + 4, 0.8); break;
        case 'jabi':
          if (n === 0) { box(g, 11, 4.5, 9, '#e7ecef', x, 0.6, z); box(g, 11.2, 0.8, 9.2, '#0b7a4b', x, 4.4, z); box(g, 6, 1.2, 0.3, '#ffffff', x, 2.6, z + 4.6); }
          else { house(g, x, z, 6, 5.5, 5.5, pick(['#f4f0e6', '#e3e8ec']), '#55606b'); if (R() < 0.6) tree(g, x - 4.5, z + 4, 0.8); } break;
        case 'garki':
          if (n < 3) { bus(g, x - 2.5, z, 0.05).scale.setScalar(0.6); bus(g, x + 2.5, z, -0.05).scale.setScalar(0.6); }
          else { box(g, 4, 2.6, 4, pick(walls), x - 2.5, 0.6, z); box(g, 3.2, 0.25, 1.6, '#e0a526', x - 2.5, 2.3, z + 2.6); box(g, 1.4, 2, 1.4, '#e8e8e8', x + 3, 0.6, z + 2); box(g, 1.5, 0.4, 1.5, '#d1342f', x + 3, 2.6, z + 2); } break;
        case 'wuse':
          if (n === 4) { box(g, 11, 4, 10, '#d9c08f', x, 0.6, z); roof(g, 11, 10, 3, '#8b5e34', x, 4.6, z); }
          else { stall(g, x - 2.8, z - 2.8, pick(['#e0a526', '#d1342f', '#2e86c1', '#0b7a4b'])); stall(g, x + 2.8, z - 2.8, pick(['#e0a526', '#d1342f', '#2e86c1', '#0b7a4b'])); stall(g, x - 2.8, z + 2.8, pick(['#e0a526', '#d1342f', '#8e44ad'])); stall(g, x + 2.8, z + 2.8, pick(['#e0a526', '#0b7a4b', '#2e86c1'])); } break;
        case 'maitama':
          if (n % 2 === 0) { wall(g, x, z, 11.5); house(g, x - 1.5, z - 1.5, 7, 6, 5, '#f7f3ea', '#4a4f57'); pool(g, x + 2.8, z + 3, 3.2, 2.4); tree(g, x + 4, z - 4, 0.9); }
          else { tree(g, x - 3, z - 3, 1); tree(g, x + 3, z + 2, 1.1); tree(g, x - 2, z + 3.5, 0.8); } break;
        case 'lugbe':
          if (n === 5) { plane(g, x, z, Math.PI / 2.4); } else if (n === 6) { box(g, 3, 9, 3, '#e6e6e6', x, 0.6, z); box(g, 4.6, 2.2, 4.6, '#7fb7d6', x, 9.6, z); }
          else { house(g, x - 2.4, z, 4, 4, 2.8, pick(walls), pick(['#b5523b', '#8e3b2e'])); house(g, x + 2.6, z + 1.5, 4, 4, 2.6, pick(walls), '#6f7f8f', Math.PI); } break;
        case 'cbd': tower(g, x, z, 7, 7, 12 + Math.floor(R() * 22), pick(['#dfe5ea', '#cfd8df', '#e9e4da', '#bccad6']), R() < 0.4 ? '#9aa5ae' : null); break;
        case 'asokoro':
          if (n === 2 || n === 5) { tree(g, x - 3, z, 1.1); tree(g, x + 3, z + 3, 1); }
          else { wall(g, x, z, 11.5, '#efe6d2'); house(g, x, z - 1, 8, 6.5, 5.2, '#fbf7ef', '#7a3b2e'); tree(g, x + 4.3, z + 4.2, 0.8); } break;
        case 'gwagwalada':
          if (n === 0 || n === 3) { box(g, 11, 4, 6, '#e8dcc0', x, 0.6, z); box(g, 11.4, 0.5, 6.4, '#8e3b2e', x, 4.6, z); box(g, 1.2, 3, 1.2, '#f4f0e6', x - 4, 0.6, z + 3.4); box(g, 1.2, 3, 1.2, '#f4f0e6', x + 4, 0.6, z + 3.4); }
          else { house(g, x, z, 6.5, 5.5, 3, pick(walls), pick(['#b5523b', '#6f7f8f', '#8e3b2e'])); } break;
        case 'giri':
          if (n % 3 !== 2) { for (let r = -4; r <= 4; r += 2) { box(g, 10, 0.5, 1.1, r % 4 === 0 ? '#5f9e3a' : '#8a6a3e', x, 0.6, z + r); } }
          else { const hut = mesh(CYL, mat('#c9a46b'), g); hut.scale.set(2.2, 2.6, 2.2); hut.position.set(x - 2, 0.6 + 1.3, z); const th = mesh(ROOF, mat('#a88a4a'), g); th.scale.set(5.6, 2.4, 5.6); th.position.set(x - 2, 0.6 + 2.6 + 1.2, z); tree(g, x + 3.5, z + 3, 1); } break;
        case 'kuje':
          if (n % 2 === 0) { [[0, 0, 4.5, 3.2, 4], [-3, 2, 3, 2.4, 3], [3, -2, 3.2, 2.6, 3]].forEach(([dx, dz, sx, sy, sz]) => { const r = mesh(ICO, mat('#9a958c'), g); r.position.set(x + dx, 0.6 + sy * 0.6, z + dz); r.scale.set(sx, sy, sz); }); }
          else { box(g, 3, 2.2, 6, '#e0a526', x, 0.6, z); box(g, 3, 1.6, 2, '#d1342f', x, 2.8, z + 2); house(g, x + 4, z - 3, 3.2, 3.2, 2.4, pick(walls), '#6f7f8f'); } break;
        case 'apo':
          if (n % 2 === 0) {
            box(g, 10, 0.2, 8, '#6f6a62', x, 0.6, z);
            [[-4.8, -3.8], [4.8, 3.8], [4.8, -3.8], [-4.8, 3.8]].forEach(([a, b]) => box(g, 0.3, 3.4, 0.3, '#555', x + a, 0.6, z + b));
            box(g, 10.6, 0.3, 8.6, '#9aa5ae', x, 4, z);
            [-2.5, 2.5].forEach((dx, i) => { const c = car(pick(['#d1342f', '#2e6fd8', '#f4f4f4', '#3b3f46']), false); c.position.set(x + dx, 0.6, z); c.rotation.y = i ? 0.2 : -0.15; c.scale.setScalar(0.45); g.add(c); });
          } else { const c = car(pick(['#8e44ad', '#e67e22', '#3b3f46']), false); c.position.set(x - 2, 0.6, z + 1); c.rotation.y = 1.2; c.scale.setScalar(0.45); g.add(c); box(g, 1.2, 1.2, 1.2, '#3b3f46', x + 3, 0.6, z - 2); box(g, 1, 0.8, 1, '#22262b', x + 3.5, 0.6, z + 2); } break;
        case 'bwari':
          if (n === 0) { box(g, 11, 6, 7, '#f4f0e6', x, 0.6, z); roof(g, 11, 7, 2.5, '#0b7a4b', x, 6.6, z); for (let c = -4; c <= 4; c += 2) box(g, 0.7, 5, 0.7, '#ffffff', x + c, 0.6, z + 3.9); }
          else if (n % 2 === 1) { const h = mesh(ICO, mat('#7f8f5c'), g); h.position.set(x, 0.6 + 3, z); h.scale.set(6, 5, 6); tree(g, x + 4, z + 4, 0.8); }
          else { house(g, x, z, 6, 5, 3.2, pick(walls), '#3e7a5a'); tree(g, x - 4, z + 4, 0.9); } break;
        case 'nyanya':
          if (n < 2) { bus(g, x - 2.5, z, 0.1).scale.setScalar(0.6); bus(g, x + 2.6, z + 0.5, -0.08).scale.setScalar(0.6); }
          else { house(g, x - 2.6, z - 2.4, 4.2, 4, 2.8, pick(walls), pick(['#b5523b', '#6f7f8f'])); house(g, x + 2.6, z - 2.4, 4, 4, 3, pick(walls), '#8e3b2e'); house(g, x - 2.6, z + 2.8, 4, 3.6, 2.6, pick(walls), '#6f7f8f', Math.PI); house(g, x + 2.6, z + 2.8, 4, 3.6, 2.8, pick(walls), '#b5523b', Math.PI); } break;
        case 'karu':
          if (n === 4 || n === 5) { stall(g, x - 2.8, z - 2.8, '#e0a526'); stall(g, x + 2.8, z - 2.8, '#d1342f'); stall(g, x - 2.8, z + 2.8, '#0b7a4b'); stall(g, x + 2.8, z + 2.8, '#2e86c1'); }
          else { house(g, x, z, 6.5, 6, 4, pick(walls), pick(['#b5523b', '#55606b'])); } break;
      }
    });
    // street lamps on the plaza corners and along the driveway
    [[-4.4, -4.4], [4.4, -4.4], [-4.4, 4.4], [3.6, 12], [-3.6, 18]].forEach(([x, z]) => K.lamp(g, x, z));
    const sub = AL.JOBS.filter((j) => j.at === k).map((j) => j.name)[0] || '';
    const L = K.label(d.name, sub); L.position.set(0, k === 'cbd' ? 44 : 20, 0); g.add(L);
    d.group = g;
    buildVenues(g, k);
  }

  /* ---------- venues: physical kiosks the player walks up to ---------- */
  function signBoard(g, text, color, x, y, z, w = 2.2) {
    const tex = K.signTex(text, color);
    const m = new T.MeshLambertMaterial({ map: tex });
    const s = new T.Mesh(new T.PlaneGeometry(w, w * 0.375), m); s.position.set(x, y, z + 0.03); g.add(s);
    const s2 = s.clone(); s2.rotation.y = Math.PI; s2.position.z = z - 0.03; g.add(s2);
    return s;
  }
  /* venue props are authored in metres inside a group scaled back down by 1/W */
  function buildVenues(g, k) {
    AL.venuesFor(k).forEach((v) => {
      const vt = AL.VENUE_TYPES[v.type];
      const vg = new T.Group(); vg.position.set(v.x, 0.64, v.z); vg.scale.setScalar(1 / W); g.add(vg);
      const { box } = K;
      switch (v.type) {
        case 'jobs': case 'food': case 'estate': case 'biz': {
          box(vg, 2.4, 1.05, 0.9, '#f4f0e6', 0, 0, 0);
          box(vg, 2.5, 0.08, 1.0, vt.color, 0, 1.05, 0);
          [-1.1, 1.1].forEach((o) => box(vg, 0.08, 2.4, 0.08, '#6b4f33', o, 0, -0.5));
          box(vg, 2.9, 0.1, 1.7, vt.color, 0, 2.4, -0.1);
          signBoard(vg, vt.sign, vt.color, 0, 1.9, -0.52, 1.6);
          if (v.type === 'food') { box(vg, 0.5, 0.22, 0.4, '#d1342f', -0.6, 1.13, 0.1); box(vg, 0.45, 0.18, 0.35, '#e0a526', 0.5, 1.13, 0.1); }
          if (v.type === 'jobs') { box(vg, 1.6, 1.0, 0.06, '#e8e2d4', 0, 1.2, -0.48); }
          break;
        }
        case 'bank': {
          box(vg, 11, 6.5, 3.5, '#f6f7f8', 0, 0, -1.4);
          [-4.2, -1.4, 1.4, 4.2].forEach((o) => box(vg, 0.5, 6.5, 0.5, '#ffffff', o, 0, 0.6));
          box(vg, 2.4, 3, 0.1, '#7fb7d6', 0, 0, 0.36);
          box(vg, 12, 0.5, 4.6, '#16a085', 0, 6.5, -0.9);
          signBoard(vg, 'CAPITAL TRUST BANK', '#16a085', 0, 5.2, 0.4, 6.5);
          break;
        }
        case 'atm': { box(vg, 0.8, 1.9, 0.6, '#16a085', 0, 0, 0); box(vg, 0.55, 0.4, 0.05, '#bfeee0', 0, 1.2, 0.31); signBoard(vg, 'ATM', '#0f6e5c', 0, 2.25, 0.0, 0.8); break; }
        case 'taxi': {
          box(vg, 0.1, 2.6, 0.1, '#dcdcdc', -1.6, 0, 0);
          signBoard(vg, 'TAXI', '#2e9e5b', -1.6, 2.9, 0, 1.2);
          const c = K.car('#2e9e5b', true); c.scale.setScalar(1.2); c.position.set(1.6, -0.03, 4.2); vg.add(c);
          break;
        }
        case 'home': { box(vg, 1.4, 2.3, 0.3, '#5b3b2a', 0, 0, 0); box(vg, 1.8, 0.25, 0.5, '#efe6d2', 0, 2.3, 0); signBoard(vg, 'HOME', '#d1342f', 0, 2.85, 0.1, 1.0); break; }
        case 'park': {
          box(vg, 5, 0.12, 2.4, '#9aa5ae', 0, 2.6, 0); [-2.3, 2.3].forEach((o) => box(vg, 0.12, 2.6, 0.12, '#555', o, 0, -1.0));
          box(vg, 3.6, 0.1, 0.5, '#8a6a3e', 0, 0.42, -0.6); [-1.6, 1.6].forEach((o) => box(vg, 0.1, 0.42, 0.45, '#5b3b2a', o, 0, -0.6));
          signBoard(vg, 'AREA 1 PARK', '#6f7f8f', 0, 3.1, 0, 2.2);
          break;
        }
        case 'bench': {
          box(vg, 1.8, 0.08, 0.5, '#8a6a3e', 0, 0.42, 0); box(vg, 1.8, 0.45, 0.07, '#8a6a3e', 0, 0.5, -0.24);
          [-0.8, 0.8].forEach((o) => box(vg, 0.08, 0.42, 0.45, '#5b3b2a', o, 0, 0));
          break;
        }
      }
      City.venues.push({ district: k, type: v.type, mx: AL.D[k].x + v.x, mz: AL.D[k].z + v.z });
    });
  }

  /* ---------- landmarks ---------- */
  function buildLandmarks(world) {
    const lm = new T.Group(); world.add(lm);
    const at = (id) => AL.LANDMARKS.find((l) => l.id === id);
    const tag = (id, y) => { const l = at(id); const s = K.label(l.name); s.position.set(l.x, y, l.z); lm.add(s); };
    // Aso Rock
    const rk = new T.Group(); rk.position.set(at('asorock').x, 0, at('asorock').z); lm.add(rk);
    [[0, 10, 0, 16, 14, 13], [-12, 6, 8, 10, 9, 9], [10, 7, -8, 11, 10, 9], [4, 4, 14, 8, 7, 7], [-6, 14, -4, 9, 8, 8]].forEach(([x, y, z, sx, sy, sz]) => { const o = K.mesh(K.ICO, K.mat('#8b8274'), rk); o.position.set(x, y, z); o.scale.set(sx, sy, sz); o.rotation.set(x * 0.13, z * 0.21, y * 0.07); });
    tag('asorock', 32);
    // National Assembly: white block under a green dome
    { const l = at('assembly'); K.box(lm, 22, 6, 14, '#f2efe6', l.x, 0, l.z); for (let i = -9; i <= 9; i += 3) K.box(lm, 0.8, 6, 0.8, '#ffffff', l.x + i, 0, l.z + 7.4);
      const dome = K.mesh(new T.SphereGeometry(1, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), K.mat('#1f8a4c'), lm); dome.scale.set(7, 6, 7); dome.position.set(l.x, 6, l.z);
      K.box(lm, 0.4, 3, 0.4, '#e0a526', l.x, 12, l.z); tag('assembly', 24); }
    // Eagle Square: parade ground, stands and flags
    { const l = at('eagle'); K.box(lm, 34, 0.15, 22, '#d9d4c7', l.x, 0, l.z).userData.noCollide = true;
      K.box(lm, 34, 2.4, 3, '#c9c2b0', l.x, 0, l.z - 12.5); K.box(lm, 10, 4, 3.2, '#ffffff', l.x, 0, l.z - 12.5); K.box(lm, 10.4, 0.5, 4, '#0b7a4b', l.x, 4, l.z - 12.5);
      for (let i = -15; i <= 15; i += 5) K.flag(lm, l.x + i, l.z + 10, 6); tag('eagle', 14); }
    // National Mosque: cube hall, gold dome, four minarets
    { const l = at('mosque'); K.box(lm, 16, 7, 16, '#f4efe2', l.x, 0, l.z);
      const dome = K.mesh(new T.SphereGeometry(1, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), K.mat('#d4a62a'), lm); dome.scale.set(7, 7, 7); dome.position.set(l.x, 7, l.z);
      [[-9, -9], [9, -9], [-9, 9], [9, 9]].forEach(([a, b]) => { const m = K.mesh(K.CYL, K.mat('#f4efe2'), lm); m.scale.set(0.9, 22, 0.9); m.position.set(l.x + a, 11, l.z + b);
        const c = K.mesh(K.ROOF, K.mat('#d4a62a'), lm); c.scale.set(1.6, 2.6, 1.6); c.position.set(l.x + a, 23.3, l.z + b); });
      tag('mosque', 30); }
    // National Christian Centre: tall A-frame with spire
    { const l = at('ecwa'); K.box(lm, 14, 6, 18, '#f7f7f4', l.x, 0, l.z); K.roof(lm, 14, 18, 10, '#6aa0d8', l.x, 6, l.z);
      const sp = K.mesh(K.CYL, K.mat('#ffffff'), lm); sp.scale.set(0.6, 26, 0.6); sp.position.set(l.x, 13, l.z + 10);
      K.box(lm, 0.4, 3, 0.4, '#e0a526', l.x, 26, l.z + 10); K.box(lm, 2, 0.4, 0.4, '#e0a526', l.x, 27.6, l.z + 10); tag('ecwa', 34); }
    // National Stadium: bowl with a green pitch
    { const l = at('stadium');
      const ring = K.mesh(new T.CylinderGeometry(1, 0.86, 1, 28, 1, true), new T.MeshLambertMaterial({ color: '#d7dbe0', side: T.DoubleSide }), lm); ring.scale.set(22, 8, 16); ring.position.set(l.x, 4, l.z); ring.userData.noCollide = true;
      K.box(lm, 26, 0.2, 16, '#3f9e4a', l.x, 0, l.z).userData.noCollide = true;
      for (let a = 0; a < Math.PI * 2; a += Math.PI / 7) { const p = K.box(lm, 2.4, 8, 2.4, '#bfc6cc', l.x + Math.cos(a) * 21, 0, l.z + Math.sin(a) * 15.5); p.userData.solid = true; }
      tag('stadium', 18); }
    // Airport: runway, terminal and a plane
    { const l = at('airport'); K.box(lm, 70, 0.08, 9, '#3c4046', l.x - 4, 0, l.z + 22).userData.noCollide = true;
      K.box(lm, 26, 6, 10, '#e6ecef', l.x, 0, l.z - 6); K.box(lm, 26.4, 0.6, 10.4, '#0b7a4b', l.x, 6, l.z - 6);
      K.plane(lm, l.x, l.z + 8, 0.2); tag('airport', 16); }
    // Jabi Lake
    { const l = at('jabilake'); const lake = K.mesh(new T.CylinderGeometry(1, 1, 0.3, 24), K.mat('#3f9fd8'), lm, false); lake.scale.set(22, 1, 15); lake.position.set(l.x, 0.1, l.z); lake.userData.noCollide = true; tag('jabilake', 9); }
    // Millennium Park
    { const l = at('millennium'); for (let i = 0; i < 16; i++) K.tree(lm, l.x - 14 + Math.random() * 30, l.z - 12 + Math.random() * 24, 0.9 + Math.random() * 0.6, 0);
      K.box(lm, 6, 0.12, 30, '#d9cfb8', l.x, 0, l.z).userData.noCollide = true; tag('millennium', 14); }
    return lm;
  }

  /* ---------- traffic ---------- */
  function buildTraffic(world) {
    const loops = [
      [[-96, -96], [96, -96], [96, 96], [-96, 96]],
      [[-48, -48], [48, -48], [48, 48], [-48, 48]],
      [[0, -96], [0, 96], [48, 96], [48, -96]],
      [[-96, 0], [96, 0], [96, -48], [-96, -48]],
      [[-48, -96], [-48, 96], [-96, 96], [-96, -96]],
    ];
    const colors = ['#d1342f', '#2e86c1', '#e0a526', '#f4f4f4', '#3b3f46', '#8e44ad', '#16a085', '#ffffff'];
    loops.forEach((lp, li) => {
      const n = AL.LITE ? 2 : 3;
      for (let i = 0; i < n; i++) {
        const pts = lp.concat([lp[0]]).map((p) => new T.Vector3(p[0] + 2, 0.1, p[1] + 2));
        const seg = []; let len = 0; for (let j = 1; j < pts.length; j++) { const l = pts[j].distanceTo(pts[j - 1]); seg.push(l); len += l; }
        const taxi = (li + i) % 3 === 0;
        const c = K.car(taxi ? '#2e9e5b' : colors[(li * 3 + i) % colors.length], taxi); c.scale.setScalar(0.42); world.add(c);
        c.traverse((o) => { o.userData.noCollide = true; });
        City.traffic.push({ obj: c, pts, seg, len, s: (len * i) / n + li * 7, speed: 4.5 + Math.random() * 2.5, cur: 0 });
      }
    });
  }
  City.followPath = (obj, pts, seg, s) => {
    let i = 0; while (i < seg.length - 1 && s > seg[i]) { s -= seg[i]; i++; }
    const a = pts[i], b = pts[i + 1], f = Math.min(1, s / seg[i]);
    obj.position.lerpVectors(a, b, f);
    const dx = b.x - a.x, dz = b.z - a.z; if (dx || dz) obj.rotation.y = Math.atan2(dx, dz);
  };
  const fwd = new T.Vector3();
  City.updateTraffic = (dt, playerPos) => {
    City.traffic.forEach((n) => {
      // brake when the player (or the end of a queue) is just ahead
      let want = n.speed;
      if (playerPos) {
        const px = playerPos.x / W, pz = playerPos.z / W;
        const dx = px - n.obj.position.x, dz = pz - n.obj.position.z, d = Math.hypot(dx, dz);
        fwd.set(Math.sin(n.obj.rotation.y), 0, Math.cos(n.obj.rotation.y));
        if (d < 4.5 && (dx * fwd.x + dz * fwd.z) / (d || 1) > 0.4) want = 0;
      }
      n.cur = AL.damp(n.cur, want, 4, dt);
      n.s = (n.s + n.cur * dt) % n.len;
      City.followPath(n.obj, n.pts, n.seg, n.s);
    });
  };

  /* ---------- build ---------- */
  City.build = (scene, onDone) => {
    const world = new T.Group(); world.scale.setScalar(W); scene.add(world); City.world = world;
    buildGround(world); buildRoads(world);
    const tasks = AL.DKEYS.flat().map((k) => () => buildDistrict(world, k));
    tasks.push(() => buildLandmarks(world));
    const nTrees = AL.LITE ? 50 : 110;
    for (let i = 0; i < nTrees; i += 10) tasks.push(() => {
      for (let j = 0; j < 10; j++) {
        const a = Math.random() * Math.PI * 2, r = 140 + Math.random() * 130;
        const x = Math.cos(a) * r, z = Math.sin(a) * r;
        if (AL.LANDMARKS.some((l) => Math.hypot(l.x - x, l.z - z) < 30)) continue;
        K.tree(world, x, z, 0.9 + Math.random() * 0.8, 0);
      }
    });
    tasks.push(() => buildTraffic(world));
    tasks.push(() => { collectColliders(world); City.ready = true; if (onDone) onDone(); });
    (function step() {
      const t0 = performance.now();
      while (tasks.length && performance.now() - t0 < 14) { try { tasks.shift()(); } catch (e) { console.error('[city] build step failed', e); } }
      if (tasks.length) setTimeout(step, 16);
    })();
  };
  City.venueWorld = (v) => ({ x: v.mx * W, z: v.mz * W });
  City.districtWorld = (k, ox = 0, oz = 0) => ({ x: (D[k].x + ox) * W, z: (D[k].z + oz) * W });
  City.ROADS = ROADS;
  AL.City = City;
})(window.AL);
