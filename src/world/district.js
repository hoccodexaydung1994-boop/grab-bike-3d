'use strict';
/* ================= District selection and District 1 streetscape ================= */
{
  const select = $('districtSelect');
  const copy = $('districtDescription');
  if (select && copy) {
    const districtName = DISTRICT === 'q1' ? 'Quận 1 — Lê Thánh Tôn' : 'Quận 7 — Phú Mỹ Hưng';
    document.title = 'Grab Bike 3D · ' + districtName;
    select.value = DISTRICT;
    select.disabled = false;
    copy.textContent = DISTRICT === 'q1'
      ? L('Chạy quanh Hẻm 15B, khám phá phố Nhật và nhận cuốc GrabBike & GrabFood. Đường lấy từ OpenStreetMap, cảnh phố được cách điệu.', 'Take GrabBike and GrabFood jobs around Hẻm 15B and Japan Town. Streets use OpenStreetMap data with stylized scenery.')
      : L('Chạy quanh Phú Mỹ Hưng trên bản đồ OpenStreetMap. Nhận cuốc GrabBike & GrabFood, nhớ dừng đèn đỏ.', 'Take GrabBike and GrabFood jobs around Phú Mỹ Hưng on the OpenStreetMap street network.');
    select.addEventListener('change', () => {
      const next = select.value;
      if (game.mode !== 'menu' || game.order || game.paused || next === DISTRICT) {
        select.value = DISTRICT;
        return;
      }
      saveProfile();
      const url = new URL(location.href);
      if (next === 'q1') url.searchParams.set('district', 'q1');
      else url.searchParams.delete('district');
      location.replace(url.href);
    });
  }
}

