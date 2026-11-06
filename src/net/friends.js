'use strict';
/* ================= Bạn bè online: xe & độ cao thật, bản đồ bạn bè, danh sách bạn, chỉ đường tới bạn ================= */
if (!profile.friends) profile.friends = {};          // tên → { lv, seen, room, bk }
if (!profile.rooms) profile.rooms = [];              // phòng đã vào gần đây
BOOT.push(() => {
  const _nm = netMsg;
  netMsg = () => Object.assign(_nm(), { y: +player.y.toFixed(2), bk: profile.bikeId, pt: game.order ? 1 : 0 });
});
const FR = { target: null, waveCD: 0 };
function remoteBikeMesh(bk) {
  const B = BIKES[bk] || BIKES.vespa;
  if (B.model === 'vespa') return bike.model ? bike.model.clone(true) : new THREE.Mesh(new THREE.BoxGeometry(0.6, 1, 1.8), std(0x00b14f));
  const m = B.model === 'underbone' ? buildUnderbone(parseInt(B.color.slice(1), 16)) : buildScooter(parseInt(B.color.slice(1), 16));
  m.position.y = B.model === 'underbone' ? -0.12 : -0.05; return m;
}
let frSaveT = 0;
FRAME.push((dt) => {
  FR.waveCD -= dt; frSaveT -= dt;
  for (const [id, r] of NET.remotes) {
    const d = r.data || {};
    // bike model follows what the friend rides
    const bk = d.bk || 'vespa';
    if (r.bk !== bk && (bk !== 'vespa' || bike.model)) { r.bk = bk; const old = r.lean.children[0]; if (old) r.lean.remove(old); r.lean.add(remoteBikeMesh(bk)); r.lean.children.unshift(r.lean.children.pop()); }
    // real height (bridges) + passenger when carrying a customer
    r.y = (r.y ?? 0.07) + (((d.y ?? 0.07)) - (r.y ?? 0.07)) * Math.min(1, dt * 8); r.g.position.y = r.y;
    // remember friends
    if (d.n && frSaveT <= 0) { const f = profile.friends[d.n] || {}; Object.assign(f, { lv: d.lv, seen: Date.now(), room: NET.code, bk }); profile.friends[d.n] = f; }
  }
  if (frSaveT <= 0) frSaveT = 5;
  if (NET.code && profile.rooms[0] !== NET.code) { profile.rooms = [NET.code, ...profile.rooms.filter(c => c !== NET.code)].slice(0, 5); saveProfile(); }
  // follow-a-friend waypoint
  if (FR.target) {
    const r = NET.remotes.get(FR.target);
    if (!r) { FR.target = null; toast(L('👋 Bạn đã rời phòng', '👋 Your friend left'), 1.6); }
    else {
      SIDEQ_MARKS.push({ x: r.x, z: r.z, t: '👥', c: '#22d3ee' });
      const dd = Math.hypot(r.x - player.x, r.z - player.z);
      if (dd < 12 && game.mode === 'drive') { FR.target = null; toast(L(`🤝 Đã gặp ${r.data.n}!`, `🤝 You met ${r.data.n}!`), 2); if (!profile.today.metFriend) { profile.today.metFriend = 1; addXP(20); } }
    }
  }
  if (game.mode === 'drive') for (const [id, r] of NET.remotes) if (r.data && id !== FR.target) SIDEQ_MARKS.push({ x: r.x, z: r.z, t: '🛵', c: '#22d3ee' });
});
// friend names on the minimap edge are drawn by world/hotzones.js (SIDEQ_MARKS)
function frFollow(id) { FR.target = id; const r = NET.remotes.get(id); if (r) toast(L(`📍 Đang chỉ đường tới ${r.data.n} (biểu tượng 👥 trên bản đồ)`, `📍 Showing ${r.data.n} on the map (👥)`), 2.5); closePanel(); }
function frWave(name) { if (FR.waveCD > 0) return; FR.waveCD = 3; chatSend(L(`👋 Chào ${name}!`, `👋 Hi ${name}!`)); horn(); }
function frJoin(code) { closePanel(); if (game.mode !== 'menu') toast(L('Về menu chính để vào phòng', 'Go to the main menu to join'), 2); else netJoin(code); }
{ const b = document.createElement('button'); b.dataset.tab = 'friends'; b.textContent = '👥 Bạn bè'; $('mpTabs').insertBefore(b, $('mpClose')); }
{
  const _rp = renderPanel;
  renderPanel = function () {
    _rp(); if (panelTab !== 'friends') return;
    const online = [...NET.remotes.entries()], ago = (t) => { const m = Math.round((Date.now() - t) / 60000); return m < 1 ? L('vừa xong', 'just now') : m < 60 ? m + L(' phút trước', ' min ago') : Math.round(m / 60) + L(' giờ trước', ' h ago'); };
    let h = `<h3>👥 ${L('Bạn bè', 'Friends')}</h3><p>${NET.code ? L(`🌐 Đang ở phòng <b>${NET.code}</b> — gửi mã này cho bạn bè`, `🌐 In room <b>${NET.code}</b>`) : L('Chưa vào phòng. Ở menu chính: tạo phòng hoặc nhập mã phòng.', 'Not in a room. Create or join one from the main menu.')}</p>`;
    h += `<h4>🟢 ${L('Đang online cùng phòng', 'Online in your room')} (${online.length})</h4>` + (online.map(([id, r]) => { const d = r.data, dist = Math.hypot(r.x - player.x, r.z - player.z);
      return `<div class="sk"><div><b>${d.n}</b> · Lv${d.lv} · ${(BIKES[d.bk] || BIKES.vespa).n[0]}<br><small>${d.st === 'bike' ? '🛵 ' + L('đang chở khách', 'carrying a passenger') : d.st === 'food' ? '🍜 ' + L('đang giao đồ ăn', 'delivering food') : '⏳ ' + L('đang chờ cuốc', 'waiting')} · ${fmtVND(d.m)} · ${dist > 1000 ? (dist / 1000).toFixed(1) + ' km' : Math.round(dist) + ' m'}</small></div>
        <span><button data-fr="follow" data-id="${id}">📍 ${L('Tìm', 'Find')}</button> <button data-fr="wave" data-id="${d.n}">👋</button></span></div>`; }).join('') || `<p><small>${L('Chưa có ai.', 'Nobody yet.')}</small></p>`);
    const fl = Object.entries(profile.friends).sort((a, b) => b[1].seen - a[1].seen).slice(0, 20);
    h += `<h4>📒 ${L('Đã từng chơi cùng', 'Played with')}</h4><table class="kv">${fl.map(([n, f]) => `<tr><td><b>${n}</b> · Lv${f.lv || 1}</td><td><small>${ago(f.seen)} · ${L('phòng', 'room')} ${f.room || '–'}</small> ${f.room ? `<button class="chip" data-fr="join" data-id="${f.room}">${L('Vào', 'Join')}</button>` : ''}</td></tr>`).join('') || `<tr><td>${L('Chưa có', 'None yet')}</td></tr>`}</table>`;
    h += `<h4>🕘 ${L('Phòng gần đây', 'Recent rooms')}</h4><p>${profile.rooms.map(c => `<button class="chip" data-fr="join" data-id="${c}">${c}</button>`).join(' ') || L('Chưa có', 'None yet')}</p>`;
    $('mpBody').innerHTML = h;
  };
  $('mpBody').addEventListener('click', (e) => {
    const b = e.target.closest('[data-fr]'); if (!b) return;
    const a = b.dataset.fr, id = b.dataset.id;
    if (a === 'follow') frFollow(id); else if (a === 'wave') frWave(id); else if (a === 'join') frJoin(id);
  });
}
