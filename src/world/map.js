'use strict';
/* ================= World: Phú Mỹ Hưng – Quận 7 (OpenStreetMap) ================= */
const MAP = window.Q7;
const [BX0, BZ0, BX1, BZ1] = MAP.bounds;
const NAMES = MAP.names;
let seedW = 12345;
const rand = () => (seedW = (seedW * 16807) % 2147483647) / 2147483647;
const pick = (arr) => arr[Math.floor(rand() * arr.length)];
function canvasTex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}
function tileTex(w, h, draw) { const t = canvasTex(w, h, draw); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t; }

/* ---- spatial grid ---- */
let gridStamp = 1;
class Grid {
  constructor(cell) { this.c = cell; this.m = new Map(); }
  addBox(x0, z0, x1, z1, item) {
    const c = this.c;
    for (let ix = Math.floor(x0 / c); ix <= Math.floor(x1 / c); ix++)
      for (let iz = Math.floor(z0 / c); iz <= Math.floor(z1 / c); iz++) {
        const k = ix * 73856093 ^ iz * 19349663;
        let a = this.m.get(k); if (!a) this.m.set(k, a = []); a.push(item);
      }
  }
  query(x, z, r, out) {
    const c = this.c, s = ++gridStamp;
    out.length = 0;
    for (let ix = Math.floor((x - r) / c); ix <= Math.floor((x + r) / c); ix++)
      for (let iz = Math.floor((z - r) / c); iz <= Math.floor((z + r) / c); iz++) {
        const a = this.m.get(ix * 73856093 ^ iz * 19349663); if (!a) continue;
        for (const it of a) if (it._q !== s) { it._q = s; out.push(it); }
      }
    return out;
  }
}
const _q = [];
function bboxOf(p) { let x0 = 1e9, z0 = 1e9, x1 = -1e9, z1 = -1e9; for (let i = 0; i < p.length; i += 2) { x0 = Math.min(x0, p[i]); x1 = Math.max(x1, p[i]); z0 = Math.min(z0, p[i + 1]); z1 = Math.max(z1, p[i + 1]); } return [x0, z0, x1, z1]; }
function pip(x, z, p) {
  let c = false;
  for (let i = 0, j = p.length - 2; i < p.length; j = i, i += 2) {
    const xi = p[i], zi = p[i + 1], xj = p[j], zj = p[j + 1];
    if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi + 1e-12) + xi) c = !c;
  }
  return c;
}
function segProj(px, pz, ax, az, bx, bz) {
  const dx = bx - ax, dz = bz - az, L2 = dx * dx + dz * dz;
  let t = L2 ? ((px - ax) * dx + (pz - az) * dz) / L2 : 0; t = Math.max(0, Math.min(1, t));
  const x = ax + dx * t, z = az + dz * t;
  return { t, x, z, d: Math.hypot(px - x, pz - z) };
}

/* ---- ground ---- */
const MG = 500;
const ground = new THREE.Mesh(new THREE.PlaneGeometry(BX1 - BX0 + MG * 2, BZ1 - BZ0 + MG * 2), std(0xb4b9a4, { roughness: 1 }));
ground.rotation.x = -Math.PI / 2; ground.position.set((BX0 + BX1) / 2, 0, (BZ0 + BZ1) / 2); ground.receiveShadow = true;
scene.add(ground);

