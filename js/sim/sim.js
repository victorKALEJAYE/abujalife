/* Abuja Life — city simulation. "Simulate the city, don't render the city."
   Everything here is plain data updated on the game clock:
     • locations   – every meaningful place, with category, hours and services
     • businesses  – staff, customers and revenue per open location
     • traffic     – per-district congestion and average speed
     • population  – a few hundred residents with homes, jobs and schedules
     • market      – fictional stock prices
   Rendering systems (NPC pool, traffic pool, LOD) read this data and only
   draw what is near the player. */
(function (AL) {
  'use strict';
  const D = AL.D, W = AL.W;
  const Sim = { locations: [], byId: {}, biz: {}, people: [] };
  const R = AL.rand(73101);

  /* ---------- locations ---------- */
  const VENUE_NAMES = {
    jobs: (k) => D[k].name + ' Job Board',
    food: (k) => AL.FOOD_PLACES[k] || D[k].name + ' Food Spot',
    estate: (k) => 'Urban Nest Realty · ' + D[k].name,
    biz: (k) => 'Business Registry Desk · ' + D[k].name,
    bank: () => 'Capital Trust Bank',
    atm: (k) => 'Capital Trust ATM · ' + D[k].name,
    taxi: (k) => D[k].name + ' Taxi & Bus Park',
    park: () => 'Area 1 Motor Park',
    shop: (k) => (AL.STORES[k] ? AL.STORES[k].name : D[k].name + ' Shops'),
    invest: () => 'Abuja Securities House',
    clinic: () => 'Garki General Hospital',
    work: (k) => AL.WORK_PLACES[k] || D[k].name + ' Offices',
  };
  const STAFF = { jobs: [2, 4], food: [3, 9], estate: [3, 6], biz: [2, 5], bank: [28, 40], atm: [0, 0], taxi: [8, 20], park: [10, 30], shop: [40, 160], invest: [12, 25], clinic: [60, 140], work: [80, 300] };
  const SPEND = { food: 2500, shop: 18000, bank: 0, clinic: 9000, park: 400, taxi: 1500, invest: 0, work: 0, estate: 0, biz: 0, jobs: 0, atm: 0 };
  Sim.buildLocations = () => {
    Sim.locations = []; Sim.byId = {};
    AL.City.venues.forEach((v, i) => {
      if (v.type === 'bench' || v.type === 'home') return;
      const vt = AL.VENUE_TYPES[v.type];
      const loc = {
        id: 'v' + i, venueIndex: i, type: v.type, district: v.district, cat: AL.VENUE_CATEGORY[v.type] || 'businesses',
        name: VENUE_NAMES[v.type] ? VENUE_NAMES[v.type](v.district) : vt.verb, mx: v.mx, mz: v.mz,
        // arrive a few metres in front of the kiosk/door
        ax: v.mx, az: v.mz + 1.3, hours: vt.hours,
      };
      add(loc);
    });
    AL.LANDMARKS.forEach((l) => {
      add({ id: 'lm-' + l.id, type: 'landmark', landmark: l.id, district: nearestDistrict(l.x, l.z), cat: AL.LANDMARK_CATEGORY[l.id] || 'landmarks', name: l.name, info: l.info, mx: l.x, mz: l.z, ax: l.x, az: l.z + (l.id === 'asorock' ? 26 : l.id === 'stadium' ? 27 : 16), hours: l.id === 'mosque' || l.id === 'ecwa' ? [5, 21] : null });
    });
    // business data for every staffed place
    Sim.locations.forEach((l) => {
      const st = STAFF[l.type]; if (!st || !st[1]) return;
      Sim.biz[l.id] = { staff: Math.round(st[0] + R() * (st[1] - st[0])), customers: 0, revenue: 0 };
    });
  };
  /* fill in today's numbers up to the current hour, so the city is mid-day when you load in */
  Sim.catchUp = () => {
    const now = Math.floor(AL.hour());
    const from = now >= 6 ? 6 : now; // days start at 06:00
    for (let h = from; h < now; h++) {
      Sim.locations.forEach((l) => {
        const b = Sim.biz[l.id]; if (!b) return;
        if (l.hours && !(h >= l.hours[0] && h < l.hours[1])) return;
        const n = Math.round(Sim.busyness(l.district, h) * (b.staff * 0.9 + 4) * (0.7 + R() * 0.6));
        b.customers += n; b.revenue += n * (SPEND[l.type] || 0);
      });
    }
  };
  function add(loc) { Sim.locations.push(loc); Sim.byId[loc.id] = loc; }
  function nearestDistrict(x, z) { let b = null, bd = 1e9; AL.DKEYS.flat().forEach((k) => { const d = Math.hypot(D[k].x - x, D[k].z - z); if (d < bd) { bd = d; b = k; } }); return b; }
  Sim.nearestDistrict = nearestDistrict;
  Sim.isOpen = (loc) => AL.isOpen(loc.hours);
  /* the player's home shows up on the map as its own location */
  Sim.homeLocation = () => {
    const r = AL.residence(); if (!r) return null;
    const v = AL.City.venues.find((x) => x.type === 'home' && x.district === r.at); if (!v) return null;
    return { id: 'home', type: 'home', district: r.at, cat: 'homes', name: 'My home · ' + r.name, mx: v.mx, mz: v.mz, ax: v.mx, az: v.mz + 1.2, hours: null };
  };
  Sim.allLocations = () => { const h = Sim.homeLocation(); return h ? [h].concat(Sim.locations) : Sim.locations.slice(); };
  Sim.get = (id) => (id === 'home' ? Sim.homeLocation() : Sim.byId[id]);
  Sim.arrivalWorld = (loc) => ({ x: loc.ax * W, z: loc.az * W });

  /* ---------- busyness, businesses, traffic ---------- */
  const BUSY = { cbd: 1.3, wuse: 1.5, garki: 1.2, jabi: 1.2, nyanya: 1.4, maitama: 0.7, asokoro: 0.6, kubwa: 1.0, karu: 1.0, gwarinpa: 0.9, lugbe: 0.9, gwagwalada: 1.0, apo: 0.9, bwari: 0.6, kuje: 0.6, giri: 0.5 };
  Sim.busyness = (k, h = AL.hour()) => {
    const day = h >= 6 && h < 22 ? 1 : 0.15;
    const rush = (h >= 7 && h < 9.5) || (h >= 16 && h < 19.5) ? 1.6 : 1;
    return (BUSY[k] || 1) * day * rush;
  };
  Sim.trafficAt = (k, h = AL.hour()) => {
    const b = Sim.busyness(k, h);
    if (b > 1.6) return { level: 'Heavy', kmh: 18 };
    if (b > 0.95) return { level: 'Moderate', kmh: 32 };
    return { level: 'Light', kmh: 48 };
  };
  Sim.onHour = () => {
    const h = AL.hour();
    Sim.locations.forEach((l) => {
      const b = Sim.biz[l.id]; if (!b || !Sim.isOpen(l)) return;
      const n = Math.round(Sim.busyness(l.district, h) * (b.staff * 0.9 + 4) * (0.7 + R() * 0.6));
      b.customers += n; b.revenue += n * (SPEND[l.type] || 0);
    });
  };
  Sim.onNewDay = () => { Object.values(Sim.biz).forEach((b) => { b.customers = 0; b.revenue = 0; }); };

  /* ---------- population: residents as data records ---------- */
  Sim.buildPopulation = (count) => {
    const HOMES = ['kubwa', 'gwarinpa', 'karu', 'nyanya', 'lugbe', 'gwagwalada', 'apo', 'kuje', 'bwari', 'asokoro', 'maitama', 'jabi'];
    const LEISURE = ['wuse', 'jabi', 'garki', 'maitama', 'cbd'];
    const P = AL.rand(20261007);
    for (let i = 0; i < count; i++) {
      const role = AL.NPC_ROLES[i % AL.NPC_ROLES.length];
      const fem = role.style === 'ankara' ? true : P() < 0.46;
      const first = AL.pick(fem ? AL.NPC_FIRST_F : AL.NPC_FIRST_M, P), last = AL.pick(AL.NPC_LAST, P);
      Sim.people.push({
        id: 'p' + i, first, last, name: first + ' ' + last, fem, age: 19 + Math.floor(P() * 42), role: role.role, style: role.style,
        work: role.work, home: AL.pick(HOMES, P), leisure: P() < 0.6 ? AL.pick(LEISURE, P) : null,
        start: role.start + (P() - 0.5), end: role.end + (P() - 0.5), money: Math.round(20000 + P() * 400000), seed: Math.floor(P() * 1e9),
      });
    }
  };
  /* where a resident is right now and what they are doing */
  Sim.whereIs = (p, h = AL.hour()) => {
    const inRange = (a, b) => (b > 24 ? (h >= a || h < b - 24) : (h >= a && h < b));
    const wd = AL.weekday();
    const workday = wd <= 5 || p.role === 'Trader' || p.role === 'Market woman' || p.role === 'Nightclub worker' || p.role === 'Security guard';
    if (workday && inRange(p.start, p.end)) return { k: p.work, act: 'At work' };
    if (workday && inRange(p.start - 1.2, p.start)) return { k: p.work, act: 'Commuting to work', moving: true, from: p.home };
    const e = p.end % 24;
    if (p.leisure && inRange(e, e + 3.5)) return { k: p.leisure, act: 'Out in ' + D[p.leisure].name };
    if (inRange(7, 21)) return { k: p.home, act: 'Running errands' };
    return { k: p.home, act: 'At home', indoors: true };
  };
  Sim.peopleIn = (k) => Sim.people.filter((p) => { const w = Sim.whereIs(p); return w.k === k && !w.indoors; });
  Sim.lookFor = (p) => {
    const r = AL.rand(p.seed);
    const style = p.style === 'ankara' && !p.fem ? 'kaftan' : p.style;
    return AL.cleanLook({
      skin: AL.pick(AL.SKINS.slice(1), r), hair: AL.pick(p.fem ? ['braids', 'gele', 'bun', 'afro'] : ['lowcut', 'bald', 'cap', 'fila', 'afro'], r),
      outfit: style, color: AL.pick(AL.OUTFIT_COLORS, r), frame: p.fem ? 'f' : 'm', body: AL.pick(['slim', 'regular', 'regular', 'broad'], r),
    });
  };

  /* ---------- stock market ---------- */
  Sim.initMarket = () => {
    const S = AL.S;
    if (!S.market || !S.market.p) {
      S.market = { p: {}, h: {}, open: {} };
      AL.STOCKS.forEach((s) => { S.market.p[s.sym] = s.price; S.market.h[s.sym] = [s.price]; S.market.open[s.sym] = s.price; });
    }
    AL.STOCKS.forEach((s) => { if (!S.market.p[s.sym]) { S.market.p[s.sym] = s.price; S.market.h[s.sym] = [s.price]; S.market.open[s.sym] = s.price; } });
  };
  Sim.marketOpen = () => AL.weekday() <= 5 && AL.isOpen(AL.MARKET_HOURS);
  Sim.marketTick = () => {
    if (!Sim.marketOpen()) return;
    const M = AL.S.market;
    AL.STOCKS.forEach((s) => {
      const p = M.p[s.sym];
      const ch = (Math.random() - 0.48) * s.vol * 2;
      M.p[s.sym] = Math.max(1, Math.round(p * (1 + ch) * 100) / 100);
      const h = M.h[s.sym]; h.push(M.p[s.sym]); if (h.length > 40) h.shift();
    });
  };
  Sim.marketNews = () => {
    if (AL.weekday() > 5 || Math.random() < 0.35) return;
    const [sym, what, move] = AL.pick(AL.NEWS);
    const M = AL.S.market; M.p[sym] = Math.max(1, Math.round(M.p[sym] * (1 + move) * 100) / 100); M.h[sym].push(M.p[sym]);
    const st = AL.STOCKS.find((s) => s.sym === sym);
    AL.msg('Market News', st.name + ' ' + what + '. ' + sym + ' ' + (move > 0 ? '+' : '') + Math.round(move * 100) + '%.', 'market');
  };
  Sim.marketOpenDay = () => { const M = AL.S.market; AL.STOCKS.forEach((s) => { M.open[s.sym] = M.p[s.sym]; }); };
  Sim.change = (sym) => { const M = AL.S.market; return (M.p[sym] - M.open[sym]) / M.open[sym]; };

  AL.Sim = Sim;
})(window.AL);
