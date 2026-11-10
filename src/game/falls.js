'use strict';
// chỗ ngồi của người lái/khách theo từng xe (garage.js đặt lại khi đổi xe)
const RIDER = { y: 0, z: 0, box: [0, 0] };
function seatRiders() { phoneMount.position.set(0, RIDER.y, RIDER.z); foodBoxHolder.position.set(0, RIDER.box[0], RIDER.box[1]); driver.position.set(0, RIDER.y, RIDER.z); driver.rotation.set(0, 0, 0); seatedPax.position.set(0, RIDER.y, RIDER.z); seatedPax.rotation.set(0, 0, 0); }
/* ================= Té xe (falls) & road hazards ================= */
const fall = { on: false, t: 0, side: 1, canUp: false, slide: 0, cancelRide: false };
function triggerFall(reason) {
  if (fall.on || game.frozen || game.paused || game.mode !== 'drive') return;
  const sp = Math.abs(player.v);
  Object.assign(fall, { on: true, t: 0, side: Math.random() < 0.5 ? -1 : 1, canUp: false, slide: Math.min(sp, 14), cancelRide: false });
  const s = profile.st, m = mulCrash();
  const dh = (8 + sp * 1.2) * m, dd = (6 + sp * 0.8) * m;
  s.hp = clamp01(s.hp - dh); s.dura = clamp01(s.dura - dd); s.stress = clamp01(s.stress + 15);
  const o = game.order; let extra = '';
  if (o) {
    if (o.subs) for (const b of o.subs) if (b.picked && !b.done) { b.integ = Math.max(0, b.integ - 40); b.sat -= 15; }
    if (!o.subs) { o.sat -= 30; if (o.type === 'food' && game.state === 'ride') o.integ = Math.max(0, o.integ - 40); }
    if (o.type === 'ride' && game.state === 'ride') { extra = L('<br>Khách bị trầy xước và rất bực!', '<br>Your passenger is hurt and upset!'); if (Math.random() < 0.3) fall.cancelRide = true; }
  }
  profile.today.falls = (profile.today.falls || 0) + 1;
  const msg = { crash: L('💥 Té xe do va chạm mạnh!', '💥 You crashed!'), slip: L('🌧️ Trượt bánh trên đường ướt!', '🌧️ Skidded on the wet road!'),
    pothole: L('🕳️ Sập ổ gà, té xe!', '🕳️ Pothole! You fell!'), doze: L('😪 Ngủ gật, té xe!', '😪 Dozed off and fell!') }[reason] || '💥';
  toast(`${msg}<br><span style="font-weight:500">❤️ -${Math.round(dh)} · 🔧 -${Math.round(dd)}${extra}</span>`, 3);
  tone(70, 0, 0.35, 'sawtooth', 0.15); tone(140, 0.05, 0.25, 'square', 0.08);
  $('hurt').classList.add('on'); setTimeout(() => $('hurt').classList.remove('on'), 650);
}
function updateFall(dt) {
  if (!fall.on) return false;
  fall.t += dt;
  fall.slide = Math.max(0, fall.slide - dt * 9);
  const px0 = player.x, pz0 = player.z;
  player.x += Math.sin(player.h) * fall.slide * dt; player.z += Math.cos(player.h) * fall.slide * dt;
  const r = pushOut(player.x, player.z, 0.5); player.x = r.x; player.z = r.z;
  if (inWater(player.x, player.z) && !onRoad(player.x, player.z, 1)) { player.x = px0; player.z = pz0; }
  player.v = 0;
  const k = Math.min(1, fall.t / 0.35);
  player.lean = fall.side * 1.35 * k * k;
  const rk = Math.min(1, fall.t / 0.6);
  driver.position.set(fall.side * -0.6 * rk, RIDER.y - (0.35 + RIDER.y) * rk, RIDER.z - 0.4 * rk); driver.rotation.set(-1.2 * rk, 0, fall.side * 0.4 * rk);
  if (seatedPax.visible) { seatedPax.position.set(fall.side * -0.9 * rk, RIDER.y - (0.4 + RIDER.y) * rk, RIDER.z - 0.8 * rk); seatedPax.rotation.set(-1.0 * rk, 0, fall.side * 0.5 * rk); }
  if (fall.t > 2.2 && !fall.canUp) { fall.canUp = true; $('bUp').classList.remove('hidden'); }
  if (fall.t > 7) standUp();
  return true;
}
function standUp() {
  if (!fall.on) return;
  fall.on = false; player.lean = 0;
  seatRiders();
  $('bUp').classList.add('hidden'); passTime(2);
  if (fall.cancelRide && game.order) { fall.cancelRide = false; toast(L('😠 Khách hủy chuyến sau cú té và đi xe khác.', '😠 The passenger cancelled and left.'), 3); profile.week.cancels++; cancelOrder(); }
  else toast(L('🛵 Dựng xe dậy — chạy cẩn thận nhé!', '🛵 Back on the bike — ride carefully!'), 1.6);
}
$('bUp').onclick = () => { if (fall.canUp) standUp(); };

