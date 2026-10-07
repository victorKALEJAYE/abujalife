/* Abuja Life — the journey card: finding a driver, boarding, then watching
   the ride or skipping it with a short travel transition. The clock always
   advances by the trip time, so travel never feels like teleporting. */
(function (AL) {
  'use strict';
  const $ = AL.$;
  const J = { active: null };
  const DRIVERS = ['Musa A.', 'Chinedu O.', 'Ibrahim S.', 'Tunde B.', 'Emeka N.', 'Yusuf D.', 'Femi K.', 'Danjuma I.'];
  const CARS = ['Silver Toyota Corolla', 'Grey Honda Accord', 'White Toyota Camry', 'Blue Kia Rio', 'Black Hyundai Elantra'];
  const plate = () => 'ABJ-' + (100 + Math.floor(Math.random() * 900)) + '-' + String.fromCharCode(65 + Math.floor(Math.random() * 26)) + String.fromCharCode(65 + Math.floor(Math.random() * 26));
  const wait = (ms) => new Promise((r) => setTimeout(r, AL.reduceMotion ? 50 : ms));

  function show(lines, buttons) {
    $('jTitle').textContent = lines.title; $('jStep').textContent = lines.step || ''; $('jInfo').textContent = lines.info || '';
    $('jBar').hidden = !lines.progress; $('jFill').style.width = (lines.progress || 0) * 100 + '%';
    const box = $('jBtns'); box.innerHTML = '';
    (buttons || []).forEach(([label, fn, primary]) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'btn' + (primary ? ' primary' : ''); b.textContent = label; b.onclick = fn; box.appendChild(b); });
    $('journey').hidden = false;
  }
  function hide() { $('journey').hidden = true; }

  AL.on('journey', async ({ loc, mode, q }) => {
    const T = AL.Travel, M = T.MODES[mode];
    AL.busy = true; AL.$('sheet').hidden = true;
    const from = AL.D[AL.City.districtAt(AL.Player.pos.x, AL.Player.pos.z).key].name;
    const title = (mode === 'ride' ? 'Ride' : M.name) + ' to ' + loc.name;
    const info = from + ' → ' + AL.D[loc.district].name + ' · ' + T.fmtKm(q.km) + ' · ' + T.fmtMin(q.mins) + ' · arrive ' + q.arrive + ' · ' + AL.fmt(q.cost) + ' paid';
    if (mode === 'ride') {
      show({ title, step: 'Finding a driver…', info });
      await wait(1300);
      const d = AL.pick(DRIVERS), car = AL.pick(CARS);
      show({ title, step: d + ' is on the way · ' + car + ' · ' + plate(), info });
      await wait(1500);
      show({ title, step: d + ' has arrived. Trip started.', info });
    } else {
      show({ title, step: mode === 'bus' ? 'Boarding the bus… it stops a few times on the way.' : 'Getting into the taxi…', info });
      await wait(1100);
      show({ title, step: 'Trip started.', info });
    }
    show({ title, step: 'Trip started · estimated ' + T.fmtMin(q.mins), info }, [
      ['Watch trip', () => { hide(); AL.Player.watchTrip(loc, q, mode, () => { AL.Travel.complete(loc, q); AL.busy = false; }); }, false],
      ['Skip', () => skip(loc, q, title), true],
    ]);
  });

  async function skip(loc, q, title) {
    const start = AL.S.t, dur = AL.reduceMotion ? 300 : 2200, t0 = performance.now();
    AL.emit('fade-in');
    await new Promise((res) => {
      (function step() {
        const f = Math.min(1, (performance.now() - t0) / dur);
        AL.S.t = start + (q.mins / 60) * f;
        show({ title, step: 'On the way… ' + AL.clock(), info: AL.Travel.fmtKm(q.km * (1 - f)) + ' to go', progress: f });
        if (f < 1) requestAnimationFrame(step); else res();
      })();
    });
    AL.S.t = start + q.mins / 60;
    AL.Player.arriveAt(loc);
    hide(); AL.emit('fade');
    AL.Travel.complete(loc, q);
    AL.busy = false;
    AL.toast('Arrived at ' + loc.name + ' · ' + AL.clock(), 'good');
    AL.emit('trip-end', { to: loc.district, loc });
  }
  AL.Journey = J;
})(window.AL);
