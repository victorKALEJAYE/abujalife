/* Abuja Life — your home as a walk-in place. The room is built from your
   home's interior template (size and quality), your furniture and wall
   paint: bed, sofa, TV, kitchen, bathroom, wardrobe and storage.
   The wardrobe opens the existing home manager (clothes, paint, furniture shop). */
(function (AL) {
  'use strict';
  const T = AL.T;
  if (!T) return;
  const IN = AL.Interior, K = AL.Kit, fmt = AL.fmt;
  const S = () => AL.S;
  const act = (anim, secs, label) => AL.emit('activity', { anim, secs, label });

  function kitchenCard() {
    AL.Card.show(() => {
      const s = S(), food = Object.entries(s.inv).map(([id, n]) => ({ it: AL.SHOP_ITEMS.find((x) => x.id === id), n })).filter((x) => x.it);
      return {
        title: 'Kitchen', sub: food.length ? 'Cook something from your fridge' : 'Your fridge is empty',
        note: food.length ? '' : 'Buy groceries at a supermarket (Kubwa Value Mart, Grand Square in Gwarinpa) or order on ShopNaija.',
        actions: food.slice(0, 6).map(({ it, n }) => ({ label: 'Cook ' + it.name.toLowerCase(), sub: '+' + it.food + ' energy · ' + n + ' left', disabled: s.energy >= 100, fn: () => { AL.Life.eatHome(it.id); act('eat', 2.2, 'Cooking and eating ' + it.name.toLowerCase() + '…'); } })),
      };
    });
  }
  function storageCard() {
    AL.Card.show(() => {
      const s = S();
      const accs = s.items.filter((id) => AL.ACC[id]);
      const things = s.items.filter((id) => !AL.ACC[id]).map((id) => (AL.SHOP_ITEMS.find((x) => x.id === id) || {}).name).filter(Boolean);
      const counts = {}; things.forEach((n) => { counts[n] = (counts[n] || 0) + 1; });
      return {
        title: 'Storage', sub: things.length + ' things · ' + accs.length + ' accessories',
        lines: Object.entries(counts).slice(0, 6).map(([n, c]) => [n, '× ' + c]),
        note: accs.length ? 'Accessories: put them on or take them off.' : 'Accessories you buy in fashion stores show up here.',
        actions: accs.slice(0, 6).map((id) => { const it = AL.SHOP_ITEMS.find((x) => x.id === id); const on = AL.Life.wearing(id); return { label: (on ? 'Take off ' : 'Put on ') + it.name.toLowerCase(), sub: AL.ACC_SLOTS[AL.ACC[id].slot], keep: true, fn: () => AL.Life.equip(id, !on) }; }),
      };
    });
  }

  IN.define('home', {
    signature: () => { const r = AL.residence(); return r ? r.id + '|' + r.tpl + '|' + S().furn.join(',') + '|' + S().wall : 'none'; },
    build(ctx) {
      const r = AL.residence(); if (!r) { ctx.room({ w: 8, d: 7 }); return; }
      const has = (id) => S().furn.includes(id);
      const w = Math.round(r.T.size[0] * 1.3 * 10) / 10, d = Math.round(r.T.size[1] * 1.3 * 10) / 10, lux = r.T.stars >= 4;
      ctx.room({ w, d, h: 3.4, floor: r.T.floor, wall: S().wall, trim: lux ? '#c9a227' : null, door: 1.4 });
      for (let x = -w / 2 + 1.2; x < w / 2; x += 2.4) K.box(ctx.g, 1.0, 1.2, 0.05, '#9fd3f0', x, 1.2, -d / 2 + 0.03).castShadow = false; // windows
      // bedroom corner: back left
      const bx = -w / 2 + 1.5, bz = -d / 2 + 1.6;
      if (has('bed')) { ctx.box(2.0, 0.5, 2.3, '#6b4f33', bx, 0, bz); K.box(ctx.g, 1.9, 0.25, 2.1, '#f4f0e6', bx, 0.5, bz + 0.05); K.box(ctx.g, 1.9, 0.12, 1.2, lux ? '#7a3b2e' : '#2e6fd8', bx, 0.72, bz + 0.5); ctx.box(2.0, 1.2, 0.15, '#5b3b2a', bx, 0, bz - 1.15); }
      else if (has('mattress')) { K.box(ctx.g, 1.6, 0.35, 2.1, '#e8e2d4', bx, 0, bz); }
      else K.box(ctx.g, 1.3, 0.08, 2.0, '#b0a58f', bx, 0, bz);
      K.box(ctx.g, 0.9, 0.08, 0.5, '#ffffff', bx, has('bed') ? 0.75 : 0.36, bz - 0.75);
      ctx.spot({ x: bx + 1.4, z: bz, r: 1.8, verb: 'Sleep till morning', title: () => (has('bed') ? 'Bed' : has('mattress') ? 'Mattress' : 'Sleeping mat'), sub: () => 'Energy back to 100 · comfort ' + AL.comfort(),
        use: () => { AL.Econ.sleep(); AL.Life.mood(2 + r.T.stars); } });
      if (has('fan')) { ctx.box(0.4, 0.08, 0.4, '#333', bx + 1.5, 0, bz - 1, false); K.box(ctx.g, 0.08, 1.4, 0.08, '#ddd', bx + 1.5, 0, bz - 1); }
      if (has('ac')) K.box(ctx.g, 1.2, 0.4, 0.3, '#f7f7f7', bx, 2.6, -d / 2 + 0.2);
      // storage chest at the foot of the bed
      K.box(ctx.g, 1.0, 0.55, 0.55, '#8a6a3e', bx, 0, bz + 1.7);
      ctx.spot({ x: bx, z: bz + 2.6, r: 1.3, verb: 'Open storage', title: () => 'Storage chest', sub: () => S().items.length + ' things', use: storageCard });
      // wardrobe on the left wall
      ctx.box(0.7, 2.2, 1.6, lux ? '#3b2a1c' : '#7a5a3a', -w / 2 + 0.36, 0, 0.6);
      ctx.spot({ x: -w / 2 + 1.4, z: 0.6, r: 1.5, verb: 'Open wardrobe', title: () => 'Wardrobe & home', sub: () => S().wardrobe.length + ' outfits · paint · furniture shop', use: () => AL.Home.open() });
      // living area: back right
      const tx = w / 2 - 2.0, tz = -d / 2 + 0.5;
      if (has('tv')) { ctx.box(1.8, 0.5, 0.5, '#5b3b2a', tx, 0, tz); K.box(ctx.g, 1.7, 0.95, 0.07, '#111418', tx, 0.55, tz); const scr = new T.Mesh(K.BOX, new T.MeshBasicMaterial({ color: '#2a5d8a' })); scr.scale.set(1.55, 0.82, 0.02); scr.position.set(tx, 1.02, tz + 0.05); ctx.g.add(scr); let t = 0; ctx.tick((dt) => { t += dt; scr.material.color.setHSL(0.55 + Math.sin(t * 0.7) * 0.08, 0.5, 0.35 + Math.sin(t * 2.3) * 0.06); }); }
      else K.box(ctx.g, 0.4, 0.3, 0.25, '#3d4f63', tx, 0.0, tz);
      const sz = tz + 2.6;
      if (has('sofa')) { const g = new T.Group(); g.position.set(tx, 0, sz); g.rotation.y = Math.PI; ctx.g.add(g); K.box(g, 2.2, 0.45, 0.9, '#7a3b2e', 0, 0, 0); K.box(g, 2.2, 0.5, 0.22, '#7a3b2e', 0, 0.45, -0.35); ctx.solid(tx - 1.1, tx + 1.1, sz - 0.1, sz + 0.45, 1); }
      else { [-0.5, 0.5].forEach((o) => K.box(ctx.g, 0.5, 0.45, 0.5, '#e9e9e9', tx + o, 0, sz)); }
      if (has('art')) { K.box(ctx.g, 2.4, 0.02, 1.6, '#d1342f', tx, 0, sz - 1.2).castShadow = false; K.box(ctx.g, 1.0, 0.7, 0.05, '#0b7a4b', 0, 1.6, -d / 2 + 0.05); }
      ctx.spot({ x: tx, z: sz - 0.9, r: 1.6, verb: () => (has('tv') ? 'Watch TV' : 'Sit and relax'), title: () => (has('sofa') ? 'Sofa' : 'Chairs'), sub: () => (has('tv') ? '+5 mood · 1 hour' : '+2 mood · buy a TV for more'),
        use: () => { const p = ctx.world(tx, sz - (has('sofa') ? 0.05 : 0)); AL.Player.sitAt(p.x, p.z, Math.PI); AL.Life.mood(has('tv') ? 5 : 2); S().t += has('tv') ? 1 : 0.5; act('sit', 3, has('tv') ? 'Watching TV…' : 'Relaxing…'); AL.commit(); } });
      if (has('table')) { K.box(ctx.g, 1.4, 0.75, 0.9, '#8a6a3e', 0, 0, -0.3); ctx.solid(-0.7, 0.7, -0.75, 0.15, 0.95); }
      // kitchen: front left
      const kx = -w / 2 + 0.5, kz = d / 2 - 2.4;
      ctx.box(0.9, 0.95, 2.4, '#e8e2d4', kx, 0, kz); K.box(ctx.g, 0.95, 0.05, 2.45, lux ? '#2b2f36' : '#9aa5ae', kx, 0.95, kz);
      K.box(ctx.g, 0.6, 0.05, 0.6, '#22262b', kx, 1.0, kz + 0.6);
      if (has('fridge')) ctx.box(0.8, 1.9, 0.8, '#e9eef2', kx, 0, kz - 1.7); else K.box(ctx.g, 0.6, 0.5, 0.4, '#2e86c1', kx, 0, kz - 1.6);
      ctx.spot({ x: kx + 1.3, z: kz, r: 1.6, verb: 'Cook a meal', title: () => 'Kitchen', sub: () => Object.values(S().inv).reduce((a, n) => a + n, 0) + ' meals in the fridge', use: kitchenCard });
      // bathroom: front right corner behind a partition
      const px = w / 2 - 2.4, pz = d / 2 - 3.0;
      ctx.box(0.12, 2.4, 1.4, '#e9eef2', px, 0, pz + 0.7);
      ctx.box(2.4, 2.4, 0.12, '#e9eef2', px + 1.2, 0, pz);
      K.box(ctx.g, 1.0, 0.05, 1.0, '#cfe3ef', w / 2 - 0.7, 0, d / 2 - 1.3).castShadow = false;
      K.box(ctx.g, 0.08, 2.0, 0.08, '#c7ccd1', w / 2 - 0.3, 0, d / 2 - 1.7);
      K.box(ctx.g, 0.5, 0.45, 0.6, '#ffffff', w / 2 - 0.4, 0, pz + 0.6);
      ctx.spot({ x: w / 2 - 1.3, z: d / 2 - 1.1, r: 1.4, verb: 'Take a shower', title: () => 'Bathroom', sub: () => '+4 mood · +5 energy · 20 min',
        use: () => { S().t += 0.33; AL.Life.mood(4); S().energy = Math.min(100, S().energy + 5); act('interact', 2.5, 'Showering…'); AL.commit(); } });
      if (has('gen')) K.box(ctx.g, 0.9, 0.7, 0.6, '#e0a526', -w / 2 + 2.2, 0, d / 2 - 0.5);
      if (has('solar')) K.box(ctx.g, 0.6, 1.0, 0.4, '#2e6fd8', -w / 2 + 3.2, 0, d / 2 - 0.4);
      if (lux) { const l = K.mesh(K.ICO, K.mat('#3e8e41'), ctx.g); l.position.set(w / 2 - 0.6, 1.0, 0); l.scale.set(0.45, 0.7, 0.45); }
    },
    onEnter() { const r = AL.residence(); AL.toast('Home: ' + (r ? r.name : '') + '. Bed, kitchen, bathroom, TV and wardrobe are all here.'); },
  });
})(window.AL);
