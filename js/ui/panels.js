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
      body.appendChild(note('Pick where you want to go. Fares depend on distance. You can also just walk.'));
      const from = v.district;
      AL.DKEYS.flat().filter((k) => k !== from).map((k) => ({ k, ...AL.Econ.fare(from, k) })).sort((a, b) => a.dist - b.dist).forEach((o) => {
        body.appendChild(mk(AL.D[o.k].name, AL.D[o.k].tag, fmt(o.fare), 'cost', () => { closeSheet(); AL.Econ.taxi(o.k); }, AL.S.cash < o.fare));
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
      AL.HOMES.filter((h) => h.at === v.district).forEach((h) => {
        const own = S.homes.includes(h.id), price = AL.priceOf(h), l = AL.left(h);
        const sub = own ? 'You own this · earns ' + fmt(AL.paidFor(h.id) * AL.RENT_RATE) + ' rent nightly'
          : (l <= 0 ? 'Sold out. All ' + h.stock + ' units have owners.' : l + ' of ' + h.stock + ' left · earns ' + fmt(price * AL.RENT_RATE) + ' rent nightly');
        body.appendChild(mk(h.name + ' in ' + AL.D[h.at].name, sub, own ? '<span class="owned">OWNED</span>' : (l <= 0 ? 'SOLD OUT' : fmt(price)), 'cost', () => { AL.Econ.buyHome(h); renderSheet(); }, own || l <= 0));
      });
      body.appendChild(note('Prices rise 5% every time a unit sells. Your home gives you a place to sleep, full energy and nightly rent.'));
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
      body.appendChild(note('Transfers, loans, salary accounts and statements are coming with the full banking update.'));
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
  const VENUE_TITLES = { taxi: 'Taxi rank', jobs: 'Job post', food: 'Food spot', estate: 'Estate agent', biz: 'Business office', bank: 'Capital Trust Bank', atm: 'ATM', park: 'Area 1 motor park' };

  let sheetVenue = null;
  function openSheet(v) {
    sheetVenue = v;
    const vt = AL.VENUE_TYPES[v.type];
    $('sheetBadge').textContent = vt.sign || '•'; $('sheetBadge').style.background = vt.color;
    $('sheetTitle').textContent = VENUE_TITLES[v.type] + ' · ' + AL.D[v.district].name;
    $('sheetSub').textContent = vt.hours ? AL.hoursText(vt.hours) : 'Open 24 hours';
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
      const base = { id: 'v' + i + '-' + v.type, pos: { x: p.x, z: p.z }, r: v.type === 'bank' ? 7 : v.type === 'taxi' ? 4.5 : 3.4 };
      if (v.type === 'bench') {
        AL.Interact.add({ ...base, r: 2.2, verb: 'Sit down', title: () => 'Bench', hidden: () => !!AL.Player.sitting,
          use: () => AL.Player.sitAt(p.x, p.z + 0.12, 0) });
        return;
      }
      if (v.type === 'home') {
        AL.Interact.add({ ...base, verb: 'Enter home', title: () => { const h = AL.HOMES.find((x) => x.at === v.district && AL.S.homes.includes(x.id)); return h ? 'Your ' + h.name.toLowerCase() : 'Home'; },
          hidden: () => !AL.HOMES.some((h) => h.at === v.district && AL.S.homes.includes(h.id)), use: () => AL.Home.open() });
        return;
      }
      AL.Interact.add({
        ...base,
        verb: () => vt.verb,
        title: () => VENUE_TITLES[v.type],
        sub: () => (vt.hours ? AL.hoursText(vt.hours) : ''),
        enabled: () => (AL.isOpen(vt.hours) ? true : 'Closed now · ' + AL.hoursText(vt.hours)),
        use: () => openSheet(v),
      });
    });
    AL.LANDMARKS.forEach((l) => {
      const r = l.id === 'asorock' ? 70 : l.id === 'airport' ? 55 : l.id === 'stadium' ? 75 : l.id === 'eagle' || l.id === 'millennium' ? 50 : 42;
      AL.Interact.add({
        id: 'lm-' + l.id, pos: { x: l.x * AL.W, z: l.z * AL.W }, r, priority: -1,
        verb: () => (AL.S.visited.includes(l.id) ? 'Take another photo' : 'Take a photo'),
        title: () => l.name, sub: () => (AL.S.visited.includes(l.id) ? 'Visited' : 'New landmark'),
        use: () => {
          const first = !AL.S.visited.includes(l.id);
          if (first) { AL.S.visited.push(l.id); AL.S.energy = Math.min(100, AL.S.energy + 5); AL.log('Visited ' + l.name + '. ' + l.info); }
          AL.toast(first ? 'New landmark: ' + l.name + ' (+5 energy)' : l.info, first ? 'good' : '');
          AL.emit('activity', { anim: 'wave', secs: 1.6, label: 'Snapping a photo at ' + l.name });
          AL.commit();
        },
      });
    });
  };
  /* close the panel when the player walks away from it */
  UI.tick = () => {
    if (!sheetVenue) return;
    const p = AL.City.venueWorld(sheetVenue), P = AL.Player.pos;
    if (Math.hypot(p.x - P.x, p.z - P.z) > 9) closeSheet();
  };

  /* ---- NPC dialogue ---- */
  function rel(n) { return AL.S.rel[n.id]; }
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
    const S = AL.S; const r = S.rel[n.id] || (S.rel[n.id] = { name: n.name, role: n.role, f: 0, met: AL.day() });
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
      bump(n, already ? 1 : 6); AL.S.rel[n.id].last = today;
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
