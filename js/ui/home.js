/* Abuja Life — inside your home: 3D interior, furniture shop, paint and sleep. */
(function (AL) {
  'use strict';
  const $ = AL.$;
  const T = AL.T;
  const K = AL.Kit;
  const H = { v: null };

  function render() {
    const h = AL.bestHome();
    $('homeTitle').textContent = h ? 'My ' + h.name.toLowerCase() + ' in ' + AL.D[h.at].name : 'My home';
    const c = AL.comfort();
    const st = $('homeStats'); st.innerHTML = '';
    st.appendChild(AL.UI.stats([['Comfort', c + ' pts'], ['Pay bonus', '+' + (c / 2).toFixed(1) + '%'], ['Energy', Math.round(AL.S.energy) + ' / 100'], ['Time', AL.clock()]]));
    const pr = $('paintRow'); pr.innerHTML = '';
    AL.WALLS.forEach((w) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'sw'; b.style.background = w; b.setAttribute('aria-label', 'Paint walls ' + w); b.setAttribute('aria-pressed', String(w === AL.S.wall)); b.onclick = () => AL.Econ.paint(w); pr.appendChild(b); });
    const fl = $('furnList'); fl.innerHTML = '';
    AL.FURN.forEach((f) => {
      const own = AL.S.furn.includes(f.id);
      fl.appendChild(AL.UI.mk(f.name, '+' + f.comfort + ' comfort' + (own ? ' · in your home' : ''), own ? '<span class="owned">OWNED</span>' : AL.fmt(f.cost), 'cost', () => AL.Econ.buyFurn(f), own));
    });
  }
  H.open = () => {
    if (!AL.bestHome()) return AL.toast('You do not own a home yet. Visit an estate agent.');
    $('homeOv').hidden = false; render();
    if (!T) return;
    try {
      if (!H.v) {
        const c = $('homeCanvas'); const r = new T.WebGLRenderer({ canvas: c, antialias: true }); r.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2)); r.shadowMap.enabled = true;
        const sc = new T.Scene(); sc.background = new T.Color('#2b2f36');
        sc.add(new T.HemisphereLight(0xfff6e8, 0x50483c, 0.75)); const pl = new T.PointLight(0xfff1d6, 0.9, 60); pl.position.set(0, 9, 2); pl.castShadow = true; sc.add(pl);
        const cam = new T.PerspectiveCamera(42, 4 / 3, 0.1, 200);
        H.v = { r, sc, cam, room: null, yaw: 0.7, drag: null, running: false, ch: null, last: performance.now() };
        c.addEventListener('pointerdown', (e) => { H.v.drag = e.clientX; c.setPointerCapture(e.pointerId); });
        c.addEventListener('pointermove', (e) => { if (H.v.drag != null) { H.v.yaw = Math.max(0.1, Math.min(1.45, H.v.yaw + (e.clientX - H.v.drag) * 0.006)); H.v.drag = e.clientX; } });
        c.addEventListener('pointerup', () => { H.v.drag = null; });
      }
      const w = $('homeCanvas').clientWidth || 480; H.v.r.setSize(w, w * 0.75, false);
      build();
      if (!H.v.running) { H.v.running = true; H.v.last = performance.now(); requestAnimationFrame(loop); }
    } catch (e) { $('homeCanvas').style.display = 'none'; }
  };
  H.close = () => { $('homeOv').hidden = true; };
  /* the room is drawn in "room units" (about 0.75 m) like the original */
  function build() {
    if (!H.v) return;
    if (H.v.room) H.v.sc.remove(H.v.room);
    const g = new T.Group(); H.v.room = g; H.v.sc.add(g);
    const h = AL.bestHome(); if (!h) return;
    const { box, mesh, CYL, mat } = K;
    const [Wd, Dp] = AL.ROOM_SIZE[h.id] || [10, 8], Hh = 5.2, wall = AL.S.wall, has = (id) => AL.S.furn.includes(id);
    H.v.size = [Wd, Dp];
    box(g, Wd, 0.3, Dp, '#cdb995', 0, -0.3, 0);
    for (let x = -Wd / 2 + 1; x < Wd / 2; x += 2) box(g, 0.04, 0.31, Dp, '#b9a37c', x, -0.3, 0);
    box(g, Wd, Hh, 0.3, wall, 0, 0, -Dp / 2); box(g, 0.3, Hh, Dp, wall, -Wd / 2, 0, 0);
    box(g, 2.6, 1.8, 0.05, '#9fd3f0', Wd * 0.15, 2.2, -Dp / 2 + 0.17); box(g, 2.8, 0.15, 0.1, '#ffffff', Wd * 0.15, 2.1, -Dp / 2 + 0.2);
    box(g, 0.06, 3.4, 1.6, '#7a5a3a', -Wd / 2 + 0.17, 0, Dp * 0.25);
    const bx = -Wd / 2 + 2.2, bz = -Dp / 2 + 2;
    if (has('bed')) { box(g, 3.2, 0.7, 4.2, '#6b4f33', bx, 0, bz + 0.3); box(g, 3, 0.45, 3.9, '#f4f0e6', bx, 0.7, bz + 0.35); box(g, 3.2, 1.6, 0.25, '#6b4f33', bx, 0, bz - 1.8); box(g, 2.4, 0.3, 0.8, '#ffffff', bx, 1.15, bz - 1.1); box(g, 3.05, 0.12, 2.2, '#2e6fd8', bx, 1.15, bz + 1); }
    else if (has('mattress')) { box(g, 2.6, 0.45, 3.8, '#e8e2d4', bx, 0, bz + 0.3); box(g, 2, 0.25, 0.7, '#ffffff', bx, 0.45, bz - 1.1); }
    else { box(g, 2.2, 0.12, 3.4, '#b0a58f', bx, 0, bz + 0.3); }
    if (has('fan')) { box(g, 0.5, 0.1, 0.5, '#333', bx + 2.6, 0, bz - 1); box(g, 0.12, 2.6, 0.12, '#ddd', bx + 2.6, 0, bz - 1); const f = mesh(CYL, mat('#eaeaea'), g); f.scale.set(0.6, 0.15, 0.6); f.rotation.x = Math.PI / 2; f.position.set(bx + 2.6, 2.75, bz - 0.9); }
    if (has('ac')) { box(g, 2.4, 0.8, 0.5, '#f7f7f7', -Wd * 0.18, Hh - 1.6, -Dp / 2 + 0.4); box(g, 2, 0.08, 0.05, '#bfc6cc', -Wd * 0.18, Hh - 1.45, -Dp / 2 + 0.66); }
    if (has('tv')) { box(g, 3, 0.8, 0.8, '#5b3b2a', Wd * 0.22, 0, -Dp / 2 + 0.7); box(g, 3.2, 1.8, 0.12, '#111418', Wd * 0.22, 0.85, -Dp / 2 + 0.5); box(g, 2.9, 1.5, 0.02, '#1f3b57', Wd * 0.22, 1.0, -Dp / 2 + 0.58); }
    if (has('sofa')) { const sx = Wd * 0.22, sz = Dp / 2 - 1.4; box(g, 3.6, 0.7, 1.4, '#7a3b2e', sx, 0, sz); box(g, 3.6, 1.1, 0.4, '#7a3b2e', sx, 0.7, sz + 0.5); box(g, 0.4, 0.6, 1.4, '#6a3226', sx - 1.8, 0.7, sz); box(g, 0.4, 0.6, 1.4, '#6a3226', sx + 1.8, 0.7, sz); }
    if (has('art')) { box(g, 4, 0.05, 3, '#d1342f', Wd * 0.2, 0, 0.4); box(g, 3.4, 0.06, 2.4, '#e0a526', Wd * 0.2, 0.01, 0.4); box(g, 1.8, 1.2, 0.08, '#0b7a4b', -Wd * 0.05, 2.6, -Dp / 2 + 0.2); box(g, 1.4, 0.9, 0.1, '#e0a526', -Wd * 0.05, 2.75, -Dp / 2 + 0.22); }
    if (has('fridge')) { box(g, 1.2, 2.6, 1.1, '#e9eef2', -Wd / 2 + 0.9, 0, Dp / 2 - 1.2); box(g, 0.08, 0.8, 0.08, '#9aa5ae', -Wd / 2 + 1.5, 1.4, Dp / 2 - 0.62); }
    if (has('table')) { const tx = -Wd * 0.05, tz = Dp * 0.12; box(g, 2.4, 0.15, 1.4, '#8a6a3e', tx, 1.1, tz); [[-1, -0.5], [1, -0.5], [-1, 0.5], [1, 0.5]].forEach(([a, b]) => box(g, 0.12, 1.1, 0.12, '#6b4f33', tx + a, 0, tz + b)); [[-0.7, -1.1], [0.7, -1.1], [-0.7, 1.1], [0.7, 1.1]].forEach(([a, b]) => box(g, 0.6, 0.6, 0.6, '#6b4f33', tx + a, 0, tz + b)); }
    if (has('gen')) { box(g, 1.4, 1, 1, '#e0a526', Wd / 2 - 1, 0, Dp / 2 - 0.9); box(g, 1.2, 0.25, 0.8, '#22262b', Wd / 2 - 1, 1, Dp / 2 - 0.9); }
    if (has('solar')) { box(g, 0.9, 1.4, 0.6, '#2e6fd8', Wd / 2 - 2.6, 0, Dp / 2 - 0.8); box(g, 0.6, 0.2, 0.05, '#7fdc9a', Wd / 2 - 2.6, 1, Dp / 2 - 0.48); }
    const ch = AL.Character.create(AL.S.look); ch.root.scale.setScalar(1.7); ch.root.position.set(Wd * 0.05, 0, Dp * 0.05 + 0.6); ch.root.rotation.y = 0.5; g.add(ch.root); H.v.ch = ch;
  }
  function loop(now) {
    const v = H.v;
    if ($('homeOv').hidden) { v.running = false; return; }
    const dt = Math.min(0.05, (now - v.last) / 1000); v.last = now;
    if (v.ch) v.ch.update(dt, 0);
    const [Wd, Dp] = v.size || [10, 8], R = Math.max(Wd, Dp) * 1.15;
    v.cam.position.set(Math.sin(v.yaw) * R, R * 0.75, Math.cos(v.yaw) * R); v.cam.lookAt(0, 1.2, 0);
    v.r.render(v.sc, v.cam); requestAnimationFrame(loop);
  }
  AL.on('home-changed', () => { if (!$('homeOv').hidden) { render(); build(); } });
  AL.on('change', () => { if (!$('homeOv').hidden) render(); });
  H.bind = () => {
    $('homeClose').onclick = H.close;
    $('homeSleep').onclick = () => { H.close(); AL.Econ.sleep(); };
  };
  AL.Home = H;
})(window.AL);
