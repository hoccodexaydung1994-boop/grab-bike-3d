'use strict';
/* ================= Traffic: hand-built low-poly cars & motorbikes ================= */
const paintCache = new Map();
const paint = (c) => {
  if (!paintCache.has(c)) paintCache.set(c, new THREE.MeshPhysicalMaterial({ color: c, roughness: 0.32, metalness: 0.35, clearcoat: 1, clearcoatRoughness: 0.12 }));
  return paintCache.get(c);
};
const flatCache = new Map();
const flat = (c, rough = 0.7, metal = 0) => {
  const k = c + '|' + rough + '|' + metal;
  if (!flatCache.has(k)) flatCache.set(k, std(c, { roughness: rough, metalness: metal }));
  return flatCache.get(k);
};
const VM = {
  glass: new THREE.MeshPhysicalMaterial({ color: 0x18222c, roughness: 0.05, metalness: 0.3, clearcoat: 1 }),
  tire: std(0x141414, { roughness: 0.95 }),
  rim: std(0xc9ced4, { roughness: 0.25, metalness: 0.9 }),
  trim: std(0x1c1d20, { roughness: 0.6 }),
  chrome: std(0xe6e9ec, { roughness: 0.15, metalness: 1 }),
  head: new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff6e0, emissiveIntensity: 1.6 }),
  tail: new THREE.MeshStandardMaterial({ color: 0xd01818, emissive: 0xff1010, emissiveIntensity: 1.1 }),
  amber: new THREE.MeshStandardMaterial({ color: 0xffa020, emissive: 0xff8000, emissiveIntensity: 0.6 }),
  plate: std(0xf4f4f4, { roughness: 0.5 }),
  seat: std(0x1a1a1a, { roughness: 0.8 }),
};

function vrod(a, b, r, mat, seg = 8) {
  const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b);
  const d = new THREE.Vector3().subVectors(B, A); const L = d.length();
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, L, seg), mat);
  m.position.copy(A).addScaledVector(d, 0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
  return m;
}
function vbox(w, h, l, mat, x, y, z, rx = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, l), mat);
  m.position.set(x, y, z); m.rotation.x = rx; return m;
}
// side profile (z,y) extruded across width, centred on x = 0
function vprofile(pts, width, mat, bevel = 0.05) {
  const sh = new THREE.Shape();
  pts.forEach((p, i) => i ? sh.lineTo(p[0], p[1]) : sh.moveTo(p[0], p[1]));
  sh.closePath();
  const g = new THREE.ExtrudeGeometry(sh, { depth: Math.max(0.01, width - bevel * 2), bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel * 0.8, bevelSegments: 2, curveSegments: 4 });
  g.translate(0, 0, -(width - bevel * 2) / 2);
  g.rotateY(-Math.PI / 2);
  g.computeVertexNormals();
  return new THREE.Mesh(g, mat);
}
// merge all meshes of a group into one mesh per material (few draw calls per vehicle)
function carWheel(g, x, z, r, w = 0.22) {
  const t = new THREE.Mesh(new THREE.CylinderGeometry(r, r, w, 18), VM.tire);
  t.rotation.z = Math.PI / 2; t.position.set(x, r, z); g.add(t);
  const rim = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.62, r * 0.62, w + 0.02, 12), VM.rim);
  rim.rotation.z = Math.PI / 2; rim.position.set(x, r, z); g.add(rim);
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.18, r * 0.18, w + 0.04, 8), VM.trim);
  hub.rotation.z = Math.PI / 2; hub.position.set(x, r, z); g.add(hub);
}

