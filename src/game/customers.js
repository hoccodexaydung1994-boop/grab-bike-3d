'use strict';
/* ================= Customers with personalities ================= */
const VN_NAMES = ['Anh Minh', 'Chị Lan', 'Anh Tuấn', 'Chị Hương', 'Bạn Khoa', 'Cô Mai', 'Chú Hải', 'Chị Thảo', 'Anh Phúc', 'Bạn Vy', 'Mr. John', 'Ms. Sakura', 'Anh Đức', 'Chị Ngọc', 'Bạn Long', 'Cô Hạnh'];
const CUST_TYPES = CFG.shop.CUST_TYPES;   // data/config/shop.json
function makeCustomer() {
  const r = Math.random(), type = r < 0.1 ? 'vip' : r < 0.25 ? 'hard' : r < 0.42 ? 'kind' : 'normal';
  return { name: pick(VN_NAMES), rating: (4.2 + Math.random() * 0.8).toFixed(1), type, note: type === 'hard' ? L('Ghi chú: "Đến nhanh giùm!"', 'Note: "Hurry up!"') : type === 'vip' ? L('Ghi chú: "Đi êm, cẩn thận giúp em"', 'Note: "Smooth ride please"') : '' };
}
function applyCustomer(o) {
  const c = o.cust; if (!c) return;
  if (c.type === 'vip') o.sat -= 10;
  if (c.type === 'hard') { o.sat -= 20; o.est *= 0.85; }
  if (c.type === 'kind') o.sat += 15;
}
function custTip(o, stars) {
  const c = o.cust; if (!c || stars < 5) return 0;
  if (c.type === 'vip' && Math.random() < 0.8) return pick([30000, 50000]);
  if (c.type === 'kind' && Math.random() < 0.7) return pick([10000, 20000]);
  return 0;
}
