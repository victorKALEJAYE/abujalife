/* Abuja Life — heads-up display: money, bars, clock, location, notices,
   interaction prompt, activity/trip bars, touch joystick and buttons. */
(function (AL) {
  'use strict';
  const $ = AL.$;
  const HUD = {};
  const ICONS = {
    morning: '<svg viewBox="0 0 24 24" fill="none" stroke="#f2b33d" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="13" r="4"/><path d="M12 3v2M4.9 6.9l1.4 1.4M19.1 6.9l-1.4 1.4M2 17h20M5 21h14"/></svg>',
    afternoon: '<svg viewBox="0 0 24 24" fill="none" stroke="#f2b33d" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4.5"/><path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8"/></svg>',
    evening: '<svg viewBox="0 0 24 24" fill="none" stroke="#f2885a" stroke-width="2" stroke-linecap="round"><path d="M7 16a5 5 0 0 1 10 0M12 6v3M4.6 10.6l1.8 1.4M19.4 10.6l-1.8 1.4M2 19h20"/></svg>',
    night: '<svg viewBox="0 0 24 24" fill="none" stroke="#9fc4ff" stroke-width="2" stroke-linejoin="round"><path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/></svg>',
  };
  const PHASE_NAME = { morning: 'Morning', afternoon: 'Afternoon', evening: 'Evening', night: 'Night' };

  /* ---- notices ---- */
  AL.toast = (msg, kind) => {
    const box = $('notices'); if (!box) return;
    const n = document.createElement('div'); n.className = 'notice' + (kind ? ' ' + kind : ''); n.textContent = msg;
    box.appendChild(n);
    while (box.children.length > 3) box.removeChild(box.firstChild);
    setTimeout(() => { if (n.parentNode) n.parentNode.removeChild(n); }, 2800);
  };

  /* ---- stats ---- */
  let lastPhase = '';
  HUD.render = () => {
    const S = AL.S;
    $('hCash').textContent = AL.fmt(S.cash);
    $('hBank').textContent = AL.fmt(S.savings);
    $('hName').textContent = AL.cleanName(S.name);
    $('hAvatar').textContent = AL.cleanName(S.name).charAt(0).toUpperCase();
    const top = Object.entries(S.jobXp).sort((a, b) => b[1] - a[1])[0];
    const job = top ? AL.JOBS.find((j) => j.id === top[0]) : null;
    $('hRole').textContent = job ? job.name : 'New in Abuja';
    $('hEnergy').textContent = Math.round(S.energy);
    $('eFill').style.width = S.energy + '%';
    $('eTrack').classList.toggle('low', S.energy < 25);
    $('hXp').textContent = S.xp;
    $('hMood').textContent = Math.round(S.happy); $('mFill').style.width = S.happy + '%'; $('mTrack').classList.toggle('low', S.happy < 25);
    $('xFill').style.width = Math.min(100, (S.xp / 45) * 100) + '%';
    $('hTime').textContent = AL.clock();
    const ph = AL.phase();
    $('hDay').textContent = 'Day ' + AL.day() + ' · ' + PHASE_NAME[ph];
    if (ph !== lastPhase) { $('hPhaseIcon').innerHTML = ICONS[ph]; lastPhase = ph; }
    const d = AL.Player && AL.Player.lastDistrict;
    $('hPlace').textContent = d ? AL.D[d].name : (AL.Player && AL.Player.trip ? 'On the road' : 'Abuja');
    const pt = $('phTime'); if (pt) pt.textContent = AL.clock();
  };
  AL.on('change', HUD.render);

  /* ---- district banner ---- */
  let bannerT;
  function banner(name, tag) {
    $('bannerName').textContent = name; $('bannerTag').textContent = tag || '';
    $('banner').classList.add('show'); clearTimeout(bannerT);
    bannerT = setTimeout(() => $('banner').classList.remove('show'), 2600);
  }
  AL.on('district', (k) => { if (k) banner(AL.D[k].name, AL.D[k].tag); HUD.render(); });
  AL.on('phase', (ph) => {
    const msg = { morning: 'Good morning, Abuja. Banks and offices open soon.', afternoon: 'Afternoon. The city is busy.', evening: 'Evening. Offices are closing and the suya spots are lighting up.', night: 'Night has fallen. Most places are closed; get home safe.' }[ph];
    AL.toast(msg);
  });

  /* ---- interaction prompt ---- */
  let promptItem = null;
  function showPrompt(it) {
    promptItem = it;
    const el = $('prompt');
    if (!it || AL.busy) { el.hidden = true; return; }
    const ok = it.enabled ? it.enabled() : true;
    $('promptKey').textContent = AL.TOUCH ? 'TAP' : 'E';
    $('promptVerb').textContent = typeof it.verb === 'function' ? it.verb() : it.verb;
    const title = it.title ? it.title() : '';
    const sub = ok === true ? (it.sub ? it.sub() : '') : ok;
    $('promptSub').textContent = [title, sub].filter(Boolean).join(' · ');
    el.classList.toggle('off', ok !== true);
    el.hidden = false;
  }
  AL.on('prompt', showPrompt);
  AL.on('hour', () => { if (promptItem) showPrompt(promptItem); });
  AL.on('change', () => { if (promptItem) showPrompt(promptItem); });

  /* ---- activity + trip bars ---- */
  let act = null;
  AL.on('activity-start', (a) => { act = a; $('activityLabel').textContent = a.label || ''; $('activity').hidden = false; $('prompt').hidden = true; });
  AL.on('activity-end', () => { act = null; $('activity').hidden = true; });
  AL.on('trip-start', ({ to, loc }) => { $('tripLabel').textContent = 'On the way to ' + (loc ? loc.name : AL.D[to].name) + '…'; $('tripBar').hidden = false; $('prompt').hidden = true; HUD.render(); });
  AL.on('trip-end', ({ to, loc }) => { $('tripBar').hidden = true; banner(loc ? loc.name : AL.D[to].name, AL.D[to].name + ' · ' + AL.clock()); });
  AL.on('fade', () => { const f = $('fade'); f.classList.add('on'); setTimeout(() => f.classList.remove('on'), 700); });
  AL.on('fade-in', () => { $('fade').classList.add('on'); });

  HUD.tick = (t) => {
    if (act) { const p = 1 - Math.max(0, act.left) / (act.total || 1); $('activityFill').style.width = Math.round(p * 100) + '%'; }
    const n = AL.Travel && AL.Travel.Nav.tick(t || 0);
    const chip = $('navChip');
    if (!n || AL.busy) { chip.hidden = true; return; }
    chip.hidden = false;
    $('navArrow').style.transform = 'rotate(' + (-n.rel) + 'rad)';
    $('navName').textContent = n.loc.name;
    const km = n.dist / AL.W * AL.KM_PER_UNIT;
    $('navDist').textContent = AL.Travel.fmtKm(km) + ' · ' + AL.Travel.fmtMin(km / 5 * 60) + ' walk';
  };

  /* ---- buttons and touch controls ---- */
  HUD.bind = () => {
    if (AL.TOUCH) document.body.classList.add('touch');
    $('prompt').addEventListener('click', () => AL.Interact.use());
    $('prompt').addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); AL.Interact.use(); } });
    $('useBtn').addEventListener('click', () => AL.Interact.use());
    $('skipTrip').addEventListener('click', () => AL.Player.skipTrip());
    $('runBtn').addEventListener('click', () => { const P = AL.Player; P.runToggle = !P.runToggle; $('runBtn').setAttribute('aria-pressed', String(P.runToggle)); });
    $('mapBtn').addEventListener('click', () => AL.emit('toggle-map'));
    $('phoneBtn').addEventListener('click', () => AL.emit('toggle-phone'));
    $('navStop').addEventListener('click', () => AL.Travel.Nav.clear(false));
    // joystick
    const js = $('joystick'), knob = $('knob');
    let id = null, cx = 0, cy = 0;
    const R = 50;
    js.addEventListener('pointerdown', (e) => { id = e.pointerId; js.setPointerCapture(id); const r = js.getBoundingClientRect(); cx = r.left + r.width / 2; cy = r.top + r.height / 2; move(e); });
    js.addEventListener('pointermove', (e) => { if (e.pointerId === id) move(e); });
    const end = (e) => { if (e.pointerId !== id) return; id = null; knob.style.transform = ''; AL.Player.joy.active = false; AL.Player.joy.x = AL.Player.joy.y = 0; };
    js.addEventListener('pointerup', end); js.addEventListener('pointercancel', end);
    function move(e) {
      let dx = e.clientX - cx, dy = e.clientY - cy; const d = Math.hypot(dx, dy);
      if (d > R) { dx = (dx / d) * R; dy = (dy / d) * R; }
      knob.style.transform = 'translate(' + dx + 'px,' + dy + 'px)';
      const j = AL.Player.joy; j.active = true; j.x = dx / R; j.y = -dy / R;
    }
  };
  AL.on('mapview', (on) => { $('mapBtn').setAttribute('aria-pressed', String(on)); });
  AL.HUD = HUD;
})(window.AL);