/* ---- flat areas (water, parks, pitches) ---- */
function areaMesh(polys, y, mat) {
  const geos = [];
  for (const p of polys) {
    if (p.length < 6) continue;
    const pts = []; for (let i = 0; i < p.length; i += 2) pts.push(new THREE.Vector2(p[i], -p[i + 1]));
    try { const g = new THREE.ShapeGeometry(new THREE.Shape(pts)); g.rotateX(-Math.PI / 2); g.translate(0, y, 0); geos.push(g.toNonIndexed()); } catch (e) { }
  }
  if (!geos.length) return null;
  const m = new THREE.Mesh(mergeGeometries(geos.map(g => { for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal' && k !== 'uv') g.deleteAttribute(k); return g; })), mat);
  m.receiveShadow = true; scene.add(m); return m;
}
const waterMat = new THREE.MeshStandardMaterial({ color: 0x3d78a8, roughness: 0.18, metalness: 0.25 });
areaMesh(MAP.green, 0.045, std(0x7fae5e, { roughness: 1 }));
areaMesh(MAP.wetland, 0.04, std(0x6b8f5c, { roughness: 1 }));
areaMesh(MAP.pitch, 0.05, std(0x5f9e4a, { roughness: 1 }));
areaMesh(MAP.water, 0.03, waterMat);

/* ---- ribbons (roads, sidewalks, markings, rails) ---- */
function ribbon(p, w, y, out, ys) {
  // p flat [x,z,...]; y number or per-vertex array ys
  const n = p.length / 2; if (n < 2) return;
  const base = out.pos.length / 3;
  for (let i = 0; i < n; i++) {
    const x = p[i * 2], z = p[i * 2 + 1];
    let dx0 = 0, dz0 = 0, dx1 = 0, dz1 = 0;
    if (i > 0) { dx0 = x - p[i * 2 - 2]; dz0 = z - p[i * 2 - 1]; const l = Math.hypot(dx0, dz0) || 1; dx0 /= l; dz0 /= l; }
    if (i < n - 1) { dx1 = p[i * 2 + 2] - x; dz1 = p[i * 2 + 3] - z; const l = Math.hypot(dx1, dz1) || 1; dx1 /= l; dz1 /= l; }
    if (i === 0) { dx0 = dx1; dz0 = dz1; } if (i === n - 1) { dx1 = dx0; dz1 = dz0; }
    let nx = -(dz0 + dz1), nz = dx0 + dx1; const nl = Math.hypot(nx, nz) || 1; nx /= nl; nz /= nl;
    const cosh = Math.max(0.35, nx * -dz1 + nz * dx1);
    const hw = (w / 2) / cosh;
    const yy = ys ? ys[i] : y;
    out.pos.push(x + nx * hw, yy, z + nz * hw, x - nx * hw, yy, z - nz * hw);
    if (out.uv) { const along = i === 0 ? 0 : out._acc + Math.hypot(x - p[i * 2 - 2], z - p[i * 2 - 1]); out._acc = along; out.uv.push(0, along / 6, 1, along / 6); }
  }
  out._acc = 0;
  for (let i = 0; i < n - 1; i++) {
    const a = base + i * 2;
    out.idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
  }
}
function wallStrip(p, off, y0, h, out, ys) {
  // vertical strip offset to the side of a polyline (railings, parapets)
  const n = p.length / 2;
  for (let i = 0; i < n - 1; i++) {
    const ax = p[i * 2], az = p[i * 2 + 1], bx = p[i * 2 + 2], bz = p[i * 2 + 3];
    const L = Math.hypot(bx - ax, bz - az) || 1, nx = -(bz - az) / L * off, nz = (bx - ax) / L * off;
    const ya = ys ? ys[i] : y0, yb = ys ? ys[i + 1] : y0;
    const b = out.pos.length / 3;
    out.pos.push(ax + nx, ya, az + nz, bx + nx, yb, bz + nz, bx + nx, yb + h, bz + nz, ax + nx, ya + h, az + nz);
    out.idx.push(b, b + 1, b + 2, b, b + 2, b + 3);
  }
}
function meshFrom(out, mat, shadow = false) {
  if (!out.idx.length) return null;
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(out.pos, 3));
  if (out.uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(out.uv, 2));
  g.setIndex(out.idx); g.computeVertexNormals();
  const m = new THREE.Mesh(g, mat); m.receiveShadow = true; m.castShadow = shadow; scene.add(m); return m;
}
const nb = () => ({ pos: [], idx: [], _acc: 0 });
const roadBufs = { asphalt: nb(), side: nb(), foot: nb(), mark: nb(), yellow: nb(), rail: nb(), deck: nb(), deckWall: nb(), wline: nb() };
const deckPillars = [];
for (const l of MAP.waterLines) ribbon(l.p, l.w, 0.032, roadBufs.wline);
for (const r of MAP.roads) {
  if (r.e) continue;
  if (r.c >= 6) { ribbon(r.p, r.w, 0.062 + (r.c === 6 ? 0.002 : 0), roadBufs.foot); continue; }
  ribbon(r.p, r.w + 3.6, 0.058, roadBufs.side);
  ribbon(r.p, r.w, 0.07 + (6 - r.c) * 0.003, roadBufs.asphalt);
  if (r.b) { wallStrip(r.p, r.w / 2 + 0.4, 0.07, 1.0, roadBufs.rail); wallStrip(r.p, -(r.w / 2 + 0.4), 0.07, 1.0, roadBufs.rail); }
  // dashed centre / lane line
  if (r.w >= 6 && r.c <= 4) {
    const p = r.p; let acc = 0;
    for (let i = 0; i < p.length - 2; i += 2) {
      const ax = p[i], az = p[i + 1], bx = p[i + 2], bz = p[i + 3], L = Math.hypot(bx - ax, bz - az);
      let t = (3 - acc % 9 + 9) % 9;
      while (t < L) {
        const t1 = Math.min(L, t + 3);
        const dash = [ax + (bx - ax) * t / L, az + (bz - az) * t / L, ax + (bx - ax) * t1 / L, az + (bz - az) * t1 / L];
        ribbon(dash, 0.15, 0.1, (r.c <= 1 && !r.o) ? roadBufs.yellow : roadBufs.mark);
        t += 9;
      }
      acc += L;
    }
  }
}
for (const d of MAP.deck) {
  const ys = d.h.map(h => h + 0.08);
  ribbon(d.p, d.w, 0, roadBufs.deck, ys);
  ribbon(d.p, d.w + 1, 0, roadBufs.deck, ys.map(y => Math.max(0.02, y - 1.1)));
  wallStrip(d.p, d.w / 2 + 0.3, 0, 1.1, roadBufs.deckWall, ys.map(y => y - 1.1));
  wallStrip(d.p, -(d.w / 2 + 0.3), 0, 1.1, roadBufs.deckWall, ys.map(y => y - 1.1));
  let acc = 0;
  for (let i = 0; i < d.p.length - 2; i += 2) {
    const L = Math.hypot(d.p[i + 2] - d.p[i], d.p[i + 3] - d.p[i + 1]);
    acc += L;
    if (acc > 35 && d.h[i / 2] > 5) { acc = 0; deckPillars.push([d.p[i], d.p[i + 1], d.h[i / 2] - 1.1]); }
  }
}
meshFrom(roadBufs.wline, waterMat);

meshFrom(roadBufs.foot, std(0xd8cfbd, { roughness: 0.95 }));
const MAT_ASPHALT = std(0x44474d, { roughness: 0.92 }), MAT_SIDE = std(0xcbc5b8, { roughness: 0.95 });
meshFrom(roadBufs.side, MAT_SIDE);
meshFrom(roadBufs.asphalt, MAT_ASPHALT);
meshFrom(roadBufs.mark, std(0xf0f0f0, { roughness: 0.6 }));
meshFrom(roadBufs.yellow, std(0xf2c230, { roughness: 0.6 }));
meshFrom(roadBufs.rail, std(0xbfc3c7, { roughness: 0.6, metalness: 0.3, side: THREE.DoubleSide }), true);
meshFrom(roadBufs.deck, std(0x9a9da2, { roughness: 0.85, side: THREE.DoubleSide }), true);
meshFrom(roadBufs.deckWall, std(0xd2d4d6, { roughness: 0.7, side: THREE.DoubleSide }), true);
if (deckPillars.length) {
  const pm = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.9, 1.1, 1, 10), std(0xb8bbbf, { roughness: 0.8 }), deckPillars.length);
  const o = new THREE.Object3D();
  deckPillars.forEach(([x, z, h], i) => { o.position.set(x, h / 2, z); o.scale.set(1, h, 1); o.updateMatrix(); pm.setMatrixAt(i, o.matrix); });
  pm.castShadow = true; scene.add(pm);
}

/* ---- buildings (chunked meshes: windows, shopfronts, glass towers, roofs) ---- */
const facadeTex = tileTex(128, 128, (g, w, h) => {
  g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h);
  g.fillStyle = '#d6d0c4'; g.fillRect(0, h - 12, w, 12);
  g.fillStyle = '#e9e4da'; g.fillRect(18, 22, 92, 72);
  g.fillStyle = '#34495e'; g.fillRect(24, 28, 80, 60);
  g.fillStyle = 'rgba(255,255,255,.2)'; g.fillRect(24, 28, 28, 60);
  g.fillStyle = '#e9e4da'; g.fillRect(62, 28, 4, 60);
  g.fillStyle = 'rgba(0,0,0,.12)'; g.fillRect(18, 94, 92, 5);
});
const glassTex = tileTex(128, 128, (g, w, h) => {
  const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, '#7f9fbf'); gr.addColorStop(1, '#4b6a88');
  g.fillStyle = gr; g.fillRect(0, 0, w, h);
  g.fillStyle = 'rgba(255,255,255,.18)'; g.fillRect(8, 8, 40, h - 20);
  g.fillStyle = '#d5dde4'; g.fillRect(0, h - 9, w, 9); g.fillRect(0, 0, 5, h); g.fillRect(64, 0, 3, h);
});
const shopTex = canvasTex(128, 128, (g, w, h) => {
  g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, 34);           // signboard (tinted)
  g.fillStyle = 'rgba(0,0,0,.25)'; for (let i = 0; i < 3; i++) g.fillRect(12 + i * 36, 10, 26, 6);
  g.fillStyle = '#4a4a4a'; g.fillRect(0, 34, w, 6);
  g.fillStyle = '#2b2b2e'; g.fillRect(6, 40, w - 12, h - 40);  // open shop interior
  g.fillStyle = '#8a8f96'; g.fillRect(6, 40, w - 12, 30);      // half-raised shutter
  g.strokeStyle = '#6d7278'; g.lineWidth = 2; for (let y = 44; y < 70; y += 5) { g.beginPath(); g.moveTo(6, y); g.lineTo(w - 6, y); g.stroke(); }
  g.fillStyle = 'rgba(255,220,150,.35)'; g.fillRect(20, 80, 30, 40); g.fillRect(70, 86, 36, 34);
});
/* ---- HD textures (GFX_HIGH): 2×2 ô cửa mỗi tấm, mỗi ô một kiểu ---- */
function hdFacade() {
  const t = tileTex(512, 512, (g) => {
    const S = 256, k = S / 128;
    for (let c = 0; c < 4; c++) {
      const ox = (c % 2) * S, oy = (c >> 1) * S; g.save(); g.translate(ox, oy);
      g.fillStyle = '#ffffff'; g.fillRect(0, 0, S, S);
      for (let i = 0; i < 500; i++) { g.fillStyle = `rgba(90,80,60,${hrand() * 0.045})`; g.fillRect(hrand() * S, hrand() * S, 3 + hrand() * 6, 2 + hrand() * 3); }
      g.fillStyle = '#cfc8ba'; g.fillRect(0, S - 22, S, 22); g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(0, S - 24, S, 3); g.fillStyle = 'rgba(255,255,255,.5)'; g.fillRect(0, S - 22, S, 2);
      const wx = 24 * k, wy = 28 * k, ww = 80 * k, wh = 60 * k;
      g.fillStyle = 'rgba(0,0,0,.22)'; g.fillRect(wx - 12, wy - 10, ww + 24, wh + 26);          // hốc cửa
      g.fillStyle = '#eee9de'; g.fillRect(wx - 9, wy - 8, ww + 18, wh + 16);                    // khung
      const gr = g.createLinearGradient(0, wy, 0, wy + wh); gr.addColorStop(0, '#263a4f'); gr.addColorStop(1, '#3f5870');
      g.fillStyle = gr; g.fillRect(wx, wy, ww, wh);
      g.fillStyle = 'rgba(255,255,255,.16)'; g.beginPath(); g.moveTo(wx + 8, wy + wh); g.lineTo(wx + 50, wy); g.lineTo(wx + 78, wy); g.lineTo(wx + 36, wy + wh); g.fill();
      if (c === 1) { g.fillStyle = 'rgba(235,225,200,.75)'; g.fillRect(wx, wy, ww * 0.28, wh); g.fillRect(wx + ww * 0.72, wy, ww * 0.28, wh); }   // rèm
      if (c === 2) { g.fillStyle = '#5b7a5a'; for (let y = wy + 4; y < wy + wh; y += 9) g.fillRect(wx, y, ww / 2 - 3, 5); }                      // cửa chớp
      g.fillStyle = '#eee9de'; g.fillRect(wx + ww / 2 - 3, wy, 6, wh); g.fillRect(wx, wy + wh * 0.3, ww, 4);
      g.fillStyle = '#d9d3c6'; g.fillRect(wx - 16, wy + wh + 8, ww + 32, 9); g.fillStyle = 'rgba(0,0,0,.2)'; g.fillRect(wx - 16, wy + wh + 17, ww + 32, 4);   // bệ cửa
      for (let i = 0; i < 5; i++) { g.fillStyle = `rgba(60,55,45,${0.04 + hrand() * 0.05})`; g.fillRect(wx + hrand() * ww, wy + wh + 21, 3 + hrand() * 5, 20 + hrand() * 30); }   // vệt nước mưa
      if (c === 0 || c === 3) { const ax = c ? 150 : 30, ay = wy + wh + 30; g.fillStyle = 'rgba(0,0,0,.2)'; g.fillRect(ax + 3, ay + 4, 70, 30); g.fillStyle = '#f2f2f0'; g.fillRect(ax, ay, 70, 30); g.fillStyle = '#b9bdc0'; g.beginPath(); g.arc(ax + 22, ay + 15, 11, 0, 7); g.fill(); g.fillStyle = '#8d9296'; for (let y = ay + 6; y < ay + 26; y += 5) g.fillRect(ax + 40, y, 24, 2); }   // cục nóng máy lạnh
      g.restore();
    }
  });
  t.repeat.set(0.5, 0.5); t.anisotropy = 8; return t;
}
function hdGlass() {
  const t = tileTex(256, 256, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, '#86a9c9'); gr.addColorStop(0.5, '#5d82a6'); gr.addColorStop(1, '#3f6183');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(255,255,255,.14)'; g.beginPath(); g.moveTo(20, h); g.lineTo(120, 0); g.lineTo(170, 0); g.lineTo(70, h); g.fill();
    g.fillStyle = '#2f4358'; g.fillRect(0, h - 40, w, 22);                                   // dải sàn tối
    g.fillStyle = '#dfe6ec'; g.fillRect(0, h - 18, w, 18); g.fillRect(0, 0, 8, h); g.fillRect(126, 0, 5, h); g.fillRect(0, h * 0.42, w, 3);
    g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(8, 0, 2, h); g.fillRect(131, 0, 2, h);
  }); t.anisotropy = 8; return t;
}
function hdShop() {
  const t = canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, 130);
    g.fillStyle = 'rgba(0,0,0,.08)'; g.fillRect(0, 0, w, 8); g.fillRect(0, 122, w, 8);
    g.fillStyle = 'rgba(0,0,0,.55)'; g.font = '900 64px system-ui,sans-serif'; g.textBaseline = 'middle'; g.fillText('▇▇▇ ▇▇▇▇', 40, 58); g.font = '700 26px system-ui'; g.fillStyle = 'rgba(0,0,0,.4)'; g.fillText('▂▂▂▂▂ ▂▂▂ ▂▂▂▂▂▂', 44, 104);
    g.fillStyle = '#3c3c3e'; g.fillRect(0, 130, w, 22);
    g.fillStyle = '#1f2023'; g.fillRect(20, 152, w - 40, h - 152);
    g.fillStyle = '#9ba1a8'; g.fillRect(20, 152, w - 40, 96); g.strokeStyle = '#737980'; g.lineWidth = 3; for (let y = 160; y < 248; y += 11) { g.beginPath(); g.moveTo(20, y); g.lineTo(w - 20, y); g.stroke(); }
    g.fillStyle = 'rgba(255,214,140,.5)'; g.fillRect(50, 290, 130, 190); g.fillStyle = 'rgba(180,220,255,.35)'; g.fillRect(210, 300, 110, 180); g.fillStyle = 'rgba(255,190,150,.45)'; g.fillRect(350, 286, 120, 194);
    g.fillStyle = '#5a4a3a'; for (let y = 330; y < 480; y += 48) { g.fillRect(50, y, 130, 6); g.fillRect(350, y, 120, 6); }
    for (let i = 0; i < 40; i++) { g.fillStyle = `hsl(${hrand() * 360},70%,${45 + hrand() * 25}%)`; g.fillRect(56 + (i % 10) * 12, 300 + Math.floor(i / 10) * 48, 9, 28); g.fillRect(356 + (i % 9) * 12, 296 + Math.floor(i / 10) * 48, 9, 32); }
    g.fillStyle = '#b8b2a6'; g.fillRect(0, h - 26, w, 26); g.fillStyle = '#8f8a80'; g.fillRect(0, h - 26, w, 4);
    g.fillStyle = '#c9c9c9'; g.fillRect(0, 152, 20, h - 152); g.fillRect(w - 20, 152, 20, h - 152);
  }); t.anisotropy = 8; return t;
}
if (GFX_HIGH) { for (const [t, f] of [[facadeTex, hdFacade], [glassTex, hdGlass], [shopTex, hdShop]]) { const n = f(); t.image = n.image; t.repeat.copy(n.repeat); t.anisotropy = 8; t.needsUpdate = true; } }
const MAT_WIN = new THREE.MeshStandardMaterial({ map: facadeTex, vertexColors: true, roughness: 0.85 });
const MAT_GLASS = new THREE.MeshStandardMaterial({ map: glassTex, vertexColors: true, roughness: 0.25, metalness: 0.35 });
const MAT_SHOP = new THREE.MeshStandardMaterial({ map: shopTex, vertexColors: true, roughness: 0.8 });
const MAT_ROOF = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, side: GFX_HIGH ? THREE.DoubleSide : THREE.FrontSide });
const CH = 260;
const chunks = new Map();
function chunkOf(x, z) {
  const k = Math.floor(x / CH) + ',' + Math.floor(z / CH);
  let c = chunks.get(k);
  if (!c) chunks.set(k, c = { win: nbc(), glass: nbc(), shop: nbc(), roof: nbc(), trees: [], tanks: [] });
  return c;
}
function nbc() { return { pos: [], nor: [], uv: [], col: [] }; }
function quad(buf, ax, az, bx, bz, y0, y1, u0, u1, v0, v1, nx, nz, col, flip) {
  const P = [[ax, y0, az, u0, v0], [bx, y0, bz, u1, v0], [bx, y1, bz, u1, v1], [ax, y1, az, u0, v1]];
  const order = flip ? [0, 2, 1, 0, 3, 2] : [0, 1, 2, 0, 2, 3];
  for (const k of order) { const q = P[k]; buf.pos.push(q[0], q[1], q[2]); buf.uv.push(q[3], q[4]); buf.nor.push(nx, 0, nz); buf.col.push(col.r, col.g, col.b); }
}
const bColliders = new Grid(24);
const _c = new THREE.Color();
const WALLS_OSM = [0xf3f1ea, 0xe9e4d8, 0xdfe5ea, 0xf1e6d2, 0xd8dcde, 0xe8ded6, 0xcfd8e0];
const WALLS_FILL = [0xf6e7b8, 0xf4c7a8, 0xcfe8d4, 0xd6e4f5, 0xf7f3ea, 0xf3d1dc, 0xe9d8ff, 0xffe0a3, 0xc9e3f0, 0xfadadd];
const SIGNS = [0xd32f2f, 0x1976d2, 0xfbc02d, 0x388e3c, 0xf57c00, 0x7b1fa2, 0xffffff, 0x00897b, 0xc2185b];
/* ---- chi tiết HD cho nhà: lan can mái, ban công, mái hiên, hộp kỹ thuật, bồn nước ---- */
function hdFace(buf, P, nx, ny, nz, col) {   // P = 4 điểm [x,y,z] theo vòng
  for (const k of [0, 1, 2, 0, 2, 3]) { const q = P[k]; buf.pos.push(q[0], q[1], q[2]); buf.uv.push(0, 0); buf.nor.push(nx, ny, nz); buf.col.push(col.r, col.g, col.b); }
}
function hdBox(buf, x, z, y0, y1, hw, hd, a, col) {
  const ux = Math.cos(a), uz = Math.sin(a), c = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([s, t]) => [x + ux * hw * s - uz * hd * t, z + uz * hw * s + ux * hd * t]);
  for (let i = 0; i < 4; i++) { const A = c[i], B = c[(i + 1) % 4], dx = B[0] - A[0], dz = B[1] - A[1], L = Math.hypot(dx, dz) || 1; hdFace(buf, [[A[0], y0, A[1]], [B[0], y0, B[1]], [B[0], y1, B[1]], [A[0], y1, A[1]]], dz / L, 0, -dx / L, col); }
  hdFace(buf, c.map(q => [q[0], y1, q[1]]), 0, 1, 0, col);
}
const _hc = new THREE.Color(), _hc2 = new THREE.Color();
function hdBuildingDetails(p, h, opts, ch, ccw, wallCol, signCol, shopH, cx, cz) {
  const n = p.length / 2, R = ch.roof;
  const trim = _hc.copy(wallCol).multiplyScalar(0.86).clone(), dark = _hc2.copy(wallCol).multiplyScalar(0.62).clone();
  const balc = opts.fill && h > shopH + 3 && hrand() < 0.7, awn = opts.fill && hrand() < 0.6;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n, ax = p[i * 2], az = p[i * 2 + 1], bx = p[j * 2], bz = p[j * 2 + 1], L = Math.hypot(bx - ax, bz - az); if (L < 0.5) continue;
    const dx = (bx - ax) / L, dz = (bz - az) / L, nx = ccw ? dz : -dz, nz = ccw ? -dx : dx;
    // lan can mái (parapet)
    const ph = opts.fill ? 0.55 : Math.min(1.2, 0.5 + h * 0.012);
    hdFace(R, [[ax, h, az], [bx, h, bz], [bx, h + ph, bz], [ax, h + ph, az]], nx, 0, nz, trim);
    if (!opts.fill || (i % 2)) continue;                    // chỉ mặt trước/sau của nhà phố
    const in0 = 0.35, x0 = ax + dx * in0, z0 = az + dz * in0, x1 = bx - dx * in0, z1 = bz - dz * in0;
    if (awn && L > 2.5) {                                    // mái hiên trên cửa hàng
      const d = 1.3, y = shopH - 0.15; hdFace(R, [[ax, y + 0.45, az], [bx, y + 0.45, bz], [bx + nx * d, y, bz + nz * d], [ax + nx * d, y, az + nz * d]], nx * 0.3, 0.95, nz * 0.3, signCol);
    }
    if (balc && L > 2.5) for (let y = shopH + (awn ? 3.3 : 0); y + 1.2 < h; y += 3.3) {   // ban công từng tầng
      const d = 0.85, ox = nx * d, oz = nz * d;
      hdFace(R, [[x0, y, z0], [x1, y, z1], [x1 + ox, y, z1 + oz], [x0 + ox, y, z0 + oz]], 0, 1, 0, trim);
      hdFace(R, [[x0, y - 0.14, z0], [x1, y - 0.14, z1], [x1 + ox, y - 0.14, z1 + oz], [x0 + ox, y - 0.14, z0 + oz]], 0, -1, 0, dark);
      hdFace(R, [[x0 + ox, y - 0.14, z0 + oz], [x1 + ox, y - 0.14, z1 + oz], [x1 + ox, y + 0.95, z1 + oz], [x0 + ox, y + 0.95, z0 + oz]], nx, 0, nz, trim);
      hdFace(R, [[x0, y - 0.14, z0], [x0 + ox, y - 0.14, z0 + oz], [x0 + ox, y + 0.95, z0 + oz], [x0, y + 0.95, z0]], -dx, 0, -dz, trim);
      hdFace(R, [[x1, y - 0.14, z1], [x1 + ox, y - 0.14, z1 + oz], [x1 + ox, y + 0.95, z1 + oz], [x1, y + 0.95, z1]], dx, 0, dz, trim);
    }
  }
  // đồ trên mái
  const grey = _hc.setHex(0x8e9296).clone();
  if (opts.fill) { if (hrand() < 0.4) ch.tanks.push(cx + (hrand() - 0.5) * 1.5, h, cz + (hrand() - 0.5) * 1.5, hrand() * 3.14); else if (hrand() < 0.3) hdBox(R, cx, cz, h, h + 2.3, 1.2, 1.5, hrand() * 3.14, trim); }
  else {
    const bb = bboxOf(p), sx = bb[2] - bb[0], sz = bb[3] - bb[1], big = h > 30, k = big ? 2 : 1 + Math.floor(hrand() * 3);
    for (let q = 0; q < k; q++) { const x = cx + (hrand() - 0.5) * sx * 0.35, z = cz + (hrand() - 0.5) * sz * 0.35; if (!pip(x, z, p)) continue; const s = big ? 3 + hrand() * 3 : 1 + hrand() * 1.6; hdBox(R, x, z, h, h + (big ? 3.5 : 1.2 + hrand() * 1.4), s, s * (0.6 + hrand() * 0.6), hrand() * 3.14, q ? grey : trim); }
  }
}
function addBuilding(p, h, opts) {
  const n = p.length / 2; if (n < 3) return;
  let A = 0; for (let i = 0, j = n - 1; i < n; j = i++) A += p[j * 2] * p[i * 2 + 1] - p[i * 2] * p[j * 2 + 1];
  const ccw = A > 0;
  let cx = 0, cz = 0; for (let i = 0; i < n; i++) { cx += p[i * 2]; cz += p[i * 2 + 1]; } cx /= n; cz /= n;
  const ch = chunkOf(cx, cz);
  const tall = h > 30 && !opts.fill;
  const wallCol = _c.setHex(opts.color).clone();
  const signCol = new THREE.Color(opts.sign || 0xffffff);
  const shopH = opts.fill ? 3.8 : 0;
  let acc = 0;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const ax = p[i * 2], az = p[i * 2 + 1], bx = p[j * 2], bz = p[j * 2 + 1];
    const L = Math.hypot(bx - ax, bz - az); if (L < 0.01) continue;
    const dx = (bx - ax) / L, dz = (bz - az) / L;
    const nx = ccw ? dz : -dz, nz = ccw ? -dx : dx;      // outward normal
    const flip = ccw;                                    // keep front faces outside
    if (opts.fill) {
      quad(ch.shop, ax, az, bx, bz, 0, shopH, 0, 1, 0, 1, nx, nz, signCol, flip);
      quad(ch.win, ax, az, bx, bz, shopH, h, acc / 4, (acc + L) / 4, 0, (h - shopH) / 3.3, nx, nz, wallCol, flip);
    } else {
      quad(tall ? ch.glass : ch.win, ax, az, bx, bz, 0, h, acc / (tall ? 3 : 4), (acc + L) / (tall ? 3 : 4), 0, h / (tall ? 3.6 : 3.3), nx, nz, wallCol, flip);
    }
    acc += L;
  }
  // roof
  const contour = []; for (let i = 0; i < n; i++) contour.push(new THREE.Vector2(p[i * 2], p[i * 2 + 1]));
  const tris = THREE.ShapeUtils.triangulateShape(contour, []);
  const rc = new THREE.Color(opts.roof ?? 0x9a9a96);
  for (const t of tris) {
    const a = contour[t[0]], b = contour[t[1]], c = contour[t[2]];
    const cross = (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
    const tri = cross < 0 ? [a, b, c] : [a, c, b];
    for (const v of tri) { ch.roof.pos.push(v.x, h, v.y); ch.roof.nor.push(0, 1, 0); ch.roof.uv.push(0, 0); ch.roof.col.push(rc.r, rc.g, rc.b); }
  }
  if (GFX_HIGH) hdBuildingDetails(p, h, opts, ch, ccw, wallCol, signCol, shopH, cx, cz);
  const bb = bboxOf(p);
  bColliders.addBox(bb[0], bb[1], bb[2], bb[3], { p, bb, h });
}
for (const b of MAP.buildings) {
  const tall = b.h > 30;
  addBuilding(b.p, b.h, { color: tall ? pick([0xdfe8f0, 0xcfdbe6, 0xe8eef2]) : pick(WALLS_OSM), roof: pick([0x8f8f8c, 0xa3a39f, 0x7d8085]) });
}
const F = MAP.fill;
for (let i = 0; i < F.length; i += 6) {
  const cx = F[i], cz = F[i + 1], a = F[i + 2], w = F[i + 3], d = F[i + 4], h = F[i + 5];
  const ux = Math.cos(a), uz = Math.sin(a), nx = -uz, nz = ux;
  const hw = w / 2, hd = d / 2;
  const p = [cx - ux * hw - nx * hd, cz - uz * hw - nz * hd, cx + ux * hw - nx * hd, cz + uz * hw - nz * hd,
    cx + ux * hw + nx * hd, cz + uz * hw + nz * hd, cx - ux * hw + nx * hd, cz - uz * hw + nz * hd];
  addBuilding(p, h, { fill: true, color: pick(WALLS_FILL), sign: pick(SIGNS), roof: pick([0x9b9b97, 0xb0563a, 0x8a8a86, 0xa8a8a2]) });
}

