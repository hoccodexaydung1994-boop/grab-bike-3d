'use strict';
/* ================= Life sim: stats, needs, finance, dialogs, events, quests, home ================= */
const L = (vi, en) => profile.english ? en : vi;
const clamp01 = (v) => Math.max(0, Math.min(100, v));
const STAT_DEF = [
  ['hp', '❤️', 'Sức khỏe', '#E5484D', false], ['stamina', '⚡', 'Thể lực', '#F5A524', false],
  ['hunger', '🍚', 'Đói', '#d97706', true], ['thirst', '💧', 'Khát', '#3E9BFF', true], ['stress', '😤', 'Stress', '#a855f7', true],
  ['fuel', '⛽', 'Xăng', '#30A46C', false], ['dura', '🔧', 'Độ bền xe', '#A0A7B4', false], ['phone', '🔋', 'Pin điện thoại', '#22d3ee', false]
];
function newToday() { return { cam: [], bike: 0, food: 0, revenue: 0, tips: 0, xp: 0, costs: { fuel: 0, food: 0, repair: 0, fine: 0, living: 0, other: 0 }, viol: 0, streak: 0, quests: {}, ratings: [], dinner: false, km: 0 }; }
if (!profile.st) profile.st = { hp: 100, stamina: 100, hunger: 10, thirst: 10, stress: 5, fuel: 80, dura: 100 };
if (!profile.today) profile.today = newToday();
if (!profile.totals) profile.totals = { bike: 0, food: 0, revenue: 0, days: 0, fiveStar: 0, perfectFood: 0, returned: 0, english: 0 };
if (!profile.ach) profile.ach = {};
if (!profile.inv) profile.inv = { raincoat: 1 };
if (profile.cash === undefined) { profile.cash = 250000; profile.wallet = 0; profile.savings = 0; }

/* ---- money ---- */
function earn(amount, method, tip) {
  if (method === 'cash') profile.cash += amount; else profile.wallet += amount;
  profile.money += amount; profile.totalMoney += amount; profile.today.revenue += amount; profile.totals.revenue += amount;
  if (tip) profile.today.tips += amount;
}
function spend(amount, cat, force) {
  if (!force && profile.cash + profile.wallet < amount) { toast(L('💸 Không đủ tiền!', '💸 Not enough money!'), 1.8); return false; }
  const c = Math.min(Math.max(0, profile.cash), amount); profile.cash -= c; profile.wallet -= amount - c;
  profile.today.costs[cat] = (profile.today.costs[cat] || 0) + amount;
  updateProfileHUD(); saveProfile();
  return true;
}

/* ---- service places from the map ---- */
const FUEL = []; for (let i = 0; i < MAP.fuel.length; i += 2) FUEL.push({ x: MAP.fuel[i], z: MAP.fuel[i + 1], name: 'Cây xăng' });
const REPAIR = MAP.pois.filter(p => p.k === 'motorcycle' || p.k === 'bicycle').map(p => ({ x: p.x, z: p.z, name: p.t }));
const SHOPS = MAP.pois.filter(p => ['convenience', 'supermarket'].includes(p.k)).map(p => ({ x: p.x, z: p.z, name: p.t }));
const HOSPITALS = MAP.hospitals.length ? MAP.hospitals : [{ t: 'Bệnh viện', x: homeSpot.x, z: homeSpot.z }];
{
  // simple props: fuel canopy, repair sign
  const g = new THREE.Group();
  const red = std(0xd32f2f), white = std(0xf5f5f5), grey = std(0x9aa0a6, { metalness: 0.4, roughness: 0.4 });
  for (const f of FUEL) {
    const c = new THREE.Mesh(new THREE.BoxGeometry(10, 0.6, 7), white); c.position.set(f.x, 5, f.z); g.add(c);
    const band = new THREE.Mesh(new THREE.BoxGeometry(10.1, 0.25, 7.1), red); band.position.set(f.x, 4.8, f.z); g.add(band);
    for (const dx of [-3, 3]) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.5, 4.7, 0.5), grey); p.position.set(f.x + dx, 2.35, f.z); g.add(p);
      const pump = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.6, 0.5), red); pump.position.set(f.x + dx, 0.8, f.z + 1.2); g.add(pump); }
    const lb = labelSprite('⛽ Cây xăng'); lb.position.set(f.x, 7.5, f.z); lb.scale.set(14, 3.5, 1); scene.add(lb); labels.push(lb);
  }
  for (const r of REPAIR) { const lb = labelSprite('🔧 ' + r.name, 'Sửa xe'); lb.position.set(r.x, 6, r.z); lb.scale.set(16, 4, 1); scene.add(lb); labels.push(lb); }
  for (const s of SHOPS) { const lb = labelSprite('🏪 ' + s.name); lb.position.set(s.x, 5.5, s.z); lb.scale.set(14, 3.5, 1); scene.add(lb); labels.push(lb); }
  for (const m of MERCHANTS) { const lb = labelSprite('🍜 ' + m.name); lb.position.set(m.x, 6, m.z); lb.scale.set(16, 4, 1); scene.add(lb); labels.push(lb); }
  scene.add(bake(g));
}
const nearest = (list, r) => { let b = null, bd = r; for (const p of list) { const d = Math.hypot(p.x - player.x, p.z - player.z); if (d < bd) { bd = d; b = p; } } return b; };

