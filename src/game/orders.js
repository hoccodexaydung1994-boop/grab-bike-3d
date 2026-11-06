'use strict';
/* ================= Game state & profile ================= */
const $ = (id) => document.getElementById(id);
const fmtVND = (n) => Math.round(n).toLocaleString('vi-VN') + 'đ';
const DAY_START = 6 * 60 + 30, DAY_END = 22 * 60, MIN_PER_SEC = 1;
const dayEnd = () => unlocked('night') ? 23 * 60 : DAY_END;
const PROFILE_KEY = 'grabbike.q7.profile.v1';
const defaultProfile = () => ({ name: 'Tài xế', day: 1, clock: DAY_START, money: 0, trips: 0, goal: 150000, banned: false,
  totalMoney: 0, totalTrips: 0, xp: 0, level: 1, ratings: [], fines: 0, english: false, schema: 2 });
let profile = defaultProfile();
try { const s = localStorage.getItem(PROFILE_KEY); if (s) profile = Object.assign(defaultProfile(), JSON.parse(s)); } catch (e) { }
function saveProfile() { try { localStorage.setItem(PROFILE_KEY, JSON.stringify(profile)); } catch (e) { } }
const xpNeed = (lv) => Math.round(100 * Math.pow(lv, 1.5) / 10) * 10;   // quy chuẩn mục 2: 100 × L^1,5

const game = {
  running: false, mode: 'menu',        // menu | drive | showcase
  state: 'wait', waitT: 1.5,           // wait | offer | pickup | ride | frozen
  offer: null, order: null, tripT: 0, camMode: 0, muted: false, bumpCD: 0, frozen: false, noViolT: 0, dayOver: false
};

/* ---- order points on real streets ---- */
const NAMED_EDGES = EDGES.filter(E => E.n >= 0 && E.c >= 1 && E.c <= 4 && E.L > 30);
function spotOnEdge(E, s, fwd) {
  const p = edgeAt(E, s, fwd);
  const lane = E.o ? E.w / 2 - 1.2 : E.w / 4, side = E.w / 2 + 1.7;
  return { E, s, fwd, along: fwd ? s : E.L - s, x: p.x - p.dz * lane, z: p.z + p.dx * lane, sx: p.x - p.dz * side, sz: p.z + p.dx * side,
    h: Math.atan2(p.dx, p.dz), name: edgeName(E) };
}
function randomRoadPoint(from, minD, maxD) {
  for (let t = 0; t < 300; t++) {
    const E = NAMED_EDGES[Math.floor(Math.random() * NAMED_EDGES.length)];
    const s = E.L * (0.2 + Math.random() * 0.6), fwd = E.o ? true : Math.random() < 0.5;
    const sp = spotOnEdge(E, s, fwd);
    if (sp.x < BX0 + 40 || sp.x > BX1 - 40 || sp.z < BZ0 + 40 || sp.z > BZ1 - 40) continue;
    const d = Math.hypot(sp.x - from.x, sp.z - from.z);
    if (d >= minD && d <= maxD && !inWater(sp.sx, sp.sz)) return sp;
  }
  return spotOnEdge(NAMED_EDGES[0], NAMED_EDGES[0].L / 2, true);
}
// GrabFood merchants = food & drink places from the map
const FOOD_KINDS = new Set(['restaurant', 'cafe', 'fast_food', 'bakery', 'ice_cream', 'food_court', 'bar', 'pub']);
const MERCHANTS = [];
for (const poi of MAP.pois) {
  if (!FOOD_KINDS.has(poi.k)) continue;
  const ne = nearestEdge(poi.x, poi.z, E => E.c <= 5, 80); if (!ne) continue;
  const fwdGuess = edgeAt(ne.E, ne.along, true);
  const sideRight = ((poi.x - ne.x) * -fwdGuess.dz + (poi.z - ne.z) * fwdGuess.dx) > 0;
  let fwd = sideRight; if (ne.E.o) fwd = true;
  const s = fwd ? ne.along : ne.E.L - ne.along;
  MERCHANTS.push({ name: poi.t, kind: poi.k, x: poi.x, z: poi.z, spot: spotOnEdge(ne.E, Math.max(1, Math.min(ne.E.L - 1, s)), fwd) });
}
const MENU = CFG.shop.MENU;   // data/config/shop.json
function fareFor(type, km) {
  const base = type === 'food' ? 15000 + Math.max(0, km - 3) * 5000 : 12000 + Math.max(0, km - 2) * 4300;
  return Math.round(base * fareMul() * (isPeak() ? 1.3 : 1) * (rain > 0.3 ? 1.2 : 1) / 1000) * 1000;
}
function isPeak() { const h = profile.clock / 60; return (h >= 7 && h < 9) || (h >= 11 && h < 13) || (h >= 17 && h < 19);
}
function makeOffer() {
  if (unlocked('batch') && Math.random() < 0.25) { const b = makeBatchOffer(); if (b) return b; }
  const food = unlocked('food') && MERCHANTS.length && Math.random() < 0.45;
  let pickup, shop = null, items = null;
  if (food) {
    const near = MERCHANTS.filter(m => { const d = Math.hypot(m.spot.x - player.x, m.spot.z - player.z); return d > 80 && d < 1300; });
    if (near.length) { shop = near[Math.floor(Math.random() * near.length)]; pickup = shop.spot;
      const menu = MENU[shop.kind] || MENU.restaurant; items = [pick(menu)]; if (Math.random() < 0.5) items.push(pick(menu)); }
  }
  if (!pickup) pickup = randomRoadPoint(player, 80, 700);
  const drop = randomRoadPoint(pickup, 400, 2000);
  const r = computeRoute(pickup, drop.E, drop.along);
  const len = r ? r.len : Math.hypot(drop.x - pickup.x, drop.z - pickup.z) * 1.35;
  const km = Math.round(len / 100) / 10;
  const type = shop ? 'food' : 'ride';
  const premium = unlocked('premium') && Math.random() < 0.15, cust = makeCustomer();
  return { type, pickup, drop, shop, items, km, premium, cust, fare: Math.round(fareFor(type, km) * (premium ? 1.5 : 1) * (cust.type === 'vip' ? 1.4 : 1) / 1000) * 1000, est: len / 8 + 25, expire: 15 };
}

