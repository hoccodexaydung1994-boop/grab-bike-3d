'use strict';
/* ================= Tối ưu điện thoại / máy yếu ================= */
const PERF = { lvl: 3, acc: 0, n: 0, t: 0, traffic: 1, warm: 4 };
if (isTouch && !profile.settings.mobileInit) { profile.settings.mobileInit = true; profile.settings.hiq = false; profile.settings.shadows = false; applySettings(); saveProfile(); }
if (isTouch) PERF.lvl = 2;
{ const _tl = trafficLevel; trafficLevel = () => { const r = _tl(); return { frac: r.frac * PERF.traffic, speed: r.speed }; }; }
function perfStepDown() {
  const S = profile.settings;
  if (PERF.lvl === 3) { S.hiq = false; applySettings(); toast(L('⚙️ Máy hơi giật → giảm độ nét', '⚙️ Lowering resolution for smoother play'), 2); }
  else if (PERF.lvl === 2) { S.shadows = false; applySettings(); toast(L('⚙️ Tắt đổ bóng để mượt hơn', '⚙️ Shadows off for performance'), 2); }
  else if (PERF.lvl === 1) { PERF.traffic = 0.55; camera.far = 700; camera.updateProjectionMatrix(); renderer.setPixelRatio(Math.min(1, devicePixelRatio) * 0.8); toast(L('⚙️ Giảm xe cộ & tầm nhìn xa', '⚙️ Less traffic & draw distance'), 2); }
  else return;
  PERF.lvl--; saveProfile();
}
FRAME.push((dt) => {
  if (game.paused || document.hidden) return;
  if (PERF.warm > 0) { PERF.warm -= dt; return; }
  PERF.acc += dt; PERF.n++; PERF.t += dt;
  if (PERF.t >= 3) { const avg = PERF.acc / PERF.n; PERF.acc = PERF.n = PERF.t = 0; if (avg > 0.04 && profile.settings.autoQ !== false) { perfStepDown(); PERF.warm = 3; } }
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