/* ---- stats tick ---- */
let rain = 0, rainTarget = 0, raincoat = false, slowUntil = 0, fatigueCD = 0, flatCD = 60;
function speedFactor() {
  const s = profile.st; let f = 1;
  f *= mulSpeed();
  if (s.stamina < 20) f *= 0.75; if (s.dura < 30) f *= 0.7; if (rain > 0.3) f *= raincoat ? 0.7 : 0.85;
  if (sigClock < slowUntil) f *= 0.6;
  if (s.fuel <= 0) f = 0.08;
  return f;
}
function tickStats(dt, distM) {
  if (game.dayOver || game.frozen || game.mode !== 'drive') return;
  const s = profile.st, gm = dt * MIN_PER_SEC, moving = Math.abs(player.v) > 1;
  const h = profile.clock / 60, noon = h >= 11 && h < 14;
  const needy = s.hunger > 80 || s.thirst > 80;
  s.stamina = clamp01(s.stamina - gm * (moving ? 0.1 : 0.03) * (needy ? 2 : 1) * (s.stress > 80 ? 1.3 : 1) * mulStamina());
  s.hunger = clamp01(s.hunger + gm * 0.13 * mulNeeds());
  s.thirst = clamp01(s.thirst + gm * (noon ? 0.3 : 0.2) * mulNeeds());
  s.stress = clamp01(s.stress + gm * (moving ? 0.01 : -0.03));
  if (s.hunger > 90 || s.thirst > 90) s.hp = clamp01(s.hp - gm * 0.06);
  if (rain > 0.3 && !raincoat && moving) s.hp = clamp01(s.hp - gm * 0.03);
  s.fuel = clamp01(s.fuel - distM / 1000 * 3 * mulFuel());
  s.phone = clamp01((s.phone ?? 100) - gm * (0.083 + (route ? 0.05 : 0)));
  if (s.phone < 15 && !game.lowBat) { game.lowBat = true; toast(L('🔋 Pin điện thoại yếu! Sạc ở quán cà phê hoặc dùng sạc dự phòng (E)', '🔋 Low phone battery!'), 3); }
  if (s.phone > 30) game.lowBat = false;
  profile.today.km += distM / 1000;
  if (game.order && game.order.type === 'food' && game.state === 'ride') game.order.heat = Math.max(0, game.order.heat - dt * 0.25 * mulHeat());
  if (game.order && game.order.subs) for (const b of game.order.subs) if (b.picked && !b.done) b.heat = Math.max(0, b.heat - dt * 0.25 * mulHeat());
  // threshold events
  fatigueCD -= dt; flatCD -= dt;
  if (s.hp <= 0) return hospital();
  if (s.fuel <= 0 && !game.outOfFuel) { game.outOfFuel = true; return evOutOfFuel(); }
  if (s.dura <= 0 && !game.broken) { game.broken = true; return evBreakdown(); }
  if (s.stamina < 25 && fatigueCD <= 0) { fatigueCD = 120; return evFatigue(); }
  if (moving && flatCD <= 0 && Math.random() < dt / 400) { flatCD = 240; return evFlat(); }
  const hr = profile.clock / 60;
  if (!profile.today.rained && hr > 12.5 && hr < 18 && moving && Math.random() < dt / 300) { profile.today.rained = true; return evRain(); }
  if (rainTarget > 0 && sigClock > game.rainEnd) rainTarget = 0;
}
function onCrash(sp) {
  const s = profile.st;
  const [dh, dd] = (sp < 9 ? [3, 2] : sp < 13 ? [8, 5] : [16, 9]).map(v => v * mulCrash());
  s.hp = clamp01(s.hp - dh); s.dura = clamp01(s.dura - dd); s.stress = clamp01(s.stress + 6);
  if (game.order && game.order.subs) for (const b of game.order.subs) if (b.picked && !b.done) { b.sat -= 8; b.integ = Math.max(0, b.integ - 15); }
  if (game.order && !game.order.subs) { game.order.sat -= 12; if (game.order.type === 'food' && game.state === 'ride') game.order.integ = Math.max(0, game.order.integ - 15); }
}

/* ---- HUD bars ---- */
{
  const box = $('stats'); box.innerHTML = '';
  for (const [k, ic, name, col] of STAT_DEF) {
    const d = document.createElement('div'); d.className = 'st'; d.id = 'st_' + k; d.title = name;
    d.innerHTML = `<span>${ic}</span><b><i style="background:${col}"></i></b>`;
    box.appendChild(d);
  }
}
function renderStats() {
  for (const [k, , , , bad] of STAT_DEF) {
    const v = profile.st[k], el = $('st_' + k);
    el.querySelector('i').style.width = v + '%';
    const warn = bad ? v > 75 : v < 25, crit = bad ? v > 90 : v < 10;
    el.className = 'st' + (crit ? ' crit' : warn ? ' warn' : '');
  }
  $('cash').textContent = fmtVND(profile.cash); $('wallet').textContent = fmtVND(profile.wallet);
  $('peak').textContent = isPeak() ? L('⚡ Giờ cao điểm ×1,3', '⚡ Peak hours ×1.3') : '';
}

/* ---- generic dialog with options (pauses the game) ---- */
function showDialog({ who, text, opts, onPick, closable }) {
  game.paused = true;
  $('dlgWho').textContent = who; $('dlgText').innerHTML = text;
  const box = $('dlgOpts'); box.innerHTML = '';
  opts.forEach((o, i) => {
    const b = document.createElement('button'); b.innerHTML = `<kbd>${i + 1}</kbd> ${o.t}`;
    if (o.disabled) b.disabled = true;
    b.onclick = () => { if (b.disabled) return; closeDialog(); if (profile.english && o.good !== undefined) englishScore(o.good, o.why); (o.fx || (() => { }))(); onPick && onPick(i); };
    box.appendChild(b);
  });
  $('dlg').classList.remove('hidden');
  game.dlgKeys = opts.map((o, i) => box.children[i]);
}
function closeDialog() { $('dlg').classList.add('hidden'); game.paused = false; game.dlgKeys = null; }
function englishScore(good, why) {
  if (good) { profile.totals.english++; toast('✅ Good answer!' + (why ? `<br><span style="font-weight:500">${why}</span>` : ''), 2); if (profile.totals.english >= 20) unlock('english'); }
  else toast('🤔 Could be more polite.' + (why ? `<br><span style="font-weight:500">${why}</span>` : ''), 2.2);
}
addEventListener('keydown', (e) => {
  if (!game.dlgKeys) return;
  const n = +e.key; if (n >= 1 && n <= game.dlgKeys.length) { e.stopImmediatePropagation(); game.dlgKeys[n - 1].click(); }
}, true);
function passTime(min) { profile.clock += min; if (game.order) game.tripT += min; }

