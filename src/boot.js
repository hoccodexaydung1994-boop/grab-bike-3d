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