// potholes (always) and puddles (visible when it rains)
const HAZ = [], hazGrid = new Grid(20);
{
  const rs = MAP.roads.filter(r => !r.e && r.c >= 2 && r.c <= 5);
  for (let i = 0; i < 360; i++) {
    const r = rs[Math.floor(rand() * rs.length)]; const n = r.p.length / 2; if (n < 2) continue;
    const k = Math.floor(rand() * (n - 1)) * 2, t = rand();
    const ax = r.p[k], az = r.p[k + 1], bx = r.p[k + 2], bz = r.p[k + 3], Ln = Math.hypot(bx - ax, bz - az); if (Ln < 4) continue;
    const off = (rand() - 0.5) * r.w * 0.6;
    const x = ax + (bx - ax) * t - (bz - az) / Ln * off, z = az + (bz - az) * t + (bx - ax) / Ln * off;
    const kind = i < 240 ? 'pot' : 'pud';
    HAZ.push({ x, z, r: kind === 'pot' ? 0.35 + rand() * 0.35 : 1.2 + rand() * 1.6, kind });
  }
  HAZ.forEach(h => hazGrid.addBox(h.x - h.r, h.z - h.r, h.x + h.r, h.z + h.r, h));
  const mk = (list, mat, y) => {
    const m = new THREE.InstancedMesh(new THREE.CircleGeometry(1, 14).rotateX(-Math.PI / 2), mat, list.length);
    const o = new THREE.Object3D();
    list.forEach((h, i) => { o.position.set(h.x, y, h.z); o.scale.set(h.r, 1, h.r * (0.7 + (i % 5) * 0.08)); o.rotation.set(0, i, 0); o.updateMatrix(); m.setMatrixAt(i, o.matrix); });
    m.receiveShadow = true; scene.add(m); return m;
  };
  mk(HAZ.filter(h => h.kind === 'pot'), std(0x26282c, { roughness: 1 }), 0.095);
  var puddleMesh = mk(HAZ.filter(h => h.kind === 'pud'), new THREE.MeshStandardMaterial({ color: 0x5d7f99, roughness: 0.05, metalness: 0.4, transparent: true, opacity: 0.75 }), 0.096);
  puddleMesh.visible = false;
}
const _hq = [];
function checkHazards(dt) {
  puddleMesh.visible = rain > 0.2;
  if (fall.on || game.frozen) return;
  const sp = Math.abs(player.v);
  for (const h of hazGrid.query(player.x, player.z, 2, _hq)) {
    if (Math.hypot(h.x - player.x, h.z - player.z) > h.r + 0.2) continue;
    if (h.kind === 'pot' && sp > 6 && (h.hitT || 0) < sigClock) {
      h.hitT = sigClock + 2;
      if (SK().lai >= 5) continue;                      // skill: immune to potholes
      profile.st.dura = clamp01(profile.st.dura - 1); if (game.order && !game.order.subs) game.order.sat -= 3;
      player.steer += (Math.random() - 0.5) * 1.2; tone(90, 0, 0.12, 'square', 0.08);
      if (sp > 13 && Math.random() < 0.4) triggerFall('pothole'); else toast('🕳️ ' + L('Ổ gà!', 'Pothole!'), 0.9);
    }
    if (h.kind === 'pud' && rain > 0.2 && sp > 5) {
      player.v *= 1 - dt * 1.5;
      if (sp > 12 && Math.random() < dt * 0.8 * (1 - 0.25 * UP().brake)) triggerFall('slip');
    }
  }
  // skidding on wet roads when turning hard at speed
  if (rain > 0.3 && sp > 12 && Math.abs(player.steer) > 0.7 && Math.random() < dt * 0.35 * (raincoat ? 0.8 : 1) * (SK().lai >= 3 ? 0.5 : 1) * (1 - 0.25 * UP().brake)) triggerFall('slip');
  if (profile.st.stamina < 4 && SK().deo < 5 && sp > 5 && Math.random() < dt * 0.15) triggerFall('doze');
}
