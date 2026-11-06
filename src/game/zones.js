'use strict';
/* ================= Khu giao hàng (chung cư / văn phòng / nhà riêng) + đơn gấp / đơn hiếm ================= */
function classifyDrop(d) {
  if (d.zone) return d.zone;
  const x = d.sx ?? d.x, z = d.sz ?? d.z; let best = null, bd = 45;
  for (const b of bColliders.query(x, z, 45, [])) {
    const cx = (b.bb[0] + b.bb[2]) / 2, cz = (b.bb[1] + b.bb[3]) / 2, dd = Math.hypot(cx - x, cz - z) - Math.min(b.bb[2] - b.bb[0], b.bb[3] - b.bb[1]) / 2;
    if (dd < bd) { bd = dd; best = b; }
  }
  const hsh = Math.abs(Math.sin(x * 12.9898 + z * 78.233) * 43758.5453) % 1;
  return d.zone = !best ? 'house' : best.h >= 25 ? 'apt' : best.h >= 12 && hsh < 0.55 ? 'office' : 'house';
}
const ZONE_NAME = CFG.shop.ZONE_NAME;   // data/config/shop.json
function zoneDialog(o, next) {
  const z = classifyDrop(o.drop), s = profile.st, peak = isPeak();
  const go = (min, sat, extra) => () => { passTime(min); o.sat += sat; if (o.heat !== undefined) o.heat = Math.max(0, o.heat - min * 1.5); extra && extra(); setTimeout(() => next(), 350); };
  if (z === 'apt') showDialog({ who: ZONE_NAME.apt[profile.english ? 1 : 0], text: L('Bảo vệ: “Shipper không được lên tầng nha em, gửi ở sảnh hoặc gọi khách xuống.”', 'Guard: "Couriers can\'t go upstairs. Leave it in the lobby or call the customer down."'), opts: [
    { t: L('📞 Gọi khách xuống sảnh nhận (~5 phút)', '📞 Call the customer down (~5 min)'), good: true, fx: go(5, -2) },
    { t: L('📦 Gửi quầy lễ tân, chụp ảnh báo khách (1 phút)', '📦 Leave it at reception and send a photo (1 min)'), good: true, why: 'Always send a photo as proof.', fx: go(1, -6) },
    { t: L('🪪 Gửi CCCD, đăng ký thẻ khách để lên tận cửa (~7 phút)', '🪪 Register a visitor pass to deliver to the door (~7 min)'), good: true, fx: go(7, 12, () => s.stamina = clamp01(s.stamina - 3)) }] });
  else if (z === 'office') showDialog({ who: ZONE_NAME.office[profile.english ? 1 : 0], text: L(`Tòa nhà văn phòng${peak ? ' đang giờ cao điểm, thang máy kẹt cứng' : ''}. Khách ghi chú: “Giao tầng 12 giúp em”.`, `Office building${peak ? ' at rush hour, lifts are packed' : ''}. Note: "Please bring it to floor 12".`), opts: [
    { t: L(`🛗 Đi thang máy lên tầng 12 (~${peak ? 12 : 7} phút)`, `🛗 Take the lift to floor 12 (~${peak ? 12 : 7} min)`), good: true, fx: go(peak ? 12 : 7, 12) },
    { t: L('💬 Nhắn khách xuống quầy lễ tân (~4 phút)', '💬 Ask them to come to reception (~4 min)'), good: true, why: 'Polite request: "Could you come down to the lobby, please?"', fx: go(4, -3) },
    { t: L('📦 Để ở quầy rồi đi luôn', '📦 Drop it at the desk and leave'), good: false, why: 'Tell the customer before leaving the order.', fx: go(1, -12) }] });
  else {
    const dog = Math.random() < 0.25;
    showDialog({ who: ZONE_NAME.house[profile.english ? 1 : 0], text: dog ? L('Nhà trong hẻm, cổng đóng. 🐕 Một con chó sủa ầm ĩ sau cổng!', 'A house down an alley, gate closed. 🐕 A dog is barking behind the gate!') : L('Nhà trong hẻm nhỏ, cổng đóng.', 'A house down a small alley, gate closed.'), opts: [
      { t: L('🔔 Bấm chuông và chờ (~2 phút)', '🔔 Ring the bell and wait (~2 min)'), good: true, fx: go(2, 3, () => dog && (s.stress = clamp01(s.stress + 5))) },
      { t: L('📞 Gọi điện cho khách ra mở cổng (1 phút)', '📞 Call the customer to open the gate (1 min)'), good: true, fx: go(1, 2) },
      { t: L('🪝 Treo túi lên cổng rồi đi', '🪝 Hang the bag on the gate and leave'), good: false, why: 'Hand it over in person or confirm with the customer.', fx: go(0, -15) }] });
  }
}
{
  const _hd = handoverDialog;
  handoverDialog = function (o, done) {
    if (o.zoned) return _hd(o, done);
    o.zoned = true; zoneDialog(o, () => _hd(o, done));
  };
}

