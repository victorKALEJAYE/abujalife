/* Abuja Life — work minigame. Every shift is a short round of real decisions:
   a request appears, you pick the matching action (click, 1–4 or A S D F)
   before the timer runs out. Your performance % scales the pay.
   WORK STARTED → minigame → Performance 91% → salary paid. */
(function (AL) {
  'use strict';
  const $ = AL.$;
  const Wk = { on: null };
  const KEYS = ['a', 's', 'd', 'f'];

  Wk.play = ({ title, sub, game, rounds = 8, onDone }) => {
    const opts = AL.WORK_GAMES[game] || AL.WORK_GAMES.interact;
    Wk.on = { opts, rounds, i: 0, score: 0, hits: 0, onDone, t: 0, limit: 3.4, cur: -1, done: false, wait: 0.6 };
    $('wkTitle').textContent = 'WORK STARTED'; $('wkSub').textContent = title + (sub ? ' · ' + sub : '');
    $('wkResult').hidden = true; $('wkPlay').hidden = false;
    const box = $('wkOpts'); box.innerHTML = '';
    opts.forEach(([label], k) => {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'btn wkopt';
      b.innerHTML = '<kbd></kbd><b></b>'; b.querySelector('kbd').textContent = KEYS[k].toUpperCase(); b.querySelector('b').textContent = label;
      b.onclick = () => answer(k); box.appendChild(b);
    });
    $('wkReq').textContent = 'Get ready…'; $('wkProg').textContent = '';
    $('workOv').hidden = false; AL.busy = true;
    AL.Player.char.setState('work');
    last = performance.now(); requestAnimationFrame(tick);
  };
  function next() {
    const w = Wk.on; w.i += 1;
    if (w.i > w.rounds) return finish();
    let c; do { c = Math.floor(Math.random() * w.opts.length); } while (c === w.cur && w.opts.length > 1);
    w.cur = c; w.t = 0; w.limit = Math.max(1.9, 3.4 - w.i * 0.14); w.answered = false;
    $('wkReq').textContent = w.opts[c][1];
    $('wkProg').textContent = 'Task ' + w.i + ' of ' + w.rounds + ' · score ' + Math.round((w.score / Math.max(1, w.i - 1)) * 100) + '%';
    [...$('wkOpts').children].forEach((b) => b.classList.remove('ok', 'bad'));
  }
  function answer(k) {
    const w = Wk.on; if (!w || w.done || w.answered || w.cur < 0) return;
    w.answered = true;
    const btn = $('wkOpts').children[k];
    if (k === w.cur) { w.score += 0.6 + 0.4 * Math.max(0, 1 - w.t / w.limit); w.hits += 1; btn.classList.add('ok'); }
    else { btn.classList.add('bad'); $('wkOpts').children[w.cur].classList.add('ok'); }
    w.wait = 0.45;
  }
  let last = 0;
  function tick(now) {
    const w = Wk.on; if (!w || w.done) return;
    const dt = Math.min(0.1, (now - last) / 1000); last = now;
    if (w.wait > 0) { w.wait -= dt; if (w.wait <= 0) next(); }
    else if (!w.answered) {
      w.t += dt;
      $('wkFill').style.width = Math.max(0, 100 - (w.t / w.limit) * 100) + '%';
      if (w.t >= w.limit) { w.answered = true; $('wkOpts').children[w.cur].classList.add('ok'); w.wait = 0.45; }
    }
    if (!w.done) requestAnimationFrame(tick);
  }
  function finish() {
    const w = Wk.on; w.done = true;
    const perf = Math.max(0, Math.min(1, w.score / w.rounds));
    w.perf = perf;
    $('wkPlay').hidden = true; $('wkResult').hidden = false;
    $('wkTitle').textContent = 'SHIFT COMPLETE';
    $('wkPerf').textContent = Math.round(perf * 100) + '%';
    $('wkGrade').textContent = perf >= 0.9 ? 'Excellent work. Your manager noticed.' : perf >= 0.7 ? 'Solid shift.' : perf >= 0.45 ? 'An average day. Pay is reduced a little.' : 'A rough shift. Pay is reduced.';
    $('wkHits').textContent = w.hits + ' of ' + w.rounds + ' tasks right';
    $('wkCollect').focus();
  }
  function collect() {
    const w = Wk.on; if (!w || !w.done) return;
    Wk.on = null; $('workOv').hidden = true; AL.busy = false;
    AL.Player.char.setState('idle');
    if (w.onDone) w.onDone(w.perf);
  }
  Wk.pay = (perf) => 0.7 + 0.5 * (perf == null ? 0.6 : perf); // 60% → normal pay, 100% → +20%

  /* entry points used by venues, interiors and the Jobs app */
  Wk.shift = () => {
    const c = AL.Life.career(); if (!c) return AL.toast('You do not have a salaried job yet.');
    const ok = AL.Life.canWork(c); if (ok !== true) return AL.toast(ok);
    AL.Card && AL.Card.hide();
    Wk.play({ title: c.title, sub: c.employer, game: c.id, onDone: (p) => AL.Life.workShift(p) });
  };
  Wk.gig = (j) => {
    const s = AL.S;
    if (!AL.isOpen(j.hours)) return AL.toast(j.name + ' shifts run ' + AL.hoursText(j.hours).replace('Open ', '') + '.');
    if (s.xp < j.req) return AL.toast('You need ' + j.req + ' hustle points for this job.');
    if (s.energy < j.en) return AL.toast('Too tired. Eat something or sleep.');
    Wk.play({ title: j.name, sub: AL.D[j.at].name, game: j.anim || 'work', rounds: 6, onDone: (p) => AL.Econ.work(j, p) });
  };
  Wk.bind = () => {
    $('wkCollect').onclick = collect;
    window.addEventListener('keydown', (e) => {
      const w = Wk.on; if (!w) return;
      const k = e.key.toLowerCase();
      if (w.done) { if (k === 'enter' || k === 'e' || k === ' ') { e.preventDefault(); collect(); } return; }
      const i = KEYS.indexOf(k) >= 0 ? KEYS.indexOf(k) : ['1', '2', '3', '4'].indexOf(k);
      if (i >= 0) { e.preventDefault(); e.stopPropagation(); answer(i); }
    }, true);
  };
  Wk.isOpen = () => !!Wk.on;
  AL.Work = Wk;
})(window.AL);
