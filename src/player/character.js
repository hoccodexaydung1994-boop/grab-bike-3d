'use strict';
/* ================= Tạo nhân vật & trang phục ================= */
const SKINS = CFG.outfits.SKINS;   // data/config/outfits.json
const JACKETS = CFG.outfits.JACKETS;   // data/config/outfits.json
const HELMET_LOOKS = CFG.outfits.HELMET_LOOKS;   // data/config/outfits.json
const ACCS = CFG.outfits.ACCS;   // data/config/outfits.json
if (!profile.look) profile.look = { g: 'm', skin: 0, jacket: 'grab', helmet: 'grab', acc: 'none' };
if (!profile.wardrobe) profile.wardrobe = { jacket: ['grab'], helmet: ['grab'], acc: ['none'] };
const _jtex = {};
function jacketTexFor(id) {
  if (_jtex[id]) return _jtex[id];
  const J = JACKETS[id];
  return _jtex[id] = canvasTex2(512, 256, (g, w, h) => {
    const grd = g.createLinearGradient(0, 0, 0, h); grd.addColorStop(0, J.c[0]); grd.addColorStop(1, J.c[1]);
    g.fillStyle = grd; g.fillRect(0, 0, w, h);
    g.fillStyle = J.c[2]; g.fillRect(w * 0.2, 0, w * 0.1, h); g.fillRect(w * 0.7, 0, w * 0.1, h); g.fillRect(0, 0, w, h * 0.16);
    const refl = (y, th) => { const gg = g.createLinearGradient(0, y, 0, y + th); gg.addColorStop(0, '#d9dde0'); gg.addColorStop(0.5, '#fff'); gg.addColorStop(1, '#b9bec2'); g.fillStyle = gg; g.fillRect(0, y, w, th); };
    if (id !== 'rain') { refl(h * 0.36, h * 0.07); refl(h * 0.78, h * 0.05); }
    g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(0, 0, 10, h); g.fillRect(w - 10, 0, 10, h);
    if (J.txt) { g.fillStyle = id === 'white' ? '#00a650' : '#fff'; g.font = '900 34px system-ui,sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(J.txt, w * 0.5, h * 0.6); }
    for (let i = 0; i < 1500; i++) { g.fillStyle = `rgba(0,0,0,${Math.random() * 0.05})`; g.fillRect(Math.random() * w, Math.random() * h, 2, 2); }
  });
}
function buildDriver2(look) {
  look = Object.assign({ g: 'm', skin: 0, jacket: 'grab', helmet: 'grab', acc: 'none' }, look || {});
  const J = JACKETS[look.jacket] || JACKETS.grab, H = HELMET_LOOKS[look.helmet] || HELMET_LOOKS.grab, fem = look.g === 'f';
  const g = new THREE.Group();
  const skinM = std(SKINS[look.skin] || SKINS[0], { roughness: 0.7 });
  const jacket = std(0xffffff, { map: jacketTexFor(look.jacket in JACKETS ? look.jacket : 'grab'), roughness: look.jacket === 'rain' ? 0.25 : 0.75 });
  const sleeve = std(look.acc === 'sleeves' ? 0xf4f4f4 : J.sl, { roughness: 0.75 }), dark = std(J.dk, { roughness: 0.75 });
  const pants = std(fem ? 0x3b3f58 : 0x232a36, { roughness: 0.9 }), glove = std(0x151515, { roughness: 0.6 });
  const torso = limb([0, 0.92, -0.42], [0, 1.34, -0.33], fem ? 0.15 : 0.165, jacket); torso.scale.set(fem ? 1.08 : 1.18, 1, 0.82); g.add(torso);
  g.add(limb([0, 1.47, -0.31], [0, 1.55, -0.29], 0.055, skinM));
  g.add(helmet([0, 1.67, -0.27], H.c));
  if (fem) { const tail = limb([0, 1.6, -0.43], [0, 1.4, -0.5], 0.045, std(0x1a1310, { roughness: 0.8 })); g.add(tail); }
  if (look.acc === 'mask') { const m = new THREE.Mesh(new THREE.SphereGeometry(0.1, 14, 10, 0, Math.PI * 2, Math.PI * 0.45, Math.PI * 0.35), std(0x5aa9e6, { roughness: 0.9, side: THREE.DoubleSide })); m.position.set(0, 1.6, -0.2); m.scale.set(1, 0.9, 0.9); g.add(m); }
  if (look.acc === 'bag') { const b = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.4, 0.16), std(0x2b2f36, { roughness: 0.8 })); b.position.set(0, 1.15, -0.56); b.rotation.x = 0.2; g.add(b); }
  const hem = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.025, 8, 24), dark); hem.rotation.x = Math.PI / 2 - 0.2; hem.position.set(0, 0.86, -0.43); hem.scale.set(1.15, 0.85, 1); g.add(hem);
  for (const s of [-1, 1]) {
    const sh = [s * (fem ? 0.19 : 0.21), 1.32, -0.33], el = [s * 0.29, 1.13, -0.04], wr = [s * 0.31, 1.1, 0.2];
    g.add(joint(sh, 0.075, sleeve)); g.add(limb(sh, el, 0.056, sleeve)); g.add(joint(el, 0.053, sleeve)); g.add(limb(el, wr, 0.048, sleeve));
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 10), glove); hand.scale.set(1, 0.9, 1.25); hand.position.set(s * 0.32, 1.1, 0.26); g.add(hand);
    const hip = [s * 0.1, 0.87, -0.4], kn = [s * 0.17, 0.8, -0.02], an = [s * 0.14, 0.37, 0.06];
    g.add(joint(hip, 0.08, pants)); g.add(limb(hip, kn, fem ? 0.072 : 0.078, pants)); g.add(joint(kn, 0.07, pants)); g.add(limb(kn, an, 0.06, pants));
    const shoe = new THREE.Mesh(new THREE.CapsuleGeometry(0.05, 0.14, 4, 10), std(fem ? 0xf5f5f5 : 0x1d1d1f, { roughness: 0.6 })); shoe.rotation.x = Math.PI / 2; shoe.position.set(s * 0.14, 0.31, 0.11); g.add(shoe);
  }
  shadowAll(g);
  return g;
}
function rebuildDriver() {
  const ng = buildDriver2(profile.look);
  driver.clear(); for (const c of [...ng.children]) driver.add(c);
}
rebuildDriver();