/* ---- trees (per chunk instancing) ---- */
const T = MAP.trees;
for (let i = 0; i < T.length; i += 2) chunkOf(T[i], T[i + 1]).trees.push(T[i], T[i + 1]);
const treeColliders = new Grid(24);
for (let i = 0; i < T.length; i += 2) treeColliders.addBox(T[i] - 0.4, T[i + 1] - 0.4, T[i] + 0.4, T[i + 1] + 0.4, { x: T[i], z: T[i + 1] });
let trunkGeo = new THREE.CylinderGeometry(0.14, 0.2, 2.4, 6), crownGeo = new THREE.IcosahedronGeometry(1.7, 0);
const trunkMat = std(0x6b4a2f, { roughness: 0.95 }), crownMat = std(0xffffff, { flatShading: !GFX_HIGH, roughness: 0.9 });
let palmTrunkGeo = null, palmCrownGeo = null; const palmMat = std(0xffffff, { roughness: 0.85, side: THREE.DoubleSide });
if (GFX_HIGH) {
  // tán cây nhiều cụm lá + cành; cây cau/dừa cảnh cho 1/5 số cây
  const blobs = [[0, 0, 0, 1.25], [0.95, -0.25, 0.2, 0.95], [-0.8, -0.3, 0.55, 0.9], [-0.15, -0.2, -0.95, 0.95], [0.2, 0.75, 0.1, 0.85]].map(([x, y, z, r]) => {
    const g = new THREE.IcosahedronGeometry(r, 1); const P = g.attributes.position;
    for (let i = 0; i < P.count; i++) { const k = 1 + (Math.sin(P.getX(i) * 9.1 + P.getY(i) * 7.3 + P.getZ(i) * 5.7) * 0.5) * 0.16; P.setXYZ(i, P.getX(i) * k, P.getY(i) * k * 0.85, P.getZ(i) * k); }
    const N = g.attributes.normal; for (let i = 0; i < P.count; i++) { const l = Math.hypot(P.getX(i), P.getY(i), P.getZ(i)) || 1; N.setXYZ(i, P.getX(i) / l, P.getY(i) / l * 0.8 + 0.2, P.getZ(i) / l); }   // pháp tuyến mềm → tán lá tròn, không lộ mặt phẳng
    g.translate(x, y, z); return g; });
  crownGeo = mergeGeometries(blobs, false);
  const tk = new THREE.CylinderGeometry(0.11, 0.22, 2.6, 9); const b1 = new THREE.CylinderGeometry(0.05, 0.09, 1.1, 6); b1.rotateZ(0.7); b1.translate(-0.4, 1.2, 0); const b2 = new THREE.CylinderGeometry(0.05, 0.09, 1.0, 6); b2.rotateZ(-0.6); b2.rotateY(1.2); b2.translate(0.3, 1.25, 0.15);
  trunkGeo = mergeGeometries([tk, b1, b2], false);
  palmTrunkGeo = new THREE.CylinderGeometry(0.1, 0.17, 5.2, 8);
  const fr = []; for (let i = 0; i < 9; i++) { const g = new THREE.PlaneGeometry(0.55, 2.7, 1, 4); g.translate(0, 1.35, 0); const P = g.attributes.position; for (let k = 0; k < P.count; k++) { const y = P.getY(k); P.setZ(k, -y * y * 0.16); P.setX(k, P.getX(k) * (1 - y / 3.2)); } g.rotateX(0.95 + (i % 3) * 0.22); g.rotateY(i * 0.7 + 0.2); g.computeVertexNormals(); fr.push(g); }
  palmCrownGeo = mergeGeometries(fr, false);
}
let hdTankGeo = null; const hdTankMat = std(0xd8dde2, { metalness: 0.9, roughness: 0.22 });
function buildChunkMeshes() {
  const o = new THREE.Object3D(), col = new THREE.Color();
  for (const ch of chunks.values()) {
    for (const [key, mat] of [['win', MAT_WIN], ['glass', MAT_GLASS], ['shop', MAT_SHOP], ['roof', MAT_ROOF]]) {
      const b = ch[key]; if (!b.pos.length) continue;
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(b.pos, 3));
      g.setAttribute('normal', new THREE.Float32BufferAttribute(b.nor, 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute(b.uv, 2));
      g.setAttribute('color', new THREE.Float32BufferAttribute(b.col, 3));
      g.computeBoundingSphere();
      const m = new THREE.Mesh(g, mat); m.castShadow = true; m.receiveShadow = true; scene.add(m);
    }
    const t = ch.trees; const n = t.length / 2; if (!n) continue;
    if (GFX_HIGH && ch.tanks.length) {
      if (!hdTankGeo) { const c = new THREE.CylinderGeometry(0.48, 0.48, 1.5, 14); c.rotateZ(Math.PI / 2); c.translate(0, 1.05, 0); const st = new THREE.BoxGeometry(1.2, 0.55, 0.8); st.translate(0, 0.28, 0); hdTankGeo = mergeGeometries([c, st], false); }
      const m = ch.tanks.length / 4, tk = new THREE.InstancedMesh(hdTankGeo, hdTankMat, m);
      for (let i = 0; i < m; i++) { o.position.set(ch.tanks[i * 4], ch.tanks[i * 4 + 1], ch.tanks[i * 4 + 2]); o.rotation.set(0, ch.tanks[i * 4 + 3], 0); o.scale.set(1, 1, 1); o.updateMatrix(); tk.setMatrixAt(i, o.matrix); }
      tk.computeBoundingSphere(); tk.castShadow = true; scene.add(tk);
    }
    if (GFX_HIGH) {
      const kinds = []; for (let i = 0; i < n; i++) kinds.push(hrand() < 0.2);
      for (const palm of [false, true]) {
        const ids = kinds.map((k, i) => k === palm ? i : -1).filter(i => i >= 0); if (!ids.length) continue;
        const tr = new THREE.InstancedMesh(palm ? palmTrunkGeo : trunkGeo, trunkMat, ids.length), cr = new THREE.InstancedMesh(palm ? palmCrownGeo : crownGeo, palm ? palmMat : crownMat, ids.length);
        ids.forEach((id, i) => {
          const s = 0.85 + hrand() * 0.6, x = t[id * 2], z = t[id * 2 + 1];
          if (palm) { o.position.set(x, 2.6 * s, z); o.rotation.set(0, hrand() * 6, 0); o.scale.set(s, s, s); o.updateMatrix(); tr.setMatrixAt(i, o.matrix); o.position.set(x, 5.1 * s, z); o.updateMatrix(); cr.setMatrixAt(i, o.matrix); cr.setColorAt(i, col.setHSL(0.27 + hrand() * 0.05, 0.5, 0.26 + hrand() * 0.08)); }
          else { o.position.set(x, 1.3 * s, z); o.rotation.set(0, hrand() * 6, 0); o.scale.set(s, s, s); o.updateMatrix(); tr.setMatrixAt(i, o.matrix); o.position.set(x, 3.6 * s, z); o.scale.set(s * 1.15, s * (0.9 + hrand() * 0.3), s * 1.15); o.updateMatrix(); cr.setMatrixAt(i, o.matrix); cr.setColorAt(i, col.setHSL(0.25 + hrand() * 0.1, 0.42 + hrand() * 0.15, 0.24 + hrand() * 0.12)); }
        });
        tr.computeBoundingSphere(); cr.computeBoundingSphere(); tr.castShadow = cr.castShadow = true; cr.receiveShadow = true; scene.add(tr, cr);
      }
      continue;
    }
    const tr = new THREE.InstancedMesh(trunkGeo, trunkMat, n), cr = new THREE.InstancedMesh(crownGeo, crownMat, n);
    for (let i = 0; i < n; i++) {
      const s = 0.8 + rand() * 0.6, x = t[i * 2], z = t[i * 2 + 1];
      o.position.set(x, 1.2 * s, z); o.rotation.set(0, 0, 0); o.scale.set(s, s, s); o.updateMatrix(); tr.setMatrixAt(i, o.matrix);
      o.position.set(x, 3.3 * s, z); o.rotation.set(rand(), rand() * 3, 0); o.scale.set(s * 1.1, s, s * 1.1); o.updateMatrix(); cr.setMatrixAt(i, o.matrix);
      cr.setColorAt(i, col.setHSL(0.26 + rand() * 0.08, 0.45, 0.3 + rand() * 0.1));
    }
    tr.computeBoundingSphere(); cr.computeBoundingSphere();
    tr.castShadow = cr.castShadow = true;
    scene.add(tr, cr);
  }
}
buildChunkMeshes();

