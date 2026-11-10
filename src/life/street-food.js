'use strict';
/* ================= Ăn uống vỉa hè · ngủ bụi · đau bụng ================= */
const VENDOR_KINDS = CFG.shop.VENDOR_KINDS;   // data/config/shop.json
const VENDORS = [];
{
  const kinds = Object.keys(VENDOR_KINDS), cand = EDGES.filter(E => E.c >= 2 && E.c <= 5 && E.L > 40);
  const props = new THREE.Group(), M = {};
  const mat = (c) => M[c] || (M[c] = std(c, { roughness: 0.7 }));
  const glass = std(0xcfe8ff, { roughness: 0.1, metalness: 0.1, transparent: true, opacity: 0.5 });
  const steel = std(0xb0b6bc, { metalness: 0.6, roughness: 0.35 });
  const N = isTouch ? 40 : 64;
  for (let t = 0; t < 900 && VENDORS.length < N; t++) {
    const E = cand[Math.floor(rand() * cand.length)], s = E.L * (0.15 + rand() * 0.7);
    const p = edgeAt(E, s, true), side = rand() < 0.5 ? 1 : -1, off = E.w / 2 + 2.3;
    const x = p.x - p.dz * off * side, z = p.z + p.dx * off * side;
    if (x < BX0 + 40 || x > BX1 - 40 || z < BZ0 + 40 || z > BZ1 - 40) continue;
    if (inWater(x, z) || pushOut(x, z, 1.2).hit || onRoad(x, z, 0.1)) continue;
    if (VENDORS.some(v => Math.hypot(v.x - x, v.z - z) < 70)) continue;
    const kind = kinds[VENDORS.length % kinds.length], K = VENDOR_KINDS[kind];
    const v = { x, z, kind, K, name: K.n }; VENDORS.push(v);
    const g = new THREE.Group(); g.position.set(x, 0.06, z); g.rotation.y = Math.atan2(p.dz * side, -p.dx * side);   // +z faces the road
    if (kind === 'banhmi' || kind === 'mia' || kind === 'hutieu' || kind === 'che') {
      const cart = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.9, 0.8), mat(K.col)); cart.position.y = 0.75; g.add(cart);
      const top = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.55, 0.7), glass); top.position.y = 1.48; g.add(top);
      const roof = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.06, 0.9), mat(0xffffff)); roof.position.y = 1.78; g.add(roof);
      for (const sx of [-0.6, 0.6]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.08, 12), mat(0x222222)); w.rotation.x = Math.PI / 2; w.position.set(sx, 0.22, 0.42); g.add(w); }
      if (kind === 'hutieu') { const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.4, 14), steel); pot.position.set(0.45, 1.4, 0); g.add(pot); }
    } else if (kind === 'vong') {
      for (let i = 0; i < 3; i++) {
        for (const sx of [-0.9, 0.9]) { const post = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.6, 6), steel); post.position.set(sx, 0.8, i * 1.3 - 1.3); g.add(post); }
        const ham = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 1.7, 10, 1, true, Math.PI, Math.PI), std([0x2e86de, 0xe74c3c, 0x27ae60][i], { side: THREE.DoubleSide, roughness: 0.9 }));
        ham.rotation.z = Math.PI / 2; ham.position.set(0, 0.95, i * 1.3 - 1.3); g.add(ham);
      }
      const roof = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.08, 4.2), mat(0x8d6e63)); roof.position.y = 2.1; g.add(roof);
      for (const [sx, sz] of [[-1.25, -2], [1.25, -2], [-1.25, 2], [1.25, 2]]) { const pp = new THREE.Mesh(new THREE.BoxGeometry(0.1, 2.1, 0.1), mat(0x6d4c41)); pp.position.set(sx, 1.05, sz); g.add(pp); }
    } else {
      const tb = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.06, 0.7), mat(K.col)); tb.position.y = 0.55; g.add(tb);
      for (const lx of [-0.5, 0.5]) for (const lz of [-0.3, 0.3]) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.55, 0.05), steel); l.position.set(lx, 0.27, lz); g.add(l); }
    }
    // umbrella + plastic stools for everyone except the hammock café
    if (kind !== 'vong') {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 2.4, 6), steel); pole.position.set(-0.9, 1.2, -0.6); g.add(pole);
      const um = new THREE.Mesh(new THREE.ConeGeometry(1.5, 0.5, 10, 1, true), std(pick([0xe74c3c, 0x2e86de, 0xf1c40f, 0x16a085]), { side: THREE.DoubleSide, roughness: 0.8 }));
      um.position.set(-0.9, 2.45, -0.6); g.add(um);
      for (let i = 0; i < 3; i++) { const st = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.13, 0.32, 8), mat(pick([0xd32f2f, 0x1976d2, 0x388e3c]))); st.position.set(-0.4 + i * 0.6, 0.16, -1.25); g.add(st); }
    }
    props.add(g);
    const lb = labelSprite(K.n, L('Bán vỉa hè', 'Street food')); lb.position.set(x, 3.6, z); lb.scale.set(10, 2.5, 1); lb.visible = false; scene.add(lb); v.lb = lb;
  }
  scene.add(bake(props));
}
const vendorOpen = (v) => { const h = profile.clock / 60; return h >= v.K.open[0] && h < v.K.open[1]; };
FRAME.push(() => { for (const v of VENDORS) { const d = Math.abs(v.x - player.x) + Math.abs(v.z - player.z); v.lb.visible = d < 110 && vendorOpen(v); } });

