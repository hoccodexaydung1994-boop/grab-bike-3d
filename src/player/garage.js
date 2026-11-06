'use strict';
/* ================= Garage: mua & đổi xe (data/config/bikes.json) ================= */
const BIKES = CFG.bikes.bikes;
if (!profile.bikes) profile.bikes = ['vespa'];
if (!profile.bikeId || !BIKES[profile.bikeId]) profile.bikeId = 'vespa';
const curBike = () => BIKES[profile.bikeId] || BIKES.vespa;
{
  const _ms = mulSpeed, _mf = mulFuel, _mst = mulStamina, _tb = tipBonus;
  mulSpeed = () => _ms() * curBike().speed;
  mulFuel = () => _mf() * curBike().fuel;
  mulStamina = () => _mst() * curBike().comfort;
  tipBonus = () => _tb() + (curBike().tip || 0);
  fuelPrice = (need) => Math.round(need * 1000 * curBike().fuelCost / 1000) * 1000;
  repairMul = () => curBike().repair;
}
const altBike = new THREE.Group(); bike.lean.add(altBike);
function applyBikeModel() {
  const B = curBike();
  altBike.clear();
  if (B.model === 'vespa') { if (bike.model) bike.model.visible = true; }
  else {
    if (bike.model) bike.model.visible = false;
    const col = parseInt(B.color.slice(1), 16);
    const m = B.model === 'underbone' ? buildUnderbone(col) : buildScooter(col);
    m.position.y = B.model === 'underbone' ? -0.12 : -0.05; shadowAll(m); altBike.add(m);
  }
  const ic = $('st_fuel'); if (ic) { ic.querySelector('span').textContent = B.elec ? '🔌' : '⛽'; ic.title = B.elec ? L('Pin xe điện', 'EV battery') : L('Xăng', 'Fuel'); }
}
BOOT.push(applyBikeModel);
{ const _ap = applyPaint; applyPaint = () => { _ap(); applyBikeModel(); }; }   // khi GLB tải xong
// electric: charge at home
ACTION_HOOKS.push((opts) => {
  if (!curBike().elec || profile.st.fuel > 95) return;
  if (Math.hypot(homeSpot.x - player.x, homeSpot.z - player.z) < 30) opts.unshift({ t: L('🔌 Sạc xe ở nhà (60 phút, 5.000đ)', '🔌 Charge at home (60 min, 5,000đ)'), fx: () => { if (spend(5000, 'fuel')) { passTime(60); profile.st.fuel = 100; toast(L('🔋 Xe đã sạc đầy', '🔋 Fully charged'), 1.6); } } });
});
// garage section in the 🛵 bike tab
{
  const _rp = renderPanel;
  renderPanel = function () {
    _rp(); if (panelTab !== 'bike') return;
    const E = profile.english ? 1 : 0, pct = (v) => `${v >= 1 ? '+' : ''}${Math.round((v - 1) * 100)}%`;
    let h = `<h4>🏍️ ${L('Garage — đổi xe', 'Garage — switch bikes')}</h4>`;
    for (const [id, B] of Object.entries(BIKES)) {
      const own = profile.bikes.includes(id), on = profile.bikeId === id, lock = profile.level < B.lv;
      h += `<div class="sk"><div><b>${B.n[E]}</b> ${on ? '✅' : ''}<br><small>${B.desc[E]}<br>🚀 ${L('tốc độ', 'speed')} ${pct(B.speed)} · ⛽ ${L('hao', 'use')} ${pct(B.fuel)}${B.fuelCost !== 1 ? ` · ${L('giá nạp', 'refill')} ${pct(B.fuelCost)}` : ''} · 😮‍💨 ${L('mỏi', 'fatigue')} ${pct(B.comfort)} · 🔧 ${L('sửa', 'repair')} ${pct(B.repair)}${B.tip ? ` · 🎁 tip +${Math.round(B.tip * 100)}%` : ''}</small></div>
        <button data-gar="${id}" ${on || lock ? 'disabled' : ''}>${on ? L('Đang đi', 'Riding') : own ? L('Dùng', 'Use') : lock ? `🔒 Lv${B.lv}` : fmtVND(B.price)}</button></div>`;
    }
    $('mpBody').insertAdjacentHTML('beforeend', h + `<p><small>${L('Nâng cấp động cơ/bình xăng/phanh/thùng ở trên áp dụng cho mọi xe.', 'Upgrades above apply to every bike.')}</small></p>`);
  };
  $('mpBody').addEventListener('click', (e) => {
    const b = e.target.closest('[data-gar]'); if (!b || b.disabled) return;
    const id = b.dataset.gar, B = BIKES[id];
    if (!profile.bikes.includes(id)) { if (!spend(B.price, 'upgrade')) return; profile.bikes.push(id); toast(L(`🎉 Đã mua ${B.n[0]}!`, `🎉 Bought ${B.n[1]}!`), 2.2); ding([523, 784, 1046]); }
    profile.bikeId = id; profile.st.fuel = Math.min(profile.st.fuel, 100); applyBikeModel(); saveProfile(); renderPanel();
  });
}
BOOT.push(() => { const _nm = netMsg; netMsg = () => Object.assign(_nm(), { bk: profile.bikeId }); });
