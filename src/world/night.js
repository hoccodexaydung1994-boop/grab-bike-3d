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
let lampPoolMat = null, lampGlowMat = null;
const lampHeadMat = new THREE.MeshBasicMaterial({ color: 0x333333, toneMapped: false });
{
  const o = new THREE.Object3D();
  let poleGeo = new THREE.CylinderGeometry(0.07, 0.1, 7, 6), headGeo = new THREE.BoxGeometry(0.35, 0.18, 0.8);
  if (GFX_HIGH) {   // cột thuôn + cần vươn cong + chụp đèn
    const pole = new THREE.CylinderGeometry(0.06, 0.13, 7, 10), base = new THREE.CylinderGeometry(0.2, 0.24, 0.5, 10); base.translate(0, -3.25, 0);
    const arm = new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(0, 3.2, 0), new THREE.Vector3(0, 3.75, 0.35), new THREE.Vector3(0, 3.82, 1.0), new THREE.Vector3(0, 3.7, 1.7)]), 10, 0.045, 6);
    const shell = new THREE.BoxGeometry(0.34, 0.12, 0.95); shell.translate(0, 3.72, 1.95);
    poleGeo = mergeGeometries([pole, base, arm, shell].map(g => { const n = g.index ? g.toNonIndexed() : g; for (const k of Object.keys(n.attributes)) if (!['position', 'normal', 'uv'].includes(k)) n.deleteAttribute(k); return n; }), false);
    headGeo = new THREE.BoxGeometry(0.26, 0.05, 0.8);
  }
  const HEAD_OFF = GFX_HIGH ? 1.95 : 0.5, HEAD_Y = GFX_HIGH ? 7.14 : 7;
  const poles = new THREE.InstancedMesh(poleGeo, std(0x6b7076, { metalness: 0.7, roughness: 0.35 }), LAMPS.length);
  const heads = new THREE.InstancedMesh(headGeo, lampHeadMat, LAMPS.length);
  LAMPS.forEach(([x, z, ry], i) => {
    o.position.set(x, 3.5, z); o.rotation.set(0, ry, 0); o.scale.set(1, 1, 1); o.updateMatrix(); poles.setMatrixAt(i, o.matrix);
    o.position.set(x + Math.sin(ry) * HEAD_OFF, HEAD_Y, z + Math.cos(ry) * HEAD_OFF); o.updateMatrix(); heads.setMatrixAt(i, o.matrix);
  });
  poles.computeBoundingSphere(); heads.computeBoundingSphere(); poles.castShadow = GFX_HIGH;
  scene.add(poles, heads);
  if (GFX_HIGH) {   // vệt sáng trên mặt đường + quầng sáng quanh bóng đèn (hiện dần khi trời tối)
    const gl = canvasTex(128, 128, (g) => { const r = g.createRadialGradient(64, 64, 0, 64, 64, 64); r.addColorStop(0, 'rgba(255,225,170,1)'); r.addColorStop(0.35, 'rgba(255,205,130,.45)'); r.addColorStop(1, 'rgba(255,190,110,0)'); g.fillStyle = r; g.fillRect(0, 0, 128, 128); });
    const pg = new THREE.CircleGeometry(8.5, 20); pg.rotateX(-Math.PI / 2);
    lampPoolMat = new THREE.MeshBasicMaterial({ map: gl, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
    const pools = new THREE.InstancedMesh(pg, lampPoolMat, LAMPS.length); const pos = [];
    LAMPS.forEach(([x, z, ry], i) => { const hx = x + Math.sin(ry) * HEAD_OFF, hz = z + Math.cos(ry) * HEAD_OFF; o.position.set(hx, 0.13, hz); o.rotation.set(0, 0, 0); o.updateMatrix(); pools.setMatrixAt(i, o.matrix); pos.push(hx, HEAD_Y - 0.1, hz); });
    pools.computeBoundingSphere(); pools.renderOrder = 3; scene.add(pools);
    const gg = new THREE.BufferGeometry(); gg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); gg.computeBoundingSphere();
    lampGlowMat = new THREE.PointsMaterial({ map: gl, size: 3.2, sizeAttenuation: true, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
    const glow = new THREE.Points(gg, lampGlowMat); glow.frustumCulled = false; scene.add(glow);
  }
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
  if (lampPoolMat) { lampPoolMat.opacity = nightK * 0.55; lampGlowMat.opacity = nightK * 0.9; }
}
