/* Abuja Life — action card: a small in-world popup for things you do at a
   shelf, desk, counter or car ("Buy ₦9,000", "Test drive", "Apply").
   Numbers 1–6 pick an action; Esc or walking away closes it.
     AL.Card.show({ title, sub, lines: [[label, value]], note, actions: [{ label, sub, fn, primary, disabled, keep }] })
   An action closes the card unless it sets keep: true (then the card re-renders). */
(function (AL) {
  'use strict';
  const $ = AL.$;
  const C = { open: null };
  function render() {
    const o = C.open; if (!o) return;
    const spec = typeof o.spec === 'function' ? o.spec() : o.spec;
    $('acTitle').textContent = spec.title || '';
    $('acSub').textContent = spec.sub || '';
    const body = $('acBody'); body.innerHTML = '';
    if (spec.lines && spec.lines.length) body.appendChild(AL.UI.stats(spec.lines));
    if (spec.note) { const p = document.createElement('p'); p.className = 'note'; p.textContent = spec.note; body.appendChild(p); }
    if (spec.html) { const d = document.createElement('div'); d.innerHTML = spec.html; body.appendChild(d); }
    const btns = $('acBtns'); btns.innerHTML = '';
    o.actions = spec.actions || [];
    o.actions.forEach((a, i) => {
      const b = document.createElement('button'); b.type = 'button';
      b.className = 'btn' + (a.primary ? ' primary' : '') + (a.sub ? ' two' : '');
      b.disabled = !!a.disabled;
      b.innerHTML = '<kbd></kbd><span><b></b><small></small></span>';
      b.querySelector('kbd').textContent = String(i + 1);
      b.querySelector('b').textContent = a.label; b.querySelector('small').textContent = a.sub || '';
      b.onclick = () => pick(i);
      btns.appendChild(b);
    });
  }
  function pick(i) {
    const o = C.open; if (!o) return;
    const a = o.actions[i]; if (!a || a.disabled) return;
    a.fn && a.fn();
    if (C.open !== o) return;        // the action opened another card
    if (a.keep) render(); else C.hide();
  }
  /* spec can be an object or a function that returns one (re-evaluated on every change) */
  C.show = (spec) => {
    const P = AL.Player.pos;
    const prev = C.open; C.open = null; if (prev && prev.onClose) prev.onClose();
    C.open = { spec, at: { x: P.x, z: P.z }, actions: [], onClose: (typeof spec === 'function' ? spec() : spec).onClose };
    AL.UI.closeSheet && AL.UI.closeSheet();
    render(); $('actCard').hidden = false;
  };
  C.hide = () => { const o = C.open; C.open = null; $('actCard').hidden = true; if (o && o.onClose) o.onClose(); };
  C.isOpen = () => !!C.open;
  C.refresh = render;
  C.tick = () => {
    const o = C.open; if (!o) return;
    const P = AL.Player.pos;
    if (Math.hypot(P.x - o.at.x, P.z - o.at.z) > 4.5) C.hide();
  };
  AL.on('change', () => { if (C.open) render(); });
  window.addEventListener('keydown', (e) => {
    if (!C.open || (e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName))) return;
    const n = parseInt(e.key, 10);
    if (n >= 1 && n <= 9) { e.preventDefault(); pick(n - 1); }
  });
  AL.Card = C;
})(window.AL);
