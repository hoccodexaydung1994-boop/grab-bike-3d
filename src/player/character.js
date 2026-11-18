'use strict';
/* ================= Tạo nhân vật & trang phục ================= */
const SKINS = CFG.outfits.SKINS;   // data/config/outfits.json
const JACKETS = CFG.outfits.JACKETS;   // data/config/outfits.json
const HELMET_LOOKS = CFG.outfits.HELMET_LOOKS;   // data/config/outfits.json
const ACCS = CFG.outfits.ACCS;   // data/config/outfits.json
if (!profile.look) profile.look = { g: 'm', skin: 0, jacket: 'grab', helmet: 'grab', acc: 'none' };
if (!profile.wardrobe) profile.wardrobe = { jacket: ['grab'], helmet: ['grab'], acc: ['none'] };
const _jtex = {};
function jacketTexFor(id) {
  if (_jtex[id]) return _jtex[id];
  const J = JACKETS[id];
  return _jtex[id] = canvasTex2(512, 256, (g, w, h) => {
    const grd = g.createLinearGradient(0, 0, 0, h); grd.addColorStop(0, J.c[0]); grd.addColorStop(1, J.c[1]);
    g.fillStyle = grd; g.fillRect(0, 0, w, h);
    g.fillStyle = J.c[2]; g.fillRect(w * 0.2, 0, w * 0.1, h); g.fillRect(w * 0.7, 0, w * 0.1, h); g.fillRect(0, 0, w, h * 0.16);
    const refl = (y, th) => { const gg = g.createLinearGradient(0, y, 0, y + th); gg.addColorStop(0, '#d9dde0'); gg.addColorStop(0.5, '#fff'); gg.addColorStop(1, '#b9bec2'); g.fillStyle = gg; g.fillRect(0, y, w, th); };
    if (id !== 'rain') { refl(h * 0.36, h * 0.07); refl(h * 0.78, h * 0.05); }
    g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(0, 0, 10, h); g.fillRect(w - 10, 0, 10, h);
    if (J.txt) { g.fillStyle = id === 'white' ? '#00a650' : '#fff'; g.font = '900 34px system-ui,sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(J.txt, w * 0.5, h * 0.6); }
    for (let i = 0; i < 1500; i++) { g.fillStyle = `rgba(0,0,0,${Math.random() * 0.05})`; g.fillRect(Math.random() * w, Math.random() * h, 2, 2); }
  });
}
// The preview uses fitted garment panels around the unchanged rider joints.
const alleyJackets = new Map();
function alleyJacketMaterial(id) {
  if (!Object.hasOwn(JACKETS, id)) id = 'grab';
  if (!alleyJackets.has(id)) {
    const J = JACKETS[id];
    const tone = id === 'grab' ? ['#257e5b', '#175840', '#193e32'] : J.c;
    const map = canvasTex2(512, 256, (g, w, h) => {
      const dye = g.createLinearGradient(0, 0, 0, h);
      dye.addColorStop(0, tone[0]); dye.addColorStop(1, tone[1]);
      g.fillStyle = dye; g.fillRect(0, 0, w, h);
      g.fillStyle = tone[2];
      g.fillRect(0, 0, w, 43);
      g.fillRect(0, h - 21, w, 21);
      for (const x of [w * 0.23, w * 0.69]) g.fillRect(x, 43, w * 0.08, h - 64);
      g.fillStyle = 'rgba(231,231,206,.65)';
      g.fillRect(w * 0.34, 51, w * 0.32, 6);
      g.fillStyle = 'rgba(235,231,205,.35)';
      for (let x = 7; x < w; x += 5) g.fillRect(x, 44, 3, 1);
      g.fillStyle = 'rgba(15,23,22,.5)';
      g.fillRect(0, 25, 5, h - 45); g.fillRect(w - 5, 25, 5, h - 45);
      g.fillStyle = id === 'white' ? '#285043' : '#e2e6d7';
      g.font = '700 24px system-ui,sans-serif'; g.textAlign = 'center';
      if (J.txt) g.fillText(J.txt, w / 2, 110);
      for (let i = 0; i < 2500; i++) {
        g.fillStyle = i % 2 ? 'rgba(0,0,0,.075)' : 'rgba(255,255,255,.085)';
        g.fillRect((i * 89.111) % w, (i * 27.313) % h, 1 + i % 3, 1);
      }
    });
    alleyJackets.set(id, map);
  }
  return std(0xffffff, { map: alleyJackets.get(id), roughness: id === 'rain' ? 0.54 : 0.94 });
}
function fittedJacket(material, width = 1) {
  const profile = [
    [-0.274, 0.128, 0.092], [-0.239, 0.171, 0.115],
    [-0.178, 0.172, 0.122], [-0.124, 0.164, 0.116],
    [-0.071, 0.178, 0.122], [0.012, 0.181, 0.129],
    [0.095, 0.191, 0.131], [0.159, 0.223, 0.111],
    [0.198, 0.201, 0.096], [0.241, 0.081, 0.070],
    [0.249, 0.050, 0.045],
  ];
  const segments = 32, stride = segments + 1;
  const positions = [], uvs = [], indices = [];
  for (let row = 0; row < profile.length; row++) {
    const [y, rx, rz] = profile[row];
    for (let col = 0; col <= segments; col++) {
      const u = col / segments;
      const angle = u * 2 * Math.PI;
      const fold = 1 + 0.025 * Math.cos(angle * 6 + row * 1.8);
      positions.push(Math.sin(angle) * rx * width * fold, y, Math.cos(angle) * rz * fold);
      uvs.push(u, (y - profile[0][0]) / (profile.at(-1)[0] - profile[0][0]));
      if (row && col) {
        const i = row * stride + col;
        indices.push(i - stride - 1, i - stride, i - 1, i - stride, i, i - 1);
      }
    }
  }
  const shape = new THREE.BufferGeometry();
  shape.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  shape.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  shape.setIndex(indices);
  shape.computeVertexNormals();
  const normals = shape.getAttribute('normal');
  for (let row = 0; row < profile.length; row++) {
    const left = row * stride, right = left + segments;
    const x = normals.getX(left) + normals.getX(right);
    const y = normals.getY(left) + normals.getY(right);
    const z = normals.getZ(left) + normals.getZ(right);
    const length = Math.hypot(x, y, z) || 1;
    normals.setXYZ(left, x / length, y / length, z / length);
    normals.setXYZ(right, x / length, y / length, z / length);
  }
  return new THREE.Mesh(shape, material);
}
function fittedSleeve(a, b, wide, narrow, material) {
  const start = new THREE.Vector3(...a), end = new THREE.Vector3(...b);
  const length = start.distanceTo(end);
  const rings = [[0, wide * 0.78], [0.16, wide], [0.38, wide * 0.94], [0.66, narrow * 1.12], [0.83, narrow * 1.04], [1, narrow]];
  const shape = new THREE.LatheGeometry(rings.map(([t, r]) => new THREE.Vector2(r, (t - 0.5) * length)), GFX_HIGH ? 16 : 12);
  const mesh = new THREE.Mesh(shape, material);
  mesh.position.copy(start).lerp(end, 0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), end.sub(start).normalize());
  return mesh;
}
function alleyHelmet(position, color, skinMaterial) {
  const group = new THREE.Group();
  group.position.set(...position);
  const shell = new THREE.MeshPhysicalMaterial({
    color: color === HELMET_LOOKS.grab.c ? 0x216d50 : color,
    roughness: 0.47, clearcoat: 0.42, clearcoatRoughness: 0.34,
  });
  const rubber = std(0x242727, { roughness: 0.87 });
  const detail = std(0xbcbdb0, { roughness: 0.7 });
  const tinted = new THREE.MeshPhysicalMaterial({
    color: 0x273638, roughness: 0.34, metalness: 0.15, clearcoat: 0.3, side: THREE.DoubleSide,
  });
  function add(geometry, material, x, y, z) {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, z);
    group.add(mesh);
    return mesh;
  }
  add(new THREE.SphereGeometry(0.143, 24, 15, 0, Math.PI * 2, 0, 1.94), shell, 0, 0.022, -0.012).scale.set(1, 1.06, 1.15);
  if (skinMaterial) add(new THREE.SphereGeometry(0.105, 18, 13), skinMaterial, 0, -0.058, 0.025).scale.set(0.88, 1.06, 0.95);
  const rim = add(new THREE.TorusGeometry(0.134, 0.009, 6, 26), rubber, 0, -0.032, -0.012);
  rim.rotation.x = Math.PI / 2 - 0.1; rim.scale.set(1, 1.14, 1);
  // Sphere U=0.25 faces forward (+Z).
  add(new THREE.SphereGeometry(0.148, 22, 9, 0.69, 1.77, 1.18, 0.74), tinted, 0, 0.025, -0.006).scale.set(1, 1, 1.16);
  const rear = add(new THREE.BoxGeometry(0.097, 0.012, 0.013), detail, 0, -0.006, -0.173);
  rear.rotation.x = 0.11;
  for (const side of [-1, 1]) {
    add(new THREE.SphereGeometry(0.025, 12, 8), rubber, side * 0.132, -0.030, 0.016).scale.set(0.4, 1, 1);
    group.add(limb([side * 0.103, -0.041, 0.005], [side * 0.071, -0.122, 0.049], 0.005, rubber));
  }
  return group;
}

