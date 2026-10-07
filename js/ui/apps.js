/* Abuja Life — phone apps: Transport, Bank, Invest, Shop, Jobs, Messages,
   Home (housing) and Me (profile). Each app is a small render function that
   reads the player profile and calls the life systems. */
(function (AL) {
  'use strict';
  const fmt = AL.fmt;
  const ic = (d) => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + d + '</svg>';
  function el(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  const mk = (...a) => AL.UI.mk(...a);
  const stats = (p) => AL.UI.stats(p);
  const h3 = (t) => el('h3', 'optl', t);
  const note = (t) => el('p', 'note', t);
  function tabs(body, names, cur, set) {
    const row = el('div', 'chips'); body.appendChild(row);
    names.forEach(([id, label]) => { const c = el('button', 'chip', label); c.type = 'button'; c.setAttribute('aria-pressed', String(cur === id)); c.onclick = () => set(id); row.appendChild(c); });
  }
  const st = { bank: 'home', invest: null, shop: 'Clothes' };

  /* ---------- Transport ---------- */
  AL.Phone.register({
    id: 'transport', name: 'Rides', order: 2, color: '#111827',
    icon: ic('<path d="M5 17h14l-1.5-6.5A2 2 0 0 0 15.6 9H8.4a2 2 0 0 0-1.9 1.5L5 17zM5 17v2M19 17v2M7.5 14h.01M16.5 14h.01"/>'),
    render(body) {
      const here = AL.City.districtAt(AL.Player.pos.x, AL.Player.pos.z).key;
      const tr = AL.Sim.trafficAt(here);
      body.appendChild(el('div', 'bigq', 'Where are you going?'));
      body.appendChild(note('Traffic near you: ' + tr.level.toLowerCase() + ', about ' + tr.kmh + ' km/h. Rides pick you up where you stand.'));
      const dests = [];
      const home = AL.Sim.homeLocation(); if (home) dests.push(['Home', home]);
      const c = AL.Life.career(); if (c) { const w = AL.Sim.locations.find((l) => l.district === c.at && l.type === c.venue); if (w) dests.push(['Work · ' + c.employer, w]); }
      [['Jabi Lake Mall', (l) => l.type === 'shop' && l.district === 'jabi'], ['Wuse Market', (l) => l.type === 'shop' && l.district === 'wuse'],
        ['Capital Trust Bank', (l) => l.type === 'bank'], ['Maitama', (l) => l.type === 'taxi' && l.district === 'maitama'], ['Garki', (l) => l.type === 'taxi' && l.district === 'garki'],
        ['Airport', (l) => l.id === 'lm-airport'], ['Gwarinpa', (l) => l.type === 'taxi' && l.district === 'gwarinpa'], ['Kubwa', (l) => l.type === 'taxi' && l.district === 'kubwa'],
        ['Central Business District', (l) => l.type === 'taxi' && l.district === 'cbd'], ['Millennium Park', (l) => l.id === 'lm-millennium']].forEach(([label, f]) => { const l = AL.Sim.locations.find(f); if (l) dests.push([label, l]); });
      dests.forEach(([label, l]) => {
        const q = AL.Travel.quote(l, 'ride');
        body.appendChild(mk(label, AL.Travel.fmtKm(q.km) + ' · ' + AL.Travel.fmtMin(q.mins) + ' · arrive ' + q.arrive + (q.surge ? ' · busy-hour price' : ''), fmt(q.cost), 'cost', () => { AL.$('phone').hidden = true; AL.Travel.request(l.id, 'ride'); }, q.km < 0.25 || AL.S.cash + AL.S.savings < q.cost));
      });
      body.appendChild(mk('Anywhere else…', 'Search the map for a destination', '', '', () => AL.Phone.open('map')));
      body.appendChild(note('Buses and taxis are cheaper: catch them at any district\'s taxi & bus park. Car ownership arrives in a later update.'));
    },
  });

  /* ---------- Bank ---------- */
  AL.Phone.register({
    id: 'bank', name: 'Bank', order: 3, color: '#0f6e5c', live: true,
    icon: ic('<rect x="3" y="9" width="18" height="11" rx="1"/><path d="M2 9l10-6 10 6M7 13v4M12 13v4M17 13v4"/>'),
    render(body) {
      const S = AL.S;
      body.appendChild(el('div', 'bankcard')).innerHTML = '<small>Capital Trust Bank · Savings</small><b></b><span></span>';
      const bc = body.lastChild; bc.querySelector('b').textContent = fmt(S.savings); bc.querySelector('span').textContent = 'Cash on you ' + fmt(S.cash) + ' · Credit score ' + S.credit;
      tabs(body, [['home', 'Overview'], ['tx', 'History'], ['send', 'Transfer'], ['loan', 'Loans'], ['bills', 'Bills']], st.bank, (t) => { st.bank = t; AL.Phone.open('bank'); });
      if (st.bank === 'home') {
        body.appendChild(stats([['Balance', fmt(S.savings)], ['Interest', '1% nightly'], ['Loan owed', S.loan ? fmt(S.loan.bal) : '—'], ['Investments', fmt(AL.Life.portfolioValue())]]));
        const c = AL.Life.career(); if (c) body.appendChild(note('Salary: ' + fmt(AL.Life.careerPay(c, S.career.lvl)) + ' per shift from ' + c.employer + ', paid into this account.'));
        body.appendChild(note('Deposit cash at the CBD branch (08:00–16:00). Withdraw at any ATM.'));
      } else if (st.bank === 'tx') {
        if (!S.tx.length) body.appendChild(note('No transactions yet.'));
        const ul = el('ul', 'txlist'); body.appendChild(ul);
        S.tx.slice(0, 40).forEach((t) => { const li = el('li'); li.appendChild(el('span', null, t.desc)); li.appendChild(el('b', t.amt >= 0 ? 'in' : 'out', (t.amt >= 0 ? '+' : '−') + fmt(Math.abs(t.amt)))); li.appendChild(el('small', null, 'Day ' + t.day + ' · ' + t.time)); ul.appendChild(li); });
      } else if (st.bank === 'send') {
        const friends = Object.entries(S.rel).sort((a, b) => b[1].f - a[1].f);
        if (!friends.length) body.appendChild(note('You have no contacts yet. Talk to people around Abuja to add them.'));
        friends.forEach(([id, r]) => {
          body.appendChild(h3(r.name + ' · ' + r.role));
          const row = el('div', 'row'); body.appendChild(row);
          [5000, 20000, 50000].forEach((a) => { const b = el('button', 'btn', 'Send ' + fmt(a)); b.type = 'button'; b.disabled = S.savings < a; b.onclick = () => AL.Life.transfer(id, a); row.appendChild(b); });
        });
      } else if (st.bank === 'loan') {
        const lim = AL.Life.loanLimit();
        body.appendChild(stats([['Credit score', String(S.credit)], ['Loan limit', fmt(lim)], ['Rate', '1% a day'], ['Term', AL.LOAN.termDays + ' days']]));
        if (S.loan) {
          body.appendChild(note('You owe ' + fmt(S.loan.bal) + '. Due on day ' + S.loan.due + (AL.day() > S.loan.due ? ' (overdue)' : '') + '.'));
          body.appendChild(mk('Repay everything', 'From your bank balance', fmt(S.loan.bal), 'cost', () => AL.Life.repay(S.loan.bal), S.savings <= 0));
          body.appendChild(mk('Repay ₦20,000', 'Partial repayment', fmt(20000), 'cost', () => AL.Life.repay(20000), S.savings < 20000));
        } else {
          body.appendChild(note('A ' + AL.LOAN.lender + ' loan lands in your account instantly. Repay on time to raise your credit score; paying late lowers it.'));
          [0.25, 0.5, 1].forEach((f) => { const a = Math.round((lim * f) / 1000) * 1000; if (a > 0) body.appendChild(mk('Borrow ' + fmt(a), 'Repay about ' + fmt(Math.round(a * Math.pow(1.01, AL.LOAN.termDays))) + ' by day ' + (AL.day() + AL.LOAN.termDays), fmt(a), 'pay', () => AL.Life.borrow(a))); });
          if (lim <= 0) body.appendChild(note('Your credit score is too low for a loan right now. Pay rent on time to rebuild it.'));
        }
      } else if (st.bank === 'bills') {
        const r = AL.residence();
        if (r && r.kind === 'rent') {
          body.appendChild(stats([['Rent', fmt(r.rent) + '/week'], ['Paid until', 'Day ' + r.paidUntil], ['Today', 'Day ' + AL.day()], ['Arrears', r.arrears ? r.arrears + ' days' : 'None']]));
          body.appendChild(mk('Pay next week\'s rent now', r.name + ', ' + AL.D[r.at].name, fmt(r.rent), 'cost', () => AL.Life.prepayRent()));
        } else body.appendChild(note(r ? 'You own your home. No rent to pay.' : 'You have no home, so no bills. Visit an estate agent to rent one.'));
      }
    },
  });

  /* ---------- Invest ---------- */
  function spark(hist, up) {
    const w = 90, h = 26, min = Math.min(...hist), max = Math.max(...hist), span = max - min || 1;
    const pts = hist.map((v, i) => (i / Math.max(1, hist.length - 1)) * w + ',' + (h - ((v - min) / span) * (h - 4) - 2)).join(' ');
    return '<svg width="' + w + '" height="' + h + '" viewBox="0 0 ' + w + ' ' + h + '" aria-hidden="true"><polyline points="' + pts + '" fill="none" stroke="' + (up ? '#2fbf71' : '#f26b5b') + '" stroke-width="2"/></svg>';
  }
  AL.Phone.register({
    id: 'invest', name: 'Invest', order: 4, color: '#1d6fa5', live: true,
    icon: ic('<path d="M3 17l6-6 4 4 8-8M15 7h6v6"/>'),
    render(body) {
      const S = AL.S, Mk = S.market;
      const val = AL.Life.portfolioValue(), cost = Object.values(S.portfolio).reduce((a, h) => a + h.cost, 0);
      body.appendChild(stats([['Portfolio', fmt(val)], ['Gain / loss', (val - cost >= 0 ? '+' : '−') + fmt(Math.abs(val - cost))], ['Bank balance', fmt(S.savings)], ['Exchange', AL.Sim.marketOpen() ? 'Open' : 'Closed']]));
      if (!AL.Sim.marketOpen()) body.appendChild(note('Trading hours are 09:00–17:00, Monday to Friday. Prices still show the last trade.'));
      if (st.invest) {
        const s = AL.STOCKS.find((x) => x.sym === st.invest), p = Mk.p[s.sym], ch = AL.Sim.change(s.sym), h = S.portfolio[s.sym];
        const back = el('button', 'btn', '← All stocks'); back.type = 'button'; back.onclick = () => { st.invest = null; AL.Phone.open('invest'); }; body.appendChild(back);
        body.appendChild(h3(s.name + ' · ' + s.sym));
        const big = el('div', 'stockbig'); big.innerHTML = '<b></b><span></span>' + spark(Mk.h[s.sym], ch >= 0);
        big.querySelector('b').textContent = '₦' + p.toFixed(2); big.querySelector('span').textContent = (ch >= 0 ? '+' : '') + (ch * 100).toFixed(1) + '% today'; big.querySelector('span').className = ch >= 0 ? 'up' : 'down';
        body.appendChild(big);
        body.appendChild(stats([['You own', h ? h.qty + ' shares' : 'None'], ['Value', fmt(h ? h.qty * p : 0)], ['Avg. cost', h ? '₦' + (h.cost / h.qty).toFixed(2) : '—'], ['Dividend', s.div ? (s.div * 100).toFixed(1) + '% weekly' : 'None']]));
        const row = el('div', 'row'); body.appendChild(row);
        [10, 100, 1000].forEach((q) => { const b = el('button', 'btn primary', 'Buy ' + q); b.type = 'button'; b.title = fmt(q * p); b.onclick = () => AL.Life.buyStock(s.sym, q); row.appendChild(b); });
        if (h) { const row2 = el('div', 'row'); body.appendChild(row2); [10, 100].forEach((q) => { if (h.qty >= q) { const b = el('button', 'btn', 'Sell ' + q); b.type = 'button'; b.onclick = () => AL.Life.sellStock(s.sym, q); row2.appendChild(b); } }); const all = el('button', 'btn warn', 'Sell all'); all.type = 'button'; all.onclick = () => AL.Life.sellStock(s.sym, h.qty); row2.appendChild(all); }
        return;
      }
      body.appendChild(h3('Abuja Exchange'));
      AL.STOCKS.forEach((s) => {
        const p = Mk.p[s.sym], ch = AL.Sim.change(s.sym);
        const b = mk(s.name, s.sym + (S.portfolio[s.sym] ? ' · you own ' + S.portfolio[s.sym].qty : ''), '', '', () => { st.invest = s.sym; AL.Phone.open('invest'); });
        const r = b.querySelector('.r'); r.innerHTML = spark(Mk.h[s.sym], ch >= 0) + '<span class="px"></span>';
        r.querySelector('.px').textContent = '₦' + p.toFixed(2) + ' ' + (ch >= 0 ? '+' : '') + (ch * 100).toFixed(1) + '%'; r.querySelector('.px').className = 'px ' + (ch >= 0 ? 'up' : 'down');
        body.appendChild(b);
      });
      body.appendChild(note('Fictional companies. Prices move every game hour and with market news. Shares are paid for from your bank account.'));
    },
  });

  /* ---------- Shop ---------- */
  AL.Phone.register({
    id: 'shop', name: 'ShopNaija', order: 5, color: '#e67e22', live: true,
    icon: ic('<path d="M6 7h12l-1 13H7L6 7zM9 7a3 3 0 0 1 6 0"/>'),
    render(body) {
      const S = AL.S;
      const cats = [...new Set(AL.SHOP_ITEMS.filter((i) => i.where.includes('online')).map((i) => i.cat))];
      tabs(body, cats.map((c) => [c, c]), st.shop, (c) => { st.shop = c; AL.Phone.open('shop'); });
      body.appendChild(note('Delivery tomorrow morning for ' + fmt(AL.DELIVERY_FEE) + ', paid by card from your bank. Stores in Jabi, Wuse and Gwarinpa sell without delivery fees.'));
      AL.SHOP_ITEMS.filter((i) => i.where.includes('online') && i.cat === st.shop).forEach((it) => {
        const owned = it.outfit ? S.wardrobe.includes(it.outfit) : (!it.uses && S.items.includes(it.id));
        const sub = it.outfit ? 'Adds to your wardrobe' : it.uses ? '+' + it.food + ' energy × ' + it.uses + ' meals' : '+' + (it.joy || 0) + ' happiness';
        body.appendChild(mk(it.name, sub + (owned ? ' · owned' : ''), fmt(it.price), 'cost', () => AL.Life.buy(it, 'online'), (owned && !it.uses) || S.savings < it.price + AL.DELIVERY_FEE));
      });
      if (S.deliveries.length) { body.appendChild(h3('On the way')); S.deliveries.forEach((d) => { const it = AL.SHOP_ITEMS.find((x) => x.id === d.id); if (it) body.appendChild(note(it.name + ' · arrives day ' + d.day)); }); }
    },
  });

  /* ---------- Jobs ---------- */
  AL.Phone.register({
    id: 'jobs', name: 'Jobs', order: 6, color: '#0b7a4b', live: true,
    icon: ic('<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/>'),
    render(body) {
      const S = AL.S, c = AL.Life.career();
      if (c) {
        body.appendChild(h3('Your job'));
        body.appendChild(stats([['Role', c.title], ['Employer', c.employer], ['Pay', fmt(AL.Life.careerPay(c, S.career.lvl)) + '/shift'], ['Level', String(S.career.lvl)], ['Shifts', AL.Life.shiftText(c)], ['Days', AL.Life.daysText(c)], ['Shifts worked', String(S.career.shifts)], ['Next promotion', (10 - (S.career.shifts % 10)) + ' shifts']]));
        const ok = AL.Life.canWork(c);
        body.appendChild(note(ok === true ? 'You can start a shift now. Go to ' + c.employer + ' in ' + AL.D[c.at].name + '.' : ok));
        const w = AL.Sim.locations.find((l) => l.district === c.at && l.type === c.venue);
        if (w) body.appendChild(mk('Directions to work', c.employer + ' · ' + AL.D[c.at].name, AL.Travel.fmtKm(AL.Travel.kmTo(w)), 'pay', () => { AL.Travel.Nav.set(w.id); }));
        const q = el('button', 'btn warn', 'Resign'); q.type = 'button'; q.onclick = () => { if (q.dataset.arm) AL.Life.quit(); else { q.dataset.arm = 1; q.textContent = 'Tap again to resign'; } }; body.appendChild(q);
      }
      body.appendChild(h3('Careers · you have ' + S.xp + ' hustle points'));
      AL.CAREERS.forEach((x) => {
        if (c && c.id === x.id) return;
        const locked = S.xp < x.req;
        body.appendChild(mk(x.title + ' · ' + x.employer, (locked ? 'Needs ' + x.req + ' points · ' : '') + AL.D[x.at].name + ' · ' + AL.Life.shiftText(x) + ', ' + AL.Life.daysText(x), fmt(x.pay) + '/shift', 'pay', () => AL.Life.apply(x), locked));
      });
      body.appendChild(h3('Day jobs (cash, no contract)'));
      AL.JOBS.slice().sort((a, b) => a.req - b.req).forEach((j) => {
        const loc = AL.Sim.locations.find((l) => l.type === 'jobs' && l.district === j.at);
        body.appendChild(mk(j.name + ' · ' + AL.D[j.at].name, (S.xp < j.req ? 'Needs ' + j.req + ' points · ' : '') + j.hrs + ' hrs · tap for directions', '+' + fmt(AL.payFor(j)), 'pay', () => { if (loc) AL.Travel.Nav.set(loc.id); }));
      });
    },
  });

  /* ---------- Messages ---------- */
  AL.Phone.register({
    id: 'messages', name: 'Messages', order: 7, color: '#2e86c1',
    icon: ic('<path d="M4 5h16v11H8l-4 4z"/>'),
    badge: () => AL.unread(),
    render(body) {
      const S = AL.S;
      if (!S.msgs.length) body.appendChild(note('No messages yet.'));
      const ul = el('ul', 'msglist'); body.appendChild(ul);
      S.msgs.slice(0, 40).forEach((m) => { const li = el('li', m.read ? '' : 'unread'); li.appendChild(el('b', null, m.from)); li.appendChild(el('small', null, 'Day ' + m.day + ' · ' + m.time)); li.appendChild(el('p', null, m.text)); ul.appendChild(li); m.read = true; });
      AL.saveLocal(); AL.emit('msgs-read');
    },
  });

  /* ---------- Home (housing) ---------- */
  AL.Phone.register({
    id: 'housing', name: 'Home', order: 8, color: '#d1342f', live: true,
    icon: ic('<path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>'),
    render(body) {
      const S = AL.S, r = AL.residence();
      body.appendChild(h3('My home'));
      if (r) {
        body.appendChild(el('div', 'homehero')).innerHTML = '<b></b><span></span>';
        const hh = body.lastChild; hh.querySelector('b').textContent = r.name + ', ' + AL.D[r.at].name; hh.querySelector('span').textContent = r.T.label + ' · ' + '★'.repeat(r.T.stars) + '☆'.repeat(5 - r.T.stars);
        body.appendChild(stats([[r.kind === 'rent' ? 'Rent' : 'Ownership', r.kind === 'rent' ? fmt(r.rent) + '/week' : 'You own it'], ['Security', r.T.security], ['Size', r.T.sizeLabel], [r.kind === 'rent' ? 'Paid until' : 'Comfort', r.kind === 'rent' ? 'Day ' + r.paidUntil : AL.comfort() + ' pts']]));
        const loc = AL.Sim.homeLocation();
        if (loc) body.appendChild(mk('Directions home', AL.Travel.fmtKm(AL.Travel.kmTo(loc)) + ' away', '', '', () => AL.Travel.Nav.set('home')));
        if (loc && AL.Travel.kmTo(loc) > 0.25) { const q = AL.Travel.quote(loc, 'ride'); body.appendChild(mk('Ride home', AL.Travel.fmtMin(q.mins) + ' · arrive ' + q.arrive, fmt(q.cost), 'cost', () => { AL.$('phone').hidden = true; AL.Travel.request('home', 'ride'); })); }
        if (r.kind === 'rent') body.appendChild(mk('Pay next week\'s rent', 'Stay ahead and protect your credit score', fmt(r.rent), 'cost', () => AL.Life.prepayRent()));
        const mo = el('button', 'btn warn', 'Move out'); mo.type = 'button'; mo.onclick = () => { if (mo.dataset.arm) AL.Life.moveOut(); else { mo.dataset.arm = 1; mo.textContent = 'Tap again to move out'; } }; body.appendChild(mo);
      } else body.appendChild(note('You have nowhere to live. Rent a place at an estate agent, or sleep at Area 1 motor park in Garki.'));
      body.appendChild(h3('Homes to rent'));
      AL.RENTALS.forEach((x) => {
        const T = AL.TEMPLATES[x.tpl], agent = AL.Sim.locations.find((l) => l.type === 'estate' && l.district === x.at);
        body.appendChild(mk(x.name + ', ' + AL.D[x.at].name, T.label + ' · ' + '★'.repeat(T.stars) + ' · sign at the estate agent (tap for directions)', fmt(x.rent) + '/wk', 'cost', () => { if (agent) AL.Travel.Nav.set(agent.id); }, r && r.kind === 'rent' && r.id === x.id));
      });
      body.appendChild(h3('Homes for sale'));
      AL.HOMES.forEach((x) => {
        const own = S.homes.includes(x.id), T = AL.TEMPLATES[AL.HOME_TEMPLATE[x.id]], agent = AL.Sim.locations.find((l) => l.type === 'estate' && l.district === x.at);
        body.appendChild(mk(x.name + ', ' + AL.D[x.at].name, T.label + ' · ' + '★'.repeat(T.stars) + (own ? ' · you own this' : ' · ' + AL.left(x) + ' left'), own ? '<span class="owned">OWNED</span>' : fmt(AL.priceOf(x)), 'cost', () => { if (agent) AL.Travel.Nav.set(agent.id); }, own));
      });
    },
  });

  /* ---------- Me (profile) ---------- */
  AL.Phone.register({
    id: 'me', name: 'Me', order: 9, color: '#55606b', live: true,
    icon: ic('<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>'),
    render(body) {
      const S = AL.S, r = AL.residence(), c = AL.Life.career();
      body.appendChild(stats([
        ['Name', AL.cleanName(S.name)], ['Age', String(S.age)], ['Home', r ? r.name + ', ' + AL.D[r.at].name : 'None'], ['Vehicle', 'None yet'],
        ['Job', c ? c.title : 'Day jobs'], ['Salary', c ? fmt(AL.Life.careerPay(c, S.career.lvl)) + '/shift' : '—'],
        ['Cash', fmt(S.cash)], ['Bank', fmt(S.savings)], ['Net worth', fmt(AL.worth())], ['Credit score', String(S.credit)],
        ['Health', Math.round(S.health) + ' / 100'], ['Energy', Math.round(S.energy) + ' / 100'], ['Happiness', Math.round(S.happy) + ' / 100'], ['Hustle points', String(S.xp)],
        ['Friends', String(Object.values(S.rel).filter((x) => x.f >= 50).length)], ['Landmarks', S.visited.length + ' / ' + AL.LANDMARKS.length],
      ]));
      body.appendChild(h3('Possessions'));
      const owned = S.items.map((id) => AL.SHOP_ITEMS.find((x) => x.id === id)).filter(Boolean);
      body.appendChild(note(owned.length ? owned.map((x) => x.name).join(', ') : 'Nothing yet. Try ShopNaija or Jabi Lake Mall.'));
      body.appendChild(h3('Wardrobe'));
      body.appendChild(note(S.wardrobe.map((o) => (AL.OUTFITS.find((x) => x[0] === o) || [0, o])[1]).join(', ') + '. Change clothes at home.'));
      const food = Object.entries(S.inv).map(([id, n]) => { const it = AL.SHOP_ITEMS.find((x) => x.id === id); return it ? it.name + ' ×' + n : null; }).filter(Boolean);
      body.appendChild(h3('Kitchen')); body.appendChild(note(food.length ? food.join(', ') : 'Empty. Buy groceries at Wuse Market or Grand Square Supermarket.'));
    },
  });
})(window.AL);
