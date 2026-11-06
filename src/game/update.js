'use strict';
/* ================= Game update ================= */
let saveT = 0, distAcc = 0;
const FRAME = [];
function updateGame(dt) {
  game.bumpCD -= dt; game.noViolT -= dt;
  if (!game.dayOver) {
    profile.clock += dt * MIN_PER_SEC;
    if (profile.clock >= dayEnd() && !game.frozen) { profile.clock = dayEnd(); endDay(); }
  }
  applyDaylight(profile.clock);
  saveT -= dt; if (saveT <= 0) { saveT = 5; saveProfile(); }
  tickStats(dt, distAcc); distAcc = 0;
  if (game.paused || game.dayOver) return;
  if (profile.banned || game.dayOver) return;
  if (game.state === 'wait' && phoneDead()) { }
  else if (game.state === 'wait') { game.waitT -= dt * (SK().tho >= 3 ? 1.43 : 1) * (acceptRate() < 0.5 ? 0.66 : 1); if (game.waitT <= 0 && !police.active) showOffer(makeOffer()); }
  else if (game.state === 'offer') { game.offer.expire -= dt; if (game.offer.expire <= 0) { declineOffer(); toast('⌛ Cuốc đã hết hạn', 1.5); } }
  else if (game.state === 'pickup' || game.state === 'ride') {
    if (game.state === 'ride') game.tripT += dt;
    routeT -= dt; if (routeT <= 0) { routeT = 1.2; refreshRoute(); }
    const t = currentTarget(); if (!t) return;
    const d = Math.hypot(t.x - player.x, t.z - player.z);
    const o = game.order;
    if (d < 4.5) {
      if (Math.abs(player.v) < 7) { if (!o.handling) { o.handling = true; o.type === 'batch' ? batchArrive() : game.state === 'pickup' ? arrivePickup() : arriveDrop(); } }
      else if (toastTimer <= 0) toast('🐢 Chạy chậm lại để ' + (game.state === 'pickup' ? 'đón' : 'giao'), 1.2);
    }
    if (game.state === 'ride' && o.type === 'ride' && !o.talked && game.tripT > 18 && Math.random() < dt / 8) { o.talked = true; smallTalk(); }
  }
  // traffic law
  if (!game.frozen && !player.deck) checkLaw(dt);
  if (game.noViolT <= 0 && !game.frozen && !player.deck) {
    for (const s of sigGrid.query(player.x, player.z, 40, _sq)) {
      const d = Math.hypot(s.x - player.x, s.z - player.z), core = s.rc * 0.55;
      if (s.prevD > core && d <= core && Math.abs(player.v) > 2.5 && sigClock - s.lastViol > 25) {
        const [st] = sigState(s, Math.sin(player.h), Math.cos(player.h));
        if (st === 'R') { s.lastViol = sigClock; reportViolation('red'); }
      }
      s.prevD = d;
    }
  }
}
