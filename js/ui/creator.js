/* Abuja Life — character creator with a live 3D preview.
   Options come straight from the look tables in data.js. */
(function (AL) {
  'use strict';
  const $ = AL.$;
  const T = AL.T;
  const C = { editing: false, draft: null, prev: null };

  function swatchRow(el, colors, get, set, labelPrefix, names) {
    el.innerHTML = '';
    colors.forEach((c) => {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'sw'; b.style.background = c;
      b.setAttribute('aria-label', labelPrefix + ' ' + ((names && names[c]) || c)); b.setAttribute('aria-pressed', String(c === get()));
      b.onclick = () => { set(c); [...el.children].forEach((x) => x.setAttribute('aria-pressed', String(x === b))); refresh(); };
      el.appendChild(b);
    });
  }
  function chipRow(el, opts, get, set) {
    el.innerHTML = '';
    opts.forEach(([v, lab]) => {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'chip'; b.textContent = lab; b.setAttribute('aria-pressed', String(v === get()));
      b.onclick = () => { set(v); [...el.children].forEach((x) => x.setAttribute('aria-pressed', String(x === b))); refresh(); };
      el.appendChild(b);
    });
  }
  function buildOptions() {
    const d = C.draft;
    chipRow($('optFrame'), AL.FRAMES, () => d.frame, (v) => { d.frame = v; });
    chipRow($('optBody'), AL.BODIES, () => d.body, (v) => { d.body = v; });
    swatchRow($('optSkin'), AL.SKINS, () => d.skin, (v) => { d.skin = v; }, 'Skin tone', AL.SKIN_NAMES);
    chipRow($('optHair'), AL.HAIRS, () => d.hair, (v) => { d.hair = v; });
    chipRow($('optOutfit'), AL.OUTFITS, () => d.outfit, (v) => { d.outfit = v; });
    swatchRow($('optColor'), AL.OUTFIT_COLORS, () => d.color, (v) => { d.color = v; }, 'Outfit colour');
  }

  /* ---- live preview ---- */
  function startPreview() {
    if (!T) return;
    try {
      if (!C.prev) {
        const c = $('preview');
        const r = new T.WebGLRenderer({ canvas: c, antialias: true, alpha: true }); r.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        const sc = new T.Scene();
        sc.add(new T.HemisphereLight(0xffffff, 0x3a4a3f, 0.9));
        const dl = new T.DirectionalLight(0xfff1dc, 0.75); dl.position.set(2, 4, 3); sc.add(dl);
        const rim = new T.DirectionalLight(0x9fd3f0, 0.35); rim.position.set(-3, 2, -3); sc.add(rim);
        const disc = new T.Mesh(new T.CylinderGeometry(0.75, 0.75, 0.05, 32), AL.Kit.smat('#2c4a3f')); disc.position.y = -0.025; sc.add(disc);
        const cam = new T.PerspectiveCamera(30, 4 / 5, 0.1, 50); cam.position.set(0, 1.15, 4.3); cam.lookAt(0, 0.95, 0);
        C.prev = { r, sc, cam, ch: null, yaw: 0.35, drag: null, running: false, last: performance.now(), waveT: 1.5 };
        c.addEventListener('pointerdown', (e) => { C.prev.drag = e.clientX; c.setPointerCapture(e.pointerId); });
        c.addEventListener('pointermove', (e) => { if (C.prev.drag != null) { C.prev.yaw += (e.clientX - C.prev.drag) * 0.012; C.prev.drag = e.clientX; } });
        c.addEventListener('pointerup', () => { C.prev.drag = null; });
      }
      const w = $('preview').clientWidth || 240; C.prev.r.setSize(w, w * 1.25, false);
      refresh();
      if (!C.prev.running) { C.prev.running = true; C.prev.last = performance.now(); requestAnimationFrame(loop); }
    } catch (e) { $('preview').style.display = 'none'; }
  }
  function refresh() {
    const p = C.prev; if (!p) return;
    if (p.ch) p.sc.remove(p.ch.root);
    p.ch = AL.Character.create(C.draft); p.sc.add(p.ch.root); p.ch.setState('wave'); p.waveT = 1.4;
  }
  function loop(now) {
    const p = C.prev;
    if ($('startOv').hidden) { p.running = false; return; }
    const dt = Math.min(0.05, (now - p.last) / 1000); p.last = now;
    if (p.drag == null && !AL.reduceMotion) p.yaw += dt * 0.35;
    if (p.ch) {
      p.waveT -= dt; if (p.waveT <= 0 && p.ch.state === 'wave') p.ch.setState('idle');
      p.ch.root.rotation.y = p.yaw; p.ch.update(dt, 0);
    }
    p.r.render(p.sc, p.cam); requestAnimationFrame(loop);
  }

  C.open = (edit) => {
    C.editing = !!edit;
    C.draft = AL.cleanLook(AL.S.look);
    $('pName').value = edit ? AL.S.name : ($('pName').value || ''); $('pAge').value = edit ? AL.S.age : ($('pAge').value || 25);
    $('ccTitle').textContent = edit ? 'Edit your character' : 'Create your character';
    $('ccIntro').hidden = !!edit;
    $('signupBtn').textContent = edit ? 'Save character' : 'Start my life in Abuja';
    $('ccCancel').hidden = !edit;
    buildOptions();
    $('startOv').hidden = false;
    requestAnimationFrame(startPreview);
  };
  C.bind = () => {
    $('ccCancel').onclick = () => { $('startOv').hidden = true; };
    $('startForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = $('signupBtn'); btn.disabled = true;
      const nm = AL.cleanName($('pName').value.trim() || 'Hustler');
      if (C.editing) {
        AL.S.name = nm; AL.S.look = AL.cleanLook(C.draft); AL.S.age = AL.clamp(parseInt($('pAge').value, 10) || AL.S.age, 18, 65);
        if (!AL.S.wardrobe.includes(AL.S.look.outfit)) AL.S.wardrobe.push(AL.S.look.outfit);
        AL.log('Changed your look.'); AL.Player.rebuild(); AL.commit();
        $('startOv').hidden = true; btn.disabled = false; AL.toast('Character saved.', 'good'); return;
      }
      btn.textContent = 'Arriving…';
      await AL.ready;
      AL.S = AL.fresh(); AL.S.name = nm; AL.S.look = AL.cleanLook(C.draft); AL.S.started = true;
      AL.S.age = AL.clamp(parseInt($('pAge').value, 10) || 25, 18, 65); AL.S.wardrobe = [AL.S.look.outfit];
      AL.log('Welcome to Abuja, ' + AL.S.name + '. Check your phone: Maps, Jobs and Rides will get you started.');
      AL.emit('new-player');
      $('startOv').hidden = true; btn.disabled = false;
    });
  };
  AL.Creator = C;
})(window.AL);
