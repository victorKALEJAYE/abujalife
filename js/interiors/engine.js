/* Abuja Life — walk-in interiors.
   A venue door leads into a small reusable room scene with its own props,
   staff and customers. Rooms are built on demand in a quiet corner of the
   world (far from the city), use the normal player controller, collisions
   and interaction prompts, and are cached for the next visit.

   Add a new kind of place:
     AL.Interior.define('bakery', {
       name: (ctx) => 'Bakery', size: [14, 10],
       build(ctx) { ctx.room({...}); ctx.box(...); ctx.spot({...}); ctx.npc({...}); },
     });
   and map a venue type to it in Interior.forVenue. */
(function (AL) {
  'use strict';
  const T = AL.T;
  if (!T) return;
  const K = AL.Kit, W = AL.W;
  const IN = { defs: {}, built: {}, active: null, slots: 0 };
  const R = Math.random;

  IN.define = (id, def) => { IN.defs[id] = def; };
  /* which interior a venue opens, or null for counter-style venues */
  IN.forVenue = (v) => {
    switch (v.type) {
      case 'shop': { const st = AL.STORES[v.district]; return st && st.kind === 'supermarket' ? { id: 'supermarket' } : { id: 'fashion', variant: st ? st.kind : 'mall' }; }
      case 'bank': return { id: 'bank' };
      case 'lender': return { id: 'lender' };
      case 'club': return { id: 'club', variant: 'club' };
      case 'lounge': return { id: 'club', variant: 'lounge' };
      case 'dealer': return { id: 'dealer' };
      case 'home': return { id: 'home' };
      default: return null;
    }
  };

  /* ---------- people ---------- */
  IN.randomLook = (opts = {}) => {
    const f = opts.frame || (R() < 0.5 ? 'f' : 'm');
    const hairs = f === 'f' ? ['braids', 'bun', 'gele', 'afro'] : ['lowcut', 'bald', 'afro', 'cap', 'fila'];
    const outfits = opts.outfits || (f === 'f' ? ['ankara', 'tshirt', 'street', 'suit'] : ['tshirt', 'street', 'kaftan', 'suit', 'agbada']);
    return AL.cleanLook({
      frame: f, skin: AL.pick(AL.SKINS), hair: AL.pick(hairs), outfit: AL.pick(outfits),
      color: opts.color || AL.pick(AL.OUTFIT_COLORS), body: AL.pick(['slim', 'regular', 'regular', 'broad']),
      acc: opts.acc || (R() < 0.3 ? [AL.pick(['a-shades', 'w-classic', 'j-chain', 'b-tote'])] : []),
    });
  };
  const NAMES = () => AL.pick(R() < 0.5 ? AL.NPC_FIRST_M : AL.NPC_FIRST_F);

  /* ---------- building context ---------- */
  function makeCtx(key, sel, venue) {
    const def = IN.defs[sel.id];
    const slot = IN.slots++;
    const ox = 9000 + (slot % 20) * 90, oz = 9000 + Math.floor(slot / 20) * 90;
    const g = new T.Group(); g.position.set(ox, 0, oz); g.visible = false; AL.scene.add(g);
    const ctx = { key, sel, def, venue, variant: sel.variant, g, ox, oz, colliders: [], ids: [], npcs: [], ticks: [], n: 0, door: { x: 0, z: 0 } };
    ctx.world = (x, z) => ({ x: ox + x, z: oz + z });
    ctx.solid = (x0, x1, z0, z1, top) => { ctx.colliders.push(AL.City.addCollider(ox + Math.min(x0, x1), ox + Math.max(x0, x1), oz + Math.min(z0, z1), oz + Math.max(z0, z1), top)); };
    ctx.box = (w, h, d, c, x, y, z, solid = true) => {
      const m = K.box(g, w, h, d, c, x, y, z);
      if (solid && y + h > 0.9 && y < 1) ctx.solid(x - w / 2, x + w / 2, z - d / 2, z + d / 2, y + h);
      return m;
    };
    ctx.glow = (w, h, d, color, x, y, z) => { const m = new T.Mesh(K.BOX, new T.MeshBasicMaterial({ color })); m.scale.set(w, h, d); m.position.set(x, y + h / 2, z); g.add(m); return m; };
    ctx.sign = (text, color, x, y, z, w = 3, rot = 0) => {
      const m = new T.Mesh(new T.PlaneGeometry(w, w * 0.375), new T.MeshBasicMaterial({ map: K.signTex(text, color) }));
      m.position.set(x, y, z); m.rotation.y = rot; g.add(m); return m;
    };
    /* four walls with a doorway in the front (+z) wall; returns the door point */
    ctx.room = ({ w, d, h = 4.2, floor = '#d9d2c4', wall = '#f2ede4', trim = null, door = 2.6 }) => {
      ctx.w = w; ctx.d = d; ctx.h = h;
      const f = K.box(g, w, 0.1, d, floor, 0, -0.1, 0); f.castShadow = false;
      const t = 0.8;
      ctx.box(w + t * 2, h, t, wall, 0, 0, -d / 2 - t / 2);
      ctx.box(t, h, d, wall, -w / 2 - t / 2, 0, 0);
      ctx.box(t, h, d, wall, w / 2 + t / 2, 0, 0);
      const side = (w - door) / 2;
      ctx.box(side + t, h, t, wall, -(door / 2 + side / 2) - t / 2, 0, d / 2 + t / 2);
      ctx.box(side + t, h, t, wall, door / 2 + side / 2 + t / 2, 0, d / 2 + t / 2);
      ctx.box(door, h - 2.6, t, wall, 0, 2.6, d / 2 + t / 2, false);
      ctx.solid(-door / 2, door / 2, d / 2 + 0.3, d / 2 + t, h); // the doorway itself is not walkable: you leave with the Exit prompt
      if (trim) { [[0, -d / 2 + 0.02, w, 0.04], [-w / 2 + 0.02, 0, 0.04, d], [w / 2 - 0.02, 0, 0.04, d]].forEach(([x, z, ww, dd]) => K.box(g, ww, 0.25, dd, trim, x, 0, z)); }
      const amb = new T.AmbientLight(0xffffff, 0.32); g.add(amb);
      const pl = new T.PointLight(0xfff4e0, 0.8, Math.max(w, d) * 2.2); pl.position.set(0, h + 2, 0); g.add(pl);
      ctx.door = { x: 0, z: d / 2 - 1.3 };
      ctx.spot({ x: 0, z: d / 2 - 0.6, r: 2.2, priority: 0.2, verb: 'Exit', title: () => 'Back outside', use: () => IN.exit() });
      return ctx.door;
    };
    ctx.light = (color, intensity, x, y, z, dist = 18) => { const l = new T.PointLight(color, intensity, dist); l.position.set(x, y, z); g.add(l); return l; };
    ctx.tick = (fn) => ctx.ticks.push(fn);
    ctx.spot = (o) => {
      const id = 'in-' + key + '-' + (ctx.n++);
      const pos = o.getPos ? null : ctx.world(o.x, o.z);
      AL.Interact.add({ ...o, id, pos, getPos: o.getPos, r: o.r || 1.8, hidden: () => IN.active !== ctx || (o.hidden ? o.hidden() : false) });
      ctx.ids.push(id); return id;
    };
    /* NPC: stands (state), wanders between points, or sits; can be talked to */
    ctx.npc = (o) => {
      const look = o.look || IN.randomLook(o);
      const ch = AL.Character.create(look); const root = new T.Group(); root.add(ch.root); g.add(root);
      root.position.set(o.x, o.y || 0, o.z); root.rotation.y = o.face || 0;
      const a = { o, ch, root, state: o.state || 'idle', path: o.wander || null, target: null, wait: R() * 3, name: o.name || NAMES(), speed: 1.1 + R() * 0.3, talkT: 0 };
      ch.setState(a.state);
      ctx.npcs.push(a);
      if (o.talk !== false) {
        ctx.spot({
          getPos: () => ({ x: ox + root.position.x, z: oz + root.position.z }), r: o.r || 2.2, priority: o.priority || 0,
          verb: o.verb || 'Talk', title: () => a.name + (o.role ? ' · ' + o.role : ''), sub: o.sub,
          enabled: o.enabled,
          use: o.use ? () => { a.talkT = 2.5; face(a); o.use(a); } : () => { a.talkT = 2.5; face(a); AL.toast(a.name + ': "' + AL.pick(o.lines || ['Welcome!', 'How can I help you?', 'You are welcome o.']) + '"'); },
        });
      }
      return a;
    };
    function face(a) { const P = AL.Player.pos; a.root.rotation.y = Math.atan2(P.x - (ox + a.root.position.x), P.z - (oz + a.root.position.z)); }
    return ctx;
  }

  function destroy(ctx) {
    ctx.colliders.forEach((c) => AL.City.removeCollider(c));
    ctx.ids.forEach((id) => AL.Interact.remove(id));
    AL.scene.remove(ctx.g);
    delete IN.built[ctx.key];
  }
  function sigOf(sel) { const d = IN.defs[sel.id]; return d.signature ? d.signature() : ''; }

  /* ---------- entering and leaving ---------- */
  IN.enter = (venue) => {
    const sel = IN.forVenue(venue); if (!sel || !IN.defs[sel.id]) return false;
    const P = AL.Player;
    if (AL.Vehicles && AL.Vehicles.driving) return false;
    AL.Card && AL.Card.hide(); AL.UI.closeSheet();
    const key = sel.id + '-' + (sel.variant || '') + '-' + venue.district;
    const sig = sigOf(sel);
    let ctx = IN.built[key];
    if (ctx && ctx.sig !== sig) { destroy(ctx); ctx = null; }
    if (!ctx) {
      ctx = makeCtx(key, sel, venue); ctx.sig = sig;
      ctx.def.build(ctx);
      IN.built[key] = ctx;
    }
    ctx.venue = venue;
    if (IN.active && IN.active !== ctx) IN.active.g.visible = false;
    IN.active = ctx; ctx.g.visible = true;
    AL.NPC.pool.forEach((a) => { a.root.visible = false; });
    const d = ctx.world(ctx.door.x, ctx.door.z);
    P.place(d.x, d.z, Math.PI);
    P.cam.dist = Math.min(P.cam.dist, 6);
    AL.emit('fade');
    AL.emit('interior', ctx);
    if (ctx.def.onEnter) ctx.def.onEnter(ctx);
    AL.Interact.refresh();
    return true;
  };
  IN.exit = (silent) => {
    const ctx = IN.active; if (!ctx) return;
    if (ctx.def.onExit) ctx.def.onExit(ctx);
    AL.Card && AL.Card.hide();
    ctx.g.visible = false; IN.active = null;
    if (!silent) IN.placeOutside(ctx.venue);
    AL.emit('fade'); AL.emit('interior', null);
    AL.NPC.pool.forEach((a) => { if (a.rec) a.root.visible = true; });
    AL.NPC.reassignT = 0;
  };
  /* the pavement in front of a venue door, facing away from it */
  IN.outside = (v, metres = 2.4) => {
    const p = AL.City.venueWorld(v), fx = v.fx || 0, fz = v.fz === undefined ? 1 : v.fz;
    return { x: p.x + fx * metres, z: p.z + fz * metres, facing: Math.atan2(fx, fz) };
  };
  IN.placeOutside = (v) => { const o = IN.outside(v); AL.Player.place(o.x, o.z, o.facing); };
  IN.rebuildActive = () => {
    const ctx = IN.active; if (!ctx) return;
    const P = AL.Player, lx = P.pos.x - ctx.ox, lz = P.pos.z - ctx.oz, v = ctx.venue;
    ctx.g.visible = false; IN.active = null; destroy(ctx);
    IN.enter(v);
    const n = IN.active; if (n) { P.place(n.ox + lx, n.oz + lz, P.facing); }
  };

  /* ---------- per frame ---------- */
  IN.update = (dt) => {
    const ctx = IN.active; if (!ctx) return;
    const P = AL.Player.pos;
    ctx.ticks.forEach((fn) => fn(dt));
    ctx.npcs.forEach((a) => {
      if (a.talkT > 0) { a.talkT -= dt; a.ch.setState('talk'); a.ch.update(dt, 0); if (a.talkT <= 0) a.ch.setState(a.state); return; }
      let moving = false;
      if (a.path) {
        if (!a.target) {
          a.wait -= dt;
          if (a.wait <= 0) { const p = AL.pick(a.path); a.target = { x: p[0], z: p[1] }; a.stopState = p[2] || null; }
        } else {
          const dx = a.target.x - a.root.position.x, dz = a.target.z - a.root.position.z, dd = Math.hypot(dx, dz);
          if (dd < 0.15) { a.target = null; a.wait = 2 + R() * 5; if (a.stopState) { a.ch.setState(a.stopState); a.resting = a.stopState; } }
          else {
            const st = Math.min(dd, a.speed * dt); a.root.position.x += (dx / dd) * st; a.root.position.z += (dz / dd) * st;
            a.root.rotation.y = AL.angleDamp(a.root.rotation.y, Math.atan2(dx, dz), 8, dt); moving = true; a.resting = null;
          }
        }
        a.ch.setState(moving ? 'walk' : a.resting || 'idle');
      }
      a.ch.update(dt, moving ? a.speed : 0);
    });
    // leave if the place closes while you are inside
    const vt = AL.VENUE_TYPES[ctx.venue.type];
    if (vt && vt.hours && !AL.isOpen(vt.hours) && !AL.busy) { AL.toast('Closing time. The staff walk you to the door.'); IN.exit(); }
  };
  AL.on('change', () => { if (IN.active && IN.active.sel.id === 'home' && IN.active.sig !== sigOf(IN.active.sel)) IN.rebuildActive(); });
  AL.Interior = IN;
})(window.AL);