/* ---- cars ---- */
const CAR_SPECS = {
  sedan: {
    L: 4.5, W: 1.78, wr: 0.32, wz: 1.38,
    body: [[-2.25, 0.32], [2.2, 0.32], [2.28, 0.58], [2.18, 0.82], [1.15, 0.95], [-1.55, 0.98], [-2.22, 0.94], [-2.3, 0.6]],
    cabin: [[1.12, 0.94], [0.32, 1.42], [-0.95, 1.44], [-1.62, 0.97]],
  },
  suv: {
    L: 4.7, W: 1.88, wr: 0.38, wz: 1.42,
    body: [[-2.32, 0.4], [2.28, 0.4], [2.36, 0.7], [2.25, 1.0], [1.3, 1.12], [-2.2, 1.14], [-2.36, 1.08], [-2.4, 0.7]],
    cabin: [[1.28, 1.1], [0.55, 1.66], [-2.05, 1.7], [-2.25, 1.12]],
  },
  hatch: {
    L: 3.9, W: 1.7, wr: 0.3, wz: 1.22,
    body: [[-1.92, 0.3], [1.92, 0.3], [2.0, 0.55], [1.9, 0.8], [1.0, 0.92], [-1.8, 0.96], [-1.98, 0.9], [-2.0, 0.55]],
    cabin: [[0.98, 0.91], [0.2, 1.42], [-1.55, 1.45], [-1.88, 0.95]],
  },
  van: {
    L: 5.4, W: 1.95, wr: 0.36, wz: 1.75,
    body: [[-2.7, 0.38], [2.65, 0.38], [2.72, 0.7], [2.62, 1.05], [2.05, 1.18], [-2.62, 1.2], [-2.72, 1.1], [-2.75, 0.7]],
    cabin: [[2.02, 1.16], [1.35, 2.15], [-2.55, 2.2], [-2.65, 1.18]],
  },
};
function buildCar(type, color, opts = {}) {
  const S = CAR_SPECS[type];
  const g = new THREE.Group();
  const p = paint(color);
  g.add(vprofile(S.body, S.W, p, 0.07));
  g.add(vprofile(S.cabin, S.W * 0.86, VM.glass, 0.05));
  // roof panel (painted) over the glasshouse
  const c = S.cabin; const roofY = Math.max(c[1][1], c[2][1]);
  const roof = vbox(S.W * 0.84, 0.06, Math.abs(c[1][0] - c[2][0]) + 0.1, p, 0, roofY + 0.02, (c[1][0] + c[2][0]) / 2);
  g.add(roof);
  // pillars (B pillar) painted
  g.add(vbox(S.W * 0.87, (roofY - c[0][1]) * 0.9, 0.12, p, 0, (roofY + c[0][1]) / 2, (c[1][0] + c[2][0]) / 2 - 0.1));
  // bumpers, grille, lights, plate, mirrors
  const fz = S.body[1][0] + 0.06, rz = S.body[0][0] - 0.06;
  const ly = S.body[2][1] + 0.08;
  g.add(vbox(S.W * 0.96, 0.2, 0.14, VM.trim, 0, S.body[0][1] + 0.08, fz));
  g.add(vbox(S.W * 0.96, 0.2, 0.14, VM.trim, 0, S.body[0][1] + 0.08, rz));
  g.add(vbox(S.W * 0.45, 0.14, 0.05, VM.trim, 0, ly - 0.02, fz + 0.04));
  for (const s of [-1, 1]) {
    g.add(vbox(0.34, 0.1, 0.06, VM.head, s * S.W * 0.34, ly, fz + 0.02));
    g.add(vbox(0.3, 0.1, 0.06, VM.tail, s * S.W * 0.36, ly + 0.05, rz - 0.02));
    g.add(vbox(0.06, 0.08, 0.14, p, s * (S.W / 2 + 0.06), c[0][1] + 0.05, c[0][0] - 0.15));
  }
  g.add(vbox(0.42, 0.12, 0.02, VM.plate, 0, S.body[0][1] + 0.26, rz - 0.03));
  // wheels + arches
  for (const z of [S.wz, -S.wz]) for (const s of [-1, 1]) {
    carWheel(g, s * (S.W / 2 - 0.1), z, S.wr);
    const arch = new THREE.Mesh(new THREE.TorusGeometry(S.wr + 0.05, 0.045, 6, 14, Math.PI), VM.trim);
    arch.rotation.y = Math.PI / 2; arch.position.set(s * (S.W / 2 + 0.005), S.wr, z); g.add(arch);
  }
  if (opts.taxi) {
    const sign = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.18, 0.26), new THREE.MeshStandardMaterial({
      map: taxiTex, emissive: 0x332200, emissiveIntensity: 0.4 }));
    sign.position.set(0, roofY + 0.14, (c[1][0] + c[2][0]) / 2); g.add(sign);
  }
  return { mesh: bake(g), hw: S.W / 2 + 0.1, hl: S.L / 2 + 0.1 };
}
const taxiTex = canvasTex(128, 64, (g, w, h) => {
  g.fillStyle = '#ffd21a'; g.fillRect(0, 0, w, h);
  g.fillStyle = '#111'; g.font = '900 38px system-ui,sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('TAXI', w / 2, h / 2 + 2);
});
const busTex = canvasTex(256, 64, (g, w, h) => {
  g.fillStyle = '#111'; g.fillRect(0, 0, w, h);
  g.fillStyle = '#ffb000'; g.font = '700 34px monospace'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText('19  CHỢ BẾN THÀNH', w / 2, h / 2 + 2);
});
function buildBus() {
  const g = new THREE.Group();
  const L = 10.8, W = 2.5, H = 3.1;
  const green = paint(0x1f9d55), cream = paint(0xf2efe6);
  g.add(vbox(W, 1.0, L, green, 0, 0.95, 0));
  g.add(vbox(W, H - 1.45, L, cream, 0, 1.45 + (H - 1.45) / 2, 0));
  // window band (glass slightly proud of the body)
  g.add(vbox(W + 0.03, 0.95, L - 2.2, VM.glass, 0, 2.05, -0.6));
  g.add(vbox(W - 0.1, 1.5, 0.05, VM.glass, 0, 2.0, L / 2 + 0.01)); // windscreen
  g.add(vbox(W - 0.2, 0.9, 0.05, VM.glass, 0, 2.2, -L / 2 - 0.01));
  g.add(vbox(W + 0.04, 0.12, L, green, 0, 1.47, 0)); // stripe
  const sign = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.3, 0.04), new THREE.MeshStandardMaterial({ map: busTex, emissive: 0xffffff, emissiveMap: busTex, emissiveIntensity: 0.8 }));
  sign.position.set(0, H - 0.25, L / 2 + 0.03); g.add(sign);
  // doors (right side = -x)
  for (const z of [3.6, -0.5]) g.add(vbox(0.04, 2.2, 1.0, VM.glass, -W / 2 - 0.02, 1.5, z));
  for (const s of [-1, 1]) {
    g.add(vbox(0.3, 0.14, 0.06, VM.head, s * 0.85, 0.85, L / 2 + 0.02));
    g.add(vbox(0.18, 0.4, 0.06, VM.tail, s * 1.05, 1.0, -L / 2 - 0.02));
    g.add(vrod([s * W / 2, 2.4, L / 2 - 0.1], [s * (W / 2 + 0.25), 2.2, L / 2 + 0.15], 0.025, VM.trim));
  }
  g.add(vbox(W, 0.3, 0.2, VM.trim, 0, 0.45, L / 2));
  g.add(vbox(W, 0.3, 0.2, VM.trim, 0, 0.45, -L / 2));
  for (const z of [3.4, -3.0]) for (const s of [-1, 1]) carWheel(g, s * (W / 2 - 0.2), z, 0.5, 0.32);
  return { mesh: bake(g), hw: W / 2 + 0.1, hl: L / 2 + 0.1 };
}
function buildTruck(color) {
  const g = new THREE.Group();
  const p = paint(color);
  g.add(vprofile([[1.2, 0.5], [2.6, 0.5], [2.65, 1.2], [2.5, 2.3], [1.2, 2.35]], 2.0, p, 0.06));
  g.add(vbox(1.84, 0.75, 0.05, VM.glass, 0, 1.85, 2.58, -0.08));
  g.add(vbox(2.1, 2.2, 3.6, flat(0xdedede, 0.6), 0, 1.65, -0.75));
  g.add(vbox(2.0, 0.2, 5.2, VM.trim, 0, 0.55, 0));
  for (const s of [-1, 1]) {
    g.add(vbox(0.3, 0.14, 0.06, VM.head, s * 0.7, 0.85, 2.66));
    g.add(vbox(0.2, 0.2, 0.05, VM.tail, s * 0.85, 0.75, -2.57));
  }
  for (const z of [1.9, -1.6]) for (const s of [-1, 1]) carWheel(g, s * 0.82, z, 0.42, 0.28);
  return { mesh: bake(g), hw: 1.15, hl: 2.75 };
}

