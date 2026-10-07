/* Abuja Life — boot and main loop. Wires the systems together; the systems
   themselves live in their own modules. */
(function (AL) {
  'use strict';
  const T = AL.T, $ = AL.$;
  if (!T) {
    const m = document.createElement('div'); m.className = 'nogl';
    m.textContent = 'The 3D engine could not load. Check your connection and reload the page.';
    $('game').appendChild(m); $('loading').classList.add('done');
    return;
  }
  let renderer, scene, camera, hemi, sun;
  const sky = { day: new T.Color('#9fd3f0'), dusk: new T.Color('#f2a65a'), night: new T.Color('#0d1a33'), cur: new T.Color() };

  function init() {
    try {
      renderer = new T.WebGLRenderer({ canvas: $('scene'), antialias: !AL.LITE, powerPreference: 'high-performance' });
    } catch (e) {
      const m = document.createElement('div'); m.className = 'nogl'; m.textContent = '3D could not start on this device (WebGL is unavailable).';
      $('game').appendChild(m); $('loading').classList.add('done'); return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, AL.LITE ? 1.5 : 2));
    renderer.shadowMap.enabled = !AL.LITE; renderer.shadowMap.type = T.PCFSoftShadowMap;
    scene = new T.Scene(); scene.fog = new T.Fog(0x9fd3f0, 220, 900);
    camera = new T.PerspectiveCamera(55, 1, 0.1, 3500);
    AL.scene = scene; AL.camera = camera; AL.renderer = renderer;
    hemi = new T.HemisphereLight(0xdfefff, 0x6b7a4a, 0.75); scene.add(hemi);
    sun = new T.DirectionalLight(0xfff1d6, 0.9); sun.castShadow = !AL.LITE;
    sun.shadow.mapSize.set(2048, 2048);
    Object.assign(sun.shadow.camera, { left: -70, right: 70, top: 70, bottom: -70, near: 1, far: 420 });
    sun.shadow.bias = -0.0006;
    scene.add(sun); scene.add(sun.target);
    new ResizeObserver(resize).observe($('game')); resize();

    AL.HUD.bind(); AL.UI.bind(); AL.Phone.bind(); AL.Creator.bind(); AL.Home.bind();
    $('loadingNote').textContent = 'Building Abuja…';
    AL.City.build(scene, onCityReady);
    requestAnimationFrame(loop);
  }
  function resize() {
    const w = $('game').clientWidth, h = $('game').clientHeight; if (!w || !h) return;
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
  }

  function onCityReady() {
    AL.Player.init(scene);
    AL.UI.registerVenues();
    AL.NPC.spawn(scene, AL.LITE ? 14 : 30);
    $('loading').classList.add('done');
    AL.ready.then(() => {
      if (!AL.S.started) { AL.Creator.open(false); }
      else startPlaying(false);
    });
  }
  function startPlaying(fresh) {
    $('hud').hidden = false;
    AL.Player.rebuild();
    const sp = AL.Player.spawnPoint();
    AL.Player.place(sp.x, sp.z, Math.PI);
    AL.NPC.syncOthers();
    AL.HUD.render();
    if (!fresh) AL.toast('Welcome back, ' + AL.cleanName(AL.S.name) + '.');
    AL.started = true;
  }
  AL.on('new-player', () => {
    AL.S.pos = null; AL.commit(); startPlaying(true);
    AL.toast('Welcome to Abuja! Walk to the glowing kiosks and press E.', 'good');
  });
  AL.on('loaded', () => { if (AL.started) startPlaying(false); });
  AL.on('new-game', () => {
    const n = AL.S.name, lk = AL.S.look;
    AL.S = AL.fresh(); AL.S.name = n; AL.S.look = AL.cleanLook(lk); AL.S.started = !!n;
    AL.commit(); startPlaying(true); AL.toast('A new life begins at Area 1 motor park.', 'good');
  });
  AL.on('exhausted', () => { if (AL.S.started && !AL.busy) AL.Econ.sleep({ collapsed: true }); });
  AL.on('toggle-map', () => { if (AL.Player.trip) return; AL.Player.setMapView(!AL.Player.cam.mapView); });
  AL.on('map-pick', (k) => AL.Phone.mapSelect(k));
  AL.on('others', () => AL.NPC.syncOthers());

  /* ---- day / night ---- */
  function updateSky() {
    const h = AL.hour();
    const up = Math.max(0, Math.sin(((h - 6) / 12) * Math.PI));
    if (up > 0.25) sky.cur.copy(sky.dusk).lerp(sky.day, Math.min(1, (up - 0.25) / 0.35));
    else sky.cur.copy(sky.night).lerp(sky.dusk, up / 0.25);
    scene.background = sky.cur; scene.fog.color.copy(sky.cur);
    const map = AL.Player && AL.Player.cam.mapView;
    scene.fog.near = map ? 900 : 220; scene.fog.far = map ? 3000 : 900;
    hemi.intensity = 0.25 + 0.55 * up; sun.intensity = 0.06 + 0.95 * up;
    const p = AL.Player && AL.Player.pos ? AL.Player.pos : { x: 0, z: 0 };
    const ang = ((h - 6) / 12) * Math.PI;
    sun.position.set(p.x + Math.cos(ang) * 120, 40 + Math.max(0, Math.sin(ang)) * 160, p.z + 60);
    sun.target.position.set(p.x, 0, p.z);
    const night = up < 0.3;
    AL.Kit.windowMat.emissiveIntensity = night ? 0.9 : 0;
    AL.Kit.lampMat.emissiveIntensity = night ? 1 : 0;
  }

  /* ---- main loop ---- */
  let last = performance.now(), hudT = 0;
  function loop(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (AL.City.ready && AL.Player.char) {
      if (AL.started) AL.Time.update(dt);
      AL.Player.update(dt);
      AL.NPC.update(dt, AL.Player.pos);
      AL.City.updateTraffic(dt, AL.Player.pos);
      AL.NPC.animateOthers(dt);
      AL.HUD.tick(); AL.UI.tick(); AL.UI.tickTalk();
      hudT += dt; if (hudT > 0.25 && AL.started) { hudT = 0; AL.HUD.render(); }
      updateSky();
    } else if (camera) {
      // gentle fly-over while the city builds
      const t = now / 1000; camera.position.set(Math.sin(t * 0.1) * 420, 260, Math.cos(t * 0.1) * 420); camera.lookAt(0, 0, 0);
      if (scene) { scene.background = sky.day; }
    }
    if (renderer) renderer.render(scene, camera);
    requestAnimationFrame(loop);
  }
  window.claude?.hot?.snapshot?.(() => AL.S);
  init();
})(window.AL);
