'use strict';
/* ================= HUD update ================= */
let hudT = 0;
function updateHUD(dt) {
  $('kmh').textContent = Math.round(Math.abs(player.v) * 3.6);
  $('limit').textContent = curLimit; $('limit').classList.toggle('over', Math.abs(player.v) * 3.6 > curLimit + 5);
  $('wanted').innerHTML = profile.wanted ? '🚨'.repeat(profile.wanted) + (police.active && police.choice === 'flee' ? ` <small>${L('thoát', 'escape')} ${Math.min(100, Math.round(police.escT / escapeNeed() * 100))}%</small>` : '') : '';
  hudT -= dt;
  const t = currentTarget();
  if (t) {
    const aim = routeAim() || t;
    const dx = aim.x - player.x, dz = aim.z - player.z;
    let rel = Math.atan2(dx, dz) - player.h; rel = Math.atan2(Math.sin(rel), Math.cos(rel));
    $('arrow').style.transform = `rotate(${-rel}rad)`; $('arrow').style.opacity = 1;
    const d = route ? route.len : Math.hypot(t.x - player.x, t.z - player.z);
    $('dist').textContent = d >= 1000 ? (d / 1000).toFixed(1) + ' km' : Math.round(d) + ' m';
  } else { $('arrow').style.opacity = 0.25; $('dist').textContent = '–'; }
  // traffic light ahead
  let sig = null, sd = 1e9; const fx = Math.sin(player.h), fz = Math.cos(player.h);
  for (const s of sigGrid.query(player.x, player.z, 80, _sq)) {
    const dx = s.x - player.x, dz = s.z - player.z, ahead = dx * fx + dz * fz;
    if (ahead < 0 || ahead > 80 || Math.abs(dx * fz - dz * fx) > s.rc + 6) continue;
    if (ahead < sd) { sd = ahead; sig = s; }
  }
  const chip = $('sig');
  if (sig) { const [st, rem] = sigState(sig, fx, fz); chip.className = 'sig ' + st; chip.innerHTML = `<i></i>${Math.ceil(rem)}`; }
  else chip.className = 'sig hidden';
  if (hudT <= 0) {
    hudT = 0.15;
    const st = $('status');
    if (profile.banned) st.textContent = '⛔ Bị khóa app hôm nay';
    else if (phoneDead()) st.innerHTML = L('📵 <b>Hết pin điện thoại!</b> Sạc ở quán (E) hoặc dùng sạc dự phòng', '📵 <b>Phone is dead!</b> Charge at a café (E)');
    else if (police.active && police.choice === 'flee') st.innerHTML = '🚨 <b>CSGT đang rượt!</b> Chạy xa >115 m để thoát';
    else if (game.state === 'wait') st.textContent = '⏳ Đang tìm cuốc gần bạn…';
    else if (game.state === 'offer') st.textContent = '📲 Có cuốc mới — Nhận hay bỏ qua?';
    else if (game.order && game.order.type === 'batch') st.innerHTML = game.order.stops ? `🍱 ${L('Đơn ghép', 'Batch')} ${game.order.si + 1}/4: ${game.order.stops[game.order.si].k === 'pick' ? L('lấy túi ', 'pick up bag ') : L('giao túi ', 'deliver bag ')}${game.order.stops[game.order.si].s + 1}` : L('🍱 Chọn thứ tự lấy & giao', '🍱 Choose the route');
    else if (game.state === 'pickup') st.innerHTML = game.order.type === 'food' ? `🍜 Tới lấy món: ${game.order.shop.name}` : `🟢 Đến đón khách<br>đường ${game.order.pickup.name}`;
    else if (game.state === 'ride') st.innerHTML = game.order.type === 'food' ? `🟠 Giao món tới đường ${game.order.drop.name}<br>${fmtVND(game.order.fare)}` : `🟠 Chở khách tới đường ${game.order.drop.name}<br>${game.order.km.toFixed(1)} km · ${fmtVND(game.order.fare)}`;
    const nm = streetNameAt(player.x, player.z);
    $('street').textContent = nm ? `📍 ${nm}` : '';
    { const carried = game.order ? (game.order.subs ? game.order.subs.filter(b => b.picked && !b.done) : (game.order.type === 'food' && game.state === 'ride' ? [game.order] : [])) : [];
      $('food').innerHTML = carried.map((b, i) => `🍱${carried.length > 1 ? i + 1 : ''} 🔥<span class="pb s"><i style="width:${b.heat}%;background:${b.heat < 50 ? '#ef4444' : '#f59e0b'}"></i></span> 📦<span class="pb s"><i style="width:${b.integ}%;background:#3E9BFF"></i></span>`).join('<br>'); }
    $('jam').textContent = isPeak() ? L('🚗 Giờ cao điểm: đường đông, xe chạy chậm', '🚗 Rush hour: heavy traffic') : '';
    $('clock').textContent = `🕐 ${clockText(profile.clock)} · ${L('Ngày', 'Day')} ${profile.day}${rain > 0.3 ? ' · 🌧️' : ''}`;
    renderStats();
    $('bAct').classList.toggle('pulse', Math.abs(player.v) < 1.5 && !!(nearest(FUEL, 30) || nearest(REPAIR, 35) || nearest(SHOPS, 30) || nearest(MERCHANTS, 30)));
    drawMini(); drawPhone();
    const bg = $('bGo');
    if (game.order && game.order.type === 'batch') { if (game.order.stops) { bg.classList.remove('hidden'); bg.classList.toggle('drop', game.state === 'ride'); bg.textContent = game.state === 'ride' ? L('🏁 Tới điểm giao tiếp theo', '🏁 Go to next drop') : L('📍 Tới quán tiếp theo', '📍 Go to next shop'); } else bg.classList.add('hidden'); }
    else if (game.state === 'pickup') { bg.classList.remove('hidden', 'drop'); bg.textContent = game.order.type === 'food' ? '📍 Tới quán lấy món' : '📍 Tới điểm đón khách'; }
    else if (game.state === 'ride') { bg.classList.remove('hidden'); bg.classList.add('drop'); bg.textContent = game.order.type === 'food' ? '🏁 Tới chỗ giao món' : '🏁 Tới điểm trả khách'; }
    else bg.classList.add('hidden');
    if (game.state === 'offer' && game.offer) $('offBar').style.width = (game.offer.expire / 15 * 100) + '%';
  }
}