/* ---- food poisoning ---- */
function eatStreet(v, item) {
  const [n, c, fx] = item;
  if (!spend(c, 'food')) return;
  applyFx(fx); passTime(v.kind === 'com' || v.kind === 'hutieu' ? 12 : 5); toast(`😋 ${n}`, 1.2);
  const rate = v.K.poison * (profile.st.hunger > 85 ? 1.3 : 1) * (rain > 0.3 ? 1.5 : 1);
  if (Math.random() < rate && !profile.sick) setTimeout(() => {
    profile.sick = { until: profile.clock + 90, from: v.K.n };
    toast(L(`🤢 Đau bụng! Có lẽ do ${v.K.n}.<br><span style="font-weight:500">Thể lực tụt nhanh. Mua thuốc ở cửa hàng tiện lợi/nhà thuốc (E).</span>`, `🤢 Stomach ache from ${v.K.en}!<br><span style="font-weight:500">Stamina drains faster. Buy medicine at a store (E).</span>`), 4);
  }, 6000);
}
let sickT = 0;
FRAME.push((dt) => {
  const S = profile.sick; if (!S || game.paused || game.mode !== 'drive') return;
  if (profile.clock > S.until) { profile.sick = null; toast(L('😌 Hết đau bụng rồi', '😌 Your stomach feels better'), 2); return; }
  const gm = dt * MIN_PER_SEC, s = profile.st;
  s.stamina = clamp01(s.stamina - gm * 0.12); s.stress = clamp01(s.stress + gm * 0.03); s.hp = clamp01(s.hp - gm * 0.015);
  sickT -= dt; if (sickT <= 0) { sickT = 40 + Math.random() * 30; if (Math.random() < 0.5) { toast(L('🤢 Bụng quặn đau… phải tấp vào lề', '🤢 Cramps… pull over!'), 1.8); player.v *= 0.4; } }
});
const PHARMA = MAP.pois.filter(p => p.k === 'pharmacy').map(p => ({ x: p.x, z: p.z, name: p.t }));