/* ---- conversations ---- */
const orderCode = () => 'GF-' + Math.floor(100 + Math.random() * 900);
function arrivePickup() {
  const o = game.order; player.v = 0;
  if (o.type === 'ride') {
    if (Math.random() < 0.2) return evNoShow();
    greetRide();
  } else {
    if (Math.random() < 0.25) return evSlowFood();
    staffDialog();
  }
}
function greetRide() {
  const o = game.order;
  showDialog({ who: L('🧑 Khách', '🧑 Passenger'), text: L(`Chào em, anh đặt xe đi đường <b>${o.drop.name}</b> nhé.`, `Hi, I booked a ride to <b>${o.drop.name}</b>.`), opts: [
    { t: L('Dạ chào anh! Em là tài xế Grab, anh đội mũ bảo hiểm giúp em ạ.', "Hello! I'm your Grab driver. Please put on this helmet."), good: true, why: 'Greeting + safety first.', fx: () => o.sat += 10 },
    { t: L('Lên xe đi anh.', 'Get on.'), good: false, why: 'Try a greeting and mention the helmet.', fx: () => o.sat -= 5 },
    { t: L('(Gật đầu, không nói gì)', '(Nod silently)'), good: false, fx: () => o.sat -= 8 }], onPick: () => pickUp() });
}
function staffDialog(o = game.order, done = pickUp) {
  showDialog({ who: L(`👩‍🍳 Nhân viên ${o.shop.name}`, `👩‍🍳 Staff at ${o.shop.name}`), text: L(`Anh lấy đơn <b>${o.code}</b> phải không ạ? Món đây ạ: ${o.items.join(', ')}.`, `Are you picking up order <b>${o.code}</b>? Here it is: ${o.items.join(', ')}.`), opts: [
    { t: L('Đúng rồi, em kiểm tra món và dán niêm phong giúp anh nhé.', 'Yes. Let me check the items. Could you seal the bag, please?'), good: true, why: 'Checking the order avoids mistakes.', fx: () => { o.sat += 8; passTime(1); } },
    { t: L('Đưa đây, anh đang vội.', "Give it to me, I'm in a hurry."), good: false, why: 'Always confirm the order code and items.', fx: () => { if (Math.random() < 0.3) o.wrongItem = true; } },
    { t: L('Cho anh xin thêm muỗng đũa với tương ớt nha.', 'Could I get extra cutlery and chili sauce, please?'), good: true, fx: () => { o.sat += 12; passTime(2); } }], onPick: () => done() });
}
function arriveDrop() {
  const o = game.order; player.v = 0;
  const fare = fmtVND(o.fare);
  if (o.type === 'ride') {
    const cash = o.pay === 'cash';
    showDialog({ who: L('🧑 Khách', '🧑 Passenger'), text: cash ? L('Tới rồi hả em, bao nhiêu tiền vậy?', 'Are we here? How much is it?') : L('Tới rồi hả em, anh trả qua ví rồi nhé.', "We're here? I've paid through the app."), opts: [
      { t: cash ? L(`Dạ ${fare} ạ. Anh nhớ đánh giá 5 sao cho em nha!`, `It's ${fare}. Please rate me five stars!`) : L('Dạ vâng. Anh nhớ đánh giá 5 sao cho em nha!', 'OK. Please rate me five stars!'), good: false, why: 'Asking for stars sounds pushy.', fx: () => o.sat -= 3 },
      { t: cash ? L(`Dạ ${fare} ạ, cảm ơn anh. Anh kiểm tra đồ đạc trước khi xuống nhé.`, `It's ${fare}. Thank you! Please check your belongings.`) : L('Dạ cảm ơn anh, anh kiểm tra đồ đạc trước khi xuống nhé.', 'Thank you! Please check your belongings before you go.'), good: true, why: 'Polite and helpful.', fx: () => o.sat += 10 },
      { t: L('Xem trên app đi.', 'Check the app.'), good: false, fx: () => o.sat -= 10 }], onPick: () => dropOff() });
  } else handoverDialog(o, dropOff);
}
function handoverDialog(o, done) {
  {
    showDialog({ who: L('🧑 Khách đặt món', '🧑 Customer'), text: L('Đồ ăn của chị tới rồi hả em?', 'Is my food here?'), opts: [
      { t: L(`Dạ đơn ${o.code} của chị đây ạ, chúc chị ngon miệng!`, `Here's your order ${o.code}. Enjoy your meal!`), good: true, why: 'Confirming the order code is good practice.', fx: () => o.sat += 10 },
      { t: L('Dạ của chị, chị nhận giúp em.', 'Here, please take it.'), good: true, fx: () => o.sat += 2 },
      { t: L('(Đặt túi xuống rồi đi)', '(Leave the bag and go)'), good: false, fx: () => o.sat -= 10 }], onPick: () => done() });
  }
}
const SMALL_TALK = [
  () => ({ q: L('Em chạy Grab lâu chưa?', 'How long have you been driving for Grab?'), opts: [
    { t: L('Dạ hơn một năm rồi anh, em rành đường Quận 7 lắm.', 'More than a year. I know District 7 very well.'), good: true, fx: () => game.order.sat += 6 },
    { t: L('Lâu rồi.', 'A while.'), good: false, why: 'Short answers can sound cold.' },
    { t: L('(Im lặng, tập trung lái xe)', '(Stay quiet and focus on driving)'), good: true, fx: () => game.order.sat += 2 }] }),
  () => ({ q: L('Chạy chậm chút được không em, chị hơi sợ.', "Could you slow down a bit? I'm a little scared."), opts: [
    { t: L('Dạ được ạ, em chạy chậm lại ạ.', "Sure, I'll slow down."), good: true, fx: () => { game.order.sat += 10; slowUntil = sigClock + 25; toast(L('🐢 Giới hạn tốc độ 25 giây', '🐢 Slower for 25 s'), 1.5); } },
    { t: L('Đường vắng mà chị.', 'The road is empty.'), good: false, fx: () => game.order.sat -= 10 },
    { t: L('Sắp tới rồi chị.', "We're almost there."), good: false, fx: () => game.order.sat -= 3 }] }),
  () => { const cafe = MERCHANTS.length ? pick(MERCHANTS).name : 'Highlands Coffee'; return { q: L('Gần đây có quán cà phê nào ngon không em?', 'Is there a good coffee shop around here?'), opts: [
    { t: L(`Dạ có ${cafe}, ngon lắm anh.`, `Yes, ${cafe} is very good.`), good: true, fx: () => game.order.sat += 8 },
    { t: L('Em không biết.', "I don't know."), good: false },
    { t: L('Anh tự tra Google đi.', 'Google it.'), good: false, fx: () => game.order.sat -= 8 }] }; },
  () => ({ q: L('Hôm nay em chạy được nhiều cuốc không?', 'Have you had many rides today?'), opts: [
    { t: L(`Dạ được ${profile.trips} cuốc rồi anh, cảm ơn anh hỏi thăm.`, `${profile.trips} rides so far. Thanks for asking!`), good: true, fx: () => game.order.sat += 5 },
    { t: L('Ít lắm, mệt quá anh ơi.', "Not many, I'm exhausted."), good: false, fx: () => game.order.sat -= 2 },
    { t: L('Bí mật.', "That's a secret."), good: false }] }),
];
function smallTalk() {
  const st = pick(SMALL_TALK)();
  showDialog({ who: L('🧑 Khách', '🧑 Passenger'), text: st.q, opts: st.opts });
}

