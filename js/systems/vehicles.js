/* Abuja Life — cars you own and drive.
   Buy one at Apex Motors (Jabi), test drive first, press F to get in or out,
   W/S to drive and brake, A/D to steer, Space for the handbrake. Owned cars
   stay where you park them; the dealership can deliver one to your home
   parking space. Saved in S.cars as { id, model, color, x, z, rot }. */
(function (AL) {
  'use strict';
  const T = AL.T;
  if (!T) return;
  const K = AL.Kit, W = AL.W;
  const V = { cars: [], driving: null, speed: 0, saveT: 0 };
  const S = () => AL.S;
  V.model = (id) => AL.CARS.find((m) => m.id === id);

  /* ---- car bodies, authored in metres; the front is +z ---- */
  const DIMS = {
    hatch: { L: 3.9, Wd: 1.75, H: 0.72, cL: 2.1, cH: 0.66, cz: -0.25 },
    sedan: { L: 4.7, Wd: 1.85, H: 0.68, cL: 2.4, cH: 0.62, cz: -0.15 },
    suv: { L: 4.8, Wd: 1.95, H: 0.98, cL: 3.1, cH: 0.74, cz: -0.4 },
    pickup: { L: 5.3, Wd: 1.9, H: 0.92, cL: 2.3, cH: 0.74, cz: 0.45 },
    sport: { L: 4.4, Wd: 1.95, H: 0.52, cL: 1.8, cH: 0.5, cz: -0.35 },
  };
  V.build = (modelId, color) => {
    const m = V.model(modelId) || AL.CARS[0], d = DIMS[m.kind], g = new T.Group(), c = color || m.color;
    const clr = 0.3, box = K.box;
    box(g, d.Wd, d.H, d.L, c, 0, clr, 0);
    box(g, d.Wd * 0.9, d.cH, d.cL, '#24313d', 0, clr + d.H, d.cz);
    box(g, d.Wd * 0.86, 0.06, d.cL * 0.9, c, 0, clr + d.H + d.cH, d.cz);
    if (m.kind === 'pickup') { const bz = -d.L / 2 + 1.0; [-1, 1].forEach((s) => box(g, 0.08, 0.35, 1.9, c, s * (d.Wd / 2 - 0.05), clr + d.H, bz)); box(g, d.Wd, 0.35, 0.08, c, 0, clr + d.H, -d.L / 2 + 0.05); }
    if (m.kind === 'sport') box(g, d.Wd * 0.9, 0.06, 0.4, '#111', 0, clr + d.H + 0.25, -d.L / 2 + 0.25);
    [[-1, 1], [1, 1], [-1, -1], [1, -1]].forEach(([sx, sz]) => K.wheel(g, sx * (d.Wd / 2 - 0.02), 0.36, sz * (d.L / 2 - 0.85), 0.36));
    [-1, 1].forEach((s) => { box(g, 0.42, 0.14, 0.06, '#fff6c2', s * (d.Wd / 2 - 0.35), clr + d.H - 0.28, d.L / 2); box(g, 0.4, 0.14, 0.06, '#c0392b', s * (d.Wd / 2 - 0.35), clr + d.H - 0.28, -d.L / 2); });
    g.userData.len = d.L;
    return g;
  };

  /* ---- spawning owned cars in the world ---- */
  function addCar(rec) {
    const g = V.build(rec.model, rec.color);
    g.position.set(rec.x, AL.City.groundY(rec.x, rec.z), rec.z); g.rotation.y = rec.rot || 0;
    AL.scene.add(g);
    const car = { rec, g };
    V.cars.push(car);
    AL.Interact.add({
      id: 'car-' + rec.id, getPos: () => g.position, r: 3.4, priority: 0.3,
      hidden: () => !!V.driving || !!(AL.Interior && AL.Interior.active),
      verb: () => (rec.test ? 'Start test drive (F)' : 'Get in (F)'),
      title: () => (V.model(rec.model) || {}).name + (rec.test ? ' · test drive' : ' · yours'),
      sub: () => 'Top speed ' + Math.round((V.model(rec.model) || {}).top * 3.6) + ' km/h',
      use: () => V.enter(car),
    });
    return car;
  }
  function removeCar(car) {
    AL.scene.remove(car.g); AL.Interact.remove('car-' + car.rec.id);
    V.cars.splice(V.cars.indexOf(car), 1);
  }
  V.spawnAll = () => {
    V.cars.slice().forEach(removeCar);
    S().cars.forEach(addCar);
  };

  /* ---- getting in and out ---- */
  V.enter = (car) => {
    const P = AL.Player; if (AL.busy || V.driving) return;
    AL.Card && AL.Card.hide();
    P.standUp(); P.autoWalk = null;
    V.driving = car; V.speed = 0; V.heading = car.g.rotation.y;
    P.root.visible = false; P.vehicle = car;
    AL.emit('prompt', null); AL.emit('vehicle', car);
    if (car.rec.test) AL.toast('Test drive: ' + Math.round(car.testLeft) + ' seconds. W/S drive, A/D steer, Space brake, F to stop.');
  };
  V.exit = () => {
    const car = V.driving; if (!car) return;
    const P = AL.Player, h = car.g.rotation.y;
    // step out on the driver's side
    const ox = Math.cos(h) * 1.7, oz = -Math.sin(h) * 1.7;
    V.driving = null; P.vehicle = null; V.speed = 0;
    P.root.visible = true;
    P.place(car.g.position.x + ox, car.g.position.z + oz, h);
    car.rec.x = car.g.position.x; car.rec.z = car.g.position.z; car.rec.rot = h;
    AL.emit('vehicle', null);
    if (car.rec.test) { const done = car.onEnd; removeCar(car); if (done) done(); }
    AL.commit();
  };
  V.toggle = () => {
    if (V.driving) return V.exit();
    const P = AL.Player.pos;
    let best = null, bd = 4.2;
    V.cars.forEach((c) => { const d = Math.hypot(c.g.position.x - P.x, c.g.position.z - P.z); if (d < bd) { bd = d; best = c; } });
    if (best) V.enter(best);
    else if (!(AL.Interior && AL.Interior.active)) AL.toast(S().cars.length ? 'Walk up to your car and press F.' : 'You do not own a car. Apex Motors in Jabi sells them.');
  };

  /* ---- dealership actions ---- */
  V.testDrive = (modelId, at, rot, onEnd) => {
    const car = addCar({ id: 'test-' + Date.now(), model: modelId, color: V.model(modelId).color, x: at.x, z: at.z, rot, test: true });
    car.testLeft = 75; car.onEnd = onEnd;
    V.enter(car);
  };
  V.buy = (modelId, color, at, rot) => {
    const m = V.model(modelId);
    const how = AL.Life.pay(m.price, 'Car purchase: ' + m.name);
    if (!how) return AL.toast('You need ' + AL.fmt(m.price) + ' (cash and bank together).');
    const rec = { id: 'car' + Date.now(), model: modelId, color: color || m.color, x: at.x, z: at.z, rot };
    S().cars.push(rec); addCar(rec);
    AL.Life.mood(15);
    AL.msg('Apex Motors', 'Congratulations on your new ' + m.name + '! It is parked outside the showroom. Press F next to it to drive.', 'shop');
    AL.log('Bought a ' + m.name + ' for ' + AL.fmt(m.price) + '.');
    AL.toast('You bought a ' + m.name + '! It is parked outside.', 'good');
    AL.commit();
  };
  V.sell = (rec) => {
    const m = V.model(rec.model), val = Math.round(m.price * AL.CAR_RESALE);
    const car = V.cars.find((c) => c.rec === rec); if (car) removeCar(car);
    S().cars = S().cars.filter((c) => c !== rec);
    AL.Life.credit(val, 'Car sale: ' + m.name);
    AL.log('Sold your ' + m.name + ' to Apex Motors for ' + AL.fmt(val) + '.'); AL.toast('Sold for ' + AL.fmt(val) + ' (paid to your bank)', 'money');
    AL.commit();
  };
  /* parking space beside your home's door */
  V.garageSpot = () => { const r = AL.residence(); if (!r) return null; return AL.City.districtWorld(r.at, 5.6, -5.4); };
  V.sendHome = (rec) => {
    const spot = V.garageSpot(); if (!spot) return AL.toast('You need a home first.');
    if (!AL.Life.pay(AL.CAR_DELIVERY, 'Car delivery to home')) return AL.toast('Delivery costs ' + AL.fmt(AL.CAR_DELIVERY) + '.');
    rec.x = spot.x; rec.z = spot.z; rec.rot = 0;
    const car = V.cars.find((c) => c.rec === rec); if (car) { car.g.position.set(spot.x, AL.City.groundY(spot.x, spot.z), spot.z); car.g.rotation.y = 0; }
    AL.toast('Your car will be waiting at your home parking space.', 'good'); AL.commit();
  };
  V.value = (s = S()) => (s.cars || []).reduce((a, c) => { const m = V.model(c.model); return a + (m ? m.price * AL.CAR_RESALE : 0); }, 0);
  const baseWorth = AL.worth; AL.worth = (s = AL.S) => baseWorth(s) + V.value(s);

  /* ---- driving ---- */
  V.drive = (dt, k) => {
    const car = V.driving, m = V.model(car.rec.model);
    const thr = (k.w || k.arrowup ? 1 : 0) - (k.s || k.arrowdown ? 1 : 0);
    const steer = (k.a || k.arrowleft ? 1 : 0) - (k.d || k.arrowright ? 1 : 0);
    let v = V.speed;
    if (thr > 0) v += (v < 0 ? 14 : 4 + m.top * 0.12) * dt;
    else if (thr < 0) v -= (v > 0 ? 14 : 4) * dt;
    else v = AL.damp(v, 0, 0.7, dt);
    if (k[' ']) v = AL.damp(v, 0, 3.5, dt);
    v = AL.clamp(v, -7, m.top);
    V.heading += steer * 1.7 * dt * AL.clamp(v / 6, -1, 1);
    const h = V.heading;
    let nx = car.g.position.x + Math.sin(h) * v * dt, nz = car.g.position.z + Math.cos(h) * v * dt;
    const lim = 160 * W; nx = AL.clamp(nx, -lim, lim); nz = AL.clamp(nz, -lim, lim);
    const r = AL.City.resolve(nx, nz, 1.25);
    if (Math.abs(r.x - nx) + Math.abs(r.z - nz) > 0.05) v *= 0.5; // bumped into something
    V.speed = v;
    car.g.position.x = r.x; car.g.position.z = r.z;
    car.g.position.y = AL.damp(car.g.position.y, AL.City.groundY(r.x, r.z), 8, dt);
    car.g.rotation.y = h;
    // wheels spin a little for life
    if (car.rec.test) { car.testLeft -= dt; if (car.testLeft <= 0) { AL.toast('Test drive over. The car goes back to the showroom.'); V.exit(); return; } }
    V.saveT += dt; if (V.saveT > 3) { V.saveT = 0; car.rec.x = r.x; car.rec.z = r.z; car.rec.rot = h; }
  };
  V.kmh = () => Math.round(Math.abs(V.speed) * 3.6);
  AL.Vehicles = V;
})(window.AL);