/* ---- motorbikes ---- */
function bikeWheel(g, z, r) {
  const t = new THREE.Mesh(new THREE.TorusGeometry(r - 0.045, 0.045, 8, 22), VM.tire);
  t.rotation.y = Math.PI / 2; t.position.set(0, r, z); g.add(t);
  const rim = new THREE.Mesh(new THREE.CylinderGeometry(r - 0.07, r - 0.07, 0.05, 14), VM.rim);
  rim.rotation.z = Math.PI / 2; rim.position.set(0, r, z); g.add(rim);
}
function vnHelmet(g, pos, color, mask, maskColor) {
  const [x, y, z] = pos;
  const face = new THREE.Mesh(new THREE.SphereGeometry(0.105, 12, 10), skin);
  face.position.set(x, y, z); g.add(face);
  const shell = new THREE.Mesh(new THREE.SphereGeometry(0.135, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.55), flat(color, 0.35));
  shell.position.set(x, y + 0.01, z - 0.01); shell.scale.set(1, 1, 1.1); g.add(shell);
  const brim = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.015, 0.06), flat(color, 0.35));
  brim.position.set(x, y + 0.03, z + 0.14); brim.rotation.x = 0.2; g.add(brim);
  if (mask) { const m = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.08, 0.05), flat(maskColor, 0.9)); m.position.set(x, y - 0.04, z + 0.085); g.add(m); }
}
const RIDER_SHIRTS = [0xffffff, 0x1f3b73, 0xd94141, 0xf0c419, 0x7d8c99, 0x2e8b57, 0xf3b6c8, 0x87ceeb, 0x333333, 0xe8e0c8];
const HELMETS = [0xffffff, 0xd92b2b, 0x1d4ed8, 0x111111, 0xfacc15, 0xf472b6, 0x16a34a, 0x9ca3af];
function addRider(g, P, shirtC, pantsC, helmetC, mask) {
  const shirt = flat(shirtC, 0.85), pants = flat(pantsC, 0.9);
  const torso = limb(P.hip, P.sh, 0.14, shirt); torso.scale.set(1.15, 1, 0.82); g.add(torso);
  vnHelmet(g, P.head, helmetC, mask, pick([0x1f3b73, 0x111111, 0x87ceeb, 0xffffff]));
  for (const s of [-1, 1]) {
    const S = [s * 0.18, P.sh[1] - 0.03, P.sh[2]];
    const E = [s * P.el[0], P.el[1], P.el[2]];
    const H = [s * P.hand[0], P.hand[1], P.hand[2]];
    g.add(limb(S, E, 0.045, shirt)); g.add(limb(E, H, 0.04, P.longSleeve ? shirt : skin));
    const K = [s * P.knee[0], P.knee[1], P.knee[2]], F = [s * P.foot[0], P.foot[1], P.foot[2]];
    g.add(limb([s * 0.09, P.hip[1] - 0.03, P.hip[2]], K, 0.065, pants)); g.add(limb(K, F, 0.05, pants));
    g.add(vbox(0.08, 0.06, 0.18, flat(pick([0x222222, 0x8b5a2b, 0xeeeeee]), 0.8), s * P.foot[0], P.foot[1] - 0.04, P.foot[2] + 0.05));
  }
}
function buildScooter(color) {  // xe tay ga
  const g = new THREE.Group();
  const p = paint(color);
  bikeWheel(g, 0.6, 0.25); bikeWheel(g, -0.58, 0.25);
  g.add(vprofile([[0.28, 0.24], [0.5, 0.3], [0.66, 0.58], [0.62, 0.98], [0.5, 1.04], [0.42, 0.88], [0.34, 0.4]], 0.4, p, 0.04)); // front shield
  g.add(vbox(0.34, 0.07, 0.48, VM.trim, 0, 0.27, 0.08)); // floorboard
  g.add(vprofile([[0.0, 0.26], [0.06, 0.62], [-0.3, 0.72], [-0.82, 0.8], [-0.92, 0.74], [-0.78, 0.5], [-0.45, 0.32]], 0.36, p, 0.04)); // rear body
  g.add(vprofile([[0.04, 0.7], [-0.32, 0.79], [-0.78, 0.86], [-0.84, 0.92], [-0.45, 0.92], [-0.05, 0.84]], 0.3, VM.seat, 0.03)); // seat
  g.add(vbox(0.42, 0.1, 0.16, p, 0, 1.03, 0.5, -0.2)); // handlebar cover
  g.add(vbox(0.16, 0.07, 0.04, VM.head, 0, 1.0, 0.59, -0.2));
  for (const s of [-1, 1]) {
    g.add(vrod([s * 0.2, 1.04, 0.47], [s * 0.34, 1.04, 0.45], 0.017, VM.seat));
    g.add(vrod([s * 0.15, 1.08, 0.46], [s * 0.2, 1.3, 0.42], 0.006, VM.chrome));
    g.add(vbox(0.09, 0.05, 0.015, VM.chrome, s * 0.21, 1.31, 0.42));
    g.add(vbox(0.05, 0.03, 0.05, VM.amber, s * 0.2, 1.0, 0.56));
    g.add(vrod([s * 0.055, 0.88, 0.52], [s * 0.055, 0.25, 0.6], 0.02, VM.chrome));
  }
  g.add(vbox(0.18, 0.05, 0.05, VM.tail, 0, 0.76, -0.92));
  g.add(vbox(0.16, 0.12, 0.012, VM.plate, 0, 0.5, -0.93, 0.2));
  g.add(vbox(0.12, 0.18, 0.5, flat(0x555a60, 0.5, 0.5), 0.1, 0.3, -0.42)); // engine/swingarm
  g.add(vrod([-0.15, 0.3, -0.3], [-0.17, 0.42, -0.85], 0.045, VM.chrome));
  return g;
}
function buildUnderbone(color) {  // xe số
  const g = new THREE.Group();
  const p = paint(color);
  bikeWheel(g, 0.62, 0.29); bikeWheel(g, -0.6, 0.29);
  g.add(vrod([0, 0.98, 0.42], [0, 0.5, 0.05], 0.03, VM.trim));
  g.add(vprofile([[0.12, 0.42], [0.42, 0.52], [0.62, 0.8], [0.56, 1.0], [0.42, 1.03], [0.3, 0.82], [0.08, 0.6]], 0.3, p, 0.035));
  g.add(vprofile([[-0.12, 0.52], [-0.06, 0.78], [-0.42, 0.85], [-0.86, 0.9], [-0.92, 0.82], [-0.6, 0.64], [-0.3, 0.5]], 0.28, p, 0.035));
  g.add(vprofile([[0.02, 0.83], [-0.4, 0.9], [-0.78, 0.94], [-0.82, 1.0], [-0.42, 0.99], [-0.04, 0.93]], 0.26, VM.seat, 0.03));
  g.add(vbox(0.24, 0.24, 0.36, flat(0x60656c, 0.45, 0.6), 0, 0.38, 0.0));
  g.add(vbox(0.36, 0.08, 0.14, p, 0, 1.06, 0.5, -0.15));
  g.add(vbox(0.14, 0.07, 0.05, VM.head, 0, 1.0, 0.58, -0.15));
  for (const s of [-1, 1]) {
    g.add(vrod([s * 0.17, 1.06, 0.47], [s * 0.33, 1.06, 0.45], 0.017, VM.seat));
    g.add(vrod([s * 0.13, 1.1, 0.46], [s * 0.18, 1.32, 0.42], 0.006, VM.chrome));
    g.add(vbox(0.09, 0.05, 0.015, VM.chrome, s * 0.19, 1.33, 0.42));
    g.add(vrod([s * 0.06, 0.95, 0.5], [s * 0.06, 0.29, 0.62], 0.02, VM.chrome));
    g.add(vrod([s * 0.13, 0.95, -0.55], [s * 0.13, 0.95, -0.9], 0.012, VM.chrome)); // rack
    g.add(vrod([s * 0.1, 0.36, -0.02], [s * 0.22, 0.36, -0.02], 0.012, VM.chrome));
  }
  g.add(vbox(0.16, 0.05, 0.05, VM.tail, 0, 0.84, -0.93));
  g.add(vbox(0.16, 0.12, 0.012, VM.plate, 0, 0.58, -0.95, 0.2));
  g.add(vrod([-0.1, 0.3, 0.1], [-0.16, 0.42, -0.8], 0.04, VM.chrome));
  for (const s of [-1, 1]) g.add(vrod([s * 0.1, 0.42, -0.1], [s * 0.1, 0.29, -0.6], 0.022, VM.trim));
  return g;
}
const BIKE_COLORS = [0xd21f1f, 0x111111, 0xf5f5f5, 0x1d4ed8, 0x9aa3ad, 0x7a1f1f, 0xf3c623, 0x2f6f4f, 0xe8d8b0, 0x5b3a8c];
function buildMotorbike() {
  const scooter = rand() < 0.6;
  const g = scooter ? buildScooter(pick(BIKE_COLORS)) : buildUnderbone(pick(BIKE_COLORS));
  const P = scooter
    ? { hip: [0, 0.92, -0.36], sh: [0, 1.4, -0.26], head: [0, 1.62, -0.22], el: [0.29, 1.18, 0.1], hand: [0.31, 1.05, 0.44], knee: [0.17, 0.8, 0.15], foot: [0.13, 0.36, 0.25] }
    : { hip: [0, 1.0, -0.3], sh: [0, 1.48, -0.16], head: [0, 1.7, -0.11], el: [0.29, 1.22, 0.12], hand: [0.31, 1.07, 0.44], knee: [0.2, 0.96, 0.15], foot: [0.2, 0.38, -0.02] };
  P.longSleeve = rand() < 0.45;
  addRider(g, P, pick(RIDER_SHIRTS), pick([0x1f2a44, 0x333333, 0x6b7280, 0x3b2f2f]), pick(HELMETS), rand() < 0.5);
  if (rand() < 0.28) { // passenger
    const Q = scooter
      ? { hip: [0, 0.96, -0.7], sh: [0, 1.42, -0.64], head: [0, 1.63, -0.6], el: [0.24, 1.15, -0.55], hand: [0.17, 1.05, -0.38], knee: [0.2, 0.86, -0.42], foot: [0.24, 0.42, -0.42] }
      : { hip: [0, 1.04, -0.66], sh: [0, 1.5, -0.6], head: [0, 1.71, -0.56], el: [0.24, 1.22, -0.5], hand: [0.17, 1.12, -0.34], knee: [0.22, 0.96, -0.4], foot: [0.22, 0.48, -0.42] };
    Q.longSleeve = rand() < 0.5;
    addRider(g, Q, pick(RIDER_SHIRTS), pick([0x1f2a44, 0x333333, 0xa0522d]), pick(HELMETS), rand() < 0.5);
  }
  return { mesh: bake(g), hw: 0.4, hl: 1.0 };
}

