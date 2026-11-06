'use strict';
/* ================= Chạy lên cầu (Cầu Phú Mỹ, cầu vượt) + người đi bộ ================= */
const DECKS = MAP.deck.map(d => { const cum = [0]; for (let i = 2; i < d.p.length; i += 2) cum.push(cum[cum.length - 1] + Math.hypot(d.p[i] - d.p[i - 2], d.p[i + 1] - d.p[i - 1])); return { ...d, cum, n: d.p.length / 2 }; });
const deckGrid = new Grid(30);
DECKS.forEach((d, di) => { for (let k = 0; k < d.n - 1; k++) { const ax = d.p[k * 2], az = d.p[k * 2 + 1], bx = d.p[k * 2 + 2], bz = d.p[k * 2 + 3]; deckGrid.addBox(Math.min(ax, bx) - d.w, Math.min(az, bz) - d.w, Math.max(ax, bx) + d.w, Math.max(az, bz) + d.w, { di, k }); } });
player.deck = null;
function deckProj(d, k, x, z) {
  const ax = d.p[k * 2], az = d.p[k * 2 + 1], bx = d.p[k * 2 + 2], bz = d.p[k * 2 + 3];
  const dx = bx - ax, dz = bz - az, L2 = dx * dx + dz * dz || 1e-6, L = Math.sqrt(L2);
  const tr = ((x - ax) * dx + (z - az) * dz) / L2, t = Math.max(0, Math.min(1, tr));
  const lat = ((x - ax) * dz - (z - az) * dx) / L;   // signed distance from the centre line
  return { k, t, tr, lat, y: d.h[k] + (d.h[k + 1] - d.h[k]) * t, dx: dx / L, dz: dz / L, cx: ax + dx * t, cz: az + dz * t };
}
const _dq = [];
function deckStep(px0, pz0, dt) {
  const hx = Math.sin(player.h), hz = Math.cos(player.h);
  if (!player.deck) {
    if (fall.on) return false;
    for (const it of deckGrid.query(player.x, player.z, 6, _dq)) {
      const d = DECKS[it.di]; if (it.k > 1 && it.k < d.n - 3) continue;
      const q = deckProj(d, it.k, player.x, player.z);
      if (q.tr < -0.05 || q.tr > 1.05 || Math.abs(q.lat) > d.w / 2 - 0.3 || q.y > 0.9) continue;
      if (Math.abs(hx * q.dx + hz * q.dz) < 0.55) continue;
      player.deck = { di: it.di, k: it.k }; toast(L('🌉 Lên cầu — giữ làn, đừng dừng đỗ!', '🌉 On the bridge — keep your lane!'), 1.6);
      break;
    }
    if (!player.deck) return false;
  }
  const D = DECKS[player.deck.di]; let best = null;
  for (let k = Math.max(0, player.deck.k - 3); k <= Math.min(D.n - 2, player.deck.k + 3); k++) {
    const q = deckProj(D, k, player.x, player.z), dd = Math.hypot(player.x - q.cx, player.z - q.cz);
    if (!best || dd < best.dd) { best = q; best.dd = dd; }
  }
  player.deck.k = best.k;
  const atStart = best.k === 0 && best.tr < 0, atEnd = best.k === D.n - 2 && best.tr > 1;
  if ((atStart || atEnd) && best.y < 1.3) { player.deck = null; player.y = 0.07; return false; }
  const lim = D.w / 2 - 0.45;
  if (Math.abs(best.lat) > lim) {
    const s = Math.sign(best.lat); player.x = best.cx + best.dz * lim * s; player.z = best.cz - best.dx * lim * s;
    if (Math.abs(player.v) > 6 && game.bumpCD <= 0) { game.bumpCD = 1.2; onCrash(Math.abs(player.v) * 0.6); toast(L('💥 Quẹt lan can cầu!', '💥 Scraped the bridge rail!'), 1.2); tone(90, 0, 0.2, 'square', 0.1); }
    player.v *= 1 - Math.min(1, dt * 2);
  }
  const ty = best.y + 0.15;
  player.y += (ty - player.y) * Math.min(1, dt * 12);
  // gravity on the slope: harder going up
  const slope = (D.h[best.k + 1] - D.h[best.k]) / Math.max(1, D.cum[best.k + 1] - D.cum[best.k]);
  const dir = hx * best.dx + hz * best.dz;
  player.v -= slope * Math.sign(dir) * 9.8 * 0.35 * dt;
  if (player.y > 18 && !profile.today.bridge) { profile.today.bridge = true; profile.totals.bridges = (profile.totals.bridges || 0) + 1; toast(L('🌉 View sông Sài Gòn từ trên cầu thật đẹp!', '🌉 Great view of the Saigon River!'), 2.4); }
  return true;
}
{ const _tp = teleportTo; teleportTo = (x, z) => { player.deck = null; player.y = 0.07; _tp(x, z); }; }

