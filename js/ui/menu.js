/* Abuja Life — pause menu (Esc): resume, save, controls, start a new life. */
(function (AL) {
  'use strict';
  const $ = AL.$;
  const M = {};
  M.open = () => {
    AL.Card && AL.Card.hide();
    AL.paused = true; $('menuOv').hidden = false;
    $('menuStats').textContent = AL.cleanName(AL.S.name) + ' · Day ' + AL.day() + ' ' + AL.clock() + ' · net worth ' + AL.fmt(AL.worth());
    $('menuNew').textContent = 'Start a new life';
    $('menuResume').focus();
  };
  M.close = () => { AL.paused = false; $('menuOv').hidden = true; };
  M.bind = () => {
    $('menuResume').onclick = M.close;
    $('menuSave').onclick = () => { AL.commit(); AL.toast('Game saved.', 'good'); M.close(); };
    $('menuPhone').onclick = () => { M.close(); AL.emit('toggle-phone'); };
    let armed = false;
    $('menuNew').onclick = () => {
      if (!armed) { armed = true; $('menuNew').textContent = 'Click again to confirm: lose this life'; setTimeout(() => { armed = false; if (!$('menuOv').hidden) $('menuNew').textContent = 'Start a new life'; }, 3000); return; }
      armed = false; M.close();
      if (AL.Interior.active) AL.Interior.exit(true);
      if (AL.Vehicles.driving) AL.Vehicles.exit();
      AL.emit('new-game');
    };
  };
  AL.Menu = M;
})(window.AL);
