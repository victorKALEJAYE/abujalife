/* Abuja Life — player state, derived values and saving.
   Keeps the same save key and fields as earlier versions so old saves load. */
(function (AL) {
  'use strict';
  const SAVE_KEY = 'abuja-life-v2';
  const { D, HOMES, BIZ, FURN, WALLS, COLORS, DEFAULT_LOOK, cleanLook } = AL;

  const fresh = () => ({
    name: '', color: COLORS[0], look: { ...DEFAULT_LOOK }, biz: {}, furn: [], wall: WALLS[0], started: false,
    cash: 5000, savings: 0, taxPaid: 0, energy: 100, t: 6, xp: 0, at: 'garki', homes: [], paid: {}, jobXp: {},
    log: ['You arrived at Area 1 motor park.'],
    // new in the open-world build
    pos: null, rel: {}, visited: [], v: 4,
    // life simulation (v4)
    age: 25, health: 100, happy: 70, credit: 550,
    home: null,            // { kind: 'rent'|'own', id, paidUntil, arrears }
    career: null,          // { id, lvl, shifts, lastShift, hired }
    inv: {}, items: [], wardrobe: ['tshirt'], deliveries: [],
    msgs: [], tx: [], loan: null, portfolio: {}, market: null, nav: null, lastDay: 1,
  });

  function cleanBiz(b) {
    const out = {};
    if (b && typeof b === 'object') {
      BIZ.forEach((x) => {
        const v = b[x.id];
        if (v && typeof v === 'object') {
          out[x.id] = {
            lvl: Math.min(AL.BIZ_MAX_LVL, Math.max(1, Math.floor(Number(v.lvl) || 1))),
            name: AL.cleanText(v.name || x.name, 28),
            invested: Number(v.invested) || x.price,
          };
        }
      });
    }
    return out;
  }
  function normalize(o) {
    const s = Object.assign(fresh(), o || {});
    ['cash', 'savings', 'taxPaid', 'energy', 't', 'xp'].forEach((k) => { s[k] = Number(s[k]) || 0; });
    if (!D[s.at]) s.at = 'garki';
    if (!Array.isArray(s.homes)) s.homes = [];
    s.homes = s.homes.filter((id) => HOMES.some((h) => h.id === id));
    if (typeof s.paid !== 'object' || !s.paid) s.paid = {};
    if (typeof s.jobXp !== 'object' || !s.jobXp) s.jobXp = {};
    if (!Array.isArray(s.log)) s.log = [];
    if (!s.t) s.t = 6;
    s.look = cleanLook(s.look);
    s.biz = cleanBiz(s.biz);
    s.furn = Array.isArray(s.furn) ? s.furn.filter((id) => FURN.some((f) => f.id === id)) : [];
    if (!WALLS.includes(s.wall)) s.wall = WALLS[0];
    s.energy = AL.clamp(s.energy, 0, 100);
    if (!s.pos || typeof s.pos !== 'object' || !isFinite(s.pos.x) || !isFinite(s.pos.z)) s.pos = null;
    if (typeof s.rel !== 'object' || !s.rel) s.rel = {};
    if (!Array.isArray(s.visited)) s.visited = [];
    ['age', 'health', 'happy', 'credit', 'lastDay'].forEach((k) => { s[k] = Number(s[k]) || fresh()[k]; });
    if (!(o && o.lastDay)) s.lastDay = Math.floor((s.t - 6) / 24) + 1;
    s.health = AL.clamp(s.health, 0, 100); s.happy = AL.clamp(s.happy, 0, 100); s.credit = AL.clamp(s.credit, 300, 850);
    if (s.home && (typeof s.home !== 'object' || !(s.home.kind === 'rent' ? (AL.RENTALS || []).some((r) => r.id === s.home.id) : HOMES.some((h) => h.id === s.home.id && s.homes.includes(h.id))))) s.home = null;
    if (s.career && !(AL.CAREERS || []).some((c) => c.id === s.career.id)) s.career = null;
    ['inv', 'portfolio'].forEach((k) => { if (typeof s[k] !== 'object' || !s[k] || Array.isArray(s[k])) s[k] = {}; });
    ['items', 'wardrobe', 'deliveries', 'msgs', 'tx'].forEach((k) => { if (!Array.isArray(s[k])) s[k] = []; });
    if (!s.wardrobe.includes(s.look.outfit)) s.wardrobe.push(s.look.outfit);
    if (s.loan && !(Number(s.loan.bal) > 0)) s.loan = null;
    return s;
  }
  function load() { try { const v = localStorage.getItem(SAVE_KEY); return v ? JSON.parse(v) : null; } catch (e) { return null; } }

  const raw = load();
  AL.S = raw ? normalize(raw) : fresh();
  AL.fresh = fresh;
  AL.normalize = normalize;
  AL.cleanBiz = cleanBiz;
  AL.cleanName = (n) => AL.cleanText(n, 16) || 'Player';
  AL.cleanColor = (c) => (/^#[0-9a-f]{6}$/i.test(c || '') ? c : '#888888');

  /* ---- clock helpers (S.t is hours since the game began; days start at 06:00) ---- */
  AL.day = () => Math.floor((AL.S.t - 6) / 24) + 1;
  AL.hour = () => ((AL.S.t % 24) + 24) % 24;
  AL.clock = () => {
    const h = AL.hour();
    let hh = Math.floor(h), mm = Math.floor((h - hh) * 60);
    return AL.pad(hh) + ':' + AL.pad(mm);
  };
  AL.phase = () => {
    const h = AL.hour();
    if (h >= 5 && h < 12) return 'morning';
    if (h >= 12 && h < 17) return 'afternoon';
    if (h >= 17 && h < 21) return 'evening';
    return 'night';
  };
  AL.isOpen = (hours) => {
    if (!hours) return true;
    const h = AL.hour();
    const [a, b] = hours;
    return b > 24 ? (h >= a || h < b - 24) : (h >= a && h < b);
  };
  AL.hoursText = (hours) => {
    if (!hours) return 'Open 24 hours';
    const f = (x) => AL.pad(Math.floor(x % 24)) + ':' + AL.pad(Math.round((x % 1) * 60));
    return 'Open ' + f(hours[0]) + '–' + f(hours[1]);
  };

  /* ---- derived values ---- */
  const S = () => AL.S;
  AL.paidFor = (id, s = S()) => Number(s.paid && s.paid[id]) || HOMES.find((h) => h.id === id).price;
  AL.homeValue = (s = S()) => (s.homes || []).reduce((a, id) => (HOMES.some((h) => h.id === id) ? a + AL.paidFor(id, s) : a), 0);
  AL.bizValue = (s) => Object.values(cleanBiz(s.biz)).reduce((a, v) => a + v.invested, 0);
  AL.worth = (s = S()) => (Number(s.cash) || 0) + (Number(s.savings) || 0) + AL.homeValue(s) + AL.bizValue(s);
  AL.bestHome = (s = S()) => { const own = HOMES.filter((h) => (s.homes || []).includes(h.id)); return own.length ? own[own.length - 1] : null; };
  /* where the player lives now: a rented or owned home, described with its interior template */
  AL.residence = (s = S()) => {
    const h = s.home; if (!h) return null;
    if (h.kind === 'rent') {
      const r = (AL.RENTALS || []).find((x) => x.id === h.id); if (!r) return null;
      return { kind: 'rent', id: r.id, name: r.name, at: r.at, tpl: r.tpl, T: AL.TEMPLATES[r.tpl], rent: r.rent, paidUntil: h.paidUntil, arrears: h.arrears || 0 };
    }
    const o = HOMES.find((x) => x.id === h.id); if (!o) return null;
    const tpl = AL.HOME_TEMPLATE[o.id] || 'A';
    return { kind: 'own', id: o.id, name: o.name, at: o.at, tpl, T: AL.TEMPLATES[tpl], rent: 0 };
  };
  AL.comfort = (s = S()) => {
    const r = AL.residence(s); if (!r) return 0;
    return r.T.comfort + (s.furn || []).reduce((a, id) => { const f = FURN.find((x) => x.id === id); return a + (f ? f.comfort : 0); }, 0);
  };
  AL.payFor = (j) => { const n = S().jobXp[j.id] || 0; return Math.round(j.pay * (1 + Math.min(n, 20) * 0.03) * (1 + AL.comfort() / 200)); };

  /* ---- multiplayer-aware stock (filled by online.js) ---- */
  AL.others = {};
  AL.uid = null;
  AL.allPlayers = () => {
    const list = Object.entries(AL.others).filter(([id]) => id !== AL.uid).map(([id, p]) => ({ id, p }));
    if (S().started) list.push({ id: AL.uid || 'me', p: S(), me: true });
    return list;
  };
  AL.sold = (id) => AL.allPlayers().filter((x) => Array.isArray(x.p.homes) && x.p.homes.includes(id)).length;
  AL.priceOf = (h) => { const n = AL.sold(h.id) - (S().homes.includes(h.id) ? 1 : 0); return Math.round((h.price * (1 + AL.PRICE_STEP * Math.max(0, n))) / 1000) * 1000; };
  AL.left = (h) => Math.max(0, h.stock - AL.sold(h.id));

  /* ---- log + save ---- */
  AL.log = (msg) => { S().log.unshift('Day ' + AL.day() + ' ' + AL.clock() + ' · ' + msg); S().log = S().log.slice(0, 40); AL.emit('log', msg); };
  AL.saveLocal = () => { try { localStorage.setItem(SAVE_KEY, JSON.stringify(S())); } catch (e) { /* storage may be blocked */ } };
  AL.save = () => { AL.saveLocal(); AL.emit('saved'); };
  /* commit: every state change goes through here so the HUD, panels and cloud save stay in step */
  AL.commit = () => { AL.save(); AL.emit('change'); };
  AL.SAVE_KEY = SAVE_KEY;
})(window.AL);