/* ---- ngủ bụi (napping rough) ---- */
const sleepFx = { on: false, t: 0 };
let fadeEl = document.createElement('div');
fadeEl.style.cssText = 'position:fixed;inset:0;background:#000;opacity:0;pointer-events:none;transition:opacity .8s;z-index:30;display:flex;align-items:center;justify-content:center;color:#fff;font:800 42px system-ui';
document.body.appendChild(fadeEl);
const zzz = labelSprite('💤 Zzz'); zzz.scale.set(3, 0.75, 1); zzz.visible = false; scene.add(zzz);
function inPark(x, z) { for (const g of MAP.green) { if (g.length > 6 && pip(x, z, g)) return true; } return false; }
function napSpot() {
  const v = VENDORS.find(v => v.kind === 'vong' && Math.hypot(v.x - player.x, v.z - player.z) < 25);
  if (v) return { k: 'vong', q: 1.35, risk: 0.02, txt: L('trên võng ở quán cà phê', 'in a café hammock') };
  if (inPark(player.x, player.z)) return { k: 'park', q: 1.0, risk: 0.06, txt: L('trên ghế đá công viên', 'on a park bench') };
  return { k: 'bike', q: 0.75, risk: 0.08, txt: L('nằm trên yên xe bên lề đường', 'lying on the bike seat by the road') };
}
function napMenu() {
  if (game.order) return toast(L('Đang có đơn, không ngủ được!', 'You have an active order!'), 1.6);
  const sp = napSpot();
  showDialog({ who: L('😴 Ngủ bụi', '😴 Nap rough'), text: L(`Chỗ ngủ: <b>${sp.txt}</b>. Tắt app trong lúc ngủ (không nhận cuốc).<br><small>Ngủ trưa dưới nắng, mưa hay đêm khuya sẽ kém hơn; để nhiều tiền mặt dễ bị móc túi.</small>`, `Spot: <b>${sp.txt}</b>. The app is off while you sleep.<br><small>Sun, rain and late nights make it worse; carrying lots of cash is risky.</small>`),
    opts: [[30, '30 phút', '30 min'], [60, '1 tiếng', '1 hour'], [120, '2 tiếng', '2 hours']].map(([m, vi, en]) => ({ t: `💤 ${L(vi, en)}${sp.k === 'vong' ? ' (' + fmtVND(15000) + ')' : ''}`, fx: () => startNap(m, sp) }))
      .concat([{ t: L('↩️ Thôi', '↩️ Never mind') }]) });
}
function startNap(min, sp) {
  if (sp.k === 'vong' && !spend(15000, 'food')) return;
  game.frozen = true; game.waitT = 99; sleepFx.on = true; sleepFx.t = 0;
  driver.rotation.set(-1.25, 0, 0); driver.position.set(0, 0.25 + RIDER.y, -0.55 + RIDER.z);
  zzz.visible = true;
  fadeEl.textContent = '💤'; fadeEl.style.opacity = '0.85';
  setTimeout(() => finishNap(min, sp), 2600);
}
FRAME.push((dt) => { if (!sleepFx.on) return; sleepFx.t += dt; zzz.position.set(player.x, 2.3 + Math.sin(sleepFx.t * 2) * 0.2, player.z); });
function finishNap(min, sp) {
  const s = profile.st, h = profile.clock / 60;
  let q = sp.q; const notes = [];
  if (h >= 11 && h < 14.5 && sp.k !== 'vong') { q *= 0.65; s.thirst = clamp01(s.thirst + 15); notes.push(L('☀️ Nắng trưa gay gắt, ngủ không ngon', '☀️ Harsh noon sun')); }
  if (rain > 0.3 && sp.k !== 'vong') { q *= raincoat ? 0.7 : 0.4; if (!raincoat) s.hp = clamp01(s.hp - 6); notes.push(L('🌧️ Mưa ướt hết người', '🌧️ Soaked by the rain')); }
  if (h >= 21 || h < 5) { q *= 0.85; notes.push(L('🦟 Muỗi đốt cả đêm', '🦟 Mosquitoes all night')); }
  let realMin = min;
  if (sp.k === 'park' && Math.random() < 0.12) { realMin = Math.round(min / 2); notes.push(L('👮 Bảo vệ công viên đánh thức, đuổi đi', '👮 A park guard woke you up')); }
  passTime(realMin);
  s.stamina = clamp01(s.stamina + realMin * 0.55 * q); s.stress = clamp01(s.stress - realMin * 0.15 * q); s.hp = clamp01(s.hp + realMin * 0.04 * q);
  s.hunger = clamp01(s.hunger + realMin * 0.05); s.thirst = clamp01(s.thirst + realMin * 0.06);
  if (profile.sick) profile.sick.until -= realMin * 0.5;
  // theft
  const hrs = realMin / 60, risk = sp.risk * (h >= 21 || h < 5 ? 2 : 1) * hrs;
  if (profile.cash > 200000 && Math.random() < risk) {
    const lost = Math.round(Math.min(100000, profile.cash * 0.2) / 1000) * 1000;   // S9: tối đa 20% hoặc 100k profile.cash -= lost; profile.today.costs.other += lost; s.stress = clamp01(s.stress + 25);
    notes.push(L(`🕵️ Bị móc túi mất <b>${fmtVND(lost)}</b>! Lần sau gửi bớt tiền vào ví/tiết kiệm.`, `🕵️ Pickpocketed: <b>${fmtVND(lost)}</b>!`));
  } else if (Math.random() < 0.03 * hrs && (profile.inv.raincoat || 0) > 0) { profile.inv.raincoat--; notes.push(L('🧥 Bị lấy mất áo mưa trong cốp', '🧥 Someone stole your raincoat')); }
  sleepFx.on = false; zzz.visible = false; seatRiders();
  fadeEl.style.opacity = '0'; game.frozen = false; game.waitT = 3;
  showDialog({ who: L('⏰ Thức dậy', '⏰ Awake'), text: L(`Bạn đã ngủ ${realMin} phút ${sp.txt}. Bây giờ là ${clockText(profile.clock)}.<br>⚡ Thể lực: <b>${Math.round(s.stamina)}</b> · 😤 Stress: <b>${Math.round(s.stress)}</b>`, `You slept ${realMin} min ${sp.txt}. It is now ${clockText(profile.clock)}.<br>⚡ Stamina <b>${Math.round(s.stamina)}</b> · 😤 Stress <b>${Math.round(s.stress)}</b>`) + (notes.length ? '<br><br>' + notes.join('<br>') : ''), opts: [{ t: L('🛵 Chạy tiếp', '🛵 Back to work') }] });
  saveProfile();
}

