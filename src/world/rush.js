'use strict';
/* ================= Rush hour traffic ================= */
cars.forEach(v => v.rk = Math.random());
function trafficLevel() {
  const h = profile.clock / 60;
  if (isPeak()) return { frac: 1, speed: 0.72 };
  if (h >= 21 || h < 6.6) return { frac: 0.35, speed: 1.1 };
  return { frac: 0.65, speed: 1 };
}
