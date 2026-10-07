/* Abuja Life — reusable interaction system.
   Anything the player can use registers an interactable:
     AL.Interact.add({
       id, pos: {x, z} or getPos(): {x, z},   // world metres
       r: 3,                                   // reach radius
       verb: () => 'ENTER BANK',               // prompt text
       title: () => 'Capital Trust Bank',      // what it is
       sub: () => 'Open 08:00–16:00',          // extra line
       enabled: () => true | 'reason it is unavailable',
       use: () => { ... }
     })
   The player module calls update() every frame; the HUD shows the prompt. */
(function (AL) {
  'use strict';
  const I = { items: new Map(), current: null };
  I.add = (item) => { item.r = item.r || 3; I.items.set(item.id, item); return item; };
  I.remove = (id) => { I.items.delete(id); if (I.current && I.current.id === id) { I.current = null; AL.emit('prompt', null); } };
  I.has = (id) => I.items.has(id);
  const posOf = (it) => (it.getPos ? it.getPos() : it.pos);
  I.update = (px, pz, facing) => {
    let best = null, bestScore = 1e9;
    I.items.forEach((it) => {
      if (it.hidden && it.hidden()) return;
      const p = posOf(it); if (!p) return;
      const dx = p.x - px, dz = p.z - pz, d = Math.hypot(dx, dz);
      if (d > it.r) return;
      // prefer things in front of the player
      const front = d > 0.01 ? (dx * Math.sin(facing) + dz * Math.cos(facing)) / d : 1;
      const score = d - front * 0.8 - (it.priority || 0);
      if (score < bestScore) { bestScore = score; best = it; }
    });
    if (best !== I.current) { I.current = best; AL.emit('prompt', best); }
  };
  I.refresh = () => AL.emit('prompt', I.current);
  I.use = () => {
    const it = I.current; if (!it || AL.busy) return;
    const ok = it.enabled ? it.enabled() : true;
    if (ok !== true) { AL.toast(ok || 'Not available right now.'); return; }
    it.use();
  };
  AL.Interact = I;
})(window.AL);
