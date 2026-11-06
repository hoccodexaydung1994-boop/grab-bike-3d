'use strict';
/* ================= Điểm nóng (nhiều cuốc theo giờ) + quán cóc tài xế ================= */
// demand curves by hour (index 0..23) for each kind of area
const HOT_CURVE = {
  mall: [0, 0, 0, 0, 0, 0, 0.1, 0.2, 0.3, 0.4, 0.6, 0.9, 1, 0.8, 0.6, 0.6, 0.7, 0.9, 1, 1, 0.9, 0.7, 0.4, 0.1],
  food: [0, 0, 0, 0, 0, 0, 0.3, 0.5, 0.4, 0.3, 0.6, 1, 1, 0.7, 0.3, 0.3, 0.5, 0.8, 1, 0.9, 0.7, 0.5, 0.3, 0.1],
  homes: [0, 0, 0, 0, 0, 0.3, 0.9, 1, 0.7, 0.3, 0.2, 0.2, 0.3, 0.2, 0.2, 0.2, 0.3, 0.5, 0.8, 0.9, 0.8, 0.6, 0.4, 0.1],
  health: [0, 0, 0, 0, 0, 0, 0.5, 0.8, 0.9, 0.8, 0.7, 0.5, 0.4, 0.6, 0.7, 0.6, 0.5, 0.4, 0.3, 0.2, 0.2, 0.1, 0.1, 0],
};
const HOT_NAME = { mall: ['🛍️ Khu Crescent Mall', '🛍️ Crescent Mall area'], food: ['🍜 Phố ăn uống', '🍜 Food street'], homes: ['🏢 Khu chung cư', '🏢 Apartment blocks'], health: ['🏥 Bệnh viện', '🏥 Hospital'] };
const HOTZONES = [];
{
  const cell = 280, top = (pts, kind, n, r) => {
    const m = new Map();
    for (const p of pts) { const k = Math.floor(p.x / cell) + ',' + Math.floor(p.z / cell); const c = m.get(k) || { x: 0, z: 0, n: 0 }; c.x += p.x; c.z += p.z; c.n++; m.set(k, c); }
    let k = 0; for (const c of [...m.values()].sort((a, b) => b.n - a.n)) { const x = c.x / c.n, z = c.z / c.n; if (k >= n) break; if (HOTZONES.some(h => Math.hypot(h.x - x, h.z - z) < 320)) continue; HOTZONES.push({ kind, x, z, r, w: Math.min(1, 0.5 + c.n / 12) }); k++; }
  };
  HOTZONES.push({ kind: 'mall', x: MALL.x, z: MALL.z, r: 260, w: 1 });
  top(MERCHANTS, 'food', 3, 220);
  top(MAP.buildings.filter(b => b.h >= 25).map(b => ({ x: b.p[0], z: b.p[1] })), 'homes', 3, 240);
  HOSPITALS.slice(0, 2).forEach(h => HOTZONES.push({ kind: 'health', x: h.x, z: h.z, r: 160, w: 0.7 }));
  for (const z of HOTZONES) { const ne = nearestEdge(z.x, z.z, (E) => E.n >= 0, 250); z.name = HOT_NAME[z.kind][profile.english ? 1 : 0] + (z.kind === 'food' || z.kind === 'homes' ? (ne ? ' · ' + edgeName(ne.E) : '') : ''); }
}
function hotScore(z, min = profile.clock) { const h = Math.floor(min / 60) % 24, f = (min / 60) % 1, c = HOT_CURVE[z.kind]; return z.w * (c[h] * (1 - f) + c[(h + 1) % 24] * f); }
function hotHere() { let best = null; for (const z of HOTZONES) { const d = Math.hypot(z.x - player.x, z.z - player.z); if (d < z.r) { const s = hotScore(z) * (1 - d / z.r * 0.4); if (!best || s > best.s) best = { z, s }; } } return best; }
function hottest(min) { return [...HOTZONES].sort((a, b) => hotScore(b, min) - hotScore(a, min))[0]; }
// faster offers + small fare bonus inside an active hot zone
const hotEl = document.createElement('div'); hotEl.style.cssText = 'font-size:12px;color:#fdba74;font-weight:700'; $('jam').after(hotEl);
let hotT = 0, hotCur = null;
FRAME.push((dt) => {
  if (game.mode !== 'drive') return;
  hotT -= dt; if (hotT <= 0) { hotT = 1; hotCur = hotHere(); hotEl.textContent = hotCur && hotCur.s > 0.45 ? L(`🔥 Điểm nóng: ${hotCur.z.name} · cuốc ×${(1 + hotCur.s).toFixed(1)}`, `🔥 Hot zone: ${hotCur.z.name} · jobs ×${(1 + hotCur.s).toFixed(1)}`) : ''; }
  if (!game.paused && game.state === 'wait' && hotCur && hotCur.s > 0.45) game.waitT -= dt * hotCur.s;
});
{ const _mo = makeOffer; makeOffer = function () { const o = _mo(); if (o.type !== 'batch' && hotCur && hotCur.s > 0.6) { o.fare = Math.round(o.fare * 1.1 / 1000) * 1000; o.hot = true; } return o; }; }
// minimap overlay
{
  const _dm = drawMini;
  drawMini = function () {
    _dm(); if (phoneDead()) return;
    const W = mini.width, R = 260, S = W / (R * 2);
    mg.save();
    for (const z of HOTZONES) { const s = hotScore(z); if (s < 0.35) continue; const x = (z.x - player.x + R) * S, y = (z.z - player.z + R) * S, rr = z.r * S;
      if (x < -rr || y < -rr || x > W + rr || y > W + rr) continue;
      const gr = mg.createRadialGradient(x, y, 0, x, y, rr); gr.addColorStop(0, `rgba(255,90,0,${0.38 * s})`); gr.addColorStop(1, 'rgba(255,90,0,0)');
      mg.fillStyle = gr; mg.beginPath(); mg.arc(x, y, rr, 0, 7); mg.fill(); }
    for (const q of SIDEQ_MARKS) { let x = (q.x - player.x + R) * S, y = (q.z - player.z + R) * S; x = Math.max(8, Math.min(W - 8, x)); y = Math.max(8, Math.min(W - 8, y)); mg.fillStyle = q.c; mg.font = '700 22px system-ui'; mg.textAlign = 'center'; mg.textBaseline = 'middle'; mg.fillText(q.t, x, y); }
    mg.restore();
  };
}
const SIDEQ_MARKS = [];   // filled by game/sidequests.js