/* ---- routing (Dijkstra on the street graph) ---- */
function slicePts(E, d0, d1, out) {
  const P = (d) => { const q = edgeAt(E, d, true); out.push(q.x, q.z); };
  P(d0);
  const c = E.cum;
  if (d1 >= d0) { for (let k = 0; k < c.length; k++) if (c[k] > d0 && c[k] < d1) out.push(E.p[k * 2], E.p[k * 2 + 1]); }
  else { for (let k = c.length - 1; k >= 0; k--) if (c[k] < d0 && c[k] > d1) out.push(E.p[k * 2], E.p[k * 2 + 1]); }
  P(d1);
}
function computeRoute(from, TE, Talong) {
  const st = nearestEdge(from.x, from.z, null, 120); if (!st) return null;
  const n = NODE_ALL.length, dist = new Float64Array(n).fill(Infinity), prev = new Array(n).fill(null), done = new Uint8Array(n);
  const heap = [];
  const push = (d, u) => { heap.push([d, u]); let i = heap.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (heap[p][0] <= heap[i][0]) break; [heap[p], heap[i]] = [heap[i], heap[p]]; i = p; } };
  const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let i = 0; for (;;) { const l = i * 2 + 1, r = l + 1; let m = i; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === i) break; [heap[m], heap[i]] = [heap[i], heap[m]]; i = m; } } return top; };
  const SE = st.E;
  dist[SE.a] = st.along; prev[SE.a] = { start: true }; push(st.along, SE.a);
  dist[SE.b] = SE.L - st.along; prev[SE.b] = { start: true }; push(SE.L - st.along, SE.b);
  while (heap.length) {
    const [d, u] = pop(); if (done[u]) continue; done[u] = 1;
    for (const o of NODE_ALL[u]) {
      const v = o.fwd ? o.E.b : o.E.a;
      const w = o.E.L * (o.E.o && !o.fwd ? 2.5 : 1) * (o.E.c >= 5 ? 1.25 : 1);
      if (d + w < dist[v]) { dist[v] = d + w; prev[v] = { E: o.E, fwd: o.fwd, u }; push(d + w, v); }
    }
  }
  let best = null;
  const consider = (cost, o) => { if (cost < Infinity && (!best || cost < best.cost)) best = Object.assign({ cost }, o); };
  if (TE === SE) consider(Math.abs(Talong - st.along), { direct: true });
  consider(dist[TE.a] + Talong, { end: TE.a });
  consider(dist[TE.b] + (TE.L - Talong), { end: TE.b });
  if (!best) return null;
  const pts = [from.x, from.z];
  if (best.direct) slicePts(SE, st.along, Talong, pts);
  else {
    const chain = []; let u = best.end;
    while (prev[u] && !prev[u].start) { chain.push(prev[u]); u = prev[u].u; }
    chain.reverse();
    slicePts(SE, st.along, u === SE.a ? 0 : SE.L, pts);
    for (const c of chain) slicePts(c.E, c.fwd ? 0 : c.E.L, c.fwd ? c.E.L : 0, pts);
    slicePts(TE, best.end === TE.a ? 0 : TE.L, Talong, pts);
  }
  let len = 0; for (let i = 2; i < pts.length; i += 2) len += Math.hypot(pts[i] - pts[i - 2], pts[i + 1] - pts[i - 1]);
  return { pts, len };
}
let route = null, routeT = 0, routeMesh = null;
const routeMatG = new THREE.MeshBasicMaterial({ color: 0x00d26a, transparent: true, opacity: 0.6, depthWrite: false });
const routeMatO = new THREE.MeshBasicMaterial({ color: 0xff8a1f, transparent: true, opacity: 0.6, depthWrite: false });
function currentTarget() { if (!game.order) return null; if (game.order.type === 'batch') return game.order.stops ? batchTarget(game.order) : null; return game.state === 'pickup' ? game.order.pickup : game.state === 'ride' ? game.order.drop : null; }
function refreshRoute() {
  const t = currentTarget();
  if (routeMesh) { scene.remove(routeMesh); routeMesh.geometry.dispose(); routeMesh = null; }
  if (!t) { route = null; return; }
  route = computeRoute(player, t.E, t.along);
  if (!route) return;
  const buf = nb(); ribbon(route.pts, 1.5, 0.14, buf);
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(buf.pos, 3)); g.setIndex(buf.idx); g.computeVertexNormals();
  routeMesh = new THREE.Mesh(g, game.state === 'pickup' ? routeMatG : routeMatO); routeMesh.renderOrder = 2; scene.add(routeMesh);
}
function routeAim(ahead = 28) {
  if (!route) return null;
  const p = route.pts; let acc = 0;
  for (let i = 2; i < p.length; i += 2) {
    const L = Math.hypot(p[i] - p[i - 2], p[i + 1] - p[i - 1]); acc += L;
    if (acc >= ahead) return { x: p[i], z: p[i + 1] };
  }
  return { x: p[p.length - 2], z: p[p.length - 1] };
}