// Grip centers in rider-local coordinates. The SH seat raises its rider by 0.19 m.
const RIDER_GRIPS = {
  vespa: [0.326, 1.101, 0.243],
  sh: [0.389, 0.944, 0.25],
  scooter: [0.292, 1.04, 0.457],
  underbone: [0.285, 1.06, 0.458],
};
let mountedDriverType = 'vespa';
function buildDriver2(look, bikeType = 'vespa') {
  const grip = RIDER_GRIPS[bikeType] || RIDER_GRIPS.vespa;
  look = Object.assign({ g: 'm', skin: 0, jacket: 'grab', helmet: 'grab', acc: 'none' }, look || {});
  const J = JACKETS[look.jacket] || JACKETS.grab, H = HELMET_LOOKS[look.helmet] || HELMET_LOOKS.grab, fem = look.g === 'f';
  const g = new THREE.Group();
  const skinM = std(SKINS[look.skin] || SKINS[0], { roughness: 0.7 });
  const jacket = ALLEY_PREVIEW ? alleyJacketMaterial(look.jacket)
    : std(0xffffff, { map: jacketTexFor(look.jacket in JACKETS ? look.jacket : 'grab'), roughness: look.jacket === 'rain' ? 0.25 : 0.75 });
  const sleeve = std(look.acc === 'sleeves' ? 0xf4f4f4 : ALLEY_PREVIEW && look.jacket === 'grab' ? 0x266f53 : J.sl, { roughness: ALLEY_PREVIEW ? 0.92 : 0.75 });
  const dark = std(J.dk, { roughness: 0.75 });
  const pants = std(fem ? 0x3b3f58 : 0x232a36, { roughness: 0.9 }), glove = std(0x151515, { roughness: 0.6 });
  if (ALLEY_PREVIEW) {
    const torso = fittedJacket(jacket, fem ? 0.93 : 1);
    torso.position.set(0, 1.142, -0.37);
    torso.rotation.x = 0.21;
    g.add(torso);
    const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.074, 0.10, 0.063, 18), dark);
    collar.position.set(0, 1.402, -0.316);
    collar.rotation.x = 0.21;
    g.add(collar);
  } else {
    const torso = limb([0, 0.92, -0.42], [0, 1.34, -0.33], fem ? 0.15 : 0.165, jacket);
    torso.scale.set(fem ? 1.08 : 1.18, 1, 0.82);
    g.add(torso);
  }
  g.add(limb([0, 1.47, -0.31], [0, 1.55, -0.29], 0.055, skinM));
  g.add(ALLEY_PREVIEW
    ? alleyHelmet([0, 1.652, -0.277], H.c, skinM)
    : helmet([0, 1.67, -0.27], H.c));
  if (fem) { const tail = limb([0, 1.6, -0.43], [0, 1.4, -0.5], 0.045, std(0x1a1310, { roughness: 0.8 })); g.add(tail); }
  if (look.acc === 'mask') { const m = new THREE.Mesh(new THREE.SphereGeometry(0.1, 14, 10, 0, Math.PI * 2, Math.PI * 0.45, Math.PI * 0.35), std(0x5aa9e6, { roughness: 0.9, side: THREE.DoubleSide })); m.position.set(0, 1.6, -0.2); m.scale.set(1, 0.9, 0.9); g.add(m); }
  if (look.acc === 'bag') { const b = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.4, 0.16), std(0x2b2f36, { roughness: 0.8 })); b.position.set(0, 1.15, -0.56); b.rotation.x = 0.2; g.add(b); }
  if (!ALLEY_PREVIEW) {
    const hem = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.025, 8, 24), dark);
    hem.rotation.x = Math.PI / 2 - 0.2; hem.position.set(0, 0.86, -0.43); hem.scale.set(1.15, 0.85, 1); g.add(hem);
  }
  for (const s of [-1, 1]) {
    const sh = [s * (fem ? 0.19 : 0.21), 1.32, -0.33], el = [s * 0.29, 1.13, -0.04], wr = [s * grip[0], grip[1], grip[2]];
    g.add(joint(sh, 0.075, sleeve), joint(el, 0.053, sleeve));
    if (ALLEY_PREVIEW) {
      g.add(fittedSleeve(sh, el, 0.076, 0.054, sleeve), fittedSleeve(el, wr, 0.055, 0.038, sleeve));
      const cuffStart = el.map((value, index) => value + (wr[index] - value) * 0.83);
      g.add(fittedSleeve(cuffStart, wr, 0.043, 0.038, dark));
    } else {
      g.add(limb(sh, el, 0.056, sleeve), limb(el, wr, 0.048, sleeve));
    }
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 10), glove); hand.scale.set(1, 0.9, 1.25); hand.position.set(...wr); g.add(hand);
    const hip = [s * 0.1, 0.87, -0.4], kn = [s * 0.17, 0.8, -0.02], an = [s * 0.14, 0.37, 0.06];
    g.add(joint(hip, 0.08, pants)); g.add(limb(hip, kn, fem ? 0.072 : 0.078, pants)); g.add(joint(kn, 0.07, pants)); g.add(limb(kn, an, 0.06, pants));
    const shoe = new THREE.Mesh(new THREE.CapsuleGeometry(0.05, 0.14, 4, 10), std(fem ? 0xf5f5f5 : 0x1d1d1f, { roughness: 0.6 })); shoe.rotation.x = Math.PI / 2; shoe.position.set(s * 0.14, 0.31, 0.11); g.add(shoe);
  }
  if (GFX_HIGH && !ALLEY_PREVIEW) {   // chi tiết thêm: mặt, cổ áo, khoá kéo, túi, băng phản quang, cổ tay, đế giày, đai lưng
    const refl = new THREE.MeshStandardMaterial({ color: 0xf0f0f0, metalness: 0.5, roughness: 0.25, emissive: 0x444444 });
    const face = new THREE.Mesh(new THREE.SphereGeometry(0.105, 20, 16), skinM); face.scale.set(0.92, 1.05, 0.95); face.position.set(0, 1.6, -0.255); g.add(face);
    const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.1, 0.085, 20, 1, true), std(J.dk, { side: THREE.DoubleSide, roughness: 0.8 })); collar.position.set(0, 1.48, -0.31); collar.rotation.x = 0.15; g.add(collar);
    const zip = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.42, 0.012), refl); zip.position.set(0, 1.14, -0.235); zip.rotation.x = 0.21; g.add(zip);
    for (const s of [-1, 1]) {
      const pk = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.075, 0.012), dark); pk.position.set(s * 0.1, 1.22, -0.222); pk.rotation.x = 0.21; g.add(pk);
      const wrist = [s * grip[0], grip[1], grip[2]];
      const elbow = [s * 0.29, 1.13, -0.04];
      const forearmAt = t => elbow.map((x, i) => x + (wrist[i] - x) * t);
      const band = new THREE.Mesh(new THREE.TorusGeometry(0.052, 0.012, 8, 20), refl); band.position.set(...forearmAt(0.62)); band.lookAt(...wrist); g.add(band);
      const band2 = new THREE.Mesh(new THREE.TorusGeometry(0.062, 0.012, 8, 20), refl); band2.position.set(s * 0.25, 1.225, -0.185); band2.lookAt(s * 0.29, 1.13, -0.04); g.add(band2);
      const cuff = new THREE.Mesh(new THREE.TorusGeometry(0.047, 0.014, 8, 20), dark); cuff.position.set(...forearmAt(0.86)); cuff.lookAt(...wrist); g.add(cuff);
      const sole = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.025, 0.24), std(0xf2f2f2)); sole.position.set(s * 0.14, 0.27, 0.11); g.add(sole);
      const knee = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 10), std(0x15181d, { roughness: 0.5 })); knee.scale.set(1, 1, 0.5); knee.position.set(s * 0.17, 0.81, 0.045); g.add(knee);
    }
    const belt = new THREE.Mesh(new THREE.TorusGeometry(0.175, 0.018, 8, 28), std(0x111111, { roughness: 0.5 })); belt.rotation.x = Math.PI / 2 - 0.2; belt.position.set(0, 0.9, -0.425); belt.scale.set(1.14, 0.84, 1); g.add(belt);
  }
  shadowAll(g);
  return g;
}
let walker = null;
// The preview avatar uses the same game-space anchor as the procedural rider.
let alleyRig = null;
const RIG_HEIGHT = 1.74;
const RIG_ASSET = 'models/courier-15b.glb';
function rigPoint(root, bone) {
  return root.worldToLocal(bone.getWorldPosition(new THREE.Vector3()));
}
function aimRigBone(root, bone, next, target) {
  const start = bone.worldToLocal(next.getWorldPosition(new THREE.Vector3())).normalize();
  const end = bone.worldToLocal(root.localToWorld(target.clone())).normalize();
  if (start.lengthSq() > 0 && end.lengthSq() > 0) {
    bone.quaternion.multiply(new THREE.Quaternion().setFromUnitVectors(start, end));
    bone.updateWorldMatrix(true, true);
  }
}

