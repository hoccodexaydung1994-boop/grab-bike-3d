'use strict';
/* ================= Sửa theo bản rà soát gameplay (S1, S4, S5, S6, S8, S10, S11, S12) ================= */

/* ---- S1: độ dài ngày chỉnh trong Cài đặt ---- */
const TIME_SCALES = { fast: [0.5, 'Nhanh (~30 phút/ngày)', 'Fast (~30 min/day)'], normal: [0.25, 'Thường (~1 giờ/ngày)', 'Normal (~1 h/day)'], slow: [0.125, 'Chậm (~2 giờ/ngày)', 'Slow (~2 h/day)'] };
function applyTimeScale() { MIN_PER_SEC = (TIME_SCALES[profile.settings.tscale] || TIME_SCALES.normal)[0]; }
applyTimeScale();
{
  const _rp = renderPanel;
  renderPanel = function () {
    _rp(); if (panelTab !== 'settings') return;
    const S = profile.settings, E = profile.english ? 2 : 1;
    $('mpBody').insertAdjacentHTML('beforeend', `<h4>⏱️ ${L('Độ dài một ngày làm việc', 'Length of a work day')}</h4><p>${Object.entries(TIME_SCALES).map(([k, v]) => `<button class="chip${(S.tscale || 'normal') === k ? ' sel' : ''}" data-ts="${k}">${v[E]}</button>`).join(' ')}</p>
      <h4>🎮 ${L('Độ khó & hiển thị', 'Difficulty & display')}</h4><p><label class="tg"><input type="checkbox" data-pol="easy" ${S.easy ? 'checked' : ''}> ${L('Chế độ dễ: nút G dịch chuyển thẳng tới điểm đón/trả', 'Easy mode: G teleports to the target')}</label>
      <label class="tg"><input type="checkbox" data-pol="allBars" ${S.allBars ? 'checked' : ''}> ${L('Luôn hiện đủ 8 thanh chỉ số', 'Always show all 8 stat bars')}</label>
      <label class="tg"><input type="checkbox" data-pol="noAuto" ${S.noAuto ? 'checked' : ''}> ${L('Không tự chọn câu trả lời sau 6 giây', 'Never auto-answer dialogs')}</label></p>`);
  };
  $('mpBody').addEventListener('click', (e) => { const b = e.target.closest('[data-ts]'); if (!b) return; profile.settings.tscale = b.dataset.ts; applyTimeScale(); saveProfile(); renderPanel(); toast(L('⏱️ Đã đổi độ dài ngày', '⏱️ Day length changed'), 1.4); });
  $('mpBody').addEventListener('change', (e) => { const b = e.target; if (!b.dataset || !b.dataset.pol) return; profile.settings[b.dataset.pol] = b.checked; saveProfile(); });
}