/* ---- collision queries ---- */
const waterGrid = new Grid(40);
for (const p of MAP.water) { const bb = bboxOf(p); waterGrid.addBox(bb[0], bb[1], bb[2], bb[3], { p, bb }); }
const segGrid = new Grid(20);       // every road segment (for "am I on a road?" and street names)
for (const r of MAP.roads) {
  if (r.e) continue;
  for (let i = 0; i < r.p.length - 2; i += 2) {
    const ax = r.p[i], az = r.p[i + 1], bx = r.p[i + 2], bz = r.p[i + 3];
    segGrid.addBox(Math.min(ax, bx) - r.w, Math.min(az, bz) - r.w, Math.max(ax, bx) + r.w, Math.max(az, bz) + r.w, { ax, az, bx, bz, w: r.w, n: r.n, c: r.c });
  }
}
for (const l of MAP.waterLines) for (let i = 0; i < l.p.length - 2; i += 2) {
  const ax = l.p[i], az = l.p[i + 1], bx = l.p[i + 2], bz = l.p[i + 3];
  waterGrid.addBox(Math.min(ax, bx) - l.w, Math.min(az, bz) - l.w, Math.max(ax, bx) + l.w, Math.max(az, bz) + l.w, { seg: [ax, az, bx, bz], w: l.w });
}
function onRoad(x, z, extra = 0.6) {
  for (const s of segGrid.query(x, z, 2, _q)) if (segProj(x, z, s.ax, s.az, s.bx, s.bz).d < s.w / 2 + extra) return true;
  return false;
}
function inWater(x, z) {
  for (const w of waterGrid.query(x, z, 1, _q)) {
    if (w.p) { if (x > w.bb[0] && x < w.bb[2] && z > w.bb[1] && z < w.bb[3] && pip(x, z, w.p)) return true; }
    else if (segProj(x, z, ...w.seg).d < w.w / 2) return true;
  }
  return false;
}
function streetNameAt(x, z) {
  let best = null, bd = 1e9;
  for (const s of segGrid.query(x, z, 3, _q)) {
    if (s.n < 0 || s.c >= 6) continue;
    const d = segProj(x, z, s.ax, s.az, s.bx, s.bz).d - s.w / 2;
    if (d < bd) { bd = d; best = NAMES[s.n]; }
  }
  return bd < 3 ? best : null;
}
// push a circle (x,z,r) out of buildings & trees; returns {x,z,hit}
function pushOut(x, z, r) {
  let hit = false;
  for (const b of bColliders.query(x, z, r + 1, _q)) {
    const bb = b.bb; if (x < bb[0] - r || x > bb[2] + r || z < bb[1] - r || z > bb[3] + r) continue;
    const p = b.p; let best = null;
    for (let i = 0, j = p.length - 2; i < p.length; j = i, i += 2) {
      const s = segProj(x, z, p[j], p[j + 1], p[i], p[i + 1]);
      if (!best || s.d < best.d) best = s;
    }
    const ins = pip(x, z, p);
    if (ins || best.d < r) {
      let dx = x - best.x, dz = z - best.z; const l = Math.hypot(dx, dz) || 1e-6;
      if (ins) { dx = -dx; dz = -dz; }
      x = best.x + dx / l * r; z = best.z + dz / l * r; hit = true;
    }
  }
  for (const t of treeColliders.query(x, z, r + 0.5, _q)) {
    const dx = x - t.x, dz = z - t.z, d = Math.hypot(dx, dz), rr = r + 0.3;
    if (d < rr) { x = t.x + dx / (d || 1e-6) * rr; z = t.z + dz / (d || 1e-6) * rr; hit = true; }
  }
  return { x, z, hit };
}