function fitRigLimb(root, [upper, lower, tip], target, bend) {
  const start = rigPoint(root, upper);
  const middle = rigPoint(root, lower);
  const end = rigPoint(root, tip);
  const first = start.distanceTo(middle);
  const second = middle.distanceTo(end);
  const direction = target.clone().sub(start);
  const distance = THREE.MathUtils.clamp(direction.length(), Math.abs(first - second) + 0.001, first + second - 0.001);
  direction.normalize();
  bend.addScaledVector(direction, -bend.dot(direction)).normalize();
  const along = (first * first - second * second + distance * distance) / (2 * distance);
  const offset = Math.sqrt(Math.max(0, first * first - along * along));
  const joint = start.clone().addScaledVector(direction, along).addScaledVector(bend, offset);
  aimRigBone(root, upper, lower, joint);
  aimRigBone(root, lower, tip, start.addScaledVector(direction, distance));
}

function snapshotRig(bones) {
  return bones.map(bone => ({ position: bone.position.clone(), quaternion: bone.quaternion.clone(), scale: bone.scale.clone() }));
}
function setRigPose(rig, pose, weight = 1, from = rig.rest) {
  for (let i = 0; i < rig.bones.length; i++) {
    const bone = rig.bones[i];
    const rest = from[i], next = pose[i];
    bone.position.copy(rest.position).lerp(next.position, weight);
    bone.quaternion.copy(rest.quaternion).slerp(next.quaternion, weight);
    bone.scale.copy(rest.scale).lerp(next.scale, weight);
  }
  rig.model.position.copy(rig.ground);
  rig.root.updateWorldMatrix(true, true);
}

