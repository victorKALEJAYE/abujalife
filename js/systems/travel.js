/* Abuja Life — travel system. One place that knows how to get from where the
   player is to any location: distance, time (using simulated traffic), cost,
   arrival time, and the journey itself (watch the ride or skip it with a
   short travel transition; the clock always advances). Also navigation
   (directions + beacon) for walking. */
(function (AL) {
  'use strict';
  const Travel = {};
  const fmt = AL.fmt;
  Travel.MODES = {
    walk: { name: 'Walk', kmh: 5, base: 0, perKm: 0, note: 'Free · follow the directions' },
    bus: { name: 'Bus', kmh: 16, base: 150, perKm: 60, wait: 10, fromPark: true, note: 'Cheapest ride · from a taxi & bus park' },
    taxi: { name: 'Taxi', base: 300, perKm: 280, wait: 2, fromPark: true, note: 'From a taxi & bus park' },
    ride: { name: 'Ride-hailing', base: 500, perKm: 340, wait: 5, app: true, note: 'Picks you up where you stand' },
  };
  const here = () => ({ mx: AL.Player.pos.x / AL.W, mz: AL.Player.pos.z / AL.W });
  Travel.km = (a, b) => (Math.abs(a.mx - b.mx) + Math.abs(a.mz - b.mz)) * 1.1 * AL.KM_PER_UNIT;
  Travel.kmTo = (loc) => Travel.km(here(), { mx: loc.ax, mz: loc.az });
  Travel.fmtKm = (km) => (km < 1 ? Math.max(50, Math.round(km * 1000 / 50) * 50) + ' m' : km.toFixed(1) + ' km');
  Travel.fmtMin = (m) => (m < 60 ? Math.max(1, Math.round(m)) + ' min' : Math.floor(m / 60) + ' h ' + AL.pad(Math.round(m % 60)) + ' min');
  Travel.arriveAt = (mins) => { const t = AL.S.t + mins / 60; const h = ((t % 24) + 24) % 24; return AL.pad(Math.floor(h)) + ':' + AL.pad(Math.floor((h % 1) * 60)); };
  Travel.quote = (loc, mode) => {
    const M = Travel.MODES[mode];
    const km = Travel.kmTo(loc);
    const fromK = AL.City.districtAt(AL.Player.pos.x, AL.Player.pos.z).key;
    const traffic = [AL.Sim.trafficAt(fromK), AL.Sim.trafficAt(loc.district)];
    const kmh = M.kmh || (traffic[0].kmh + traffic[1].kmh) / 2;
    const surge = mode === 'ride' && (traffic[0].level === 'Heavy' || traffic[1].level === 'Heavy') ? 1.25 : 1;
    const cost = mode === 'walk' ? 0 : Math.round(((M.base + M.perKm * km) * surge) / 50) * 50;
    const mins = (km / kmh) * 60 + (M.wait || 0);
    return { mode, km, mins, cost, surge: surge > 1, traffic: traffic[1], arrive: Travel.arriveAt(mins) };
  };
  Travel.atPark = () => AL.City.venues.some((v) => (v.type === 'taxi' || v.type === 'park') && Math.hypot(v.mx * AL.W - AL.Player.pos.x, v.mz * AL.W - AL.Player.pos.z) < 30);

  /* ---------- navigation (directions) ---------- */
  const Nav = { beacon: null };
  Nav.set = (id) => {
    const loc = AL.Sim.get(id); if (!loc) return;
    AL.S.nav = id; AL.toast('Directions set to ' + loc.name + '.', 'good');
    Nav.place(); AL.emit('nav'); AL.saveLocal();
  };
  Nav.clear = (arrived) => {
    const loc = AL.S.nav && AL.Sim.get(AL.S.nav);
    AL.S.nav = null; if (Nav.beacon) Nav.beacon.visible = false;
    if (arrived && loc) AL.toast('You have arrived at ' + loc.name + '.', 'good');
    AL.emit('nav'); AL.saveLocal();
  };
  Nav.place = () => {
    const T = AL.T; const loc = AL.S.nav && AL.Sim.get(AL.S.nav);
    if (!loc || !AL.scene) { if (Nav.beacon) Nav.beacon.visible = false; return; }
    if (!Nav.beacon) {
      const g = new T.Group();
      const m = new T.MeshBasicMaterial({ color: 0x2fbf71, transparent: true, opacity: 0.35, depthWrite: false });
      const col = new T.Mesh(new T.CylinderGeometry(0.9, 0.9, 60, 16, 1, true), m); col.position.y = 30; g.add(col);
      const ring = new T.Mesh(new T.RingGeometry(1.6, 2.4, 32), new T.MeshBasicMaterial({ color: 0x2fbf71, side: T.DoubleSide, transparent: true, opacity: 0.8 })); ring.rotation.x = -Math.PI / 2; ring.position.y = 0.15; g.add(ring);
      g.userData.ring = ring; AL.scene.add(g); Nav.beacon = g;
    }
    const p = AL.Sim.arrivalWorld(loc);
    Nav.beacon.position.set(p.x, AL.City.groundY(p.x, p.z), p.z); Nav.beacon.visible = true;
  };
  Nav.tick = (t) => {
    const loc = AL.S.nav && AL.Sim.get(AL.S.nav); if (!loc) return null;
    const p = AL.Sim.arrivalWorld(loc), P = AL.Player.pos;
    const d = Math.hypot(p.x - P.x, p.z - P.z);
    if (d < 7) { Nav.clear(true); return null; }
    if (Nav.beacon) { const s = 1 + Math.sin(t * 3) * 0.12; Nav.beacon.userData.ring.scale.set(s, s, s); }
    const bearing = Math.atan2(p.x - P.x, p.z - P.z);
    const y = AL.Player.cam.yaw; const camBearing = Math.atan2(-Math.sin(y), -Math.cos(y));
    return { loc, dist: d, rel: bearing - camBearing };
  };
  Travel.Nav = Nav;

  /* ---------- journeys ---------- */
  Travel.request = (id, mode) => {
    const loc = AL.Sim.get(id); if (!loc || AL.busy) return;
    if (mode === 'walk') return Nav.set(id);
    const M = Travel.MODES[mode];
    const q = Travel.quote(loc, mode);
    if (q.km < 0.25) return AL.toast('You are already close. Just walk there.');
    if (M.fromPark && !Travel.atPark()) return AL.toast(M.name + 's leave from taxi & bus parks. Walk to one, or order a ride-hailing car from your phone.');
    const how = AL.Life.pay(q.cost, M.name + ' to ' + loc.name, { bankOnly: false });
    if (!how) return AL.toast('This ' + M.name.toLowerCase() + ' costs ' + fmt(q.cost) + '. You do not have enough.');
    AL.log('Booked a ' + M.name.toLowerCase() + ' to ' + loc.name + ' for ' + fmt(q.cost) + ' (' + Travel.fmtKm(q.km) + ', ' + Travel.fmtMin(q.mins) + ').');
    AL.commit();
    AL.emit('journey', { loc, mode, q });
  };
  /* called by the journey UI once the player chooses to watch or skip */
  Travel.complete = (loc, q) => {
    const S = AL.S;
    const r = Math.random();
    if (r < 0.06) { S.t += 0.5; AL.log('Stuck at a checkpoint on the way. Lost 30 minutes.'); }
    else if (r < 0.1) { S.cash += 1000; AL.log('Found ₦1,000 on the back seat.'); }
    S.energy = Math.max(0, S.energy - 3);
    S.at = loc.district;
    if (AL.S.nav === loc.id || AL.S.nav === 'home' && loc.id === 'home') Nav.clear(false);
    AL.commit();
  };
  AL.Travel = Travel;
})(window.AL);