/* ---- events with options ---- */
function evNoShow(round = 0) {
  const o = game.order;
  showDialog({ who: L('📍 Điểm đón', '📍 Pickup point'), text: round ? L('Khách vẫn chưa xuất hiện…', 'The passenger still has not appeared…') : L('Bạn đã tới điểm đón nhưng không thấy khách đâu.', 'You arrived, but the passenger is not here.'), opts: [
    { t: L('📞 Gọi điện cho khách (mất ~5 phút)', '📞 Call the passenger (~5 min)'), fx: () => { passTime(5); Math.random() < 0.85 ? (toast(L('📞 Khách đang đi ra!', '📞 The passenger is coming!'), 1.5), setTimeout(greetRide, 400)) : setTimeout(() => evNoShow(1), 400); } },
    { t: L('💬 Nhắn tin hỏi vị trí (~3 phút)', '💬 Message to ask (~3 min)'), fx: () => { passTime(3); Math.random() < 0.65 ? (toast(L('💬 Khách trả lời: "Ra liền!"', '💬 "Coming right now!"'), 1.5), setTimeout(greetRide, 400)) : setTimeout(() => evNoShow(1), 400); } },
    { t: L('⏳ Chờ đúng quy trình 10 phút', '⏳ Wait 10 minutes per policy'), fx: () => { passTime(10); if (Math.random() < 0.6) setTimeout(greetRide, 400); else { earn(10000, 'wallet'); toast(L('Khách không tới. Chuyến hủy, bạn nhận phí chờ 10.000đ', 'No-show. Ride cancelled, you get a 10,000đ waiting fee'), 3); cancelOrder(); game.state = 'wait'; game.waitT = 2; } } }] });
}
function evSlowFood() {
  const o = game.order;
  showDialog({ who: L(`🍳 ${o.shop.name}`, `🍳 ${o.shop.name}`), text: L('Quán báo món sẽ trễ khoảng 10 phút vì đang đông khách.', 'The restaurant says the food will be about 10 minutes late.'), opts: [
    { t: L('🙋 Hỏi nhân viên thời gian cụ thể', '🙋 Ask the staff for an exact time'), fx: () => { passTime(6); toast(L('Nhân viên: "6 phút nữa là xong ạ"', 'Staff: "Ready in 6 minutes"'), 1.6); setTimeout(staffDialog, 500); } },
    { t: L('📲 Báo khách về việc chậm trễ', '📲 Tell the customer about the delay'), fx: () => { o.sat += 10; passTime(10); o.est += 10; setTimeout(staffDialog, 400); } },
    { t: L('☎️ Liên hệ tổng đài hỗ trợ', '☎️ Contact support'), fx: () => { passTime(12); o.est += 12; earn(8000, 'wallet'); toast(L('Tổng đài hỗ trợ phí chờ 8.000đ', 'Support adds an 8,000đ waiting fee'), 2); setTimeout(staffDialog, 400); } }] });
}
function evRain() {
  rainTarget = 1; game.rainEnd = sigClock + 150 + Math.random() * 120;
  showDialog({ who: L('🌧️ Mưa lớn bất ngờ', '🌧️ Sudden heavy rain'), text: L('Trời đổ mưa lớn! Đường trơn, tầm nhìn giảm.', 'Heavy rain! The road is slippery and visibility is low.'), opts: [
    { t: L('🏪 Dừng ở nơi an toàn chờ mưa nhỏ (20 phút)', '🏪 Stop somewhere safe until it eases (20 min)'), fx: () => { passTime(20); rainTarget = 0.35; game.rainEnd = sigClock + 60; profile.st.stress = clamp01(profile.st.stress - 5); } },
    { t: profile.inv.raincoat > 0 ? L('🧥 Mặc áo mưa và đi chậm', '🧥 Wear a raincoat and ride slowly') : L('🧥 Mặc áo mưa (bạn không có áo mưa!)', '🧥 Wear a raincoat (you have none!)'), disabled: !(profile.inv.raincoat > 0), fx: () => { raincoat = true; passTime(2); } },
    { t: L('☎️ Liên hệ hỗ trợ nếu không thể đi', '☎️ Contact support if you cannot continue'), fx: () => { if (game.order) { profile.week.cancels++; cancelOrder(); game.state = 'wait'; game.waitT = 30; toast(L('Đơn được hủy an toàn, không bị trừ điểm', 'Order cancelled safely, no penalty'), 2.5); } passTime(5); } }] });
}
function evFatigue() {
  showDialog({ who: L('😮‍💨 Mệt mỏi', '😮‍💨 Tired'), text: L('Bạn thấy mệt sau nhiều giờ chạy xe.', 'You feel tired after many hours of riding.'), opts: [
    { t: L('😴 Nghỉ 30 phút', '😴 Rest 30 minutes'), fx: () => { passTime(30); const s = profile.st; s.stamina = clamp01(s.stamina + 30); s.stress = clamp01(s.stress - 10); } },
    { t: L('🥤 Ăn nhẹ và uống nước (30.000đ)', '🥤 Snack and water (30,000đ)'), fx: () => { if (spend(30000, 'food')) { const s = profile.st; s.hunger = clamp01(s.hunger - 40); s.thirst = clamp01(s.thirst - 40); s.stamina = clamp01(s.stamina + 15); passTime(10); } } },
    { t: L('🏠 Kết thúc ca để giữ an toàn', '🏠 End the shift to stay safe'), fx: () => endDay() }] });
}
function evFlat() {
  showDialog({ who: L('🛞 Thủng lốp!', '🛞 Flat tyre!'), text: L('Xe bị thủng lốp, không chạy tiếp được.', 'You have a flat tyre and cannot continue.'), opts: [
    { t: L('🚶 Dắt bộ tới tiệm vá (15 phút, 30.000đ)', '🚶 Push to a repair shop (15 min, 30,000đ)'), fx: () => { if (spend(30000, 'repair', true)) passTime(15); profile.st.stamina = clamp01(profile.st.stamina - 10); } },
    { t: L('📞 Gọi thợ vá lưu động (5 phút, 60.000đ)', '📞 Call a mobile mechanic (5 min, 60,000đ)'), fx: () => { spend(60000, 'repair', true); passTime(5); } }] });
}
function evLostItem() {
  showDialog({ who: L('👛 Khách để quên đồ', '👛 Forgotten item'), text: L('Khách vừa để quên ví trên xe của bạn!', 'The passenger left a wallet on your bike!'), opts: [
    { t: L('📞 Gọi khách và mang trả tận nơi (10 phút)', '📞 Call and return it in person (10 min)'), good: true, fx: () => { passTime(10); earn(20000, 'cash', true); profile.totals.returned++; unlock('nguoi_tot'); toast(L('🙏 Khách cảm ơn và tip 20.000đ', '🙏 The passenger thanks you and tips 20,000đ'), 2.5); } },
    { t: L('🏢 Gửi lại cho tổng đài Grab (2 phút)', '🏢 Hand it to Grab support (2 min)'), good: true, fx: () => { passTime(2); addXP(5); } }] });
}
function evOutOfFuel() {
  const f = nearest(FUEL, 1e9);
  showDialog({ who: L('⛽ Hết xăng!', '⛽ Out of fuel!'), text: L('Xe hết xăng giữa đường.', 'You ran out of fuel.'), opts: [
    { t: L('🚶 Dắt bộ tới cây xăng gần nhất (25 phút)', '🚶 Push to the nearest station (25 min)'), fx: () => { passTime(25); profile.st.stamina = clamp01(profile.st.stamina - 15); if (f) teleportTo(f.x, f.z); refuel(); game.outOfFuel = false; } },
    { t: L('📞 Gọi cứu hộ xăng (8 phút, 50.000đ, +20% xăng)', '📞 Call roadside fuel (8 min, 50,000đ, +20%)'), fx: () => { spend(50000, 'fuel', true); passTime(8); profile.st.fuel = 20; game.outOfFuel = false; } }] });
}
function evBreakdown() {
  showDialog({ who: L('🔧 Xe hỏng!', '🔧 Breakdown!'), text: L('Xe hư hỏng nặng sau nhiều va chạm.', 'The bike broke down after too many crashes.'), opts: [
    { t: L('🚚 Gọi xe cứu hộ (15 phút, 100.000đ, độ bền 40%)', '🚚 Call a tow (15 min, 100,000đ, 40% durability)'), fx: () => { spend(100000, 'repair', true); passTime(15); profile.st.dura = 40; game.broken = false; } },
    { t: L('🛠️ Tự sửa tạm (10 phút, độ bền 15%)', '🛠️ Quick self-repair (10 min, 15% durability)'), fx: () => { passTime(10); profile.st.dura = 15; game.broken = false; } }] });
}
function hospital() {
  if (game.inHospital) return; game.inHospital = true;
  const hsp = nearest(HOSPITALS, 1e9) || HOSPITALS[0];
  cancelOrder(); spend(300000, 'other', true);
  showOverlay(L('🏥 Vào viện', '🏥 Hospital'), L(`Bạn kiệt sức và được đưa vào <b>${hsp.t}</b>.<br>Viện phí 300.000đ. Ca làm hôm nay kết thúc.`, `You collapsed and were taken to <b>${hsp.t}</b>.<br>Bill: 300,000đ. Your shift is over.`), L('Xem báo cáo cuối ngày', 'See end-of-day report'), () => { profile.st.hp = 60; game.inHospital = false; endDay(); });
}
function teleportTo(x, z) { const ne = nearestEdge(x, z, null, 120); if (ne) { player.x = ne.x; player.z = ne.z; } else { player.x = x; player.z = z; } player.v = 0; camInit = false; playerTrail.length = 0; game.noViolT = 2; }
function fuelPrice(need) { return need * 1000; }   // garage.js nhân theo loại xe
function repairMul() { return 1; }
function refuel() { const need = Math.round(100 - profile.st.fuel); if (need <= 0) return toast(L('⛽ Bình xăng đã đầy', '⛽ Tank is full'), 1.5); const cost = fuelPrice(need); if (spend(cost, 'fuel')) { profile.st.fuel = 100; passTime(4); toast(L(`⛽ Đổ đầy bình: ${fmtVND(cost)}`, `⛽ Filled up: ${fmtVND(cost)}`), 2); } }

