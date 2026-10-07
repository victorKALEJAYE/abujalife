/* Abuja Life — venue panels, NPC dialogue and landmark visits.
   Venues come from AL.City.venues; each one becomes an interactable whose
   panel is built by the VENUE_PANELS table below. Adding a new kind of
   place = add a VENUE_TYPES entry (data.js), a prop (city.js) and a panel here. */
(function (AL) {
  'use strict';
  const $ = AL.$;
  const UI = { openVenue: null, talkingTo: null };
  const fmt = AL.fmt;

  UI.modalOpen = () => !$('startOv').hidden || !$('bizOv').hidden || !$('homeOv').hidden || !$('dialog').hidden;

  /* ---- generic action button ---- */
  function mk(main, sub, right, cls, fn, dis) {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'act'; b.disabled = !!dis;
    b.innerHTML = '<span class="l"><b></b><small></small></span><span class="r ' + cls + '"></span>';
    b.querySelector('b').textContent = main; b.querySelector('small').textContent = sub;
    b.querySelector('.r').innerHTML = right; b.onclick = fn; return b;
  }
  function h3(t) { const e = document.createElement('h3'); e.textContent = t; return e; }
  function note(t) { const p = document.createElement('p'); p.className = 'note'; p.textContent = t; return p; }
  function stats(pairs) {
    const g = document.createElement('div'); g.className = 'statgrid';
    pairs.forEach(([k, v]) => { const d = document.createElement('div'); d.innerHTML = '<small></small><b></b>'; d.firstChild.textContent = k; d.lastChild.textContent = v; g.appendChild(d); });
    return g;
  }
  UI.mk = mk; UI.h3 = h3; UI.note = note; UI.stats = stats;

  /* ---- venue panels ---- */
  const VENUE_PANELS = {
    taxi(v, body) {
      body.appendChild(note('Buses are cheapest but slow. Taxis go straight there. Prices use live traffic. You can also walk.'));
      const row = document.createElement('div'); row.className = 'chips'; body.appendChild(row);
      ['bus', 'taxi'].forEach((m) => { const c = document.createElement('button'); c.type = 'button'; c.className = 'chip'; c.textContent = AL.Travel.MODES[m].name; c.setAttribute('aria-pressed', String(UI.parkMode === m)); c.onclick = () => { UI.parkMode = m; renderSheet(); }; row.appendChild(c); });
      const mode = UI.parkMode;
      const dests = [];
      const home = AL.Sim.homeLocation(); if (home) dests.push(home);
      AL.DKEYS.flat().filter((k) => k !== v.district).forEach((k) => { const l = AL.Sim.locations.find((x) => x.type === 'taxi' && x.district === k); if (l) dests.push(l); });
      ['lm-airport', 'lm-millennium', 'lm-mosque', 'lm-ecwa', 'lm-stadium'].forEach((id) => { const l = AL.Sim.get(id); if (l) dests.push(l); });
      dests.map((l) => ({ l, q: AL.Travel.quote(l, mode) })).sort((a, b) => a.q.km - b.q.km).forEach(({ l, q }) => {
        const label = l.type === 'taxi' ? AL.D[l.district].name : l.name;
        body.appendChild(mk(label, AL.Travel.fmtKm(q.km) + ' · ' + AL.Travel.fmtMin(q.mins) + ' · arrive ' + q.arrive + ' · ' + q.traffic.level.toLowerCase() + ' traffic', fmt(q.cost), 'cost', () => { closeSheet(); AL.Travel.request(l.id, mode); }, AL.S.cash + AL.S.savings < q.cost));
      });
    },
    jobs(v, body) {
      const S = AL.S;
      AL.JOBS.filter((j) => j.at === v.district).forEach((j) => {
        const locked = S.xp < j.req, open = AL.isOpen(j.hours);
        const sub = locked ? 'Needs ' + j.req + ' hustle points' : (!open ? 'Shifts ' + AL.hoursText(j.hours).replace('Open ', '') : j.hrs + ' hrs · −' + j.en + ' energy' + (S.jobXp[j.id] ? ' · ' + S.jobXp[j.id] + ' shifts done' : ''));
        body.appendChild(mk(j.name, sub, '+' + fmt(AL.payFor(j)), 'pay', () => { closeSheet(); AL.Econ.work(j); }, locked || !open));
      });
      body.appendChild(note('Every shift earns a hustle point. More points unlock better jobs across Abuja. 10% income tax goes to the FCT treasury.'));
    },
    food(v, body) {
      AL.FOOD.filter((f) => f.at === v.district).forEach((f) => body.appendChild(mk(f.name, '+' + f.en + ' energy · 30 min', fmt(f.cost), 'cost', () => { closeSheet(); AL.Econ.eat(f); })));
    },
    estate(v, body) {
      const S = AL.S;
      if (AL.HOMES.some((h) => h.at === v.district)) body.appendChild(h3('For sale'));
      AL.HOMES.filter((h) => h.at === v.district).forEach((h) => {
        const own = S.homes.includes(h.id), price = AL.priceOf(h), l = AL.left(h);
        const sub = own ? 'You own this · earns ' + fmt(AL.paidFor(h.id) * AL.RENT_RATE) + ' rent nightly'
          : (l <= 0 ? 'Sold out. All ' + h.stock + ' units have owners.' : l + ' of ' + h.stock + ' left · earns ' + fmt(price * AL.RENT_RATE) + ' rent nightly');
        body.appendChild(mk(h.name + ' in ' + AL.D[h.at].name, sub, own ? '<span class="owned">OWNED</span>' : (l <= 0 ? 'SOLD OUT' : fmt(price)), 'cost', () => { AL.Econ.buyHome(h); renderSheet(); }, own || l <= 0));
      });
      const res = AL.residence();
      AL.HOMES.filter((h) => h.at === v.district && S.homes.includes(h.id) && !(res && res.kind === 'own' && res.id === h.id)).forEach((h) =>
        body.appendChild(mk('Move into your ' + h.name.toLowerCase(), 'Stop paying rent and live in your own home', 'MOVE', 'pay', () => { AL.Life.moveIntoOwned(h); renderSheet(); })));
      body.appendChild(note('Buying: prices rise 5% every time a unit sells. Owned homes earn nightly rent.'));
      const rentals = AL.RENTALS.filter((r) => r.at === v.district);
      if (rentals.length) {
        body.appendChild(h3('To rent'));
        rentals.forEach((r) => {
          const T = AL.TEMPLATES[r.tpl], cur = res && res.kind === 'rent' && res.id === r.id;
          body.appendChild(mk(r.name + ' · ' + '★'.repeat(T.stars) + '☆'.repeat(5 - T.stars), T.label + ' · ' + T.sizeLabel + ' · security ' + T.security.toLowerCase() + (cur ? ' · you live here' : ' · first week + 10% agent fee'),
            cur ? '<span class="owned">YOURS</span>' : fmt(r.rent) + '/wk', 'cost', () => { AL.Life.startRental(r); renderSheet(); }, cur));
        });
      }
    },
    biz(v, body) {
      const S = AL.S;
      AL.BIZ.filter((b) => b.at === v.district).forEach((b) => {
        const st = S.biz[b.id];
        if (!st) body.appendChild(mk('Start a ' + b.name.toLowerCase(), 'Earns about ' + fmt(AL.bizProfit(b, 1)) + ' a night · you name it', fmt(b.price), 'cost', () => askBizName(b)));
        else if (st.lvl >= AL.BIZ_MAX_LVL) body.appendChild(mk(st.name, 'Level ' + st.lvl + ' (top) · about ' + fmt(AL.bizProfit(b, st.lvl)) + ' a night', '<span class="owned">MAX</span>', 'cost', () => {}, true));
        else body.appendChild(mk('Expand ' + st.name, 'Level ' + st.lvl + ' → ' + (st.lvl + 1) + ' · about ' + fmt(AL.bizProfit(b, st.lvl + 1)) + ' a night', fmt(AL.upgradeCost(b, st.lvl)), 'cost', () => { AL.Econ.upgradeBiz(b); renderSheet(); }));
      });
      body.appendChild(note('Businesses pay out every night while you sleep, after 10% company tax.'));
    },
    bank(v, body) {
      const S = AL.S;
      body.appendChild(stats([['Account balance', fmt(S.savings)], ['Cash on you', fmt(S.cash)], ['Interest', '1% nightly'], ['Tax paid', fmt(S.taxPaid)]]));
      body.appendChild(h3('Teller'));
      body.appendChild(mk('Deposit all cash', 'Safe from mishaps and earns interest', fmt(S.cash), 'cost', () => { AL.Econ.bank('in'); renderSheet(); }, S.cash <= 0));
      body.appendChild(mk('Withdraw all savings', 'Cash in hand for big purchases', fmt(S.savings), 'pay', () => { AL.Econ.bank('out'); renderSheet(); }, S.savings <= 0));
      body.appendChild(note('Transfers, loans and statements are in the Bank app on your phone.'));
      careerSection(v, body);
    },
    shop(v, body) {
      const st = AL.STORES[v.district]; const kind = st ? st.kind : 'mall';
      body.appendChild(note('Pay with cash or your bank card. Clothes go to your wardrobe at home, groceries to your fridge.'));
      let last = '';
      AL.SHOP_ITEMS.filter((it) => it.where.includes(kind)).forEach((it) => {
        if (it.cat !== last) { body.appendChild(h3(it.cat)); last = it.cat; }
        const owned = it.outfit ? AL.S.wardrobe.includes(it.outfit) : (!it.uses && AL.S.items.includes(it.id));
        const sub = it.outfit ? 'Adds to your wardrobe' : it.uses ? '+' + it.food + ' energy × ' + it.uses + ' meals' : '+' + (it.joy || 0) + ' happiness';
        body.appendChild(mk(it.name, sub + (owned ? ' · owned' : ''), fmt(it.price), 'cost', () => AL.Life.buy(it, 'store'), owned && !it.uses));
      });
      careerSection(v, body);
    },
    invest(v, body) {
      body.appendChild(note('Buy and sell shares of Abuja companies. Trading hours are 09:00–17:00, Monday to Friday. You can also trade from the Invest app.'));
      body.appendChild(mk('Open the trading desk', 'Prices, your portfolio and orders', '', '', () => { closeSheet(); AL.Phone.toggle('invest'); }));
      careerSection(v, body);
    },
    clinic(v, body) {
      const S = AL.S;
      body.appendChild(stats([['Health', Math.round(S.health) + ' / 100'], ['Energy', Math.round(S.energy) + ' / 100']]));
      body.appendChild(mk('General check-up', 'Restores health to 100 · 1 hour', fmt(8000), 'cost', () => { closeSheet(); AL.Life.checkup(); }, S.health >= 100));
      careerSection(v, body);
    },
    work(v, body) {
      body.appendChild(note((AL.WORK_PLACES[v.district] || 'Offices') + '. Salaried jobs pay per shift straight into your bank account.'));
      careerSection(v, body);
    },
    worship(v, body) {
      const l = v.landmark;
      body.appendChild(note(l.info));
      body.appendChild(mk(l.id === 'mosque' ? 'Join the prayers' : 'Attend the service', '+12 happiness · 1 hour · once a day', 'FREE', 'pay', () => { closeSheet(); AL.Life.worship(l.id); }));
      body.appendChild(mk('Take a photo', AL.S.visited.includes(l.id) ? 'Visited' : 'New landmark', '', '', () => { closeSheet(); landmarkPhoto(l); }));
    },
    atm(v, body) {
      const S = AL.S;
      body.appendChild(stats([['Account balance', fmt(S.savings)], ['Fee per withdrawal', fmt(AL.Econ.ATM_FEE)]]));
      [5000, 20000].forEach((a) => body.appendChild(mk('Withdraw ' + fmt(a), 'Fee ' + fmt(AL.Econ.ATM_FEE), fmt(a), 'pay', () => { AL.Econ.atm(a); renderSheet(); }, S.savings < a + AL.Econ.ATM_FEE)));
      body.appendChild(mk('Withdraw everything', 'Fee ' + fmt(AL.Econ.ATM_FEE), fmt(Math.max(0, S.savings - AL.Econ.ATM_FEE)), 'pay', () => { AL.Econ.atm('all'); renderSheet(); }, S.savings <= AL.Econ.ATM_FEE));
      body.appendChild(note('Deposits are made inside the bank in the CBD.'));
    },
    park(v, body) {
      body.appendChild(note('No room yet? The park boys will let you sleep on a bench for a small fee. You wake up with at least 60 energy.'));
      body.appendChild(mk('Sleep here till morning', 'Pay up to ₦300 to the park boys', '₦300', 'cost', () => { closeSheet(); AL.Econ.sleep({ park: true }); }));
    },
  };
  const VENUE_TITLES = { taxi: 'Taxi & bus park', jobs: 'Job post', food: 'Food spot', estate: 'Estate agent', biz: 'Business office', bank: 'Capital Trust Bank', atm: 'ATM', park: 'Area 1 motor park', shop: 'Shops', invest: 'Abuja Securities House', clinic: 'Garki General Hospital', work: 'Offices', worship: 'Place of worship' };
  UI.parkMode = 'taxi';
  /* salaried jobs based at this place: apply, or start your shift */
  function careerSection(v, body) {
    const here = AL.CAREERS.filter((c) => c.at === v.district && c.venue === v.type);
    if (!here.length) return;
    body.appendChild(h3('Careers here'));
    const cur = AL.Life.career();
    here.forEach((c) => {
      if (cur && cur.id === c.id) {
        const ok = AL.Life.canWork(c);
        body.appendChild(mk('Start your shift · ' + c.title, ok === true ? AL.Life.shiftText(c) + ' · −' + c.en + ' energy · level ' + AL.S.career.lvl : ok, fmt(AL.Life.careerPay(c, AL.S.career.lvl)), 'pay', () => { closeSheet(); AL.Life.workShift(); }, ok !== true));
      } else {
        const locked = AL.S.xp < c.req;
        body.appendChild(mk('Apply: ' + c.title, (locked ? 'Needs ' + c.req + ' hustle points · ' : '') + AL.Life.shiftText(c) + ', ' + AL.Life.daysText(c) + (cur ? ' · replaces your current job' : ''), fmt(c.pay) + '/shift', 'pay', () => { AL.Life.apply(c); renderSheet(); }, locked));
      }
    });
  }

  let sheetVenue = null;
  function openSheet(v) {
    sheetVenue = v;
    const vt = AL.VENUE_TYPES[v.type];
    $('sheetBadge').textContent = vt.sign || '•'; $('sheetBadge').style.background = vt.color;
    const loc = v.loc || (AL.Sim.locations.find((l) => l.venueIndex === v.index));
    $('sheetTitle').textContent = loc ? loc.name : VENUE_TITLES[v.type] + ' · ' + AL.D[v.district].name;
    const bz = loc && AL.Sim.biz[loc.id];
    $('sheetSub').textContent = (vt.hours ? AL.hoursText(vt.hours) : 'Open 24 hours') + (bz ? ' · ' + bz.staff + ' staff · ' + bz.customers + ' customers today' : '');
    renderSheet();
    $('sheet').hidden = false;
    AL.Player.char.setState('interact'); setTimeout(() => { if (!AL.busy && !AL.Player.sitting && AL.Player.speed < 0.3) AL.Player.char.setState('idle'); }, 900);
  }
  function renderSheet() {
    if (!sheetVenue) return;
    const body = $('sheetBody'); body.innerHTML = '';
    VENUE_PANELS[sheetVenue.type](sheetVenue, body);
  }
  function closeSheet() { $('sheet').hidden = true; sheetVenue = null; }
  UI.closeSheet = closeSheet; UI.renderSheet = renderSheet;
  AL.on('change', () => { if (sheetVenue) renderSheet(); });

  /* ---- business naming ---- */
  let bizPending = null;
  function askBizName(b) {
    if (AL.S.cash < b.price) return AL.toast('You need ' + fmt(b.price - AL.S.cash) + ' more cash to start a ' + b.name.toLowerCase() + '.');
    bizPending = b;
    $('bizTitle').textContent = 'Start a ' + b.name.toLowerCase() + ' in ' + AL.D[b.at].name;
    $('bizInfo').textContent = 'Costs ' + fmt(b.price) + '. Earns about ' + fmt(AL.bizProfit(b, 1)) + ' every night before tax.';
    $('bizName').value = (AL.cleanName(AL.S.name) + ' ' + b.name).slice(0, 28);
    $('bizOv').hidden = false; $('bizName').focus();
  }

  /* ---- register every venue + landmark as an interactable ---- */
  UI.registerVenues = () => {
    AL.City.venues.forEach((v, i) => {
      const p = AL.City.venueWorld(v);
      const vt = AL.VENUE_TYPES[v.type];
      const R = { bank: 7, taxi: 4.5, shop: 6.5, invest: 6.5, clinic: 6.5, park: 4.5 };
      const base = { id: 'v' + i + '-' + v.type, pos: { x: p.x, z: p.z }, r: R[v.type] || 4 };
      if (v.type === 'bench') {
        AL.Interact.add({ ...base, r: 2.2, verb: 'Sit down', title: () => 'Bench', hidden: () => !!AL.Player.sitting,
          use: () => AL.Player.sitAt(p.x, p.z + 0.12, 0) });
        return;
      }
      if (v.type === 'home') {
        AL.Interact.add({ ...base, verb: 'Enter home', title: () => { const r = AL.residence(); return r ? 'Your ' + r.name.toLowerCase() : 'Home'; },
          sub: () => { const r = AL.residence(); return r ? r.T.label + ' · ' + '★'.repeat(r.T.stars) : ''; },
          hidden: () => { const r = AL.residence(); return !r || r.at !== v.district; }, use: () => AL.Home.open() });
        return;
      }
      AL.Interact.add({
        ...base,
        verb: () => vt.verb,
        title: () => VENUE_TITLES[v.type],
        sub: () => (vt.hours ? AL.hoursText(vt.hours) : ''),
        enabled: () => (AL.isOpen(vt.hours) ? true : 'Closed now · ' + AL.hoursText(vt.hours)),
        use: () => openSheet({ ...v, index: i }),
      });
    });
    AL.LANDMARKS.forEach((l) => {
      const r = l.id === 'asorock' ? 70 : l.id === 'airport' ? 55 : l.id === 'stadium' ? 75 : l.id === 'eagle' || l.id === 'millennium' ? 50 : 42;
      AL.Interact.add({
        id: 'lm-' + l.id, pos: { x: l.x * AL.W, z: l.z * AL.W }, r, priority: -1,
        verb: () => (l.id === 'mosque' ? 'Visit the mosque' : l.id === 'ecwa' ? 'Visit the centre' : AL.S.visited.includes(l.id) ? 'Take another photo' : 'Take a photo'),
        title: () => l.name, sub: () => (AL.S.visited.includes(l.id) ? 'Visited' : 'New landmark'),
        verb2: null,
        use: () => {
          if (l.id === 'mosque' || l.id === 'ecwa') return openSheet({ type: 'worship', district: AL.Sim.nearestDistrict(l.x, l.z), landmark: l, mx: l.x, mz: l.z, far: r + 10, loc: AL.Sim.get('lm-' + l.id) });
          landmarkPhoto(l);
        },
      });
    });
  };
  /* close the panel when the player walks away from it */
  function landmarkPhoto(l) {
    const first = !AL.S.visited.includes(l.id);
    if (first) { AL.S.visited.push(l.id); AL.S.energy = Math.min(100, AL.S.energy + 5); AL.Life.mood(8); AL.log('Visited ' + l.name + '. ' + l.info); }
    AL.toast(first ? 'New landmark: ' + l.name + ' (+5 energy, +8 happiness)' : l.info, first ? 'good' : '');
    AL.emit('activity', { anim: 'wave', secs: 1.6, label: 'Snapping a photo at ' + l.name });
    AL.commit();
  }
  UI.tick = () => {
    if (!sheetVenue) return;
    const p = AL.City.venueWorld(sheetVenue), P = AL.Player.pos;
    if (Math.hypot(p.x - P.x, p.z - P.z) > (sheetVenue.far || 9)) closeSheet();
  };

  /* ---- NPC dialogue ---- */
  function rel(n) { return AL.S.rel[(n.relId || n.id)]; }
  function openTalk(n) {
    UI.talkingTo = n; n.talking = true;
    closeSheet();
    const P = AL.Player; P.standUp();
    P.facing = Math.atan2(n.root.position.x - P.pos.x, n.root.position.z - P.pos.z);
    P.char.setState('talk');
    $('dlgAvatar').textContent = n.first.charAt(0);
    $('dlgName').textContent = n.name; $('dlgRole').textContent = n.role + ' · lives in ' + AL.D[n.home].name;
    const r = rel(n);
    say(r ? AL.pick(['Ah, ' + AL.cleanName(AL.S.name) + '! Good to see you again.', 'My person! How body?', 'You again! Wetin dey happen?']) : AL.pick(AL.GREETINGS[AL.phase()]));
    renderOpts(n);
    $('dialog').hidden = false;
  }
  function say(t) { $('dlgSay').textContent = t; }
  function heart(n) { const r = rel(n); $('dlgHeart').textContent = r ? 'Friendship ' + r.f + '/100' : 'Just met'; }
  function bump(n, by) {
    const S = AL.S; const r = S.rel[(n.relId || n.id)] || (S.rel[(n.relId || n.id)] = { name: n.name, role: n.role, f: 0, met: AL.day() });
    const before = r.f; r.f = Math.min(100, r.f + by);
    if (before === 0) AL.log('Met ' + n.name + ', a ' + n.role.toLowerCase() + '.');
    if (before < 50 && r.f >= 50) { AL.log(n.name + ' now counts you as a friend.'); AL.toast(n.first + ' is now your friend', 'good'); }
    AL.commit();
  }
  function renderOpts(n) {
    heart(n);
    const box = $('dlgOpts'); box.innerHTML = '';
    const opt = (label, fn, primary) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'btn' + (primary ? ' primary' : ''); b.textContent = label; b.onclick = fn; box.appendChild(b); };
    const today = AL.day();
    const r = rel(n);
    opt(r ? 'Catch up' : 'Introduce yourself', () => {
      const already = r && r.last === today;
      bump(n, already ? 1 : 6); AL.S.rel[(n.relId || n.id)].last = today;
      say(already ? 'We don talk today already o, but I no mind.' : AL.pick(['Nice one. I am ' + n.first + '. I work as a ' + n.role.toLowerCase() + ' in ' + AL.D[n.work].name + '.', 'Abuja is sweet when you get people. Make we dey see.', 'You be correct person. Na so we go dey.']));
      renderOpts(n);
    }, true);
    opt('Ask about work', () => {
      bump(n, 2);
      const j = AL.JOBS.filter((x) => AL.S.xp >= x.req).sort((a, b) => b.pay - a.pay)[0];
      say(j ? 'If I were you, I would try ' + j.name.toLowerCase() + ' in ' + AL.D[j.at].name + '. Look for the green JOBS kiosk on the plaza.' : 'Start small. The POS stand in Garki always needs hands.');
      renderOpts(n);
    });
    opt('What is good around here?', () => {
      const here = AL.Player.district() || n.at;
      const f = AL.FOOD.find((x) => x.at === here);
      say(f ? 'Try the ' + f.name.toLowerCase() + ' at the CHOP kiosk. E go sweet you.' : AL.D[here] ? AL.D[here].tag : 'Abuja get everything, you just need to find it.');
      renderOpts(n);
    });
    opt('Bye', closeTalk);
  }
  function closeTalk() {
    const n = UI.talkingTo; if (n) n.talking = false; UI.talkingTo = null;
    $('dialog').hidden = true; AL.Player.char.setState('idle'); AL.Interact.refresh();
  }
  AL.on('talk', openTalk);
  UI.closeTalk = closeTalk;
  UI.tickTalk = () => {
    const n = UI.talkingTo; if (!n) return;
    if (Math.hypot(n.root.position.x - AL.Player.pos.x, n.root.position.z - AL.Player.pos.z) > 6) closeTalk();
  };

  UI.bind = () => {
    $('sheetClose').onclick = closeSheet;
    $('bizForm').addEventListener('submit', (e) => {
      e.preventDefault(); const b = bizPending; if (!b) return;
      AL.Econ.startBiz(b, $('bizName').value); $('bizOv').hidden = true; bizPending = null; renderSheet();
    });
    $('bizCancel').onclick = () => { $('bizOv').hidden = true; bizPending = null; };
    window.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape') return;
      if (!$('bizOv').hidden) { $('bizOv').hidden = true; return; }
      if (!$('dialog').hidden) { closeTalk(); return; }
      if (!$('homeOv').hidden) { AL.Home.close(); return; }
      if (!$('phone').hidden) { AL.emit('toggle-phone'); return; }
      if (!$('sheet').hidden) { closeSheet(); return; }
      if (AL.Player.cam.mapView) AL.emit('toggle-map');
    });
  };
  AL.UI = UI;
})(window.AL);
