'use strict';
/* ================= People ================= */
const skin = std(0xe2b48c);
const GRAB_GREEN = 0x00b14f;
function limb(a, b, r, mat) {
  const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b);
  const d = new THREE.Vector3().subVectors(B, A); const L = d.length();
  const m = new THREE.Mesh(new THREE.CapsuleGeometry(r, Math.max(0.01, L), GFX_HIGH ? 8 : 4, GFX_HIGH ? 20 : 10), mat);
  m.position.copy(A).addScaledVector(d, 0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
  return m;
}
function helmet(pos, color, opts = {}) {
  const g = new THREE.Group();
  const shellMat = new THREE.MeshPhysicalMaterial({ color, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.15 });
  const shell = new THREE.Mesh(new THREE.SphereGeometry(0.15, 28, 20), shellMat);
  shell.scale.set(1, 1, 1.12); g.add(shell);
  // lower rim / ear pieces
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.142, 0.016, 8, 32), std(0x1a1a1a, { roughness: 0.7 }));
  rim.rotation.x = Math.PI / 2 - 0.25; rim.position.set(0, -0.04, -0.01); rim.scale.set(1, 1.12, 1); g.add(rim);
  // tinted visor + peak
  const visor = new THREE.Mesh(new THREE.SphereGeometry(0.156, 24, 12, Math.PI / 2 - 0.9, 1.8, 0.95, 0.72),
    new THREE.MeshPhysicalMaterial({ color: 0x0c1218, roughness: 0.05, metalness: 0.3, clearcoat: 1, side: THREE.DoubleSide }));
  visor.scale.set(1, 1, 1.12); g.add(visor);
  const peak = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.012, 0.07), shellMat);
  peak.position.set(0, 0.075, 0.17); peak.rotation.x = 0.25; g.add(peak);
  // white centre stripe + reflective band at the back
  const stripe = new THREE.Mesh(new THREE.TorusGeometry(0.152, 0.01, 6, 28, Math.PI * 0.9), std(0xffffff, { roughness: 0.4 }));
  stripe.rotation.y = Math.PI / 2; stripe.rotation.z = 0.15; g.add(stripe);
  const refl = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.025, 0.01), new THREE.MeshStandardMaterial({ color: 0xe8e8e8, metalness: 0.6, roughness: 0.25, emissive: 0x333333 }));
  refl.position.set(0, 0.0, -0.168); g.add(refl);
  // chin strap
  const strap = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.006, 4, 16, Math.PI), std(0x111111));
  strap.rotation.z = Math.PI; strap.position.set(0, -0.11, 0.02); g.add(strap);
  g.position.set(...pos);
  return g;
}

/* driver jacket texture: u wraps around the torso (u=0/1 front zip, u=0.5 back), v bottom -> top */
const jacketTex = canvasTex2(512, 256, (g, w, h) => {
  const grd = g.createLinearGradient(0, 0, 0, h);
  grd.addColorStop(0, '#00c45a'); grd.addColorStop(1, '#009a43');
  g.fillStyle = grd; g.fillRect(0, 0, w, h);
  // darker side panels
  g.fillStyle = '#007a35';
  g.fillRect(w * 0.2, 0, w * 0.1, h); g.fillRect(w * 0.7, 0, w * 0.1, h);
  // shoulder yoke
  g.fillStyle = '#00843a'; g.fillRect(0, 0, w, h * 0.16);
  // reflective stripes (chest/back + waist)
  const refl = (y, th) => {
    const gg = g.createLinearGradient(0, y, 0, y + th);
    gg.addColorStop(0, '#d9dde0'); gg.addColorStop(0.5, '#ffffff'); gg.addColorStop(1, '#b9bec2');
    g.fillStyle = gg; g.fillRect(0, y, w, th);
  };
  refl(h * 0.36, h * 0.07); refl(h * 0.78, h * 0.05);
  // front zipper + placket
  g.fillStyle = '#006a2e'; g.fillRect(0, 0, 10, h); g.fillRect(w - 10, 0, 10, h);
  g.fillStyle = '#c9c9c9'; g.fillRect(0, 0, 3, h); g.fillRect(w - 3, 0, 3, h);
  // chest pocket
  g.strokeStyle = 'rgba(0,60,25,.6)'; g.lineWidth = 3; g.strokeRect(w * 0.06, h * 0.2, w * 0.08, h * 0.12);
  // back print
  g.save(); g.translate(w * 0.5, h * 0.6); g.scale(1, 1);
  g.fillStyle = '#ffffff'; g.font = '900 34px system-ui,sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText('TÀI XẾ', 0, 0);
  g.font = '700 18px system-ui,sans-serif'; g.fillText('BIKE', 0, 30);
  g.restore();
  // fabric noise
  for (let i = 0; i < 1800; i++) { g.fillStyle = `rgba(0,0,0,${Math.random() * 0.05})`; g.fillRect(Math.random() * w, Math.random() * h, 2, 2); }
});
function canvasTex2(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}
function joint(p, r, mat) { const m = new THREE.Mesh(new THREE.SphereGeometry(r, 12, 10), mat); m.position.set(...p); return m; }

