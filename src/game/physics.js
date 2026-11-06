'use strict';
/* ================= Physics ================= */
const fwd = new THREE.Vector3();
function collide(px0, pz0) {
  const r = 0.5; let hit = false;
  for (const off of [0.7, -0.7]) {
    const fx = Math.sin(player.h) * off, fz = Math.cos(player.h) * off;
    const res = pushOut(player.x + fx, player.z + fz, r);
    if (res.hit) { player.x = res.x - fx; player.z = res.z - fz; hit = true; }
  }
  for (const c of cars) {
    if (!c.mesh.visible) continue;
    const dx = player.x - c.mesh.position.x, dz = player.z - c.mesh.position.z;
    if (Math.abs(dx) > 8 || Math.abs(dz) > 8) continue;
    const ang = c.mesh.rotation.y;
    const lx = dx * Math.cos(ang) - dz * Math.sin(ang), lz = dx * Math.sin(ang) + dz * Math.cos(ang);
    const hx = c.hw + r, hz = c.hl + r;
    if (Math.abs(lx) < hx && Math.abs(lz) < hz) {
      const pxl = hx - Math.abs(lx), pzl = hz - Math.abs(lz);
      let nlx = 0, nlz = 0;
      if (pxl < pzl) nlx = Math.sign(lx) * pxl; else nlz = Math.sign(lz) * pzl;
      player.x += nlx * Math.cos(ang) + nlz * Math.sin(ang);
      player.z += -nlx * Math.sin(ang) + nlz * Math.cos(ang);
      hit = true;
    }
  }
  if (inWater(player.x, player.z) && !onRoad(player.x, player.z, 1.0)) { player.x = px0; player.z = pz0; hit = true; }
  if (hit) {
    if (Math.abs(player.v) > 11 && game.bumpCD <= 0) { game.bumpCD = 1.5; triggerFall('crash'); }
    else if (Math.abs(player.v) > 6 && game.bumpCD <= 0) onCrash(Math.abs(player.v));
    if (Math.abs(player.v) > 4 && game.bumpCD <= 0) { toast('💥 Cẩn thận! Va chạm rồi', 1.2); tone(90, 0, 0.2, 'square', 0.12); game.bumpCD = 1.5; }
    player.v *= -0.25;
  }
  player.x = THREE.MathUtils.clamp(player.x, BX0 - 60, BX1 + 60);
  player.z = THREE.MathUtils.clamp(player.z, BZ0 - 60, BZ1 + 60);
}
function updatePlayer(dt) {
  const locked = game.frozen || (police.active && police.choice === 'stop');
  const gas = !locked && (keys.KeyW || keys.ArrowUp || touch.gas);
  const brake = locked || keys.KeyS || keys.ArrowDown || touch.brake;
  const left = !game.frozen && (keys.KeyA || keys.ArrowLeft || touch.left);
  const right = !game.frozen && (keys.KeyD || keys.ArrowRight || touch.right);
  const hand = keys.Space;
  if (game.frozen) { player.v = 0; player.lean *= 0.9; return; }
  if (updateFall(dt)) return;
  const MAX = 19 * speedFactor(), REV = -3.0;
  if (profile.st.stamina < 8 && SK().deo < 5 && Math.random() < dt * 0.5) { player.steer += (Math.random() - 0.5) * 1.6; toast(L('😪 Ngủ gật! Nghỉ ngơi ngay!', '😪 Dozing off! Take a rest!'), 1); }
  let a = 0;
  if (gas) a += player.v < 0 ? 14 : 7.5 * (1 - Math.max(0, player.v) / MAX * 0.75);
  if (brake) a -= player.v > 0.2 ? 14 : (locked ? 0 : 4);
  if (hand) a -= Math.sign(player.v) * 18;
  a -= player.v * 0.12 + Math.sign(player.v) * 0.6;
  if (!gas && !brake && Math.abs(player.v) < 0.4) { player.v = 0; a = 0; }
  if (locked && Math.abs(player.v) < 0.5) { player.v = 0; a = 0; }
  player.v = THREE.MathUtils.clamp(player.v + a * dt, REV, Math.max(MAX, Math.min(player.v, 25)));
  if (player.v > MAX) player.v = Math.max(MAX, player.v - 10 * dt);
  const steerIn = Math.max(-1, Math.min(1, (left ? 1 : 0) - (right ? 1 : 0) + (touch.axis || 0)));
  player.steer += (steerIn - player.steer) * Math.min(1, dt * 6);
  const sp = Math.abs(player.v);
  player.h += player.steer * Math.min(1, sp / 3) * (1.9 - 1.0 * Math.min(1, sp / MAX)) * Math.sign(player.v || 1) * dt;
  const px0 = player.x, pz0 = player.z;
  player.x += Math.sin(player.h) * player.v * dt;
  player.z += Math.cos(player.h) * player.v * dt;
  if (!deckStep(px0, pz0, dt)) { collide(px0, pz0); checkHazards(dt); player.y = 0.07; }
  distAcc += Math.hypot(player.x - px0, player.z - pz0);
  player.lean += (-player.steer * Math.min(1, sp / 9) * 0.5 - player.lean) * Math.min(1, dt * 5);
  trailT -= dt;
  if (trailT <= 0) { trailT = 0.12; playerTrail.push({ x: player.x, z: player.z }); if (playerTrail.length > 600) { playerTrail.shift(); police.ti = Math.max(0, police.ti - 1); towTruck.ti = Math.max(0, towTruck.ti - 1); } }
}
function applyBike(dt) {
  bike.root.position.set(player.x, player.y, player.z);
  bike.root.rotation.y = player.h;
  bike.lean.rotation.z = player.lean;
  const spin = player.v * dt / bike.R;
  if (bike.frontWheel) bike.frontWheel.rotation.x += spin;
  if (bike.rearWheel) bike.rearWheel.rotation.x += spin;
}
const camPos = new THREE.Vector3(), camLook = new THREE.Vector3();
let camInit = false;
function updateCamera(dt) {
  fwd.set(Math.sin(player.h), 0, Math.cos(player.h));
  const right = new THREE.Vector3(-fwd.z, 0, fwd.x);
  const base = new THREE.Vector3(player.x, player.y, player.z);
  let desired, look; const sp = Math.abs(player.v);
  switch (game.camMode) {
    case 0: desired = base.clone().addScaledVector(fwd, -(5.2 + sp * 0.06)).add(new THREE.Vector3(0, 2.3, 0)); look = base.clone().addScaledVector(fwd, 2.5).add(new THREE.Vector3(0, 1.1, 0)); break;
    case 1: desired = base.clone().addScaledVector(fwd, -12).add(new THREE.Vector3(0, 7, 0)); look = base.clone().addScaledVector(fwd, 3).add(new THREE.Vector3(0, 0.8, 0)); break;
    case 2: desired = base.clone().addScaledVector(fwd, 0.12).add(new THREE.Vector3(0, 1.9, 0)); look = base.clone().addScaledVector(fwd, 8).add(new THREE.Vector3(0, 1.2, 0)); break;
    default: desired = base.clone().addScaledVector(right, -4.2).addScaledVector(fwd, 0.6).add(new THREE.Vector3(0, 1.3, 0)); look = base.clone().add(new THREE.Vector3(0, 0.8, 0)); break;
  }
  if (game.frozen && towTruck.g.visible) { desired = new THREE.Vector3(towTruck.x, 0, towTruck.z).addScaledVector(right, -9).add(new THREE.Vector3(0, 5, 0)); look = new THREE.Vector3(towTruck.x, 1.5, towTruck.z); }
  const k = game.camMode === 2 ? 1 : 1 - Math.exp(-dt * 5);
  if (!camInit) { camPos.copy(desired); camLook.copy(look); camInit = true; }
  camPos.lerp(desired, k); camLook.lerp(look, game.camMode === 2 ? 1 : 1 - Math.exp(-dt * 8));
  camera.position.copy(camPos); camera.lookAt(camLook);
  if (fall.on && fall.t < 0.5) { camera.position.x += (Math.random() - 0.5) * 0.35; camera.position.y += (Math.random() - 0.5) * 0.35; }
  if (game.camMode === 2) camera.rotateZ(-player.lean * 0.6);
}
