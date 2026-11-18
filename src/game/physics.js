'use strict';
/* ================= Physics ================= */
function wrapAngle(angle) {
  return Math.atan2(Math.sin(angle), Math.cos(angle));
}
const footClear = (x, z) => !pushOut(x, z, 0.3).hit && (!inWater(x, z) || onRoad(x, z, 0.1));

function toggleMount() {
  if (game.mode !== 'drive' || game.paused || game.frozen || game.dayOver || fall.on || police.active || warping || player.foot?.action) return;
  if (player.parked) {
    const { x, z, h } = player.parked;
    if (Math.hypot(player.x - x, player.z - z) > 1.75 || !footClear((player.x + x) / 2, (player.z + z) / 2)) {
      toast(L('Đến cạnh xe để lên xe', 'Walk beside the bike to mount'), 1.8);
      return;
    }
    player.foot.action = { t: 0, mount: true, x: player.x, z: player.z, h: player.h };
    player.foot.speed = 0;
    return;
  }
  if (Math.abs(player.v) > 0.75 || player.deck || seatedPax.visible || game.order || game.offer) {
    toast(L('Dừng xe và hoàn tất cuốc trước khi xuống xe', 'Stop and finish your job before dismounting'), 1.8);
    return;
  }
  const { x, z, y, h } = player;
  const sideX = Math.cos(h) * 0.98, sideZ = -Math.sin(h) * 0.98;
  const side = [-1, 1].find(side => {
    const sx = x + sideX * side, sz = z + sideZ * side;
    return footClear(sx, sz) && footClear((sx + x) / 2, (sz + z) / 2);
  });
  if (side === undefined) {
    toast(L('Cần thêm khoảng trống bên cạnh xe', 'Leave more room beside the bike'), 1.8);
    return;
  }
  player.parked = { x, z, y, h, side };
  player.foot = { h, speed: 0, phase: 0, run: 0, action: { t: 0, mount: false, x: x + sideX * side, z: z + sideZ * side, h } };
  player.v = player.steer = player.lean = 0;
  driver.visible = false;
  syncMobilityControls();
}