function rigSeat(rig, type) {
  if (rig.seats.has(type)) return rig.seats.get(type);
  setRigPose(rig, rig.rest);
  const forwardBars = type === 'scooter' || type === 'underbone';
  const highSeat = type === 'sh';
  const pelvis = new THREE.Vector3(0, highSeat ? 0.86 : 0.88, forwardBars ? -0.23 : highSeat ? -0.25 : -0.32);
  const adjust = pelvis.sub(rigPoint(rig.root, rig.hips));
  rig.model.position.add(adjust);
  rig.root.updateWorldMatrix(true, true);

  const headAtRest = rig.head.getWorldQuaternion(new THREE.Quaternion());
  const spine = rigPoint(rig.root, rig.spine);
  const chest = rigPoint(rig.root, rig.chest);
  const lean = chest.sub(spine).applyAxisAngle(new THREE.Vector3(1, 0, 0), forwardBars ? 0.69 : highSeat ? 0.64 : 0.49).add(spine);
  aimRigBone(rig.root, rig.spine, rig.chest, lean);
  // Keep the rider looking along the road while the shoulders reach for the grips.
  const headInParent = rig.head.parent.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(headAtRest);
  rig.head.quaternion.slerp(headInParent, 0.9);
  const grip = RIDER_GRIPS[type] || RIDER_GRIPS.vespa;
  for (const { side, arm, leg, toe } of rig.limbs) {
    const hand = new THREE.Vector3(side * grip[0], grip[1], grip[2] - 0.036);
    const foot = new THREE.Vector3(side * 0.15, 0.34, 0.075);
    fitRigLimb(rig.root, arm, hand, new THREE.Vector3(side * 0.58, -1, 0.14));
    fitRigLimb(rig.root, leg, foot, new THREE.Vector3(side * 0.43, 0.08, 1));
    if (toe) aimRigBone(rig.root, leg[2], toe, rigPoint(rig.root, leg[2]).add(new THREE.Vector3(0, -0.07, 0.12)));
  }

  const seated = { adjust, pose: snapshotRig(rig.bones) };
  rig.seats.set(type, seated);
  return seated;
}

