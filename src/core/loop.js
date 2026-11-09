'use strict';
/* ================= Loop ================= */
const clock = new THREE.Clock();
let tAcc = 0, phoneT = 0;
function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);
  tAcc += dt;
  updateSignals(dt);
  if (!game.paused) updateCars(dt);
  updateRain(dt);
  if (game.mode === 'drive') {
    if (!game.paused) { updatePlayer(dt); updateGame(dt); updatePolice(dt); updateTow(dt); }
    updateCamera(dt); updateHUD(dt);
  } else {
    player.v *= 0.9;
    if (game.mode === 'menu') {
      const a = tAcc * 0.25;
      camera.position.set(player.x + Math.cos(a) * 4.2, 1.6 + Math.sin(tAcc * 0.4) * 0.2, player.z + Math.sin(a) * 4.2);
      camera.lookAt(player.x, 0.7, player.z);
    } else controls.update();
    camInit = false;
  }
  applyBike(dt);
  if (game.mode !== 'drive') { phoneT -= dt; if (phoneT <= 0) { phoneT = 0.5; drawPhone(); } }
  for (const mk of [pickupMarker, dropMarker]) if (mk.visible) {
    mk.userData.sp.position.y = 4.2 + Math.sin(tAcc * 3) * 0.3;
    const s = 1 + Math.sin(tAcc * 4) * 0.06; mk.userData.ring.scale.set(s, s, s);
  }
  if (standPax.visible) {
    standPax.userData.arm.rotation.z = Math.sin(tAcc * 7) * 0.35;
    const dx = player.x - standPax.position.x, dz = player.z - standPax.position.z;
    if (Math.hypot(dx, dz) < 25) standPax.rotation.y = Math.atan2(dx, dz);
  }
  netTick(dt);
  for (const f of FRAME) f(dt);
  for (const c of CHECKPOINTS) c.lb.visible = Math.hypot(c.x - player.x, c.z - player.z) < (SK().tho >= 2 ? 450 : 260);
  for (const l of labels) l.visible = Math.abs(l.position.x - player.x) < 450 && Math.abs(l.position.z - player.z) < 450;
  if (eng) {
    const on = game.mode === 'drive' && !game.muted && !game.frozen && !curBike().elec;
    const gas = keys.KeyW || keys.ArrowUp || touch.gas;
    const sp = Math.abs(player.v), gear = Math.min(4, Math.floor(sp / 6)), rpm = (sp - gear * 6) / 6;
    const f = 38 + gear * 4 + rpm * 38 + (gas ? 8 : 0);
    eng.osc.frequency.setTargetAtTime(f, actx.currentTime, 0.05);
    eng.osc2.frequency.setTargetAtTime(f * 0.5, actx.currentTime, 0.05);
    eng.filt.frequency.setTargetAtTime(350 + sp * 25 + (gas ? 300 : 0), actx.currentTime, 0.08);
    eng.gain.gain.setTargetAtTime(on && !SND.buf.engine ? 0.03 + (gas ? 0.025 : 0) : 0, actx.currentTime, 0.1);
    sndEngine(on, sp, gas);
  }
  if (toastTimer > 0) { toastTimer -= dt; if (toastTimer <= 0) $('toast').classList.remove('show'); }
  sun.position.set(player.x + 30, 55, player.z + 18);
  sun.target.position.set(player.x, 0, player.z);
  renderer.render(scene, camera);
}
