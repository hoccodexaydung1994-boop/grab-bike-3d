'use strict';
/* ================= Online: chơi cùng bạn bè (PeerJS, mã phòng) ================= */
const NET = { peer: null, conns: [], host: false, code: '', remotes: new Map(), sendT: 0, status: 'off', mode: '' };
/* ---- Firebase (máy chủ riêng). Dán cấu hình vào FIREBASE_CONFIG hoặc nhập trong game. ---- */
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyAReenNi6S_qfmDfSX21_gNRBHyETx1CZQ",
  authDomain: "grab-bike-131c2.firebaseapp.com",
  databaseURL: "https://grab-bike-131c2-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "grab-bike-131c2",
  storageBucket: "grab-bike-131c2.firebasestorage.app",
  messagingSenderId: "1072629876994",
  appId: "1:1072629876994:web:cf8cb979ccbc5b683f9a1b"
};
const FB_KEY = 'grabbike.firebase';
function fbConfig() { if (FIREBASE_CONFIG) return FIREBASE_CONFIG; try { return JSON.parse(localStorage.getItem(FB_KEY) || 'null'); } catch (e) { return null; } }
function parseFbConfig(text) {
  const o = {}; let m; const re = /(\w+)\s*["']?\s*:\s*["']([^"']+)["']/g;
  while ((m = re.exec(text))) o[m[1]] = m[2];
  return o.apiKey && o.databaseURL && o.projectId ? o : null;
}
let FB = null;
async function fbInit() {
  if (FB) return FB;
  const cfg = fbConfig(); if (!cfg) return null;
  const base = 'https://www.gstatic.com/firebasejs/10.12.2/';
  const [appM, dbM, authM] = await Promise.all([import(base + 'firebase-app.js'), import(base + 'firebase-database.js'), import(base + 'firebase-auth.js')]);
  const app = appM.initializeApp(cfg);
  const auth = authM.getAuth(app);
  if (auth.authStateReady) await auth.authStateReady();   // giữ phiên đăng nhập Google cũ nếu có
  const user = auth.currentUser || (await authM.signInAnonymously(auth)).user;
  FB = { db: dbM.getDatabase(app), api: dbM, uid: user.uid, auth, authM, user };
  return FB;
}
async function fbRoom(code) {
  try {
    netSetStatus('wait', L('⏳ Đang kết nối máy chủ Firebase…', '⏳ Connecting to Firebase…'));
    const F = await fbInit(); if (!F) return false;
    const { ref, set, onValue, onDisconnect, onChildAdded, query, limitToLast } = F.api;
    NET.mode = 'fb'; NET.code = code; NET.myId = F.uid;
    NET.meRef = ref(F.db, `rooms/${code}/players/${F.uid}`);
    await onDisconnect(NET.meRef).remove();
    await set(NET.meRef, netMsg());
    onValue(ref(F.db, `rooms/${code}/players`), snap => {
      const v = snap.val() || {};
      for (const [id, d] of Object.entries(v)) if (id !== F.uid) netRecv(Object.assign({}, d, { t: 's', id }));
      for (const id of [...NET.remotes.keys()]) if (!v[id]) { scene.remove(NET.remotes.get(id).g); NET.remotes.delete(id); }
    });
    NET.chatRef = ref(F.db, `rooms/${code}/chat`);
    onChildAdded(query(NET.chatRef, limitToLast(15)), s => chatShow(s.val()));
    netSetStatus('on', L(`✅ Phòng <b>${code}</b> (Firebase) — gửi mã này cho bạn bè`, `✅ Room <b>${code}</b> (Firebase) — share this code`));
    return true;
  } catch (e) {
    console.error(e);
    netSetStatus('err', '⚠️ Firebase: ' + (e.code || e.message || e) + L('<br><small>Kiểm tra: bật Anonymous Auth, tạo Realtime Database, thêm tên miền github.io vào Authorized domains, dán đúng luật bảo mật.</small>', ''));
    return false;
  }
}
function netMsg() {
  return { n: profile.name, lv: profile.level, x: +player.x.toFixed(2), z: +player.z.toFixed(2), h: +player.h.toFixed(3), l: +player.lean.toFixed(3),
    m: profile.money, st: game.state === 'ride' ? (game.order?.type === 'ride' ? 'bike' : 'food') : game.state, ts: Date.now() };
}
const chatLog = [];
function chatShow(c) { if (!c || !c.text) return; chatLog.push(c); if (chatLog.length > 6) chatLog.shift(); if (c.uid !== NET.myId) toast(`💬 <b>${c.n}</b>: ${String(c.text).slice(0, 80)}`, 2.5); lbT = 0; }
function chatSend(text) {
  text = (text || '').trim().slice(0, 120); if (!text || NET.status !== 'on') return;
  if (NET.mode === 'fb') FB.api.push(NET.chatRef, { uid: NET.myId, n: profile.name, text, ts: Date.now() });
  else { const c = { t: 'c', uid: NET.peer.id, n: profile.name, text }; chatShow(c); for (const x of NET.conns) if (x.open) x.send(c); }
}
async function fbSubmitDay() {
  try {
    const F = await fbInit(); if (!F) return;
    const { ref, set } = F.api;
    const best = Math.max(profile.bestDay || 0, profile.money); profile.bestDay = best;
    await set(ref(F.db, `leaderboard/${F.uid}`), { n: profile.name, lv: profile.level, total: profile.totalMoney, days: profile.totals.days + 1, best, ts: Date.now() });
  } catch (e) { console.warn(e); }
}
async function fbLeaderboard() {
  const box = $('gLb'); box.innerHTML = L('⏳ Đang tải…', '⏳ Loading…');
  try {
    const F = await fbInit(); if (!F) { box.innerHTML = L('Chưa cấu hình Firebase.', 'Firebase not configured.'); return; }
    const { ref, get, query, orderByChild, limitToLast } = F.api;
    const snap = await get(query(ref(F.db, 'leaderboard'), orderByChild('total'), limitToLast(10)));
    const rows = []; snap.forEach(c => { rows.push(Object.assign({ uid: c.key }, c.val())); });
    rows.sort((a, b) => b.total - a.total);
    box.innerHTML = rows.length ? rows.map((r, i) => `${['🥇', '🥈', '🥉'][i] || (i + 1) + '.'} ${r.uid === F.uid ? '<b>' : ''}${r.n}${r.uid === F.uid ? ' (bạn)</b>' : ''} · Lv${r.lv} · ${fmtVND(r.total)} · ${r.days} ${L('ngày', 'days')}`).join('<br>') : L('Chưa có ai trên bảng — hãy hoàn thành một ngày!', 'Nobody yet — finish a day!');
  } catch (e) { box.innerHTML = '⚠️ ' + (e.code || e.message); }
}
async function netPeerClass() {
  const m = await import('https://cdn.jsdelivr.net/npm/peerjs@1.5.4/+esm');
  return m.Peer || m.default;
}
function netSetStatus(s, html) { NET.status = s; $('netStatus').innerHTML = html; $('lb').classList.toggle('hidden', s !== 'on'); }
async function netHost() {
  if (fbConfig()) return fbRoom(Math.random().toString(36).slice(2, 7).toUpperCase());
  try {
    netSetStatus('wait', L('⏳ Đang tạo phòng…', '⏳ Creating room…'));
    const Peer = await netPeerClass();
    NET.code = Math.random().toString(36).slice(2, 7).toUpperCase(); NET.host = true;
    NET.peer = new Peer('grabq7-' + NET.code);
    NET.peer.on('open', () => netSetStatus('on', L(`✅ Phòng <b>${NET.code}</b> — gửi mã này cho bạn bè`, `✅ Room <b>${NET.code}</b> — share this code`)));
    NET.peer.on('connection', c => netConn(c));
    NET.peer.on('error', e => netSetStatus('err', '⚠️ ' + (e.type || e.message || e)));
  } catch (e) { netSetStatus('err', L('⚠️ Không tải được thư viện online (cần internet)', '⚠️ Could not load the online library')); }
}
async function netJoin(code) {
  code = (code || '').trim().toUpperCase(); if (!code) return;
  if (fbConfig()) return fbRoom(code);
  try {
    netSetStatus('wait', L('⏳ Đang vào phòng…', '⏳ Joining…'));
    const Peer = await netPeerClass();
    NET.code = code; NET.host = false;
    NET.peer = new Peer();
    NET.peer.on('open', () => netConn(NET.peer.connect('grabq7-' + code, { reliable: false })));
    NET.peer.on('error', e => netSetStatus('err', '⚠️ ' + (e.type === 'peer-unavailable' ? L('Không tìm thấy phòng', 'Room not found') : (e.type || e))));
  } catch (e) { netSetStatus('err', L('⚠️ Không tải được thư viện online (cần internet)', '⚠️ Could not load the online library')); }
}
function netConn(c) {
  c.on('open', () => { NET.conns.push(c); netSetStatus('on', L(`✅ Đã kết nối phòng <b>${NET.code}</b>`, `✅ Connected to room <b>${NET.code}</b>`)); toast(L('🌐 Có người chơi kết nối!', '🌐 A player connected!'), 1.8); });
  c.on('data', d => netRecv(d, c));
  c.on('close', () => { NET.conns = NET.conns.filter(x => x !== c); });
}
function netRecv(d, from) {
  if (d && d.t === 'c') { if (NET.host) for (const c of NET.conns) if (c !== from && c.open) c.send(d); chatShow(d); return; }
  if (!d || d.t !== 's') return;
  if (NET.host) for (const c of NET.conns) if (c !== from && c.open) c.send(d);   // host relays to everyone
  let r = NET.remotes.get(d.id);
  if (!r) {
    const g = new THREE.Group();
    const model = bike.model ? bike.model.clone(true) : new THREE.Mesh(new THREE.BoxGeometry(0.6, 1, 1.8), std(0x00b14f));
    const lean = new THREE.Group(); lean.add(model);
    const rider = buildDriver(); lean.add(rider); g.add(lean);
    const tag = labelSprite(d.n || 'Tài xế', `Lv${d.lv || 1}`); tag.position.y = 2.6; tag.scale.set(6, 1.5, 1); g.add(tag);
    scene.add(g);
    r = { g, lean, x: d.x, z: d.z, h: d.h, data: d }; NET.remotes.set(d.id, r);
  }
  r.data = d; r.seen = performance.now();
}
function netTick(dt) {
  if (NET.status !== 'on' || (!NET.peer && NET.mode !== 'fb')) return;
  NET.sendT -= dt;
  if (NET.sendT <= 0) {
    if (NET.mode === 'fb') { NET.sendT = 0.2; FB.api.set(NET.meRef, netMsg()).catch(() => { }); }
    else { NET.sendT = 0.1; const msg = Object.assign(netMsg(), { t: 's', id: NET.peer.id }); for (const c of NET.conns) if (c.open) c.send(msg); }
  }
  const now = performance.now(), k = 1 - Math.exp(-dt * 10);
  for (const [id, r] of NET.remotes) {
    if (now - r.seen > 8000) { scene.remove(r.g); NET.remotes.delete(id); continue; }
    r.x += (r.data.x - r.x) * k; r.z += (r.data.z - r.z) * k; r.h = angLerp(r.h, r.data.h, k);
    r.g.position.set(r.x, 0.07, r.z); r.g.rotation.y = r.h; r.lean.rotation.z = r.data.l || 0;
  }
  netBoard();
}
let lbT = 0;
function netBoard() {
  if ((lbT -= 1) > 0) return; lbT = 30;
  const rows = [{ n: profile.name + ' (bạn)', m: profile.money, lv: profile.level, st: game.state }, ...[...NET.remotes.values()].map(r => ({ n: r.data.n, m: r.data.m, lv: r.data.lv, st: r.data.st }))]
    .sort((a, b) => b.m - a.m);
  const ic = (s) => s === 'bike' ? '🛵' : s === 'food' ? '🍜' : s === 'pickup' ? '📍' : '⏳';
  $('lbRows').innerHTML = `<b>🌐 ${L('Phòng', 'Room')} ${NET.code}</b><br>` + rows.map((r, i) => `${i + 1}. ${ic(r.st)} ${r.n} · Lv${r.lv} · <b>${fmtVND(r.m)}</b>`).join('<br>')
    + (chatLog.length ? '<hr style="opacity:.3">' + chatLog.map(c => `💬 <b>${c.n}</b>: ${String(c.text).replace(/</g, '&lt;')}`).join('<br>') : '');
}
$('bHost').onclick = () => netHost();
$('bJoin').onclick = () => netJoin($('joinCode').value);

