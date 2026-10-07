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
    const greet = el('div', 'ph-greet'); greet.innerHTML = '<b></b><span></span>';
    greet.querySelector('b').textContent = AL.clock(); greet.querySelector('span').textContent = AL.weekdayName() + ', day ' + AL.day() + ' · ' + AL.D[AL.Player.district() || AL.S.at].name;
    body.appendChild(greet);
    const grid = el('div', 'ph-home');
    Phone.apps.slice().sort((x, y) => (x.order || 99) - (y.order || 99)).forEach((a) => {
      const b = el('button', 'app' + (a.soon ? ' soon' : '')); b.type = 'button';
      const i = el('i'); i.style.background = a.color; i.innerHTML = a.icon; b.appendChild(i); b.appendChild(el('span', null, a.name));
      const n = a.badge ? a.badge() : 0; if (n) { const bd = el('em', 'badge-n', String(n)); i.appendChild(bd); }
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
    ph.hidden = false;
  };
  AL.on('toggle-phone', () => Phone.toggle());
  AL.on('change', () => { if (!$('phone').hidden && Phone.current && Phone.current.live) Phone.open(Phone.current.id); });
  const dot = () => { $('phoneDot').hidden = !AL.unread(); };
  AL.on('msg', () => { dot(); if (!$('phone').hidden && !Phone.current) Phone.home(); });
  AL.on('msgs-read', dot); AL.on('change', dot);

  /* ---------- Rich list + city economy ---------- */
  Phone.register({
    id: 'rich', name: 'Rich List', order: 10, color: '#8e44ad', live: true,
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
    id: 'contacts', name: 'Contacts', order: 11, color: '#2e6fd8', live: true,
    icon: ic('<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6 6 0 0 1 3.5 6"/>'),
    render(body) {
      const list = Object.entries(AL.S.rel).sort((a, b) => b[1].f - a[1].f);
      if (!list.length) { body.appendChild(el('p', 'note', 'Nobody saved yet. Walk up to people around Abuja and press E to talk.')); return; }
      body.appendChild(el('p', 'note', 'Send money to friends from the Bank app. Friends message you from time to time.'));
      list.forEach(([, r]) => body.appendChild(AL.UI.mk(r.name, r.role + ' · met on day ' + (r.met || 1), r.f >= 50 ? 'Friend' : r.f + '/100', r.f >= 50 ? 'pay' : 'cost', () => {}, false)));
    },
  });
  /* ---------- Activity log ---------- */
  Phone.register({
    id: 'activity', name: 'Activity', order: 12, color: '#16a085', live: true,
    icon: ic('<path d="M3 12h4l3-8 4 16 3-8h4"/>'),
    render(body) { const ul = el('ul', 'loglist'); AL.S.log.slice(0, 30).forEach((m) => ul.appendChild(el('li', null, m))); body.appendChild(ul); },
  });
  /* ---------- Goals ---------- */
  Phone.register({
    id: 'goals', name: 'Goals', order: 13, color: '#b7791f', live: true,
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
    id: 'settings', name: 'Settings', order: 14, color: '#3b4148',
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
  Phone.register({ id: 'social', name: 'Social', order: 15, color: '#e67e22', icon: ic('<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/>'), soon: true });

  Phone.bind = () => { $('phHome').onclick = () => Phone.home(); };
  AL.Phone = Phone;
})(window.AL);