/* ---- S4: G = chỉ đường; dịch chuyển chỉ khi chế độ dễ hoặc bị kẹt (gọi cứu hộ, có phí) ---- */
let stuckT = 0, navFlashT = 0;
function navHint() {
  if (!route || route.pts.length < 4) return toast(L('📍 Đang tính đường…', '📍 Calculating route…'), 1.2);
  const p = route.pts; let total = 0, turn = null, acc = 0;
  for (let i = 2; i < p.length; i += 2) total += Math.hypot(p[i] - p[i - 2], p[i + 1] - p[i - 1]);
  for (let i = 2; i < p.length - 2 && !turn; i += 2) {
    const ax = p[i] - p[i - 2], az = p[i + 1] - p[i - 1], bx = p[i + 2] - p[i], bz = p[i + 3] - p[i + 1];
    acc += Math.hypot(ax, az);
    const la = Math.hypot(ax, az), lb = Math.hypot(bx, bz); if (la < 0.5 || lb < 0.5) continue;
    const cr = (ax * bz - az * bx) / (la * lb), dt = (ax * bx + az * bz) / (la * lb);
    if (acc > 12 && dt < 0.82) turn = { d: acc, dir: cr > 0 ? L('rẽ phải', 'turn right') : L('rẽ trái', 'turn left'), st: streetNameAt(p[i + 2], p[i + 3]) };
  }
  const km = (m) => m >= 1000 ? (m / 1000).toFixed(1).replace('.', ',') + ' km' : Math.round(m / 10) * 10 + ' m';
  toast(`📍 ${L('Còn', 'Remaining')} <b>${km(total)}</b>${turn ? ` · ${turn.dir} ${L('sau', 'in')} <b>${km(turn.d)}</b>${turn.st ? ` ${L('vào', 'onto')} ${turn.st}` : ''}` : ` · ${L('đi thẳng tới nơi', 'straight ahead')}`}`, 3.2);
  navFlashT = 2.5;
}
{
  const _gt = goToTarget;
  goToTarget = function () {
    if (game.mode !== 'drive' || game.paused) return;
    if (profile.settings.easy) return _gt();
    if (!currentTarget()) return;
    if (stuckT > 6) return showDialog({ who: L('🚚 Cứu hộ', '🚚 Roadside help'), text: L('Xe bị kẹt? Gọi xe cứu hộ chở tới điểm đến (30.000đ, mất 15 phút).', 'Stuck? A tow can take you to the target (30,000đ, 15 min).'), opts: [
      { t: L('🚚 Gọi cứu hộ', '🚚 Call the tow'), fx: () => { if (spend(30000, 'repair')) { passTime(15); stuckT = 0; _gt(); } } }, { t: L('↩️ Tự đi tiếp', '↩️ I\'ll drive') }] });
    navHint();
  };
}
FRAME.push((dt) => {
  const gas = keys.KeyW || keys.ArrowUp || touch.gas;
  stuckT = game.mode === 'drive' && !game.paused && (game.state === 'pickup' || game.state === 'ride') && gas && Math.abs(player.v) < 0.8 ? stuckT + dt : Math.max(0, stuckT - dt * 2);
  if (stuckT > 6 && stuckT - dt <= 6) toast(L('🚚 Bị kẹt? Bấm G để gọi cứu hộ', '🚚 Stuck? Press G for a tow'), 2.5);
  if (routeMesh) { navFlashT = Math.max(0, navFlashT - dt); routeMesh.material.opacity = navFlashT > 0 ? 0.6 + 0.35 * Math.abs(Math.sin(navFlashT * 8)) : 0.6; }
});

/* ---- S5: hộp thoại hội thoại tự chọn câu mặc định sau 6 giây ---- */
let dlgSeen = 0;
FRAME.push((dt) => {
  if (game.dlgAuto === null || game.dlgAuto === undefined || !game.dlgKeys || profile.settings.noAuto) return;
  const b = game.dlgKeys[game.dlgAuto]; if (!b) return;
  if (dlgSeen !== game.dlgId) { dlgSeen = game.dlgId; b.dataset.base = b.innerHTML; }
  game.dlgAutoT -= dt;
  b.innerHTML = b.dataset.base + ` <small style="opacity:.6">⏳${Math.max(0, Math.ceil(game.dlgAutoT))}</small>`;
  if (game.dlgAutoT <= 0) { b.innerHTML = b.dataset.base; game.dlgAuto = null; b.click(); }
});

