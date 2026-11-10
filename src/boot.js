'use strict';
/* ================= Boot ================= */
for (const f of BOOT) f();
updateProfileHUD();
animate();
addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

foodBoxHolder.add(foodBox);

{ const v = document.createElement('div'); v.id = 'verTag'; v.textContent = 'v' + GAME_VERSION; v.style.cssText = 'position:fixed;left:8px;bottom:4px;font:11px system-ui;opacity:.5;z-index:50;pointer-events:none;color:#fff'; document.body.appendChild(v); }
