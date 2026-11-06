'use strict';
/* ================= Traffic law: violations, wanted level, CSGT, cameras, licence ================= */
const LAW = CFG.law.LAW;   // data/config/law.json
const police = { active: false, mode: '', x: 0, z: 0, h: 0, v: 0, t: 0, escT: 0, choice: null, kind: 'red', path: null, pi: 0, repathT: 0 };
const playerTrail = []; let trailT = 0;
const sirenR = new THREE.MeshBasicMaterial({ color: 0xff2020, toneMapped: false }), sirenB = new THREE.MeshBasicMaterial({ color: 0x2060ff, toneMapped: false });
function policeBikeMesh(withRider = true) {
  const g = buildUnderbone(0xf4f4f4);
  if (withRider) addRider(g, { hip: [0, 1.0, -0.3], sh: [0, 1.48, -0.16], head: [0, 1.7, -0.11], el: [0.29, 1.22, 0.12], hand: [0.31, 1.07, 0.44], knee: [0.2, 0.96, 0.15], foot: [0.2, 0.38, -0.02], longSleeve: true }, 0xd9c46a, 0x2f3d24, 0xf5f5f5, false);
  const r = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.09, 0.1), sirenR); r.position.set(-0.09, 1.08, -0.85); g.add(r);
  const b = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.09, 0.1), sirenB); b.position.set(0.09, 1.08, -0.85); g.add(b);
  const board = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.12, 0.02), new THREE.MeshStandardMaterial({ map: canvasTex(128, 48, (c, w, h) => { c.fillStyle = '#c62828'; c.fillRect(0, 0, w, h); c.fillStyle = '#fff'; c.font = '900 30px system-ui'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('CSGT', w / 2, h / 2 + 2); }) }));
  board.position.set(0, 0.92, 0.62); g.add(board);
  shadowAll(g); return g;
}
const policeMesh = policeBikeMesh(); policeMesh.visible = false; scene.add(policeMesh);
const towTruck = (() => {
  const t = buildTruck(0xf2f2f2); const g = new THREE.Group(); g.add(t.mesh);
  const r = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.15, 0.25), sirenR); r.position.set(-0.3, 2.45, 1.9); g.add(r);
  const b = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.15, 0.25), sirenB); b.position.set(0.3, 2.45, 1.9); g.add(b);
  const tx = canvasTex(256, 64, (c, w, h) => { c.fillStyle = '#1e40af'; c.fillRect(0, 0, w, h); c.fillStyle = '#fff'; c.font = '900 34px system-ui'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('CẢNH SÁT GIAO THÔNG', w / 2, h / 2 + 2, w - 10); });
  for (const s of [-1, 1]) { const p = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 0.8), new THREE.MeshStandardMaterial({ map: tx })); p.position.set(s * 1.06, 1.8, -0.75); p.rotation.y = s * Math.PI / 2; g.add(p); }
  g.visible = false; scene.add(g);
  return { g, x: 0, z: 0, h: 0, ti: 0, mode: '' };
})();

