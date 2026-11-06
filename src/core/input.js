'use strict';
/* ================= Input ================= */
const keys = {};
const touch = { gas: false, brake: false, left: false, right: false };
addEventListener('keydown', (e) => {
  if (e.target && e.target.tagName === 'INPUT') return;
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
  if (e.repeat) { keys[e.code] = true; return; }
  keys[e.code] = true;
  if (game.mode === 'menu') return;
  if (e.code === 'KeyH') horn();
  if (e.code === 'KeyC') cycleCam();
  if (e.code === 'KeyM') toggleMute();
  if (e.code === 'KeyP') togglePhone();
  if (e.code === 'KeyG') goToTarget();
  if (e.code === 'Enter' || e.code === 'KeyY') { if (game.state === 'offer') acceptOffer(); }
  if (e.code === 'KeyN') { if (game.state === 'offer') declineOffer(); }
  if (e.code === 'Digit1') policeStop();
  if (e.code === 'Digit2') policeFlee();
  if (e.code === 'KeyV') game.mode === 'showcase' ? enterDrive() : enterShowcase();
  if (e.code === 'KeyR' && game.mode === 'drive' && !game.frozen && !police.active) { resetHome(); toast('🏠 Về nhà'); }
});
addEventListener('keyup', (e) => { keys[e.code] = false; });
addEventListener('blur', () => { for (const k in keys) keys[k] = false; });
function bindTouch(id, prop, onDown) {
  const el = $(id);
  const on = (e) => { e.preventDefault(); touch[prop] = true; el.classList.add('on'); onDown && onDown(); };
  const off = (e) => { e.preventDefault(); touch[prop] = false; el.classList.remove('on'); };
  el.addEventListener('pointerdown', on); el.addEventListener('pointerup', off);
  el.addEventListener('pointerleave', off); el.addEventListener('pointercancel', off);
}
bindTouch('tGas', 'gas'); bindTouch('tBrake', 'brake'); bindTouch('tLeft', 'left'); bindTouch('tRight', 'right');
bindTouch('tHorn', 'horn', horn);
const isTouch = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
if (isTouch) { $('touch').classList.remove('hidden'); document.body.classList.add('touch'); }
function cycleCam() {
  game.camMode = (game.camMode + 1) % 4;
  toast(['🎥 Camera sau xe', '🎥 Camera xa', '🎥 Góc nhìn tài xế', '🎥 Camera bên hông'][game.camMode], 1.2);
}
function toggleMute() { game.muted = !game.muted; $('bMute').textContent = game.muted ? '🔇' : '🔊'; }
$('bCam').onclick = cycleCam;
phoneCanvas.id = 'phoneUI';
$('hud').appendChild(phoneCanvas);
if (isTouch) phoneCanvas.classList.add('hidden');
const togglePhone = () => phoneCanvas.classList.toggle('hidden');
$('bPhone').onclick = togglePhone;

let warping = false;
function goToTarget() {
  if (game.mode !== 'drive' || warping || game.frozen || police.active) return;
  const t = currentTarget(); if (!t) return;
  warping = true; $('fade').classList.add('on');
  setTimeout(() => {
    player.h = t.h; player.v = 0; player.steer = 0; player.lean = 0;
    player.x = t.x - Math.sin(t.h) * 1.0; player.z = t.z - Math.cos(t.h) * 1.0;
    camInit = false; game.noViolT = 2; playerTrail.length = 0;
    $('fade').classList.remove('on'); warping = false; refreshRoute();
  }, 260);
}
$('bGo').onclick = (e) => { e.currentTarget.blur(); goToTarget(); };
phoneCanvas.style.cursor = 'pointer';
phoneCanvas.addEventListener('pointerdown', (e) => {
  const r = phoneCanvas.getBoundingClientRect();
  const y = (e.clientY - r.top) / r.height * phoneCanvas.height;
  if (y > phoneCanvas.height - 90) { e.preventDefault(); if (game.state === 'offer') acceptOffer(); else goToTarget(); }
});
$('bMute').onclick = () => { initAudio(); toggleMute(); };