function updateOnFoot(dt) {
  const foot = player.foot, bike = player.parked;
  const action = foot.action;
  if (action) {
    action.t = Math.min(1, action.t + dt / 0.55);
    const k = action.t * action.t * (3 - 2 * action.t);
    const beside = action.mount ? 1 - k : k;
    player.x = bike.x + (action.x - bike.x) * beside;
    player.z = bike.z + (action.z - bike.z) * beside;
    player.h = bike.h + wrapAngle(action.h - bike.h) * beside;
    if (action.t === 1) {
      if (action.mount) clearWalking();
      else foot.action = null;
    }
    return;
  }
  const forward = Number(Boolean(keys.KeyW || keys.ArrowUp || touch.gas)) - Number(Boolean(keys.KeyS || keys.ArrowDown || touch.brake));
  const left = Number(Boolean(keys.KeyA || keys.ArrowLeft || touch.left));
  const right = Number(Boolean(keys.KeyD || keys.ArrowRight || touch.right));
  const lateral = THREE.MathUtils.clamp(right - left - (touch.axis || 0), -1, 1);
  const input = Math.min(1, Math.hypot(forward, lateral));
  const run = input && (keys.ShiftLeft || keys.ShiftRight || touch.horn) ? 1 : 0;
  const targetSpeed = (run ? 4.4 : 1.85) * input;
  foot.speed += (targetSpeed - foot.speed) * (1 - Math.exp(-dt * 11));
  foot.run += (run - foot.run) * (1 - Math.exp(-dt * 9));
  if (input < 0.03) return;
  const heading = foot.h + cameraOrbit.yaw + Math.atan2(lateral, forward);
  player.h += wrapAngle(heading - player.h) * (1 - Math.exp(-dt * 18));
  const x = THREE.MathUtils.clamp(player.x + Math.sin(heading) * foot.speed * dt, BX0 - 60, BX1 + 60);
  const z = THREE.MathUtils.clamp(player.z + Math.cos(heading) * foot.speed * dt, BZ0 - 60, BZ1 + 60);
  const res = pushOut(x, z, 0.3);
  const dx = res.x - bike.x, dz = res.z - bike.z;
  const localX = dx * Math.cos(bike.h) - dz * Math.sin(bike.h);
  const localZ = dx * Math.sin(bike.h) + dz * Math.cos(bike.h);
  const overlapsScooter = Math.abs(localX) < 0.57 && Math.abs(localZ) < 0.97;
  if (overlapsScooter || (inWater(res.x, res.z) && !onRoad(res.x, res.z, 0.1))) return;
  foot.phase += Math.hypot(res.x - player.x, res.z - player.z) * (5.2 - foot.run * 0.9);
  player.x = res.x;
  player.z = res.z;
}

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
      if (pxl < pzl) nlx = (lx < 0 ? -1 : 1) * pxl; else nlz = (lz < 0 ? -1 : 1) * pzl;
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
  if (player.parked) { if (!locked) updateOnFoot(dt); return; }
  const MAX = 19 * speedFactor(), REV = -3.0;
  if (profile.st.stamina < 8 && SK().deo < 5 && Math.random() < dt * 0.5) { player.steer += (Math.random() - 0.5) * 1.6; toast(L('😪 Ngủ gật! Nghỉ ngơi ngay!', '😪 Dozing off! Take a rest!'), 1); }
  let a = 0;
  if (gas) a += player.v < 0 ? 14 : 7.5 * (1 - Math.max(0, player.v) / MAX * 0.75);
  if (brake) a -= player.v > 0.2 ? 14 : (locked ? 0 : 4);
  if (hand) a = -Math.sign(player.v) * 18;
  a -= player.v * 0.12 + Math.sign(player.v) * 0.6;
  if (!gas && !brake && Math.abs(player.v) < 0.4) { player.v = 0; a = 0; }
  if (locked && Math.abs(player.v) < 0.5) { player.v = 0; a = 0; }
  const oldV = player.v;
  player.v = THREE.MathUtils.clamp(player.v + a * dt, REV, Math.max(MAX, Math.min(player.v, 25)));
  if (hand && player.v * oldV < 0) player.v = 0;
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
  const pose = player.parked || player;
  bike.root.position.set(pose.x, pose.y, pose.z);
  bike.root.rotation.y = pose.h;
  bike.lean.rotation.z = player.parked ? -pose.side * 0.12 : player.lean;
  const spin = player.v * dt / bike.R;
  if (bike.frontWheel) {
    bike.frontWheel.rotation.order = 'YXZ';
    bike.frontWheel.rotation.x = (bike.frontWheel.rotation.x + spin) % (2 * Math.PI);
    bike.frontWheel.rotation.y = player.parked ? -pose.side * 0.23 : player.steer * 0.3;
  }
  if (bike.rearWheel) bike.rearWheel.rotation.x = (bike.rearWheel.rotation.x + spin) % (2 * Math.PI);
  updateWalker(dt);
}

const cameraOrbit = { yaw: 0, pitch: 0, zoom: 1 };
const camPos = new THREE.Vector3(), camLook = new THREE.Vector3(), cameraAnchor = new THREE.Vector3();
const cameraWanted = new THREE.Vector3(), cameraAim = new THREE.Vector3();
const cameraSafe = new THREE.Vector3(), cameraBuildings = [];
const CAMERA_MAX_DISTANCE = 24;
let camInit = false;