/* ---- checkpoints (chốt CSGT) at a few real signalised junctions ---- */
const CHECKPOINTS = [];
{
  const sorted = [...SIGNALS].sort((a, b) => a.x - b.x);
  const pickIdx = sorted.length <= 4 ? sorted.map((_, i) => i) : [0, 1, 2, 3].map(k => Math.round(k * (sorted.length - 1) / 3));
  for (const i of [...new Set(pickIdx)]) {
    const s = sorted[i];
    const px = s.x + s.az * (s.rc + 3), pz = s.z - s.ax * (s.rc + 3);
    const g = new THREE.Group(); g.position.set(px, 0.06, pz);
    const bikeP = policeBikeMesh(false); bikeP.position.set(1.4, 0, 0); bikeP.rotation.y = Math.atan2(s.ax, s.az); g.add(bikeP);
    const off = buildPassengerStanding(); off.userData.shirt.color.setHex(0xd9c46a); g.add(off);
    const hat = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.08, 14), std(0xf5f5f5)); hat.position.y = 1.86; g.add(hat);
    const tent = new THREE.Mesh(new THREE.ConeGeometry(1.6, 1.2, 4), std(0x1e40af)); tent.position.set(-1.6, 2.6, 0); g.add(tent);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.2, 6), std(0xcccccc)); pole.position.set(-1.6, 1.1, 0); g.add(pole);
    scene.add(g);
    const lb = labelSprite('🚔 Chốt CSGT'); lb.position.set(px, 5, pz); lb.scale.set(12, 3, 1); scene.add(lb);
    CHECKPOINTS.push({ x: px, z: pz, g, lb, officer: off });
  }
}
function witnessed() {
  for (const c of CHECKPOINTS) if (Math.hypot(c.x - player.x, c.z - player.z) < 75) return c;
  if (police.active && Math.hypot(police.x - player.x, police.z - player.z) < 120) return { x: police.x, z: police.z };
  return null;
}

