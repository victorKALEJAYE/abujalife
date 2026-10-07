/* Abuja Life — the player's life: home and rent, salaried career, bank
   (transactions, transfers, loans, credit score), shopping and deliveries,
   inventory and wardrobe, investments, messages, happiness and health.
   Every action updates the central player profile (AL.S) and commits. */
(function (AL) {
  'use strict';
  const L = {};
  const S = () => AL.S;
  const fmt = AL.fmt;

  /* ---------- messages + transactions ---------- */
  AL.msg = (from, text, kind) => {
    const s = S(); s.msgs.unshift({ from, text, kind: kind || 'info', day: AL.day(), time: AL.clock(), read: false }); s.msgs = s.msgs.slice(0, 60);
    AL.emit('msg', { from, text });
  };
  AL.unread = () => S().msgs.filter((m) => !m.read).length;
  AL.tx = (desc, amt) => { const s = S(); s.tx.unshift({ day: AL.day(), time: AL.clock(), desc, amt: Math.round(amt), bal: Math.round(s.savings) }); s.tx = s.tx.slice(0, 80); };
  /* pay from cash first, then by card/transfer from the bank. returns the method used or null */
  L.pay = (amount, desc, opts = {}) => {
    const s = S();
    if (!opts.bankOnly && s.cash >= amount) { s.cash -= amount; return 'cash'; }
    if (s.savings >= amount) { s.savings -= amount; AL.tx(desc, -amount); return 'bank'; }
    if (!opts.bankOnly && s.cash + s.savings >= amount) { const fromBank = amount - s.cash; s.cash = 0; s.savings -= fromBank; AL.tx(desc, -fromBank); return 'split'; }
    return null;
  };
  L.credit = (amount, desc) => { S().savings += amount; AL.tx(desc, amount); };
  L.mood = (by) => { const s = S(); s.happy = AL.clamp(s.happy + by, 0, 100); };

  /* ---------- housing ---------- */
  L.startRental = (r) => {
    const s = S();
    const cost = Math.round(r.rent * (1 + AL.AGENT_FEE));
    const cur = AL.residence();
    if (cur && cur.kind === 'rent' && cur.id === r.id) return AL.toast('You already live here.');
    const how = L.pay(cost, 'Rent + agent fee: ' + r.name + ', ' + AL.D[r.at].name);
    if (!how) return AL.toast('You need ' + fmt(cost) + ' (first week plus 10% agent fee).');
    s.home = { kind: 'rent', id: r.id, paidUntil: AL.day() + 6, arrears: 0 };
    AL.log('Moved into a ' + r.name.toLowerCase() + ' in ' + AL.D[r.at].name + ' for ' + fmt(r.rent) + ' a week.');
    AL.msg('Urban Nest Realty', 'Welcome to your new ' + r.name.toLowerCase() + ' in ' + AL.D[r.at].name + '. Rent of ' + fmt(r.rent) + ' is due every 7 days and is taken from your bank account.', 'home');
    L.mood(6); AL.commit(); AL.emit('residence');
  };
  L.moveIntoOwned = (h) => {
    const s = S(); if (!s.homes.includes(h.id)) return;
    s.home = { kind: 'own', id: h.id };
    AL.log('Moved into your ' + h.name.toLowerCase() + ' in ' + AL.D[h.at].name + '. No more rent!');
    L.mood(10); AL.commit(); AL.emit('residence');
  };
  L.moveOut = () => {
    const s = S(); const r = AL.residence(); if (!r) return;
    s.home = null; AL.log('Moved out of your ' + r.name.toLowerCase() + '.');
    AL.commit(); AL.emit('residence');
  };
  L.prepayRent = () => {
    const s = S(); const r = AL.residence(); if (!r || r.kind !== 'rent') return;
    if (!L.pay(r.rent, 'Rent prepaid: ' + r.name, { bankOnly: false })) return AL.toast('You need ' + fmt(r.rent) + ' to prepay a week.');
    s.home.paidUntil += 7; s.home.arrears = 0; AL.log('Prepaid a week of rent. Paid until day ' + s.home.paidUntil + '.');
    AL.commit();
  };
  function rentDue() {
    const s = S(); const r = AL.residence(); if (!r || r.kind !== 'rent') return;
    while (AL.day() > s.home.paidUntil) {
      const how = L.pay(r.rent, 'Rent: ' + r.name + ', ' + AL.D[r.at].name);
      if (how) {
        s.home.paidUntil += 7; s.home.arrears = 0; s.credit = Math.min(850, s.credit + 3);
        AL.msg('Landlord', 'Rent of ' + fmt(r.rent) + ' received for your ' + r.name.toLowerCase() + '. Next due on day ' + (s.home.paidUntil + 1) + '.', 'home');
      } else {
        s.home.arrears = (s.home.arrears || 0) + 1; s.credit = Math.max(300, s.credit - 15);
        if (s.home.arrears >= 3) {
          AL.msg('Landlord', 'You are 3 days behind on rent. You have been evicted. Your things are with the caretaker.', 'warn');
          AL.log('Evicted from your ' + r.name.toLowerCase() + ' for unpaid rent.'); s.home = null; L.mood(-20); s.credit = Math.max(300, s.credit - 40);
          AL.emit('residence');
        } else AL.msg('Landlord', 'Your rent of ' + fmt(r.rent) + ' is overdue (' + s.home.arrears + ' day' + (s.home.arrears > 1 ? 's' : '') + '). Pay soon or you will be evicted.', 'warn');
        break;
      }
    }
  }

  /* ---------- careers ---------- */
  L.career = () => { const c = S().career; return c ? AL.CAREERS.find((x) => x.id === c.id) : null; };
  L.careerPay = (c, lvl) => Math.round(c.pay * (1 + 0.1 * ((lvl || 1) - 1)));
  L.apply = (c) => {
    const s = S();
    if (s.xp < c.req) return AL.toast('You need ' + c.req + ' hustle points to apply. You have ' + s.xp + '.');
    if (s.career && s.career.id === c.id) return AL.toast('You already work here.');
    const old = L.career();
    s.career = { id: c.id, lvl: 1, shifts: 0, lastShift: 0, hired: AL.day() };
    AL.log('Hired as ' + c.title.toLowerCase() + ' at ' + c.employer + (old ? ' (left ' + old.employer + ')' : '') + '.');
    AL.msg(c.employer, 'Congratulations, you got the job! Shifts are ' + shiftText(c) + ', ' + daysText(c) + '. Pay is ' + fmt(c.pay) + ' a shift, paid straight into your bank account.', 'job');
    L.mood(8); AL.commit();
  };
  L.quit = () => { const c = L.career(); if (!c) return; S().career = null; AL.log('Resigned from ' + c.employer + '.'); AL.commit(); };
  const hh = (x) => AL.pad(Math.floor(x % 24)) + ':' + AL.pad(Math.round((x % 1) * 60));
  function shiftText(c) { return hh(c.start) + '–' + hh(c.end); }
  function daysText(c) { return c.days.length === 7 ? 'every day' : c.days.length === 6 ? 'Monday to Saturday' : 'Monday to Friday'; }
  L.shiftText = shiftText; L.daysText = daysText;
  L.canWork = (c) => {
    const s = S();
    if (!c.days.includes(AL.weekday()) && !(c.end > 24 && AL.hour() < c.end - 24)) return 'No shift today (' + daysText(c) + ').';
    if (!AL.isOpen([c.start, c.end])) return 'Your shift is ' + shiftText(c) + '.';
    if (s.career.lastShift === AL.day()) return 'You already worked today.';
    if (s.energy < c.en) return 'Too tired for a shift. Eat or sleep first.';
    return true;
  };
  L.workShift = () => {
    const s = S(), c = L.career(); if (!c) return;
    const ok = L.canWork(c); if (ok !== true) return AL.toast(ok);
    const h = AL.hour(), end = c.end > 24 && h < c.start ? c.end - 24 : c.end;
    const hrs = Math.max(1, end - h), frac = Math.min(1, hrs / (c.end - c.start));
    const pay = Math.round(L.careerPay(c, s.career.lvl) * frac);
    s.t += hrs; s.energy = Math.max(0, s.energy - c.en * frac); s.xp += 1;
    s.career.shifts += 1; s.career.lastShift = AL.day();
    L.credit(pay, 'Salary: ' + c.employer);
    AL.msg('Capital Trust Bank', 'Credit alert: ' + fmt(pay) + ' salary from ' + c.employer + '. Balance ' + fmt(s.savings) + '.', 'bank');
    AL.log('Worked a ' + Math.round(hrs) + '-hour shift as ' + c.title.toLowerCase() + '. Salary ' + fmt(pay) + ' paid to your bank.');
    if (s.career.shifts % 10 === 0) { s.career.lvl += 1; AL.msg(c.employer, 'You have been promoted to level ' + s.career.lvl + '. Your pay is now ' + fmt(L.careerPay(c, s.career.lvl)) + ' a shift.', 'job'); L.mood(10); }
    AL.emit('activity', { anim: c.venue === 'clinic' || c.id === 'security' ? 'work' : 'interact', secs: 3, label: 'Working your shift at ' + c.employer + '…' });
    AL.commit();
  };

  /* ---------- bank: transfers + loans ---------- */
  L.transfer = (relId, amount) => {
    const s = S(), r = s.rel[relId]; if (!r) return;
    if (s.savings < amount) return AL.toast('Not enough in your account.');
    s.savings -= amount; AL.tx('Transfer to ' + r.name, -amount);
    r.f = Math.min(100, r.f + Math.max(2, Math.round(amount / 5000)));
    AL.msg(r.name, AL.pick(['Ah! Thank you so much o. God bless you.', 'I don see am. You too much!', 'Thank you, my person. I owe you one.']), 'friend');
    L.mood(3); AL.commit();
  };
  L.loanLimit = () => AL.creditLimit(S().credit);
  L.borrow = (amount) => {
    const s = S();
    if (s.loan) return AL.toast('Repay your current loan first.');
    if (amount > L.loanLimit()) return AL.toast('Your limit is ' + fmt(L.loanLimit()) + '.');
    s.loan = { bal: amount, due: AL.day() + AL.LOAN.termDays, taken: AL.day() };
    L.credit(amount, AL.LOAN.lender + ' disbursement');
    AL.msg(AL.LOAN.lender, 'Your loan of ' + fmt(amount) + ' has been paid into your account. 1% interest a day. Repay by day ' + s.loan.due + ' to protect your credit score.', 'bank');
    AL.commit();
  };
  L.repay = (amount) => {
    const s = S(); if (!s.loan) return;
    const a = Math.min(amount, s.loan.bal, s.savings);
    if (a <= 0) return AL.toast('Not enough in your account to repay.');
    s.savings -= a; s.loan.bal -= a; AL.tx('Loan repayment', -a);
    if (s.loan.bal <= 1) { const late = AL.day() > s.loan.due; s.loan = null; s.credit = Math.min(850, s.credit + (late ? 5 : 25)); AL.msg(AL.LOAN.lender, 'Loan fully repaid. ' + (late ? 'It was late, but thank you.' : 'Your credit score went up.'), 'bank'); }
    AL.commit();
  };
  function loanDaily() {
    const s = S(); if (!s.loan) return;
    s.loan.bal = Math.round(s.loan.bal * (1 + AL.LOAN.dailyRate));
    if (AL.day() > s.loan.due) { s.credit = Math.max(300, s.credit - 6); AL.msg(AL.LOAN.lender, 'Your loan is overdue. Balance ' + fmt(s.loan.bal) + '. Your credit score is falling.', 'warn'); }
  }

  /* ---------- shopping, deliveries, inventory, wardrobe ---------- */
  L.buy = (item, channel) => {
    const s = S();
    const online = channel === 'online';
    const total = item.price + (online ? AL.DELIVERY_FEE : 0);
    const how = L.pay(total, (online ? 'Online order: ' : 'Purchase: ') + item.name, { bankOnly: online });
    if (!how) return AL.toast(online ? 'Not enough in your bank account (' + fmt(total) + ' with delivery).' : 'You need ' + fmt(total) + '.');
    if (online) {
      s.deliveries.push({ id: item.id, day: AL.day() + 1 });
      AL.msg('ShopNaija', 'Order confirmed: ' + item.name + '. Delivery arriving tomorrow morning to ' + (AL.residence() ? 'your home' : 'Area 1 motor park') + '.', 'shop');
      AL.toast('Ordered: ' + item.name + '. Arriving tomorrow.', 'good');
    } else { receive(item); AL.toast('Bought: ' + item.name, 'good'); }
    AL.log((online ? 'Ordered ' : 'Bought ') + item.name.toLowerCase() + ' for ' + fmt(total) + '.');
    AL.commit();
  };
  function receive(item) {
    const s = S();
    if (item.outfit) { if (!s.wardrobe.includes(item.outfit)) s.wardrobe.push(item.outfit); }
    else if (item.uses) { s.inv[item.id] = (s.inv[item.id] || 0) + item.uses; }
    else { s.items.push(item.id); }
    if (item.joy) L.mood(item.joy);
  }
  function deliveries() {
    const s = S(); const due = s.deliveries.filter((d) => d.day <= AL.day()); if (!due.length) return;
    s.deliveries = s.deliveries.filter((d) => d.day > AL.day());
    due.forEach((d) => { const it = AL.SHOP_ITEMS.find((x) => x.id === d.id); if (it) receive(it); });
    AL.msg('ShopNaija', due.length + ' order' + (due.length > 1 ? 's' : '') + ' delivered: ' + due.map((d) => (AL.SHOP_ITEMS.find((x) => x.id === d.id) || {}).name).join(', ') + '.', 'shop');
  }
  L.eatHome = (id) => {
    const s = S(), it = AL.SHOP_ITEMS.find((x) => x.id === id); if (!it || !(s.inv[id] > 0)) return;
    if (s.energy >= 100) return AL.toast('You are already full.');
    s.inv[id] -= 1; if (!s.inv[id]) delete s.inv[id];
    s.energy = Math.min(100, s.energy + it.food); s.t += 0.5; L.mood(2);
    AL.log('Cooked and ate ' + it.name.toLowerCase() + ' at home (+' + it.food + ' energy).'); AL.commit();
  };
  L.wear = (outfit, color) => {
    const s = S(); if (!s.wardrobe.includes(outfit)) return;
    s.look = AL.cleanLook({ ...s.look, outfit, color: color || s.look.color });
    AL.Player.rebuild(); AL.log('Changed into ' + (AL.OUTFITS.find((o) => o[0] === outfit) || [0, outfit])[1].toLowerCase() + '.'); AL.commit();
  };

  /* ---------- investments ---------- */
  L.buyStock = (sym, qty) => {
    const s = S(), p = s.market.p[sym], cost = Math.round(p * qty);
    if (!AL.Sim.marketOpen()) return AL.toast('The exchange is closed. Trading hours are 09:00–17:00, Monday to Friday.');
    if (qty <= 0) return;
    if (s.savings < cost) return AL.toast('You need ' + fmt(cost) + ' in your bank account.');
    s.savings -= cost; AL.tx('Bought ' + qty + ' ' + sym, -cost);
    const h = s.portfolio[sym] || { qty: 0, cost: 0 }; h.qty += qty; h.cost += cost; s.portfolio[sym] = h;
    AL.log('Bought ' + qty + ' shares of ' + sym + ' for ' + fmt(cost) + '.'); AL.commit();
  };
  L.sellStock = (sym, qty) => {
    const s = S(), h = s.portfolio[sym]; if (!h || h.qty <= 0) return;
    if (!AL.Sim.marketOpen()) return AL.toast('The exchange is closed. Trading hours are 09:00–17:00, Monday to Friday.');
    qty = Math.min(qty, h.qty); const val = Math.round(s.market.p[sym] * qty);
    const costPart = Math.round((h.cost * qty) / h.qty);
    h.qty -= qty; h.cost -= costPart; if (h.qty <= 0) delete s.portfolio[sym];
    L.credit(val, 'Sold ' + qty + ' ' + sym);
    AL.log('Sold ' + qty + ' shares of ' + sym + ' for ' + fmt(val) + ' (' + (val >= costPart ? 'gain ' : 'loss ') + fmt(Math.abs(val - costPart)) + ').'); AL.commit();
  };
  L.portfolioValue = (s = S()) => (s.market ? Object.entries(s.portfolio || {}).reduce((a, [sym, h]) => a + (s.market.p[sym] || 0) * h.qty, 0) : 0);
  function dividends() {
    const s = S(); let total = 0;
    Object.entries(s.portfolio).forEach(([sym, h]) => { const st = AL.STOCKS.find((x) => x.sym === sym); if (st && st.div) total += Math.round(h.qty * s.market.p[sym] * st.div); });
    if (total > 0) { L.credit(total, 'Weekly dividends'); AL.msg('Abuja Securities House', 'Dividends of ' + fmt(total) + ' paid into your account.', 'bank'); }
  }

  /* ---------- health, worship, social messages ---------- */
  L.checkup = () => {
    const s = S(); const cost = 8000;
    if (!L.pay(cost, 'Garki General Hospital')) return AL.toast('A check-up costs ' + fmt(cost) + '.');
    s.health = 100; s.energy = Math.min(100, s.energy + 10); s.t += 1;
    AL.log('Had a check-up at Garki General Hospital. Health restored.');
    AL.emit('activity', { anim: 'sit', secs: 2.5, label: 'Seeing the doctor…' }); AL.commit();
  };
  L.worship = (place) => {
    const s = S(); s.worshipDay = s.worshipDay || {};
    if (s.worshipDay[place] === AL.day()) return AL.toast('You already attended today. Come back tomorrow.');
    s.worshipDay[place] = AL.day(); s.t += 1; L.mood(12); s.energy = Math.min(100, s.energy + 5);
    AL.log(place === 'mosque' ? 'Prayed at the National Mosque.' : 'Attended a service at the National Christian Centre.');
    AL.emit('activity', { anim: 'sit', secs: 3, label: place === 'mosque' ? 'Praying…' : 'Attending the service…' }); AL.commit();
  };
  function friendMessages() {
    const s = S();
    const friends = Object.entries(s.rel).filter(([, r]) => r.f >= 25);
    if (!friends.length || Math.random() < 0.5) return;
    const [, r] = AL.pick(friends);
    AL.msg(r.name, AL.pick(['How far? Long time. Make we link up this weekend.', 'There is a party in Wuse on Saturday night. You go come?', 'Abeg, how work dey go?', 'I saw a new suya spot in Jabi. We should try am.', 'Good morning! Hope you slept well.']), 'friend');
  }

  /* ---------- daily + hourly ticks ---------- */
  AL.on('newday', (days) => {
    for (let i = 0; i < Math.min(days, 7); i++) { rentDue(); loanDaily(); }
    deliveries(); AL.Sim.onNewDay(); AL.Sim.marketOpenDay(); AL.Sim.marketNews();
    if (AL.weekday() === 1) dividends();
    const s = S();
    if (s.happy < 20) { s.health = Math.max(0, s.health - 3); }
    friendMessages();
    const c = L.career(); if (c && c.days.includes(AL.weekday())) AL.msg(c.employer, 'Reminder: your shift today is ' + shiftText(c) + ' at ' + AL.D[c.at].name + '.', 'job');
    AL.commit();
  });
  AL.on('hour', () => { AL.Sim.onHour(); AL.Sim.marketTick(); L.mood(-0.6); });
  AL.on('exhausted', () => { S().health = Math.max(0, S().health - 15); L.mood(-10); });

  /* ---------- new players + old saves ---------- */
  L.ensureHome = () => {
    const s = S();
    if (s.home) return;
    const own = AL.bestHome();
    if (own) { s.home = { kind: 'own', id: own.id }; return; }
    s.home = { kind: 'rent', id: 'r-kubwa', paidUntil: AL.day() + 6, arrears: 0 };
    AL.msg('Cousin Emeka', 'I paid the first week of rent on a self-con for you in Kubwa. After that, rent is ' + fmt(15000) + ' a week from your bank account. Try get work quick!', 'home');
  };
  /* net worth includes investments and subtracts debt */
  const baseWorth = AL.worth;
  AL.worth = (s = AL.S) => baseWorth(s) + L.portfolioValue(s) - (s.loan ? Number(s.loan.bal) || 0 : 0);
  AL.Life = L;
})(window.AL);