/* ---- S6: dạy từng bước bằng việc làm + giới thiệu tính năng mới mỗi ngày ---- */
if (!profile.tips) profile.tips = {};
const hintEl = document.createElement('div');
hintEl.style.cssText = 'position:fixed;left:50%;bottom:150px;transform:translateX(-50%);z-index:8;max-width:min(460px,92vw);background:rgba(0,40,20,.88);color:#fff;border:2px solid #00b14f;border-radius:14px;padding:8px 12px;font:600 14px system-ui;line-height:1.35;display:none;pointer-events:none;box-shadow:0 6px 20px rgba(0,0,0,.35)';
document.body.appendChild(hintEl);
let hintT = 0;
function hint(id, html, sec = 6) { if (profile.tips[id]) return false; profile.tips[id] = 1; saveProfile(); hintEl.innerHTML = '🧔 <b>anh Tư:</b> ' + html; hintEl.style.display = 'block'; hintT = sec; return true; }
const TIPS = [
  ['drive', () => game.mode === 'drive' && profile.totalTrips === 0, () => isTouch ? L('Giữ nút <b>GA</b> để chạy, kéo cần lái trái/phải để rẽ.', 'Hold GAS, drag the stick to steer.') : L('Giữ <b>W</b> để chạy, <b>A/D</b> để rẽ, <b>S</b> để phanh.', 'Hold W to ride, A/D to steer, S to brake.')],
  ['offer', () => game.state === 'offer', () => L('Có cuốc mới! Xem giá và quãng đường rồi bấm <b>Nhận</b> (Enter). Bỏ qua nhiều quá sẽ ít cuốc hơn.', 'New job! Check fare & distance, then Accept (Enter).')],
  ['route', () => game.state === 'pickup', () => L('Chạy theo <b>vạch xanh</b> trên đường tới chấm xanh. Quên đường thì bấm <b>G</b> để nghe chỉ đường.', 'Follow the green line. Press G for directions.')],
  ['slow', () => (game.state === 'pickup' || game.state === 'ride') && currentTarget() && Math.hypot(currentTarget().x - player.x, currentTarget().z - player.z) < 40, () => L('Gần tới rồi — chạy chậm dưới <b>25 km/h</b> và dừng ngay vòng tròn.', 'Almost there — slow below 25 km/h and stop in the circle.')],
  ['red', () => { for (const s of sigGrid.query(player.x, player.z, 35, [])) { const [st] = sigState(s, Math.sin(player.h), Math.cos(player.h)); if (st === 'R') return true; } return false; }, () => L('Đèn đỏ phía trước — dừng trước ngã tư. Vượt đèn sẽ bị phạt (ngày 1–2 chỉ nhắc nhở).', 'Red light ahead — stop before the junction.')],
  ['fuel', () => profile.st.fuel < 35, () => L('Xăng sắp cạn — chạy tới <b>⛽ cây xăng</b>, dừng lại bấm <b>E</b> để đổ.', 'Fuel is low — stop at a ⛽ station and press E.')],
  ['hungry', () => featOn('needs') && (profile.st.hunger > 60 || profile.st.thirst > 60), () => L('Đói/khát rồi — ghé <b>hàng rong</b> hoặc quán, dừng lại bấm <b>E</b> để ăn uống.', 'Hungry or thirsty — stop at a street vendor and press E.')],
  ['food', () => game.state === 'offer' && game.offer && game.offer.type === 'food', () => L('Đơn GrabFood: tới quán lấy món, giữ món nóng và <b>đừng té xe</b> kẻo hỏng hàng.', 'GrabFood: pick up, keep it hot, don\'t crash.')],
];
const DAY_INTRO = {
  2: [L('Hôm nay bắt đầu tính <b>đói, khát, stress</b> và mở <b>GrabFood</b> (từ cấp 2). Có người nhờ việc (dấu ❗) cũng nên giúp, tiền thưởng khá lắm.', 'Today hunger/thirst/stress start counting and GrabFood opens.')],
  3: [L('Từ hôm nay <b>CSGT phạt thật</b> và có thể rượt nếu bỏ chạy; lốp thủng, mưa, mệt mỏi cũng bắt đầu xảy ra. Chạy cẩn thận nha!', 'From today the police fine for real and random events begin.')],
};
let tipT = 0;
FRAME.push((dt) => {
  if (hintT > 0) { hintT -= dt; if (hintT <= 0) hintEl.style.display = 'none'; }
  if (game.mode !== 'drive' || game.paused) return;
  tipT -= dt; if (tipT > 0) return; tipT = 0.5;
  const intro = DAY_INTRO[profile.day];
  if (intro && !profile.tips['day' + profile.day] && !(profile.totals.days >= 3 && profile.day > 3)) { profile.tips['day' + profile.day] = 1; saveProfile(); return showDialog({ who: L(`🧔 anh Tư — Ngày ${profile.day}`, `🧔 Tư — Day ${profile.day}`), text: intro[0], opts: [{ t: L('👍 Dạ em biết rồi', '👍 Got it') }] }); }
  if (hintT > 0) return;
  for (const [id, cond, txt] of TIPS) if (!profile.tips[id] && cond()) { hint(id, txt()); break; }
});
{ const _sq = sqSpawnGiver; sqSpawnGiver = function () { if (featOn('side')) _sq(); }; }

