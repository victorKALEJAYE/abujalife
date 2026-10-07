/* Abuja Life — time system. The clock now runs on its own: one real second is
   one game minute (a full day is 24 real minutes). Actions such as working or
   sleeping still jump the clock forward. Other systems listen for the
   'hour' and 'phase' events instead of polling. */
(function (AL) {
  'use strict';
  const Time = {
    hoursPerSecond: 1 / 60,
    paused: false,
    drainPerHour: 1.6, // energy lost per game hour just from being awake
    lastHour: null, lastPhase: null,
  };
  Time.update = (dt) => {
    const S = AL.S;
    if (Time.paused || !S.started || AL.busy) return;
    S.t += dt * Time.hoursPerSecond;
    S.energy = Math.max(0, S.energy - dt * Time.hoursPerSecond * Time.drainPerHour);
    const h = Math.floor(AL.hour());
    if (h !== Time.lastHour) { const first = Time.lastHour === null; Time.lastHour = h; if (!first) AL.emit('hour', h); }
    const ph = AL.phase();
    if (ph !== Time.lastPhase) { const first = Time.lastPhase === null; Time.lastPhase = ph; if (!first) AL.emit('phase', ph); }
    Time.checkDay();
    if (S.energy <= 0 && !Time.collapsing) { Time.collapsing = true; AL.emit('exhausted'); setTimeout(() => { Time.collapsing = false; }, 3000); }
  };
  /* fire 'newday' once for every day boundary crossed (06:00), however the clock moved */
  Time.checkDay = () => {
    const S = AL.S; if (!S.started) return;
    const d = AL.day();
    if (!S.lastDay) S.lastDay = d;
    if (d > S.lastDay) { const n = d - S.lastDay; S.lastDay = d; AL.emit('newday', n); }
  };
  AL.on('change', () => Time.checkDay());
  /* 0 at midnight, 1 at noon: how bright the sun is */
  Time.sunUp = () => Math.max(0, Math.sin(((AL.hour() - 6) / 12) * Math.PI));
  AL.Time = Time;
})(window.AL);
