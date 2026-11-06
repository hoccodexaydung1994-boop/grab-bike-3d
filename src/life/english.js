'use strict';
/* ================= Học tiếng Anh (data/config/english.json) + khách nước ngoài ================= */
const LESSONS = CFG.english.lessons;
if (!profile.eng) profile.eng = { passed: {}, best: {} };
const engPassed = () => Object.keys(profile.eng.passed).length;
const foreignUnlocked = () => engPassed() >= 2;
function startLesson(id) {
  const Ls = LESSONS.find(l => l.id === id); let score = 0, i = 0;
  const wasPanel = !$('mp').classList.contains('hidden'); $('mp').classList.add('hidden');
  const vocab = Ls.vocab.map(([en, vi]) => `🇬🇧 <b>${en}</b><br>🇻🇳 <i>${vi}</i>`).join('<br><br>');
  const ask = () => {
    if (i >= Ls.quiz.length) return finish();
    const q = Ls.quiz[i];
    showDialog({ who: `🇬🇧 ${Ls.t[0]} — ${L('câu', 'question')} ${i + 1}/${Ls.quiz.length}`, text: q.q, opts: q.o.map((t, k) => ({ t, fx: () => { if (k === q.a) { score++; toast('✅ Correct!', 1); ding([880]); } else toast(`❌ ${L('Đáp án', 'Answer')}: ${q.o[q.a]}`, 2); i++; setTimeout(ask, 600); } })) });
  };
  const finish = () => {
    const pass = score >= Ls.quiz.length - 1, first = pass && !profile.eng.passed[id];
    profile.eng.best[id] = Math.max(profile.eng.best[id] || 0, score);
    if (pass) profile.eng.passed[id] = true;
    if (first) { addXP(40); profile.totals.english = (profile.totals.english || 0) + 3; }
    saveProfile();
    showDialog({ who: '🇬🇧 English', text: `${L('Kết quả', 'Score')}: <b>${score}/${Ls.quiz.length}</b> ${pass ? '🎉' : '📖'}<br>${first ? '+40 XP<br>' : ''}${pass && engPassed() === 2 ? L('🌏 Đã mở khóa <b>khách nước ngoài</b>: cước +20%, tip cao, nói chuyện bằng tiếng Anh!', '🌏 <b>Foreign customers</b> unlocked!') : ''}${!pass ? L('Cần đúng ít nhất ' + (Ls.quiz.length - 1) + ' câu. Thử lại nhé!', 'Try again!') : ''}`,
      opts: [{ t: L('👍 OK', '👍 OK'), fx: () => { if (wasPanel) { $('mp').classList.remove('hidden'); renderPanel(); } } }] });
  };
  showDialog({ who: `🇬🇧 ${L('Bài học', 'Lesson')}: ${Ls.t[profile.english ? 1 : 0]}`, text: vocab, opts: [{ t: L('📝 Làm bài kiểm tra', '📝 Take the quiz'), fx: () => setTimeout(ask, 100) }, { t: L('↩️ Để sau', '↩️ Later'), fx: () => { if (wasPanel) { $('mp').classList.remove('hidden'); renderPanel(); } } }] });
}
{ const b = document.createElement('button'); b.dataset.tab = 'eng'; b.textContent = '🇬🇧 Tiếng Anh'; $('mpTabs').insertBefore(b, $('mpClose')); }
{
  const _rp = renderPanel;
  renderPanel = function () {
    _rp(); if (panelTab !== 'eng') return;
    $('mpBody').innerHTML = `<h3>🇬🇧 ${L('Học tiếng Anh giao tiếp cho tài xế', 'English for drivers')}</h3>
      <p>${L('Qua 2 bài để mở <b>khách nước ngoài</b> (cước +20%, tip cao). Bật English Mode trong Cài đặt để luyện cả ngày.', 'Pass 2 lessons to unlock <b>foreign customers</b>.')} · ${L('Đã qua', 'Passed')}: <b>${engPassed()}/${LESSONS.length}</b></p>` +
      LESSONS.map(Ls => `<div class="sk"><div><b>${profile.eng.passed[Ls.id] ? '✅' : '📘'} ${Ls.t[profile.english ? 1 : 0]}</b><br><small>${Ls.vocab.map(v => v[0]).join(' · ')}</small></div><button data-les="${Ls.id}">${profile.eng.passed[Ls.id] ? L('Ôn lại', 'Review') : L('Học', 'Learn')}${profile.eng.best[Ls.id] !== undefined ? ` (${profile.eng.best[Ls.id]}/${Ls.quiz.length})` : ''}</button></div>`).join('');
  };
  $('mpBody').addEventListener('click', (e) => { const b = e.target.closest('[data-les]'); if (b) startLesson(b.dataset.les); });
}
/* ---- foreign customers: the whole trip is in English ---- */
const FOREIGN_NAMES = ['John (Úc)', 'Emma (Anh)', 'Kenji (Nhật)', 'Min-ji (Hàn)', 'Lucas (Pháp)', 'Sarah (Mỹ)', 'Arjun (Ấn Độ)'];
{
  const _mo = makeOffer;
  makeOffer = function () {
    const o = _mo();
    if (o.type === 'ride' && foreignUnlocked() && Math.random() < 0.18) { o.foreign = true; if (o.cust) { o.cust.name = '🌏 ' + pick(FOREIGN_NAMES); o.cust.note = L('Khách nước ngoài · nói tiếng Anh · tip cao', 'Foreign customer · speaks English'); } o.fare = Math.round(o.fare * 1.2 / 1000) * 1000; }
    return o;
  };
  const _ao = acceptOffer;
  acceptOffer = function () { const o = game.offer; _ao(); if (o && o.foreign && !profile.english) { profile.english = true; profile.engTemp = true; toast('🌏 Foreign passenger — speak English!', 2.2); } };
  const restore = () => { if (profile.engTemp) { profile.english = false; profile.engTemp = false; } };
  const _do = dropOff; dropOff = function () { const o = game.order, foreign = o && o.foreign; _do(); if (foreign) { if ((o.sat || 0) >= 85) { const tip = pick([20000, 30000, 50000]); earn(tip, 'cash', true); setTimeout(() => toast(`🌏 ${o.cust ? o.cust.name : ''}: "Thank you! Keep the change." +${fmtVND(tip)}`, 3), 4000); } restore(); } };
  const _co = cancelOrder; cancelOrder = function () { _co(); restore(); };
  $('offAccept').onclick = () => acceptOffer();
}
BOOT.push(() => { if (profile.engTemp && !game.order) { profile.english = false; profile.engTemp = false; } });