/* ---- action-menu entries ---- */
ACTION_HOOKS.push((opts) => {
  const v = nearest(VENDORS, 18);
  if (v) {
    if (vendorOpen(v)) opts.unshift({ t: L(`${v.K.n} — ăn uống vỉa hè`, `${v.K.en} — street food`), fx: () => setTimeout(() => showDialog({ who: v.K.n, text: L(`Tiền mặt: <b>${fmtVND(profile.cash)}</b> (quán vỉa hè chỉ nhận tiền mặt, thiếu thì trừ ví)`, `Cash: <b>${fmtVND(profile.cash)}</b>`),
      opts: v.K.menu.map(it => ({ t: `${it[0]} — ${fmtVND(it[1])}`, fx: () => eatStreet(v, it) })).concat([{ t: L('↩️ Thôi', '↩️ Never mind') }]) }), 50) });
    else opts.unshift({ t: L(`${v.K.n} — đã dọn hàng (mở ${v.K.open[0]}h–${v.K.open[1] % 24}h)`, `${v.K.en} — closed`), disabled: true });
  }
  const sh = nearest(SHOPS, 30) || nearest(PHARMA, 30);
  if (sh && profile.sick) opts.unshift({ t: L('💊 Mua thuốc đau bụng (20.000đ)', '💊 Buy stomach medicine (20,000đ)'), fx: () => { if (spend(20000, 'other')) { profile.sick = null; profile.st.stamina = clamp01(profile.st.stamina + 5); toast(L('💊 Uống thuốc xong, đỡ hẳn', '💊 Much better now'), 2); } } });
  opts.push({ t: L('💤 Ngủ bụi (30 phút – 2 tiếng)', '💤 Nap rough (30 min – 2 h)'), fx: () => setTimeout(napMenu, 50) });
});