/* ---- S8: báo trước lỗi tốc độ & chốt CSGT ---- */
let beepT = 0, cpWarnT = 0;
FRAME.push((dt) => {
  if (game.mode !== 'drive') return;
  const kmh = Math.abs(player.v) * 3.6, over = !player.deck && kmh > curLimit + 3;
  $('kmh').style.color = over ? '#ff4d4f' : ''; $('limit').classList.toggle('over', over);
  beepT -= dt; if (over && beepT <= 0 && !game.paused) { beepT = 1.3; tone(1320, 0, 0.08, 'square', 0.04); }
  cpWarnT -= dt;
  if (cpWarnT <= 0) for (const c of CHECKPOINTS) {
    const dx = c.x - player.x, dz = c.z - player.z, d = Math.hypot(dx, dz);
    if (d < 200 && d > 40 && (dx * Math.sin(player.h) + dz * Math.cos(player.h)) > 0) { cpWarnT = 45; toast(L(`🚔 Chốt CSGT phía trước ${Math.round(d / 10) * 10} m — giữ dưới ${curLimit} km/h, dừng đèn đỏ`, `🚔 Police checkpoint ${Math.round(d / 10) * 10} m ahead`), 2.6); break; }
  }
});
{ const st = document.createElement('style'); st.textContent = '#limit.over{animation:limitBlink .5s infinite alternate}@keyframes limitBlink{to{background:#ff4d4f;color:#fff}}'; document.head.appendChild(st); }

/* ---- S10: HUD gọn — 4 thanh chính, thanh phụ chỉ hiện khi đáng lo; 5 dòng chữ thành 1 bảng việc ---- */
const MAIN_BARS = ['hp', 'stamina', 'fuel', 'phone'];
{
  const _rs = renderStats;
  renderStats = function () {
    _rs();
    const S = profile.settings;
    for (const [k, , , , bad] of STAT_DEF) {
      const el = $('st_' + k); if (!el) continue;
      if (S.bars[k] === false) { el.style.display = 'none'; continue; }
      if (S.allBars || MAIN_BARS.includes(k)) { el.style.display = ''; continue; }
      const v = profile.st[k], warn = bad ? v > 60 : v < 35, gated = (k === 'hunger' || k === 'thirst' || k === 'stress') && !featOn('needs');
      el.style.display = warn && !gated ? '' : 'none';
    }
    if (profile.debt > 0) $('wallet').textContent += ` · 💳 -${fmtVND(profile.debt)}`;
  };
}
const taskEl = document.createElement('div'); taskEl.style.cssText = 'font-size:12px;font-weight:700;min-height:16px;transition:opacity .3s'; $('jam').before(taskEl);
const TASK_SRC = [$('food'), $('jam'), storyEl, hotEl, sqEl];
TASK_SRC.forEach(e => e.style.display = 'none');
let taskT = 0, taskI = 0;
FRAME.push((dt) => {
  taskT -= dt; if (taskT > 0) return; taskT = 3.5;
  const urgent = [$('food'), $('jam')].map(e => e.textContent.trim()).filter(Boolean);
  const other = [storyEl, hotEl, sqEl].map(e => [e.textContent.trim(), e.style.color]).filter(x => x[0]);
  const o = other.length ? other[taskI++ % other.length] : null;
  taskEl.innerHTML = urgent.map(t => `<div style="color:#fca5a5">${t}</div>`).join('') + (o ? `<div style="color:${o[1] || '#fde68a'}">${o[0]}${other.length > 1 ? ` <span style="opacity:.5">${'•'.repeat(other.length)}</span>` : ''}</div>` : '');
});

/* ---- S11: giao xong cho "đã" — tiền bay, sao nảy, rung nhẹ, chuỗi đúng giờ, tip lái êm ---- */
const SHAKE = { t: 0, a: 0 };
function shake(a, t = 0.3) { SHAKE.a = Math.max(SHAKE.a, a); SHAKE.t = Math.max(SHAKE.t, t); }
FRAME.push((dt) => { if (SHAKE.t <= 0 || game.mode !== 'drive') return; SHAKE.t -= dt; const k = SHAKE.a * Math.max(0, SHAKE.t) / 0.3; camera.position.x += (Math.random() - 0.5) * k; camera.position.y += (Math.random() - 0.5) * k * 0.6; });
{ const st = document.createElement('style'); st.textContent = `.payfx{position:fixed;left:50%;top:34%;transform:translate(-50%,0);z-index:20;pointer-events:none;text-align:center;font:900 44px system-ui;color:#00e676;text-shadow:0 3px 12px rgba(0,0,0,.6);animation:payUp 1.9s ease-out forwards}
  .payfx small{display:block;font-size:26px;color:#ffd54f;letter-spacing:2px}.payfx em{display:block;font:800 18px system-ui;font-style:normal;color:#fff}
  .payfx .st{display:inline-block;animation:starPop .4s cubic-bezier(.3,1.8,.5,1) both}
  @keyframes payUp{0%{opacity:0;transform:translate(-50%,30px) scale(.7)}15%{opacity:1;transform:translate(-50%,0) scale(1.1)}25%{transform:translate(-50%,0) scale(1)}80%{opacity:1}100%{opacity:0;transform:translate(-50%,-60px)}}
  @keyframes starPop{from{transform:scale(0) rotate(-40deg)}to{transform:scale(1)}}`; document.head.appendChild(st); }