$('chatIn').addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Enter') { chatSend(e.target.value); e.target.value = ''; } });
$('chatIn').addEventListener('keyup', (e) => e.stopPropagation());
$('bFbSave').onclick = () => { const c = parseFbConfig($('fbCfg').value); if (!c) { $('fbMsg').textContent = L('⚠️ Không đọc được cấu hình — cần có apiKey, databaseURL, projectId.', '⚠️ Invalid config.'); return; } localStorage.setItem(FB_KEY, JSON.stringify(c)); FB = null; $('fbMsg').textContent = L(`✅ Đã lưu cấu hình dự án ${c.projectId}`, `✅ Saved ${c.projectId}`); fbStatusLine(); };
$('bFbClear').onclick = () => { localStorage.removeItem(FB_KEY); FB = null; $('fbMsg').textContent = L('Đã xoá cấu hình.', 'Cleared.'); fbStatusLine(); };
$('bGlb').onclick = () => { $('gLbBox').classList.toggle('hidden'); if (!$('gLbBox').classList.contains('hidden')) fbLeaderboard(); };
function fbStatusLine() { const c = fbConfig(); $('fbLine').innerHTML = c ? L(`🔥 Máy chủ: Firebase <b>${c.projectId}</b>`, `🔥 Server: Firebase <b>${c.projectId}</b>`) : L('🔗 Chưa có Firebase — dùng kết nối trực tiếp (PeerJS)', '🔗 No Firebase — using direct P2P'); }
fbStatusLine();
