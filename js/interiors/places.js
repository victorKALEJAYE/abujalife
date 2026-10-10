/* Abuja Life — the walk-in places themselves. Each one answers
   "what can the player actually DO here?" with things you walk up to:
     supermarket – shelves → basket → checkout → fridge at home
     fashion     – try clothes on, buy accessories you can see on yourself
     bank        – teller windows, ATMs, loan desk, staff door
     lender      – microfinance loan officer
     club/lounge – bar, dance floor, DJ, VIP section
     dealer      – cars on display, test drive, buy, sell, deliver home */
(function (AL) {
  'use strict';
  const T = AL.T;
  if (!T) return;
  const IN = AL.Interior, K = AL.Kit, fmt = AL.fmt, $ = AL.$;
  const S = () => AL.S;
  const CAT_COLORS = { Drinks: '#2e86c1', Snacks: '#e67e22', 'Fresh food': '#27ae60', Groceries: '#d4ac0d', Household: '#8e44ad', Electronics: '#34495e' };
  const act = (anim, secs, label) => AL.emit('activity', { anim, secs, label });

  /* ---------- shared pieces ---------- */
  function jobsCard(list) {
    AL.Card.show({
      title: 'Careers here', sub: 'Salaried jobs · pay goes to your bank',
      note: 'Work a shift during your hours to earn. Your performance in each shift changes the pay.',
      actions: list.map((c) => {
        const locked = S().xp < c.req;
        return { label: 'Apply: ' + c.title, sub: fmt(AL.Life.monthly(c, 1)) + '/month · ' + AL.Life.shiftText(c) + (locked ? ' · needs ' + c.req + ' hustle points' : ''), disabled: locked, fn: () => AL.Life.apply(c) };
      }),
    });
  }
  function careerSpot(ctx, x, z, type, label) {
    const here = () => AL.CAREERS.filter((c) => c.at === ctx.venue.district && c.venue === type);
    const mine = () => { const c = AL.Life.career(); return c && here().some((h) => h.id === c.id) ? c : null; };
    ctx.spot({ x, z, r: 2.2, hidden: () => !here().length,
      verb: () => (mine() ? 'Start your shift' : 'Ask about jobs'), title: () => label || 'Staff door',
      sub: () => { const c = mine(); if (!c) return here().length + ' job' + (here().length > 1 ? 's' : '') + ' here'; const ok = AL.Life.canWork(c); return ok === true ? AL.Life.shiftText(c) : ok; },
      use: () => (mine() ? AL.Work.shift() : jobsCard(here())) });
  }
  function counter(ctx, x, z, w, d, color, top = '#f4f0e6') { ctx.box(w, 1.0, d, color, x, 0, z); ctx.box(w + 0.1, 0.06, d + 0.1, top, x, 1.0, z, false); }
  function chair(ctx, x, z, rot, color = '#3d4f63') { const c = new T.Group(); c.position.set(x, 0, z); c.rotation.y = rot; ctx.g.add(c); K.box(c, 0.55, 0.45, 0.55, color, 0, 0, 0); K.box(c, 0.55, 0.6, 0.08, color, 0, 0.45, -0.26); return c; }
  function sofa(ctx, x, z, rot, color, len = 2.4) { const c = new T.Group(); c.position.set(x, 0, z); c.rotation.y = rot; ctx.g.add(c); K.box(c, len, 0.45, 0.9, color, 0, 0, 0); K.box(c, len, 0.55, 0.22, color, 0, 0.45, -0.36); [-1, 1].forEach((s) => K.box(c, 0.2, 0.3, 0.9, color, s * (len / 2 - 0.1), 0.45, 0)); return c; }
  function plant(ctx, x, z) { ctx.box(0.5, 0.5, 0.5, '#8a6a3e', x, 0, z, false); const l = K.mesh(K.ICO, K.mat('#3e8e41'), ctx.g); l.position.set(x, 1.0, z); l.scale.set(0.45, 0.6, 0.45); }
  function sitHere(ctx, x, z, face) { const w = ctx.world(x, z); AL.Player.sitAt(w.x, w.z, face); }

  /* ---------- money desks ---------- */
  function tellerCard() {
    AL.Card.show(() => {
      const s = S();
      return {
        title: 'Teller window', sub: 'Capital Trust Bank',
        lines: [['Account balance', fmt(s.savings)], ['Cash on you', fmt(s.cash)]],
        actions: [
          { label: 'Deposit all my cash', sub: fmt(s.cash), primary: true, disabled: s.cash <= 0, keep: true, fn: () => AL.Econ.bank('in') },
          ...[20000, 100000, 500000].map((a) => ({ label: 'Withdraw ' + fmt(a), keep: true, disabled: s.savings < a, fn: () => { s.savings -= a; s.cash += a; AL.tx('Counter withdrawal', -a); AL.toast('+' + fmt(a) + ' cash', 'money'); AL.commit(); } })),
          { label: 'Transfers, history and bills', sub: 'Opens the Bank app', fn: () => AL.Phone.toggle('bank') },
        ],
      };
    });
  }
  function atmCard() {
    AL.Card.show(() => {
      const s = S(), fee = AL.Econ.ATM_FEE;
      return {
        title: 'Capital Trust ATM', sub: 'Fee ' + fmt(fee) + ' per withdrawal',
        lines: [['Account balance', fmt(s.savings)], ['Cash on you', fmt(s.cash)]],
        actions: [5000, 20000, 50000].map((a) => ({ label: 'Withdraw ' + fmt(a), keep: true, disabled: s.savings < a + fee, fn: () => AL.Econ.atm(a) }))
          .concat([{ label: 'Withdraw everything', keep: true, disabled: s.savings <= fee, fn: () => AL.Econ.atm('all') }]),
      };
    });
  }
  /* loan application: pick an amount and term, then the officer decides */
  function loanDesk(lenderId) {
    const L = AL.LENDERS[lenderId];
    const st = { a: 2, t: L.terms.length - 1, result: null };
    AL.Card.show(() => {
      const s = S(), amount = L.amounts[st.a], weeks = L.terms[st.t], q = AL.Credit.quote(lenderId, amount, weeks);
      const mine = AL.Credit.loans().map((l, i) => ({ l, i })).filter((x) => x.l.lender === lenderId);
      const lines = [['Your weekly income', fmt(AL.Credit.weeklyIncome())], ['Credit score', String(s.credit)], ['Job', AL.Life.career() ? AL.Life.career().title : 'None'], ['Existing repayments', fmt(AL.Credit.instalmentsDue()) + '/week']];
      if (mine.length) {
        const l = mine[0].l;
        return { title: L.name, sub: 'Your loan', lines: [['Balance', fmt(l.bal)], ['Weekly repayment', fmt(l.weekly)], ['Weeks left', String(l.left)], ['Missed', String(l.missed)]],
          note: 'Repayments come out of your bank account every Monday morning.',
          actions: [{ label: 'Pay it all off now', sub: fmt(l.bal) + ' from your bank · +20 credit', primary: true, disabled: s.savings < l.bal, fn: () => AL.Credit.payOff(mine[0].i) }] };
      }
      const r = st.result;
      return {
        title: L.name + ' · loan application', sub: 'Interest ' + Math.round(L.rate * 100) + '% per 12 weeks · repaid weekly',
        lines: lines.concat([['You get', fmt(amount)], ['You repay', fmt(q.total) + ' (' + fmt(q.weekly) + '/week × ' + weeks + ')']]),
        note: r ? (r.ok ? 'APPROVED. The officer smiles and slides the papers across.' : 'DECLINED. ' + r.reasons.join(' ') + (r.max >= 50000 && r.reasons.length === 1 && /40%/.test(r.reasons[0]) ? ' You could borrow up to ' + fmt(r.max) + ' over ' + weeks + ' weeks.' : '')) : 'Minimum credit score ' + L.minCredit + '. Repayments may be up to 40% of your weekly income.',
        actions: r && r.ok
          ? [{ label: 'Accept ' + fmt(amount), sub: 'Paid into your bank now', primary: true, fn: () => AL.Credit.take(lenderId, amount, weeks) }, { label: 'Change the amount', keep: true, fn: () => { st.result = null; } }]
          : [
            { label: 'Amount: ' + fmt(amount), sub: 'Change', keep: true, fn: () => { st.a = (st.a + 1) % L.amounts.length; st.result = null; } },
            { label: 'Term: ' + weeks + ' weeks', sub: 'Change', keep: true, fn: () => { st.t = (st.t + 1) % L.terms.length; st.result = null; } },
            { label: 'Apply', sub: 'The officer checks your income and credit', primary: true, keep: true, fn: () => { st.result = AL.Credit.assess(lenderId, amount, weeks); act('talk', 1.2, 'Loan officer reviewing your application…'); } },
          ],
      };
    });
  }

  /* ---------- supermarket ---------- */
  IN.basket = [];
  function basketTotal() { return IN.basket.reduce((a, it) => a + it.price, 0); }
  function basketUI() {
    const chip = $('basketChip'); if (!chip) return;
    chip.hidden = !IN.basket.length;
    $('basketText').textContent = IN.basket.length + ' item' + (IN.basket.length === 1 ? '' : 's') + ' · ' + fmt(basketTotal());
  }
  function checkout(store) {
    AL.Card.show(() => {
      const s = S(), total = basketTotal();
      const counts = {}; IN.basket.forEach((it) => { counts[it.id] = (counts[it.id] || 0) + 1; });
      const lines = Object.entries(counts).map(([id, n]) => { const it = AL.SHOP_ITEMS.find((x) => x.id === id); return [n + ' × ' + it.name, fmt(it.price * n)]; });
      const pay = (how) => {
        if (how === 'cash' ? s.cash < total : s.savings < total) return AL.toast(how === 'cash' ? 'Not enough cash.' : 'Not enough in your bank account.');
        if (how === 'cash') s.cash -= total; else { s.savings -= total; AL.tx('Card payment: ' + store, -total); }
        IN.basket.forEach((it) => AL.Life.receive(it));
        AL.log('Bought ' + IN.basket.length + ' items at ' + store + ' for ' + fmt(total) + '.');
        AL.toast('Paid ' + fmt(total) + '. Groceries go to your fridge at home.', 'good');
        IN.basket = []; basketUI(); act('interact', 1.2, 'Packing your bags…'); AL.commit();
      };
      if (!IN.basket.length) return { title: 'Checkout', sub: store, note: 'Your basket is empty. Walk the aisles and pick things off the shelves.', actions: [] };
      return {
        title: 'Checkout', sub: store, lines: lines.concat([['Total', fmt(total)]]),
        actions: [
          { label: 'Pay with cash', sub: 'You have ' + fmt(s.cash), primary: true, disabled: s.cash < total, fn: () => pay('cash') },
          { label: 'Pay by card', sub: 'Bank ' + fmt(s.savings), disabled: s.savings < total, fn: () => pay('card') },
          { label: 'Empty the basket', keep: true, fn: () => { IN.basket = []; basketUI(); } },
        ],
      };
    });
  }
  IN.define('supermarket', {
    build(ctx) {
      const store = AL.STORES[ctx.venue.district].name;
      const w = 24, d = 18;
      ctx.room({ w, d, floor: '#e9e7e2', wall: '#f5f2ea', trim: '#0b7a4b' });
      ctx.sign(store.toUpperCase(), '#0b7a4b', 0, 3.4, -d / 2 + 0.05, 6);
      ctx.box(w, 0.4, 0.05, '#0b7a4b', 0, 2.6, -d / 2 + 0.03, false);
      const items = AL.SHOP_ITEMS.filter((it) => it.where.includes('supermarket')).sort((a, b) => (a.cat === 'Drinks' ? -1 : 0) - (b.cat === 'Drinks' ? -1 : 0));
      const slots = [];
      // fridges on the back wall
      [-6, -2, 2].forEach((x) => {
        ctx.box(3.2, 2.4, 0.9, '#dfe6ea', x, 0, -d / 2 + 0.5);
        ctx.glow(2.9, 2.0, 0.04, '#cfeefc', x, 0.2, -d / 2 + 0.97);
        for (let y = 0.5; y < 2.2; y += 0.55) ctx.box(2.8, 0.03, 0.05, '#9aa5ae', x, y, -d / 2 + 1.0, false);
        slots.push({ sx: x, sz: -d / 2 + 2.0, px: x, pz: -d / 2 + 0.98, face: 0 });
      });
      // double-sided shelving aisles
      [-8, -3.5, 1, 5.5].forEach((x) => {
        ctx.box(1.0, 2.1, 7, '#c9ced6', x, 0, -2.5);
        [0.35, 0.95, 1.55].forEach((y) => ctx.box(1.1, 0.05, 7, '#9aa5ae', x, y, -2.5, false));
        [-1, 1].forEach((side) => [-4.3, -0.7].forEach((z) => slots.push({ sx: x + side * 1.25, sz: z, px: x + side * 0.42, pz: z, face: side })));
      });
      items.forEach((it, i) => {
        const sl = slots[i]; if (!sl) return;
        const col = CAT_COLORS[it.cat] || '#7f8c8d';
        // product rows on the shelf face
        [0.4, 1.0, 1.6].forEach((y) => { for (let k = -1; k <= 1; k++) { const b = K.box(ctx.g, 0.22, 0.3, 0.22, k ? col : '#f4f0e6', sl.face ? sl.px : sl.px + k * 0.5, y, sl.face ? sl.pz + k * 0.4 : sl.pz - 0.2); b.castShadow = false; } });
        const tag = ctx.sign(fmt(it.price), col, sl.face ? sl.px + sl.face * 0.12 : sl.px, 2.2, sl.face ? sl.pz : sl.pz + 0.05, 0.9, sl.face ? sl.face * Math.PI / 2 : 0);
        tag.renderOrder = 2;
        ctx.spot({ x: sl.sx, z: sl.sz, r: 1.7,
          verb: () => 'Pick up ' + it.name, title: () => it.cat, sub: () => fmt(it.price) + (it.uses ? ' · ' + it.uses + ' meals' : '') + (IN.basket.length ? ' · basket ' + fmt(basketTotal()) : ''),
          use: () => { IN.basket.push(it); basketUI(); AL.Player.char.setState('interact'); setTimeout(() => { if (!AL.busy && AL.Player.speed < 0.3) AL.Player.char.setState('idle'); }, 700); AL.toast(it.name + ' added to your basket', 'good'); } });
      });
      // checkouts by the entrance
      [6, 9.6].forEach((x, i) => {
        counter(ctx, x, 4.4, 0.9, 2.6, '#3d4f63');
        ctx.box(0.4, 0.3, 0.4, '#111418', x, 1.06, 3.8, false);
        ctx.glow(0.35, 0.22, 0.02, '#7fdc9a', x - 0.1, 1.12, 3.58);
        ctx.npc({ x: x + 0.95, z: 4.4, face: -Math.PI / 2, state: 'interact', role: 'Cashier', outfits: ['uniform'], color: '#0b7a4b', verb: 'Pay at checkout', priority: 1, use: () => checkout(store) });
        ctx.spot({ x: x - 1.0, z: 4.4, r: 1.6, priority: 0.5, verb: () => 'Pay at checkout ' + (i + 1), title: () => store, sub: () => (IN.basket.length ? IN.basket.length + ' items · ' + fmt(basketTotal()) : 'Basket empty'), use: () => checkout(store) });
      });
      ctx.box(1.0, 0.7, 0.7, '#d1342f', -3, 0, 7.6, false); // basket stack
      ctx.npc({ x: -5.75, z: -4, face: -Math.PI / 2, state: 'work', role: 'Shelf stocker', outfits: ['uniform'], color: '#0b7a4b', lines: ['Rice is on aisle two.', 'Fresh chicken came in this morning.', 'The fridges have cold drinks.'] });
      ctx.npc({ x: -2.4, z: 7.5, face: 0, role: 'Security', outfits: ['uniform'], color: '#22262b', frame: 'm', lines: ['Welcome. Bags at the counter please.', 'Have a nice day.'] });
      const aisle = [[-10.3, -6, 'interact'], [-10.3, 0], [-5.75, -5, 'interact'], [-5.75, -1], [-1.25, -4, 'interact'], [-1.25, 0.5], [3.25, -5.5], [3.25, -2, 'interact'], [8.3, -4, 'interact'], [0, 2.2], [-6, 2.2], [3, -7.2, 'interact']];
      for (let i = 0; i < (AL.LITE ? 3 : 5); i++) { const p = AL.pick(aisle); ctx.npc({ x: p[0], z: p[1], wander: aisle, role: 'Shopper', lines: ['The prices have gone up again o.', 'Have you tried the plantain chips?', 'I just need bread and eggs.', 'This place is always busy on Saturdays.'] }); }
      plant(ctx, -11, 7.5); plant(ctx, 11, 7.5);
    },
    onEnter() { basketUI(); AL.toast('Walk the aisles and press E to pick things up. Pay at a checkout.'); },
    onExit() { if (IN.basket.length) AL.toast('You left the basket by the door.'); IN.basket = []; basketUI(); },
  });

  /* ---------- fashion stores ---------- */
  function tryLook(next, onBuy, title, sub, price) {
    const prev = AL.S.look; let bought = false;
    AL.S.look = AL.cleanLook(next); AL.Player.rebuild();
    AL.Card.show({
      title, sub: 'Trying it on · ' + fmt(price),
      note: 'Have a look in the mirror. Buy it to keep it.',
      actions: [
        { label: 'Buy it', sub: fmt(price), primary: true, fn: () => { if (onBuy()) bought = true; } },
        { label: 'Put it back', fn: () => {} },
      ],
      onClose: () => { if (!bought) { AL.S.look = prev; AL.Player.rebuild(); } },
    });
  }
  function buyItem(it) {
    const how = AL.Life.pay(it.price, 'Purchase: ' + it.name);
    if (!how) { AL.toast('You need ' + fmt(it.price) + '.'); return false; }
    AL.Life.receive(it); AL.log('Bought ' + it.name.toLowerCase() + ' for ' + fmt(it.price) + '.'); AL.toast('Bought: ' + it.name, 'good'); AL.commit();
    return true;
  }
  IN.define('fashion', {
    build(ctx) {
      const kind = ctx.variant, mall = kind === 'mall';
      const name = mall ? 'Urban Thread' : 'Wuse Fabric Hall';
      const w = 20, d = 16;
      ctx.room({ w, d, floor: mall ? '#d9c3a0' : '#c9a46b', wall: mall ? '#fbf8f2' : '#f0d9b5', trim: mall ? '#c9a227' : '#d1342f' });
      ctx.sign(name.toUpperCase(), mall ? '#22262b' : '#d1342f', 0, 3.4, -d / 2 + 0.05, 5);
      // mannequins showing each outfit
      const outfits = AL.SHOP_ITEMS.filter((it) => it.outfit && it.where.includes(kind));
      outfits.forEach((it, i) => {
        const x = -7 + (14 / Math.max(1, outfits.length - 1)) * i, z = -d / 2 + 1.6;
        ctx.box(1.0, 0.25, 1.0, '#f4f0e6', x, 0, z, false);
        const fig = AL.Character.figure({ outfit: it.outfit, color: AL.OUTFIT_COLORS[i % AL.OUTFIT_COLORS.length], skin: AL.SKINS[0], hair: 'bald', frame: it.outfit === 'ankara' ? 'f' : 'm' });
        fig.root.position.set(x, 0.25, z); ctx.g.add(fig.root);
        ctx.solid(x - 0.4, x + 0.4, z - 0.4, z + 0.4, 2);
        ctx.spot({ x, z: z + 1.4, r: 1.5,
          verb: () => (S().wardrobe.includes(it.outfit) ? (S().look.outfit === it.outfit ? 'You are wearing this' : 'Wear your ' + it.name.toLowerCase()) : 'Try on ' + it.name),
          title: () => it.cat, sub: () => (S().wardrobe.includes(it.outfit) ? 'Owned' : fmt(it.price)),
          use: () => {
            if (S().wardrobe.includes(it.outfit)) return AL.Life.wear(it.outfit);
            tryLook({ ...S().look, outfit: it.outfit }, () => { const ok = buyItem(it); if (ok) { AL.S.look = AL.cleanLook({ ...AL.S.look, outfit: it.outfit }); } return ok; }, it.name, it.cat, it.price);
          } });
      });
      // accessory display cases
      const accs = AL.SHOP_ITEMS.filter((it) => it.acc && it.where.includes(kind)).slice(0, 10);
      accs.forEach((it, i) => {
        const x = -6 + (i % 5) * 3, z = i < 5 ? -1.8 : 1.6;
        ctx.box(1.4, 1.0, 0.8, '#2b2f36', x, 0, z);
        ctx.glow(1.3, 0.05, 0.7, '#cfe3ef', x, 1.0, z);
        const c = (AL.ACC[it.id] || {}).color || '#c9a227';
        const sh = it.acc === 'wrist' ? [0.22, 0.06, 0.22] : it.acc === 'eyes' ? [0.32, 0.08, 0.1] : it.acc === 'bag' ? [0.4, 0.3, 0.15] : it.acc === 'feet' ? [0.3, 0.14, 0.4] : it.acc === 'head' ? [0.3, 0.16, 0.3] : [0.3, 0.03, 0.3];
        K.box(ctx.g, sh[0], sh[1], sh[2], c, x, 1.06, z);
        ctx.sign(fmt(it.price), mall ? '#22262b' : '#d1342f', x, 0.62, z + 0.42, 0.9);
        ctx.spot({ x, z: z + (i < 5 ? -1.1 : 1.1), r: 1.5,
          verb: () => (S().items.includes(it.id) ? (AL.Life.wearing(it.id) ? 'Take off ' : 'Put on ') + it.name.toLowerCase() : 'Look at ' + it.name),
          title: () => it.cat, sub: () => (S().items.includes(it.id) ? 'Owned' : fmt(it.price) + ' · +' + (it.joy || 0) + ' happiness'),
          use: () => {
            if (S().items.includes(it.id)) return AL.Life.equip(it.id, !AL.Life.wearing(it.id));
            const acc = (S().look.acc || []).filter((x) => (AL.ACC[x] || {}).slot !== it.acc).concat([it.id]);
            tryLook({ ...S().look, acc }, () => buyItem(it), it.name, it.cat, it.price);
          } });
      });
      // phones and electronics counter (mall)
      const tech = AL.SHOP_ITEMS.filter((it) => !it.acc && !it.outfit && !it.uses && it.where.includes(kind) && ['Phones', 'Electronics'].includes(it.cat));
      if (tech.length) {
        counter(ctx, w / 2 - 0.8, -1, 1.0, 6, '#22262b');
        tech.forEach((it, i) => {
          const z = -3.4 + i * 1.6;
          ctx.glow(0.35, 0.05, 0.5, '#1f3b57', w / 2 - 0.8, 1.06, z);
          ctx.spot({ x: w / 2 - 2.2, z, r: 1.3, verb: () => (S().items.includes(it.id) ? 'You own this' : 'Buy ' + it.name), title: () => it.cat, sub: () => fmt(it.price),
            enabled: () => (S().items.includes(it.id) ? 'Already yours' : true), use: () => AL.Card.show({ title: it.name, sub: it.cat, lines: [['Price', fmt(it.price)], ['Happiness', '+' + (it.joy || 0)]], actions: [{ label: 'Buy', sub: 'Cash first, then bank', primary: true, fn: () => buyItem(it) }, { label: 'Not now' }] }) });
        });
      }
      // mirror and cash desk
      ctx.box(0.1, 2.4, 1.6, '#c9a227', -w / 2 + 0.06, 0.3, 3.5, false); ctx.glow(0.04, 2.2, 1.4, '#dfeef6', -w / 2 + 0.14, 0.4, 3.5);
      counter(ctx, 5.5, 5.4, 2.6, 0.9, mall ? '#22262b' : '#8b5e34');
      ctx.npc({ x: 5.5, z: 4.4, face: Math.PI, role: 'Shop assistant', frame: 'f', outfits: [mall ? 'suit' : 'ankara'], lines: ['Everything here is new stock.', 'Try it on, the mirror is on the left.', 'Those sunglasses are selling fast.', 'Bank cards are fine.'] });
      careerSpot(ctx, -w / 2 + 1.5, -d / 2 + 1.5, 'shop', 'Staff room');
      const walk = [[-8, 0], [-2, 3.4], [3, 3.4], [6, -4], [-4, -5.4, 'interact'], [2, -5.4, 'interact'], [-7.5, 3.5, 'idle']];
      for (let i = 0; i < (AL.LITE ? 2 : 3); i++) ctx.npc({ x: walk[i][0], z: walk[i][1], wander: walk, role: 'Shopper', lines: ['This colour suits you.', 'I came for one thing and now look at me.', 'Is that suit on sale?'] });
      plant(ctx, -w / 2 + 0.8, d / 2 - 1); plant(ctx, w / 2 - 0.8, d / 2 - 1);
    },
  });

  /* ---------- bank ---------- */
  IN.define('bank', {
    build(ctx) {
      const w = 22, d = 18;
      ctx.room({ w, d, h: 5, floor: '#e9e6df', wall: '#f6f7f8', trim: '#16a085' });
      ctx.sign('CAPITAL TRUST BANK', '#16a085', 0, 4.0, -d / 2 + 0.05, 6.5);
      counter(ctx, 0, -4.6, 14, 1.0, '#16a085', '#e9e6df');
      for (let x = -7; x <= 7; x += 4.5) ctx.box(0.08, 0.9, 1.0, '#c9ced6', x === -7 ? -6.95 : x, 1.06, -4.6, false);
      [-4.5, 0, 4.5].forEach((x, i) => {
        ctx.glow(2.6, 0.7, 0.04, '#d8f0f5', x, 1.15, -4.12);
        ctx.sign(String(i + 1), '#0f6e5c', x, 2.6, -4.6, 0.6);
        ctx.npc({ x, z: -5.7, face: 0, state: 'interact', role: 'Teller', outfits: ['suit'], color: AL.pick(['#22262b', '#2e6fd8']), verb: 'Teller window ' + (i + 1), priority: 1, use: tellerCard });
      });
      // ATMs on the left wall
      [0, 2.6].forEach((z) => { ctx.box(0.8, 1.9, 0.9, '#16a085', -w / 2 + 0.45, 0, z); ctx.glow(0.04, 0.4, 0.55, '#bfeee0', -w / 2 + 0.87, 1.2, z); ctx.spot({ x: -w / 2 + 1.6, z, r: 1.4, verb: 'Use ATM', title: () => 'Capital Trust ATM', sub: () => 'Balance ' + fmt(S().savings), use: atmCard }); });
      // loan desk
      ctx.box(1.0, 0.9, 2.4, '#8a6a3e', 8, 0, 1); chair(ctx, 9.1, 1, -Math.PI / 2); chair(ctx, 6.8, 0.4, Math.PI / 2, '#16a085'); chair(ctx, 6.8, 1.6, Math.PI / 2, '#16a085');
      ctx.sign('LOANS', '#16a085', w / 2 - 0.05, 2.8, 1, 1.4, -Math.PI / 2);
      ctx.npc({ x: 9.1, z: 1, face: -Math.PI / 2, state: 'sit', role: 'Loan officer', outfits: ['suit'], verb: 'Talk about a loan', priority: 1, use: () => loanDesk('bank') });
      // reception and waiting area
      counter(ctx, -6, 4.6, 2.6, 0.9, '#f4f0e6');
      ctx.npc({ x: -6, z: 3.6, face: Math.PI, role: 'Receptionist', frame: 'f', outfits: ['suit'], lines: ['Tellers are straight ahead. ATMs are on your left.', 'For loans, see our officer on the right.', 'Welcome to Capital Trust Bank.'] });
      [2.5, 3.5, 4.5, 5.5].forEach((x) => chair(ctx, x, 5.2, Math.PI));
      ctx.npc({ x: 3.5, z: 5.2, face: Math.PI, state: 'sit', role: 'Customer', lines: ['The queue is moving small small.', 'I just came to update my BVN.'] });
      ctx.npc({ x: 0, z: -2.7, face: Math.PI, state: 'idle', role: 'Customer', talk: false });
      ctx.npc({ x: 2.4, z: 7.6, face: 0, role: 'Security', outfits: ['uniform'], color: '#22262b', frame: 'm', lines: ['Welcome. Please switch off your phone in the banking hall.'] });
      careerSpot(ctx, w / 2 - 1.4, -d / 2 + 1.4, 'bank', 'Staff entrance');
      plant(ctx, -w / 2 + 0.8, -d / 2 + 0.8); plant(ctx, w / 2 - 0.8, d / 2 - 1);
    },
  });

  /* ---------- microfinance lender ---------- */
  IN.define('lender', {
    build(ctx) {
      const w = 14, d = 11;
      ctx.room({ w, d, h: 3.8, floor: '#d8cfc2', wall: '#f4efe6', trim: '#d35400' });
      ctx.sign('QUICKCASH MICROFINANCE', '#d35400', 0, 2.9, -d / 2 + 0.05, 5);
      ctx.sign('LOANS IN 24 HOURS', '#22262b', -w / 2 + 0.05, 2.2, -1, 2.6, Math.PI / 2);
      ctx.box(2.6, 0.9, 1.0, '#8a6a3e', 0, 0, -2.2); chair(ctx, 0, -3.3, 0); chair(ctx, -0.6, -1.2, Math.PI, '#d35400'); chair(ctx, 0.6, -1.2, Math.PI, '#d35400');
      ctx.glow(0.6, 0.4, 0.04, '#1f3b57', 0.6, 0.95, -2.5);
      ctx.npc({ x: 0, z: -3.3, face: 0, state: 'sit', role: 'Loan officer', outfits: ['suit'], color: '#d35400', verb: 'Apply for a loan', priority: 1, use: () => loanDesk('mfb') });
      [-1.5, -0.5, 0.5, 1.5].forEach((z) => chair(ctx, w / 2 - 0.8, z + 1, -Math.PI / 2, '#3d4f63'));
      ctx.npc({ x: w / 2 - 0.8, z: 1.5, face: -Math.PI / 2, state: 'sit', role: 'Customer', lines: ['They approved my shop loan last month.', 'The interest is high, but it is fast.'] });
      ctx.box(1.4, 1.8, 0.5, '#9aa5ae', -w / 2 + 0.8, 0, -d / 2 + 0.5);
      plant(ctx, -w / 2 + 0.8, d / 2 - 0.8);
    },
  });

  /* ---------- club and rooftop lounge ---------- */
  IN.vip = false;
  function drinksCard(name) {
    AL.Card.show(() => ({
      title: 'Bar · ' + name, sub: IN.vip ? 'VIP wristband' : 'Regular entry',
      actions: AL.DRINKS.map((dr) => ({
        label: dr.name, sub: fmt(dr.price) + (dr.vip ? ' · VIP only' : '') + ' · +' + dr.mood + ' mood', disabled: dr.vip && !IN.vip,
        fn: () => {
          if (!AL.Life.pay(dr.price, name + ': ' + dr.name)) return AL.toast('You need ' + fmt(dr.price) + '.');
          AL.Life.mood(dr.mood); S().energy = Math.min(100, S().energy + dr.en); S().t += 0.25;
          act('eat', 2, 'Enjoying the ' + dr.name.toLowerCase() + '…'); AL.commit();
        },
      })),
    }));
  }
  IN.define('club', {
    build(ctx) {
      const N = AL.NIGHT[ctx.variant], club = !!N.dance, w = 24, d = 20;
      ctx.room({ w, d, h: 5, floor: N.floor, wall: N.wall, trim: N.accent });
      ctx.sign(N.name.toUpperCase(), N.accent, 0, 4.1, -d / 2 + 0.05, 5);
      const tiles = [];
      const fw = club ? 4 : 2, fz = club ? -1 : 0;
      for (let i = 0; i < fw; i++) for (let j = 0; j < fw; j++) {
        const m = ctx.glow(1.9, 0.05, 1.9, N.accent, (i - (fw - 1) / 2) * 2, 0, fz + (j - (fw - 1) / 2) * 2); tiles.push(m);
      }
      const l1 = ctx.light(N.accent, 1.2, -3, 4, fz, 20), l2 = ctx.light('#3fa9e0', 1.0, 3, 4, fz, 20);
      let t = 0;
      ctx.tick((dt) => {
        t += dt;
        if (Math.floor(t * 2.5) !== Math.floor((t - dt) * 2.5)) tiles.forEach((m, i) => m.material.color.setHSL(((t * 0.08 + i * 0.13) % 1), 0.8, club ? 0.45 : 0.3));
        l1.color.setHSL((t * 0.1) % 1, 0.9, 0.55); l2.color.setHSL((t * 0.1 + 0.5) % 1, 0.9, 0.55);
      });
      // DJ booth
      ctx.box(6, 0.5, 3, '#111', 0, 0, -d / 2 + 1.5, false);
      ctx.box(3, 1.1, 0.8, '#22262b', 0, 0.5, -d / 2 + 2.4);
      [-3.4, 3.4].forEach((x) => ctx.box(1.1, 2.6, 1.0, '#141414', x, 0, -d / 2 + 1.0));
      ctx.npc({ x: 0, y: 0.5, z: -d / 2 + 1.5, face: 0, state: 'dance', role: 'DJ', outfits: ['street'], acc: ['a-shades', 'h-cap'], verb: 'Request a song', use: () => { AL.Life.mood(2); AL.toast('The DJ nods and drops your song. The crowd screams!', 'good'); } });
      // bar
      counter(ctx, -w / 2 + 2.5, -2, 1.0, 8, '#2b2420', '#c9a227');
      ctx.box(0.6, 2.4, 8, '#1b1b1b', -w / 2 + 0.4, 0, -2);
      for (let z = -5.5; z <= 1.5; z += 0.7) ctx.glow(0.12, 0.35, 0.12, AL.pick(['#f2b33d', '#3fa9e0', '#ff4fa3', '#7fdc9a']), -w / 2 + 0.75, 1.3 + (Math.round(z * 10) % 2) * 0.6, z);
      ctx.npc({ x: -w / 2 + 1.5, z: -2, face: Math.PI / 2, state: 'interact', role: 'Bartender', outfits: ['suit'], color: '#22262b', verb: 'Order a drink', priority: 1, use: () => drinksCard(N.name) });
      ctx.spot({ x: -w / 2 + 3.7, z: 0.5, r: 1.6, verb: 'Order a drink', title: () => 'Bar', sub: () => 'Drinks from ' + fmt(AL.DRINKS[0].price), use: () => drinksCard(N.name) });
      // VIP section
      ctx.box(5, 0.3, 9, '#2b1b2b', w / 2 - 2.5, 0, -3, false);
      for (let z = -7.5; z <= 1.5; z += 1.5) if (z !== -3) { ctx.box(0.1, 1.0, 0.1, '#c9a227', w / 2 - 5, 0, z, false); }
      ctx.box(0.05, 0.05, 9, '#b8262a', w / 2 - 5, 0.9, -3, false);
      sofa(ctx, w / 2 - 0.8, -5.5, -Math.PI / 2, '#5b1e3b'); sofa(ctx, w / 2 - 0.8, -0.8, -Math.PI / 2, '#5b1e3b');
      ctx.box(1.2, 0.5, 1.2, '#c9a227', w / 2 - 2.4, 0.3, -3, false);
      ctx.sign('VIP', '#c9a227', w / 2 - 0.05, 3, -3, 1.4, -Math.PI / 2);
      ctx.spot({ x: w / 2 - 2.3, z: -5.5, r: 1.8, verb: () => (IN.vip ? 'Sit in the VIP section' : 'VIP only'), title: () => 'VIP section', sub: () => (IN.vip ? 'Bottle service at the bar' : 'Buy VIP entry at the door'),
        enabled: () => (IN.vip ? true : 'You need a VIP wristband.'), use: () => { sitHere(ctx, w / 2 - 1.1, -5.5, -Math.PI / 2); AL.Life.mood(4); AL.toast('You settle into the VIP sofa.', 'good'); } });
      ctx.npc({ x: w / 2 - 1.1, y: 0.3, z: -1.2, face: -Math.PI / 2, state: 'sit', role: 'VIP guest', acc: ['a-shades', 'w-royale'], outfits: ['suit', 'agbada'], lines: ['This is the life.', 'Join us any time, my friend.'] });
      ctx.npc({ x: w / 2 - 1.1, y: 0.3, z: -0.4, face: -Math.PI / 2, state: 'sit', role: 'VIP guest', frame: 'f', talk: false });
      // dance floor
      ctx.spot({ x: 0, z: fz, r: club ? 4.2 : 2.4, priority: 1.5, verb: 'Dance', title: () => club ? 'Dance floor' : 'Dance area', sub: () => '+6 mood · −5 energy',
        enabled: () => (S().energy >= 6 ? true : 'Too tired to dance.'),
        use: () => { S().energy -= 5; AL.Life.mood(6); S().t += 0.3; act('dance', 4, 'Dancing to the DJ…'); AL.commit(); } });
      const n = club ? (AL.LITE ? 4 : 7) : 2;
      for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, r = 0.8 + Math.random() * (club ? 2.8 : 1.2); ctx.npc({ x: Math.cos(a) * r, z: fz + Math.sin(a) * r, face: Math.random() * 6, state: 'dance', role: 'Clubber', talk: i < 2, r: 1.3, lines: ['This song is my jam!', 'The DJ is on fire tonight!', 'Abuja nights are the best.'] }); }
      ctx.npc({ x: -w / 2 + 3.8, z: -4.5, face: -Math.PI / 2, state: 'talk', role: 'Guest', lines: ['First time here?', 'Try the chapman, it is very good.'] });
      if (!club) {
        // rooftop: city lights through the glass
        ctx.glow(w - 0.2, 3.2, 0.05, '#0d1a33', 0, 0.6, -d / 2 + 0.06).renderOrder = 0;
        for (let i = 0; i < 40; i++) ctx.glow(0.12, 0.12 + Math.random() * 0.5, 0.02, '#ffcf70', -w / 2 + 1 + Math.random() * (w - 2), 0.7 + Math.random() * 1.2, -d / 2 + 0.1);
        [[-4, 4], [4, 4], [-4, -5], [4, -5]].forEach(([x, z]) => { sofa(ctx, x, z + 1, Math.PI, '#5b4636', 2); ctx.box(1.0, 0.45, 0.8, '#c9a227', x, 0, z, false); });
      }
    },
    onExit() { IN.vip = false; },
  });

  /* ---------- car dealership ---------- */
  function carCard(ctx, m) {
    const colors = [m.color, '#f4f4f4', '#22262b', '#2e6fd8', '#d1342f', '#7f8c8d'];
    const st = { c: 0 };
    AL.Card.show(() => ({
      title: m.name, sub: m.info,
      lines: [['Price', fmt(m.price)], ['Top speed', Math.round(m.top * 3.6) + ' km/h'], ['Type', m.kind], ['You have', fmt(S().cash + S().savings)]],
      actions: [
        { label: 'Test drive', sub: '75 seconds around Jabi · free', fn: () => {
          const v = ctx.venue, o = IN.outside(v, 8);
          IN.exit(true);
          AL.Vehicles.testDrive(m.id, { x: o.x, z: o.z }, o.facing, () => { IN.placeOutside(v); AL.toast('Thanks for the drive! Come in if you want to buy.'); });
        } },
        { label: 'Colour', sub: 'Change', keep: true, fn: () => { st.c = (st.c + 1) % colors.length; }, html: '' },
        { label: 'Buy · ' + fmt(m.price), sub: 'Colour ' + (st.c + 1) + ' of ' + colors.length + ' · parked outside', primary: true, disabled: S().cash + S().savings < m.price, fn: () => { const o = IN.outside(ctx.venue, 8); AL.Vehicles.buy(m.id, colors[st.c], { x: o.x, z: o.z }, o.facing); } },
      ],
    }));
  }
  function salesDesk() {
    AL.Card.show(() => {
      const cars = S().cars;
      if (!cars.length) return { title: 'Apex Motors · sales desk', sub: 'You do not own a car yet', note: 'Walk up to any car on the floor to see it, take a test drive or buy it.', actions: [] };
      return {
        title: 'Apex Motors · your cars', sub: 'We buy back at ' + Math.round(AL.CAR_RESALE * 100) + '% of the price',
        actions: cars.flatMap((c) => { const m = AL.Vehicles.model(c.model); return [
          { label: 'Deliver ' + m.name + ' home', sub: fmt(AL.CAR_DELIVERY) + ' · parks at your home', disabled: !AL.residence(), fn: () => AL.Vehicles.sendHome(c) },
          { label: 'Sell ' + m.name, sub: fmt(Math.round(m.price * AL.CAR_RESALE)) + ' to your bank', fn: () => AL.Vehicles.sell(c) },
        ]; }).slice(0, 8),
      };
    });
  }
  IN.define('dealer', {
    build(ctx) {
      const w = 28, d = 20;
      ctx.room({ w, d, h: 5, floor: '#eef1f3', wall: '#ffffff', trim: '#34495e', door: 3.2 });
      ctx.sign('APEX MOTORS', '#34495e', 0, 4, -d / 2 + 0.05, 6);
      AL.CARS.forEach((m, i) => {
        const x = -8.5 + (i % 3) * 8.5, z = i < 3 ? -4.5 : 2.5, rot = 0.45;
        const pod = K.mesh(K.CYL, K.mat('#c9ced6'), ctx.g, false); pod.scale.set(3.2, 0.15, 3.2); pod.position.set(x, 0.07, z);
        const car = AL.Vehicles.build(m.id); car.position.set(x, 0.15, z); car.rotation.y = rot; ctx.g.add(car);
        ctx.solid(x - 1.9, x + 1.9, z - 2.4, z + 2.4, 1.6);
        ctx.sign(fmt(m.price), '#34495e', x + 2.2, 1.1, z + 2.2, 1.3, 0.4);
        ctx.spot({ x, z, r: 3.6, verb: () => 'View the ' + m.name, title: () => m.kind.toUpperCase(), sub: () => fmt(m.price) + ' · ' + Math.round(m.top * 3.6) + ' km/h', use: () => carCard(ctx, m) });
      });
      ctx.box(2.6, 0.9, 1.0, '#34495e', 10, 0, -d / 2 + 1.8); chair(ctx, 10, -d / 2 + 0.9, 0);
      ctx.npc({ x: 10, z: -d / 2 + 0.9, face: 0, state: 'sit', role: 'Sales manager', outfits: ['suit'], verb: 'Sales desk', priority: 1, use: salesDesk });
      const floor = [[-4, -1], [4, -1], [-12, -1], [12, 6], [-4, 6], [4, 6]];
      ctx.npc({ x: -4, z: -1, wander: floor, role: 'Salesperson', outfits: ['suit'], lines: ['The Savanna is our best seller.', 'Take any car for a test drive, it is free.', 'We can deliver to your house.'] });
      ctx.npc({ x: 4, z: 6, wander: floor, role: 'Customer', lines: ['I am saving for the Falcon GT.', 'My cousin bought the Kestrel last year.'] });
      plant(ctx, -w / 2 + 0.8, -d / 2 + 0.8); plant(ctx, w / 2 - 0.8, d / 2 - 1);
    },
  });
})(window.AL);