/* ---- road graph (drivable network) ---- */
const GN = MAP.gnodes;
const EDGES = MAP.edges.map((e, i) => {
  const cum = [0]; const p = e.p;
  for (let k = 2; k < p.length; k += 2) cum.push(cum[cum.length - 1] + Math.hypot(p[k] - p[k - 2], p[k + 1] - p[k - 1]));
  return { ...e, id: i, cum, L: cum[cum.length - 1], mx: (p[0] + p[p.length - 2]) / 2, mz: (p[1] + p[p.length - 1]) / 2 };
});
const NODE_OUT = Array.from({ length: GN.length / 2 }, () => []);
const NODE_ALL = Array.from({ length: GN.length / 2 }, () => []);
for (const E of EDGES) {
  NODE_OUT[E.a].push({ E, fwd: true }); if (!E.o) NODE_OUT[E.b].push({ E, fwd: false });
  NODE_ALL[E.a].push({ E, fwd: true }); NODE_ALL[E.b].push({ E, fwd: false });
}
const edgeGrid = new Grid(30);
for (const E of EDGES) for (let k = 0; k < E.p.length - 2; k += 2) {
  const ax = E.p[k], az = E.p[k + 1], bx = E.p[k + 2], bz = E.p[k + 3];
  edgeGrid.addBox(Math.min(ax, bx) - 2, Math.min(az, bz) - 2, Math.max(ax, bx) + 2, Math.max(az, bz) + 2, { E, k });
}
// point at distance s along an edge in travel direction
function edgeAt(E, s, fwd) {
  s = Math.max(0, Math.min(E.L, s));
  const d = fwd ? s : E.L - s;
  const c = E.cum, p = E.p;
  let k = 0; while (k < c.length - 2 && c[k + 1] < d) k++;
  const segL = (c[k + 1] - c[k]) || 1e-6, t = (d - c[k]) / segL;
  let dx = (p[k * 2 + 2] - p[k * 2]) / segL, dz = (p[k * 2 + 3] - p[k * 2 + 1]) / segL;
  const x = p[k * 2] + (p[k * 2 + 2] - p[k * 2]) * t, z = p[k * 2 + 1] + (p[k * 2 + 3] - p[k * 2 + 1]) * t;
  if (!fwd) { dx = -dx; dz = -dz; }
  return { x, z, dx, dz };
}
function nearestEdge(x, z, filter, r = 60) {
  let best = null;
  for (const it of edgeGrid.query(x, z, r, _q)) {
    if (filter && !filter(it.E)) continue;
    const p = it.E.p, k = it.k;
    const s = segProj(x, z, p[k], p[k + 1], p[k + 2], p[k + 3]);
    if (!best || s.d < best.d) best = { E: it.E, d: s.d, x: s.x, z: s.z, along: it.E.cum[k / 2] + s.t * (it.E.cum[k / 2 + 1] - it.E.cum[k / 2]) };
  }
  return best;
}
const edgeName = (E) => E.n >= 0 ? NAMES[E.n] : 'hẻm không tên';