/* ---- action menu (E) ---- */
const FOOD_MENU = CFG.shop.FOOD_MENU;   // data/config/shop.json
function applyFx(fx) { for (const k in fx) profile.st[k] = clamp01(profile.st[k] + fx[k]); }
function buyMenu(where, items) {
  showDialog({ who: '🛒 ' + where, text: L(`Tiền mặt: <b>${fmtVND(profile.cash)}</b> · Ví: ${fmtVND(profile.wallet)}`, `Cash: <b>${fmtVND(profile.cash)}</b> · Wallet: ${fmtVND(profile.wallet)}`),
    opts: items.map(([n, c, fx]) => ({ t: `${n} — ${fmtVND(c)}`, fx: () => { if (typeof fx === 'function') { if (spend(c, 'other')) fx(); } else if (spend(c, 'food')) { applyFx(fx); passTime(5); toast(`😋 ${n}`, 1.2); } } }))
      .concat([{ t: L('↩️ Thôi', '↩️ Never mind') }]) });
}
const ACTION_HOOKS = [];
function openActions() {
  if (game.mode !== 'drive' || game.paused || game.frozen || Math.abs(player.v) > 1.5) { if (Math.abs(player.v) > 1.5) toast(L('Dừng xe lại để thao tác', 'Stop the bike first'), 1.2); return; }
  const opts = [];
  const f = nearest(FUEL, 30), r = nearest(REPAIR, 35), sh = nearest(SHOPS, 30), m = nearest(MERCHANTS, 30), home = Math.hypot(homeSpot.x - player.x, homeSpot.z - player.z) < 30;
  if (f) opts.push({ t: L(`⛽ Đổ đầy xăng (${fmtVND(fuelPrice(Math.round(100 - profile.st.fuel)))})`, `⛽ Fill up (${fmtVND(fuelPrice(Math.round(100 - profile.st.fuel)))})`), fx: refuel });
  if (r) { const need = Math.round(100 - profile.st.dura); opts.push({ t: L(`🔧 Sửa xe tại ${r.name} (${fmtVND(Math.round(need * 1500 * repairMul()))})`, `🔧 Repair at ${r.name} (${fmtVND(Math.round(need * 1500 * repairMul()))})`), fx: () => { if (need > 0 && spend(Math.round(need * 1500 * repairMul()), 'repair')) { profile.st.dura = 100; passTime(20); toast(L('🔧 Xe như mới!', '🔧 Good as new!'), 1.6); } } }); }
  if (m) opts.push({ t: L(`🍜 Ăn uống tại ${m.name}`, `🍜 Eat & drink at ${m.name}`), fx: () => setTimeout(() => buyMenu(m.name, FOOD_MENU), 50) });
  if (m && profile.st.phone < 95) opts.push({ t: L('🔌 Sạc điện thoại tại quán (20 phút, 10.000đ, +45%)', '🔌 Charge phone here (20 min, 10,000đ, +45%)'), fx: () => chargePhone(45, 20, 10000) });
  if (profile.inv.powerbank > 0 && profile.st.phone < 95) opts.push({ t: L(`🔋 Dùng sạc dự phòng (+50%, còn ${profile.inv.powerbank})`, `🔋 Use power bank (+50%, ${profile.inv.powerbank} left)`), fx: () => { profile.inv.powerbank--; chargePhone(50, 1); } });
  if (sh) opts.push({ t: L(`🏪 Mua đồ tại ${sh.name}`, `🏪 Shop at ${sh.name}`), fx: () => setTimeout(() => buyMenu(sh.name, [FOOD_MENU[0], FOOD_MENU[2], FOOD_MENU[4], [L('🧥 Áo mưa', '🧥 Raincoat'), 35000, () => { profile.inv.raincoat = (profile.inv.raincoat || 0) + 1; toast(L('🧥 Đã mua áo mưa', '🧥 Raincoat bought'), 1.4); }], [L('🔋 Sạc dự phòng (3 lần sạc)', '🔋 Power bank (3 charges)'), 80000, () => { profile.inv.powerbank = (profile.inv.powerbank || 0) + 3; toast(L('🔋 Đã mua sạc dự phòng', '🔋 Power bank bought'), 1.4); }]]), 50) });
  if (home) opts.push({ t: L('🏠 Về nhà, kết thúc ca', '🏠 Go home and end the shift'), fx: () => endDay() });
  for (const hk of ACTION_HOOKS) hk(opts);
  opts.push({ t: L('😴 Nghỉ 15 phút bên đường', '😴 Rest 15 minutes'), fx: () => { passTime(15); profile.st.stamina = clamp01(profile.st.stamina + 12); profile.st.stress = clamp01(profile.st.stress - 6); } });
  opts.push({ t: L('📋 Nhiệm vụ & thành tích', '📋 Quests & achievements'), fx: () => setTimeout(showQuests, 50) });
  opts.push({ t: L('↩️ Đóng', '↩️ Close') });
  showDialog({ who: L('🛠 Bạn muốn làm gì?', '🛠 What do you want to do?'), text: L(`🕐 ${clockText(profile.clock)} · 💵 ${fmtVND(profile.cash)} · 📱 ${fmtVND(profile.wallet)}`, `🕐 ${clockText(profile.clock)} · 💵 ${fmtVND(profile.cash)} · 📱 ${fmtVND(profile.wallet)}`), opts });
}
addEventListener('keydown', (e) => { if (e.code === 'KeyE' && fall.on) { if (fall.canUp) standUp(); return; } if (e.code === 'KeyE' && !game.dlgKeys && game.mode === 'drive') openActions(); if (e.code === 'KeyQ' && !game.dlgKeys && game.mode === 'drive') showQuests(); });
$('bAct').onclick = openActions; $('bQuest').onclick = () => game.mode === 'drive' && showQuests();