function prepareAlleyRig(gltf) {
  const model = gltf.scene;
  const root = new THREE.Group();
  root.name = 'Alley15bLocalRider';
  const bones = [], byName = new Map();
  let skin = null;
  model.traverse(node => {
    if (node.isBone) { bones.push(node); byName.set(node.name, node); }
    if (node.isSkinnedMesh) { skin = node; node.frustumCulled = false; }
  });
  if (!skin || !bones.length) throw new Error('Preview rider has no skin or skeleton');
  const bone = name => byName.get(name);
  const hips = bone('pelvis'), spine = bone('spine_01'), chest = bone('spine_02'), head = bone('Head');
  const limbs = [-1, 1].map(side => {
    const d = side === -1 ? '_r' : '_l';
    return {
      side,
      arm: ['upperarm', 'lowerarm', 'hand'].map(name => bone(name + d)),
      leg: ['thigh', 'calf', 'foot'].map(name => bone(name + d)),
      toe: bone('ball' + d),
    };
  });
  if ([hips, spine, chest, head, ...limbs.flatMap(({ arm, leg }) => [...arm, ...leg])].some(value => !value)) {
    throw new Error('Preview rider is missing a required bone');
  }

  root.add(model);
  root.updateMatrixWorld(true);
  // The imported character is normalized to the same ventral +Z axis as the scooter.
  const bounds = new THREE.Box3().setFromObject(model, true);
  const bodyHeight = bounds.max.y - bounds.min.y;
  if (!Number.isFinite(bodyHeight) || bodyHeight < 0.1) throw new Error('Preview rider has invalid bounds');
  const scale = RIG_HEIGHT / bodyHeight;
  model.scale.multiplyScalar(scale);
  model.position.y -= bounds.min.y * scale;
  root.updateMatrixWorld(true);
  for (const { arm, leg } of limbs) {
    for (const [upper, lower, end] of [arm, leg]) {
      const middle = rigPoint(root, lower);
      if (middle.distanceTo(rigPoint(root, upper)) < 0.001 || middle.distanceTo(rigPoint(root, end)) < 0.001) {
        throw new Error('Preview rider has a collapsed limb');
      }
    }
  }
  const mixer = new THREE.AnimationMixer(model);
  const actions = {};
  for (const [key, name] of Object.entries({ idle: 'Idle_Loop', walk: 'Walk_Loop', run: 'Jog_Fwd_Loop' })) {
    const clip = THREE.AnimationClip.findByName(gltf.animations, name);
    if (!clip) throw new Error('Preview rider has no compatible ' + key + ' clip');
    actions[key] = mixer.clipAction(clip);
  }
  const helmet = alleyHelmet([0, 0, 0], HELMET_LOOKS.grab.c, null);
  helmet.position.copy(rigPoint(root, head)).add(new THREE.Vector3(0, 0.095, -0.018));
  root.add(helmet);
  root.updateWorldMatrix(true, true);
  head.attach(helmet);
  root.updateMatrixWorld(true);
  shadowAll(root);
  const rest = snapshotRig(bones);
  actions.idle.play();
  mixer.update(0);
  const standing = snapshotRig(bones);
  actions.idle.stop();
  return {
    root, model, mixer, actions, bones, hips, spine, chest, head, limbs, rest, standing,
    ground: model.position.clone(), seats: new Map(), activeClip: null, poseMode: '',
  };
}

function hideAlleyRig() {
  if (!alleyRig || !alleyRig.root.visible) return;
  const rig = alleyRig;
  rig.root.removeFromParent();
  rig.root.visible = false;
  for (const part of driver.children) part.visible = true;
  rig.mixer.stopAllAction();
  rig.activeClip = null;
  rig.poseMode = '';
}

function updateAlleyRig(foot, dt) {
  const rig = alleyRig;
  const look = profile.look;
  const supportedLook = look.g === 'm' && look.skin === 0 && look.jacket === 'grab' && look.helmet === 'grab' && look.acc === 'none';
  if (!rig || !supportedLook) { hideAlleyRig(); return false; }
  if (walker) walker.g.visible = false;
  rig.root.visible = true;
  const onFoot = Boolean(foot);
  const parent = onFoot ? scene : driver;
  if (rig.root.parent !== parent) {
    parent.add(rig.root);
    for (const part of driver.children) if (part !== rig.root) part.visible = onFoot;
  }

  if (onFoot) {
    const move = foot.action;
    const t = move ? move.t * move.t * (3 - 2 * move.t) : 0;
    const seatedWeight = move ? (move.mount ? t : 1 - t) : 0;
    rig.root.position.set(player.x, player.y + RIDER.y * seatedWeight, player.z);
    rig.root.rotation.set(0, player.h, 0);
    if (move) {
      if (rig.poseMode !== 'transition') {
        rig.transitionPose = move.mount ? snapshotRig(rig.bones) : rig.standing;
        rig.mixer.stopAllAction();
        rig.activeClip = null;
      }
      const seat = rigSeat(rig, mountedDriverType);
      setRigPose(rig, seat.pose, seatedWeight, rig.transitionPose);
      rig.model.position.addScaledVector(seat.adjust, seatedWeight);
      rig.model.position.y += Math.sin(t * Math.PI) * 0.11;
      rig.poseMode = 'transition';
      return true;
    }
    if (rig.poseMode !== 'foot') setRigPose(rig, rig.rest);
    const next = foot.speed < 0.16 ? 'idle' : foot.run > 0.55 && foot.speed > 2.5 ? 'run' : 'walk';
    if (next !== rig.activeClip) {
      const action = rig.actions[next].reset().setEffectiveWeight(1).play();
      if (rig.activeClip) rig.actions[rig.activeClip].crossFadeTo(action, 0.18, false);
      rig.activeClip = next;
    }
    const playSpeed = next === 'run' ? foot.speed / 4.4 : next === 'walk' ? foot.speed / 1.85 : 1;
    rig.actions[next].setEffectiveTimeScale(THREE.MathUtils.clamp(playSpeed, 0.45, 1.3));
    rig.mixer.update(game.paused ? 0 : dt);
    rig.poseMode = 'foot';
  } else {
    rig.root.position.set(0, 0, 0);
    rig.root.rotation.set(0, 0, 0);
    if (rig.poseMode !== mountedDriverType) {
      if (rig.activeClip) {
        rig.mixer.stopAllAction();
        rig.activeClip = null;
      }
      const seat = rigSeat(rig, mountedDriverType);
      setRigPose(rig, seat.pose);
      rig.model.position.add(seat.adjust);
      rig.poseMode = mountedDriverType;
    }
  }
  return true;
}

if (ALLEY_PREVIEW) BOOT.push(() => {
  new GLTFLoader().load(RIG_ASSET + '?v=' + GAME_VERSION, (gltf) => {
    try { alleyRig = prepareAlleyRig(gltf); }
    catch (err) { console.warn('Could not prepare the 15B rider. Using the procedural rider.', err); }
  }, undefined, err => console.warn('Could not load the 15B rider. Using the procedural rider.', err));
});