/* ---- pedestrians ---- */
const PED_N = isTouch ? 14 : 30, PEDS = [];
const inB = (E) => E.mx > BX0 + 30 && E.mx < BX1 - 30 && E.mz > BZ0 + 30 && E.mz < BZ1 - 30;
const pedEdges = EDGES.filter(E => E.c >= 2 && E.c <= 5 && E.L > 30 && inB(E));
const pedMats = { skin: std(0xd9a77c), dark: std(0x2b2f36, { roughness: 0.9 }), hat: std(0xe8d9a8, { roughness: 0.9 }), shirts: [0xe74c3c, 0x3498db, 0xf1c40f, 0xffffff, 0x9b59b6, 0x16a085].map(c => std(c, { roughness: 0.85 })) };
function makePed(i) {
  const g = new THREE.Group(), sh = pedMats.shirts[i % pedMats.shirts.length];
  for (const s of [-1, 1]) g.add(limb([s * 0.09, 0.05, 0], [s * 0.09, 0.8, 0], 0.07, pedMats.dark));
  const body = limb([0, 0.9, 0], [0, 1.35, 0], 0.17, sh); g.add(body);
  for (const s of [-1, 1]) g.add(limb([s * 0.23, 1.35, 0], [s * 0.26, 0.92, 0.02], 0.05, sh));
  g.add(joint([0, 1.6, 0], 0.12, pedMats.skin));
  if (i % 3 === 0) { const hat = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.2, 14), pedMats.hat); hat.position.y = 1.78; g.add(hat); }
  const out = bake(g); out.children.forEach(m => { m.castShadow = false; }); return out;
}
function placePed(p, near) {
  let E;
  if (near) { const cands = edgeGrid.query(player.x + (Math.random() - 0.5) * 300, player.z + (Math.random() - 0.5) * 300, 60, []).map(it => it.E).filter(E => E.c >= 2 && E.c <= 5 && inB(E)); E = cands.length ? pick(cands) : pick(pedEdges); }
  else E = pick(pedEdges);
  p.E = E; p.s = Math.random() * E.L; p.side = Math.random() < 0.5 ? 1 : -1; p.dir = Math.random() < 0.5 ? 1 : -1; p.sp = 1.1 + Math.random() * 0.5; p.down = 0; p.t = Math.random() * 6;
}
for (let i = 0; i < PED_N; i++) { const m = makePed(i); scene.add(m); const p = { m }; placePed(p, false); PEDS.push(p); }
let pedHitCD = 0;
function hitPed(p, sp) {
  p.down = 4; pedHitCD = 4;
  const comp = 200000, s = profile.st;
  spend(comp, 'other', true); s.stress = clamp01(s.stress + 20); s.hp = clamp01(s.hp - 4);
  if (game.order) { if (game.order.subs) game.order.subs.forEach(b => b.sat -= 20); else game.order.sat -= 20; }
  profile.license = Math.max(0, profile.license - 2); profile.today.viol++;
  player.v *= 0.2; tone(80, 0, 0.3, 'sawtooth', 0.15);
  setTimeout(() => showDialog({ who: L('🚶 Va chạm người đi bộ!', '🚶 You hit a pedestrian!'), text: L(`Bạn tông trúng người đi bộ ở tốc độ ${Math.round(sp * 3.6)} km/h. Người dân xung quanh tụ lại…<br>Bồi thường <b>${fmtVND(comp)}</b>, trừ 2 điểm GPLX.`, `You hit a pedestrian at ${Math.round(sp * 3.6)} km/h.<br>Compensation <b>${fmtVND(comp)}</b>, −2 licence points.`), opts: [
    { t: L('🙇 Xin lỗi, đưa người ta đi kiểm tra (15 phút)', '🙇 Apologise and help them get checked (15 min)'), good: true, fx: () => { passTime(15); s.stress = clamp01(s.stress - 5); addXP(5); } },
    { t: L('💸 Gửi tiền rồi đi nhanh', '💸 Pay and leave quickly'), good: false, fx: () => { s.stress = clamp01(s.stress + 5); } }] }), 300);
}
FRAME.push((dt) => {
  pedHitCD -= dt;
  const live = game.mode === 'drive' && !game.paused;
  for (const p of PEDS) {
    const E = p.E;
    if (live && !p.down && !p.cross) { p.s += p.dir * p.sp * dt; if (p.s < 0 || p.s > E.L) { p.s = Math.max(0, Math.min(E.L, p.s)); if (Math.random() < 0.4 && E.w < 16) p.cross = { k: 0 }; else p.dir = -p.dir; } }
    p.t += dt;
    const q = edgeAt(E, p.s, true); let off = (E.w / 2 + 1.6) * p.side;
    if (p.cross) {   // băng qua đường ở đầu ngã tư
      if (live && !p.down) p.cross.k += p.sp * dt / (E.w + 3.2);
      const k = Math.min(1, p.cross.k); off *= 1 - 2 * k;
      if (k >= 1) { p.side = -p.side; p.cross = null; p.dir = -p.dir; }
    }
    const x = q.x - q.dz * off, z = q.z + q.dx * off;
    if (Math.abs(x - player.x) > 280 || Math.abs(z - player.z) > 280) { if (Math.random() < 0.05) placePed(p, true); p.m.visible = false; continue; }
    p.m.visible = true;
    p.m.position.set(x, 0.06 + (p.down ? 0 : Math.abs(Math.sin(p.t * 6)) * 0.04), z);
    p.m.rotation.set(p.down ? -1.45 : 0, p.cross ? Math.atan2(q.dz * p.side, -q.dx * p.side) : Math.atan2(q.dx * p.dir, q.dz * p.dir), 0);
    if (p.down) { p.down = Math.max(0, p.down - dt); if (p.down > 0) p.m.position.y = 0.2; continue; }
    if (!live || player.deck) continue;
    const d = Math.hypot(x - player.x, z - player.z), sp = Math.abs(player.v);
    if (d < 0.85 && pedHitCD <= 0) {
      if (sp > 7) hitPed(p, sp);
      else if (sp > 2.5) { pedHitCD = 3; profile.st.stress = clamp01(profile.st.stress + 3); toast(L('😱 Suýt tông người đi bộ! Chạy chậm trên vỉa hè/hẻm', '😱 Nearly hit a pedestrian!'), 1.6); p.s += p.dir * 2; }
      else { p.s += p.dir * 1.2; }
    }
  }
});