function buildDriver() {
  const g = new THREE.Group();
  const jacket = std(0xffffff, { map: jacketTex, roughness: 0.75 });
  const sleeve = std(0x00b14f, { roughness: 0.75 });
  const dark = std(0x00843a, { roughness: 0.75 });
  const pants = std(0x232a36, { roughness: 0.9 });
  const glove = std(0x151515, { roughness: 0.6 });
  const reflMat = new THREE.MeshStandardMaterial({ color: 0xf0f0f0, metalness: 0.5, roughness: 0.25, emissive: 0x444444 });
  // torso
  const torso = limb([0, 0.92, -0.42], [0, 1.34, -0.33], 0.165, jacket);
  torso.scale.set(1.18, 1, 0.82); g.add(torso);
  // collar
  const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.095, 0.08, 16, 1, true), std(0x00843a, { side: THREE.DoubleSide, roughness: 0.8 }));
  collar.position.set(0, 1.48, -0.31); collar.rotation.x = 0.15; g.add(collar);
  g.add(limb([0, 1.47, -0.31], [0, 1.55, -0.29], 0.058, skin));
  g.add(helmet([0, 1.67, -0.27], 0x00b14f));
  // belt / hem
  const hem = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.025, 8, 24), dark);
  hem.rotation.x = Math.PI / 2 - 0.2; hem.position.set(0, 0.86, -0.43); hem.scale.set(1.15, 0.85, 1); g.add(hem);
  for (const s of [-1, 1]) {
    // arms: shoulder -> elbow -> wrist
    const sh = [s * 0.21, 1.32, -0.33], el = [s * 0.29, 1.13, -0.04], wr = [s * 0.31, 1.1, 0.2];
    g.add(joint(sh, 0.075, sleeve));
    g.add(limb(sh, el, 0.058, sleeve));
    g.add(joint(el, 0.055, sleeve));
    g.add(limb(el, wr, 0.05, sleeve));
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.012, 6, 16), reflMat);
    band.position.set(s * 0.302, 1.11, 0.12); band.lookAt(s * 0.31, 1.1, 0.2); g.add(band);
    const cuff = new THREE.Mesh(new THREE.TorusGeometry(0.047, 0.014, 6, 16), dark);
    cuff.position.set(s * 0.31, 1.1, 0.19); cuff.lookAt(s * 0.32, 1.1, 0.3); g.add(cuff);
    // gloves gripping
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 10), glove); hand.scale.set(1, 0.9, 1.25);
    hand.position.set(s * 0.32, 1.1, 0.26); g.add(hand);
    // legs
    const hip = [s * 0.1, 0.87, -0.4], kn = [s * 0.17, 0.8, -0.02], an = [s * 0.14, 0.37, 0.06];
    g.add(joint(hip, 0.08, pants));
    g.add(limb(hip, kn, 0.078, pants));
    g.add(joint(kn, 0.07, pants));
    g.add(limb(kn, an, 0.062, pants));
    // sneakers
    const shoe = new THREE.Mesh(new THREE.CapsuleGeometry(0.05, 0.14, 4, 10), std(0x1d1d1f, { roughness: 0.6 }));
    shoe.rotation.x = Math.PI / 2; shoe.position.set(s * 0.14, 0.31, 0.11); g.add(shoe);
    const sole = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.025, 0.24), std(0xf2f2f2)); sole.position.set(s * 0.14, 0.27, 0.11); g.add(sole);
  }
  shadowAll(g);
  return g;
}