/* ---- reporting violations ---- */
const lawCD = {};
function reportViolation(kind) {
  if (game.frozen || profile.banned || game.noViolT > 0 || game.mode !== 'drive') return;
  if ((lawCD[kind] || 0) > sigClock) return; lawCD[kind] = sigClock + (kind === 'red' ? 20 : 12);
  const law = LAW[kind];
  profile.today.viol++; if (game.order) game.order.viol = true;
  profile.st.stress = clamp01(profile.st.stress + 4);
  const w = witnessed();
  if (w) {
    profile.wanted = Math.min(5, profile.wanted + 1);
    startPursuit(kind, w);
  } else if (kind === 'red') {
    (profile.today.cam ||= []).push(kind);
    loseLicence(law.pts);
    toast(`📸 ${L('Camera ghi hình', 'Camera caught you')}: ${law.name[profile.english ? 1 : 0]}<br><span style="font-weight:500">${L('Phạt nguội', 'Ticket by mail')} ${fmtVND(law.fine)} ${L('· trừ', '· -')}${law.pts} ${L('điểm GPLX', 'licence pts')}</span>`, 3);
  } else {
    toast(`⚠️ ${law.name[profile.english ? 1 : 0]}! ${L('May mà không có CSGT…', 'Lucky no police saw that…')}`, 2);
  }
}
function loseLicence(p) {
  profile.license = Math.max(0, profile.license - p);
  if (profile.license <= 0 && !profile.licBan) { profile.licBan = 2; setTimeout(() => toast(L('🪪 Bằng lái hết điểm! Bạn bị cấm chạy 2 ngày.', '🪪 Licence at 0 points! Banned for 2 days.'), 4), 2500); }
}
function startPursuit(kind, from) {
  if (police.active) { toast(`🚨 ${L('Mức truy nã tăng', 'Wanted level up')}: ${'🚨'.repeat(profile.wanted)}`, 1.6); if (police.mode === 'pursue' && police.choice === 'flee') police.escT = 0; return; }
  const street = streetNameAt(player.x, player.z) || L('ngã tư', 'the junction');
  Object.assign(police, { active: true, mode: 'pursue', choice: null, kind, t: 0, escT: 0, x: from.x, z: from.z, v: 6, h: Math.atan2(player.x - from.x, player.z - from.z), path: null, pi: 0, repathT: 0 });
  policeMesh.visible = true;
  $('polText').innerHTML = `🚨 <b>${LAW[kind].name[profile.english ? 1 : 0]}</b> ${L('tại', 'at')} ${street}!<br>${L('CSGT ra hiệu yêu cầu dừng xe.', 'Police signal you to stop.')}${LAW[kind].real && !profile.english ? `<br><small>${LAW[kind].real}</small>` : ''}`;
  $('police').classList.remove('hidden');
  game.policeAuto = 8;
}
function policeStop() { if (!police.active || police.choice) return; police.choice = 'stop'; $('police').classList.add('hidden'); toast(L('🛑 Bạn dừng xe chấp hành. Chờ CSGT lập biên bản…', '🛑 You pull over and wait for the officer…'), 3); }
function policeFlee() { if (!police.active || police.choice) return; police.choice = 'flee'; profile.wanted = Math.min(5, profile.wanted + 1); $('police').classList.add('hidden'); toast(L('🏍️ Bỏ chạy! Mức truy nã tăng — ra khỏi tầm nhìn CSGT để thoát!', '🏍️ Fleeing! Get out of sight to escape!'), 2.5); }
$('polStop').onclick = policeStop; $('polFlee').onclick = policeFlee;
function endPolice() { police.active = false; policeMesh.visible = false; $('police').classList.add('hidden'); }
function ticket(fine, msg) { spend(fine, 'fine', true); profile.fines += fine; saveProfile(); updateProfileHUD(); toast(msg, 4.5); }
function escapeNeed() { return (6 + 3 * profile.wanted) * (SK().tho >= 3 ? 0.8 : 1); }
function escapeDist() { return SK().tho >= 4 ? 95 : 115; }
let sirenT = 0;
function updatePolice(dt) {
  if (!police.active) { if (profile.wanted > 0 && !game.frozen) { game.wantDecay = (game.wantDecay || 0) + dt; if (game.wantDecay > 30) { profile.wanted--; game.wantDecay = 0; } } return; }
  police.t += dt;
  if (game.policeAuto > 0 && !police.choice) { game.policeAuto -= dt; if (game.policeAuto <= 0) (Math.abs(player.v) < 4 ? policeStop : policeFlee)(); }
  const blink = Math.floor(police.t * 6) % 2;
  sirenR.color.setHex(blink ? 0xff2020 : 0x330000); sirenB.color.setHex(blink ? 0x110022 : 0x2060ff);
  sirenT -= dt; if (sirenT <= 0 && police.mode !== 'leave' && profile.settings.sound) { sirenT = 0.45; tone(Math.floor(police.t / 0.45) % 2 ? 920 : 680, 0, 0.4, 'square', 0.025); }
  const d = Math.hypot(player.x - police.x, player.z - police.z);
  if (police.mode === 'pursue') {
    // drive along the street network towards the player, direct when close
    police.repathT -= dt;
    if (d > 30 && police.repathT <= 0) {
      police.repathT = 1.2;
      const ne = nearestEdge(player.x, player.z, null, 120);
      const r = ne ? computeRoute({ x: police.x, z: police.z }, ne.E, ne.along) : null;
      police.path = r ? r.pts : null; police.pi = 2;
    }
    let tx = player.x - Math.cos(player.h) * 1.4, tz = player.z + Math.sin(player.h) * 1.4;
    if (d > 30 && police.path) {
      while (police.pi < police.path.length - 2 && Math.hypot(police.path[police.pi] - police.x, police.path[police.pi + 1] - police.z) < 3) police.pi += 2;
      tx = police.path[police.pi]; tz = police.path[police.pi + 1];
    }
    const vmax = police.choice === 'flee' ? 17.5 + 0.7 * profile.wanted : 16;
    const want = d < 3 ? Math.abs(player.v) : vmax;
    police.v += (want - police.v) * Math.min(1, dt * 1.6);
    const dx = tx - police.x, dz = tz - police.z, Ln = Math.hypot(dx, dz);
    if (Ln > 0.3) { police.x += dx / Ln * police.v * dt; police.z += dz / Ln * police.v * dt; police.h = angLerp(police.h, Math.atan2(dx, dz), Math.min(1, dt * 6)); }
    if (police.choice === 'stop' && d < 3.4) {
      police.mode = 'ticket'; police.t = 0;
      const law = LAW[police.kind]; loseLicence(law.pts); profile.wanted = 0;
      ticket(law.fine, `📝 ${L('Biên bản', 'Ticket')}: ${law.name[profile.english ? 1 : 0]} — ${fmtVND(law.fine)} · -${law.pts} ${L('điểm GPLX', 'licence pts')}${law.real && !profile.english ? `<br><span style="font-weight:500">${law.real}</span>` : ''}`);
    }
    if (police.choice === 'flee') {
      if (d < 2.4) return caught();
      if (d > escapeDist()) { police.escT += dt; if (police.escT > escapeNeed()) { toast(L('😅 Bạn đã cắt đuôi CSGT! Mức truy nã sẽ giảm dần.', '😅 You lost the police! Wanted level will fade.'), 3); police.mode = 'leave'; police.t = 0; } }
      else police.escT = 0;
      if (police.t > 90) { toast(L('😮‍💨 CSGT đã bỏ cuộc', '😮‍💨 The police gave up'), 3); police.mode = 'leave'; police.t = 0; }
    }
  } else if (police.mode === 'ticket') { police.v = 0; if (police.t > 4) { police.mode = 'leave'; police.t = 0; } }
  else if (police.mode === 'leave') {
    police.v = Math.min(14, police.v + dt * 5);
    police.x += Math.sin(police.h) * police.v * dt; police.z += Math.cos(police.h) * police.v * dt;
    if (police.t > 6) endPolice();
  }
  policeMesh.position.set(police.x, 0.07, police.z); policeMesh.rotation.y = police.h;
}
function trailBack(dist) {
  let acc = 0, i = playerTrail.length - 1;
  while (i > 0 && acc < dist) { acc += Math.hypot(playerTrail[i].x - playerTrail[i - 1].x, playerTrail[i].z - playerTrail[i - 1].z); i--; }
  return acc >= dist * 0.7 ? i : -1;
}
function behind(dist) { return { x: player.x - Math.sin(player.h) * dist, z: player.z - Math.cos(player.h) * dist }; }
function caught() {
  police.mode = 'tow'; police.t = 0; game.frozen = true; player.v = 0;
  const law = LAW[police.kind], fine = law.fine + 150000 * profile.wanted;
  loseLicence(law.pts + 2);
  ticket(fine, `🚔 <b>${L('Bị bắt!', 'Caught!')}</b> ${L('Bỏ chạy khi CSGT yêu cầu dừng xe.', 'You fled from the police.')}<br><span style="font-weight:500">${L('Phạt', 'Fine')} ${fmtVND(fine)} · -${law.pts + 2} ${L('điểm GPLX · xe bị tạm giữ', 'licence pts · bike impounded')}</span>`);
  profile.wanted = 0;
  cancelOrder(); game.state = 'frozen';
  const i = trailBack(110); const tp = i >= 0 ? playerTrail[i] : behind(70);
  Object.assign(towTruck, { x: tp.x, z: tp.z, ti: Math.max(0, i), mode: 'come', h: player.h, t: 0 });
  towTruck.g.visible = true;
}
function updateTow(dt) {
  const T = towTruck; if (!T.g.visible) return;
  T.t += dt;
  if (T.mode === 'come') {
    let tx = player.x - Math.sin(player.h) * 5, tz = player.z - Math.cos(player.h) * 5;
    while (T.ti < playerTrail.length - 1 && Math.hypot(playerTrail[T.ti].x - T.x, playerTrail[T.ti].z - T.z) < 3) T.ti++;
    if (T.ti < playerTrail.length - 1 && Math.hypot(tx - T.x, tz - T.z) > 15) { tx = playerTrail[T.ti].x; tz = playerTrail[T.ti].z; }
    const dx = tx - T.x, dz = tz - T.z, Ln = Math.hypot(dx, dz);
    if (Ln > 1) { T.x += dx / Ln * 10 * dt; T.z += dz / Ln * 10 * dt; T.h = angLerp(T.h, Math.atan2(dx, dz), Math.min(1, dt * 3)); }
    else { T.mode = 'load'; T.t = 0; driver.visible = false; seatedPax.visible = false; toast(L('🏗️ Xe của bạn đang bị cẩu lên xe CSGT…', '🏗️ Your bike is being towed…'), 3); }
    if (T.t > 25) { T.x = tx; T.z = tz; }
  } else if (T.mode === 'load') {
    const k = Math.min(1, T.t / 2);
    const bx = T.x - Math.sin(T.h) * 0.9, bz = T.z - Math.cos(T.h) * 0.9;
    player.x += (bx - player.x) * k * 0.2; player.z += (bz - player.z) * k * 0.2; player.y = 1.0 * k + 0.06;
    player.h = angLerp(player.h, T.h, 0.1);
    if (T.t > 2.5) { T.mode = 'leave'; T.t = 0; }
  } else if (T.mode === 'leave') {
    T.x += Math.sin(T.h) * 9 * dt; T.z += Math.cos(T.h) * 9 * dt;
    player.x = T.x - Math.sin(T.h) * 0.9; player.z = T.z - Math.cos(T.h) * 0.9; player.h = T.h; player.y = 1.06;
    if (T.t > 4) { T.g.visible = false; T.mode = ''; endPolice(); banForDay(); }
  }
  T.g.position.set(T.x, 0.07, T.z); T.g.rotation.y = T.h;
}
function banForDay() {
  profile.banned = true; saveProfile();
  showOverlay(L('⛔ Bị khóa ứng dụng', '⛔ App suspended'), L(`Xe của bạn đã bị CSGT tạm giữ.<br>Bạn <b>không thể chạy Grab đến hết ngày ${profile.day}</b>.<br><br>Thu nhập hôm nay: <b>${fmtVND(profile.money)}</b><br>Tổng tiền phạt: ${fmtVND(profile.fines)}`, `Your bike was impounded.<br>You <b>cannot drive until the end of day ${profile.day}</b>.`), L('Kết thúc ngày →', 'End the day →'), () => endDay());
}