function buildWalker(look) {
  const J = JACKETS[look.jacket] || JACKETS.grab;
  const H = HELMET_LOOKS[look.helmet] || HELMET_LOOKS.grab;
  const skin = std(SKINS[look.skin] || SKINS[0], { roughness: 0.77 });
  const jacket = ALLEY_PREVIEW ? alleyJacketMaterial(look.jacket)
    : std(0xffffff, { map: jacketTexFor(Object.hasOwn(JACKETS, look.jacket) ? look.jacket : 'grab'), roughness: 0.84 });
  const sleeve = std(look.acc === 'sleeves' ? 0xf4f4f4 : ALLEY_PREVIEW && look.jacket === 'grab' ? 0x266f53 : J.sl, { roughness: ALLEY_PREVIEW ? 0.92 : 0.83 });
  const dark = std(J.dk, { roughness: 0.78 });
  const pants = std(look.g === 'f' ? 0x3b3f58 : 0x232a36, { roughness: 0.9 });
  const shoes = std(look.g === 'f' ? 0xd8dce0 : 0x2b2c2e, { roughness: 0.84 });
  const soles = std(0x92979b, { roughness: 0.9 });
  const trim = std(0xd0d8db, { roughness: 0.46 });
  const shell = new THREE.MeshPhysicalMaterial({ color: H.c, roughness: 0.3, clearcoat: 0.8, clearcoatRoughness: 0.2 });
  const strap = std(0x25282b, { roughness: 0.8 });
  const g = new THREE.Group(), pelvis = new THREE.Group(), upper = new THREE.Group(), head = new THREE.Group();
  g.add(pelvis);
  pelvis.add(upper);
  upper.add(head);
  function part(parent, geometry, material, x, y, z) {
    const m = new THREE.Mesh(geometry, material);
    m.position.set(x, y, z);
    parent.add(m);
    return m;
  }
  function box(parent, w, h, d, material, x, y, z) {
    return part(parent, new THREE.BoxGeometry(w, h, d), material, x, y, z);
  }
  if (ALLEY_PREVIEW) {
    const body = fittedJacket(jacket, look.g === 'f' ? 0.92 : 1);
    body.position.set(0, 0.215, 0.022);
    upper.add(body);
  } else {
    const body = part(upper, new THREE.CylinderGeometry(0.191, 0.15, 0.43, 20), jacket, 0, 0.225, 0.025);
    body.scale.set(1.12, 1, 0.76);
  }
  const hip = part(pelvis, new THREE.SphereGeometry(0.18, 18, 12), pants, 0, -0.02, 0);
  hip.scale.set(1.08, 0.61, 0.85);
  box(upper, 0.009, 0.32, 0.009, dark, 0, 0.2, 0.169);
  part(upper, new THREE.CylinderGeometry(0.07, 0.093, 0.06, 14), dark, 0, 0.445, 0.031);
  head.position.set(0, 0.6, 0.043);
  if (ALLEY_PREVIEW) {
    head.add(alleyHelmet([0, 0.035, 0], H.c, skin));
  } else {
    const face = part(head, new THREE.SphereGeometry(0.117, 18, 14), skin, 0, -0.02, 0.025);
    face.scale.set(0.83, 1.12, 0.91);
    const helmetShell = part(head, new THREE.SphereGeometry(0.144, 24, 14, 0, Math.PI * 2, 0, Math.PI * 0.56), shell, 0, 0.033, 0);
    helmetShell.scale.set(0.98, 1.01, 1.14);
    const visor = box(head, 0.21, 0.019, 0.083, shell, 0, 0.028, 0.144);
    visor.rotation.x = -0.17;
    const band = box(head, 0.087, 0.022, 0.009, trim, 0, 0.043, -0.163);
    band.rotation.x = -0.13;
  }
  if (look.acc === 'mask') {
    const mask = part(head, new THREE.SphereGeometry(0.1, 16, 10), std(0x82b8d1), 0, -0.071, 0.076);
    mask.scale.set(0.89, 0.49, 0.6);
  }
  if (look.acc === 'bag') box(upper, 0.29, 0.31, 0.14, strap, 0, 0.24, -0.15);
  if (look.g === 'f') head.add(limb([0, -0.04, -0.108], [0, -0.23, -0.17], 0.044, strap));

  const limbs = [-1, 1].map(side => {
    part(head, new THREE.SphereGeometry(0.025, 10, 8), skin, side * 0.09, -0.041, 0.016).scale.set(0.52, 1, 0.66);
    const buckle = box(head, 0.015, 0.093, 0.018, strap, side * 0.108, -0.05, 0.013);
    buckle.rotation.x = -0.32;
    const arm = new THREE.Group(), elbow = new THREE.Group();
    arm.position.set(side * 0.213, 0.356, 0.018);
    elbow.position.set(0, -0.267, 0);
    upper.add(arm);
    arm.add(elbow);
    if (ALLEY_PREVIEW) {
      arm.add(joint([0, 0, 0], 0.069, sleeve), fittedSleeve([0, -0.018, 0], [0, -0.268, 0], 0.071, 0.052, sleeve));
      elbow.add(joint([0, 0, 0], 0.054, sleeve), fittedSleeve([0, 0, 0], [0, -0.231, 0], 0.055, 0.039, sleeve));
    } else {
      arm.add(limb([0, -0.03, 0], [0, -0.24, 0], 0.063, sleeve));
      elbow.add(limb([0, -0.005, 0], [0, -0.225, 0], 0.048, sleeve));
    }
    part(elbow, new THREE.CylinderGeometry(0.049, 0.045, 0.025, 12), trim, 0, -0.172, 0);
    part(elbow, new THREE.CylinderGeometry(0.045, 0.042, 0.027, 12), dark, 0, -0.22, 0);
    part(elbow, new THREE.SphereGeometry(0.051, 14, 10), skin, 0, -0.274, 0.01).scale.set(0.72, 1.11, 0.74);
    const leg = new THREE.Group(), knee = new THREE.Group(), foot = new THREE.Group();
    leg.position.set(side * 0.098, -0.04, 0);
    knee.position.set(0, -0.397, 0);
    foot.position.set(0, -0.387, 0);
    pelvis.add(leg);
    leg.add(knee, limb([0, -0.039, 0], [0, -0.348, 0], 0.073, pants));
    knee.add(foot, limb([0, -0.024, 0], [0, -0.337, 0], 0.055, pants));
    const shoe = part(foot, new THREE.CapsuleGeometry(0.051, 0.146, 5, 14), shoes, 0, -0.015, 0.052);
    shoe.rotation.x = Math.PI / 2;
    box(foot, 0.089, 0.023, 0.201, soles, 0, -0.052, 0.052);
    for (let i = 0; i < 3; i++) box(foot, 0.054, 0.008, 0.01, trim, 0, 0.027, 0.061 + i * 0.022);
    return { arm, elbow, leg, knee, foot, side };
  });
  shadowAll(g);
  g.visible = false;
  scene.add(g);
  return { g, upper, pelvis, limbs };
}
function updateWalker(dt) {
  const state = player.foot;
  if (ALLEY_PREVIEW && updateAlleyRig(state, dt)) return;
  if (!state) { if (walker) walker.g.visible = false; return; }
  if (!walker) walker = buildWalker(profile.look);
  poseWalker(walker, state, player, player.parked.side, RIDER.y, dt);
}
function poseWalker(rig, state, actor, parkSide, seatHeight, dt) {
  const { g, upper, pelvis, limbs } = rig;
  const action = state.action;
  const ease = action ? action.t * action.t * (3 - 2 * action.t) : 0;
  const seat = action ? (action.mount ? ease : 1 - ease) : 0;
  const swing = action ? Math.sin(ease * Math.PI) : 0;
  const move = Math.min(1, state.speed / 1.4);
  state.gait = (state.gait || 0) + (move - (state.gait || 0)) * (1 - Math.exp(-dt * 12));
  const gait = state.gait, run = state.run;
  const heading = actor.h;
  const leanBack = 0.37 * seat;
  g.visible = true;
  g.position.set(actor.x - Math.sin(heading) * leanBack, actor.y + seatHeight * seat, actor.z - Math.cos(heading) * leanBack);
  g.rotation.y = heading;
  pelvis.position.y = 0.882 + 0.014 * Math.cos(state.phase * 2) * gait + 0.05 * seat + 0.12 * swing;
  pelvis.rotation.z = Math.sin(state.phase) * gait * 0.035;
  upper.rotation.x = 0.08 * gait + 0.12 * run + 0.17 * seat;
  upper.rotation.y = -Math.sin(state.phase) * gait * 0.065;
  for (const { arm, elbow, leg, knee, foot, side } of limbs) {
    const stride = Math.sin(state.phase) * side;
    const bend = Math.max(0, Math.cos(state.phase) * side);
    const insideLeg = side !== parkSide;
    arm.rotation.x = stride * gait * (0.32 + 0.16 * run) - 0.75 * seat;
    arm.rotation.z = side * (0.11 + 0.22 * seat);
    elbow.rotation.x = -0.08 - 0.35 * bend * gait - 0.47 * run - 0.5 * seat;
    leg.rotation.x = -stride * gait * (0.46 + 0.22 * run) - 1.07 * seat - (insideLeg ? 0.74 : 0.16) * swing;
    leg.rotation.z = side * (0.045 + 0.13 * seat + (insideLeg ? 0.22 : 0.08) * swing);
    knee.rotation.x = bend * gait * (0.51 + 0.55 * run) + 1.05 * seat + (insideLeg ? 0.6 : 0.2) * swing;
    foot.rotation.x = -0.37 * (knee.rotation.x + leg.rotation.x);
  }
}
function disposeDriver(root) {
  root.traverse(m => {
    if (!m.isMesh) return;
    m.geometry.dispose();
    m.material.dispose();
  });
}
function replaceMountedDriver() {
  if (alleyRig?.root.parent === driver) alleyRig.root.removeFromParent();
  const ng = buildDriver2(profile.look, mountedDriverType);
  disposeDriver(driver);
  driver.clear();
  for (const c of [...ng.children]) driver.add(c);
}
function fitMountedDriver(bikeType) {
  if (bikeType === mountedDriverType) return;
  mountedDriverType = bikeType;
  replaceMountedDriver();
}
function rebuildDriver() {
  replaceMountedDriver();
  if (walker) { disposeDriver(walker.g); scene.remove(walker.g); walker = null; }
}
rebuildDriver();

