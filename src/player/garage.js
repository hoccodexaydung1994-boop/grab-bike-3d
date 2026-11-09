'use strict';
/* ================= Garage: mua & đổi xe (data/config/bikes.json) ================= */
const BIKES = CFG.bikes.bikes;
if (!profile.bikes) profile.bikes = [];
if (!profile.bikeId || !BIKES[profile.bikeId]) profile.bikeId = 'sh';
const curBike = () => BIKES[profile.bikeId] || BIKES.sh;
{
  const _ms = mulSpeed, _mf = mulFuel, _mst = mulStamina, _tb = tipBonus;
  mulSpeed = () => _ms() * curBike().speed;
  mulFuel = () => _mf() * curBike().fuel;
  mulStamina = () => _mst() * curBike().comfort;
  tipBonus = () => _tb() + (curBike().tip || 0);
  fuelPrice = (need) => Math.round(need * 250 * curBike().fuelCost / 500) * 500;
  repairMul = () => curBike().repair;
}
const altBike = new THREE.Group(); bike.lean.add(altBike);
/* Honda SH 160i (models/sh.glb): front = +z, ground y = 0, wheel nodes pivot at the axle */
const SH = { model: null, front: null, rear: null };
new GLTFLoader().load('models/sh.glb?v=' + GAME_VERSION, (gltf) => {
  const m = gltf.scene; m.traverse(o => { if (o.isMesh) { o.castShadow = o.receiveShadow = true; if (o.material.map) o.material.map.anisotropy = 8; } });
  SH.model = m; SH.front = m.getObjectByName('wheelFront'); SH.rear = m.getObjectByName('wheelRear');
  m.visible = false; bike.lean.add(m); applyBikeModel();
  if (curBike().model === 'sh') $('loading').classList.add('hidden');
}, undefined, (e) => console.error('sh.glb', e));
function applyBikeModel() {
  const B = curBike();
  altBike.clear();
  if (!bike.vespaWheels && bike.model) bike.vespaWheels = [bike.frontWheel, bike.rearWheel];
  if (SH.model) SH.model.visible = B.model === 'sh';
  if (B.model === 'sh') {
    if (bike.model) bike.model.visible = false;
    if (SH.model) { bike.frontWheel = SH.front; bike.rearWheel = SH.rear; } bike.R = 0.25;
    if (SH.model && SH.model.userData.paint !== profile.paint) { SH.model.userData.paint = profile.paint; SH.model.traverse(o => { if (o.isMesh && o.material.name === 'body') o.material.color.setHex(profile.paint || 0xffffff); }); }
  } else if (B.model === 'vespa') { if (bike.model) bike.model.visible = true; if (bike.vespaWheels) [bike.frontWheel, bike.rearWheel] = bike.vespaWheels; bike.R = 0.23; }
  else {
    bike.frontWheel = bike.rearWheel = null;
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

/* ---- chọn xe khi mới vào chơi ---- */
{
  const st = document.createElement('style');
  st.textContent = `#bikePick{position:fixed;left:0;right:0;bottom:0;z-index:45;background:linear-gradient(transparent,rgba(5,10,20,.92) 18%);padding:40px 14px 16px;color:#fff;font-family:system-ui}
  #bikePick h2{margin:0 0 4px;text-align:center}#bikePick p{margin:0 0 10px;text-align:center;opacity:.85;font-size:14px}
  #bikePick .row{display:flex;gap:10px;overflow-x:auto;justify-content:center;flex-wrap:wrap}
  #bikePick .card{background:rgba(255,255,255,.1);border:2px solid transparent;border-radius:14px;padding:10px 12px;width:210px;cursor:pointer;font-size:12px;line-height:1.4}
  #bikePick .card.sel{border-color:#00b14f;background:rgba(0,177,79,.22)}#bikePick .card b{font-size:15px}
  #bikePick .go{display:block;margin:12px auto 0}`;
  document.head.appendChild(st);
}
function bikeStats(B) { const pct = (v) => `${v >= 1 ? '+' : ''}${Math.round((v - 1) * 100)}%`; return `🚀 ${pct(B.speed)} · ⛽ ${pct(B.fuel)} · 😮‍💨 ${pct(B.comfort)} · 🔧 ${pct(B.repair)}${B.tip ? ` · 🎁 +${Math.round(B.tip * 100)}%` : ''}`; }
function showBikePicker(done) {
  const E = profile.english ? 1 : 0, ids = Object.keys(BIKES).filter(id => BIKES[id].starter);
  let sel = ids.includes(profile.bikeId) ? profile.bikeId : 'sh';
  const box = document.createElement('div'); box.id = 'bikePick';
  const draw = () => {
    box.innerHTML = `<h2>🛵 ${L('Chọn chiếc xe đầu tiên', 'Pick your first bike')}</h2><p>${L('Xe xoay ở phía trên để bạn xem. Xe khác mua thêm trong Garage (☰ → 🛵 Xe).', 'Preview above. Buy more later in the Garage.')}</p>
      <div class="row">${ids.map(id => `<div class="card${id === sel ? ' sel' : ''}" data-id="${id}"><b>${BIKES[id].n[E]}</b><br>${BIKES[id].desc[E]}<br><span style="opacity:.8">${bikeStats(BIKES[id])}</span></div>`).join('')}</div>
      <button class="big go">✅ ${L('Chọn', 'Choose')} ${BIKES[sel].n[E]}</button>`;
    box.querySelectorAll('.card').forEach(c => c.onclick = () => { sel = c.dataset.id; profile.bikeId = sel; applyBikeModel(); draw(); });
    box.querySelector('.go').onclick = () => {
      if (!profile.bikes.includes(sel)) profile.bikes.push(sel);
      profile.bikeId = sel; profile.bikePicked = true; applyBikeModel(); saveProfile(); box.remove(); $('menu').classList.remove('hidden');
      toast(L(`🔑 Nhận xe ${BIKES[sel].n[0]}!`, `🔑 You got the ${BIKES[sel].n[1]}!`), 2); done && done();
    };
  };
  profile.bikeId = sel; applyBikeModel(); draw(); $('menu').classList.add('hidden'); document.body.appendChild(box);
}
BOOT.push(() => {
  const _st = $('bStart').onclick;
  $('bStart').onclick = function (e) { if (!profile.bikePicked) return showBikePicker(() => _st && _st.call(this, e)); _st && _st.call(this, e); };
  const b = document.createElement('button'); b.className = 'goal'; b.id = 'bPickBike'; b.textContent = L('🛵 Chọn xe / Garage', '🛵 Bikes / Garage');
  b.style.marginLeft = '6px'; $('bData').after(b);
  b.onclick = () => { if (!profile.bikePicked) return showBikePicker(); panelTab = 'bike'; $('mp').classList.remove('hidden'); renderPanel(); };
});
