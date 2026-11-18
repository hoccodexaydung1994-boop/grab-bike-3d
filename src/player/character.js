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
// Grip centers in rider-local coordinates. The SH seat raises its rider by 0.19 m.
const RIDER_GRIPS = {
  vespa: [0.326, 1.101, 0.243],
  sh: [0.389, 0.944, 0.25],
  scooter: [0.292, 1.04, 0.457],
  underbone: [0.285, 1.06, 0.458],
};
let mountedDriverType = 'vespa';
function buildDriver2(look, bikeType = 'vespa') {
  const grip = RIDER_GRIPS[bikeType] || RIDER_GRIPS.vespa;
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
    const sh = [s * (fem ? 0.19 : 0.21), 1.32, -0.33], el = [s * 0.29, 1.13, -0.04], wr = [s * grip[0], grip[1], grip[2]];
    g.add(joint(sh, 0.075, sleeve)); g.add(limb(sh, el, 0.056, sleeve)); g.add(joint(el, 0.053, sleeve)); g.add(limb(el, wr, 0.048, sleeve));
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 10), glove); hand.scale.set(1, 0.9, 1.25); hand.position.set(...wr); g.add(hand);
    const hip = [s * 0.1, 0.87, -0.4], kn = [s * 0.17, 0.8, -0.02], an = [s * 0.14, 0.37, 0.06];
    g.add(joint(hip, 0.08, pants)); g.add(limb(hip, kn, fem ? 0.072 : 0.078, pants)); g.add(joint(kn, 0.07, pants)); g.add(limb(kn, an, 0.06, pants));
    const shoe = new THREE.Mesh(new THREE.CapsuleGeometry(0.05, 0.14, 4, 10), std(fem ? 0xf5f5f5 : 0x1d1d1f, { roughness: 0.6 })); shoe.rotation.x = Math.PI / 2; shoe.position.set(s * 0.14, 0.31, 0.11); g.add(shoe);
  }
  if (GFX_HIGH) {   // chi tiết thêm: mặt, cổ áo, khoá kéo, túi, băng phản quang, cổ tay, đế giày, đai lưng
    const refl = new THREE.MeshStandardMaterial({ color: 0xf0f0f0, metalness: 0.5, roughness: 0.25, emissive: 0x444444 });
    const face = new THREE.Mesh(new THREE.SphereGeometry(0.105, 20, 16), skinM); face.scale.set(0.92, 1.05, 0.95); face.position.set(0, 1.6, -0.255); g.add(face);
    const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.1, 0.085, 20, 1, true), std(J.dk, { side: THREE.DoubleSide, roughness: 0.8 })); collar.position.set(0, 1.48, -0.31); collar.rotation.x = 0.15; g.add(collar);
    const zip = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.42, 0.012), refl); zip.position.set(0, 1.14, -0.235); zip.rotation.x = 0.21; g.add(zip);
    for (const s of [-1, 1]) {
      const pk = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.075, 0.012), dark); pk.position.set(s * 0.1, 1.22, -0.222); pk.rotation.x = 0.21; g.add(pk);
      const wrist = [s * grip[0], grip[1], grip[2]];
      const elbow = [s * 0.29, 1.13, -0.04];
      const forearmAt = t => elbow.map((x, i) => x + (wrist[i] - x) * t);
      const band = new THREE.Mesh(new THREE.TorusGeometry(0.052, 0.012, 8, 20), refl); band.position.set(...forearmAt(0.62)); band.lookAt(...wrist); g.add(band);
      const band2 = new THREE.Mesh(new THREE.TorusGeometry(0.062, 0.012, 8, 20), refl); band2.position.set(s * 0.25, 1.225, -0.185); band2.lookAt(s * 0.29, 1.13, -0.04); g.add(band2);
      const cuff = new THREE.Mesh(new THREE.TorusGeometry(0.047, 0.014, 8, 20), dark); cuff.position.set(...forearmAt(0.86)); cuff.lookAt(...wrist); g.add(cuff);
      const sole = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.025, 0.24), std(0xf2f2f2)); sole.position.set(s * 0.14, 0.27, 0.11); g.add(sole);
      const knee = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 10), std(0x15181d, { roughness: 0.5 })); knee.scale.set(1, 1, 0.5); knee.position.set(s * 0.17, 0.81, 0.045); g.add(knee);
    }
    const belt = new THREE.Mesh(new THREE.TorusGeometry(0.175, 0.018, 8, 28), std(0x111111, { roughness: 0.5 })); belt.rotation.x = Math.PI / 2 - 0.2; belt.position.set(0, 0.9, -0.425); belt.scale.set(1.14, 0.84, 1); g.add(belt);
  }
  shadowAll(g);
  return g;
}
let walker = null;
function buildWalker(look) {
  const J = JACKETS[look.jacket] || JACKETS.grab;
  const H = HELMET_LOOKS[look.helmet] || HELMET_LOOKS.grab;
  const skin = std(SKINS[look.skin] || SKINS[0], { roughness: 0.77 });
  const jacket = std(0xffffff, { map: jacketTexFor(Object.hasOwn(JACKETS, look.jacket) ? look.jacket : 'grab'), roughness: 0.84 });
  const sleeve = std(look.acc === 'sleeves' ? 0xf4f4f4 : J.sl, { roughness: 0.83 });
  const dark = std(J.dk, { roughness: 0.78 });
  const pants = std(look.g === 'f' ? 0x3b3f58 : 0x232a36, { roughness: 0.9 });
  const shoes = std(look.g === 'f' ? 0xd8dce0 : 0x2b2c2e, { roughness: 0.84 });
  const soles = std(0x92979b, { roughness: 0.9 });
  const trim = std(0xd0d8db, { roughness: 0.46 });
  const shell = new THREE.MeshPhysicalMaterial({ color: H.c, roughness: 0.3, clearcoat: 0.8, clearcoatRoughness: 0.2 });
  const strap = std(0x25282b, { roughness: 0.8 });
  const g = new THREE.Group(), pelvis = new THREE.Group(), upper = new THREE.Group(), head = new THREE.Group();
  g.add(pelvis);
  pelvis.add(upper);
  upper.add(head);
  function part(parent, geometry, material, x, y, z) {
    const m = new THREE.Mesh(geometry, material);
    m.position.set(x, y, z);
    parent.add(m);
    return m;
  }
  function box(parent, w, h, d, material, x, y, z) {
    return part(parent, new THREE.BoxGeometry(w, h, d), material, x, y, z);
  }
  const body = part(upper, new THREE.CylinderGeometry(0.191, 0.15, 0.43, 20), jacket, 0, 0.225, 0.025);
  body.scale.set(1.12, 1, 0.76);
  const hip = part(pelvis, new THREE.SphereGeometry(0.18, 18, 12), pants, 0, -0.02, 0);
  hip.scale.set(1.08, 0.61, 0.85);
  box(upper, 0.009, 0.32, 0.009, dark, 0, 0.2, 0.169);
  part(upper, new THREE.CylinderGeometry(0.07, 0.093, 0.06, 14), dark, 0, 0.445, 0.031);
  head.position.set(0, 0.6, 0.043);
  const face = part(head, new THREE.SphereGeometry(0.117, 18, 14), skin, 0, -0.02, 0.025);
  face.scale.set(0.83, 1.12, 0.91);
  const helmetShell = part(head, new THREE.SphereGeometry(0.144, 24, 14, 0, Math.PI * 2, 0, Math.PI * 0.56), shell, 0, 0.033, 0);
  helmetShell.scale.set(0.98, 1.01, 1.14);
  const visor = box(head, 0.21, 0.019, 0.083, shell, 0, 0.028, 0.144);
  visor.rotation.x = -0.17;
  const band = box(head, 0.087, 0.022, 0.009, trim, 0, 0.043, -0.163);
  band.rotation.x = -0.13;
  if (look.acc === 'mask') {
    const mask = part(head, new THREE.SphereGeometry(0.1, 16, 10), std(0x82b8d1), 0, -0.071, 0.076);
    mask.scale.set(0.89, 0.49, 0.6);
  }
  if (look.acc === 'bag') box(upper, 0.29, 0.31, 0.14, strap, 0, 0.24, -0.15);
  if (look.g === 'f') head.add(limb([0, -0.04, -0.108], [0, -0.23, -0.17], 0.044, strap));

  const limbs = [-1, 1].map(side => {
    part(head, new THREE.SphereGeometry(0.025, 10, 8), skin, side * 0.09, -0.041, 0.016).scale.set(0.52, 1, 0.66);
    const buckle = box(head, 0.015, 0.093, 0.018, strap, side * 0.108, -0.05, 0.013);
    buckle.rotation.x = -0.32;
    const arm = new THREE.Group(), elbow = new THREE.Group();
    arm.position.set(side * 0.213, 0.356, 0.018);
    elbow.position.set(0, -0.267, 0);
    upper.add(arm);
    arm.add(elbow, limb([0, -0.03, 0], [0, -0.24, 0], 0.063, sleeve));
    elbow.add(limb([0, -0.005, 0], [0, -0.225, 0], 0.048, sleeve));
    part(elbow, new THREE.CylinderGeometry(0.049, 0.045, 0.025, 12), trim, 0, -0.172, 0);
    part(elbow, new THREE.CylinderGeometry(0.045, 0.042, 0.027, 12), dark, 0, -0.22, 0);
    part(elbow, new THREE.SphereGeometry(0.051, 14, 10), skin, 0, -0.274, 0.01).scale.set(0.72, 1.11, 0.74);
    const leg = new THREE.Group(), knee = new THREE.Group(), foot = new THREE.Group();
    leg.position.set(side * 0.098, -0.04, 0);
    knee.position.set(0, -0.397, 0);
    foot.position.set(0, -0.387, 0);
    pelvis.add(leg);
    leg.add(knee, limb([0, -0.039, 0], [0, -0.348, 0], 0.073, pants));
    knee.add(foot, limb([0, -0.024, 0], [0, -0.337, 0], 0.055, pants));
    const shoe = part(foot, new THREE.CapsuleGeometry(0.051, 0.146, 5, 14), shoes, 0, -0.015, 0.052);
    shoe.rotation.x = Math.PI / 2;
    box(foot, 0.089, 0.023, 0.201, soles, 0, -0.052, 0.052);
    for (let i = 0; i < 3; i++) box(foot, 0.054, 0.008, 0.01, trim, 0, 0.027, 0.061 + i * 0.022);
    return { arm, elbow, leg, knee, foot, side };
  });
  shadowAll(g);
  g.visible = false;
  scene.add(g);
  return { g, upper, pelvis, limbs };
}
function updateWalker(dt) {
  const state = player.foot;
  if (!state) { if (walker) walker.g.visible = false; return; }
  if (!walker) walker = buildWalker(profile.look);
  const { g, upper, pelvis, limbs } = walker;
  const action = state.action;
  const ease = action ? action.t * action.t * (3 - 2 * action.t) : 0;
  const seat = action ? (action.mount ? ease : 1 - ease) : 0;
  const swing = action ? Math.sin(ease * Math.PI) : 0;
  const move = Math.min(1, state.speed / 1.4);
  state.gait = (state.gait || 0) + (move - (state.gait || 0)) * (1 - Math.exp(-dt * 12));
  const gait = state.gait, run = state.run;
  const heading = player.h;
  const leanBack = 0.37 * seat;
  g.visible = true;
  g.position.set(player.x - Math.sin(heading) * leanBack, player.y + RIDER.y * seat, player.z - Math.cos(heading) * leanBack);
  g.rotation.y = heading;
  pelvis.position.y = 0.882 + 0.014 * Math.cos(state.phase * 2) * gait + 0.05 * seat + 0.12 * swing;
  pelvis.rotation.z = Math.sin(state.phase) * gait * 0.035;
  upper.rotation.x = 0.08 * gait + 0.12 * run + 0.17 * seat;
  upper.rotation.y = -Math.sin(state.phase) * gait * 0.065;
  for (const { arm, elbow, leg, knee, foot, side } of limbs) {
    const stride = Math.sin(state.phase) * side;
    const bend = Math.max(0, Math.cos(state.phase) * side);
    const insideLeg = side !== player.parked.side;
    arm.rotation.x = stride * gait * (0.32 + 0.16 * run) - 0.75 * seat;
    arm.rotation.z = side * (0.11 + 0.22 * seat);
    elbow.rotation.x = -0.08 - 0.35 * bend * gait - 0.47 * run - 0.5 * seat;
    leg.rotation.x = -stride * gait * (0.46 + 0.22 * run) - 1.07 * seat - (insideLeg ? 0.74 : 0.16) * swing;
    leg.rotation.z = side * (0.045 + 0.13 * seat + (insideLeg ? 0.22 : 0.08) * swing);
    knee.rotation.x = bend * gait * (0.51 + 0.55 * run) + 1.05 * seat + (insideLeg ? 0.6 : 0.2) * swing;
    foot.rotation.x = -0.37 * (knee.rotation.x + leg.rotation.x);
  }
}
function disposeDriver(root) {
  root.traverse(m => {
    if (!m.isMesh) return;
    m.geometry.dispose();
    m.material.dispose();
  });
}
function replaceMountedDriver() {
  const ng = buildDriver2(profile.look, mountedDriverType);
  disposeDriver(driver);
  driver.clear();
  for (const c of [...ng.children]) driver.add(c);
}
function fitMountedDriver(bikeType) {
  if (bikeType === mountedDriverType) return;
  mountedDriverType = bikeType;
  replaceMountedDriver();
}
function rebuildDriver() {
  replaceMountedDriver();
  if (walker) { disposeDriver(walker.g); scene.remove(walker.g); walker = null; }
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
  const _nm = netMsg;
  netMsg = () => {
    const message = Object.assign(_nm(), { lk: profile.look });
    const parked = player.parked;
    if (parked) Object.assign(message, { x: +parked.x.toFixed(2), z: +parked.z.toFixed(2), h: +parked.h.toFixed(3) });
    return message;
  };
  FRAME.push(() => {
    for (const r of NET.remotes.values()) {
      const lk = r.data && r.data.lk; if (!lk) continue;
      const key = JSON.stringify(lk); if (r.lkKey === key) continue;
      r.lkKey = key; const old = r.lean.children[1]; if (old) { r.lean.remove(old); disposeDriver(old); }
      r.lean.add(buildDriver2(lk));
    }
  });
});
{ const st = document.createElement('style'); st.textContent = '.chip.sel{background:#00b14f!important;color:#fff}.chip:disabled{opacity:.45;cursor:default}'; document.head.appendChild(st); }
