/* Abuja Life — core helpers shared by every module.
   Every module attaches itself to the single global namespace `AL`. */
window.AL = window.AL || {};
(function (AL) {
  'use strict';
  AL.T = window.THREE || null;
  AL.W = 3; // world scale: 1 map unit = 3 metres. Map data stays in map units.

  AL.$ = (id) => document.getElementById(id);
  AL.fmt = (n) => '₦' + Math.round(n).toLocaleString('en-NG');
  AL.pad = (n) => String(n).padStart(2, '0');
  AL.clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  AL.lerp = (a, b, t) => a + (b - a) * t;
  AL.damp = (a, b, rate, dt) => a + (b - a) * (1 - Math.exp(-rate * dt));
  AL.angleDamp = (a, b, rate, dt) => {
    let d = b - a;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    return a + d * (1 - Math.exp(-rate * dt));
  };
  AL.rand = function (seed) {
    return function () {
      seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };
  AL.pick = (arr, r = Math.random) => arr[Math.floor(r() * arr.length)];
  AL.cleanText = (s, n) => String(s || '').replace(/[\u0000-\u001f]/g, '').slice(0, n);

  /* tiny event bus: modules talk through events instead of calling each other directly */
  const handlers = {};
  AL.on = (name, fn) => { (handlers[name] = handlers[name] || []).push(fn); };
  AL.emit = (name, ...args) => {
    (handlers[name] || []).forEach((fn) => {
      try { fn(...args); } catch (e) { console.error('[AL] handler for ' + name + ' failed', e); }
    });
  };

  AL.reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  AL.TOUCH = ('ontouchstart' in window) || (navigator.maxTouchPoints || 0) > 0;
  AL.LITE = window.innerWidth < 860 || AL.TOUCH || /Mobi|Android/i.test(navigator.userAgent || '');

  /* surface unexpected errors in the game instead of failing silently */
  AL.errors = [];
  window.addEventListener('error', (e) => {
    AL.errors.push(String(e.message || e));
    if (AL.toast && AL.errors.length <= 3) AL.toast('Something went wrong: ' + String(e.message || e).slice(0, 90));
  });

  /* map units -> world metres */
  AL.toWorld = (x, z) => ({ x: x * AL.W, z: z * AL.W });
})(window.AL);
