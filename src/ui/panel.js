'use strict';
/* ================= Management panel: Hồ sơ · Kỹ năng · Xe · Tài chính · Cài đặt ================= */
let panelTab = 'profile';
function openPanel(tab) {
  if (game.mode !== 'drive' && game.mode !== 'menu') return;
  panelTab = tab || panelTab; game.paused = game.mode === 'drive' ? true : game.paused;
  $('mp').classList.remove('hidden'); renderPanel();
}
function closePanel() { $('mp').classList.add('hidden'); if (game.mode === 'drive' && $('dlg').classList.contains('hidden')) game.paused = false; saveProfile(); updateProfileHUD(); }
function bar(v, max, col) { return `<span class="pb"><i style="width:${Math.max(0, Math.min(100, v / max * 100))}%;background:${col}"></i></span>`; }
function renderPanel() {
  document.querySelectorAll('#mpTabs button').forEach(b => b.classList.toggle('sel', b.dataset.tab === panelTab));
  const P = profile, E = profile.english;
  let h = '';
  if (panelTab === 'profile') {
    const t = tierInfo(), rating = P.ratings.length ? (P.ratings.reduce((a, b) => a + b, 0) / P.ratings.length).toFixed(2) : '5.00';
    const cr = P.week.orders ? (P.week.cancels / P.week.orders * 100).toFixed(0) : 0;
    h += `<h3>👤 ${P.name}</h3><p>${L('Cấp', 'Level')} <b>${P.level}</b> ${bar(P.xp, xpNeed(P.level), '#00b14f')} ${P.xp}/${xpNeed(P.level)} XP · ${L('Điểm kỹ năng', 'Skill points')}: <b>${P.sp}</b></p>
      <table class="kv"><tr><td>${L('Hạng tài xế', 'Driver tier')}</td><td><b>${t.name}</b> ${t.bonus ? `(+${t.bonus * 100}% ${L('cước', 'fare')})` : ''}</td></tr>
      <tr><td>⭐ ${L('Đánh giá (50 cuốc gần nhất)', 'Rating (last 50)')}</td><td><b>${rating}</b></td></tr>
      <tr><td>✅ ${L('Tỉ lệ nhận cuốc (20 gần nhất)', 'Acceptance (last 20)')}</td><td><b>${Math.round(acceptRate() * 100)}%</b> ${acceptRate() < 0.5 ? L('⚠️ thấp → ít cuốc hơn', '⚠️ low → fewer offers') : ''}</td></tr>
      <tr><td>❌ ${L('Tỉ lệ hủy tuần này', 'Cancel rate this week')}</td><td><b>${cr}%</b> (${L('tối đa', 'max')} 10%)</td></tr>
      <tr><td>🪪 ${L('Điểm giấy phép lái xe', 'Licence points')}</td><td>${bar(P.license, 12, '#3E9BFF')} <b>${P.license}/12</b></td></tr>
      <tr><td>🚨 ${L('Mức truy nã', 'Wanted level')}</td><td>${'🚨'.repeat(P.wanted) || '—'}</td></tr>
      <tr><td>📅 ${L('Ngày làm việc', 'Days worked')}</td><td>${P.totals.days} · ${P.totals.bike} GrabBike · ${P.totals.food} GrabFood · ${(P.totals.km || 0).toFixed(1)} km</td></tr>
      <tr><td>🏅 ${L('Thành tích', 'Achievements')}</td><td>${Object.keys(P.ach).length}/${Object.keys(ACH).length}</td></tr>
      <tr><td>🏆 ${L('Kỷ lục', 'Records')}</td><td>${L('ngày cao nhất', 'best day')} ${fmtVND(P.rec?.bestDay || 0)} · ${P.rec?.maxTrips || 0} ${L('chuyến/ngày', 'jobs/day')} · ${(P.rec?.longest || 0).toFixed(1)} km</td></tr>
      <tr><td>🎒 ${L('Túi đồ', 'Inventory')}</td><td>🧥 ${P.inv.raincoat || 0} · 🔋 ${P.inv.powerbank || 0}</td></tr></table>
      <h4>🔓 ${L('Mở khóa theo cấp', 'Level unlocks')}</h4><p>${UNLOCKS.map(u => `${P.level >= u.lv ? '✅' : '🔒'} Lv${u.lv} ${u.t[E ? 1 : 0]}`).join('<br>')}</p>`;
  } else if (panelTab === 'skills') {
    h += `<h3>🌳 ${L('Cây kỹ năng', 'Skill tree')} — ${L('còn', 'available')} <b>${P.sp}</b> ${L('điểm', 'points')}</h3>`;
    for (const [id, s] of Object.entries(SKILLS)) {
      const r = P.skills[id];
      h += `<div class="sk"><div><b>${s.name[E ? 1 : 0]}</b> <span class="dots">${'●'.repeat(r)}${'○'.repeat(5 - r)}</span></div><small>${s.ranks.filter(Boolean).join('<br>')}</small>
        <button data-act="skill" data-id="${id}" ${P.sp > 0 && r < 5 ? '' : 'disabled'}>+1</button></div>`;
    }
  } else if (panelTab === 'bike') {
    h += `<h3>🛵 ${L('Xe & trang bị', 'Bike & gear')}</h3><p>🔧 ${L('Độ bền', 'Durability')} ${bar(P.st.dura, 100, '#A0A7B4')} · ⛽ ${bar(P.st.fuel, 100, '#30A46C')} · 🧥 ${L('Áo mưa', 'Raincoats')}: ${P.inv.raincoat || 0}</p>`;
    for (const [id, u] of Object.entries(UPGRADES)) {
      const lv = P.up[id], max = u.cost.length, cost = u.cost[lv];
      h += `<div class="sk"><div><b>${u.name[E ? 1 : 0]}</b> <span class="dots">${'●'.repeat(lv)}${'○'.repeat(max - lv)}</span></div><small>${u.fx[E ? 1 : 0]}</small>
        <button data-act="up" data-id="${id}" ${lv < max ? '' : 'disabled'}>${lv < max ? fmtVND(cost) : 'MAX'}</button></div>`;
    }
    h += `<h4>🎨 ${L('Sơn xe (150.000đ)', 'Paint (150,000đ)')}</h4><p>${PAINTS.map(([n, c]) => `<button class="chip" data-act="paint" data-c="${c}" style="border-left:14px solid #${c.toString(16).padStart(6, '0')}">${n}</button>`).join(' ')}</p>`;
  } else if (panelTab === 'money') {
    const t = P.today, c = t.costs;
    h += `<h3>💰 ${L('Tài chính', 'Finance')}</h3><table class="kv">
      <tr><td>💵 ${L('Tiền mặt', 'Cash')}</td><td><b>${fmtVND(P.cash)}</b></td></tr><tr><td>📱 ${L('Ví ứng dụng', 'App wallet')}</td><td><b>${fmtVND(P.wallet)}</b></td></tr>
      <tr><td>🏦 ${L('Tiết kiệm', 'Savings')}</td><td><b>${fmtVND(P.savings)}</b></td></tr></table>
      <p><button class="chip" data-act="w2c">${L('📱→💵 Rút 100k từ ví (phí 1.100đ)', '📱→💵 Withdraw 100k (fee 1,100đ)')}</button>
      <button class="chip" data-act="s2c">${L('🏦→💵 Rút 100k tiết kiệm', '🏦→💵 Take 100k from savings')}</button>
      <button class="chip" data-act="c2s">${L('💵→🏦 Gửi 100k vào tiết kiệm', '💵→🏦 Save 100k')}</button></p>
      <h4>${L('Hôm nay', 'Today')}</h4><table class="kv"><tr><td>${L('Doanh thu', 'Revenue')}</td><td>${fmtVND(t.revenue)} (tip ${fmtVND(t.tips)})</td></tr>
      <tr><td>${L('Chi phí', 'Costs')}</td><td>⛽ ${fmtVND(c.fuel)} · 🍜 ${fmtVND(c.food)} · 🔧 ${fmtVND(c.repair)} · 🚔 ${fmtVND(c.fine)} · 📦 ${fmtVND(c.other + c.living + (c.upgrade || 0))}</td></tr>
      <tr><td>${L('Lợi nhuận', 'Profit')}</td><td><b>${fmtVND(t.revenue - Object.values(c).reduce((a, b) => a + b, 0))}</b></td></tr></table>
      <h4>📈 ${L('Lịch sử 7 ngày', 'Last 7 days')}</h4><table class="kv">${P.history.slice(-7).reverse().map(d => `<tr><td>${L('Ngày', 'Day')} ${d.day}</td><td>${fmtVND(d.revenue)} · ${L('lãi', 'profit')} ${fmtVND(d.profit)} · ${d.trips} ${L('cuốc', 'jobs')} · ⭐${d.rating}</td></tr>`).join('') || `<tr><td>${L('Chưa có', 'None yet')}</td></tr>`}</table>`;
  } else if (panelTab === 'settings') {
    const S = P.settings;
    h += `<h3>⚙️ ${L('Cài đặt', 'Settings')}</h3><h4>${L('Hiện thanh chỉ số', 'Show stat bars')}</h4><p>` +
      STAT_DEF.map(([k, ic, n]) => `<label class="tg"><input type="checkbox" data-act="bar" data-id="${k}" ${S.bars[k] === false ? '' : 'checked'}> ${ic} ${n}</label>`).join('') + `</p>
      <h4>${L('Đồ họa & âm thanh', 'Graphics & sound')}</h4><p>
      <label class="tg"><input type="checkbox" data-act="set" data-id="shadows" ${S.shadows ? 'checked' : ''}> ${L('Đổ bóng', 'Shadows')}</label>
      <label class="tg"><input type="checkbox" data-act="set" data-id="hiq" ${S.hiq ? 'checked' : ''}> ${L('Độ nét cao (tắt nếu máy yếu)', 'High resolution (off for slow devices)')}</label>
      <label class="tg"><input type="checkbox" data-act="set" data-id="sound" ${S.sound ? 'checked' : ''}> ${L('Âm thanh', 'Sound')}</label>
      <label class="tg"><input type="checkbox" data-act="set" data-id="autoQ" ${S.autoQ !== false ? 'checked' : ''}> ${L('Tự giảm đồ họa khi giật', 'Auto-lower graphics when laggy')}</label>
      <label class="tg"><input type="checkbox" data-act="eng" ${P.english ? 'checked' : ''}> 🇬🇧 English Mode</label></p>
      <p><button class="chip danger" data-act="reset">${L('🗑️ Xoá hồ sơ (bấm 2 lần)', '🗑️ Reset profile (click twice)')}</button></p>`;
  }
  $('mpBody').innerHTML = h;
}
$('mpTabs').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) { panelTab = b.dataset.tab; renderPanel(); } });
$('mpClose').onclick = closePanel;
let resetArm = false;
$('mpBody').addEventListener('click', (e) => {
  const b = e.target.closest('[data-act]'); if (!b || b.disabled) return;
  const P = profile, id = b.dataset.id, act = b.dataset.act;
  if (act === 'skill' && P.sp > 0 && P.skills[id] < 5) { P.skills[id]++; P.sp--; toast(`🌳 ${SKILLS[id].name[P.english ? 1 : 0]} → ${L('bậc', 'rank')} ${P.skills[id]}`, 1.6); }
  if (act === 'up') { const u = UPGRADES[id], lv = P.up[id]; if (lv < u.cost.length && spend(u.cost[lv], 'upgrade')) { P.up[id]++; toast(`🛠️ ${u.name[P.english ? 1 : 0]} ${L('cấp', 'level')} ${P.up[id]}`, 1.6); } }
  if (act === 'paint' && spend(150000, 'upgrade')) { P.paint = +b.dataset.c; applyPaint(); }
  if (act === 'w2c') { if (P.wallet >= 101100) { P.wallet -= 101100; P.cash += 100000; P.today.costs.other += 1100; } else toast(L('Ví không đủ', 'Not enough in wallet'), 1.4); }
  if (act === 's2c') { if (P.savings >= 100000) { P.savings -= 100000; P.cash += 100000; } else toast(L('Tiết kiệm không đủ', 'Not enough savings'), 1.4); }
  if (act === 'c2s') { if (P.cash >= 100000) { P.cash -= 100000; P.savings += 100000; } else toast(L('Tiền mặt không đủ', 'Not enough cash'), 1.4); }
  if (act === 'reset') { if (!resetArm) { resetArm = true; b.textContent = L('⚠️ Bấm lần nữa để xoá hẳn', '⚠️ Click again to confirm'); return; } localStorage.removeItem(PROFILE_KEY); location.reload(); return; }
  saveProfile(); updateProfileHUD(); renderPanel();
});
$('mpBody').addEventListener('change', (e) => {
  const b = e.target; if (!b.dataset || !b.dataset.act) return;
  const S = profile.settings;
  if (b.dataset.act === 'bar') { S.bars[b.dataset.id] = b.checked; applySettings(); }
  if (b.dataset.act === 'set') { S[b.dataset.id] = b.checked; applySettings(); }
  if (b.dataset.act === 'eng') { profile.english = b.checked; renderPanel(); }
  saveProfile();
});
function applySettings() {
  const S = profile.settings;
  for (const [k] of STAT_DEF) { const el = $('st_' + k); if (el) el.style.display = S.bars[k] === false ? 'none' : ''; }
  renderer.shadowMap.enabled = !!S.shadows; scene.traverse(o => { if (o.material) o.material.needsUpdate = true; });
  renderer.setPixelRatio(S.hiq ? Math.min(devicePixelRatio, 2) : 1);
  if (!S.sound && !game.muted) toggleMute(); if (S.sound && game.muted) toggleMute();
}
addEventListener('keydown', (e) => { if ((e.code === 'Tab' || e.code === 'Escape') && game.mode === 'drive' && !game.dlgKeys) { e.preventDefault(); $('mp').classList.contains('hidden') ? openPanel() : closePanel(); } });
$('bMenu').onclick = () => openPanel();
$('bProfile').onclick = () => { panelTab = 'profile'; $('mp').classList.remove('hidden'); renderPanel(); };
applySettings();