/* ---- panel tab ---- */
{
  const b = document.createElement('button'); b.dataset.tab = 'char'; b.textContent = '👕 Nhân vật';
  $('mpTabs').insertBefore(b, $('mpClose'));
}
const _renderPanel = renderPanel;
renderPanel = function () {
  _renderPanel();
  if (panelTab !== 'char') return;
  const P = profile, E = P.english ? 1 : 0, lk = P.look, W = P.wardrobe;
  const row = (slot, DEF) => Object.entries(DEF).map(([id, d]) => {
    const own = W[slot].includes(id), wear = lk[slot] === id, lock = P.level < d.lv;
    const col = slot === 'jacket' ? d.c[0] : slot === 'helmet' ? '#' + d.c.toString(16).padStart(6, '0') : '#888';
    return `<button class="chip${wear ? ' sel' : ''}" data-act="wear" data-slot="${slot}" data-id="${id}" ${lock ? 'disabled' : ''} style="border-left:12px solid ${col}">${d.n[E]}${wear ? ' ✓' : own ? '' : lock ? ` 🔒Lv${d.lv}` : ` · ${fmtVND(d.cost)}`}</button>`;
  }).join(' ');
  $('mpBody').innerHTML = `<h3>👕 ${L('Nhân vật & trang phục', 'Character & outfits')}</h3>
    <p>${L('Giới tính', 'Gender')}: <button class="chip${lk.g === 'm' ? ' sel' : ''}" data-act="look" data-k="g" data-v="m">👨 ${L('Nam', 'Male')}</button> <button class="chip${lk.g === 'f' ? ' sel' : ''}" data-act="look" data-k="g" data-v="f">👩 ${L('Nữ', 'Female')}</button></p>
    <p>${L('Màu da', 'Skin')}: ${SKINS.map((c, i) => `<button class="chip${lk.skin === i ? ' sel' : ''}" data-act="look" data-k="skin" data-v="${i}" style="background:#${c.toString(16)};width:34px">&nbsp;</button>`).join(' ')}</p>
    <h4>🧥 ${L('Áo khoác', 'Jacket')}</h4><p>${row('jacket', JACKETS)}</p>
    <h4>⛑️ ${L('Mũ bảo hiểm', 'Helmet')}</h4><p>${row('helmet', HELMET_LOOKS)}</p>
    <h4>🎒 ${L('Phụ kiện', 'Accessory')}</h4><p>${row('acc', ACCS)}</p>
    <p><small>${L('Mua bằng tiền mặt/ví. Bạn bè online sẽ thấy trang phục của bạn.', 'Paid from cash/wallet. Online friends see your outfit.')} ${L('Mẹo: đổi trang phục khi đứng ở menu để xem xe xoay 360°.', '')}</small></p>`;
};
$('mpBody').addEventListener('click', (e) => {
  const b = e.target.closest('[data-act]'); if (!b || b.disabled) return;
  const P = profile, act = b.dataset.act;
  if (act === 'look') { P.look[b.dataset.k] = b.dataset.k === 'skin' ? +b.dataset.v : b.dataset.v; rebuildDriver(); }
  else if (act === 'wear') {
    const slot = b.dataset.slot, id = b.dataset.id, D = { jacket: JACKETS, helmet: HELMET_LOOKS, acc: ACCS }[slot][id];
    if (!P.wardrobe[slot].includes(id)) { if (!spend(D.cost, 'other')) return; P.wardrobe[slot].push(id); toast(`🛍️ ${L('Đã mua', 'Bought')} ${D.n[P.english ? 1 : 0]}`, 1.6); }
    P.look[slot] = id; rebuildDriver();
  } else return;
  saveProfile(); renderPanel();
});
// online: send & show looks (after net/online.js is loaded)
BOOT.push(() => {
  const _nm = netMsg;
  netMsg = () => {
    const message = Object.assign(_nm(), { lk: profile.look });
    const parked = player.parked;
    if (parked) {
      const { speed, run, action } = player.foot;
      message.walk = { x: message.x, z: message.z, h: message.h, speed, run, side: parked.side };
      if (action) message.walk.action = { t: action.t, mount: action.mount };
      Object.assign(message, { x: +parked.x.toFixed(2), z: +parked.z.toFixed(2), h: +parked.h.toFixed(3), l: -parked.side * 0.12 });
    }
    return message;
  };
  FRAME.push((dt) => {
    const blend = 1 - Math.exp(-dt * 12);
    for (const r of NET.remotes.values()) {
      const lk = r.data.lk;
      const key = JSON.stringify(lk || null);
      if (lk && r.lkKey !== key) {
        const old = r.lean.children[1];
        if (old) { r.lean.remove(old); disposeDriver(old); }
        const rider = buildDriver2(lk);
        rider.position.y = BIKES[r.bk]?.model === 'sh' ? 0.19 : 0;
        r.lean.add(rider);
      }
      const w = r.data.walk;
      const valid = w && [w.x, w.z, w.h, w.speed, w.run].every(Number.isFinite)
        && w.x >= BX0 - 60 && w.x <= BX1 + 60 && w.z >= BZ0 - 60 && w.z <= BZ1 + 60;
      const rider = r.lean.children[1];
      if (rider) rider.visible = !valid;
      if (r.walker && r.lkKey !== key) {
        scene.remove(r.walker.g);
        disposeDriver(r.walker.g);
        r.walker = null;
      }
      r.lkKey = key;
      if (!valid) {
        if (r.walker) r.walker.g.visible = false;
        r.walkPose = null;
        continue;
      }
      if (!r.walker) r.walker = buildWalker(lk || {});
      const pose = r.walkPose ||= { x: w.x, y: 0.07, z: w.z, h: w.h, phase: 0, run: 0 };
      const dx = (w.x - pose.x) * blend, dz = (w.z - pose.z) * blend;
      pose.x += dx;
      pose.z += dz;
      pose.h = angLerp(pose.h, w.h, blend);
      pose.speed = THREE.MathUtils.clamp(w.speed, 0, 4.4);
      pose.run += (THREE.MathUtils.clamp(w.run, 0, 1) - pose.run) * blend;
      pose.phase = (pose.phase + Math.hypot(dx, dz) * (5.2 - pose.run * 0.9)) % (2 * Math.PI);
      const action = w.action;
      pose.action = action && Number.isFinite(action.t)
        ? { t: THREE.MathUtils.clamp(action.t, 0, 1), mount: action.mount === true } : null;
      poseWalker(r.walker, pose, pose, w.side === -1 ? -1 : 1, rider?.position.y || 0, dt);
    }
  });
});
{ const st = document.createElement('style'); st.textContent = '.chip.sel{background:#00b14f!important;color:#fff}.chip:disabled{opacity:.45;cursor:default}'; document.head.appendChild(st); }