function avoidCameraWalls(from, to, out) {
  const dx = to.x - from.x, dy = to.y - from.y, dz = to.z - from.z;
  const length = Math.hypot(dx, dy, dz);
  if (length > CAMERA_MAX_DISTANCE) return out.copy(from);
  const steps = Math.ceil(length / 0.24);
  const candidates = bColliders.query(from.x + dx / 2, from.z + dz / 2, Math.max(Math.abs(dx), Math.abs(dz)) / 2 + 0.24, cameraBuildings);
  for (let i = 1; i <= steps && candidates.length; i++) {
    const t = i / steps;
    const x = from.x + dx * t, y = from.y + dy * t, z = from.z + dz * t;
    for (const b of candidates) {
      const bb = b.bb;
      if (y > b.h + 0.2 || x < bb[0] - 0.2 || x > bb[2] + 0.2 || z < bb[1] - 0.2 || z > bb[3] + 0.2) continue;
      const p = b.p;
      let blocked = pip(x, z, p);
      for (let k = 0, j = p.length - 2; !blocked && k < p.length; j = k, k += 2) {
        blocked = segProj(x, z, p[j], p[j + 1], p[k], p[k + 1]).d < 0.2;
      }
      if (!blocked) continue;
      const safe = (i - 1) / steps;
      return out.set(from.x + dx * safe, from.y + dy * safe, from.z + dz * safe);
    }
  }
  return out.copy(to);
}

function updateCamera(dt) {
  const foot = player.foot;
  const firstPerson = !foot && game.camMode === 2;
  const heading = player.h;
  const speed = Math.abs(player.v);
  const forwardX = Math.sin(heading), forwardZ = Math.cos(heading);
  const towing = game.frozen && towTruck.g.visible;
  cameraAnchor.set(player.x, player.y + 1.3, player.z);
  if (towing) {
    cameraWanted.set(towTruck.x + forwardZ * 9, 5, towTruck.z - forwardX * 9);
    cameraAim.set(towTruck.x, 1.5, towTruck.z);
    cameraAnchor.copy(cameraAim);
  } else if (firstPerson) {
    cameraWanted.set(player.x + forwardX * 0.12, player.y + 1.9, player.z + forwardZ * 0.12);
    cameraAim.set(player.x + forwardX * 8, player.y + 1.2, player.z + forwardZ * 8);
  } else {
    const far = game.camMode === 1;
    const side = !foot && game.camMode === 3;
    const radius = (foot ? (far ? 7 : 3.8) : side ? 4.24 : far ? 12 : 5.2 + speed * 0.06) * cameraOrbit.zoom;
    const angle = (foot ? foot.h : heading) + cameraOrbit.yaw + (side ? -1.71 : 0);
    const height = Math.max(1.55, (foot ? (far ? 3.2 : 2.1) : far ? 7 : side ? 1.75 : 2.3) + Math.sin(cameraOrbit.pitch) * radius);
    const reach = radius * Math.cos(cameraOrbit.pitch);
    cameraWanted.set(player.x - Math.sin(angle) * reach, player.y + height, player.z - Math.cos(angle) * reach);
    const ahead = foot || side ? 0 : Math.max(0, Math.cos(cameraOrbit.yaw)) * 2.4;
    cameraAim.set(player.x + forwardX * ahead, player.y + 1.12, player.z + forwardZ * ahead);
  }
  const jumped = Math.hypot(cameraAnchor.x - camPos.x, cameraAnchor.y - camPos.y, cameraAnchor.z - camPos.z) > CAMERA_MAX_DISTANCE;
  if (!camInit || firstPerson || jumped) { camPos.copy(cameraWanted); camLook.copy(cameraAim); camInit = true; }
  else { camPos.lerp(cameraWanted, 1 - Math.exp(-dt * 6)); camLook.lerp(cameraAim, 1 - Math.exp(-dt * 8)); }
  const cameraGoal = jumped ? cameraWanted : camPos;
  camera.position.copy(firstPerson ? cameraGoal : avoidCameraWalls(cameraAnchor, cameraGoal, cameraSafe));
  camera.lookAt(camLook);
  if (fall.on && fall.t < 0.5) { camera.position.x += (Math.random() - 0.5) * 0.35; camera.position.y += (Math.random() - 0.5) * 0.35; }
  if (firstPerson) camera.rotateZ(-player.lean * 0.6);
}
