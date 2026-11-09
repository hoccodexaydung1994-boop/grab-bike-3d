'use strict';
/* ================= Progression: skills, unlocks, upgrades, tiers, acceptance, history ================= */
if (!profile.skills) profile.skills = { lai: 0, deo: 0, tho: 0 };
if (profile.sp === undefined) profile.sp = Math.max(0, profile.level - 1);
if (!profile.up) profile.up = { engine: 0, tank: 0, brake: 0, box: 0 };
if (!profile.acc) profile.acc = [];
if (!profile.history) profile.history = [];
if (profile.license === undefined) profile.license = 12;
if (profile.wanted === undefined) profile.wanted = 0;
if (!profile.week) profile.week = { orders: 0, cancels: 0, idx: 0 };
if (!profile.settings) profile.settings = { bars: {}, shadows: true, hiq: true, sound: true };
if (profile.licBan === undefined) profile.licBan = 0;

const SKILLS = CFG.progression.SKILLS;   // data/config/progression.json
const UNLOCKS = CFG.progression.UNLOCKS;   // data/config/progression.json
// S6: tính năng mở dần theo ngày chơi (người chơi lâu năm mở hết)
const FEAT_DAY = { needs: 2, food: 2, side: 2, police: 3, events: 3 };
const featOn = (k) => (profile.totals && profile.totals.days >= 3) || profile.day >= (FEAT_DAY[k] || 1);
const unlocked = (id) => profile.level >= (UNLOCKS.find(u => u.id === id)?.lv ?? 1) && (id !== 'food' || featOn('food')) && (id !== 'batch' || featOn('food'));
const UPGRADES = CFG.progression.UPGRADES;   // data/config/progression.json
const PAINTS = CFG.progression.PAINTS;   // data/config/progression.json
// multipliers used by the rest of the game
const SK = () => profile.skills, UP = () => profile.up;
function mulSpeed() { return (1 + 0.03 * SK().lai) * (1 + 0.05 * UP().engine); }
function mulCrash() { return (1 - 0.1 * SK().lai) * (1 - 0.15 * UP().brake); }
function mulStamina() { return 1 - 0.1 * SK().deo; }
function mulNeeds() { return 1 - 0.06 * SK().deo; }
function mulFuel() { return 1 - 0.2 * UP().tank; }
function mulHeat() { return 1 - 0.3 * UP().box; }
function tierInfo() {
  const r = profile.ratings.length ? profile.ratings.reduce((a, b) => a + b, 0) / profile.ratings.length : 5;
  const cr = profile.week.orders ? profile.week.cancels / profile.week.orders : 0;
  if (r >= 4.9 && profile.level >= 15 && cr <= 0.03) return { id: 'kc', name: '💠 Kim cương', bonus: 0.2 };
  if (r >= 4.8 && profile.level >= 10 && cr <= 0.05) return { id: 'vang', name: '🥇 Vàng', bonus: 0.1 };
  if (r >= 4.6 && profile.level >= 5) return { id: 'bac', name: '🥈 Bạc', bonus: 0.05 };
  return { id: 'thuong', name: '🔰 Thường', bonus: 0 };
}
function fareMul() { return (1 + 0.03 * SK().tho) * (1 + tierInfo().bonus); }
function tipBonus() { return (SK().lai >= 4 ? 0.05 : 0) + (SK().tho >= 5 ? 0.15 : 0); }
function acceptRate() { return profile.acc.length ? profile.acc.filter(Boolean).length / profile.acc.length : 1; }
function recordOffer(accepted) { profile.acc.push(!!accepted); if (profile.acc.length > 20) profile.acc.shift(); }
function onLevelUp(lv) {
  profile.sp++;
  const u = UNLOCKS.filter(x => x.lv === lv).map(x => x.t[profile.english ? 1 : 0]);
  setTimeout(() => toast(`⬆️ ${L('Lên cấp', 'Level up')} ${lv}! +1 ${L('điểm kỹ năng', 'skill point')}${u.length ? `<br><span style="font-weight:500">🔓 ${u.join(', ')}</span>` : ''}`, 3.5), 700);
}
function applyPaint() { if (!bike.model) return; bike.model.traverse(o => { if (o.isMesh && o.material && o.material.name === 'body') o.material.color.setHex(profile.paint || 0xffffff); }); }
