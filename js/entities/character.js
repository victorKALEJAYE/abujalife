/* Abuja Life — modular 3D human.
   Character.create(look) builds a jointed rig (hips, spine, head, shoulders,
   elbows, thighs, knees) from shared primitives, dressed by outfit/hair
   builders, and animated procedurally (idle, walk, run, sit, drive, talk,
   interact, work, wave, eat). To swap in a skinned glTF model later, keep the
   same public API: { root, setState(name), update(dt, speed), height }. */
(function (AL) {
  'use strict';
  const T = AL.T;
  if (!T) return;
  const K = AL.Kit;
  const seg = AL.LITE ? [10, 8] : [16, 12];
  const G = {
    SPH: new T.SphereGeometry(1, seg[0], seg[1]),
    HEMI: new T.SphereGeometry(1, seg[0], 8, 0, Math.PI * 2, 0, Math.PI / 2),
    LIMB: (() => { const g = new T.CylinderGeometry(1, 0.78, 1, 10); g.translate(0, -0.5, 0); return g; })(),
    TORSO: (() => { const g = new T.CylinderGeometry(1, 0.86, 1, 12); g.translate(0, 0.5, 0); return g; })(),
    ROBE: (() => { const g = new T.CylinderGeometry(0.5, 1, 1, 14); g.translate(0, -0.5, 0); return g; })(),
    CYL: new T.CylinderGeometry(1, 1, 1, 12),
    BOX: K.BOX,
    TORUS: new T.TorusGeometry(1, 0.32, 6, 14),
  };
  const HAIR = '#141414';
  const m = (c) => K.smat(c);

  function part(parent, geo, color, sx, sy, sz, x = 0, y = 0, z = 0) {
    const o = new T.Mesh(geo, m(color)); o.scale.set(sx, sy, sz); o.position.set(x, y, z);
    o.castShadow = !AL.LITE; o.receiveShadow = false; parent.add(o); return o;
  }
  function joint(parent, x, y, z) { const g = new T.Group(); g.position.set(x, y, z); parent.add(g); return g; }

  /* clothing palette for each outfit; builders below add extra pieces */
  function palette(L) {
    const oc = L.color, sk = L.skin;
    const light = oc === '#f4f0e6';
    switch (L.outfit) {
      case 'street': return { top: oc, fore: oc, pants: '#3a3d44', shoes: '#e9e9e9', legs: null };
      case 'suit': return { top: oc, fore: oc, pants: oc, shoes: '#1b1b1b', legs: null };
      case 'kaftan': return { top: oc, fore: oc, pants: light ? '#e6dfcf' : oc, shoes: '#5b3b2a', legs: null };
      case 'agbada': return { top: oc, fore: oc, pants: light ? '#e6dfcf' : oc, shoes: '#5b3b2a', legs: null };
      case 'ankara': return { top: oc, fore: sk, pants: oc, shoes: '#c9a46b', legs: sk };
      case 'uniform': return { top: oc, fore: sk, pants: '#1f2a44', shoes: '#141414', legs: null };
      default: return { top: oc, fore: sk, pants: '#2b4a7a', shoes: '#f2f2f2', legs: null };
    }
  }

  function build(look) {
    const L = AL.cleanLook(look);
    const fem = L.frame === 'f';
    const bw = L.body === 'slim' ? 0.88 : L.body === 'broad' ? 1.2 : 1;
    const sw = fem ? 0.9 : 1, hw = fem ? 1.14 : 1, hs = fem ? 0.96 : 1;
    const P = palette(L), sk = L.skin;
    const root = new T.Group();
    const body = joint(root, 0, 0, 0); body.scale.setScalar(hs);
    const R = {};
    R.hips = joint(body, 0, 0.94, 0);
    part(R.hips, G.SPH, P.pants, 0.165 * hw * bw, 0.11, 0.105 * bw);
    R.spine = joint(R.hips, 0, 0.05, 0);
    part(R.spine, G.TORSO, P.top, 0.17 * bw * sw, 0.46, 0.105 * bw);
    part(R.spine, G.SPH, P.top, 0.205 * bw * sw, 0.075, 0.11 * bw, 0, 0.44, 0);
    if (fem) part(R.spine, G.SPH, P.top, 0.14 * bw, 0.065, 0.075, 0, 0.32, 0.06);
    if (L.body === 'broad') part(R.spine, G.SPH, P.top, 0.17, 0.15, 0.13, 0, 0.14, 0.035);
    part(R.spine, G.CYL, sk, 0.048, 0.1, 0.048, 0, 0.5, 0);
    R.head = joint(R.spine, 0, 0.55, 0);
    part(R.head, G.SPH, sk, 0.1, 0.122, 0.112, 0, 0.11, 0);
    [-1, 1].forEach((s) => {
      part(R.head, G.SPH, '#f6f2ea', 0.019, 0.014, 0.01, s * 0.038, 0.128, 0.098);
      part(R.head, G.SPH, '#1a1410', 0.009, 0.009, 0.006, s * 0.038, 0.128, 0.106);
      part(R.head, G.BOX, HAIR, 0.042, 0.008, 0.01, s * 0.038, 0.156, 0.104);
      part(R.head, G.SPH, sk, 0.016, 0.026, 0.012, s * 0.1, 0.11, 0);
    });
    part(R.head, G.SPH, sk, 0.017, 0.022, 0.02, 0, 0.098, 0.112);
    part(R.head, G.BOX, fem ? '#7a2e2a' : '#4a2018', 0.042, 0.009, 0.008, 0, 0.062, 0.104);
    buildHair(R.head, L);

    // arms
    ['l', 'r'].forEach((side) => {
      const s = side === 'l' ? -1 : 1;
      const sh = joint(R.spine, s * 0.205 * bw * sw, 0.42, 0);
      const sleeveLong = P.fore !== sk;
      part(sh, G.LIMB, P.top, 0.054 * bw, 0.27, 0.054 * bw);
      const el = joint(sh, 0, -0.27, 0);
      part(el, G.LIMB, sleeveLong ? P.fore : sk, 0.045 * bw, 0.25, 0.045 * bw);
      part(el, G.SPH, sk, 0.04, 0.058, 0.028, 0, -0.285, 0.005);
      if (sleeveLong && (L.outfit === 'agbada')) part(sh, G.ROBE, L.color, 0.12, 0.4, 0.12, 0, -0.08, 0);
      if (L.outfit === 'ankara') part(sh, G.SPH, L.color, 0.07, 0.06, 0.07, 0, -0.03, 0);
      R[side + 'Sh'] = sh; R[side + 'El'] = el;
    });
    // legs
    ['l', 'r'].forEach((side) => {
      const s = side === 'l' ? -1 : 1;
      const lg = joint(R.hips, s * 0.09 * hw * bw, -0.02, 0);
      part(lg, G.LIMB, P.legs || P.pants, 0.074 * bw, 0.43, 0.074 * bw);
      const kn = joint(lg, 0, -0.43, 0);
      part(kn, G.LIMB, P.legs || P.pants, 0.058 * bw, 0.42, 0.058 * bw);
      const ft = joint(kn, 0, -0.42, 0);
      part(ft, G.BOX, P.shoes, 0.085, 0.07, 0.22, 0, -0.035, 0.045);
      R[side + 'Leg'] = lg; R[side + 'Kn'] = kn;
    });
    buildOutfit(R, L, P, bw, sw, hw);
    return { root, R, L, height: 1.79 * hs };
  }

  function buildHair(head, L) {
    const oc = L.color === '#f4f0e6' ? '#d1342f' : L.color;
    switch (L.hair) {
      case 'lowcut': part(head, G.HEMI, HAIR, 0.104, 0.07, 0.116, 0, 0.14, -0.004); break;
      case 'afro': part(head, G.SPH, HAIR, 0.15, 0.13, 0.15, 0, 0.18, -0.012); break;
      case 'braids':
        part(head, G.HEMI, HAIR, 0.106, 0.08, 0.118, 0, 0.135, -0.004);
        for (let i = -3; i <= 3; i++) part(head, G.BOX, HAIR, 0.018, 0.3, 0.018, i * 0.028, -0.03, -0.1 + Math.abs(i) * 0.004);
        break;
      case 'cap':
        part(head, G.HEMI, oc, 0.108, 0.085, 0.12, 0, 0.15, 0);
        part(head, G.BOX, oc, 0.12, 0.012, 0.09, 0, 0.152, 0.14);
        break;
      case 'gele': {
        part(head, G.SPH, oc, 0.155, 0.085, 0.145, 0, 0.21, -0.01);
        const fan = part(head, G.SPH, oc, 0.19, 0.06, 0.1, 0, 0.29, -0.03); fan.rotation.z = 0.35;
        part(head, G.BOX, '#e0a526', 0.2, 0.014, 0.14, 0, 0.185, 0.01);
        break;
      }
      case 'fila': { const f = part(head, G.CYL, oc, 0.106, 0.1, 0.115, 0.01, 0.21, -0.01); f.rotation.z = -0.18; part(head, G.HEMI, HAIR, 0.103, 0.05, 0.114, 0, 0.14, 0); break; }
      case 'bun': part(head, G.HEMI, HAIR, 0.106, 0.075, 0.118, 0, 0.135, -0.004); part(head, G.SPH, HAIR, 0.075, 0.07, 0.075, 0, 0.27, -0.03); break;
      default: break; // bald
    }
  }

  function buildOutfit(R, L, P, bw, sw, hw) {
    const oc = L.color;
    switch (L.outfit) {
      case 'suit':
        part(R.spine, G.BOX, '#ffffff', 0.09, 0.2, 0.01, 0, 0.32, 0.104 * bw);
        part(R.spine, G.BOX, '#b8262a', 0.022, 0.18, 0.012, 0, 0.3, 0.11 * bw);
        break;
      case 'street':
        { const h = part(R.spine, G.TORUS, oc, 0.1, 0.07, 0.07, 0, 0.47, -0.05); h.rotation.x = Math.PI / 2.2; }
        part(R.spine, G.BOX, shade(oc), 0.17 * bw, 0.09, 0.02, 0, 0.1, 0.1 * bw);
        break;
      case 'kaftan':
        part(R.hips, G.ROBE, oc, 0.2 * bw * hw, 0.5, 0.13 * bw, 0, 0.06, 0);
        part(R.spine, G.BOX, '#e0a526', 0.03, 0.3, 0.012, 0, 0.26, 0.106 * bw);
        break;
      case 'agbada':
        part(R.spine, G.ROBE, oc, 0.3 * bw * sw, 0.95, 0.17 * bw, 0, 0.46, 0);
        part(R.spine, G.BOX, '#e0a526', 0.12, 0.16, 0.012, 0, 0.32, 0.12 * bw);
        break;
      case 'ankara': {
        const sk = part(R.hips, G.ROBE, oc, 0.22 * bw * hw, 0.52, 0.17 * bw, 0, 0.06, 0); sk.userData.cloth = true;
        [[-0.12, -0.12], [0.08, -0.2], [0, -0.33], [0.14, -0.38], [-0.15, -0.36], [-0.05, -0.05]].forEach(([x, y]) =>
          part(R.hips, G.SPH, x > 0 ? '#ffffff' : '#e0a526', 0.022, 0.022, 0.01, x, y, 0.16 * bw + y * -0.08));
        part(R.spine, G.BOX, '#e0a526', 0.17 * bw, 0.03, 0.11, 0, 0.0, 0);
        break;
      }
      case 'uniform':
        part(R.hips, G.BOX, '#1b1b1b', 0.33 * bw * hw, 0.04, 0.22 * bw, 0, 0.04, 0);
        part(R.spine, G.BOX, '#e0a526', 0.035, 0.035, 0.01, 0.09, 0.34, 0.105 * bw);
        [-1, 1].forEach((s) => part(R.spine, G.BOX, '#e0a526', 0.08, 0.012, 0.06, s * 0.17 * bw * sw, 0.47, 0));
        break;
      default: break;
    }
  }
  function shade(hex) {
    const c = new T.Color(hex); c.multiplyScalar(0.78); return '#' + c.getHexString();
  }

  /* ---------- animator ---------- */
  const JOINTS = ['hipsY', 'spineX', 'spineZ', 'headX', 'headY', 'lShX', 'lShZ', 'rShX', 'rShZ', 'lElX', 'rElX', 'lLegX', 'rLegX', 'lKnX', 'rKnX'];
  function Character(look) {
    const b = build(look);
    this.root = b.root; this.R = b.R; this.look = b.L; this.height = b.height;
    this.state = 'idle'; this.phase = Math.random() * 6; this.t = Math.random() * 10; this.stateT = 0;
    this.cur = {}; JOINTS.forEach((j) => { this.cur[j] = 0; }); this.cur.hipsY = 0.94;
  }
  Character.prototype.setState = function (s) { if (s !== this.state) { this.state = s; this.stateT = 0; } };
  Character.prototype.update = function (dt, speed = 0) {
    this.t += dt; this.stateT += dt;
    const t = this.t, tg = {}; JOINTS.forEach((j) => { tg[j] = 0; });
    tg.hipsY = 0.94; tg.lShZ = -0.07; tg.rShZ = 0.07; tg.lElX = -0.12; tg.rElX = -0.12;
    const st = this.state;
    if (st === 'walk' || st === 'run') {
      const run = st === 'run';
      this.phase += dt * (run ? 10.5 : 6.4) * AL.clamp(speed / (run ? 6.5 : 3.2), 0.6, 1.4);
      const p = this.phase, A = run ? 0.9 : 0.5, B = run ? 1.35 : 0.65, K0 = run ? 0.35 : 0.08;
      tg.lLegX = -A * Math.sin(p); tg.rLegX = A * Math.sin(p);
      tg.lKnX = K0 + B * Math.max(0, Math.cos(p)); tg.rKnX = K0 + B * Math.max(0, -Math.cos(p));
      tg.lShX = (run ? 0.85 : 0.42) * Math.sin(p); tg.rShX = -(run ? 0.85 : 0.42) * Math.sin(p);
      tg.lElX = run ? -1.3 : -0.25; tg.rElX = run ? -1.3 : -0.25;
      tg.spineX = run ? 0.16 : 0.03; tg.spineZ = Math.sin(p) * (run ? 0.04 : 0.025);
      tg.hipsY = 0.94 - (run ? 0.05 : 0.015) + Math.abs(Math.cos(p)) * (run ? 0.06 : 0.025);
      tg.headX = run ? -0.1 : 0;
    } else if (st === 'sit' || st === 'drive') {
      tg.hipsY = 0.5; tg.lLegX = tg.rLegX = -1.45; tg.lKnX = tg.rKnX = 1.45;
      tg.lShX = tg.rShX = -0.35; tg.lElX = tg.rElX = -0.7;
      if (st === 'drive') { tg.lShX = tg.rShX = -1.0; tg.lElX = tg.rElX = -0.45; tg.lShZ = -0.15; tg.rShZ = 0.15; }
      tg.spineX = Math.sin(t * 1.6) * 0.012;
    } else if (st === 'eat') {
      tg.rShX = -0.9 - Math.max(0, Math.sin(t * 3)) * 0.35; tg.rElX = -1.9; tg.lShX = -0.5; tg.lElX = -1.1;
      tg.headX = 0.1 + Math.sin(t * 3) * 0.05;
    } else if (st === 'interact') {
      tg.rShX = -1.25 + Math.sin(t * 6) * 0.08; tg.rElX = -0.25; tg.spineX = 0.08; tg.headX = 0.12;
    } else if (st === 'talk') {
      tg.rShX = -0.55 + Math.sin(t * 3.6) * 0.25; tg.rElX = -1.0 + Math.sin(t * 2.4) * 0.2; tg.rShZ = 0.25;
      tg.lShX = -0.25 + Math.sin(t * 2.9 + 1) * 0.15; tg.lElX = -0.6;
      tg.headX = Math.sin(t * 3.1) * 0.06; tg.headY = Math.sin(t * 1.3) * 0.15;
    } else if (st === 'work') {
      tg.rShX = -1.7 + Math.sin(t * 8) * 0.6; tg.rElX = -0.7; tg.lShX = -0.9; tg.lElX = -0.8; tg.spineX = 0.25; tg.headX = 0.2;
      tg.hipsY = 0.9; tg.lKnX = tg.rKnX = 0.3; tg.lLegX = tg.rLegX = -0.2;
    } else if (st === 'wave') {
      tg.rShZ = 2.5; tg.rElX = -0.2; tg.rShX = Math.sin(t * 9) * 0.25;
    } else { // idle
      tg.spineX = Math.sin(t * 1.8) * 0.018; tg.lShZ = -0.08 - Math.sin(t * 1.8) * 0.02; tg.rShZ = 0.08 + Math.sin(t * 1.8) * 0.02;
      tg.headY = Math.sin(t * 0.37) * 0.25 * Math.max(0, Math.sin(t * 0.21)); tg.hipsY = 0.94 + Math.sin(t * 1.8) * 0.004;
    }
    const k = AL.reduceMotion ? 30 : 13;
    JOINTS.forEach((j) => { this.cur[j] = AL.damp(this.cur[j], tg[j], k, dt); });
    const c = this.cur, R = this.R;
    R.hips.position.y = c.hipsY;
    R.spine.rotation.x = c.spineX; R.spine.rotation.z = c.spineZ;
    R.head.rotation.x = c.headX; R.head.rotation.y = c.headY;
    R.lSh.rotation.x = c.lShX; R.lSh.rotation.z = c.lShZ; R.rSh.rotation.x = c.rShX; R.rSh.rotation.z = c.rShZ;
    R.lEl.rotation.x = c.lElX; R.rEl.rotation.x = c.rElX;
    R.lLeg.rotation.x = c.lLegX; R.rLeg.rotation.x = c.rLegX; R.lKn.rotation.x = c.lKnX; R.rKn.rotation.x = c.rKnX;
  };

  AL.Character = {
    create: (look) => new Character(look),
    /* quick static figure (used by previews and the home interior) */
    figure: (look) => { const c = new Character(look); c.update(0.016, 0); return c; },
  };
})(window.AL);