/* ---- landmark labels ---- */
const labels = [];
function labelSprite(text, sub) {
  const tex = canvasTex(512, 128, (g, w, h) => {
    g.font = '800 44px system-ui,sans-serif';
    const tw = Math.min(w - 20, g.measureText(text).width + 40);
    g.fillStyle = 'rgba(15,25,35,.78)'; rr(g, (w - tw) / 2, 18, tw, 76, 20); g.fill();
    g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, w / 2, 58, w - 40);
    if (sub) { g.font = '600 22px system-ui'; g.fillStyle = '#ffd36b'; g.fillText(sub, w / 2, 112); }
  });
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: true, transparent: true }));
  sp.scale.set(24, 6, 1);
  return sp;
}
for (const b of MAP.buildings) {
  if (b.n === undefined || b.h < 14) continue;
  const name = NAMES[b.n]; if (/^Building|^Block|^Tháp|^M Building/.test(name)) continue;
  let cx = 0, cz = 0; for (let i = 0; i < b.p.length; i += 2) { cx += b.p[i]; cz += b.p[i + 1]; } cx /= b.p.length / 2; cz /= b.p.length / 2;
  const sp = labelSprite(name); sp.position.set(cx, b.h + 6, cz); scene.add(sp); labels.push(sp);
}

/* ---- bus stops ---- */
{
  const g = new THREE.Group();
  const roofM = std(0x1f6fb2, { roughness: 0.5 }), postM = std(0xc9ccd0, { metalness: 0.6, roughness: 0.3 }), benchM = std(0x8a6a4a);
  for (let i = 0; i < MAP.bus.length; i += 2) {
    const x = MAP.bus[i], z = MAP.bus[i + 1];
    const ne = nearestEdge(x, z, null, 40); if (!ne) continue;
    const p = ne.E.p; const k = 0;
    const dirx = p[p.length - 2] - p[0], dirz = p[p.length - 1] - p[1];
    const ang = Math.atan2(dirx, dirz);
    // put shelter on the sidewalk on the same side as the OSM node
    const side = Math.sign((x - ne.x) * -dirz + (z - ne.z) * dirx) || 1;
    const L = Math.hypot(dirx, dirz) || 1, nx = -dirz / L * side, nz = dirx / L * side;
    const off = ne.E.w / 2 + 1.8;
    const s = new THREE.Group(); s.position.set(ne.x + nx * off, 0.06, ne.z + nz * off); s.rotation.y = ang;
    const roof = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.08, 3.2), roofM); roof.position.y = 2.5; s.add(roof);
    for (const [px, pz] of [[0.6, 1.5], [0.6, -1.5], [-0.6, 1.5], [-0.6, -1.5]]) { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.5, 6), postM); c.position.set(px, 1.25, pz); s.add(c); }
    const bench = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.08, 2.4), benchM); bench.position.set(side * 0.3, 0.5, 0); s.add(bench);
    const sign = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.5, 0.5), roofM); sign.position.set(0, 2.85, 1.5); s.add(sign);
    g.add(s);
  }
  scene.add(bake(g));
}

