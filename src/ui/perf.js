'use strict';
/* ================= Adaptive graphics ================= */
const PERF = { elapsed: 0, frames: 0, traffic: 1, warm: 4, baseFar: camera.far };
if (isTouch && !profile.settings.mobileInit) { profile.settings.mobileInit = true; profile.settings.hiq = false; profile.settings.shadows = false; applySettings(); saveProfile(); }
{ const _tl = trafficLevel; trafficLevel = () => { const r = _tl(); return { frac: r.frac * PERF.traffic, speed: r.speed }; }; }

function resetAdaptiveQuality() {
  PERF.elapsed = PERF.frames = 0;
  PERF.traffic = 1;
  PERF.warm = 4;
  adaptiveGraphics.pixelRatioLimit = Infinity;
  adaptiveGraphics.shadowsDisabled = false;
  if (typeof HD !== 'undefined') HD.post = defaultPostProcessing;
  camera.far = PERF.baseFar;
  camera.updateProjectionMatrix();
}

function perfStepDown() {
  let message;
  if (HD.post) {
    HD.post = false;
    message = L('Tắt hiệu ứng bloom để chơi mượt hơn', 'Bloom reduced for smoother play');
  } else if (renderer.getPixelRatio() > 1) {
    adaptiveGraphics.pixelRatioLimit = 1;
    message = L('Giảm độ nét để chơi mượt hơn', 'Resolution reduced for smoother play');
  } else if (renderer.shadowMap.enabled) {
    adaptiveGraphics.shadowsDisabled = true;
    message = L('Tắt đổ bóng để chơi mượt hơn', 'Shadows reduced for smoother play');
  } else if (PERF.traffic === 1) {
    PERF.traffic = 0.6;
    camera.far = Math.min(PERF.baseFar, 700);
    camera.updateProjectionMatrix();
    adaptiveGraphics.pixelRatioLimit = 0.85;
    message = L('Giảm mật độ xe và độ nét', 'Traffic density and resolution reduced');
  } else return;
  applyGraphicsSettings();
  toast('⚙️ ' + message, 2);
}

FRAME.push((_dt, frameTime) => {
  if (game.mode !== 'drive' || game.paused || document.hidden || profile.settings.autoQ === false) {
    PERF.elapsed = PERF.frames = 0;
    return;
  }
  if (!Number.isFinite(frameTime) || frameTime <= 0) return;
  if (PERF.warm > 0) { PERF.warm -= Math.min(frameTime, 1); return; }
  PERF.elapsed += Math.min(frameTime, 1);
  PERF.frames++;
  if (PERF.elapsed < 3) return;
  const average = PERF.elapsed / PERF.frames;
  PERF.elapsed = PERF.frames = 0;
  if (average > 1 / (isTouch ? 27 : 45)) {
    perfStepDown();
    PERF.warm = 3;
  }
});
// collapsible HUD + portrait hint
{
  const st = document.createElement('style');
  st.textContent = `body.mini #stats,body.mini #food,body.mini #phoneUI,body.mini #lb,body.mini .xp,body.mini .goalw{display:none!important}
  #bMini{position:fixed;top:8px;left:50%;transform:translateX(-50%);z-index:8;border:0;border-radius:99px;background:rgba(0,0,0,.45);color:#fff;font:700 12px system-ui;padding:4px 10px;cursor:pointer}
  #rotHint{position:fixed;inset:0;z-index:60;background:rgba(5,10,20,.88);color:#fff;display:none;flex-direction:column;align-items:center;justify-content:center;text-align:center;font:700 18px system-ui;padding:30px;gap:14px}
  #rotHint b{font-size:64px;animation:rot 1.6s infinite ease-in-out}@keyframes rot{50%{transform:rotate(-90deg)}}
  body.touch #hud{font-size:13px}`;
  document.head.appendChild(st);
  const b = document.createElement('button'); b.id = 'bMini'; b.textContent = '▴ HUD'; document.body.appendChild(b);
  b.onclick = () => { document.body.classList.toggle('mini'); b.textContent = document.body.classList.contains('mini') ? '▾ HUD' : '▴ HUD'; profile.settings.mini = document.body.classList.contains('mini'); saveProfile(); };
  if (profile.settings.mini || (isTouch && profile.settings.mini === undefined && innerWidth < 800)) { document.body.classList.add('mini'); b.textContent = '▾ HUD'; }
  const r = document.createElement('div'); r.id = 'rotHint'; r.innerHTML = `<b>📱</b>${L('Xoay ngang điện thoại để chơi dễ hơn', 'Rotate your phone to landscape')}<small style="opacity:.7">${L('(chạm để bỏ qua)', '(tap to dismiss)')}</small>`;
  document.body.appendChild(r); let dismissed = false;
  r.onclick = () => { dismissed = true; r.style.display = 'none'; };
  const chk = () => { r.style.display = isTouch && !dismissed && innerHeight > innerWidth * 1.1 ? 'flex' : 'none'; };
  addEventListener('resize', chk); chk();
}