/* ---- special orders ---- */
const RARE_ITEMS = CFG.shop.RARE_ITEMS;   // data/config/shop.json
{
  const _mo = makeOffer;
  makeOffer = function () {
    const o = _mo();
    if (o.type !== 'food') return o;
    const r = Math.random();
    if (r < 0.12) { o.urgent = true; o.est *= 0.7; o.fare = Math.round(o.fare * 1.5 / 1000) * 1000; }
    else if (r < 0.2 && profile.level >= 2) { const it = pick(RARE_ITEMS); o.rare = it[1]; o.items = [it[0]]; o.fare = Math.round(o.fare * 1.3 / 1000) * 1000; }
    return o;
  };
  const _so = showOffer;
  showOffer = function (o) {
    _so(o);
    if (o.urgent) { $('offType').textContent = L('⚡ GIAO GẤP · ', '⚡ URGENT · ') + $('offType').textContent; $('offItems').textContent += L(' · ⏱️ thời gian ngắn, cước ×1,5', ' · ⏱️ tight deadline, fare ×1.5'); }
    if (o.rare) { $('offType').textContent = L('🌟 ĐƠN HIẾM · ', '🌟 RARE · ') + $('offType').textContent; $('offItems').textContent += L(' · ⚠️ dễ vỡ: té/va chạm hỏng gấp đôi', ' · ⚠️ fragile: crashes do double damage'); }
  };
  const fragile = (fn) => function (...a) {
    const o = game.order, before = o && o.rare && o.integ !== undefined ? o.integ : null;
    const r = fn.apply(this, a);
    if (before !== null && game.order === o && o.integ < before) { o.integ = Math.max(0, o.integ - (before - o.integ)); toast(L(`💔 ${o.items[0]} bị ảnh hưởng! Nguyên vẹn ${Math.round(o.integ)}%`, `💔 The ${o.rare} took damage! ${Math.round(o.integ)}% intact`), 2); }
    return r;
  };
  onCrash = fragile(onCrash); triggerFall = fragile(triggerFall);
  const _do = dropOff;
  dropOff = function () {
    const o = game.order; if (!o) return _do();
    let bonus = 0, msg = '';
    if (o.urgent) { if (game.tripT <= o.est) { o.sat += 10; bonus = 15000; msg = L('⚡ Thưởng giao gấp đúng giờ', '⚡ Urgent on-time bonus'); } else { o.sat -= 25; msg = L('⚡ Đơn gấp bị trễ, khách không vui', '⚡ Urgent order was late'); } }
    if (o.rare) { if (o.integ >= 85) { bonus += 30000; msg = L('🌟 Khách khen giữ hàng cẩn thận, tip thêm', '🌟 Careful delivery, extra tip'); } else if (o.integ < 60) { spend(50000, 'other', true); msg = L('💔 Hàng hư hỏng — bồi thường 50.000đ', '💔 Damaged — 50,000đ compensation'); } }
    _do();
    if (bonus) earn(bonus, 'cash', true);
    if (msg) setTimeout(() => toast(`${msg}${bonus ? ' +' + fmtVND(bonus) : ''}`, 2.6), 3700);
    profile.totals.special = (profile.totals.special || 0) + ((o.urgent || o.rare) ? 1 : 0);
  };
}
