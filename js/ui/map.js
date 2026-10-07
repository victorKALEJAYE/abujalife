/* Abuja Life — Maps app: a pannable, zoomable map of the city with
   searchable, categorised locations. Select a place to see distance and
   travel options, set directions, request a ride or travel there. */
(function (AL) {
  'use strict';
  const fmt = AL.fmt;
  const M = { cx: null, cz: null, zoom: 1.6, sel: null, cat: null, q: '' };
  const catColor = (c) => (AL.CATEGORIES.find((x) => x[0] === c) || [0, 0, '#9db0a5'])[2];
  const catName = (c) => (AL.CATEGORIES.find((x) => x[0] === c) || [0, 'Place'])[1];
  function el(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }

  function draw(cv) {
    const ctx = cv.getContext('2d'), Wd = cv.width, Hd = cv.height, z = M.zoom;
    const X = (x) => (x - M.cx) * z + Wd / 2, Z = (y) => (y - M.cz) * z + Hd / 2;
    ctx.fillStyle = '#9fbf7a'; ctx.fillRect(0, 0, Wd, Hd);
    // roads
    ctx.strokeStyle = '#5b6068'; ctx.lineWidth = Math.max(3, 8 * z);
    AL.City.ROADS.forEach((v) => { ctx.beginPath(); ctx.moveTo(X(v), Z(-100)); ctx.lineTo(X(v), Z(100)); ctx.stroke(); ctx.beginPath(); ctx.moveTo(X(-100), Z(v)); ctx.lineTo(X(100), Z(v)); ctx.stroke(); });
    ctx.beginPath(); ctx.moveTo(X(-96), Z(24)); ctx.lineTo(X(-166), Z(24)); ctx.stroke();
    // districts
    AL.DKEYS.flat().forEach((k) => {
      const d = AL.D[k];
      ctx.fillStyle = d.base; ctx.fillRect(X(d.x - 20), Z(d.z - 20), 40 * z, 40 * z);
      ctx.fillStyle = '#ece6d6'; ctx.fillRect(X(d.x - 4.5), Z(d.z - 4.5), 9 * z, 9 * z);
    });
    // water + park
    ctx.fillStyle = '#3f9fd8'; ctx.beginPath(); ctx.ellipse(X(24), Z(-128), 22 * z, 15 * z, 0, 0, 7); ctx.fill();
    // nav route
    const nav = AL.S.nav && AL.Sim.get(AL.S.nav);
    const P = AL.Player.pos, pmx = P.x / AL.W, pmz = P.z / AL.W;
    if (nav) {
      const A = AL.D[AL.City.districtAt(P.x, P.z).key], B = AL.D[nav.district];
      const pts = [[pmx, pmz], [A.x + 1.5, A.z + 20.8], [A.x + 20.8, A.z + 20.8], [A.x + 20.8, B.z + 20.8], [B.x + 1.5, B.z + 20.8], [nav.ax, nav.az]];
      ctx.strokeStyle = '#2f7cf6'; ctx.lineWidth = Math.max(3, 2.2 * z); ctx.setLineDash([8, 6]); ctx.beginPath();
      pts.forEach(([x, y], i) => (i ? ctx.lineTo(X(x), Z(y)) : ctx.moveTo(X(x), Z(y)))); ctx.stroke(); ctx.setLineDash([]);
    }
    // district names
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    AL.DKEYS.flat().forEach((k) => {
      const d = AL.D[k]; let fs = Math.round(AL.clamp(5.5 * z, 11, 26));
      ctx.font = '800 ' + fs + 'px Figtree, sans-serif'; ctx.fillStyle = 'rgba(19,33,26,.85)';
      ctx.fillText(d.name.toUpperCase(), X(d.x), Z(d.z - 12));
    });
    // markers
    const list = visible();
    list.forEach((l) => {
      const x = X(l.mx), y = Z(l.mz); if (x < -20 || y < -20 || x > Wd + 20 || y > Hd + 20) return;
      const sel = M.sel === l.id, r = sel ? 11 : (l.type === 'landmark' ? 8 : 6.5);
      ctx.fillStyle = catColor(l.cat); ctx.strokeStyle = '#ffffff'; ctx.lineWidth = sel ? 3.5 : 2;
      ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); ctx.stroke();
      if (l.id === 'home') { ctx.fillStyle = '#fff'; ctx.font = '800 11px Figtree'; ctx.fillText('H', x, y + 0.5); }
      if (sel || (z > 3.2 && l.type !== 'atm')) {
        ctx.font = '700 ' + (sel ? 14 : 11) + 'px Figtree, sans-serif'; ctx.fillStyle = '#13211a';
        const t = l.name.length > 26 ? l.name.slice(0, 25) + '…' : l.name;
        const w = ctx.measureText(t).width + 10; ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.fillRect(x - w / 2, y - r - 20, w, 17);
        ctx.fillStyle = '#13211a'; ctx.fillText(t, x, y - r - 11);
      }
    });
    // player
    const px = X(pmx), pz = Z(pmz), f = AL.Player.facing;
    ctx.save(); ctx.translate(px, pz); ctx.rotate(-f + Math.PI);
    ctx.fillStyle = '#2f7cf6'; ctx.strokeStyle = '#fff'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(0, -12); ctx.lineTo(9, 9); ctx.lineTo(0, 4); ctx.lineTo(-9, 9); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.restore();
  }
  function visible() {
    let list = AL.Sim.allLocations();
    if (M.cat) list = list.filter((l) => l.cat === M.cat || (M.cat === 'homes' && l.id === 'home'));
    if (M.q) { const q = M.q.toLowerCase(); list = list.filter((l) => (l.name + ' ' + AL.D[l.district].name + ' ' + catName(l.cat)).toLowerCase().includes(q)); }
    return list;
  }

  function render(body) {
    if (M.cx === null) { M.cx = AL.Player.pos.x / AL.W; M.cz = AL.Player.pos.z / AL.W; M.zoom = 2.6; }
    const wrap = el('div', 'mapwrap'); body.appendChild(wrap);
    const cv = el('canvas', 'minimap'); cv.width = 640; cv.height = 420; wrap.appendChild(cv);
    const ctrls = el('div', 'mapctrl'); wrap.appendChild(ctrls);
    const btn = (label, aria, fn) => { const b = el('button', 'mapbtn', label); b.type = 'button'; b.setAttribute('aria-label', aria); b.onclick = fn; ctrls.appendChild(b); };
    btn('+', 'Zoom in', () => { M.zoom = AL.clamp(M.zoom * 1.4, 0.7, 9); draw(cv); });
    btn('−', 'Zoom out', () => { M.zoom = AL.clamp(M.zoom / 1.4, 0.7, 9); draw(cv); });
    btn('◎', 'Centre on me', () => { M.cx = AL.Player.pos.x / AL.W; M.cz = AL.Player.pos.z / AL.W; M.zoom = Math.max(M.zoom, 2.4); draw(cv); });
    btn('H', 'My home', () => { const h = AL.Sim.homeLocation(); if (!h) return AL.toast('You have no home. Visit an estate agent.'); select(h.id, true); });
    bindCanvas(cv);
    const search = el('input', 'mapsearch'); search.type = 'search'; search.placeholder = 'Search places, e.g. bank, suya, Jabi'; search.value = M.q; search.setAttribute('aria-label', 'Search places');
    search.oninput = () => { M.q = search.value; M.sel = null; draw(cv); renderList(); };
    body.appendChild(search);
    const chips = el('div', 'chips catchips'); body.appendChild(chips);
    const chip = (id, label, color) => { const c = el('button', 'chip', label); c.type = 'button'; c.setAttribute('aria-pressed', String(M.cat === id)); if (color) c.style.setProperty('--dot', color); c.classList.toggle('dotchip', !!color);
      c.onclick = () => { M.cat = M.cat === id ? null : id; M.sel = null; [...chips.children].forEach((x) => x.setAttribute('aria-pressed', 'false')); c.setAttribute('aria-pressed', String(M.cat === id)); draw(cv); renderList(); }; chips.appendChild(c); };
    AL.CATEGORIES.forEach(([id, label, color]) => chip(id, label, color));
    const panel = el('div', 'group'); body.appendChild(panel);
    M.redraw = () => draw(cv);
    function renderList() {
      panel.innerHTML = '';
      if (M.sel) return renderDetail(panel);
      const list = visible().map((l) => ({ l, km: AL.Travel.kmTo(l) })).sort((a, b) => a.km - b.km).slice(0, 14);
      if (!list.length) { panel.appendChild(el('p', 'note', 'No places match. Try another word or category.')); return; }
      list.forEach(({ l, km }) => {
        const b = AL.UI.mk(l.name, catName(l.cat) + ' · ' + AL.D[l.district].name + (l.hours && !AL.isOpen(l.hours) ? ' · closed' : ''), AL.Travel.fmtKm(km), 'pay', () => select(l.id, true));
        b.querySelector('.r').style.color = catColor(l.cat); panel.appendChild(b);
      });
    }
    M.renderList = renderList;
    renderList(); draw(cv);
  }
  function select(id, center) {
    M.sel = id; const l = AL.Sim.get(id);
    if (l && center) { M.cx = l.mx; M.cz = l.mz; M.zoom = Math.max(M.zoom, 3); }
    if (M.redraw) M.redraw(); if (M.renderList) M.renderList();
  }
  M.select = select;

  function renderDetail(panel) {
    const l = AL.Sim.get(M.sel); if (!l) { M.sel = null; return M.renderList(); }
    const card = el('div', 'placecard'); panel.appendChild(card);
    const head = el('div', 'pc-head'); card.appendChild(head);
    const dot = el('span', 'pc-dot'); dot.style.background = catColor(l.cat); head.appendChild(dot);
    const tt = el('div'); tt.appendChild(el('b', null, l.name)); tt.appendChild(el('span', 'pc-sub', catName(l.cat) + ' · ' + AL.D[l.district].name)); head.appendChild(tt);
    const back = el('button', 'x', '×'); back.type = 'button'; back.setAttribute('aria-label', 'Back to list'); back.onclick = () => { M.sel = null; M.redraw(); M.renderList(); }; head.appendChild(back);
    const km = AL.Travel.kmTo(l), walk = AL.Travel.quote(l, 'walk');
    const traffic = AL.Sim.trafficAt(l.district);
    const bz = AL.Sim.biz[l.id];
    const facts = [['Distance', AL.Travel.fmtKm(km)], ['Walking', AL.Travel.fmtMin(walk.mins)], ['Status', l.hours ? (AL.isOpen(l.hours) ? 'Open now' : 'Closed') : 'Open 24 hours'], ['Traffic there', traffic.level]];
    if (bz) facts.push(['Staff', String(bz.staff)], ['Customers today', String(bz.customers)]);
    if (l.id === 'home') {
      const r = AL.residence();
      facts.splice(0, 0, ['Home', r.T.label], ['Quality', '★'.repeat(r.T.stars) + '☆'.repeat(5 - r.T.stars)], ['Security', r.T.security], ['Size', r.T.sizeLabel]);
      if (r.kind === 'rent') facts.push(['Rent', fmt(r.rent) + '/week'], ['Paid until', 'Day ' + r.paidUntil]); else facts.push(['Ownership', 'You own it']);
    }
    card.appendChild(AL.UI.stats(facts));
    if (l.info) card.appendChild(el('p', 'note', l.info));
    if (l.hours) card.appendChild(el('p', 'note', AL.hoursText(l.hours)));
    const acts = el('div', 'group'); card.appendChild(acts);
    const near = km < 0.12;
    if (l.id === 'home' && near) acts.appendChild(AL.UI.mk('Enter home', 'Sleep, change clothes, eat, manage', '', '', () => { AL.$('phone').hidden = true; AL.Home.open(); }));
    if (l.id === 'home') acts.appendChild(AL.UI.mk('Manage home', 'Rent, moving and listings', '', '', () => AL.Phone.open('housing')));
    acts.appendChild(AL.UI.mk(AL.S.nav === l.id ? 'Directions are on' : 'Get directions', 'Show the way on screen while you walk · ' + AL.Travel.fmtMin(walk.mins), '', '', () => { AL.Travel.Nav.set(l.id); M.redraw(); renderDetailRefresh(); }, AL.S.nav === l.id));
    if (!near) {
      const ride = AL.Travel.quote(l, 'ride');
      acts.appendChild(AL.UI.mk('Request ride', 'Ride-hailing · ' + AL.Travel.fmtMin(ride.mins) + ' · arrive ' + ride.arrive + (ride.surge ? ' · busy-hour price' : ''), fmt(ride.cost), 'cost', () => { AL.$('phone').hidden = true; AL.Travel.request(l.id, 'ride'); }, AL.S.cash + AL.S.savings < ride.cost));
      const atPark = AL.Travel.atPark();
      ['taxi', 'bus'].forEach((m) => {
        const q = AL.Travel.quote(l, m);
        acts.appendChild(AL.UI.mk('Travel by ' + AL.Travel.MODES[m].name.toLowerCase(), atPark ? AL.Travel.fmtMin(q.mins) + ' · arrive ' + q.arrive : 'Go to a taxi & bus park first', fmt(q.cost), 'cost', () => { AL.$('phone').hidden = true; AL.Travel.request(l.id, m); }, !atPark || AL.S.cash + AL.S.savings < q.cost));
      });
    }
    function renderDetailRefresh() { M.renderList(); }
  }

  function bindCanvas(cv) {
    const pts = new Map(); let moved = 0, pinch0 = 0, zoom0 = 1;
    const toMap = (cx, cy) => { const r = cv.getBoundingClientRect(); const sx = ((cx - r.left) / r.width) * cv.width, sy = ((cy - r.top) / r.height) * cv.height; return { x: (sx - cv.width / 2) / M.zoom + M.cx, z: (sy - cv.height / 2) / M.zoom + M.cz, sx, sy }; };
    cv.addEventListener('pointerdown', (e) => { cv.setPointerCapture(e.pointerId); pts.set(e.pointerId, { x: e.clientX, y: e.clientY }); moved = 0; if (pts.size === 2) { const [a, b] = [...pts.values()]; pinch0 = Math.hypot(a.x - b.x, a.y - b.y); zoom0 = M.zoom; } });
    cv.addEventListener('pointermove', (e) => {
      if (!pts.has(e.pointerId)) return; const p = pts.get(e.pointerId); const dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY;
      const r = cv.getBoundingClientRect(), k = cv.width / r.width;
      if (pts.size === 1) { moved += Math.abs(dx) + Math.abs(dy); M.cx -= (dx * k) / M.zoom; M.cz -= (dy * k) / M.zoom; draw(cv); }
      else if (pts.size === 2) { const [a, b] = [...pts.values()]; const d = Math.hypot(a.x - b.x, a.y - b.y); if (pinch0) { M.zoom = AL.clamp((zoom0 * d) / pinch0, 0.7, 9); draw(cv); } moved = 99; }
    });
    cv.addEventListener('pointerup', (e) => {
      if (!pts.has(e.pointerId)) return; pts.delete(e.pointerId);
      if (moved > 6 || pts.size) return;
      const m = toMap(e.clientX, e.clientY);
      let best = null, bd = 1e9;
      visible().forEach((l) => { const d = Math.hypot((l.mx - m.x) * M.zoom, (l.mz - m.z) * M.zoom); if (d < bd) { bd = d; best = l; } });
      if (best && bd < 22) select(best.id, false);
    });
    cv.addEventListener('pointercancel', (e) => pts.delete(e.pointerId));
    cv.addEventListener('wheel', (e) => { e.preventDefault(); M.zoom = AL.clamp(M.zoom * (e.deltaY > 0 ? 0.87 : 1.15), 0.7, 9); draw(cv); }, { passive: false });
  }

  AL.Phone.register({
    id: 'map', name: 'Maps', order: 1, color: '#2e9e5b',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 4L3 6v14l6-2 6 2 6-2V4l-6 2-6-2zM9 4v14M15 6v14"/></svg>',
    render,
  });
  AL.MapApp = M;
  AL.Phone.mapSelect = (k) => {
    const l = AL.Sim.locations.find((x) => x.type === 'taxi' && x.district === k) || AL.Sim.locations.find((x) => x.district === k);
    AL.Phone.toggle('map'); if (l) select(l.id, true);
  };
  AL.on('nav', () => { if (M.redraw && !AL.$('phone').hidden) M.redraw(); });
})(window.AL);
