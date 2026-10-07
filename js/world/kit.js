/* Abuja Life — low-poly building kit. Every prop is built from a few shared
   geometries and cached materials so the city stays cheap to draw. */
(function (AL) {
  'use strict';
  const T = AL.T;
  if (!T) return;
  const K = {};
  K.BOX = new T.BoxGeometry(1, 1, 1);
  K.ROOF = (() => { const g = new T.ConeGeometry(0.7072, 1, 4); g.rotateY(Math.PI / 4); return g; })();
  K.ICO = new T.IcosahedronGeometry(1, 0);
  K.CYL = new T.CylinderGeometry(1, 1, 1, 12);
  K.SPH = new T.SphereGeometry(1, 16, 12);
  const mats = {};
  K.mat = (c) => { if (!mats[c]) mats[c] = new T.MeshLambertMaterial({ color: c, flatShading: true }); return mats[c]; };
  K.smooth = {};
  K.smat = (c) => { if (!K.smooth[c]) K.smooth[c] = new T.MeshLambertMaterial({ color: c }); return K.smooth[c]; };
  K.windowMat = new T.MeshLambertMaterial({ color: 0x2d3e52, emissive: 0xffcf70, emissiveIntensity: 0 });
  K.lampMat = new T.MeshLambertMaterial({ color: 0xfff3c4, emissive: 0xffd77a, emissiveIntensity: 0 });

  K.mesh = (geo, m, parent, shadow = true) => { const o = new T.Mesh(geo, m); o.castShadow = shadow; o.receiveShadow = true; parent.add(o); return o; };
  K.box = (p, w, h, d, c, x, y, z) => { const o = K.mesh(K.BOX, typeof c === 'string' ? K.mat(c) : c, p); o.scale.set(w, h, d); o.position.set(x, y + h / 2, z); return o; };
  K.roof = (p, w, d, h, c, x, y, z) => { const o = K.mesh(K.ROOF, K.mat(c), p); o.scale.set(w * 1.12, h, d * 1.12); o.position.set(x, y + h / 2, z); return o; };
  K.tree = (p, x, z, s = 1, y = 0.6) => {
    K.box(p, 0.5 * s, 1.6 * s, 0.5 * s, '#7a5a3a', x, y, z).userData.solid = true;
    const f = K.mesh(K.ICO, K.mat(['#3f8f3a', '#4f9e3f', '#2f7d3a'][Math.floor(Math.random() * 3)]), p);
    f.scale.set(1.7 * s, 1.9 * s, 1.7 * s); f.position.set(x, y + 1.6 * s + 1.3 * s, z);
  };
  K.house = (p, x, z, w, d, h, wall, rc, face = 0) => {
    const g = new T.Group(); g.position.set(x, 0.6, z); g.rotation.y = face; p.add(g);
    K.box(g, w, h, d, wall, 0, 0, 0).userData.solid = true; K.roof(g, w, d, h * 0.7, rc, 0, h, 0);
    K.box(g, w * 0.22, h * 0.55, 0.2, '#5b3b2a', 0, 0, d / 2 + 0.05);
    K.box(g, w * 0.2, h * 0.25, 0.15, '#9fd3f0', -w * 0.3, h * 0.45, d / 2 + 0.05); K.box(g, w * 0.2, h * 0.25, 0.15, '#9fd3f0', w * 0.3, h * 0.45, d / 2 + 0.05);
    return g;
  };
  K.tower = (p, x, z, w, d, h, c, cap) => {
    K.box(p, w, h, d, c, x, 0.6, z).userData.solid = true;
    for (let y = 3; y < h - 1; y += 2.6) K.box(p, w + 0.15, 0.9, d + 0.15, K.windowMat, x, 0.6 + y, z);
    if (cap) K.box(p, w * 0.5, 1.6, d * 0.5, cap, x, 0.6 + h, z);
  };
  K.stall = (p, x, z, c) => {
    K.box(p, 2.4, 1.2, 2.4, '#a07b52', x, 0.6, z).userData.solid = true;
    [[-1.2, -1.2], [1.2, 1.2], [1.2, -1.2], [-1.2, 1.2]].forEach(([a, b]) => K.box(p, 0.2, 1.8, 0.2, '#6b4f33', x + a, 0.6, z + b));
    K.box(p, 3.2, 0.3, 3.2, c, x, 2.4, z);
  };
  K.wall = (p, x, z, s, c = '#e8e2d4') => {
    const h = 1.2, t = 0.35;
    K.box(p, s, h, t, c, x, 0.6, z - s / 2).userData.solid = true;
    const front = K.box(p, s, h, t, c, x, 0.6, z + s / 2 - 0.01); front.scale.x = s * 0.35; front.userData.solid = true;
    K.box(p, t, h, s, c, x - s / 2, 0.6, z).userData.solid = true;
    K.box(p, t, h, s, c, x + s / 2, 0.6, z).userData.solid = true;
  };
  K.pool = (p, x, z, w, d) => { K.box(p, w + 0.6, 0.12, d + 0.6, '#e9e4d8', x, 0.6, z); K.box(p, w, 0.14, d, '#3fa9e0', x, 0.62, z); };
  K.wheel = (g, wx, wy, wz, r = 0.45) => { const w = K.mesh(K.CYL, K.mat('#22262b'), g); w.scale.set(r, 0.35, r); w.rotation.z = Math.PI / 2; w.position.set(wx, wy, wz); return w; };
  K.car = (color, taxi) => {
    const g = new T.Group();
    K.box(g, 2.2, 0.9, 4.2, color, 0, 0.35, 0);
    K.box(g, 1.9, 0.8, 2.2, taxi ? '#ffffff' : '#d9e6ef', 0, 1.25, -0.2);
    if (taxi) K.box(g, 2.25, 0.25, 4.25, '#ffffff', 0, 0.9, 0);
    [[-1.05, 1.3], [1.05, 1.3], [-1.05, -1.3], [1.05, -1.3]].forEach(([wx, wz]) => K.wheel(g, wx, 0.45, wz));
    K.box(g, 0.5, 0.2, 0.1, '#fff6c2', -0.6, 0.6, 2.12); K.box(g, 0.5, 0.2, 0.1, '#fff6c2', 0.6, 0.6, 2.12);
    return g;
  };
  K.bus = (p, x, z, rot) => {
    const g = new T.Group(); g.position.set(x, 0.6, z); g.rotation.y = rot; p.add(g);
    K.box(g, 2.6, 2.2, 6.5, '#2e9e5b', 0, 0.4, 0).userData.solid = true;
    K.box(g, 2.65, 0.7, 6.55, '#ffffff', 0, 1.6, 0); K.box(g, 2.66, 0.5, 6.56, '#9fd3f0', 0, 1.65, 0);
    [[-1.2, 2.2], [1.2, 2.2], [-1.2, -2.2], [1.2, -2.2]].forEach(([wx, wz]) => K.wheel(g, wx, 0.5, wz, 0.5));
    return g;
  };
  K.plane = (p, x, z, rot) => {
    const g = new T.Group(); g.position.set(x, 0.6, z); g.rotation.y = rot; p.add(g);
    const f = K.mesh(K.CYL, K.mat('#f3f5f7'), g); f.scale.set(1.1, 11, 1.1); f.rotation.x = Math.PI / 2; f.position.y = 1.8; f.userData.solid = true;
    K.box(g, 13, 0.3, 2.4, '#e2e6ea', 0, 1.6, 0.5); K.box(g, 4.5, 0.25, 1.4, '#e2e6ea', 0, 2.2, -4.6); K.box(g, 0.25, 2.2, 1.6, '#0b7a4b', 0, 2.6, -4.8);
    [[-2.5, 0.8], [2.5, 0.8], [0, 4]].forEach(([wx, wz]) => K.box(g, 0.3, 1, 0.3, '#555', wx, 0, wz));
    return g;
  };
  K.flag = (p, x, z, h = 6) => {
    K.box(p, 0.12, h, 0.12, '#dcdcdc', x, 0.6, z);
    K.box(p, 0.05, 1.2, 0.6, '#0b8a4b', x, 0.6 + h - 1.3, z + 0.35);
    K.box(p, 0.05, 1.2, 0.6, '#ffffff', x, 0.6 + h - 1.3, z + 0.95);
    K.box(p, 0.05, 1.2, 0.6, '#0b8a4b', x, 0.6 + h - 1.3, z + 1.55);
  };
  K.lamp = (p, x, z) => {
    K.box(p, 0.14, 3.2, 0.14, '#3b3f46', x, 0.6, z);
    K.box(p, 0.7, 0.18, 0.3, K.lampMat, x + 0.25, 3.7, z);
  };

  /* canvas label sprite used for district names and signs */
  K.label = (text, sub, opts = {}) => {
    const c = document.createElement('canvas'); c.width = 512; c.height = sub ? 168 : 128;
    const x = c.getContext('2d');
    x.fillStyle = opts.bg || 'rgba(255,255,255,0.92)';
    const r = 34, w = c.width, h = c.height;
    x.beginPath(); x.moveTo(r, 0); x.arcTo(w, 0, w, h, r); x.arcTo(w, h, 0, h, r); x.arcTo(0, h, 0, 0, r); x.arcTo(0, 0, w, 0, r); x.fill();
    x.fillStyle = opts.fg || '#13211A'; x.textAlign = 'center'; x.textBaseline = 'middle';
    let fs = 58; x.font = '800 ' + fs + 'px Unbounded, "Arial Black", sans-serif';
    while (fs > 22 && x.measureText(text).width > w - 48) { fs -= 3; x.font = '800 ' + fs + 'px Unbounded, "Arial Black", sans-serif'; }
    x.fillText(text, w / 2, sub ? 60 : h / 2 + 2);
    if (sub) { x.font = '600 34px Figtree, sans-serif'; x.fillStyle = opts.subColor || '#0B7A4B'; x.fillText(sub, w / 2, 124); }
    const tex = new T.CanvasTexture(c); tex.anisotropy = 4;
    const s = new T.Sprite(new T.SpriteMaterial({ map: tex, depthWrite: false }));
    s.scale.set(17, (17 * c.height) / c.width, 1); s.renderOrder = 10;
    return s;
  };
  /* flat signboard with text on both faces, for venues */
  K.signTex = (text, color) => {
    const c = document.createElement('canvas'); c.width = 256; c.height = 96;
    const x = c.getContext('2d');
    x.fillStyle = color; x.fillRect(0, 0, 256, 96);
    x.fillStyle = '#ffffff'; x.textAlign = 'center'; x.textBaseline = 'middle';
    let fs = 54; x.font = '800 ' + fs + 'px Unbounded, "Arial Black", sans-serif';
    while (fs > 18 && x.measureText(text).width > 230) { fs -= 3; x.font = '800 ' + fs + 'px Unbounded, "Arial Black", sans-serif'; }
    x.fillText(text, 128, 50);
    const t = new T.CanvasTexture(c); t.anisotropy = 4; return t;
  };
  AL.Kit = K;
})(window.AL);