/* ---- menu ---- */
function fillMenu() {
  $('pName').value = profile.name;
  $('pStats').innerHTML = `Ngày ${profile.day} · Cấp ${profile.level} · Tổng thu nhập ${fmtVND(profile.totalMoney)} · ${profile.totalTrips} chuyến`;
  document.querySelectorAll('.goal').forEach(b => b.classList.toggle('sel', +b.dataset.v === profile.goal));
  $('pEng').checked = !!profile.english;
  $('bStart').textContent = profile.totalTrips > 0 || profile.day > 1 ? `▶ Tiếp tục — Ngày ${profile.day}` : '▶ Bắt đầu ngày làm việc';
}
document.querySelectorAll('.goal').forEach(b => b.onclick = () => { profile.goal = +b.dataset.v; fillMenu(); saveProfile(); });
$('pEng').addEventListener('change', () => { profile.english = $('pEng').checked; saveProfile(); });
$('pName').addEventListener('change', () => { profile.name = $('pName').value.trim().slice(0, 24) || 'Tài xế'; saveProfile(); });
$('bReset').onclick = () => { $('bReset').textContent = '⚠️ Bấm lần nữa để xoá hồ sơ và chơi lại từ đầu'; $('bReset').onclick = () => { try { localStorage.removeItem(PROFILE_KEY); } catch (e) { } location.reload(); }; };
fillMenu();
function updateProfileHUD() {
  $('money').textContent = fmtVND(profile.money);
  $('trips').textContent = profile.trips;
  $('rating').textContent = profile.ratings.length ? (profile.ratings.reduce((a, b) => a + b, 0) / profile.ratings.length).toFixed(1) : '5.0';
  $('lvl').textContent = profile.level;
  $('pnm').textContent = profile.name;
  $('xpbar').style.width = Math.min(100, profile.xp / xpNeed(profile.level) * 100) + '%';
  $('goalbar').style.width = Math.max(0, Math.min(100, profile.money / profile.goal * 100)) + '%';
  $('goaltxt').textContent = `${fmtVND(Math.max(0, profile.money))} / ${fmtVND(profile.goal)}`;
}
function enterDrive() {
  initAudio(); actx && actx.resume && actx.resume();
  profile.name = $('pName').value.trim().slice(0, 24) || profile.name; saveProfile();
  game.mode = 'drive';
  controls.enabled = false; controls.autoRotate = false;
  $('menu').classList.add('hidden'); $('showcaseBar').classList.add('hidden'); $('hud').classList.remove('hidden');
  updateProfileHUD();
  if (profile.banned) { banForDay(); return; }
  if (profile.licBan > 0) { showOverlay(L('🪪 Bị tước giấy phép lái xe', '🪪 Licence suspended'), L(`Bằng lái của bạn hết điểm. Còn <b>${profile.licBan}</b> ngày nữa mới được chạy lại.<br>Hôm nay bạn ở nhà nghỉ ngơi.`, `Your licence has 0 points. <b>${profile.licBan}</b> more day(s) before you can ride.`), L('😴 Nghỉ hết ngày', '😴 Rest for the day'), () => { profile.licBan--; if (!profile.licBan) profile.license = 12; game.mode = 'home'; sleepNewDay(); }); return; }
  if (!game.running) { game.running = true; game.state = 'wait'; game.waitT = 1.5; toast(`🛵 Chào ${profile.name}! Bật app, chờ cuốc…`, 2); }
}
function enterShowcase() {
  game.mode = 'showcase'; player.v = 0;
  $('menu').classList.add('hidden'); $('hud').classList.add('hidden'); $('showcaseBar').classList.remove('hidden');
  controls.enabled = true; controls.autoRotate = true; controls.autoRotateSpeed = 1.6;
  controls.target.set(player.x, 0.65, player.z);
  const f = new THREE.Vector3(Math.sin(player.h), 0, Math.cos(player.h)), r = new THREE.Vector3(-f.z, 0, f.x);
  camera.position.set(player.x, 1.4, player.z).addScaledVector(r, -3.2).addScaledVector(f, 1.2);
  controls.update();
}
$('bStart').onclick = enterDrive; $('bBack').onclick = enterDrive; $('bView').onclick = enterShowcase; $('bView2').onclick = enterShowcase;
