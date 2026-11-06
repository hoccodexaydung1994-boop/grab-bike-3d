'use strict';
/* ================= Weekly quests & personal records ================= */
if (!profile.rec) profile.rec = { bestDay: 0, maxTrips: 0, longest: 0 };
for (const k of ['trips', 'ontime']) if (profile.week[k] === undefined) profile.week[k] = 0;
if (!profile.week.streets) profile.week.streets = [];
if (!profile.week.done) profile.week.done = {};
const WEEKLY = [
  { id: 'w_trips', t: ['Hoàn thành 50 chuyến trong tuần', 'Complete 50 jobs this week'], cur: () => profile.week.trips, goal: 50, cash: 300000, xp: 300 },
  { id: 'w_streets', t: ['Giao ở 8 tuyến đường khác nhau', 'Deliver on 8 different streets'], cur: () => profile.week.streets.length, goal: 8, cash: 80000, xp: 100 },
  { id: 'w_ontime', t: ['25 chuyến đúng giờ', '25 on-time jobs'], cur: () => profile.week.ontime, goal: 25, cash: 120000, xp: 150 },
];
function noteJob(streetName, onTime, km) {
  const w = profile.week; w.trips++; if (onTime) w.ontime++;
  if (streetName && !w.streets.includes(streetName)) { w.streets.push(streetName); if (w.streets.length > 40) w.streets.shift(); }
  if (km > profile.rec.longest) { profile.rec.longest = km; if (km > 1) setTimeout(() => toast(L(`🏆 Kỷ lục mới: cuốc dài nhất ${km.toFixed(1)} km`, `🏆 New record: longest job ${km.toFixed(1)} km`), 2.5), 4200); }
  for (const q of WEEKLY) if (!w.done[q.id] && q.cur() >= q.goal) {
    w.done[q.id] = true; earn(q.cash, 'wallet'); addXP(q.xp);
    setTimeout(() => toast(`🗓️ ${L('Nhiệm vụ tuần hoàn thành', 'Weekly quest complete')}: ${q.t[profile.english ? 1 : 0]}<br><span style="font-weight:500">+${fmtVND(q.cash)} · +${q.xp} XP</span>`, 3.2), 1500);
  }
}
function checkDayRecords() {
  const out = [];
  if (profile.money > profile.rec.bestDay) { profile.rec.bestDay = profile.money; if (profile.money > 0) out.push(L(`🏆 Kỷ lục thu nhập/ngày: ${fmtVND(profile.money)}`, `🏆 Best day: ${fmtVND(profile.money)}`)); }
  const n = profile.today.bike + profile.today.food;
  if (n > profile.rec.maxTrips) { profile.rec.maxTrips = n; if (n > 0) out.push(L(`🏆 Kỷ lục số chuyến/ngày: ${n}`, `🏆 Most jobs in a day: ${n}`)); }
  return out;
}