/* ---- quests & achievements ---- */
const QUESTS = [
  { id: 'q_bike', t: ['Hoàn thành 5 chuyến GrabBike', 'Complete 5 GrabBike rides'], cur: () => profile.today.bike, goal: 5, cash: 30000, xp: 50 },
  { id: 'q_food', t: ['Giao 3 đơn GrabFood', 'Deliver 3 GrabFood orders'], cur: () => profile.today.food, goal: 3, cash: 25000, xp: 40 },
  { id: 'q_streak', t: ['3 chuyến liên tiếp được ≥4 sao', '3 rides in a row rated ≥4 stars'], cur: () => profile.today.streak, goal: 3, cash: 20000, xp: 30 },
];
const ACH = CFG.progression.ACH;   // data/config/progression.json
function unlock(id) { if (profile.ach[id]) return; profile.ach[id] = profile.day; addXP(40); setTimeout(() => { toast(`🏅 ${L('Thành tích mới', 'Achievement')}: ${ACH[id][0]}<br><span style="font-weight:500">${ACH[id][1]} · +40 XP</span>`, 3.5); ding([523, 784, 1046, 1318]); }, 1600); }
function checkQuests() {
  for (const q of QUESTS) if (!profile.today.quests[q.id] && q.cur() >= q.goal) {
    profile.today.quests[q.id] = true; earn(q.cash, 'wallet'); addXP(q.xp);
    setTimeout(() => toast(`🎯 ${L('Nhiệm vụ hoàn thành', 'Quest complete')}: ${q.t[profile.english ? 1 : 0]}<br><span style="font-weight:500">+${fmtVND(q.cash)} · +${q.xp} XP</span>`, 3), 900);
  }
  if (profile.today.bike + profile.today.food >= 10) unlock('cham_chi');
  if (profile.totals.fiveStar >= 10) unlock('nam_sao');
  if (profile.totals.perfectFood >= 5) unlock('hoan_hao');
  if ((profile.totals.km || 0) + profile.today.km >= 50) unlock('dinh_vi');
}
function showQuests() {
  const wk = WEEKLY.map(q => `${profile.week.done[q.id] ? '✅' : '⬜'} ${q.t[profile.english ? 1 : 0]} — <b>${Math.min(q.cur(), q.goal)}/${q.goal}</b> <small>(+${fmtVND(q.cash)}, +${q.xp} XP)</small>`).join('<br>');
  const qs = QUESTS.map(q => `${profile.today.quests[q.id] ? '✅' : '⬜'} ${q.t[profile.english ? 1 : 0]} — <b>${Math.min(q.cur(), q.goal)}/${q.goal}</b> <small>(+${fmtVND(q.cash)}, +${q.xp} XP)</small>`).join('<br>');
  const ach = Object.entries(ACH).map(([id, [n, d]]) => `${profile.ach[id] ? '🏅' : '🔒'} <b>${n}</b> <small>${d}</small>`).join('<br>');
  showDialog({ who: L('📋 Nhiệm vụ hôm nay', "📋 Today's quests"), text: `${qs}<hr><b>🗓️ ${L('Nhiệm vụ tuần', 'Weekly')}</b><br>${wk}<hr>${ach}<hr><small>${L('Cấp', 'Level')} ${profile.level} · XP ${profile.xp}/${xpNeed(profile.level)} · ${L('Tiết kiệm', 'Savings')} ${fmtVND(profile.savings)}</small>`, opts: [{ t: L('Đóng', 'Close') }] });
}

