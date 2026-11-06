'use strict';
/* ================= Phòng trọ 3D (hiện khi về nhà cuối ngày) ================= */
const HOME3D = { g: new THREE.Group(), on: false, fan: null, me: null, jar: null, win: null };
{
  const G = HOME3D.g, ox = BX1 + 600, oz = BZ0 - 600; G.position.set(ox, 0, oz); scene.add(G);
  const m = (c, o) => std(c, Object.assign({ roughness: 0.8 }, o || {}));
  const box = (w, h, d, mat, x, y, z) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); b.position.set(x, y, z); b.castShadow = b.receiveShadow = true; G.add(b); return b; };
  const W = 5, D = 4, H = 2.8;
  box(W, 0.1, D, m(0xc9a27a, { roughness: 0.6 }), 0, -0.05, 0);                     // floor (gạch gỗ)
  box(W, H, 0.1, m(0xf1e9d8), 0, H / 2, -D / 2);                                    // back wall
  box(0.1, H, D, m(0xe8dfcc), -W / 2, H / 2, 0); box(0.1, H, D, m(0xe8dfcc), W / 2, H / 2, 0);
  box(W, 0.08, D, m(0xffffff), 0, H, 0);                                             // ceiling
  // bed + pillow + blanket
  box(1.9, 0.35, 1.3, m(0x6d4c41), -1.3, 0.18, -1.2); box(1.85, 0.18, 1.25, m(0xf5f5f5), -1.3, 0.44, -1.2);
  box(1.0, 0.06, 1.27, m(0x00b14f), -0.9, 0.55, -1.2); box(0.4, 0.12, 0.7, m(0xffffff), -2.0, 0.6, -1.2);
  // desk, laptop, helmet, rice cooker
  box(1.3, 0.05, 0.6, m(0x8d6e63), 1.5, 0.75, -1.6); for (const [x, z] of [[0.9, -1.85], [2.1, -1.85], [0.9, -1.35], [2.1, -1.35]]) box(0.05, 0.75, 0.05, m(0x5d4037), x, 0.37, z);
  box(0.36, 0.02, 0.25, m(0x37474f, { metalness: 0.5 }), 1.3, 0.79, -1.6);
  const scr = box(0.36, 0.24, 0.02, new THREE.MeshBasicMaterial({ color: 0x00b14f }), 1.3, 0.92, -1.72); scr.rotation.x = -0.2;
  const hel = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2), m(0x00b14f, { roughness: 0.3 })); hel.position.set(1.9, 0.78, -1.55); G.add(hel);
  box(0.25, 0.22, 0.25, m(0xeeeeee), 1.0, 0.88, -1.5);
  // standing fan with spinning blades
  box(0.05, 1.1, 0.05, m(0x90a4ae), 2.1, 0.55, 0.6); box(0.35, 0.03, 0.35, m(0x90a4ae), 2.1, 0.02, 0.6);
  HOME3D.fan = new THREE.Group(); HOME3D.fan.position.set(2.1, 1.15, 0.6); HOME3D.fan.rotation.y = -2.2; G.add(HOME3D.fan);
  for (let i = 0; i < 3; i++) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.3, 0.01), m(0x4fc3f7)); b.position.y = 0.15; const p = new THREE.Group(); p.rotation.z = i * 2.094; p.add(b); HOME3D.fan.add(p); }
  // window (sky colour follows time), poster, calendar
  HOME3D.win = new THREE.MeshBasicMaterial({ color: 0x9fd3ff }); const win = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.9), HOME3D.win); win.position.set(-0.2, 1.7, -D / 2 + 0.06); G.add(win);
  box(1.3, 0.05, 0.08, m(0x795548), -0.2, 1.22, -D / 2 + 0.08);
  const poster = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.6), new THREE.MeshBasicMaterial({ map: canvasTex(256, 170, (g, w, h) => { g.fillStyle = '#00b14f'; g.fillRect(0, 0, w, h); g.fillStyle = '#fff'; g.font = '900 40px system-ui'; g.textAlign = 'center'; g.fillText('QUẬN 7', w / 2, 70); g.font = '700 22px system-ui'; g.fillText('Cố lên tài xế ơi!', w / 2, 115); }) }));
  poster.position.set(W / 2 - 0.06, 1.7, -0.6); poster.rotation.y = -Math.PI / 2; G.add(poster);
  // TV on a cabinet
  box(1.1, 0.5, 0.4, m(0x5d4037), -2.0, 0.25, 0.9); const tv = box(0.9, 0.55, 0.05, new THREE.MeshBasicMaterial({ color: 0x223355 }), -2.0, 0.85, 0.9); tv.rotation.y = Math.PI / 2;
  // savings label + warm lamp
  HOME3D.jar = labelSprite('🏦'); HOME3D.jar.position.set(1.5, 1.6, -1.7); HOME3D.jar.scale.set(1.6, 0.4, 1); G.add(HOME3D.jar);
  const lamp = new THREE.PointLight(0xffe0b0, 6, 9, 1.6); lamp.position.set(0, 2.5, 0); G.add(lamp);
  G.add(new THREE.AmbientLight(0xffffff, 0.35));
  G.visible = false;
}
function enterHome3D() {
  const G = HOME3D.g; G.visible = true; HOME3D.on = true;
  if (HOME3D.me) G.remove(HOME3D.me);
  HOME3D.me = buildDriver2(profile.look); HOME3D.me.position.set(0.3, -0.25, 0.3); HOME3D.me.rotation.y = 0.4; G.add(HOME3D.me);
  const tmp = labelSprite(L('🏦 Tiết kiệm', '🏦 Savings'), fmtVND(profile.savings)); HOME3D.jar.material.map = tmp.material.map; HOME3D.jar.material.needsUpdate = true;
  const nk = Math.max(0, Math.min(1, (profile.clock / 60 - 18) / 3)); HOME3D.win.color.setRGB(0.62 * (1 - nk) + 0.05, 0.83 * (1 - nk) + 0.07, 1 * (1 - nk) + 0.2);
  controls.enabled = true; controls.autoRotate = false;
  controls.target.set(G.position.x, 1.0, G.position.z - 0.5);
  camera.position.set(G.position.x + 0.6, 1.8, G.position.z + 3.6);
  scene.fog.near = 50; controls.update();
}
{ const _hm = homeMenu; homeMenu = function () { _hm(); if (!HOME3D.on) enterHome3D(); }; }
FRAME.push((dt) => {
  if (HOME3D.on && game.mode !== 'home') { HOME3D.on = false; HOME3D.g.visible = false; controls.enabled = false; }
  if (HOME3D.on) HOME3D.fan.rotation.z += dt * 12;
});
