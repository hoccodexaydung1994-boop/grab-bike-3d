'use strict';
/* ================= Quản lý dữ liệu: slot lưu, sao lưu tự động, xuất/nhập file, đám mây (Google) ================= */
const SAVE = {
  slotKey: (i) => 'grabbike.q7.slot.' + i,
  backupKey: 'grabbike.q7.backups',
  SLOTS: 3, MAX_BACKUPS: 5, SCHEMA: 3,
};
function profileMeta(p = profile) { return { name: p.name, day: p.day, level: p.level, total: p.totalMoney, savings: p.savings || 0, ts: Date.now(), v: GAME_VERSION }; }
function packProfile(p = profile) { return { app: 'grab-bike-3d-q7', schema: SAVE.SCHEMA, meta: profileMeta(p), profile: p }; }
function validPack(o) { return o && o.profile && typeof o.profile.day === 'number' && typeof o.profile.level === 'number'; }
function readJSON(k) { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } }
function writeJSON(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { toast(L('⚠️ Bộ nhớ trình duyệt đầy, không lưu được', '⚠️ Browser storage is full'), 2.5); return false; } }
/* migrate old / imported profiles: fill every field the current version expects */
function migrateProfile(p) {
  const d = defaultProfile(); const out = Object.assign(d, p);
  out.schema = SAVE.SCHEMA;
  return out;
}
function applyPack(pack, why) {
  if (!validPack(pack)) { toast(L('⚠️ File dữ liệu không hợp lệ', '⚠️ Invalid save data'), 2.5); return; }
  makeBackup(L('trước khi ', 'before ') + why);
  saveProfile = () => { };                      // không ghi đè dữ liệu vừa nạp trong lúc tải lại trang
  localStorage.setItem(PROFILE_KEY, JSON.stringify(migrateProfile(pack.profile)));
  location.reload();
}
/* ---- slots ---- */
function slotInfo(i) { return readJSON(SAVE.slotKey(i)); }
function saveSlot(i) { saveProfile(); if (writeJSON(SAVE.slotKey(i), packProfile())) toast(L(`💾 Đã lưu vào ô ${i}`, `💾 Saved to slot ${i}`), 1.6); }
function loadSlot(i) { const s = slotInfo(i); if (s) applyPack(s, L(`tải ô ${i}`, `loading slot ${i}`)); }
function deleteSlot(i) { localStorage.removeItem(SAVE.slotKey(i)); }
/* ---- automatic backups (each new day + before any load/import) ---- */
function makeBackup(note) {
  const list = readJSON(SAVE.backupKey) || [];
  list.unshift(Object.assign(packProfile(), { note: note || '' }));
  while (list.length > SAVE.MAX_BACKUPS) list.pop();
  writeJSON(SAVE.backupKey, list);
}
{ const _snd = sleepNewDay; sleepNewDay = function () { _snd(); makeBackup(L(`đầu ngày ${profile.day}`, `start of day ${profile.day}`)); if (cloudUser()) cloudSave(true); }; }
/* ---- export / import a .json file ---- */
function exportProfile() {
  saveProfile();
  const blob = new Blob([JSON.stringify(packProfile(), null, 1)], { type: 'application/json' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
  a.download = `grabbike-q7-${(profile.name || 'taixe').replace(/[^\w\-]+/g, '_')}-ngay${profile.day}.json`;
  document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  toast(L('📤 Đã xuất file hồ sơ', '📤 Profile exported'), 1.8);
}
function importProfile() {
  const inp = document.createElement('input'); inp.type = 'file'; inp.accept = '.json,application/json';
  inp.onchange = () => { const f = inp.files[0]; if (!f) return; const r = new FileReader(); r.onload = () => { let o = null; try { o = JSON.parse(r.result); } catch (e) { } if (o && !o.profile && typeof o.day === 'number') o = { profile: o }; applyPack(o, L('nhập file', 'import')); }; r.readAsText(f); };
  inp.click();
}
/* ---- cloud save with Google login (Firebase Auth + Realtime Database: users/{uid}) ---- */
const cloudUser = () => FB && FB.user && !FB.user.isAnonymous ? FB.user : null;
async function googleLogin() {
  try {
    const F = await fbInit(); if (!F) return toast(L('Chưa cấu hình Firebase', 'Firebase not configured'), 2);
    const A = F.authM, prov = new A.GoogleAuthProvider(); let cred;
    try { cred = F.auth.currentUser && F.auth.currentUser.isAnonymous ? await A.linkWithPopup(F.auth.currentUser, prov) : await A.signInWithPopup(F.auth, prov); }
    catch (e) { if (e.code === 'auth/credential-already-in-use') cred = await A.signInWithCredential(F.auth, A.GoogleAuthProvider.credentialFromError(e)); else throw e; }
    F.user = cred.user; F.uid = cred.user.uid;
    toast(L(`✅ Đã đăng nhập: ${cred.user.displayName || cred.user.email}`, `✅ Signed in: ${cred.user.displayName || cred.user.email}`), 2.5);
    const cl = await cloudPeek(); if (!cl) await cloudSave(true);
  } catch (e) { console.error(e); toast('⚠️ Google: ' + (e.code || e.message) + L('<br><small>Bật Google trong Firebase › Authentication › Sign-in method</small>', ''), 4); }
  if (panelTab === 'data') renderPanel();
}
async function googleLogout() { try { if (FB) { await FB.authM.signOut(FB.auth); FB = null; } toast(L('Đã đăng xuất', 'Signed out'), 1.5); } catch (e) { } if (panelTab === 'data') renderPanel(); }
async function cloudPeek() { const F = await fbInit(); const u = cloudUser(); if (!F || !u) return null; const s = await F.api.get(F.api.ref(F.db, `users/${u.uid}/save`)); return s.val(); }
async function cloudSave(quiet) {
  try { const F = await fbInit(); const u = cloudUser(); if (!u) return;
    saveProfile(); const pk = packProfile();
    await F.api.set(F.api.ref(F.db, `users/${u.uid}/save`), { meta: pk.meta, data: JSON.stringify(pk), ts: Date.now() });
    SAVE.cloudMeta = pk.meta; if (!quiet) toast(L('☁️ Đã lưu lên đám mây', '☁️ Saved to cloud'), 1.8);
  } catch (e) { console.error(e); if (!quiet) toast('⚠️ ' + (e.code || e.message), 3); }
  if (panelTab === 'data' && !$('mp').classList.contains('hidden')) renderPanel();
}
async function cloudLoad() {
  try { const v = await cloudPeek(); if (!v) return toast(L('Chưa có bản lưu trên đám mây', 'No cloud save yet'), 2); applyPack(JSON.parse(v.data), L('tải từ đám mây', 'cloud load')); }
  catch (e) { toast('⚠️ ' + (e.code || e.message), 3); }
}
BOOT.push(async () => {   // phiên Google cũ → lấy thông tin bản lưu đám mây
  if (!fbConfig()) return;
  try { await fbInit(); if (cloudUser()) { const v = await cloudPeek(); SAVE.cloudMeta = v ? v.meta : null; } } catch (e) { }
});
/* ---- panel tab 💾 ---- */
{ const b = document.createElement('button'); b.dataset.tab = 'data'; b.textContent = '💾 Dữ liệu'; $('mpTabs').insertBefore(b, $('mpClose')); }
const metaLine = (m) => m ? `<b>${m.name}</b> · ${L('Ngày', 'Day')} ${m.day} · ${L('Cấp', 'Lv')} ${m.level} · ${fmtVND(m.total || 0)} · <small>${new Date(m.ts).toLocaleString('vi-VN')}</small>` : `<i>${L('Trống', 'Empty')}</i>`;
{
  const _rp = renderPanel;
  renderPanel = function () {
    _rp(); if (panelTab !== 'data') return;
    const u = cloudUser(), bk = readJSON(SAVE.backupKey) || [];
    let used = 0; try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k.startsWith('grabbike')) used += (localStorage.getItem(k) || '').length; } } catch (e) { }
    let h = `<h3>💾 ${L('Quản lý dữ liệu', 'Data management')}</h3>
      <p>${L('Đang chơi', 'Playing')}: ${metaLine(profileMeta())}<br><small>${L('Bộ nhớ trình duyệt đang dùng', 'Browser storage used')}: ${(used / 1024).toFixed(0)} KB · ${L('tự lưu mỗi 5 giây', 'autosaves every 5 s')}</small></p>
      <h4>🗂️ ${L('Ô lưu', 'Save slots')}</h4><table class="kv">`;
    for (let i = 1; i <= SAVE.SLOTS; i++) { const s = slotInfo(i);
      h += `<tr><td>${L('Ô', 'Slot')} ${i}: ${metaLine(s && s.meta)}</td><td style="white-space:nowrap"><button class="chip" data-sv="save" data-i="${i}">💾</button>${s ? ` <button class="chip" data-sv="load" data-i="${i}">📂</button> <button class="chip danger" data-sv="del" data-i="${i}">🗑️</button>` : ''}</td></tr>`; }
    h += `</table><p><small>💾 ${L('lưu tiến trình hiện tại vào ô', 'save current progress')} · 📂 ${L('chơi tiếp từ ô này (tiến trình hiện tại được sao lưu tự động)', 'continue from this slot (current progress is backed up)')}</small></p>
      <h4>📁 ${L('Sao lưu ra file', 'File backup')}</h4><p><button class="chip" data-sv="export">📤 ${L('Xuất file .json', 'Export .json')}</button> <button class="chip" data-sv="import">📥 ${L('Nhập file .json', 'Import .json')}</button><br><small>${L('Dùng để chuyển hồ sơ sang máy khác hoặc cất giữ.', 'Move your profile to another device.')}</small></p>
      <h4>☁️ ${L('Đám mây · Google', 'Cloud · Google')}</h4><p>`;
    if (!fbConfig()) h += L('Chưa cấu hình Firebase (xem tab Online ở menu).', 'Firebase not configured.');
    else if (!u) h += `<button class="chip" data-sv="glogin">🔐 ${L('Đăng nhập Google', 'Sign in with Google')}</button><br><small>${L('Đăng nhập để lưu hồ sơ lên mạng và chơi tiếp trên điện thoại/máy khác.', 'Sign in to keep your profile online and continue on other devices.')}</small>`;
    else h += `✅ ${u.displayName || ''} <small>${u.email || ''}</small><br>${L('Bản trên mây', 'Cloud copy')}: ${metaLine(SAVE.cloudMeta)}<br>
      <button class="chip" data-sv="csave">☁️⬆ ${L('Lưu lên mây', 'Upload')}</button> <button class="chip" data-sv="cload">☁️⬇ ${L('Tải từ mây', 'Download')}</button> <button class="chip" data-sv="glogout">${L('Đăng xuất', 'Sign out')}</button><br><small>${L('Tự lưu lên mây mỗi khi sang ngày mới.', 'Auto-uploads every new day.')}</small>`;
    h += `</p><h4>🕘 ${L('Bản sao lưu tự động', 'Automatic backups')}</h4><table class="kv">${bk.map((b, i) => `<tr><td>${metaLine(b.meta)} <small>${b.note || ''}</small></td><td><button class="chip" data-sv="restore" data-i="${i}">↩️</button></td></tr>`).join('') || `<tr><td>${L('Chưa có', 'None yet')}</td></tr>`}</table>`;
    $('mpBody').innerHTML = h;
  };
}
let svArm = '';
$('mpBody').addEventListener('click', (e) => {
  const b = e.target.closest('[data-sv]'); if (!b) return;
  const a = b.dataset.sv, i = +b.dataset.i;
  const confirm2 = (key, label) => { if (svArm === key) { svArm = ''; return true; } svArm = key; b.textContent = label; return false; };
  if (a === 'save') { if (slotInfo(i) && !confirm2('s' + i, L('Ghi đè?', 'Overwrite?'))) return; saveSlot(i); }
  if (a === 'load' && confirm2('l' + i, L('Chắc chưa?', 'Sure?'))) loadSlot(i);
  if (a === 'del' && confirm2('d' + i, L('Xoá?', 'Delete?'))) deleteSlot(i);
  if (a === 'export') exportProfile();
  if (a === 'import') importProfile();
  if (a === 'restore' && confirm2('r' + i, L('Khôi phục?', 'Restore?'))) { const bk = readJSON(SAVE.backupKey) || []; if (bk[i]) applyPack(bk[i], L('khôi phục', 'restore')); }
  if (a === 'glogin') googleLogin();
  if (a === 'glogout') googleLogout();
  if (a === 'csave') cloudSave(false);
  if (a === 'cload' && confirm2('c', L('Thay bằng bản trên mây?', 'Replace with cloud copy?'))) cloudLoad();
  if (!svArm && !['glogin', 'csave', 'cload'].includes(a)) renderPanel();
});
$('bData').onclick = () => { panelTab = 'data'; $('mp').classList.remove('hidden'); renderPanel(); };