/* ---- end of day report + home ---- */
function reportHTML() {
  const t = profile.today, c = t.costs;
  const cost = Object.values(c).reduce((a, b) => a + b, 0);
  const avg = t.ratings.length ? (t.ratings.reduce((a, b) => a + b, 0) / t.ratings.length).toFixed(1) : '–';
  const row = (a, b) => `<tr><td>${a}</td><td style="text-align:right"><b>${b}</b></td></tr>`;
  return `<table style="width:100%;font-size:14px;border-collapse:collapse">
    ${row('🛵 GrabBike / 🍜 GrabFood', `${t.bike} / ${t.food}`)}${row('⭐ Đánh giá trung bình', avg)}${row('🛣️ Quãng đường', t.km.toFixed(1) + ' km')}
    ${row('💰 Doanh thu (gồm tip)', fmtVND(t.revenue))}${row('🎁 Tiền boa', fmtVND(t.tips))}
    ${row('⛽ Xăng', '-' + fmtVND(c.fuel))}${row('🍜 Ăn uống', '-' + fmtVND(c.food))}${row('🔧 Sửa xe', '-' + fmtVND(c.repair))}${row('🚔 Tiền phạt', '-' + fmtVND(c.fine))}${row('📦 Khác & nâng cấp', '-' + fmtVND(c.other + c.living + (c.upgrade || 0)))}
    ${row('📈 Lợi nhuận', fmtVND(t.revenue - cost))}${row('🎯 Mục tiêu', `${fmtVND(profile.money)} / ${fmtVND(profile.goal)} ${profile.money >= profile.goal ? '✅' : '❌'}`)}
    ${row('✨ XP hôm nay', '+' + t.xp)}${row('🚦 Vi phạm', t.viol)}${row('📸 Phạt nguội (camera)', fmtVND(t.camTotal || 0))}${row('🪪 Điểm GPLX', profile.license + '/12')}</table>`;
}
function endDay() {
  if (game.dayOver) return;
  game.dayOver = true; cancelOrder(); game.state = 'wait'; closeDialog(); $('police').classList.add('hidden'); if (typeof closePanel === 'function') $('mp').classList.add('hidden');
  const cam = (profile.today.cam || []).reduce((a, k) => a + LAW[k].fine, 0); if (cam) spend(cam, 'fine', true); profile.today.camTotal = cam;
  if (profile.today.bike + profile.today.food >= 5 && profile.today.viol === 0) unlock('tuan_thu');
  if (profile.money >= profile.goal) addXP(150);
  const recs = checkDayRecords();
  showOverlay(L(`📊 Báo cáo cuối ngày ${profile.day}`, `📊 Day ${profile.day} report`), reportHTML() + (recs.length ? `<p style="margin:10px 0 0;font-weight:700;color:#b45309">${recs.join('<br>')}</p>` : '') + `<p style="font-size:13px;margin:6px 0 0">${L('Té xe hôm nay', 'Falls today')}: ${profile.today.falls || 0}</p>`, L('🏠 Về nhà', '🏠 Go home'), () => setTimeout(homeMenu, 50));
}
function homeMenu() {
  game.mode = 'home'; $('hud').classList.add('hidden'); resetHome(); driver.visible = true; player.y = 0.07;
  const s = profile.st;
  showOverlayOpts(L('🏠 Ở nhà', '🏠 At home'), L(`Tiền mặt ${fmtVND(profile.cash)} · Ví ${fmtVND(profile.wallet)} · Tiết kiệm <b>${fmtVND(profile.savings)}</b><br>❤️ ${Math.round(s.hp)} · ⚡ ${Math.round(s.stamina)} · 🍚 ${Math.round(s.hunger)} · 🔧 ${Math.round(s.dura)}%`,
    `Cash ${fmtVND(profile.cash)} · Wallet ${fmtVND(profile.wallet)} · Savings <b>${fmtVND(profile.savings)}</b><br>❤️ ${Math.round(s.hp)} · ⚡ ${Math.round(s.stamina)} · 🍚 ${Math.round(s.hunger)} · 🔧 ${Math.round(s.dura)}%`), [
    { t: L(`🍲 Ăn tối (30.000đ)${profile.today.dinner ? ' ✓' : ''}`, `🍲 Dinner (30,000đ)${profile.today.dinner ? ' ✓' : ''}`), fx: () => { if (!profile.today.dinner && spend(30000, 'food')) { profile.today.dinner = true; s.hunger = 5; s.thirst = 5; s.hp = clamp01(s.hp + 10); } homeMenu(); } },
    { t: L(`🔧 Bảo dưỡng xe (${fmtVND(Math.round(Math.round(100 - s.dura) * 1200 * repairMul()))})`, `🔧 Service the bike (${fmtVND(Math.round(Math.round(100 - s.dura) * 1200 * repairMul()))})`), fx: () => { const c = Math.round(Math.round(100 - s.dura) * 1200 * repairMul()); if (c > 0 && spend(c, 'repair')) s.dura = 100; homeMenu(); } },
    { t: L('🧼 Vệ sinh túi giao hàng', '🧼 Clean the delivery bag'), fx: () => { profile.cleanBag = true; toast(L('🧼 Túi sạch: khách GrabFood hài lòng hơn ngày mai', '🧼 Clean bag: happier GrabFood customers tomorrow'), 2); homeMenu(); } },
    { t: L('🏦 Gửi tiết kiệm (giữ lại 100.000đ tiền mặt)', '🏦 Save money (keep 100,000đ cash)'), fx: () => { const m = Math.max(0, profile.cash - 100000) + Math.max(0, profile.wallet); profile.cash -= Math.max(0, profile.cash - 100000); profile.wallet -= Math.max(0, profile.wallet); profile.savings += m; toast(L(`🏦 Đã gửi ${fmtVND(m)}`, `🏦 Saved ${fmtVND(m)}`), 1.8); saveProfile(); homeMenu(); } },
    { t: L('😴 Đi ngủ → ngày mới (sinh hoạt phí 60.000đ)', '😴 Sleep → new day (living cost 60,000đ)'), fx: () => sleepNewDay() }]);
}
function sleepNewDay() {
  const s = profile.st;
  spend(60000, 'living', true);
  s.hp = clamp01(s.hp + (profile.today.dinner ? 45 : 25)); s.stamina = 100; s.stress = clamp01(s.stress - 35);
  s.hunger = profile.today.dinner ? 15 : 45; s.thirst = 20; s.phone = 100;
  profile.totals.days++; profile.totals.km = (profile.totals.km || 0) + profile.today.km;
  { const t = profile.today, cost = Object.values(t.costs).reduce((a, b) => a + b, 0);
    profile.history.push({ day: profile.day, revenue: t.revenue, profit: t.revenue - cost, trips: t.bike + t.food, rating: t.ratings.length ? (t.ratings.reduce((a, b) => a + b, 0) / t.ratings.length).toFixed(1) : '–' });
    if (profile.history.length > 30) profile.history.shift();
    if (t.viol === 0 && !profile.licBan) profile.license = Math.min(12, profile.license + 2); }
  if (fbConfig()) fbSubmitDay();
  profile.wanted = 0; if (profile.day % 7 === 0) profile.week = { orders: 0, cancels: 0, idx: (profile.week.idx || 0) + 1, trips: 0, ontime: 0, streets: [], done: {} };
  profile.day++; profile.clock = DAY_START; profile.money = 0; profile.trips = 0; profile.banned = false; profile.fines = 0;
  profile.goal = Math.max(profile.goal, 100000 + 20000 * (profile.level - 1));
  profile.today = newToday(); raincoat = false; rainTarget = 0; game.dayOver = false; game.frozen = false; game.outOfFuel = false; game.broken = false;
  saveProfile(); game.mode = 'menu'; fillMenu(); $('menu').classList.remove('hidden');
}
function showOverlayOpts(title, html, opts) {
  $('ovTitle').textContent = title; $('ovBody').innerHTML = html;
  const b = $('ovBtn'); b.classList.add('hidden');
  const box = $('ovOpts'); box.innerHTML = '';
  opts.forEach(o => { const e = document.createElement('button'); e.innerHTML = o.t; e.onclick = () => { $('overlay').classList.add('hidden'); b.classList.remove('hidden'); box.innerHTML = ''; o.fx(); }; box.appendChild(e); });
  $('overlay').classList.remove('hidden');
}