/* ---- traffic simulation on the real road graph ---- */
const cars = []; // all traffic vehicles (cars + motorbikes)
const carOK = (E) => E.c <= 4, bikeOK = (E) => E.c <= 5;
const CAR_EDGES = EDGES.filter(carOK), BIKE_EDGES = EDGES.filter(bikeOK);
function laneOffset(v) {
  const w = v.E.w;
  if (v.E.o) return v.kind === 'bike' ? w / 2 - 1.0 : (v.lanePick ? -w / 5 : w / 8);
  return v.kind === 'bike' ? Math.max(0.8, w / 2 - 0.9) : w / 4;
}
function vehiclePose(v) {
  const p = edgeAt(v.E, v.s, v.fwd);
  const off = laneOffset(v) + v.jit;
  return { x: p.x - p.dz * off, z: p.z + p.dx * off, ry: Math.atan2(p.dx, p.dz), dx: p.dx, dz: p.dz };
}
function placeNear(v, minD, maxD) {
  const pool = v.kind === 'bike' ? BIKE_EDGES : CAR_EDGES;
  for (let tries = 0; tries < 80; tries++) {
    const E = pool[Math.floor(Math.random() * pool.length)];
    const d = Math.hypot(E.mx - player.x, E.mz - player.z);
    if (d < minD || d > maxD || E.L < 8) continue;
    v.E = E; v.fwd = E.o ? true : Math.random() < 0.5; v.s = Math.random() * E.L;
    const q = vehiclePose(v);
    if (cars.some(o => o !== v && o.mesh.visible && Math.hypot(o.mesh.position.x - q.x, o.mesh.position.z - q.z) < v.hl + o.hl + 2)) continue;
    v.mesh.position.set(q.x, 0.07, q.z); v.mesh.rotation.y = q.ry; v.speed = v.base * 0.7;
    return true;
  }
  return false;
}
function spawnVehicle(built, kind, base) {
  const v = { ...built, kind, base, speed: base, jit: kind === 'bike' ? (Math.random() - 0.5) * 0.8 : 0, lanePick: Math.random() < 0.5 };
  v.E = (kind === 'bike' ? BIKE_EDGES : CAR_EDGES)[0]; v.fwd = true; v.s = 0;
  scene.add(v.mesh); cars.push(v);
  placeNear(v, 25, 380);
}
function populateTraffic() {
  const carMix = [['sedan', 7], ['hatch', 5], ['suv', 5], ['taxi', 4], ['van', 3]];
  const carColors = [0xffffff, 0x111111, 0x9aa4ae, 0xc62828, 0x1e3a8a, 0xf5f5f5, 0x5f6b73, 0x7c2d12, 0xe0e0e0];
  for (const [type, n] of carMix) for (let i = 0; i < n; i++) {
    const taxi = type === 'taxi';
    spawnVehicle(buildCar(taxi ? 'sedan' : type, taxi ? pick([0xf5f5f5, 0x1f9d55]) : pick(carColors), { taxi }), 'car', 9 + Math.random() * 5);
  }
  for (let i = 0; i < 3; i++) spawnVehicle(buildBus(), 'car', 8);
  spawnVehicle(buildTruck(0x1e5aa8), 'car', 8);
  spawnVehicle(buildTruck(0xc62828), 'car', 8);
  for (let i = 0; i < 55; i++) spawnVehicle(buildMotorbike(), 'bike', 7 + Math.random() * 4.5);
}
populateTraffic();