/* ---- order lifecycle ---- */
const foodBox = new THREE.Group();
{
  const box = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.42, 0.42), std(0x00a650, { roughness: 0.6 }));
  box.position.set(0, 1.12, -0.95); foodBox.add(box);
  const lid = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.04, 0.44), std(0x008a43)); lid.position.set(0, 1.34, -0.95); foodBox.add(lid);
  foodBox.visible = false; shadowAll(foodBox);
}
const shopLabel = labelSprite('Quán'); shopLabel.visible = false; scene.add(shopLabel);
function showOffer(o) {
  game.offer = o; game.state = 'offer';
  const food = o.type !== 'ride', batch = o.type === 'batch';
  $('offType').textContent = (o.premium ? '💎 ' : '') + (batch ? L('🍱 Đơn ghép 2 quán', '🍱 Batched order') : food ? '🍜 GrabFood' : '🛵 GrabBike');
  $('offType').className = food ? 'food' : 'bike';
  $('offFrom').textContent = batch ? `${o.subs[0].shop.name} + ${o.subs[1].shop.name}` : food ? `${o.shop.name}` : `Đường ${o.pickup.name}`;
  $('offItems').textContent = food ? o.items.join(' + ') + (batch ? L(` · thưởng combo ${fmtVND(o.bonus)}`, ` · combo bonus ${fmtVND(o.bonus)}`) : '') : '';
  $('offCust').innerHTML = o.cust ? `👤 <b>${o.cust.name}</b> ⭐${o.cust.rating} ${CUST_TYPES[o.cust.type][profile.english ? 1 : 0]}${o.cust.note ? `<br><small>${o.cust.note}</small>` : ''}` : '';
  $('offTo').textContent = batch ? `${o.subs[0].drop.name} · ${o.subs[1].drop.name}` : `Đường ${o.drop.name}`;
  $('offFare').textContent = fmtVND(o.fare) + (isPeak() ? ' ⚡' : '');
  $('offKm').textContent = `${o.km.toFixed(1)} km`;
  $('offer').classList.remove('hidden');
  ding([660, 880]);
}
function hideOffer() { $('offer').classList.add('hidden'); }
function acceptOffer() {
  const o = game.offer; if (!o || game.state !== 'offer') return;
  recordOffer(true);
  hideOffer(); game.offer = null; game.order = o; game.state = 'pickup';
  if (o.type === 'batch') { o.viol = false; o.handling = true; setupBatch(o); return; }
  Object.assign(o, { sat: 80 + (o.type === 'food' && profile.cleanBag ? 5 : 0), heat: 100, integ: 100, code: orderCode(), pay: o.type === 'ride' && Math.random() < 0.6 ? 'cash' : 'wallet', handling: false, talked: false, viol: false });
  applyCustomer(o);
  const p = o.pickup;
  pickupMarker.position.set(p.x, 0, p.z); pickupMarker.visible = true;
  standPax.position.set(p.sx, 0.06, p.sz); standPax.rotation.y = p.h + Math.PI / 2;
  const col = pick(shirtColors);
  standPax.userData.shirt.color.setHex(o.type === 'food' ? 0xb22222 : col); seatedPax.userData.shirt.color.setHex(col);
  standPax.visible = true;
  if (o.type === 'food') { shopLabel.material.map = labelSprite(o.shop.name, '🍜 Lấy món ở đây').material.map; shopLabel.position.set(p.sx, 6.5, p.sz); shopLabel.visible = true; }
  refreshRoute();
  toast(o.type === 'food' ? `🍜 Đã nhận đơn GrabFood<br><span style="font-weight:500">Tới ${o.shop.name} lấy món</span>` : `🛵 Đã nhận cuốc<br><span style="font-weight:500">Đón khách tại đường ${p.name}</span>`);
}
function declineOffer() { if (game.state !== 'offer') return; recordOffer(false); hideOffer(); game.offer = null; game.state = 'wait'; game.waitT = 3 + Math.random() * 3; }
$('offAccept').onclick = acceptOffer; $('offDecline').onclick = declineOffer;
function pickUp() {
  const o = game.order;
  pickupMarker.visible = false; shopLabel.visible = false;
  if (o.type === 'food') { foodBox.visible = true; standPax.position.set(o.drop.sx, 0.06, o.drop.sz); standPax.userData.shirt.color.setHex(pick(shirtColors)); }
  else { standPax.visible = false; seatedPax.visible = true; }
  dropMarker.position.set(o.drop.x, 0, o.drop.z); dropMarker.visible = true;
  game.tripT = 0; game.state = 'ride'; o.handling = false;
  refreshRoute();
  toast(o.type === 'food' ? `✅ Đã lấy món: ${o.items.join(', ')}<br><span style="font-weight:500">Giao tới đường ${o.drop.name} · ${fmtVND(o.fare)}</span>`
    : `✅ Đã đón khách<br><span style="font-weight:500">Đến đường ${o.drop.name} · ${o.km.toFixed(1)} km · ${fmtVND(o.fare)}</span>`);
  ding([880, 1175]);
}
function dropOff() {
  const o = game.order;
  seatedPax.visible = false; standPax.visible = false; dropMarker.visible = false; foodBox.visible = false;
  let stars = 5;
  if (game.tripT > o.est) stars--; if (game.tripT > o.est * 1.6) stars--;
  if (o.sat < 65) stars--; if (o.sat < 45) stars--;
  if (o.type === 'food') { if (o.heat < 50) stars--; if (o.integ < 60) stars--; if (o.wrongItem) stars -= 2; }
  if (profile.st.stress > 80 && Math.random() < 0.3) stars--;
  stars = Math.max(1, Math.min(5, stars));
  const tip = custTip(o, stars) || (stars === 5 && Math.random() < (o.sat > 90 ? 0.7 : 0.35) + tipBonus() ? pick([5000, 10000, 20000]) : 0);
  noteJob(o.drop.name, game.tripT <= o.est, o.km);
  profile.week.orders++;
  const before = profile.money;
  earn(o.fare, o.type === 'ride' ? o.pay : 'wallet');
  if (tip) earn(tip, 'cash', true);
  profile.ratings.push(stars); if (profile.ratings.length > 50) profile.ratings.shift();
  profile.today.ratings.push(stars);
  if (o.type === 'ride') { profile.today.bike++; profile.totals.bike++; } else { profile.today.food++; profile.totals.food++; }
  profile.trips++; profile.totalTrips++;
  profile.today.streak = stars >= 4 ? profile.today.streak + 1 : 0;
  if (stars === 5) profile.totals.fiveStar++;
  if (o.type === 'food' && o.heat >= 70 && o.integ >= 90 && game.tripT <= o.est) profile.totals.perfectFood++;
  let xp = (o.type === 'ride' ? 30 : 40) + Math.round(8 * o.km) + (stars === 5 ? 15 : 0) + (o.viol ? 0 : 10);
  if (o.type === 'food' && o.heat > 80) xp = Math.round(xp * 1.2);
  addXP(xp);
  const sat = Math.max(0, Math.min(100, Math.round(o.sat)));
  toast(`🎉 ${o.type === 'food' ? L('Giao thành công!', 'Delivered!') : L('Hoàn thành chuyến!', 'Ride complete!')} +${fmtVND(o.fare)} ${o.type === 'ride' ? (o.pay === 'cash' ? '💵' : '📱') : '📱'}<br><span style="font-weight:500">${'⭐'.repeat(stars)} · ${L('hài lòng', 'satisfaction')} ${sat}%${o.type === 'food' ? ` · 🔥${Math.round(o.heat)}% · 📦${Math.round(o.integ)}%` : ''}${tip ? ` · tip ${fmtVND(tip)}` : ''} · +${xp} XP${o.wrongItem ? L(' · ⚠️ giao nhầm món', ' · ⚠️ wrong item') : ''}</span>`, 3.5);
  ding([784, 988, 1318]);
  if (before < profile.goal && profile.money >= profile.goal) setTimeout(() => { toast(L(`🏆 Đạt mục tiêu hôm nay ${fmtVND(profile.goal)}!`, `🏆 Daily goal ${fmtVND(profile.goal)} reached!`), 3.5); ding([523, 659, 784, 1046]); }, 3600);
  game.order = null; game.state = 'wait'; game.waitT = 2.5; refreshRoute();
  checkQuests(); saveProfile(); updateProfileHUD();
  if (o.type === 'ride' && Math.random() < 0.1) setTimeout(() => { if (game.mode === 'drive' && !game.paused) evLostItem(); }, 3800);
}
function cancelOrder() {
  pickupMarker.visible = dropMarker.visible = standPax.visible = seatedPax.visible = foodBox.visible = shopLabel.visible = false;
  stopSprites.forEach(s => s.visible = false);
  game.order = null; hideOffer(); game.offer = null;
  if (game.state === 'pickup' || game.state === 'ride' || game.state === 'offer') { game.state = 'wait'; game.waitT = 3; }
  refreshRoute();
}
function addXP(n) {
  profile.xp += n; if (profile.today) profile.today.xp += n;
  while (profile.xp >= xpNeed(profile.level)) { profile.xp -= xpNeed(profile.level); profile.level++; onLevelUp(profile.level); ding([659, 880, 1318]); }
  updateProfileHUD();
}

let toastTimer = 0;
function toast(html, t = 3) { const el = $('toast'); el.innerHTML = html; el.classList.add('show'); toastTimer = t; }