if (DISTRICT === 'q1') {
  const rows = 4;
  const columns = 4;
  const labelsByKey = new Map();
  for (const { label } of MAP.storefronts) {
    const key = label.join('\n');
    if (!labelsByKey.has(key)) labelsByKey.set(key, { label, index: labelsByKey.size });
  }
  const signPalette = ['#9a211d', '#243749', '#365529', '#4c2731', '#643e28'];
  const atlas = canvasTex(1024, 512, (g, width, height) => {
    const w = width / columns, h = height / rows;
    for (const { label, index } of labelsByKey.values()) {
      const x = (index % columns) * w, y = Math.floor(index / columns) * h;
      g.fillStyle = signPalette[index % signPalette.length];
      g.fillRect(x, y, w, h);
      g.strokeStyle = '#e6c997';
      g.lineWidth = 3;
      g.strokeRect(x + 8, y + 8, w - 16, h - 16);
      g.fillStyle = '#fff5d8';
      g.textAlign = 'center';
      g.font = 'bold 44px "Noto Sans CJK JP", "Noto Sans JP", sans-serif';
      g.fillText(label[0], x + w / 2, y + 59, w - 28);
      g.font = 'bold 22px sans-serif';
      g.fillText(label[1], x + w / 2, y + 96, w - 28);
    }
  });
  const signMat = std(0xffffff, { map: atlas, roughness: 0.85, emissiveMap: atlas, emissive: 0xffffff, emissiveIntensity: 0.16 });
  const signs = { pos: [], nor: [], uv: [], index: [] };
  const lanternPlaces = [];
  for (const shop of MAP.storefronts) {
    const { x, z, heading, label } = shop;
    const sx = Math.cos(heading), sz = -Math.sin(heading);
    const nx = Math.sin(heading), nz = Math.cos(heading);
    const w = shop.width / 2 - 0.45;
    const { index } = labelsByKey.get(label.join('\n'));
    const u0 = ((index % columns) + 0.015) / columns, u1 = ((index % columns) + 0.985) / columns;
    const v1 = 1 - (Math.floor(index / columns) + 0.015) / rows;
    const v0 = 1 - (Math.floor(index / columns) + 0.985) / rows;
    const first = signs.pos.length / 3;
    for (const [side, y, u, v] of [[-1, 2.65, u0, v0], [1, 2.65, u1, v0], [1, 3.57, u1, v1], [-1, 3.57, u0, v1]]) {
      signs.pos.push(x + nx * 0.035 + sx * w * side, y, z + nz * 0.035 + sz * w * side);
      signs.nor.push(nx, 0, nz);
      signs.uv.push(u, v);
    }
    signs.index.push(first, first + 1, first + 2, first, first + 2, first + 3);
    if (/^[\u3040-\u9fff]/u.test(label[0])) {
      lanternPlaces.push([x + nx * 0.35 - sx * w, z + nz * 0.35 - sz * w]);
      if (GFX_HIGH) lanternPlaces.push([x + nx * 0.35 + sx * w, z + nz * 0.35 + sz * w]);
    }
  }
  const signGeo = new THREE.BufferGeometry();
  signGeo.setAttribute('position', new THREE.Float32BufferAttribute(signs.pos, 3));
  signGeo.setAttribute('normal', new THREE.Float32BufferAttribute(signs.nor, 3));
  signGeo.setAttribute('uv', new THREE.Float32BufferAttribute(signs.uv, 2));
  signGeo.setIndex(signs.index);
  const storefrontSigns = new THREE.Mesh(signGeo, signMat);
  storefrontSigns.receiveShadow = true;
  scene.add(storefrontSigns);

  const positioner = new THREE.Object3D();
  const lanterns = new THREE.InstancedMesh(
    new THREE.SphereGeometry(0.19, 8, 6),
    std(0xd32c18, { emissive: 0xff4827, emissiveIntensity: 0.27, roughness: 0.85 }),
    lanternPlaces.length
  );
  for (let i = 0; i < lanternPlaces.length; i++) {
    const [x, z] = lanternPlaces[i];
    positioner.position.set(x, 2.54, z);
    positioner.scale.set(0.84, 1.2, 0.84);
    positioner.updateMatrix();
    lanterns.setMatrixAt(i, positioner.matrix);
  }
  scene.add(lanterns);

  // Reuse the traffic scooter and share each material batch between parked instances.
  const parking = MAP.parking.filter(p => p.length === 3).filter((_, index) => index % (GFX_HIGH ? 2 : 3) === 0);
  const scooter = bake(buildScooter(0xe8e8e8));
  const paintMat = paint(0xe8e8e8);
  for (const mesh of scooter.children) {
    const parked = new THREE.InstancedMesh(mesh.geometry, mesh.material, parking.length);
    parked.receiveShadow = true;
    parking.forEach(([x, z, heading], i) => {
      positioner.position.set(x, 0.073, z);
      positioner.rotation.set(0, heading, -0.085);
      positioner.scale.setScalar(0.96);
      positioner.updateMatrix();
      parked.setMatrixAt(i, positioner.matrix);
      if (mesh.material === paintMat) parked.setColorAt(i, new THREE.Color(BIKE_COLORS[i % BIKE_COLORS.length]));
    });
    scene.add(parked);
  }

  const streetSign = canvasTex(512, 192, (g, w, h) => {
    g.fillStyle = '#0a4d93'; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#fff'; g.lineWidth = 6; g.strokeRect(9, 9, w - 18, h - 18);
    g.textAlign = 'center'; g.fillStyle = '#fff';
    g.font = 'bold 60px sans-serif'; g.fillText('HẺM 15B', w / 2, 87);
    g.font = 'bold 44px sans-serif'; g.fillText('LÊ THÁNH TÔN', w / 2, 145);
  });
  const alleySign = new THREE.Mesh(new THREE.PlaneGeometry(2.1, 0.79), std(0xffffff, { map: streetSign, side: THREE.DoubleSide }));
  const entrance = nearestEdge(...MAP.spawn, E => NAMES[E.n] === 'Lê Thánh Tôn');
  if (entrance) {
    const side = edgeAt(entrance.E, entrance.along, true);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.056, 3.15, 8), std(0x68747c, { metalness: 0.6 }));
    const off = entrance.E.w / 2 + 0.75;
    const x = side.x + side.dz * off, z = side.z - side.dx * off;
    alleySign.position.set(x, 2.83, z);
    alleySign.rotation.y = Math.atan2(-side.dz, side.dx);
    pole.position.set(x, 1.59, z);
    scene.add(alleySign, pole);
  }
}
