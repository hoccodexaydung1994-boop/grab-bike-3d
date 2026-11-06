'use strict';
/* ================= Nhiệm vụ phụ (data/config/sidequests.json) ================= */
const SQ_DEF = CFG.sidequests.quests;
if (!profile.sq) profile.sq = { active: null, done: {}, total: 0 };
const SQ = { giver: null, respawnAt: 0, marker: null };
const sqMat = new THREE.MeshBasicMaterial({ color: 0xb15cff, transparent: true, opacity: 0.35, depthWrite: false });
SQ.marker = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 40, 16, 1, true), sqMat); SQ.marker.visible = false; scene.add(SQ.marker);
const sqTargetLb = labelSprite('📍'); sqTargetLb.scale.set(10, 2.5, 1); sqTargetLb.visible = false; scene.add(sqTargetLb);
const sqDef = (id) => SQ_DEF.find(q => q.id === id);
function sqPickTarget(kind, from) {
  const near = (list, minD = 0) => list.filter(p => Math.hypot(p.x - from.x, p.z - from.z) > minD).sort((a, b) => Math.hypot(a.x - from.x, a.z - from.z) - Math.hypot(b.x - from.x, b.z - from.z))[0];
  if (kind === 'shop') return near(SHOPS.concat(PHARMA), 60) || randomRoadPoint(from, 200, 600);
  if (kind === 'fuel') return near(FUEL, 60) || randomRoadPoint(from, 200, 600);
  if (kind === 'mall') return { x: MALL.x, z: MALL.z, r: 70 };
  if (kind === 'merchant') { const c = MERCHANTS.filter(m => { const d = Math.hypot(m.spot.x - from.x, m.spot.z - from.z); return d > 200 && d < 1000; }); const m = c.length ? pick(c) : MERCHANTS[0]; return { x: m.spot.x, z: m.spot.z, name: m.name }; }
  if (kind === 'tower') { const c = MAP.buildings.filter(b => b.h >= 25).map(b => { const ne = nearestEdge(b.p[0], b.p[1], null, 80); return ne ? { x: ne.x, z: ne.z } : null; }).filter(p => p && Math.hypot(p.x - from.x, p.z - from.z) > 300 && Math.hypot(p.x - from.x, p.z - from.z) < 1300); return c.length ? pick(c) : randomRoadPoint(from, 400, 900); }
  if (kind === 'park') {
    const c = MAP.green.filter(g => g.length >= 8).map(g => { let x = 0, z = 0; for (let i = 0; i < g.length; i += 2) { x += g[i]; z += g[i + 1]; } return { x: x / (g.length / 2), z: z / (g.length / 2) }; })
      .filter(p => { const d = Math.hypot(p.x - from.x, p.z - from.z); return d > 150 && d < 1400 && p.x > BX0 && p.x < BX1 && p.z > BZ0 && p.z < BZ1; });
    const p = c.length ? pick(c) : randomRoadPoint(from, 200, 700); const ne = nearestEdge(p.x, p.z, null, 150); return ne ? { x: ne.x, z: ne.z, r: 30 } : p;
  }
  return randomRoadPoint(from, 200, 700);
}
function sqSpawnGiver() {
  sqRemoveGiver();
  const open = SQ_DEF.filter(q => !profile.sq.active || profile.sq.active.id !== q.id);
  const q = pick(open), sp = randomRoadPoint(player, 150, 650);
  const m = buildPassengerStanding(); m.userData.shirt.color.setHex(pick([0xffb300, 0x8e24aa, 0x00897b, 0xd81b60])); m.position.set(sp.sx, 0.06, sp.sz); scene.add(m);
  const lb = labelSprite('❗ ' + q.giver[profile.english ? 1 : 0], L('Nhiệm vụ phụ · bấm E', 'Side quest · press E')); lb.position.set(sp.sx, 3.2, sp.sz); lb.scale.set(11, 2.75, 1); scene.add(lb);
  SQ.giver = { q, x: sp.sx, z: sp.sz, m, lb, until: profile.clock + 90 };
}
function sqRemoveGiver() { if (SQ.giver) { scene.remove(SQ.giver.m, SQ.giver.lb); SQ.giver = null; } }
function sqTalk() {
  const g = SQ.giver, q = g.q, E = profile.english || q.english ? 1 : 0;
  showDialog({ who: q.giver[E], text: q.intro[E] + `<br><small>${L('Thưởng', 'Reward')}: ${fmtVND(q.cash)} · ${q.xp} XP</small>`, opts: [
    { t: q.english ? 'Sure, I can help you!' : L('👍 Dạ được, để em giúp!', '👍 Sure, I\'ll help!'), good: true, fx: () => sqAccept(g) },
    { t: q.english ? 'Sorry, I am busy now.' : L('🙏 Xin lỗi, em đang bận', '🙏 Sorry, I\'m busy'), good: q.english ? true : undefined, fx: () => { sqRemoveGiver(); SQ.respawnAt = profile.clock + 25; } }] });
}
function sqAccept(g) {
  const st = { id: g.q.id, step: 0, gx: g.x, gz: g.z, falls: profile.today.falls || 0 };
  profile.sq.active = st; sqRemoveGiver(); sqSetStep(0); saveProfile();
  toast(`❗ ${L('Nhận nhiệm vụ phụ', 'Side quest accepted')}: ${sqDef(st.id).steps[0].say[profile.english ? 1 : 0]}`, 2.6);
}
function sqSetStep(i) {
  const A = profile.sq.active, q = sqDef(A.id), s = q.steps[i];
  A.step = i; A.t0 = profile.clock;
  const t = s.to === 'giver' ? { x: A.gx, z: A.gz } : sqPickTarget(s.to, { x: A.gx, z: A.gz });
  let tx = t.x, tz = t.z;
  if (s.to !== 'giver' && s.to !== 'mall') { const ne = nearestEdge(tx, tz, null, 90); if (ne) { tx = ne.x; tz = ne.z; } }   // điểm đến luôn nằm trên đường
  A.tx = tx; A.tz = tz; A.tr = t.r || 16;
  if (s.pax && !game.order) seatedPax.visible = true;
}
function sqFinish(ok, why) {
  const A = profile.sq.active, q = sqDef(A.id); profile.sq.active = null; SQ.marker.visible = sqTargetLb.visible = false;
  if (q.steps.some(s => s.pax) && !game.order) seatedPax.visible = false;
  SQ.respawnAt = profile.clock + 20;
  if (!ok) { profile.st.stress = clamp01(profile.st.stress + 8); return showDialog({ who: q.giver[profile.english ? 1 : 0], text: why || L('Trễ mất rồi… thôi không sao đâu.', 'Too late… never mind.'), opts: [{ t: L('😔 Xin lỗi ạ', '😔 Sorry') }] }); }
  let cash = q.cash; const fell = (profile.today.falls || 0) > A.falls && q.steps.some(s => s.fragile);
  if (fell) cash = Math.round(cash / 2000) * 1000;
  earn(cash, 'cash', true); addXP(q.xp); if (q.stress) profile.st.stress = clamp01(profile.st.stress + q.stress);
  profile.sq.done[q.id] = (profile.sq.done[q.id] || 0) + 1; profile.sq.total++;
  if (profile.sq.total >= 5) { ACH.nhiet_tinh = ACH.nhiet_tinh || ['🤝 Nhiệt tình', 'Hoàn thành 5 nhiệm vụ phụ']; unlock('nhiet_tinh'); }
  ding([659, 880, 1175]);
  showDialog({ who: q.giver[profile.english || q.english ? 1 : 0], text: q.done[profile.english || q.english ? 1 : 0] + (fell ? L('<br><small>(Hoa bị dập vì té xe, chỉ nhận nửa tiền thưởng)</small>', '<br><small>(Damaged in a fall — half reward)</small>') : '') + `<br><br>🎁 +${fmtVND(cash)} · +${q.xp} XP`, opts: [{ t: q.english ? "You're welcome!" : L('😊 Dạ không có gì ạ', '😊 You\'re welcome'), good: true }] });
  saveProfile();
}
const sqEl = document.createElement('div'); sqEl.style.cssText = 'font-size:12px;color:#d8b4fe;font-weight:700'; $('jam').after(sqEl);
let sqT = 0;
FRAME.push((dt) => {
  SIDEQ_MARKS.length = 0;
  if (game.mode !== 'drive') return;
  const A = profile.sq.active;
  if (SQ.giver) SIDEQ_MARKS.push({ x: SQ.giver.x, z: SQ.giver.z, t: '❗', c: '#f59e0b' });
  if (A) {
    SIDEQ_MARKS.push({ x: A.tx, z: A.tz, t: '📍', c: '#a855f7' });
    SQ.marker.visible = true; SQ.marker.position.set(A.tx, 20, A.tz);
    sqTargetLb.visible = true; sqTargetLb.position.set(A.tx, 6, A.tz);
  }
  sqT -= dt; if (sqT > 0 || game.paused || game.dayOver) return; sqT = 0.5;
  if (!SQ.giver && !A && profile.clock > SQ.respawnAt && profile.clock < dayEnd() - 40) sqSpawnGiver();
  if (SQ.giver && profile.clock > SQ.giver.until) { sqRemoveGiver(); SQ.respawnAt = profile.clock + 10; }
  if (!A) { sqEl.textContent = ''; return; }
  const q = sqDef(A.id), s = q.steps[A.step], d = Math.hypot(A.tx - player.x, A.tz - player.z);
  const left = s.limit ? Math.max(0, s.limit - (profile.clock - A.t0)) : null;
  sqEl.textContent = `❗ ${s.say[profile.english ? 1 : 0]} · ${d > 1000 ? (d / 1000).toFixed(1) + ' km' : Math.round(d) + ' m'}${left !== null ? ` · ⏱️ ${Math.ceil(left)}′` : ''}`;
  if (left === 0) return sqFinish(false);
  if (d < A.tr && Math.abs(player.v) < 3 && !game.dlgKeys) {
    if (s.cost && !spend(s.cost, 'other')) return;
    if (s.cost) toast(L(`🛒 Đã mua (${fmtVND(s.cost)})`, `🛒 Bought (${fmtVND(s.cost)})`), 1.5);
    if (A.step + 1 < q.steps.length) { sqSetStep(A.step + 1); toast(`❗ ${q.steps[A.step].say[profile.english ? 1 : 0]}`, 2.2); ding([660, 990]); }
    else sqFinish(true);
  }
});
ACTION_HOOKS.push((opts) => {
  if (SQ.giver && Math.hypot(SQ.giver.x - player.x, SQ.giver.z - player.z) < 16) opts.unshift({ t: `❗ ${L('Nói chuyện', 'Talk to')}: ${SQ.giver.q.giver[profile.english ? 1 : 0]}`, fx: () => setTimeout(sqTalk, 50) });
  if (profile.sq.active) opts.push({ t: L('✖️ Bỏ nhiệm vụ phụ', '✖️ Abandon side quest'), fx: () => sqFinish(false, L('Không sao, cảm ơn con đã cố gắng.', 'No worries, thanks for trying.')) });
});
{ const _sq = showQuests; showQuests = function () { _sq(); const A = profile.sq.active;
  $('dlgText').innerHTML += `<hr><b>❗ ${L('Nhiệm vụ phụ', 'Side quests')}</b>: ${A ? sqDef(A.id).steps[A.step].say[profile.english ? 1 : 0] : L('chưa nhận (tìm người có dấu ❗ trên bản đồ)', 'none (look for ❗ on the map)')} · ${L('đã giúp', 'helped')} ${profile.sq.total} ${L('lần', 'times')}`; }; }
BOOT.push(() => { if (profile.sq.active && !sqDef(profile.sq.active.id)) profile.sq.active = null; });