/* ---- traffic lights: cluster signal nodes into junctions ---- */
const SIGNALS = [];
{
  const S = MAP.signals, used = new Array(S.length / 2).fill(false);
  for (let i = 0; i < S.length / 2; i++) {
    if (used[i]) continue;
    const members = [i]; used[i] = true;
    for (let k = 0; k < members.length; k++) for (let j = 0; j < S.length / 2; j++) {
      if (used[j]) continue;
      if (Math.hypot(S[j * 2] - S[members[k] * 2], S[j * 2 + 1] - S[members[k] * 2 + 1]) < 42) { used[j] = true; members.push(j); }
    }
    let cx = 0, cz = 0; for (const m of members) { cx += S[m * 2]; cz += S[m * 2 + 1]; } cx /= members.length; cz /= members.length;
    let rad = 0; for (const m of members) rad = Math.max(rad, Math.hypot(S[m * 2] - cx, S[m * 2 + 1] - cz));
    // dominant axis from nearby edges (doubled-angle average)
    let sx = 0, sz = 0;
    for (const it of edgeGrid.query(cx, cz, rad + 20, _q)) {
      const p = it.E.p, k = it.k; if (it.E.c > 4) continue;
      const dx = p[k + 2] - p[k], dz = p[k + 3] - p[k + 1], L = Math.hypot(dx, dz); if (L < 1) continue;
      const a = Math.atan2(dz, dx); const w = it.E.w * Math.min(L, 30);
      sx += Math.cos(2 * a) * w; sz += Math.sin(2 * a) * w;
    }
    const theta = Math.atan2(sz, sx) / 2;
    SIGNALS.push({ x: cx, z: cz, rc: Math.max(10, rad + 9), theta, ax: Math.cos(theta), az: Math.sin(theta), off: rand() * 38, lastViol: -99, prevD: 1e9 });
  }
}
const sigGrid = new Grid(120);
SIGNALS.forEach(s => sigGrid.addBox(s.x - s.rc, s.z - s.rc, s.x + s.rc, s.z + s.rc, s));
const SIG_CYCLE = 38;
let sigClock = 0;
// state for a heading (dx,dz): 'G' | 'Y' | 'R', plus seconds remaining
function sigState(s, dx, dz) {
  const axisA = Math.abs(dx * s.ax + dz * s.az) > 0.7071;
  const t = (sigClock + s.off) % SIG_CYCLE;
  if (axisA) { if (t < 15) return ['G', 15 - t]; if (t < 18) return ['Y', 18 - t]; return ['R', SIG_CYCLE - t]; }
  if (t >= 19 && t < 34) return ['G', 34 - t]; if (t >= 34 && t < 37) return ['Y', 37 - t]; return ['R', t < 19 ? 19 - t : SIG_CYCLE - t + 19];
}
// poles + heads + lamps (instanced)
const sigLamps = [];
{
  const poles = [], heads = [];
  for (const s of SIGNALS) {
    const dirs = [[s.ax, s.az], [-s.ax, -s.az], [-s.az, s.ax], [s.az, -s.ax]];
    for (const [ux, uz] of dirs) {
      // vehicles approaching travel along +u, pole at the right side before the junction, facing them (-u)
      const rx = -uz, rz = ux;
      const px = s.x - ux * s.rc + rx * Math.min(s.rc * 0.75, 9), pz = s.z - uz * s.rc + rz * Math.min(s.rc * 0.75, 9);
      poles.push([px, pz]);
      const ry = Math.atan2(-ux, -uz);
      heads.push([px, pz, ry]);
      for (let k = 0; k < 3; k++) sigLamps.push({ s, ux, uz, k, x: px - ux * 0.2, z: pz - uz * 0.2, y: 4.55 - k * 0.32 });
    }
  }
  const o = new THREE.Object3D();
  const pm = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.08, 0.1, 4.6, 8), std(0x2b2e33, { metalness: 0.5, roughness: 0.5 }), poles.length);
  poles.forEach(([x, z], i) => { o.position.set(x, 2.3, z); o.rotation.set(0, 0, 0); o.scale.set(1, 1, 1); o.updateMatrix(); pm.setMatrixAt(i, o.matrix); });
  const hm = new THREE.InstancedMesh(new THREE.BoxGeometry(0.42, 1.1, 0.3), std(0x1a1c1f, { roughness: 0.6 }), heads.length);
  heads.forEach(([x, z, ry], i) => { o.position.set(x, 4.25, z); o.rotation.set(0, ry, 0); o.updateMatrix(); hm.setMatrixAt(i, o.matrix); });
  pm.castShadow = hm.castShadow = true;
  scene.add(pm, hm);
  var lampMesh = new THREE.InstancedMesh(new THREE.SphereGeometry(0.13, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }), sigLamps.length);
  sigLamps.forEach((l, i) => { o.position.set(l.x, l.y, l.z); o.rotation.set(0, 0, 0); o.updateMatrix(); lampMesh.setMatrixAt(i, o.matrix); lampMesh.setColorAt(i, new THREE.Color(0x222222)); });
  scene.add(lampMesh);
}
const LAMP_ON = [new THREE.Color(5, 0.25, 0.2), new THREE.Color(4, 2.6, 0.2), new THREE.Color(0.3, 4, 0.8)];
const LAMP_OFF = [new THREE.Color(0.18, 0.03, 0.03), new THREE.Color(0.16, 0.12, 0.02), new THREE.Color(0.02, 0.14, 0.05)];
function updateSignals(dt) {
  sigClock += dt;
  sigLamps.forEach((l, i) => {
    const st = sigState(l.s, l.ux, l.uz)[0];
    const on = (l.k === 0 && st === 'R') || (l.k === 1 && st === 'Y') || (l.k === 2 && st === 'G');
    lampMesh.setColorAt(i, on ? LAMP_ON[l.k] : LAMP_OFF[l.k]);
  });
  lampMesh.instanceColor.needsUpdate = true;
}

