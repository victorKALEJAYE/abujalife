/* Abuja Life — game content. Add districts, jobs, food, homes, businesses or
   venues here; the systems read these tables and need no other changes. */
(function (AL) {
  'use strict';
  const GRID = 48; // map units between district centres
  const DKEYS = [
    ['kubwa', 'gwarinpa', 'jabi', 'bwari'],
    ['garki', 'wuse', 'maitama', 'nyanya'],
    ['lugbe', 'cbd', 'asokoro', 'karu'],
    ['gwagwalada', 'giri', 'kuje', 'apo'],
  ];
  const D = {
    kubwa: { name: 'Kubwa', tag: 'Busy satellite town. Cheap rooms, long rides to town.', base: '#d9c9a3' },
    gwarinpa: { name: 'Gwarinpa', tag: 'Big estates, bakeries and family flats.', base: '#d6d9c4' },
    jabi: { name: 'Jabi', tag: 'Jabi Lake Mall, startups and duplexes.', base: '#cfd8d4' },
    garki: { name: 'Garki', tag: 'Area 1 motor park, POS stands and mama put.', base: '#c9c4b8' },
    wuse: { name: 'Wuse', tag: 'Wuse Market. Everything is for sale here.', base: '#dccdb0' },
    maitama: { name: 'Maitama', tag: 'Embassies, quiet streets and big mansions.', base: '#c8d7bd' },
    lugbe: { name: 'Lugbe', tag: 'On the airport road. Porters always needed.', base: '#d3c7ad' },
    cbd: { name: 'CBD', tag: 'Central Business District. Federal Secretariat and office towers.', base: '#c3c9cf' },
    asokoro: { name: 'Asokoro', tag: 'In the shadow of Aso Rock. Villas and big deals.', base: '#c6d4bf' },
    bwari: { name: 'Bwari', tag: 'Hills, cool air and the Nigerian Law School.', base: '#cbd3b4' },
    nyanya: { name: 'Nyanya', tag: 'Crowded bus stops and the busiest traffic in town.', base: '#d4c6ae' },
    karu: { name: 'Karu', tag: 'On the Nasarawa border. Cheap mini flats and a big market.', base: '#d8cba9' },
    gwagwalada: { name: 'Gwagwalada', tag: 'University town. Okada still rules the roads here.', base: '#d6caa6' },
    giri: { name: 'Giri', tag: 'Farmland near the university. Fresh food, quiet life.', base: '#c9d3a1' },
    kuje: { name: 'Kuje', tag: 'Quarries and hard work. The pay is good if you can carry it.', base: '#cbc4b6' },
    apo: { name: 'Apo', tag: 'Apo mechanic village. If it has an engine, they can fix it.', base: '#c7c2b9' },
  };
  DKEYS.forEach((row, r) => row.forEach((k, c) => { D[k].x = (c - 1.5) * GRID; D[k].z = (r - 1.5) * GRID; D[k].key = k; }));

  /* hours: [open, close] in 24h clock; close past midnight is written as e.g. 26 (2am) */
  const JOBS = [
    { id: 'keke', name: 'Keke rider', at: 'kubwa', pay: 4000, hrs: 3, en: 20, req: 0, hours: [6, 22], anim: 'drive' },
    { id: 'bakery', name: 'Bakery shift', at: 'gwarinpa', pay: 5000, hrs: 4, en: 22, req: 0, hours: [5, 20], anim: 'work' },
    { id: 'pos', name: 'POS agent', at: 'garki', pay: 5500, hrs: 4, en: 15, req: 0, hours: [7, 21], anim: 'interact' },
    { id: 'porter', name: 'Airport porter', at: 'lugbe', pay: 7000, hrs: 3, en: 28, req: 0, hours: [5, 23], anim: 'work' },
    { id: 'suya', name: 'Suya stand helper', at: 'wuse', pay: 6500, hrs: 3, en: 20, req: 3, hours: [15, 26], anim: 'work' },
    { id: 'driver', name: 'Embassy driver', at: 'maitama', pay: 16000, hrs: 5, en: 25, req: 8, hours: [7, 19], anim: 'drive' },
    { id: 'civil', name: 'Civil servant', at: 'cbd', pay: 22000, hrs: 8, en: 30, req: 15, hours: [8, 17], anim: 'interact' },
    { id: 'tech', name: 'Startup developer', at: 'jabi', pay: 35000, hrs: 6, en: 30, req: 25, hours: [8, 22], anim: 'interact' },
    { id: 'consult', name: 'Government consultant', at: 'asokoro', pay: 150000, hrs: 6, en: 35, req: 45, hours: [9, 18], anim: 'talk' },
    { id: 'okada', name: 'Okada rider', at: 'gwagwalada', pay: 4500, hrs: 3, en: 22, req: 0, hours: [6, 21], anim: 'drive' },
    { id: 'farm', name: 'Farm hand', at: 'giri', pay: 3500, hrs: 4, en: 25, req: 0, hours: [6, 18], anim: 'work' },
    { id: 'quarry', name: 'Quarry worker', at: 'kuje', pay: 7500, hrs: 4, en: 34, req: 0, hours: [6, 18], anim: 'work' },
    { id: 'mech', name: 'Mechanic apprentice', at: 'apo', pay: 6000, hrs: 4, en: 25, req: 2, hours: [7, 20], anim: 'work' },
    { id: 'conduct', name: 'Bus conductor', at: 'nyanya', pay: 4500, hrs: 3, en: 22, req: 0, hours: [5, 22], anim: 'talk' },
    { id: 'trader', name: 'Market trader', at: 'karu', pay: 7000, hrs: 4, en: 20, req: 5, hours: [7, 20], anim: 'talk' },
    { id: 'law', name: 'Law school tutor', at: 'bwari', pay: 28000, hrs: 5, en: 25, req: 20, hours: [8, 20], anim: 'talk' },
  ];
  const FOOD = [
    { id: 'mamaput', name: 'Mama put rice and stew', at: 'garki', cost: 1200, en: 15 },
    { id: 'suya', name: 'Suya and zobo', at: 'wuse', cost: 2500, en: 25 },
    { id: 'pounded', name: 'Pounded yam and egusi', at: 'wuse', cost: 3500, en: 40 },
    { id: 'corn', name: 'Roasted corn and ube', at: 'kubwa', cost: 800, en: 10 },
    { id: 'shawarma', name: 'Shawarma at the mall', at: 'jabi', cost: 4500, en: 45 },
    { id: 'dinner', name: 'Restaurant dinner', at: 'maitama', cost: 18000, en: 70 },
    { id: 'bole', name: 'Bole and fish', at: 'gwagwalada', cost: 1500, en: 20 },
    { id: 'fura', name: 'Fura da nono', at: 'giri', cost: 700, en: 10 },
    { id: 'akara', name: 'Akara and pap', at: 'nyanya', cost: 600, en: 8 },
    { id: 'fish', name: 'Point-and-kill fish', at: 'apo', cost: 6000, en: 50 },
    { id: 'masa', name: 'Masa and miyan taushe', at: 'karu', cost: 1000, en: 14 },
  ];
  const HOMES = [
    { id: 'room', name: 'Self-con room', at: 'kubwa', price: 250000, stock: 40 },
    { id: 'miniflat', name: 'Mini flat', at: 'karu', price: 600000, stock: 30 },
    { id: 'bungalow', name: 'Bungalow', at: 'gwagwalada', price: 900000, stock: 25 },
    { id: 'flat', name: '2-bedroom flat', at: 'gwarinpa', price: 2500000, stock: 25 },
    { id: 'duplex', name: 'Duplex', at: 'jabi', price: 12000000, stock: 12 },
    { id: 'mansion', name: 'Mansion', at: 'maitama', price: 60000000, stock: 6 },
    { id: 'villa', name: 'Villa', at: 'asokoro', price: 120000000, stock: 3 },
  ];
  const BIZ = [
    { id: 'pos', name: 'POS kiosk', at: 'garki', price: 150000, profit: 6000 },
    { id: 'barber', name: 'Barbershop', at: 'nyanya', price: 400000, profit: 15000 },
    { id: 'suyaspot', name: 'Suya spot', at: 'wuse', price: 600000, profit: 22000 },
    { id: 'kekefleet', name: 'Keke fleet', at: 'kubwa', price: 900000, profit: 32000 },
    { id: 'workshop', name: 'Mechanic workshop', at: 'apo', price: 1500000, profit: 50000 },
    { id: 'poultry', name: 'Poultry farm', at: 'giri', price: 2000000, profit: 65000 },
    { id: 'pharmacy', name: 'Pharmacy', at: 'gwagwalada', price: 4000000, profit: 120000 },
    { id: 'supermkt', name: 'Supermarket', at: 'jabi', price: 10000000, profit: 280000 },
    { id: 'filling', name: 'Filling station', at: 'lugbe', price: 25000000, profit: 650000 },
    { id: 'techhub', name: 'Tech hub', at: 'cbd', price: 50000000, profit: 1200000 },
    { id: 'hotel', name: 'Hotel', at: 'maitama', price: 80000000, profit: 1800000 },
  ];
  const FURN = [
    { id: 'mattress', name: 'Foam mattress', cost: 35000, comfort: 3 },
    { id: 'fan', name: 'Standing fan', cost: 25000, comfort: 2 },
    { id: 'bed', name: 'Bed frame', cost: 180000, comfort: 6 },
    { id: 'table', name: 'Dining table', cost: 150000, comfort: 3 },
    { id: 'art', name: 'Rug and wall art', cost: 120000, comfort: 3 },
    { id: 'gen', name: 'Generator', cost: 250000, comfort: 4 },
    { id: 'fridge', name: 'Fridge', cost: 280000, comfort: 3 },
    { id: 'tv', name: 'Flat-screen TV', cost: 300000, comfort: 4 },
    { id: 'sofa', name: 'Sofa set', cost: 350000, comfort: 5 },
    { id: 'ac', name: 'Air conditioner', cost: 450000, comfort: 6 },
    { id: 'solar', name: 'Solar inverter', cost: 1500000, comfort: 8 },
  ];

  /* ---- character look options (modular: add an entry and the creator + builder pick it up) ---- */
  const SKINS = ['#f1c9a5', '#d9a37a', '#b97a4f', '#8d5534', '#6b3e23', '#4a2a17'];
  const SKIN_NAMES = { '#f1c9a5': 'Light', '#d9a37a': 'Light brown', '#b97a4f': 'Brown', '#8d5534': 'Medium brown', '#6b3e23': 'Dark brown', '#4a2a17': 'Deep brown' };
  const FRAMES = [['m', 'Male'], ['f', 'Female']];
  const BODIES = [['slim', 'Slim'], ['regular', 'Regular'], ['broad', 'Broad']];
  const HAIRS = [['lowcut', 'Low cut'], ['afro', 'Afro'], ['braids', 'Braids'], ['bald', 'Bald'], ['cap', 'Face cap'], ['gele', 'Gele'], ['fila', 'Fila cap'], ['bun', 'Puff bun']];
  const OUTFITS = [['tshirt', 'T-shirt & jeans'], ['street', 'Streetwear'], ['agbada', 'Agbada'], ['kaftan', 'Kaftan'], ['ankara', 'Ankara dress'], ['suit', 'Suit'], ['uniform', 'Work uniform']];
  const OUTFIT_COLORS = ['#2e6fd8', '#0b7a4b', '#f4f0e6', '#d1342f', '#e0a526', '#8e44ad', '#22262b', '#e67e22'];
  const COLORS = ['#0b7a4b', '#d1342f', '#2e6fd8', '#e0a526', '#8e44ad', '#e67e22', '#16a085', '#222831'];
  const DEFAULT_LOOK = { skin: '#8d5534', hair: 'lowcut', outfit: 'tshirt', color: '#2e6fd8', frame: 'm', body: 'regular' };
  function cleanLook(l) {
    l = l && typeof l === 'object' ? l : {};
    return {
      skin: SKINS.includes(l.skin) ? l.skin : DEFAULT_LOOK.skin,
      hair: HAIRS.some((h) => h[0] === l.hair) ? l.hair : DEFAULT_LOOK.hair,
      outfit: OUTFITS.some((o) => o[0] === l.outfit) ? l.outfit : DEFAULT_LOOK.outfit,
      color: OUTFIT_COLORS.includes(l.color) ? l.color : DEFAULT_LOOK.color,
      frame: FRAMES.some((f) => f[0] === l.frame) ? l.frame : (l.outfit === 'ankara' || l.hair === 'gele' ? 'f' : 'm'),
      body: BODIES.some((b) => b[0] === l.body) ? l.body : DEFAULT_LOOK.body,
    };
  }

  /* ---- venues: interactive spots placed on each district plaza (map units, relative to district centre) ---- */
  const VENUE_TYPES = {
    jobs: { verb: 'Find work', sign: 'JOBS', color: '#0b7a4b', hours: null },
    food: { verb: 'Order food', sign: 'CHOP', color: '#e0a526', hours: [6, 24] },
    estate: { verb: 'Visit estate agent', sign: 'HOMES', color: '#2e6fd8', hours: [8, 19] },
    biz: { verb: 'Business office', sign: 'BIZ', color: '#8e44ad', hours: [7, 21] },
    bank: { verb: 'Enter bank', sign: 'BANK', color: '#16a085', hours: [8, 16] },
    atm: { verb: 'Use ATM', sign: 'ATM', color: '#16a085', hours: null },
    taxi: { verb: 'Take a taxi', sign: 'TAXI', color: '#2e9e5b', hours: null },
    home: { verb: 'Enter your home', sign: 'HOME', color: '#d1342f', hours: null },
    park: { verb: 'Sleep at the motor park', sign: 'PARK', color: '#6f7f8f', hours: null },
    bench: { verb: 'Sit down', sign: '', color: '#8a6a3e', hours: null },
    shop: { verb: 'Go shopping', sign: 'SHOP', color: '#d1342f', hours: [9, 21] },
    invest: { verb: 'Enter investment house', sign: 'INVEST', color: '#1d6fa5', hours: [9, 17] },
    clinic: { verb: 'Enter hospital', sign: 'HOSPITAL', color: '#c0392b', hours: null },
    work: { verb: 'Enter office', sign: 'OFFICE', color: '#3d4f63', hours: [7, 20] },
    worship: { verb: 'Visit', sign: 'FAITH', color: '#6aa0d8', hours: [5, 21] },
  };
  const VENUE_SPOTS = {
    taxi: [2.6, 8.5], jobs: [-3.2, -3.0], food: [3.2, -3.0], estate: [-3.2, 3.0], biz: [3.2, 3.0],
    bank: [0, -3.6], atm: [1.4, -3.6], home: [0, -6.4], park: [-1.6, 6.2], bench: [-2.2, 0.3],
    shop: [-3.4, -6.3], invest: [3.4, -6.3], clinic: [3.6, 6.2], work: [2.4, 0.3],
  };
  function venuesFor(k) {
    const list = [{ type: 'taxi' }];
    if (JOBS.some((j) => j.at === k)) list.push({ type: 'jobs' });
    if (FOOD.some((f) => f.at === k)) list.push({ type: 'food' });
    if (HOMES.some((h) => h.at === k)) list.push({ type: 'estate' });
    if (BIZ.some((b) => b.at === k)) list.push({ type: 'biz' });
    if (k === 'cbd') list.push({ type: 'bank' });
    if (k === 'cbd' || k === 'wuse' || k === 'jabi' || k === 'garki') list.push({ type: 'atm' });
    if (k === 'garki') list.push({ type: 'park' });
    if (k === 'jabi' || k === 'wuse' || k === 'gwarinpa') list.push({ type: 'shop' });
    if (k === 'cbd') list.push({ type: 'invest' });
    if (k === 'garki') list.push({ type: 'clinic' });
    if (k === 'cbd' || k === 'jabi' || k === 'maitama') list.push({ type: 'work' });
    if (!list.some((v) => v.type === 'estate') && (AL.RENTALS || []).some((r) => r.at === k)) list.push({ type: 'estate' });
    list.push({ type: 'home' });
    list.push({ type: 'bench' });
    return list.map((v) => ({ ...v, x: VENUE_SPOTS[v.type][0], z: VENUE_SPOTS[v.type][1] }));
  }

  /* ---- landmarks (map units, outside the district grid) ---- */
  const LANDMARKS = [
    { id: 'asorock', name: 'Aso Rock', x: 134, z: 30, info: 'The great granite rock behind the Presidential Villa. Abuja grew up in its shadow.' },
    { id: 'assembly', name: 'National Assembly', x: 124, z: -30, info: 'Home of the Senate and the House of Representatives, under the green dome.' },
    { id: 'eagle', name: 'Eagle Square', x: 124, z: -66, info: 'The parade ground where Democracy Day and Independence Day are marked.' },
    { id: 'mosque', name: 'National Mosque', x: -120, z: -40, info: 'Its golden dome and four minarets shine across the city.' },
    { id: 'ecwa', name: 'National Christian Centre', x: -120, z: -84, info: 'The ecumenical centre, with its tall white spire.' },
    { id: 'stadium', name: 'National Stadium', x: -122, z: 96, info: 'Big match days, concerts and the Super Eagles.' },
    { id: 'airport', name: 'Nnamdi Azikiwe Airport', x: -140, z: 40, info: 'Flights in and out of the capital.' },
    { id: 'jabilake', name: 'Jabi Lake', x: 24, z: -128, info: 'Boat rides, the mall and the lakeside breeze.' },
    { id: 'millennium', name: 'Millennium Park', x: -44, z: -128, info: 'The biggest park in Abuja. Picnics, photos and fresh air.' },
  ];

  /* ---- NPC names and lines (fictional people) ---- */
  const NPC_FIRST_M = ['Musa', 'Chinedu', 'Tunde', 'Ibrahim', 'Emeka', 'Yusuf', 'Segun', 'Ahmed', 'Obinna', 'Bello', 'Kelechi', 'Femi', 'Danjuma', 'Uche', 'Sani', 'Dayo'];
  const NPC_FIRST_F = ['Amaka', 'Aisha', 'Funke', 'Hauwa', 'Ngozi', 'Zainab', 'Bisi', 'Fatima', 'Chioma', 'Halima', 'Yetunde', 'Adaeze', 'Maryam', 'Kemi', 'Blessing', 'Rakiya'];
  const NPC_LAST = ['Abubakar', 'Okafor', 'Adeyemi', 'Mohammed', 'Eze', 'Bello', 'Okonkwo', 'Ogunleye', 'Danladi', 'Nwosu', 'Usman', 'Balogun', 'Ibekwe', 'Garba', 'Ajayi', 'Onuoha'];
  const NPC_ROLES = [
    { role: 'Bank teller', work: 'cbd', style: 'suit', start: 7.5, end: 17 },
    { role: 'Civil servant', work: 'cbd', style: 'kaftan', start: 7.5, end: 16 },
    { role: 'Trader', work: 'wuse', style: 'ankara', start: 7, end: 19 },
    { role: 'Student', work: 'gwagwalada', style: 'street', start: 7.5, end: 15 },
    { role: 'Tech worker', work: 'jabi', style: 'tshirt', start: 9, end: 19 },
    { role: 'Mechanic', work: 'apo', style: 'uniform', start: 7, end: 18 },
    { role: 'Security guard', work: 'maitama', style: 'uniform', start: 6, end: 18 },
    { role: 'Nightclub worker', work: 'wuse', style: 'street', start: 18, end: 27 },
    { role: 'Bus conductor', work: 'nyanya', style: 'tshirt', start: 5.5, end: 21 },
    { role: 'Market woman', work: 'karu', style: 'ankara', start: 6.5, end: 18 },
    { role: 'Consultant', work: 'asokoro', style: 'agbada', start: 9, end: 17 },
    { role: 'Farmer', work: 'giri', style: 'kaftan', start: 6, end: 16 },
  ];
  const GREETINGS = {
    morning: ['Good morning o!', 'Morning! Abuja traffic no go let me rest today.', 'How you dey this morning?', 'Early bird. You don chop?'],
    afternoon: ['Good afternoon. This sun no be here o.', 'Afternoon! Business is moving small small.', 'How far? Hope work dey go well.'],
    evening: ['Good evening! Time to unwind.', 'Evening o. Suya dey call my name.', 'You dey go out tonight?'],
    night: ['It is late o. Be careful on the road.', 'Night don reach. I just dey go house.', 'Abuja at night is something else.'],
  };

  Object.assign(AL, {
    GRID, DKEYS, D, JOBS, FOOD, HOMES, BIZ, FURN,
    BIZ_MAX_LVL: 5,
    RENT_RATE: 0.005, TAX_RATE: 0.10, INTEREST: 0.01, PRICE_STEP: 0.05,
    WALLS: ['#f2e6cf', '#dfe8e2', '#e6e0f0', '#f6d7c3', '#d6e4f0', '#fff6c2'], PAINT_COST: 15000,
    ROOM_SIZE: { room: [8, 7], miniflat: [10, 8], bungalow: [11, 9], flat: [12, 10], duplex: [14, 11], mansion: [16, 12], villa: [18, 13] },
    SKINS, SKIN_NAMES, FRAMES, BODIES, HAIRS, OUTFITS, OUTFIT_COLORS, COLORS, DEFAULT_LOOK, cleanLook,
    VENUE_TYPES, venuesFor, LANDMARKS,
    NPC_FIRST_M, NPC_FIRST_F, NPC_LAST, NPC_ROLES, GREETINGS,
  });
  AL.bizProfit = (b, lvl) => Math.round(b.profit * (1 + 0.5 * ((lvl || 1) - 1)));
  AL.upgradeCost = (b, lvl) => Math.round((b.price * 0.6 * lvl) / 1000) * 1000;
})(window.AL);
