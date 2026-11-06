'use strict';
/* ================= Day cycle ================= */
function clockText(m) { const h = Math.floor(m / 60), mm = Math.floor(m % 60); return `${String(h).padStart(2, '0')}:${String(mm).padStart(2, '0')}`; }
function showOverlay(title, html, btn, fn) {
  $('ovTitle').textContent = title; $('ovBody').innerHTML = html; $('ovBtn').textContent = btn;
  $('ovBtn').classList.remove('hidden'); $('ovOpts').innerHTML = '';
  $('ovBtn').onclick = () => { $('overlay').classList.add('hidden'); fn(); };
  $('overlay').classList.remove('hidden');
}
const hemiBase = hemi.intensity, sunBase = sun.intensity, skyDay = new THREE.Color(SKY), skyNight = new THREE.Color(0x1b2a48), skyDusk = new THREE.Color(0xf2a36b);
function applyDaylight(m) {
  const h = m / 60;
  let k = 1; if (h > 17) k = Math.max(0.25, 1 - (h - 17) / 2.5); if (h < 7) k = Math.max(0.5, 0.5 + (h - 6) * 0.5);
  hemi.intensity = hemiBase * (0.45 + 0.55 * k) * (1 - 0.35 * rain); sun.intensity = sunBase * k * (1 - 0.6 * rain);
  applyNight(k * (1 - 0.3 * rain));
  const c = k > 0.7 ? skyDay.clone().lerp(skyDusk, (1 - k) / 0.3 * 0.6) : skyDusk.clone().lerp(skyNight, (0.7 - k) / 0.45);
  scene.background.copy(c); scene.fog.color.copy(c);
}