/* ---- home spot: a residential street near Crescent Mall ---- */
let homeSpot;
{
  let cx = 0, cz = 0;
  const cm = MAP.buildings.find(b => b.n !== undefined && NAMES[b.n] === 'Crescent Mall');
  if (cm) { for (let i = 0; i < cm.p.length; i += 2) { cx += cm.p[i]; cz += cm.p[i + 1]; } cx /= cm.p.length / 2; cz /= cm.p.length / 2; }
  let best = null;
  for (const E of EDGES) {
    if (E.c !== 4 || E.n < 0 || E.L < 50 || E.o) continue;
    const d = Math.hypot(E.mx - cx, E.mz - cz);
    if (d > 120 && (!best || d < best.d)) best = { E, d };
  }
  const E = best ? best.E : EDGES[0];
  const p = edgeAt(E, E.L / 2, true);
  const rx = -p.dz, rz = p.dx;
  homeSpot = { x: p.x + rx * E.w / 4, z: p.z + rz * E.w / 4, h: Math.atan2(p.dx, p.dz), E };
  // "NHÀ TÔI" sign on the sidewalk
  const sx = p.x + rx * (E.w / 2 + 1.6), sz = p.z + rz * (E.w / 2 + 1.6);
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.6, 8), std(0xdddddd, { metalness: 0.5 }));
  pole.position.set(sx, 1.3, sz); pole.castShadow = true; scene.add(pole);
  const board = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.6, 0.06), [0, 0, 0, 0].map(() => std(0x00b14f)).concat([
    new THREE.MeshStandardMaterial({ map: canvasTex(256, 96, (g, w, h) => { g.fillStyle = '#00b14f'; g.fillRect(0, 0, w, h); g.fillStyle = '#fff'; g.font = '900 46px system-ui'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('NHÀ TÔI 🏠', w / 2, h / 2 + 3); }) }),
    new THREE.MeshStandardMaterial({ map: canvasTex(256, 96, (g, w, h) => { g.fillStyle = '#00b14f'; g.fillRect(0, 0, w, h); g.fillStyle = '#fff'; g.font = '900 46px system-ui'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('NHÀ TÔI 🏠', w / 2, h / 2 + 3); }) })]));
  board.position.set(sx, 2.7, sz); board.rotation.y = homeSpot.h + Math.PI / 2; board.castShadow = true; scene.add(board);
}
