/* Abuja Life — life-simulation content: housing templates and rentals,
   careers, shop catalogue, stock market, location names and categories.
   All fictional brands. Edit these tables to add content. */
(function (AL) {
  'use strict';
  /* 1 map unit ≈ 55 m of real Abuja, so neighbouring district centres are ~2.6 km apart
     and a walk takes about as long in game time as it does on screen */
  AL.KM_PER_UNIT = 0.055;

  /* ---- reusable interior templates: many homes, few interiors ---- */
  AL.TEMPLATES = {
    A: { name: 'Apartment Type A', label: 'Basic apartment', size: [8, 7], stars: 1, security: 'Low', sizeLabel: 'Small', floor: '#cdb995', comfort: 0 },
    B: { name: 'Apartment Type B', label: 'Modern apartment', size: [11, 9], stars: 3, security: 'Medium', sizeLabel: 'Medium', floor: '#d9d2c4', comfort: 6 },
    C: { name: 'Apartment Type C', label: 'Luxury apartment', size: [14, 11], stars: 4, security: 'High', sizeLabel: 'Large', floor: '#ebe6dc', comfort: 12 },
    HA: { name: 'House Type A', label: 'Family house', size: [14, 11], stars: 3, security: 'Medium', sizeLabel: 'Large', floor: '#cdb995', comfort: 8 },
    HB: { name: 'House Type B', label: 'Luxury house', size: [18, 13], stars: 5, security: 'Very high', sizeLabel: 'Very large', floor: '#efeae0', comfort: 16 },
  };
  AL.HOME_TEMPLATE = { room: 'A', miniflat: 'A', bungalow: 'HA', flat: 'B', duplex: 'HA', mansion: 'HB', villa: 'HB' };
  /* weekly rent; one game week = 7 game days */
  AL.RENTALS = [
    { id: 'r-kubwa', name: 'Self-con', at: 'kubwa', tpl: 'A', rent: 15000 },
    { id: 'r-karu', name: 'Mini flat', at: 'karu', tpl: 'A', rent: 25000 },
    { id: 'r-gwarinpa', name: '2-bedroom flat', at: 'gwarinpa', tpl: 'B', rent: 60000 },
    { id: 'r-wuse', name: 'Wuse 2 apartment', at: 'wuse', tpl: 'B', rent: 110000 },
    { id: 'r-jabi', name: 'Lakeside apartment', at: 'jabi', tpl: 'B', rent: 140000 },
    { id: 'r-maitama', name: 'Luxury apartment', at: 'maitama', tpl: 'C', rent: 350000 },
    { id: 'r-asokoro', name: 'Luxury house', at: 'asokoro', tpl: 'HB', rent: 900000 },
  ];
  AL.AGENT_FEE = 0.1;

  /* ---- salaried careers (pay per shift goes into your bank account) ---- */
  AL.CAREERS = [
    { id: 'security', title: 'Security guard', employer: 'Maitama Estates Security', at: 'maitama', venue: 'work', pay: 12000, req: 0, start: 18, end: 26, days: [1, 2, 3, 4, 5, 6, 7], en: 30 },
    { id: 'sales', title: 'Sales associate', employer: 'Jabi Lake Mall', at: 'jabi', venue: 'shop', pay: 15000, req: 2, start: 10, end: 18, days: [1, 2, 3, 4, 5, 6], en: 25 },
    { id: 'supervisor', title: 'Market supervisor', employer: 'Wuse Market Association', at: 'wuse', venue: 'shop', pay: 18000, req: 5, start: 7, end: 15, days: [1, 2, 3, 4, 5, 6], en: 26 },
    { id: 'clerk', title: 'Civil service clerk', employer: 'Federal Secretariat', at: 'cbd', venue: 'work', pay: 24000, req: 6, start: 8, end: 16, days: [1, 2, 3, 4, 5], en: 24 },
    { id: 'teller', title: 'Bank teller', employer: 'Capital Trust Bank', at: 'cbd', venue: 'bank', pay: 30000, req: 10, start: 8, end: 16, days: [1, 2, 3, 4, 5], en: 26 },
    { id: 'nurse', title: 'Nurse', employer: 'Garki General Hospital', at: 'garki', venue: 'clinic', pay: 34000, req: 15, start: 7, end: 15, days: [1, 2, 3, 4, 5, 6], en: 32 },
    { id: 'dev', title: 'Junior developer', employer: 'Zuma Tech Hub', at: 'jabi', venue: 'work', pay: 48000, req: 20, start: 9, end: 17, days: [1, 2, 3, 4, 5], en: 26 },
    { id: 'analyst', title: 'Investment analyst', employer: 'Abuja Securities House', at: 'cbd', venue: 'invest', pay: 85000, req: 35, start: 9, end: 17, days: [1, 2, 3, 4, 5], en: 28 },
  ];
  AL.WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  AL.weekday = () => ((AL.day() - 1) % 7) + 1; // 1 = Monday
  AL.weekdayName = (d = AL.weekday()) => AL.WEEKDAYS[d - 1];

  /* ---- shop catalogue. where: which physical stores stock it; 'online' = Shop app (delivered next morning) ---- */
  AL.SHOP_ITEMS = [
    { id: 'c-tshirt', name: 'Plain tee & jeans', cat: 'Clothes', price: 12000, outfit: 'tshirt', where: ['mall', 'market', 'online'] },
    { id: 'c-street', name: 'Streetwear hoodie fit', cat: 'Clothes', price: 28000, outfit: 'street', where: ['mall', 'online'] },
    { id: 'c-ankara', name: 'Ankara dress', cat: 'Clothes', price: 22000, outfit: 'ankara', where: ['market', 'mall', 'online'] },
    { id: 'c-kaftan', name: 'Kaftan set', cat: 'Clothes', price: 25000, outfit: 'kaftan', where: ['market', 'online'] },
    { id: 'c-agbada', name: 'Agbada set', cat: 'Clothes', price: 65000, outfit: 'agbada', where: ['market', 'online'] },
    { id: 'c-suit', name: 'Tailored suit', cat: 'Clothes', price: 90000, outfit: 'suit', where: ['mall', 'online'] },
    { id: 'c-uniform', name: 'Work uniform', cat: 'Clothes', price: 15000, outfit: 'uniform', where: ['market', 'online'] },
    { id: 's-sneakers', name: 'Air Glide sneakers', cat: 'Shoes', price: 85000, joy: 8, where: ['mall', 'online'] },
    { id: 's-loafers', name: 'Leather loafers', cat: 'Shoes', price: 45000, joy: 5, where: ['mall', 'market', 'online'] },
    { id: 'w-classic', name: 'Classic steel watch', cat: 'Watches', price: 120000, joy: 10, where: ['mall', 'online'] },
    { id: 'w-smart', name: 'Smart watch', cat: 'Watches', price: 95000, joy: 8, where: ['mall', 'online'] },
    { id: 'p-mid', name: 'Tecra mid-range phone', cat: 'Phones', price: 180000, joy: 8, where: ['mall', 'online'] },
    { id: 'p-flag', name: 'Flagship phone', cat: 'Phones', price: 650000, joy: 15, where: ['mall', 'online'] },
    { id: 'b-tote', name: 'Leather bag', cat: 'Bags', price: 55000, joy: 6, where: ['mall', 'market', 'online'] },
    { id: 'j-chain', name: 'Gold chain', cat: 'Jewellery', price: 250000, joy: 12, where: ['mall', 'online'] },
    { id: 'e-speaker', name: 'Bluetooth speaker', cat: 'Electronics', price: 40000, joy: 5, where: ['mall', 'supermarket', 'online'] },
    { id: 'e-laptop', name: 'Laptop', cat: 'Electronics', price: 450000, joy: 10, where: ['mall', 'online'] },
    { id: 'g-rice', name: 'Bag of rice (5 kg)', cat: 'Groceries', price: 9000, food: 25, uses: 4, where: ['market', 'supermarket', 'online'] },
    { id: 'g-noodles', name: 'Carton of noodles', cat: 'Groceries', price: 12000, food: 15, uses: 6, where: ['market', 'supermarket', 'online'] },
    { id: 'g-bread', name: 'Bread and eggs', cat: 'Groceries', price: 3500, food: 12, uses: 2, where: ['market', 'supermarket', 'online'] },
    { id: 'g-fruit', name: 'Fruit basket', cat: 'Groceries', price: 5000, food: 10, uses: 3, joy: 2, where: ['market', 'supermarket', 'online'] },
  ];
  AL.DELIVERY_FEE = 1500;
  AL.STORES = { jabi: { kind: 'mall', name: 'Jabi Lake Mall' }, wuse: { kind: 'market', name: 'Wuse Market' }, gwarinpa: { kind: 'supermarket', name: 'Grand Square Supermarket' } };

  /* ---- fictional stock exchange ---- */
  AL.STOCKS = [
    { sym: 'ABJEN', name: 'Abuja Energy', price: 145.2, vol: 0.012, div: 0.01 },
    { sym: 'NTH', name: 'Nigerian Tech Holdings', price: 82.4, vol: 0.02, div: 0 },
    { sym: 'ABG', name: 'African Bank Group', price: 210.5, vol: 0.009, div: 0.015 },
    { sym: 'SAGRO', name: 'Sahel Agro', price: 34.1, vol: 0.016, div: 0.005 },
    { sym: 'ZCEM', name: 'Zuma Cement', price: 262.0, vol: 0.008, div: 0.012 },
    { sym: 'NTEL', name: 'Naija Telecom', price: 118.6, vol: 0.011, div: 0.008 },
  ];
  AL.MARKET_HOURS = [9, 17];
  AL.NEWS = [
    ['ABJEN', 'wins a new power distribution contract', 0.06], ['ABJEN', 'faces a grid shutdown in two states', -0.05],
    ['NTH', 'raises funding for a new fintech app', 0.08], ['NTH', 'misses its quarterly user targets', -0.07],
    ['ABG', 'reports record half-year profit', 0.05], ['ABG', 'is fined over late filings', -0.04],
    ['SAGRO', 'expects a bumper harvest', 0.07], ['SAGRO', 'loses crops to flooding', -0.08],
    ['ZCEM', 'lands a federal road project', 0.05], ['ZCEM', 'pauses a kiln for repairs', -0.04],
    ['NTEL', 'rolls out 5G in Abuja', 0.06], ['NTEL', 'suffers a network outage', -0.05],
  ];

  /* ---- loans ---- */
  AL.LOAN = { lender: 'Capital Trust QuickLoan', dailyRate: 0.01, termDays: 14 };
  AL.creditLimit = (score) => Math.max(0, Math.round(((score - 350) * 1200) / 1000) * 1000);

  /* ---- location names for map and venues (fictional businesses) ---- */
  AL.FOOD_PLACES = { garki: "Mama Nkechi's Kitchen", wuse: 'Wuse Suya Corner', kubwa: 'Kubwa Roadside Grill', jabi: 'Jabi Mall Food Court', maitama: 'The Maitama Table', gwagwalada: 'Campus Bole Joint', giri: 'Giri Nono Spot', nyanya: 'Nyanya Akara Stand', apo: 'Apo Fish Pepper', karu: 'Karu Masa House' };
  AL.WORK_PLACES = { cbd: 'Federal Secretariat', jabi: 'Zuma Tech Hub', maitama: 'Maitama Estates Security' };
  AL.CATEGORIES = [
    ['homes', 'Homes', '#d1342f'], ['jobs', 'Jobs', '#0b7a4b'], ['banks', 'Banks', '#16a085'], ['food', 'Food', '#e0a526'],
    ['shopping', 'Shopping', '#e67e22'], ['transport', 'Transport', '#2e9e5b'], ['entertainment', 'Fun', '#8e44ad'],
    ['healthcare', 'Health', '#c0392b'], ['religion', 'Religion', '#6aa0d8'], ['investments', 'Invest', '#1d6fa5'],
    ['businesses', 'Business', '#9b59b6'], ['landmarks', 'Landmarks', '#b7791f'],
  ];
  AL.VENUE_CATEGORY = { jobs: 'jobs', food: 'food', estate: 'homes', biz: 'businesses', bank: 'banks', atm: 'banks', taxi: 'transport', park: 'transport', shop: 'shopping', invest: 'investments', clinic: 'healthcare', work: 'jobs' };
  AL.LANDMARK_CATEGORY = { mosque: 'religion', ecwa: 'religion', airport: 'transport', stadium: 'entertainment', millennium: 'entertainment', jabilake: 'entertainment' };
})(window.AL);