function chooseNext(v) {
  const end = v.fwd ? v.E.b : v.E.a;
  const ok = v.kind === 'bike' ? bikeOK : carOK;
  const here = edgeAt(v.E, v.E.L, v.fwd);
  const opts = [];
  for (const o of NODE_OUT[end]) {
    if (o.E === v.E || !ok(o.E)) continue;
    const st = edgeAt(o.E, 0, o.fwd);
    const dot = here.dx * st.dx + here.dz * st.dz;
    if (dot < -0.85) continue;                       // no sharp U-turns
    const w = (dot > 0.7 ? 4 : 1.5) * (o.E.c <= 2 ? 1.6 : 1) * (o.E.c === 5 ? 0.4 : 1);
    opts.push([o, w]);
  }
  if (!opts.length) {
    if (!v.E.o) return { E: v.E, fwd: !v.fwd };      // dead end → turn around
    return null;
  }
  let tot = opts.reduce((a, o) => a + o[1], 0), r = Math.random() * tot;
  for (const [o, w] of opts) if ((r -= w) <= 0) return o;
  return opts[0][0];
}
const angLerp = (a, b, k) => a + Math.atan2(Math.sin(b - a), Math.cos(b - a)) * k;
const vGrid = new Grid(25); const _vq = [], _sq = [];
function updateCars(dt) {
  const k = 1 - Math.exp(-dt * 8);
  vGrid.m.clear();
  const lvl = trafficLevel();
  for (const v of cars) { if (!v.mesh.visible) continue; const p = v.mesh.position; vGrid.addBox(p.x, p.z, p.x, p.z, v); }
  for (const v of cars) {
    if (v.rk > lvl.frac) { v.mesh.visible = false; continue; }
    if (!v.mesh.visible) { v.mesh.visible = true; placeNear(v, 160, 400); }
    const p = v.mesh.position, ry = v.mesh.rotation.y;
    // recycle far-away traffic into the area around the player
    if (Math.hypot(p.x - player.x, p.z - player.z) > 460) { placeNear(v, 160, 400); continue; }
    const fx = Math.sin(ry), fz = Math.cos(ry);
    let gap = 1e9;
    const look = 7 + v.speed * 1.3;
    const test = (ox, oz, ohl, ohw, ory) => {
      const dx = ox - p.x, dz = oz - p.z;
      const ahead = dx * fx + dz * fz;
      if (ahead <= 0 || ahead > look + ohl) return;
      if (Math.abs(dx * fz - dz * fx) > v.hw + ohw + 0.15) return;
      if (ory !== null && Math.cos(ory - ry) < 0.5) return;
      gap = Math.min(gap, ahead - v.hl - ohl);
    };
    for (const o of vGrid.query(p.x, p.z, look + 6, _vq)) if (o !== v && o.mesh.visible) test(o.mesh.position.x, o.mesh.position.z, o.hl, o.hw, o.mesh.rotation.y);
    test(player.x, player.z, 1.0, 0.45, null);
    if (typeof PEDS !== 'undefined') for (const q of PEDS) if (q.cross && q.m.visible) test(q.m.position.x, q.m.position.z, 0.4, 0.4, null);   // S12
    if (police.active) test(police.x, police.z, 1.0, 0.45, null);
    // red / yellow lights ahead
    for (const s of sigGrid.query(p.x, p.z, 45, _sq)) {
      const dx = s.x - p.x, dz = s.z - p.z, ahead = dx * fx + dz * fz;
      if (ahead < s.rc - 3 || ahead > s.rc + 35) continue;
      if (Math.abs(dx * fz - dz * fx) > s.rc + 4) continue;
      const [st] = sigState(s, fx, fz);
      if (st === 'R' || (st === 'Y' && ahead > s.rc + 7)) gap = Math.min(gap, ahead - s.rc - v.hl + 1);
    }
    const vb = v.base * lvl.speed;
    const target = gap < 1e8 ? Math.min(vb, Math.max(0, (gap - 1.0) * 1.4)) : vb;
    v.speed += (target - v.speed) * Math.min(1, dt * (target < v.speed ? 6 : 1.4));
    if (gap < 0.5) v.speed = 0;
    v.s += v.speed * dt;
    let guard = 0;
    while (v.s > v.E.L && guard++ < 4) {
      const over = v.s - v.E.L;
      const nx = chooseNext(v);
      if (!nx) { placeNear(v, 160, 400); break; }
      v.E = nx.E; v.fwd = nx.fwd; v.s = over;
    }
    const q = vehiclePose(v);
    p.x += (q.x - p.x) * k; p.z += (q.z - p.z) * k;
    v.mesh.rotation.y = angLerp(ry, q.ry, k * 0.8);
  }
}