/* ---- rain ---- */
const RAIN_N = 2500;
const rainGeo = new THREE.BufferGeometry(); const rainPos = new Float32Array(RAIN_N * 6);
for (let i = 0; i < RAIN_N; i++) { const x = (Math.random() - 0.5) * 80, y = Math.random() * 30, z = (Math.random() - 0.5) * 80; rainPos.set([x, y, z, x, y - 0.7, z], i * 6); }
rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPos, 3));
const rainLines = new THREE.LineSegments(rainGeo, new THREE.LineBasicMaterial({ color: 0xaaccee, transparent: true, opacity: 0.55 }));
rainLines.frustumCulled = false; rainLines.visible = false; scene.add(rainLines);
function updateRain(dt) {
  rain += (rainTarget - rain) * Math.min(1, dt * 0.5);
  rainLines.visible = rain > 0.05;
  if (!rainLines.visible) { scene.fog.far = 680; scene.fog.near = 160; return; }
  rainLines.material.opacity = 0.55 * rain;
  rainLines.position.set(camera.position.x, camera.position.y - 12, camera.position.z);
  const p = rainGeo.attributes.position.array;
  for (let i = 0; i < RAIN_N; i++) { let y = p[i * 6 + 1] - dt * 28; if (y < 0) y += 30; p[i * 6 + 1] = y; p[i * 6 + 4] = y - 0.7; }
  rainGeo.attributes.position.needsUpdate = true;
  scene.fog.far = 680 - 480 * rain; scene.fog.near = 160 - 120 * rain;
}
