/* Abuja Life — saving to the Claude account (online edition) and the shared
   leaderboard. The public edition skips this and saves in the browser only. */
(function (AL) {
  'use strict';
  const O = { online: false, db: null, myRef: null, mode: 'connecting', reason: 'Playing offline. Progress saves only on this device.' };
  let saveTimer = null, saving = false, dirty = false, lastCloud = 0;

  function queue() { dirty = true; clearTimeout(saveTimer); saveTimer = setTimeout(flush, 1200); }
  async function flush() {
    if (!O.online || !O.myRef || saving || !dirty) return;
    saving = true; dirty = false;
    const body = JSON.parse(JSON.stringify(AL.S)); body.log = AL.S.log.slice(0, 8); body.worth = AL.worth(); body.updatedAt = Date.now();
    try { await O.myRef.set(body); lastCloud = Date.now(); }
    catch (e) {
      if (e && e.code === 'invalid_argument') goOffline('Your account can play but not save online. Ask the owner to invite you by email as an Editor.');
      else if (e && e.code === 'unavailable') { dirty = true; setTimeout(flush, 2000 + Math.random() * 2000); }
    }
    saving = false; if (dirty) queue();
  }
  O.flush = async () => { dirty = true; await flush(); };
  // state changes save right away; the running clock and position save every 30 s
  AL.on('change', () => { if (O.online) queue(); });
  AL.on('hour', () => { if (O.online && Date.now() - lastCloud > 30000) queue(); });

  function goOffline(reason) {
    O.online = false; O.mode = 'offline'; O.reason = reason || O.reason;
    const n = AL.$('signupNote'); if (n) n.textContent = 'Offline mode: this player saves only in this browser.';
  }
  async function connect() {
    try {
      if (!window.claude || typeof window.claude.use !== 'function') { goOffline('Playing offline. Open the game from its Claude link to save online and join the leaderboard.'); return; }
      const [dbNs, userNs] = await Promise.all([window.claude.use('db'), window.claude.use('user')]);
      if (!dbNs || !userNs) { goOffline('Playing offline. Sign in to Claude to save online.'); return; }
      const id = await userNs.id();
      if (!id) { goOffline('Playing offline. Sign in to Claude to save online and join the leaderboard.'); return; }
      O.db = dbNs; AL.uid = id; O.myRef = O.db.doc('players/' + id);
      const snap = await O.myRef.get();
      O.online = true; O.mode = 'online';
      if (snap.exists) { AL.S = AL.normalize(snap.data()); AL.S.started = true; AL.emit('loaded'); }
      else { AL.S = AL.fresh(); const n = AL.$('signupNote'); if (n) n.textContent = 'Your player saves to your Claude account.'; }
      O.db.collection('players').onSnapshot((qs) => {
        const next = {}; qs.docs.forEach((d) => { const v = d.data(); if (v) next[d.id] = v; });
        AL.others = next; AL.emit('others');
      }, () => { /* leaderboard stops updating; the game keeps working */ });
      AL.saveLocal();
    } catch (e) { goOffline('Playing offline. The online service did not answer, so progress saves only on this device.'); }
  }
  AL.Online = O;
  AL.ready = AL.EDITION === 'online' ? connect() : Promise.resolve(goOffline('Public edition. Progress saves on this device.'));
  AL.on('new-player', () => { if (O.online) O.flush(); });
})(window.AL);
