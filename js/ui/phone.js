/* Abuja Life — the smartphone. Apps register themselves with
   AL.Phone.register({ id, name, color, icon, render(body), soon }), so new
   apps (bank, social, ride-hailing, food delivery, jobs…) plug in later
   without touching the phone itself. */
(function (AL) {
  'use strict';
  const $ = AL.$;
  const fmt = AL.fmt;
  const Phone = { apps: [], current: null };
  const ic = (d) => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + d + '</svg>';
  Phone.register = (app) => { Phone.apps.push(app); };

  function el(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function head(body, title) {
    const h = el('div', 'ph-head');
    const b = el('button', 'ph-back'); b.type = 'button'; b.setAttribute('aria-label', 'Back'); b.innerHTML = ic('<path d="M15 6l-6 6 6 6"/>'); b.onclick = () => Phone.home();
    h.appendChild(b); h.appendChild(el('h3', null, title)); body.appendChild(h);
  }
  Phone.home = () => {
    Phone.current = null;
    const body = $('phBody'); body.innerHTML = '';
    const greet = el('div', 'note', 'Day ' + AL.day() + ' · ' + AL.D[AL.Player.district() || AL.S.at].name);
    body.appendChild(greet);
    const grid = el('div', 'ph-home');
    Phone.apps.forEach((a) => {
      const b = el('button', 'app' + (a.soon ? ' soon' : '')); b.type = 'button';
      const i = el('i'); i.style.background = a.color; i.innerHTML = a.icon; b.appendChild(i); b.appendChild(el('span', null, a.name));
      b.onclick = () => (a.soon ? AL.toast(a.name + ' arrives in a future update.') : Phone.open(a.id));
      grid.appendChild(b);
    });
    body.appendChild(grid);
  };
  Phone.open = (id) => {
    const a = Phone.apps.find((x) => x.id === id); if (!a) return;
    Phone.current = a;
    const body = $('phBody'); body.innerHTML = ''; head(body, a.name); a.render(body);
    $('phone').hidden = false;
  };
  Phone.toggle = (appId) => {
    const ph = $('phone');
    if (!ph.hidden && !appId) { ph.hidden = true; return; }
    if (appId) Phone.open(appId); else Phone.home();
    ph.hidden = false; $('phoneDot').hidden = true;
  };
  AL.on('toggle-phone', () => Phone.toggle());
  AL.on('change', () => { if (!$('phone').hidden && Phone.current && Phone.current.live) Phone.open(Phone.current.id); });
  AL.on('log', () => { if ($('phone').hidden) $('phoneDot').hidden = false; });

  /* ---------- Map & taxi ---------- */
  let mapSel = null;
  function drawMap(cv) {
    const ctx = cv.getContext('2d'), S = cv.width, sc = S / 360; // map units -160..160 → canvas (+ margin)
    const X = (x) => (x + 180) * sc, Z = (z) => (z + 180) * sc;
    ctx.fillStyle = '#1a2620'; ctx.fillRect(0, 0, S, S);
    ctx.strokeStyle = '#4b5058'; ctx.lineWidth = 8 * sc;
    AL.City.ROADS.forEach((v) => { ctx.beginPath(); ctx.moveTo(X(v), Z(-100)); ctx.lineTo(X(v), Z(100)); ctx.stroke(); ctx.beginPath(); ctx.moveTo(X(-100), Z(v)); ctx.lineTo(X(100), Z(v)); ctx.stroke(); });
    AL.DKEYS.flat().forEach((k) => {
      const d = AL.D[k];
      ctx.fillStyle = k === mapSel ? '#2fbf71' : d.base; ctx.fillRect(X(d.x - 20), Z(d.z - 20), 40 * sc, 40 * sc);
      ctx.fillStyle = k === mapSel ? '#04140b' : '#13211a'; let fs = Math.round(9 * sc); ctx.font = '700 ' + fs + 'px Figtree, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      while (fs > 8 && ctx.measureText(d.name).width > 36 * sc) { fs -= 1; ctx.font = '700 ' + fs + 'px Figtree, sans-serif'; }
      ctx.fillText(d.name, X(d.x), Z(d.z));
      if (AL.HOMES.some((h) => h.at === k && AL.S.homes.includes(h.id))) { ctx.fillStyle = '#d1342f'; ctx.beginPath(); ctx.arc(X(d.x + 14), Z(d.z - 14), 4 * sc * 1.4, 0, 7); ctx.fill(); }
    });
    AL.LANDMARKS.forEach((l) => { ctx.fillStyle = AL.S.visited.includes(l.id) ? '#f2b33d' : '#9db0a5'; ctx.beginPath(); ctx.arc(X(l.x), Z(l.z), 3.2 * sc * 1.4, 0, 7); ctx.fill(); });
    const p = AL.Player.pos; const px = X(p.x / AL.W), pz = Z(p.z / AL.W);
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(px, pz, 6 * sc * 1.2, 0, 7); ctx.fill();
    ctx.strokeStyle = '#2fbf71'; ctx.lineWidth = 3; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(px, pz); ctx.lineTo(px + Math.sin(AL.Player.facing) * 14 * sc, pz + Math.cos(AL.Player.facing) * 14 * sc); ctx.stroke();
  }
  Phone.register({
    id: 'map', name: 'Map & Taxi', color: '#2e9e5b',
    icon: ic('<path d="M9 4L3 6v14l6-2 6 2 6-2V4l-6 2-6-2zM9 4v14M15 6v14"/>'),
    render(body) {
      const cv = el('canvas', 'minimap'); cv.width = 600; cv.height = 600; body.appendChild(cv);
      drawMap(cv);
      const info = el('div', 'group'); body.appendChild(info);
      const show = () => {
        info.innerHTML = '';
        if (!mapSel) { info.appendChild(el('p', 'note', 'Tap a district to see it and book a ride. Red dots are your homes; gold dots are landmarks you have visited.')); return; }
        const d = AL.D[mapSel], here = AL.Player.district();
        info.appendChild(el('p', 'note', d.name + ': ' + d.tag));
        if (mapSel === here) { info.appendChild(el('p', 'note', 'You are here.')); return; }
        const f = AL.Econ.fare(here || AL.S.at, mapSel);
        info.appendChild(AL.UI.mk('Book a taxi to ' + d.name, 'A ride-hailing car picks you up where you stand', fmt(f.fare), 'cost', () => { $('phone').hidden = true; AL.Econ.taxi(mapSel); }, AL.S.cash < f.fare));
      };
      cv.addEventListener('click', (e) => {
        const r = cv.getBoundingClientRect(); const mx = ((e.clientX - r.left) / r.width) * 360 - 180, mz = ((e.clientY - r.top) / r.height) * 360 - 180;
        const k = AL.DKEYS.flat().find((q) => Math.abs(AL.D[q].x - mx) <= 20 && Math.abs(AL.D[q].z - mz) <= 20);
        mapSel = k || null; drawMap(cv); show();
      });
      show();
    },
  });
  /* ---------- Wallet ---------- */
  Phone.register({
    id: 'wallet', name: 'Wallet', color: '#b7791f', live: true,
    icon: ic('<rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18M16 15h2"/>'),
    render(body) {
      const S = AL.S;
      body.appendChild(AL.UI.stats([['Cash', fmt(S.cash)], ['Bank', fmt(S.savings)], ['Property', fmt(AL.homeValue())], ['Businesses', fmt(AL.bizValue(S))], ['Net worth', fmt(AL.worth())], ['Tax paid', fmt(S.taxPaid)]]));
      body.appendChild(el('p', 'note', 'Deposit cash at Capital Trust Bank in the CBD (08:00–16:00). ATMs in Garki, Wuse, Jabi and the CBD let you withdraw any time.'));
    },
  });
  /* ---------- Rich list + city economy ---------- */
  Phone.register({
    id: 'rich', name: 'Rich List', color: '#8e44ad', live: true,
    icon: ic('<path d="M4 20h16M6 20V10M12 20V4M18 20v-7"/>'),
    render(body) {
      const rows = AL.allPlayers().map((x) => ({ me: !!x.me, name: AL.cleanName(x.p.name), color: AL.cleanColor(x.p.color), w: AL.worth(x.p) })).sort((a, b) => b.w - a.w);
      body.appendChild(el('h3', 'optl', 'Richest in Abuja'));
      const ol = el('ol', 'lb'); body.appendChild(ol);
      if (!rows.length) ol.appendChild(el('li', null, 'No players yet.'));
      rows.slice(0, 10).forEach((r, i) => {
        const li = el('li', r.me ? 'me' : ''); li.appendChild(el('span', 'rk', (i + 1) + '.')); const dot = el('span', 'dot'); dot.style.background = r.color; li.appendChild(dot);
        li.appendChild(el('span', 'nm', r.name + (r.me ? ' (you)' : ''))); li.appendChild(el('span', 'wv', fmt(r.w))); ol.appendChild(li);
      });
      const biz = [];
      AL.allPlayers().forEach((x) => Object.entries(AL.cleanBiz(x.p.biz)).forEach(([id, v]) => { const b = AL.BIZ.find((q) => q.id === id); biz.push({ me: !!x.me, name: v.name, owner: AL.cleanName(x.p.name), where: AL.D[b.at].name, kind: b.name, lvl: v.lvl, p: AL.bizProfit(b, v.lvl) }); }));
      biz.sort((a, b) => b.p - a.p);
      body.appendChild(el('h3', 'optl', 'Top businesses'));
      const ob = el('ol', 'lb'); body.appendChild(ob);
      if (!biz.length) ob.appendChild(el('li', null, 'No businesses yet. Look for the purple BIZ kiosks.'));
      biz.slice(0, 8).forEach((r, i) => {
        const li = el('li', 'biz' + (r.me ? ' me' : '')); li.appendChild(el('span', 'rk', (i + 1) + '.'));
        const nm = el('span', 'nm'); nm.appendChild(el('span', null, r.name)); nm.appendChild(el('span', 'own', r.kind + ' · ' + r.where + ' · ' + r.owner + (r.me ? ' (you)' : '') + ' · Lv ' + r.lvl)); li.appendChild(nm);
        li.appendChild(el('span', 'wv', fmt(r.p) + '/night')); ob.appendChild(li);
      });
      const ps = AL.allPlayers();
      const homesSold = AL.HOMES.reduce((a, h) => a + AL.sold(h.id), 0), stock = AL.HOMES.reduce((a, h) => a + h.stock, 0);
      body.appendChild(el('h3', 'optl', 'City economy'));
      body.appendChild(AL.UI.stats([['Players', String(ps.length)], ['FCT treasury', fmt(ps.reduce((a, x) => a + (Number(x.p.taxPaid) || 0), 0))], ['Homes sold', homesSold + ' / ' + stock], ['City wealth', fmt(ps.reduce((a, x) => a + AL.worth(x.p), 0))]]));
    },
  });
  /* ---------- Contacts ---------- */
  Phone.register({
    id: 'contacts', name: 'Contacts', color: '#2e6fd8', live: true,
    icon: ic('<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6 6 0 0 1 3.5 6"/>'),
    render(body) {
      const list = Object.entries(AL.S.rel).sort((a, b) => b[1].f - a[1].f);
      if (!list.length) { body.appendChild(el('p', 'note', 'Nobody saved yet. Walk up to people around Abuja and press E to talk. Calls and messages come in a later update.')); return; }
      list.forEach(([, r]) => body.appendChild(AL.UI.mk(r.name, r.role + ' · met on day ' + (r.met || 1), r.f >= 50 ? 'Friend' : r.f + '/100', r.f >= 50 ? 'pay' : 'cost', () => {}, false)));
    },
  });
  /* ---------- Activity log ---------- */
  Phone.register({
    id: 'activity', name: 'Activity', color: '#16a085', live: true,
    icon: ic('<path d="M3 12h4l3-8 4 16 3-8h4"/>'),
    render(body) { const ul = el('ul', 'loglist'); AL.S.log.slice(0, 30).forEach((m) => ul.appendChild(el('li', null, m))); body.appendChild(ul); },
  });
  /* ---------- Goals ---------- */
  Phone.register({
    id: 'goals', name: 'Goals', color: '#d1342f', live: true,
    icon: ic('<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5"/>'),
    render(body) {
      body.appendChild(el('h3', 'optl', 'Property ladder'));
      AL.HOMES.forEach((h) => { const own = AL.S.homes.includes(h.id); const g = el('div', 'goal' + (own ? ' done' : '')); g.appendChild(el('span', null, (own ? '✓ ' : '') + h.name + ', ' + AL.D[h.at].name)); g.appendChild(el('span', null, fmt(h.price))); body.appendChild(g); });
      body.appendChild(el('h3', 'optl', 'Landmarks · ' + AL.S.visited.length + ' / ' + AL.LANDMARKS.length));
      AL.LANDMARKS.forEach((l) => { const v = AL.S.visited.includes(l.id); const g = el('div', 'goal' + (v ? ' done' : '')); g.appendChild(el('span', null, (v ? '✓ ' : '') + l.name)); g.appendChild(el('span', null, v ? 'Visited' : '')); body.appendChild(g); });
      const next = AL.JOBS.filter((j) => j.req > AL.S.xp).sort((a, b) => a.req - b.req)[0];
      if (next) { body.appendChild(el('h3', 'optl', 'Next job unlock')); body.appendChild(el('p', 'note', next.name + ' in ' + AL.D[next.at].name + ' at ' + next.req + ' hustle points (you have ' + AL.S.xp + ').')); }
    },
  });
  /* ---------- Settings ---------- */
  let resetArm = 0;
  Phone.register({
    id: 'settings', name: 'Settings', color: '#55606b',
    icon: ic('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>'),
    render(body) {
      body.appendChild(AL.UI.mk('Edit character', 'Change your look, clothes and name', '', '', () => { $('phone').hidden = true; AL.Creator.open(true); }));
      const reset = AL.UI.mk('Start a new life', 'Keeps your look, resets money, homes and businesses', '', '', () => {
        if (Date.now() - resetArm < 3000) { resetArm = 0; $('phone').hidden = true; AL.emit('new-game'); return; }
        resetArm = Date.now(); reset.querySelector('small').textContent = 'Tap again within 3 seconds to confirm';
      });
      body.appendChild(reset);
      body.appendChild(el('h3', 'optl', 'Controls'));
      body.appendChild(el('p', 'note', AL.TOUCH ? 'Left stick: move (push all the way to run). Drag the screen: look around. Pinch: zoom. Hand button: interact.' : 'W A S D or arrows: move · Shift: run · E: interact · M: map view · P: phone · Esc: close · drag: look · scroll: zoom.'));
      body.appendChild(el('p', 'note', AL.EDITION === 'online' ? 'Online edition: progress saves to your Claude account.' : 'Public edition: progress saves in this browser.'));
    },
  });
  /* ---------- coming soon (the architecture is ready for them) ---------- */
  [['Bank app', '#0f6e5c', '<rect x="3" y="9" width="18" height="11" rx="1"/><path d="M2 9l10-6 10 6M7 13v4M12 13v4M17 13v4"/>'],
    ['Jobs', '#0b7a4b', '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/>'],
    ['Social', '#e67e22', '<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/>'],
    ['Food', '#e0a526', '<path d="M4 11h16a8 8 0 0 1-16 0zM12 3v4M8 5v2M16 5v2"/>'],
    ['Invest', '#16a085', '<path d="M3 17l6-6 4 4 8-8M15 7h6v6"/>'],
    ['Messages', '#2e86c1', '<path d="M4 5h16v11H8l-4 4z"/>']].forEach(([name, color, d]) => Phone.register({ id: name, name, color, icon: ic(d), soon: true }));

  Phone.mapSelect = (k) => { mapSel = k; Phone.toggle('map'); };
  Phone.bind = () => { $('phHome').onclick = () => Phone.home(); };
  AL.Phone = Phone;
})(window.AL);
