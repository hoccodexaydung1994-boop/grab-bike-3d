'use strict';
/* ================= Batched GrabFood orders (2 quán – 2 khách) ================= */
const stopSprites = [];
for (let i = 0; i < 4; i++) {
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: canvasTex(64, 64, (g, w, h) => { g.fillStyle = '#ff8a1f'; g.beginPath(); g.arc(32, 32, 28, 0, 7); g.fill(); g.fillStyle = '#fff'; g.font = '900 34px system-ui'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(String(i + 1), 32, 34); }), depthTest: false }));
  sp.scale.set(3, 3, 1); sp.visible = false; scene.add(sp); stopSprites.push(sp);
}
function makeBatchOffer() {
  const near = MERCHANTS.filter(m => { const d = Math.hypot(m.spot.x - player.x, m.spot.z - player.z); return d > 60 && d < 1300; });
  if (near.length < 2) return null;
  const A = near[Math.floor(Math.random() * near.length)];
  const nearA = near.filter(m => m !== A && Math.hypot(m.spot.x - A.spot.x, m.spot.z - A.spot.z) < 700);
  const B = nearA.length ? nearA[Math.floor(Math.random() * nearA.length)] : A;
  const subs = [A, B].map((shop, i) => {
    const drop = randomRoadPoint(shop.spot, 300, 1400);
    const r = computeRoute(shop.spot, drop.E, drop.along);
    const km = Math.round((r ? r.len : 900) / 100) / 10;
    const menu = MENU[shop.kind] || MENU.restaurant;
    return { idx: i, shop, drop, km, items: [pick(menu)], fare: fareFor('food', km), code: orderCode(), sat: 80 + (profile.cleanBag ? 5 : 0), heat: 100, integ: 100, picked: false, done: false, wrongItem: false };
  });
  return { type: 'batch', subs, shop: A, pickup: A.spot, drop: subs[0].drop, items: subs.map(s => s.items[0]), km: Math.round((subs[0].km + subs[1].km) * 10) / 10,
    fare: subs[0].fare + subs[1].fare, bonus: 10000, est: 0, expire: 18 };
}
// all valid stop orders (each pickup before its drop) with their route length from the player
function batchSequences(o) {
  const stops = [{ k: 'pick', s: 0 }, { k: 'pick', s: 1 }, { k: 'drop', s: 0 }, { k: 'drop', s: 1 }];
  const perms = [];
  const rec = (cur, left) => {
    if (!left.length) { perms.push(cur); return; }
    left.forEach((st, i) => { if (st.k === 'drop' && !cur.some(c => c.k === 'pick' && c.s === st.s)) return; rec([...cur, st], left.filter((_, j) => j !== i)); });
  };
  rec([], stops);
  const spot = (st) => st.k === 'pick' ? o.subs[st.s].shop.spot : o.subs[st.s].drop;
  return perms.map(seq => {
    let from = { x: player.x, z: player.z }, len = 0;
    for (const st of seq) { const t = spot(st); const r = computeRoute(from, t.E, t.along); len += r ? r.len : Math.hypot(t.x - from.x, t.z - from.z) * 1.4; from = t; }
    return { seq, len };
  }).sort((a, b) => a.len - b.len);
}
function batchLabel(o, seq) {
  return seq.map(st => st.k === 'pick' ? `🍜${st.s + 1} ${o.subs[st.s].shop.name.slice(0, 16)}` : `🏁${st.s + 1}`).join(' → ');
}
function setupBatch(o) {
  const seqs = batchSequences(o), best = seqs[0];
  const choices = [best, ...seqs.slice(1).sort(() => Math.random() - 0.5).slice(0, 2)].sort(() => Math.random() - 0.5);
  showDialog({ who: L('🍱 Đơn ghép — chọn thứ tự lấy & giao', '🍱 Batched order — choose your route'),
    text: L(`Túi 1: <b>${o.subs[0].items[0]}</b> (${o.subs[0].shop.name}) → ${o.subs[0].drop.name}<br>Túi 2: <b>${o.subs[1].items[0]}</b> (${o.subs[1].shop.name}) → ${o.subs[1].drop.name}<br><small>Chọn tuyến ngắn nhất được thưởng "Tuyến tối ưu" +5.000đ</small>`,
      `Bag 1: <b>${o.subs[0].items[0]}</b> (${o.subs[0].shop.name}) → ${o.subs[0].drop.name}<br>Bag 2: <b>${o.subs[1].items[0]}</b> (${o.subs[1].shop.name}) → ${o.subs[1].drop.name}<br><small>The shortest route earns an "Optimal route" bonus</small>`),
    opts: choices.map(c => ({ t: `${batchLabel(o, c.seq)} <b>(${(c.len / 1000).toFixed(1)} km)</b>`, fx: () => startBatch(o, c, best) })) });
}
function startBatch(o, choice, best) {
  o.stops = choice.seq; o.si = 0; o.optimal = choice.len <= best.len * 1.02; o.t0 = sigClock;
  // per-bag deadline: distance along the chosen route to its drop
  let acc = 0, from = { x: player.x, z: player.z };
  for (const st of o.stops) {
    const t = st.k === 'pick' ? o.subs[st.s].shop.spot : o.subs[st.s].drop;
    const r = computeRoute(from, t.E, t.along); acc += r ? r.len : 600; from = t;
    if (st.k === 'drop') o.subs[st.s].est = acc / 8 + 50;
  }
  goStop(o);
}
function stopSpot(o, st) { return st.k === 'pick' ? o.subs[st.s].shop.spot : o.subs[st.s].drop; }
function goStop(o) {
  const st = o.stops[o.si]; const t = stopSpot(o, st);
  game.state = st.k === 'pick' ? 'pickup' : 'ride';
  pickupMarker.visible = st.k === 'pick'; dropMarker.visible = st.k === 'drop';
  (st.k === 'pick' ? pickupMarker : dropMarker).position.set(t.x, 0, t.z);
  standPax.position.set(t.sx, 0.06, t.sz); standPax.visible = true;
  standPax.userData.shirt.color.setHex(st.k === 'pick' ? 0xb22222 : pick(shirtColors));
  shopLabel.visible = st.k === 'pick';
  if (st.k === 'pick') { shopLabel.material.map = labelSprite(o.subs[st.s].shop.name, L(`🍜 Lấy túi ${st.s + 1}`, `🍜 Pick up bag ${st.s + 1}`)).material.map; shopLabel.position.set(t.sx, 6.5, t.sz); }
  stopSprites.forEach((sp, i) => {
    const s2 = o.stops[o.si + 1 + i];
    if (s2 && i < 3) { const p = stopSpot(o, s2); sp.position.set(p.x, 5, p.z); sp.visible = true; } else sp.visible = false;
  });
  o.handling = false; refreshRoute();
}
function batchTarget(o) { return stopSpot(o, o.stops[o.si]); }
function batchArrive() {
  const o = game.order, st = o.stops[o.si], sub = o.subs[st.s];
  player.v = 0;
  if (st.k === 'pick') {
    staffDialog(sub, () => { sub.picked = true; sub.tPick = sigClock; foodBox.visible = true; toast(L(`✅ Đã lấy túi ${st.s + 1}: ${sub.items[0]}`, `✅ Bag ${st.s + 1} picked up`), 1.6); nextStop(o); });
  } else {
    handoverDialog(sub, () => { completeSub(o, sub); nextStop(o); });
  }
}
function nextStop(o) {
  o.si++;
  if (o.si >= o.stops.length) return finishBatch(o);
  goStop(o);
}
function completeSub(o, sub) {
  const tt = sigClock - o.t0;
  let stars = 5;
  if (tt > sub.est) stars--; if (tt > sub.est * 1.6) stars--;
  if (sub.sat < 65) stars--; if (sub.sat < 45) stars--;
  if (sub.heat < 50) stars--; if (sub.integ < 60) stars--; if (sub.wrongItem) stars -= 2;
  stars = Math.max(1, Math.min(5, stars));
  sub.stars = stars; sub.done = true; sub.onTime = tt <= sub.est;
  noteJob(sub.drop.name, sub.onTime, sub.km);
  earn(sub.fare, 'wallet');
  const tip = stars === 5 && Math.random() < 0.35 + tipBonus() ? pick([5000, 10000]) : 0;
  if (tip) earn(tip, 'cash', true);
  profile.ratings.push(stars); if (profile.ratings.length > 50) profile.ratings.shift();
  profile.today.ratings.push(stars); profile.today.food++; profile.totals.food++; profile.trips++; profile.totalTrips++; profile.week.orders++;
  profile.today.streak = stars >= 4 ? profile.today.streak + 1 : 0;
  if (stars === 5) profile.totals.fiveStar++;
  if (sub.heat >= 70 && sub.integ >= 90 && sub.onTime) profile.totals.perfectFood++;
  const xp = Math.round((40 + 8 * sub.km + (stars === 5 ? 15 : 0) + (o.viol ? 0 : 10)) * (sub.heat > 80 ? 1.2 : 1));
  addXP(xp);
  toast(`🍱 ${L('Đã giao túi', 'Bag delivered')} ${sub.idx + 1}: +${fmtVND(sub.fare)}<br><span style="font-weight:500">${'⭐'.repeat(stars)} · 🔥${Math.round(sub.heat)}% · 📦${Math.round(sub.integ)}%${tip ? ` · tip ${fmtVND(tip)}` : ''} · +${xp} XP</span>`, 2.8);
  if (o.subs.every(s => s.done)) foodBox.visible = false;
  checkQuests(); saveProfile(); updateProfileHUD();
}
function finishBatch(o) {
  stopSprites.forEach(s => s.visible = false); standPax.visible = false; pickupMarker.visible = dropMarker.visible = shopLabel.visible = false;
  const perfect = o.subs.every(s => s.stars >= 4 && s.onTime);
  let bonus = 0, msg = [];
  if (perfect) { bonus += o.bonus; addXP(20); msg.push(L('🔥 Chuỗi giao hoàn hảo', '🔥 Perfect chain')); profile.totals.combo = (profile.totals.combo || 0) + 1; }
  if (o.optimal) { bonus += 5000; msg.push(L('🧭 Tuyến tối ưu', '🧭 Optimal route')); }
  if (bonus) earn(bonus, 'wallet');
  setTimeout(() => toast(`🍱 ${L('Hoàn thành đơn ghép!', 'Batch complete!')}${bonus ? ` +${fmtVND(bonus)}` : ''}<br><span style="font-weight:500">${msg.join(' · ') || L('Lần sau giao đúng giờ để nhận thưởng combo', 'Deliver on time for a combo bonus')}</span>`, 3.2), 3000);
  ding([784, 988, 1318, 1568]);
  game.order = null; game.state = 'wait'; game.waitT = 3; refreshRoute(); checkQuests(); saveProfile(); updateProfileHUD();
}
