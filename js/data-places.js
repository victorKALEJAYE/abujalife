/* Abuja Life — content for walk-in places: accessories you can see on your
   character, supermarket stock, cars, nightlife, lenders, work minigames and
   area classes. All brands are fictional. Edit these tables to add content. */
(function (AL) {
  'use strict';

  /* ---- accessories: bought in fashion stores, shown on the character ---- */
  AL.ACC = {
    'a-shades': { slot: 'eyes', color: '#141414' },
    'a-specs': { slot: 'eyes', color: '#c9a46b' },
    'w-classic': { slot: 'wrist', color: '#c7ccd1' },
    'w-smart': { slot: 'wrist', color: '#22262b' },
    'w-royale': { slot: 'wrist', color: '#e0b43a' },
    'j-chain': { slot: 'neck', color: '#e0b43a' },
    'j-beads': { slot: 'neck', color: '#c0392b' },
    'b-tote': { slot: 'bag', color: '#6b4f33' },
    's-sneakers': { slot: 'feet', color: '#f7f7f7' },
    's-loafers': { slot: 'feet', color: '#5b3b2a' },
    'h-cap': { slot: 'head', color: '#22262b' },
  };
  AL.ACC_SLOTS = { eyes: 'Eyewear', wrist: 'Watch', neck: 'Necklace', bag: 'Bag', feet: 'Shoes', head: 'Hat' };
  // tag existing catalogue items as accessories and add new ones
  AL.SHOP_ITEMS.forEach((it) => { if (AL.ACC[it.id]) it.acc = AL.ACC[it.id].slot; });
  AL.SHOP_ITEMS.push(
    { id: 'a-shades', name: 'Aviator sunglasses', cat: 'Eyewear', price: 35000, joy: 4, acc: 'eyes', where: ['mall', 'market', 'online'] },
    { id: 'a-specs', name: 'Gold-rim glasses', cat: 'Eyewear', price: 60000, joy: 4, acc: 'eyes', where: ['mall', 'online'] },
    { id: 'w-royale', name: 'Royale gold watch', cat: 'Watches', price: 1500000, joy: 18, acc: 'wrist', where: ['mall'] },
    { id: 'j-beads', name: 'Coral beads', cat: 'Jewellery', price: 80000, joy: 6, acc: 'neck', where: ['market', 'online'] },
    { id: 'h-cap', name: 'Snapback cap', cat: 'Hats', price: 15000, joy: 3, acc: 'head', where: ['mall', 'market', 'online'] },
    // supermarket stock
    { id: 'g-water', name: 'Pack of table water', cat: 'Drinks', price: 1200, food: 4, uses: 6, where: ['supermarket', 'online'] },
    { id: 'g-malt', name: 'Malt drink 6-pack', cat: 'Drinks', price: 3600, food: 6, uses: 6, joy: 1, where: ['supermarket', 'online'] },
    { id: 'g-juice', name: 'Fruit juice (1 L)', cat: 'Drinks', price: 2200, food: 6, uses: 3, where: ['supermarket'] },
    { id: 'g-chinchin', name: 'Chin chin', cat: 'Snacks', price: 1500, food: 6, uses: 3, joy: 1, where: ['supermarket'] },
    { id: 'g-plantain', name: 'Plantain chips', cat: 'Snacks', price: 1000, food: 5, uses: 2, where: ['supermarket'] },
    { id: 'g-yam', name: 'Tuber of yam', cat: 'Fresh food', price: 4500, food: 20, uses: 3, where: ['supermarket', 'online'] },
    { id: 'g-chicken', name: 'Frozen chicken', cat: 'Fresh food', price: 8500, food: 30, uses: 3, joy: 1, where: ['supermarket', 'online'] },
    { id: 'g-tomato', name: 'Tomatoes and peppers', cat: 'Fresh food', price: 3000, food: 8, uses: 3, where: ['supermarket'] },
    { id: 'h-soap', name: 'Soap and toiletries', cat: 'Household', price: 3000, joy: 2, where: ['supermarket', 'online'] },
    { id: 'h-detergent', name: 'Detergent', cat: 'Household', price: 2500, joy: 1, where: ['supermarket'] },
  );
  AL.STORES.kubwa = { kind: 'supermarket', name: 'Kubwa Value Mart' };

  /* ---- cars at the dealership (top speed in m/s) ---- */
  AL.CARS = [
    { id: 'zuma', name: 'Zuma Hatch', kind: 'hatch', price: 4500000, top: 22, color: '#e0a526', info: 'Small, cheap to run, easy to park.' },
    { id: 'kestrel', name: 'Kestrel Sedan', kind: 'sedan', price: 9500000, top: 26, color: '#2e6fd8', info: 'The reliable family saloon.' },
    { id: 'niger', name: 'Niger Pickup', kind: 'pickup', price: 12000000, top: 24, color: '#f4f4f4', info: 'Tough double-cab for any road.' },
    { id: 'savanna', name: 'Savanna SUV', kind: 'suv', price: 18000000, top: 27, color: '#22262b', info: 'Seven seats and a high driving position.' },
    { id: 'atlas', name: 'Atlas Executive', kind: 'sedan', price: 35000000, top: 31, color: '#111418', info: 'Leather, quiet cabin, made for Maitama.' },
    { id: 'falcon', name: 'Falcon GT', kind: 'sport', price: 85000000, top: 40, color: '#d1342f', info: 'Two seats. Very, very fast.' },
  ];
  AL.CAR_RESALE = 0.6;
  AL.CAR_DELIVERY = 20000;

  /* ---- nightlife ---- */
  AL.NIGHT = {
    club: { name: 'Club Ember', hours: [21, 28], regular: 20000, vip: 150000, floor: '#141018', wall: '#231a2b', accent: '#ff4fa3', dance: true },
    lounge: { name: 'Skyline Rooftop Lounge', hours: [17, 26], regular: 10000, vip: 80000, floor: '#2b2420', wall: '#3a3029', accent: '#f2b33d', dance: false },
  };
  AL.DRINKS = [
    { id: 'malt', name: 'Malt drink', price: 1500, mood: 2, en: 3 },
    { id: 'chapman', name: 'Chapman', price: 3500, mood: 4, en: 2 },
    { id: 'mocktail', name: 'Signature mocktail', price: 7000, mood: 6, en: 2 },
    { id: 'platter', name: 'Small chops platter', price: 12000, mood: 6, en: 18 },
    { id: 'bottle', name: 'VIP bottle service', price: 250000, mood: 18, en: 0, vip: true },
  ];

  /* ---- lenders: instalment loans repaid weekly from your bank account ---- */
  AL.LENDERS = {
    bank: { name: 'Capital Trust Bank', minCredit: 600, rate: 0.18, terms: [4, 8, 12], amounts: [200000, 500000, 1000000, 2000000, 5000000, 10000000] },
    mfb: { name: 'QuickCash Microfinance', minCredit: 450, rate: 0.32, terms: [2, 4, 8], amounts: [50000, 100000, 250000, 500000, 1000000, 2000000] },
  };
  AL.AFFORD = 0.4; // instalments may take up to 40% of weekly income

  /* ---- work minigames: each request names a task, pick the matching action ---- */
  AL.WORK_GAMES = {
    teller: [['Deposit', 'A customer wants to pay cash into her account'], ['Withdraw', 'A trader needs cash from his account'], ['Transfer', 'Send money to a supplier in Kano'], ['Balance', 'Print an account statement']],
    sales: [['Clothes', 'Looking for a suit for a wedding'], ['Shoes', 'Needs sneakers in size 44'], ['Phones', 'Wants a phone with a big battery'], ['Bags', 'Shopping for a leather handbag']],
    supervisor: [['Fees', 'Collect stall fees from row C'], ['Settle', 'Two traders are arguing over space'], ['Inspect', 'Check the scales at the grain stalls'], ['Report', 'Write up today\'s market report']],
    security: [['Check ID', 'A visitor walks up to the gate'], ['Open gate', 'A resident\'s car is waiting'], ['Radio', 'Report in to the control room'], ['Patrol', 'Walk the back fence']],
    clerk: [['File', 'Put the folder in the right cabinet'], ['Stamp', 'Approve this memo'], ['Scan', 'Digitise an old record'], ['Email', 'Reply to the director']],
    nurse: [['Vitals', 'Take a patient\'s blood pressure'], ['Meds', 'Give the 10 o\'clock medication'], ['Chart', 'Update the patient chart'], ['Doctor', 'Call the doctor for a review']],
    dev: [['Fix bug', 'The login button is broken'], ['Test', 'Write a test for the payment code'], ['Review', 'A teammate needs a code review'], ['Deploy', 'Ship the new release']],
    analyst: [['Buy', 'Earnings beat forecasts'], ['Sell', 'The company lost a big contract'], ['Hold', 'Nothing new in the news'], ['Report', 'The client wants a summary']],
    drive: [['Left', 'Turn left at the junction'], ['Right', 'Turn right into the estate'], ['Stop', 'A passenger is waving you down'], ['Horn', 'A goat is on the road']],
    work: [['Lift', 'A heavy load is waiting'], ['Stack', 'Pile the boxes neatly'], ['Clean', 'Clear up the work area'], ['Check', 'Count the stock']],
    talk: [['Greet', 'A new customer arrives'], ['Price', 'They ask how much it costs'], ['Bargain', 'They want a discount'], ['Thank', 'They have paid']],
    interact: [['Serve', 'Next customer in line'], ['Count', 'Count the cash'], ['Receipt', 'Print a receipt'], ['Log', 'Record the transaction']],
  };

  /* ---- area classes: luxury districts look different ---- */
  ['maitama', 'asokoro', 'jabi', 'cbd', 'wuse'].forEach((k) => { AL.D[k].lux = true; });
  ['kubwa', 'nyanya', 'karu', 'lugbe', 'gwagwalada'].forEach((k) => { AL.D[k].budget = true; });
})(window.AL);
