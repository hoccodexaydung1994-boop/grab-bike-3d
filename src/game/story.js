'use strict';
/* ================= Story Mode: “Giấc mơ Quận 7” với anh Tư ================= */
if (!profile.story) profile.story = { ch: 0, base: null, rain: 0, mall: false, intro: false, done: false };
const MALL = (() => {
  const cm = MAP.buildings.find(b => b.n !== undefined && NAMES[b.n] === 'Crescent Mall');
  if (cm) { let x = 0, z = 0; for (let i = 0; i < cm.p.length; i += 2) { x += cm.p[i]; z += cm.p[i + 1]; } return { x: x / (cm.p.length / 2), z: z / (cm.p.length / 2), r: 110 }; }
  const p = MAP.pois.find(p => /crescent/i.test(p.t)); return p ? { x: p.x, z: p.z, r: 80 } : { x: homeSpot.x, z: homeSpot.z, r: 150 };
})();
const avgRating = () => profile.ratings.length ? profile.ratings.reduce((a, b) => a + b, 0) / profile.ratings.length : 5;
// chapter texts & rewards: data/config/story.json · progress checks stay in code
const STORY_PROG = [
  (S) => [profile.totals.bike - S.base.bike, 3],
  (S) => [Math.min(2, profile.totals.food - S.base.food) + (S.mall ? 1 : 0), 3],
  (S) => [S.clean ? 1 : 0, 1],
  (S) => [S.rain, 2],
  (S) => [profile.totalTrips >= 20 && avgRating() >= 4.8 ? 1 : 0, 1],
  (S) => [Math.min(profile.savings, 2000000), 2000000],
];
const STORY = CFG.story.chapters.map((c, i) => ({ ...c, prog: STORY_PROG[i] }));
// anh Tư NPC next to home
const tu = buildPassengerStanding();
{
  tu.userData.shirt.color.setHex(0x00b14f);
  const e = homeSpot.E, p = edgeAt(e, e.L / 2, true), off = e.w / 2 + 2.2;
  tu.position.set(p.x - p.dz * off + p.dx * 6, 0.06, p.z + p.dx * off + p.dz * 6); tu.rotation.y = homeSpot.h - Math.PI / 2; scene.add(tu);
  const lb = labelSprite('👨‍🦳 anh Tư', L('Tài xế lâu năm · E để nói chuyện', 'Veteran driver · press E')); lb.position.set(tu.position.x, 3, tu.position.z); lb.scale.set(9, 2.25, 1); scene.add(lb); labels.push(lb);
}
const S0 = () => profile.story;
function storyStartCh(i) { const S = S0(); S.ch = i; S.base = { bike: profile.totals.bike, food: profile.totals.food }; S.rain = 0; S.mall = false; S.clean = false; saveProfile(); }
function storyTalk(first) {
  const S = S0();
  if (S.done) return showDialog({ who: '👨‍🦳 anh Tư', text: L('Chú đã làm được rồi! Giờ cứ chạy thoải mái, khi nào rảnh ghé anh uống cà phê.', 'You did it! Keep riding — come have a coffee with me anytime.'), opts: [{ t: L('☕ Dạ, cảm ơn anh Tư!', '☕ Thanks, Tư!') }] });
  const C = STORY[S.ch], [a, b] = C.prog(S);
  const lock = C.needLv && profile.level < C.needLv ? L(`<br><small>🔒 Cần đạt cấp ${C.needLv} để nhận đơn GrabFood.</small>`, `<br><small>🔒 Reach level ${C.needLv} to unlock GrabFood.</small>`) : '';
  showDialog({ who: `👨‍🦳 anh Tư — ${C.t[profile.english ? 1 : 0]}`, text: `${C.say[profile.english ? 1 : 0]}<br><br>🎯 <b>${C.goal[profile.english ? 1 : 0]}</b> · ${S.ch === 5 ? fmtVND(a) + ' / ' + fmtVND(b) : a + '/' + b}${lock}<br><small>${L('Thưởng', 'Reward')}: ${fmtVND(C.cash)} · ${C.xp} XP</small>`,
    opts: [{ t: first ? L('💪 Dạ, em làm liền!', "💪 I'm on it!") : L('👍 Dạ em nhớ rồi', '👍 Got it'), good: true }] });
}
function storyComplete() {
  const S = S0(), C = STORY[S.ch];
  earn(C.cash, 'wallet'); addXP(C.xp); ding([523, 659, 784, 1046, 1318]);
  if (S.ch === STORY.length - 1) {
    S.done = true; saveProfile();
    return setTimeout(() => showOverlay(L('🎉 Hoàn thành Story Mode!', '🎉 Story complete!'), L(`<p>Bạn đã gom đủ 2 triệu gửi về quê sửa nhà cho má. Anh Tư vỗ vai: “Từ giờ chú là tài xế Quận 7 thứ thiệt rồi!”</p><p>🏅 Danh hiệu <b>Tài xế Quận 7</b> · +${fmtVND(C.cash)} · +${C.xp} XP</p><p><small>Bạn vẫn có thể tiếp tục chạy tự do, nâng cấp xe và leo bảng xếp hạng.</small></p>`, `<p>You saved 2 million to fix your mum's house. Tư pats your shoulder: "You're a real District 7 driver now!"</p><p>+${fmtVND(C.cash)} · +${C.xp} XP</p>`), L('Tiếp tục chạy', 'Keep riding'), () => { }), 1500);
  }
  setTimeout(() => { toast(`📖 ${L('Hoàn thành', 'Completed')}: ${C.t[profile.english ? 1 : 0]}<br><span style="font-weight:500">+${fmtVND(C.cash)} · +${C.xp} XP</span>`, 3.5); storyStartCh(S.ch + 1); setTimeout(() => game.mode === 'drive' && !game.paused && storyTalk(true), 3800); }, 1200);
}
let storyT = 0;
const storyEl = document.createElement('div'); storyEl.style.cssText = 'font-size:12px;color:#fde68a;font-weight:700;margin-top:2px'; $('jam').after(storyEl);
FRAME.push((dt) => {
  if (game.mode !== 'drive') return;
  const S = S0();
  if (!S.intro && !game.paused && !game.dlgKeys && !game.order) { S.intro = true; storyStartCh(0); setTimeout(() => storyTalk(true), 800); return; }
  storyT -= dt; if (storyT > 0) return; storyT = 1;
  if (S.done || !S.base) { storyEl.textContent = S.done ? L('📖 Story Mode: hoàn thành ✓', '📖 Story: complete ✓') : ''; return; }
  if (S.ch === 1 && !S.mall && Math.hypot(player.x - MALL.x, player.z - MALL.z) < MALL.r) { S.mall = true; toast(L('🛍️ Đã ghé Crescent Mall', '🛍️ Visited Crescent Mall'), 1.6); }
  const C = STORY[S.ch], [a, b] = C.prog(S);
  storyEl.textContent = `📖 ${C.goal[profile.english ? 1 : 0]}: ${S.ch === 5 ? Math.round(a / 1000) + 'k/' + Math.round(b / 1000) + 'k' : a + '/' + b}`;
  if (a >= b && !game.paused && !S.pending) { S.pending = true; storyComplete(); setTimeout(() => S.pending = false, 2000); }
});
// hooks: rain jobs, clean day, talk
{
  const rainy = () => rain > 0.3;
  const _do = dropOff; dropOff = function () { const r = rainy(); _do(); if (r && S0().ch === 3) S0().rain++; };
  const _cs = completeSub; completeSub = function (o, sub) { const r = rainy(); const out = _cs(o, sub); if (r && S0().ch === 3) S0().rain++; return out; };
  const _ed = endDay; endDay = function () { const S = S0(); if (S.ch === 2 && !game.dayOver && profile.today.bike + profile.today.food >= 5 && profile.today.viol === 0) S.clean = true; _ed(); };
  const _sq = showQuests; showQuests = function () { _sq(); const S = S0(); if (!S.base && !S.done) return; const C = STORY[S.ch];
    $('dlgText').innerHTML = `<b>📖 Story Mode</b> — ${S.done ? L('đã hoàn thành ✓', 'complete ✓') : `${C.t[profile.english ? 1 : 0]}: ${C.goal[profile.english ? 1 : 0]}`}<hr>` + $('dlgText').innerHTML; };
}
ACTION_HOOKS.push((opts) => { if (Math.hypot(tu.position.x - player.x, tu.position.z - player.z) < 22) opts.unshift({ t: L('💬 Nói chuyện với anh Tư', '💬 Talk to Tư'), fx: () => setTimeout(() => storyTalk(false), 50) }); });