function payFx(amount, stars, extra) {
  const d = document.createElement('div'); d.className = 'payfx';
  d.innerHTML = `<span>+0đ</span><small>${Array.from({ length: stars }, (_, i) => `<span class="st" style="animation-delay:${0.15 + i * 0.08}s">★</span>`).join('')}</small>${extra ? `<em>${extra}</em>` : ''}`;
  document.body.appendChild(d);
  const num = d.firstChild, t0 = performance.now();
  const step = (t) => { const k = Math.min(1, (t - t0) / 600); num.textContent = '+' + fmtVND(amount * (1 - Math.pow(1 - k, 3))); if (k < 1) requestAnimationFrame(step); };
  requestAnimationFrame(step); setTimeout(() => d.remove(), 2000);
  shake(0.05, 0.25);
}
function markCrash() { const o = game.order; if (o) { o.crashed = true; if (o.subs) o.subs.forEach(b => b.crashed = true); } }
{
  const _oc = onCrash; onCrash = function (sp) { _oc(sp); markCrash(); shake(Math.min(0.25, sp / 60), 0.3); };
  const _tf = triggerFall; triggerFall = function (r) { const was = fall.on; _tf(r); if (!was && fall.on) { markCrash(); shake(0.35, 0.45); } };
  const rewardJob = (onTime, clean, base) => {
    const T = profile.today; T.combo = onTime && clean ? (T.combo || 0) + 1 : 0;
    let bonus = 0; const notes = [];
    if (T.combo >= 2) { bonus += Math.round(base * Math.min(0.25, 0.05 * (T.combo - 1)) / 1000) * 1000; notes.push(`🔥 ${L('Chuỗi đúng giờ', 'On-time streak')} ×${T.combo}`); }
    if (clean) { bonus += 3000; notes.push(L('🛵 Lái êm, không va chạm', '🛵 Smooth ride')); }
    if (bonus > 0) earn(bonus, 'cash', true);
    return { bonus, note: notes.join(' · ') };
  };
  const _do = dropOff;
  dropOff = function () {
    const o = game.order; if (!o) return _do();
    const before = profile.today.revenue, onTime = game.tripT <= o.est, clean = !o.crashed && !o.viol;
    _do();
    const r = rewardJob(onTime, clean, o.fare);
    payFx(profile.today.revenue - before, profile.today.ratings.at(-1) || 5, r.note);
  };
  const _cs = completeSub;
  completeSub = function (o, sub) {
    const before = profile.today.revenue, onTime = sigClock - o.t0 <= sub.est, clean = !sub.crashed && !o.viol;
    const out = _cs(o, sub);
    const r = rewardJob(onTime, clean, sub.fare || 0);
    payFx(profile.today.revenue - before, profile.today.ratings.at(-1) || 5, r.note);
    return out;
  };
}

/* ---- S12: bấm còi — người đi bộ né / qua đường nhanh hơn ---- */
{
  const _h = horn;
  horn = () => {
    _h();
    const fx = Math.sin(player.h), fz = Math.cos(player.h);
    for (const p of PEDS) {
      if (!p.m.visible || p.down) continue;
      const dx = p.m.position.x - player.x, dz = p.m.position.z - player.z, d = Math.hypot(dx, dz);
      if (d > 20 || dx * fx + dz * fz < 0) continue;
      if (p.cross) p.cross.k = Math.min(1, p.cross.k + 0.25); else { p.s = Math.max(0, Math.min(p.E.L, p.s + p.dir * 2)); p.sp = Math.min(2.6, p.sp * 1.4); }
    }
  };
}