/* ---- quán cóc tài xế: NPC drivers to chat with ---- */
const CHAT = CFG.chatter, HANGOUTS = [];
{
  const spots = VENDORS.filter(v => v.kind === 'trada' || v.kind === 'vong');
  for (const z of HOTZONES.slice(0, 5)) {
    const v = spots.sort((a, b) => Math.hypot(a.x - z.x, a.z - z.z) - Math.hypot(b.x - z.x, b.z - z.z))[0];
    if (!v || HANGOUTS.includes(v) || Math.hypot(v.x - z.x, v.z - z.z) > 500) continue;
    HANGOUTS.push(v); v.hang = true;
    for (let i = 0; i < 3; i++) {
      const d = buildPassengerStanding(); d.userData.shirt.color.setHex(0x00b14f);
      const a = i * 2.1; d.position.set(v.x + Math.cos(a) * 1.8, 0.06, v.z + Math.sin(a) * 1.8); d.rotation.y = Math.atan2(v.x - d.position.x, v.z - d.position.z); scene.add(d);
    }
    const lb = labelSprite(L('☕ Quán cóc tài xế', '☕ Drivers\' corner'), L('E: tán gẫu, nghe mẹo', 'E: chat & tips')); lb.position.set(v.x, 4.4, v.z); lb.scale.set(11, 2.75, 1); scene.add(lb); labels.push(lb);
  }
}
function fillChat(t) {
  const hz = hottest(profile.clock + 60), cp = CHECKPOINTS.length ? pick(CHECKPOINTS) : null;
  return t.replace('{hot}', hz ? hz.name : 'Crescent Mall').replace('{cp}', cp ? (streetNameAt(cp.x, cp.z) || L('ngã tư lớn', 'a big junction')) : L('ngã tư lớn', 'a big junction'));
}
function hangoutChat(v) {
  const E = profile.english ? 1 : 0, lines = [pick(CHAT.greet)[E], fillChat(pick(CHAT.tips)[E]), pick(CHAT.gossip)[E]];
  if (!profile.today.hangout) { profile.today.hangout = 1; addXP(10); }
  passTime(10); profile.st.stress = clamp01(profile.st.stress - 8);
  const hz = hottest(profile.clock + 30);
  showDialog({ who: L('☕ Tài xế ở quán cóc', '☕ Fellow drivers'), text: lines.map(l => `💬 ${l}`).join('<br>') + `<br><br><small>📊 ${L('Nửa tiếng tới đông nhất', 'Busiest in 30 min')}: <b>${hz.name}</b></small>`,
    opts: [{ t: L('🧋 Gọi ly trà đá (3.000đ)', '🧋 Order iced tea (3,000đ)'), fx: () => { if (spend(3000, 'food')) { profile.st.thirst = clamp01(profile.st.thirst - 30); } } }, { t: L('👋 Chạy tiếp', '👋 Back to work') }] });
}
ACTION_HOOKS.push((opts) => { const v = HANGOUTS.find(v => Math.hypot(v.x - player.x, v.z - player.z) < 20); if (v) opts.unshift({ t: L('💬 Tán gẫu với tài xế (10 phút, giảm stress, nghe mẹo)', '💬 Chat with drivers (10 min, less stress, tips)'), fx: () => setTimeout(() => hangoutChat(v), 50) }); });
