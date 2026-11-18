'use strict';
/* ================= Hẻm 15B art preview ================= */
// Centerline follows the connected OpenStreetMap alley from Lê Thánh Tôn.
const ALLEY_15B_PATH = [
  [-31.63, 26.03], [-25.51, 31.40], [-5.29, 49.46],
  [0.22, 42.18], [33.70, 64.41], [46.92, 73.49], [55, 80.12]
];

function alley15bBlend(x, z) {
  if (!ALLEY_PREVIEW) return 0;
  let distance = Infinity;
  for (let i = 1; i < ALLEY_15B_PATH.length; i++) {
    const a = ALLEY_15B_PATH[i - 1], b = ALLEY_15B_PATH[i];
    distance = Math.min(distance, segProj(x, z, ...a, ...b).d);
  }
  const t = 1 - THREE.MathUtils.clamp((distance - 3) / 22, 0, 1);
  return t * t * (3 - 2 * t);
}

if (ALLEY_PREVIEW) {
  const art = new THREE.Group();
  const shops = [
    { anchor: [-20.35, 40.63], street: [-18, 38], title: 'UDON MỘC', accent: 'うどん', icon: 'bowl', sign: '#e4cf9c', ink: '#30251c', wall: 0x715044, frame: 0x3f2820, fabric: 0x2f564d, awning: 'valance' },
    { anchor: [-15.75, 35.49], street: [-18.5, 38.5], title: 'ĐÈN ĐỎ', accent: '居酒屋', icon: 'lantern', sign: '#7c221e', ink: '#ffe3ae', wall: 0x462d2a, frame: 0x211821, fabric: 0x8d3023, awning: 'noren' },
    { anchor: [30.34, 55.41], street: [29.04, 61.32], title: 'CÀ PHÊ HOA', accent: '喫茶', icon: 'flower', sign: '#294b46', ink: '#ecdfbc', wall: 0x8d835b, frame: 0x5d4021, fabric: 0x5d5e32, awning: 'stripes' },
    { anchor: [52.46, 82.50], street: [53.5, 78.9], title: 'BẾP 15B', accent: '台所', icon: 'bowl', sign: '#234954', ink: '#ebdeae', wall: 0x3d655c, frame: 0x253348, fabric: 0x47796d, awning: 'valance' },
    { anchor: [61.4, 73.62], street: [56.5, 81.3], title: 'TIỆM TRÀ', accent: '茶', icon: 'flower', sign: '#ead7ae', ink: '#443326', wall: 0x634a3e, frame: 0x332623, fabric: 0x304d53, awning: 'noren' }
  ];
  const material = {
    dark: std(0x292320, { roughness: 0.85 }),
    brass: std(0x9c794a, { roughness: 0.45, metalness: 0.55 }),
    cream: std(0xd3baa0, { roughness: 0.85 }),
    window: std(0xc08a52, { roughness: 0.62, metalness: 0.1, emissive: 0xf09339, emissiveIntensity: 0.65 }),
    screen: std(0xc16b27, { roughness: 0.8, emissive: 0xf0964c, emissiveIntensity: 0.36 }),
    lantern: std(0xb74323, { roughness: 0.78, emissive: 0xe54816, emissiveIntensity: 0.55 }),
    paleLantern: std(0xdcb477, { roughness: 0.78, emissive: 0xf9b353, emissiveIntensity: 0.38 }),
    plantPot: std(0x6e492e, { roughness: 0.96 }),
    plant: std(0x526140, { roughness: 0.95 }),
    plantTip: std(0x6d7541, { roughness: 0.9 }),
    iron: std(0x414033, { roughness: 0.88, metalness: 0.28 }),
    cable: std(0x302d27, { roughness: 0.95 })
  };

  const atlasWidth = 512, tileHeight = 128;
  const atlas = canvasTex(atlasWidth, tileHeight * 8, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    for (const [i, shop] of shops.entries()) {
      const y = i * tileHeight;
      g.fillStyle = shop.sign;
      g.fillRect(0, y, w, tileHeight);
      g.strokeStyle = shop.ink;
      g.lineWidth = 2;
      g.strokeRect(8, y + 8, w - 16, tileHeight - 16);
      g.strokeRect(13, y + 13, w - 26, tileHeight - 26);
      g.fillStyle = shop.ink;
      g.textAlign = 'left';
      g.font = '700 55px Georgia, serif';
      g.fillText(shop.title, 106, y + 68, w - 132);
      g.font = '600 23px "Noto Sans CJK JP", "Noto Sans JP", sans-serif';
      g.fillText(shop.accent + '   •   HẺM 15B', 109, y + 101, w - 132);
      g.lineWidth = 4;
      g.beginPath();
      g.arc(60, y + 64, 31, 0, Math.PI * 2);
      g.stroke();
      g.beginPath();
      if (shop.icon === 'bowl') {
        g.ellipse(60, y + 63, 17, 4, 0, 0, Math.PI * 2);
        g.moveTo(43, y + 64);
        g.quadraticCurveTo(60, y + 94, 77, y + 64);
        g.moveTo(55, y + 57); g.lineTo(66, y + 42);
        g.moveTo(61, y + 57); g.lineTo(72, y + 43);
      } else if (shop.icon === 'lantern') {
        g.ellipse(60, y + 65, 13, 18, 0, 0, Math.PI * 2);
        g.moveTo(54, y + 44); g.lineTo(66, y + 44);
        g.moveTo(54, y + 87); g.lineTo(66, y + 87);
        g.moveTo(60, y + 51); g.lineTo(60, y + 79);
      } else {
        for (let j = 0; j < 5; j++) {
          const angle = j * Math.PI * 2 / 5;
          const x = 60 + Math.cos(angle) * 10, cy = y + 64 + Math.sin(angle) * 10;
          g.moveTo(x + 7, cy); g.arc(x, cy, 7, 0, Math.PI * 2);
        }
      }
      g.stroke();
    }
  });
  const signMat = std(0xffffff, { map: atlas, roughness: 0.83, emissiveMap: atlas, emissive: 0xffe1ad, emissiveIntensity: 0.36 });
  const unitBox = new THREE.BoxGeometry(1, 1, 1);
  const ball = new THREE.SphereGeometry(1, 9, 7);
  const pot = new THREE.CylinderGeometry(0.24, 0.17, 0.36, 9);

  function box(g, mat, x, y, z, width, height, depth) {
    const mesh = new THREE.Mesh(unitBox, mat);
    mesh.position.set(x, y, z);
    mesh.scale.set(width, height, depth);
    g.add(mesh);
    return mesh;
  }
  function ellipse(g, mat, x, y, z, width, height, depth) {
    const mesh = new THREE.Mesh(ball, mat);
    mesh.position.set(x, y, z);
    mesh.scale.set(width, height, depth);
    g.add(mesh);
    return mesh;
  }
  function attachCable(points, radius, mat = material.cable) {
    for (let i = 1; i < points.length; i++) {
      const a = new THREE.Vector3(...points[i - 1]), b = new THREE.Vector3(...points[i]);
      const delta = b.clone().sub(a);
      const piece = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, delta.length(), 5), mat);
      piece.position.copy(a).addScaledVector(delta, 0.5);
      piece.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.normalize());
      art.add(piece);
    }
  }

  function roadClearance(x, z) {
    let clearance = Infinity;
    for (const s of segGrid.query(x, z, 3, [])) {
      if (s.c >= 6) continue;
      clearance = Math.min(clearance, segProj(x, z, s.ax, s.az, s.bx, s.bz).d - s.w / 2);
    }
    return clearance;
  }
  function wallAt(shop) {
    const [x, z] = shop.anchor;
    let wall;
    for (const b of bColliders.query(x, z, 2, [])) {
      for (let i = 0, j = b.p.length - 2; i < b.p.length; j = i, i += 2) {
        const ax = b.p[j], az = b.p[j + 1], bx = b.p[i], bz = b.p[i + 1];
        const L = Math.hypot(bx - ax, bz - az);
        if (L < 4 || b.h < 4.5) continue;
        const f = segProj(x, z, ax, az, bx, bz);
        if (f.d > 0.32 || f.t < 0.22 || f.t > 0.78 || (wall && f.d >= wall.d)) continue;
        const tx = (bx - ax) / L, tz = (bz - az) / L;
        const forward = (shop.street[0] - f.x) * -tz + (shop.street[1] - f.z) * tx;
        const nx = forward < 0 ? tz : -tz, nz = forward < 0 ? -tx : tx;
        if (pip(f.x + nx * 0.2, f.z + nz * 0.2, b.p)) continue;
        wall = { x: f.x, z: f.z, nx, nz, d: f.d, width: Math.min(6.7, L * 0.91) };
      }
    }
    return wall;
  }
  function addPlant(g, x, z) {
    const planter = new THREE.Mesh(pot, material.plantPot);
    planter.position.set(x, 0.26, z);
    g.add(planter);
    ellipse(g, material.plant, x, 0.59, z, 0.24, 0.25, 0.23);
    ellipse(g, material.plantTip, x - 0.09, 0.75, z + 0.02, 0.14, 0.25, 0.12);
    ellipse(g, material.plant, x + 0.12, 0.68, z - 0.06, 0.13, 0.22, 0.13);
  }

  for (const [index, shop] of shops.entries()) {
    const wall = wallAt(shop);
    if (!wall) continue;
    const { x, z, nx, nz, width } = wall;
    const facade = new THREE.Group();
    facade.position.set(x, 0.07, z);
    facade.rotation.y = Math.atan2(nx, nz);
    art.add(facade);

    const frame = std(shop.frame, { roughness: 0.85 });
    const stucco = std(shop.wall, { roughness: 0.95 });
    const cloth = std(shop.fabric, { roughness: 0.97 });
    // Recessed-looking displays use depth between the backing, frames, and glazing bars.
    box(facade, stucco, 0, 1.91, 0.10, width, 3.82, 0.22);
    box(facade, material.dark, 0, 1.39, 0.22, width - 0.32, 2.64, 0.08);
    box(facade, material.window, 0, 1.59, 0.28, width - 0.50, 2.15, 0.07);
    box(facade, material.screen, 0, 0.58, 0.335, width - 0.5, 0.42, 0.055);
    box(facade, frame, 0, 0.27, 0.32, width - 0.30, 0.48, 0.10);
    for (const px of [-0.48, -0.26, -0.105, 0.105, 0.26, 0.48]) {
      box(facade, frame, width * px, 1.42, 0.35, Math.abs(px) === 0.48 ? 0.19 : 0.08, 2.84, 0.15);
    }
    for (const y of [0.51, 1.02, 2.16, 2.71]) box(facade, frame, 0, y, 0.375, width, 0.09, 0.13);
    for (const side of [-1, 1]) {
      box(facade, material.brass, side * 0.14, 1.16, 0.40, 0.027, 0.32, 0.09);
      box(facade, material.dark, side * width * 0.34, 1.06, 0.385, width * 0.24, 0.055, 0.08);
      for (let j = 0; j < 3; j++) {
        ellipse(facade, j === 1 ? material.cream : material.screen, side * width * 0.40 + j * 0.17, 1.13, 0.42, 0.067, 0.085, 0.03);
      }
    }
    box(facade, frame, 0, 3.19, 0.29, width, 0.89, 0.23);
    box(facade, material.brass, 0, 3.66, 0.32, width, 0.067, 0.24);
    const sign = new THREE.PlaneGeometry(width - 0.24, 0.72);
    const uv = sign.attributes.uv;
    for (let j = 0; j < uv.count; j++) uv.setXY(j, 0.01 + uv.getX(j) * 0.98, 1 - (index + 0.02 + (1 - uv.getY(j)) * 0.96) / 8);
    const plaque = new THREE.Mesh(sign, signMat);
    plaque.position.set(0, 3.18, 0.415);
    facade.add(plaque);

    const depth = 0.72;
    const ends = [-width * 0.46, width * 0.46];
    if (ends.every(px => roadClearance(x + nz * px + nx * (depth + 0.16), z - nx * px + nz * (depth + 0.16)) > 0.64)) {
      const awning = box(facade, cloth, 0, 2.79, depth * 0.54, width + 0.10, 0.055, depth);
      awning.rotation.x = 0.16;
      const hemZ = depth + 0.05;
      if (shop.awning === 'noren') {
        for (let j = 0; j < 5; j++) {
          const px = (j - 2) * (width / 5);
          box(facade, cloth, px, 2.54, hemZ, width / 5 - 0.038, 0.42, 0.028);
          box(facade, material.cream, px, 2.49, hemZ + 0.017, 0.14, 0.056, 0.008);
        }
      } else {
        box(facade, cloth, 0, 2.64, hemZ, width + 0.10, 0.23, 0.035);
        if (shop.awning === 'stripes') {
          for (let j = -5; j <= 5; j++) box(facade, material.cream, j * width / 12, 2.64, hemZ + 0.021, width / 27, 0.22, 0.009);
        }
      }
      for (const side of [-1, 1]) {
        const lanternX = side * width * 0.40;
        box(facade, material.dark, lanternX, 2.58, hemZ + 0.02, 0.025, 0.28, 0.025);
        const LanternMat = index % 2 === 1 ? material.lantern : material.paleLantern;
        ellipse(facade, LanternMat, lanternX, 2.32, hemZ + 0.02, 0.13, 0.17, 0.13);
        for (const y of [2.175, 2.465]) ellipse(facade, material.dark, lanternX, y, hemZ + 0.02, 0.075, 0.025, 0.075);
      }
    }
    for (const side of [-1, 1]) {
      const px = side * width * 0.48, pz = 0.37;
      const wx = x + nz * px + nx * pz, wz = z - nx * px + nz * pz;
      const overlapsParking = MAP.parking.some(([bx, bz]) => Math.hypot(bx - wx, bz - wz) < 1.55);
      if (!overlapsParking && roadClearance(wx, wz) > 1.05) addPlant(facade, px, pz);
    }
  }

  // Join the central clear lots into two paved forecourts below the existing sidewalks.
  // Small tiles stop at buildings and any crossing carriageway.
  {
    const tex = tileTex(128, 128, (g, w, h) => {
      g.fillStyle = '#837a68';
      g.fillRect(0, 0, w, h);
      for (let row = 0; row < 5; row++) {
        for (let col = -1; col < 5; col++) {
          const x = col * 32 + (row % 2) * 16, y = row * 26;
          g.fillStyle = ['#beb19a', '#aaa38e', '#b6ac97', '#c4b8a4'][(row * 3 + col + 4) % 4];
          g.fillRect(x + 1, y + 1, 30, 24);
          g.fillStyle = 'rgba(250,231,196,.35)';
          g.fillRect(x + 2, y + 1, 28, 1);
        }
      }
      for (let i = 0; i < 800; i++) {
        const x = (i * 139 + i * i * 17) % w, y = (i * 173 + i * i * 11) % h;
        g.fillStyle = i % 2 ? 'rgba(92,77,65,.18)' : 'rgba(245,230,199,.15)';
        g.fillRect(x, y, 1, 1);
      }
    });
    const [a, b] = ALLEY_15B_PATH.slice(3, 5);
    const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const dx = (b[0] - a[0]) / length, dz = (b[1] - a[1]) / length;
    const point = (u, v) => [a[0] + dx * u + dz * v, a[1] + dz * u - dx * v];
    const open = ([x, z], margin) => roadClearance(x, z) > margin
      && !bColliders.query(x, z, 0.5, []).some(building => pip(x, z, building.p));
    const paving = nb();
    for (const side of [-1, 1]) {
      for (let u = 1.5; u < length - 1.5; u += 1.5) {
        for (let v = 2.55; v < 11.6; v += 1.5) {
          const corners = [point(u, v * side), point(u + 1.5, v * side), point(u + 1.5, (v + 1.5) * side), point(u, (v + 1.5) * side)];
          if (!corners.every(p => open(p, 0.16)) || !open(point(u + 0.75, (v + 0.75) * side), 0.16)) continue;
          const first = paving.pos.length / 3;
          for (const [x, z] of corners) paving.pos.push(x, 0.053, z);
          if (side === 1) paving.idx.push(first, first + 1, first + 2, first, first + 2, first + 3);
          else paving.idx.push(first, first + 2, first + 1, first, first + 3, first + 2);
        }
      }
    }
    meshFrom(paving, std(0xb4ad95, { roughness: 0.97, map: tex, side: THREE.DoubleSide }), false, 2.4);
    for (const [u, v] of [[5.2, 5.1], [10.8, -4.8], [18.2, 5.7], [25.1, -5.1], [32.0, 6.1]]) {
      const [x, z] = point(u, v);
      if (!open([x, z], 2.3) || MAP.parking.some(([px, pz]) => Math.hypot(px - x, pz - z) < 2)) continue;
      const cluster = new THREE.Group();
      cluster.position.set(x, 0.05, z);
      cluster.rotation.y = Math.atan2(dx, dz);
      box(cluster, material.plantPot, 0, 0.23, 0, 0.64, 0.46, 1.56);
      box(cluster, material.cream, 0, 0.47, 0, 0.68, 0.055, 1.62);
      box(cluster, material.dark, 0, 0.509, 0, 0.53, 0.028, 1.45);
      for (const pz of [-0.53, -0.11, 0.34, 0.52]) {
        ellipse(cluster, material.plant, 0, 0.64, pz, 0.22, 0.25, 0.24);
        ellipse(cluster, material.plantTip, pz * 0.19, 0.83, pz, 0.15, 0.22, 0.17);
      }
      art.add(cluster);
    }
  }

  // Flush drainage strips and maintenance covers leave the existing driving surface intact.
  for (let i = 1; i < ALLEY_15B_PATH.length; i++) {
    const a = ALLEY_15B_PATH[i - 1], b = ALLEY_15B_PATH[i];
    const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (length < 10) continue;
    const dx = (b[0] - a[0]) / length, dz = (b[1] - a[1]) / length;
    for (let along = 4; along < length - 3; along += 7.1) {
      const side = Math.round(along) % 2 === 0 ? 1 : -1;
      const x = a[0] + dx * along + dz * side * 1.84, z = a[1] + dz * along - dx * side * 1.84;
      if (roadClearance(x, z) < 0.12) continue;
      const drain = new THREE.Group();
      drain.position.set(x, 0.105, z);
      drain.rotation.y = Math.atan2(dx, dz);
      box(drain, material.iron, 0, 0, 0, 0.37, 0.014, 0.83);
      for (let j = -3; j <= 3; j++) box(drain, material.dark, 0, 0.009, j * 0.095, 0.26, 0.008, 0.032);
      art.add(drain);
    }
  }

  // Cables stay well above vehicles and link the opposing entrance façades.
  for (const [a, b] of [
    [[-22.74, 5.76, 38.57], [-15.72, 5.52, 35.45]],
    [[-18.02, 5.60, 42.74], [-13.18, 5.63, 37.74]]
  ]) {
    const points = [];
    for (let j = 0; j <= 5; j++) {
      const t = j / 5;
      points.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t - Math.sin(Math.PI * t) * 0.35, a[2] + (b[2] - a[2]) * t]);
    }
    attachCable(points, 0.013);
  }
  const baked = bake(art);
  baked.name = 'Hẻm 15B streetscape preview';
  baked.traverse(mesh => {
    if (mesh.isMesh) mesh.castShadow = false;
  });
  scene.add(baked);
}