/* ---- panel tab ---- */
{
  const b = document.createElement('button'); b.dataset.tab = 'char'; b.textContent = '👕 Nhân vật';
  $('mpTabs').insertBefore(b, $('mpClose'));
}
const _renderPanel = renderPanel;
renderPanel = function () {
  _renderPanel();
  if (panelTab !== 'char') return;
  const P = profile, E = P.english ? 1 : 0, lk = P.look, W = P.wardrobe;
  const row = (slot, DEF) => Object.entries(DEF).map(([id, d]) => {
    const own = W[slot].includes(id), wear = lk[slot] === id, lock = P.level < d.lv;
    const col = slot === 'jacket' ? d.c[0] : slot === 'helmet' ? '#' + d.c.toString(16).padStart(6, '0') : '#888';
    return `<button class="chip${wear ? ' sel' : ''}" data-act="wear" data-slot="${slot}" data-id="${id}" ${lock ? 'disabled' : ''} style="border-left:12px solid ${col}">${d.n[E]}${wear ? ' ✓' : own ? '' : lock ? ` 🔒Lv${d.lv}` : ` · ${fmtVND(d.cost)}`}</button>`;
  }).join(' ');
  $('mpBody').innerHTML = `<h3>👕 ${L('Nhân vật & trang phục', 'Character & outfits')}</h3>
    <p>${L('Giới tính', 'Gender')}: <button class="chip${lk.g === 'm' ? ' sel' : ''}" data-act="look" data-k="g" data-v="m">👨 ${L('Nam', 'Male')}</button> <button class="chip${lk.g === 'f' ? ' sel' : ''}" data-act="look" data-k="g" data-v="f">👩 ${L('Nữ', 'Female')}</button></p>
    <p>${L('Màu da', 'Skin')}: ${SKINS.map((c, i) => `<button class="chip${lk.skin === i ? ' sel' : ''}" data-act="look" data-k="skin" data-v="${i}" style="background:#${c.toString(16)};width:34px">&nbsp;</button>`).join(' ')}</p>
    <h4>🧥 ${L('Áo khoác', 'Jacket')}</h4><p>${row('jacket', JACKETS)}</p>
    <h4>⛑️ ${L('Mũ bảo hiểm', 'Helmet')}</h4><p>${row('helmet', HELMET_LOOKS)}</p>
    <h4>🎒 ${L('Phụ kiện', 'Accessory')}</h4><p>${row('acc', ACCS)}</p>
    <p><small>${L('Mua bằng tiền mặt/ví. Bạn bè online sẽ thấy trang phục của bạn.', 'Paid from cash/wallet. Online friends see your outfit.')} ${L('Mẹo: đổi trang phục khi đứng ở menu để xem xe xoay 360°.', '')}</small></p>`;
};
$('mpBody').addEventListener('click', (e) => {
  const b = e.target.closest('[data-act]'); if (!b || b.disabled) return;
  const P = profile, act = b.dataset.act;
  if (act === 'look') { P.look[b.dataset.k] = b.dataset.k === 'skin' ? +b.dataset.v : b.dataset.v; rebuildDriver(); }
  else if (act === 'wear') {
    const slot = b.dataset.slot, id = b.dataset.id, D = { jacket: JACKETS, helmet: HELMET_LOOKS, acc: ACCS }[slot][id];
    if (!P.wardrobe[slot].includes(id)) { if (!spend(D.cost, 'other')) return; P.wardrobe[slot].push(id); toast(`🛍️ ${L('Đã mua', 'Bought')} ${D.n[P.english ? 1 : 0]}`, 1.6); }
    P.look[slot] = id; rebuildDriver();
  } else return;
  saveProfile(); renderPanel();
});
// online: send & show looks (after net/online.js is loaded)
BOOT.push(() => {
  const _nm = netMsg; netMsg = () => Object.assign(_nm(), { lk: profile.look });
  FRAME.push(() => {
    for (const r of NET.remotes.values()) {
      const lk = r.data && r.data.lk; if (!lk) continue;
      const key = JSON.stringify(lk); if (r.lkKey === key) continue;
      r.lkKey = key; const old = r.lean.children[1]; if (old) r.lean.remove(old);
      r.lean.add(buildDriver2(lk));
    }
  });
});
{ const st = document.createElement('style'); st.textContent = '.chip.sel{background:#00b14f!important;color:#fff}.chip:disabled{opacity:.45;cursor:default}'; document.head.appendChild(st); }
