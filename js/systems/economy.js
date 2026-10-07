/* Abuja Life — economy actions. Same rules and numbers as the original game
   (jobs, food, property, businesses, bank, furniture, sleep), now triggered
   from places in the world. Each action changes state, then calls AL.commit(). */
(function (AL) {
  'use strict';
  const E = {};
  const S = () => AL.S;
  const fmt = AL.fmt;
  const D = AL.D;

  /* play an activity animation for a few seconds (work, eat, …) */
  function act(anim, secs, label) { AL.emit('activity', { anim, secs, label }); }

  E.work = (j) => {
    const s = S();
    if (AL.busy) return;
    if (!AL.isOpen(j.hours)) return AL.toast(j.name + ' shifts run ' + AL.hoursText(j.hours).replace('Open ', '') + '.');
    if (s.xp < j.req) return AL.toast('You need ' + j.req + ' hustle points for this job.');
    if (s.energy < j.en) return AL.toast('Too tired. Eat something or sleep.');
    const gross = AL.payFor(j), tax = Math.round(gross * AL.TAX_RATE), p = gross - tax;
    s.cash += p; s.taxPaid += tax; s.energy -= j.en; s.t += j.hrs; s.xp += 1;
    s.jobXp[j.id] = (s.jobXp[j.id] || 0) + 1;
    AL.log('Worked as ' + j.name.toLowerCase() + '. Earned ' + fmt(gross) + ', paid ' + fmt(tax) + ' income tax.');
    if (s.jobXp[j.id] % 5 === 0 && s.jobXp[j.id] <= 20) AL.log('Your boss noticed. Pay as ' + j.name.toLowerCase() + ' went up.');
    act(j.anim || 'work', 2.6, 'Working ' + j.hrs + ' hours as ' + j.name.toLowerCase() + '…');
    AL.toast('+' + fmt(p) + ' after tax', 'money');
    AL.commit();
  };
  E.eat = (f) => {
    const s = S();
    if (AL.busy) return;
    if (s.cash < f.cost) return AL.toast('Not enough cash for ' + f.name.toLowerCase() + '.');
    if (s.energy >= 100) return AL.toast('You are already full.');
    s.cash -= f.cost; s.energy = Math.min(100, s.energy + f.en); s.t += 0.5;
    AL.log('Ate ' + f.name.toLowerCase() + ' (+' + f.en + ' energy).');
    act('eat', 2.4, 'Enjoying ' + f.name.toLowerCase() + '…');
    AL.commit();
  };
  E.buyHome = (h) => {
    const s = S();
    if (AL.busy || s.homes.includes(h.id)) return;
    if (AL.left(h) <= 0) return AL.toast('Sold out. Every ' + h.name.toLowerCase() + ' in ' + D[h.at].name + ' has an owner.');
    const price = AL.priceOf(h);
    if (s.cash + s.savings < price) return AL.toast('You need ' + fmt(price - s.cash - s.savings) + ' more across cash and bank.');
    AL.Life.pay(price, 'Property purchase: ' + h.name + ', ' + D[h.at].name); s.homes.push(h.id); s.paid[h.id] = price;
    if (!s.home) s.home = { kind: 'own', id: h.id };
    AL.log('Bought a ' + h.name.toLowerCase() + ' in ' + D[h.at].name + ' for ' + fmt(price) + '. It earns rent every night.');
    AL.toast('Congratulations on your new ' + h.name.toLowerCase() + '!', 'good');
    AL.commit(); AL.emit('homes');
  };
  E.startBiz = (b, name) => {
    const s = S();
    if (s.biz[b.id]) return;
    if (s.cash < b.price) return AL.toast('You need ' + fmt(b.price - s.cash) + ' more cash to start a ' + b.name.toLowerCase() + '.');
    const nm = AL.cleanText(name, 28).trim() || b.name;
    s.cash -= b.price; s.biz[b.id] = { lvl: 1, name: nm, invested: b.price };
    AL.log('Opened ' + nm + ' in ' + D[b.at].name + '. It pays out every night.');
    AL.toast(nm + ' is open for business!', 'good');
    AL.commit(); AL.emit('homes');
  };
  E.upgradeBiz = (b) => {
    const s = S(), v = s.biz[b.id];
    if (AL.busy || !v) return;
    if (v.lvl >= AL.BIZ_MAX_LVL) return AL.toast(v.name + ' is already at the top level.');
    const c = AL.upgradeCost(b, v.lvl);
    if (s.cash < c) return AL.toast('You need ' + fmt(c - s.cash) + ' more cash to expand.');
    s.cash -= c; v.lvl += 1; v.invested += c; s.t += 0.5;
    AL.log('Expanded ' + v.name + ' to level ' + v.lvl + '. Nightly profit is now about ' + fmt(AL.bizProfit(b, v.lvl)) + '.');
    AL.commit();
  };
  E.buyFurn = (f) => {
    const s = S();
    if (!AL.residence()) return AL.toast('Rent or buy a home first.');
    if (s.furn.includes(f.id)) return;
    if (s.cash < f.cost) return AL.toast('You need ' + fmt(f.cost - s.cash) + ' more cash.');
    s.cash -= f.cost; s.furn.push(f.id); AL.log('Bought a ' + f.name.toLowerCase() + ' for your home.');
    AL.commit(); AL.emit('home-changed');
  };
  E.paint = (c) => {
    const s = S();
    if (!AL.residence() || c === s.wall) return;
    if (s.cash < AL.PAINT_COST) return AL.toast('Painting costs ' + fmt(AL.PAINT_COST) + '.');
    s.cash -= AL.PAINT_COST; s.wall = c; AL.log('Repainted your home.');
    AL.commit(); AL.emit('home-changed');
  };
  E.bank = (dir) => {
    const s = S();
    if (dir === 'in') { if (s.cash <= 0) return AL.toast('No cash to deposit.'); const a = s.cash; s.savings += a; s.cash = 0; AL.log('Deposited ' + fmt(a) + ' at the bank.'); }
    else { if (s.savings <= 0) return AL.toast('No savings to withdraw.'); const a = s.savings; s.cash += a; s.savings = 0; AL.log('Withdrew ' + fmt(a) + ' from the bank.'); }
    s.t += 0.25; AL.commit();
  };
  E.ATM_FEE = 35;
  E.atm = (amount) => {
    const s = S();
    const want = amount === 'all' ? s.savings - E.ATM_FEE : amount;
    if (want <= 0 || s.savings < want + E.ATM_FEE) return AL.toast('Not enough in your account for that withdrawal.');
    s.savings -= want + E.ATM_FEE; s.cash += want;
    AL.log('Withdrew ' + fmt(want) + ' at an ATM (' + fmt(E.ATM_FEE) + ' fee).');
    AL.commit();
  };

  /* overnight: interest, business profit, rent; wake at home or at the motor park */
  E.sleep = (opts = {}) => {
    const s = S();
    const best = opts.park ? null : AL.residence();
    const rent = Math.round(AL.homeValue() * AL.RENT_RATE);
    const interest = Math.round(s.savings * AL.INTEREST);
    if (interest > 0) s.savings += interest;
    s.t = AL.day() * 24 + 6;
    if (opts.collapsed) AL.log('You collapsed from exhaustion and woke up the next morning.');
    if (interest > 0) AL.log('Your bank paid ' + fmt(interest) + ' interest on savings.');
    let bizNet = 0, bizTax = 0;
    Object.entries(s.biz).forEach(([id, v]) => {
      const b = AL.BIZ.find((x) => x.id === id); if (!b) return;
      let p = Math.round(AL.bizProfit(b, v.lvl) * (0.8 + Math.random() * 0.4));
      const r = Math.random();
      if (r < 0.08) { const cost = Math.round(p * 0.5); p -= cost; AL.log('NEPA took light at ' + v.name + '. Diesel cost you ' + fmt(cost) + '.'); }
      else if (r < 0.13) { const bonus = Math.round(p * 0.4); p += bonus; AL.log(v.name + ' had a very busy day. Extra ' + fmt(bonus) + ' profit.'); }
      const tax = Math.round(p * AL.TAX_RATE); bizTax += tax; bizNet += p - tax;
    });
    if (bizNet > 0) { s.cash += bizNet; s.taxPaid += bizTax; AL.log('Your businesses made ' + fmt(bizNet) + ' after ' + fmt(bizTax) + ' company tax.'); }
    if (best) {
      s.energy = 100; s.at = best.at; s.cash += rent;
      AL.log('Slept in your ' + best.name.toLowerCase() + '. Rent collected: ' + fmt(rent) + '.');
    } else {
      s.energy = Math.max(s.energy, 60); s.at = 'garki';
      const fee = Math.min(300, s.cash); s.cash -= fee;
      AL.log('Slept at Area 1 motor park and paid ' + fmt(fee) + ' to the park boys. Buy a room for proper rest.');
    }
    AL.emit('slept', { at: s.at, home: !!best });
    AL.commit();
  };

  /* taxi fare between two districts (same formula as before) */
  E.fare = (from, to) => {
    const a = D[from], b = D[to], dist = Math.abs(b.x - a.x) + Math.abs(b.z - a.z);
    return { fare: Math.round((200 + dist * 9) / 50) * 50, hrs: 0.25 + dist / 100, dist };
  };
  E.taxi = (to) => {
    const s = S();
    if (AL.busy || !s.started) return;
    const from = AL.Player ? AL.Player.district() : s.at;
    if (to === from) return AL.toast('You are already in ' + D[to].name + '.');
    const { fare, hrs } = E.fare(from, to);
    if (s.cash < fare) return AL.toast('This ride costs ' + fmt(fare) + '. You can walk there instead.');
    s.cash -= fare; s.energy = Math.max(0, s.energy - 4); s.t += hrs; s.at = to;
    AL.log('Took a taxi to ' + D[to].name + ' for ' + fmt(fare) + '.');
    const r = Math.random();
    if (r < 0.07) { s.t += 1; AL.log('Stuck at a VIO checkpoint for an hour.'); }
    else if (r < 0.12) { s.cash += 2000; AL.log('Found ₦2,000 in your old trouser pocket.'); }
    else if (r < 0.15) { const l = Math.min(1500, s.cash); s.cash -= l; AL.log('The driver had no change. You lost ' + fmt(l) + '.'); }
    AL.commit();
    AL.emit('trip', { from, to });
  };
  AL.Econ = E;
})(window.AL);