/* ---- per-frame checks: speeding, wrong way, sidewalk ---- */
let lawT = 0, overT = 0, wrongT = 0, walkT = 0, curLimit = 50;
function speedLimitAt(E) { if (!E) return 50; if (E.c <= 1 && E.o) return 60; if (E.c >= 5) return 40; return 50; }
function checkLaw(dt) {
  lawT -= dt; if (lawT > 0) return; lawT = 0.2; const step = 0.2;
  const ne = nearestEdge(player.x, player.z, null, 20);
  const onIt = ne && ne.d < ne.E.w / 2 + 0.5;
  curLimit = speedLimitAt(onIt ? ne.E : null);
  const kmh = Math.abs(player.v) * 3.6;
  overT = kmh > curLimit + 5 ? overT + step : 0;
  if (overT > 3) { overT = 0; reportViolation('speed'); }
  if (onIt && ne.E.o && ne.E.c <= 4 && player.v > 3) {
    const p = edgeAt(ne.E, ne.along, true);
    const dot = p.dx * Math.sin(player.h) + p.dz * Math.cos(player.h);
    wrongT = dot < -0.5 ? wrongT + step : 0;
    if (wrongT > 2.5) { wrongT = 0; reportViolation('wrong'); }
  } else wrongT = 0;
  let side = false;
  if (Math.abs(player.v) > 3 && !onRoad(player.x, player.z, 0.3)) {
    for (const s of segGrid.query(player.x, player.z, 3, _q)) { if (s.c >= 6) continue; const d = segProj(player.x, player.z, s.ax, s.az, s.bx, s.bz).d; if (d < s.w / 2 + 1.9) { side = true; break; } }
  }
  walkT = side ? walkT + step : 0;
  if (walkT > 2) { walkT = 0; reportViolation('sidewalk'); }
}
