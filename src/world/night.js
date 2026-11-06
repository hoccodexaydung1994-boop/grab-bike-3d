'use strict';
/* ================= Night: lit windows, street lamps, headlight ================= */
const winEmTex = tileTex(128, 128, (g, w, h) => {
  g.fillStyle = '#000'; g.fillRect(0, 0, w, h);
  const cell = (cx, cy, col) => { if (!col) return; g.fillStyle = col; g.fillRect(cx + 12, cy + 14, 40, 30); };
  cell(0, 0, '#ffd27a'); cell(64, 0, '#cfe3ff'); cell(0, 64, null); cell(64, 64, '#ffe2a8');
});
winEmTex.repeat.set(0.5, 0.5);
MAT_WIN.emissive = new THREE.Color(0xffffff); MAT_WIN.emissiveMap = winEmTex; MAT_WIN.emissiveIntensity = 0;
MAT_GLASS.emissive = new THREE.Color(0xffffff); MAT_GLASS.emissiveMap = winEmTex; MAT_GLASS.emissiveIntensity = 0;
MAT_SHOP.emissive = new THREE.Color(0xffffff); MAT_SHOP.emissiveMap = shopTex; MAT_SHOP.emissiveIntensity = 0;
[MAT_WIN, MAT_GLASS, MAT_SHOP].forEach(m => m.needsUpdate = true);
const LAMPS = [];
for (const r of MAP.roads) {
  if (r.e || r.c > 3) continue;
  let acc = 0, side = 1;
  for (let i = 0; i < r.p.length - 2; i += 2) {
    const ax = r.p[i], az = r.p[i + 1], bx = r.p[i + 2], bz = r.p[i + 3], Ln = Math.hypot(bx - ax, bz - az); if (Ln < 1) continue;
    let t = (40 - acc % 40);
    while (t < Ln) {
      const x = ax + (bx - ax) * t / Ln, z = az + (bz - az) * t / Ln, nx = -(bz - az) / Ln * side, nz = (bx - ax) / Ln * side, off = r.w / 2 + 1.2;
      LAMPS.push([x + nx * off, z + nz * off, Math.atan2(-nx, -nz)]); side = -side; t += 40;
    }
    acc += Ln;
  }
}
const lampHeadMat = new THREE.MeshBasicMaterial({ color: 0x333333, toneMapped: false });
{
  const o = new THREE.Object3D();
  const poles = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.07, 0.1, 7, 6), std(0x6b7076, { metalness: 0.6, roughness: 0.4 }), LAMPS.length);
  const heads = new THREE.InstancedMesh(new THREE.BoxGeometry(0.35, 0.18, 0.8), lampHeadMat, LAMPS.length);
  LAMPS.forEach(([x, z, ry], i) => {
    o.position.set(x, 3.5, z); o.rotation.set(0, ry, 0); o.scale.set(1, 1, 1); o.updateMatrix(); poles.setMatrixAt(i, o.matrix);
    o.position.set(x + Math.sin(ry) * 0.5, 7, z + Math.cos(ry) * 0.5); o.updateMatrix(); heads.setMatrixAt(i, o.matrix);
  });
  poles.computeBoundingSphere(); heads.computeBoundingSphere();
  scene.add(poles, heads);
}
const headlight = new THREE.SpotLight(0xfff4e0, 0, 45, 0.55, 0.6, 1.2);
headlight.position.set(0, 1.05, 0.7); headlight.target.position.set(0, 0, 12);
bike.lean.add(headlight, headlight.target);
let nightK = 0;
function applyNight(k) {
  nightK = Math.max(0, Math.min(1, (0.85 - k) / 0.55));
  MAT_WIN.emissiveIntensity = nightK * 0.9; MAT_GLASS.emissiveIntensity = nightK * 0.55; MAT_SHOP.emissiveIntensity = nightK * 0.35;
  lampHeadMat.color.setRGB(0.2 + nightK * 2.8, 0.2 + nightK * 2.2, 0.2 + nightK * 1.2);
  headlight.intensity = nightK * 40;
}
