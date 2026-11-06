'use strict';
/* ================= Phone + holder with live driver app ================= */
const phoneCanvas = document.createElement('canvas');
phoneCanvas.width = 360; phoneCanvas.height = 720;
const phoneTex = new THREE.CanvasTexture(phoneCanvas);
phoneTex.colorSpace = THREE.SRGBColorSpace; phoneTex.anisotropy = 8;
function buildPhoneMount() {
  const g = new THREE.Group();
  const black = std(0x161616, { roughness: 0.5, metalness: 0.3 });
  // clamp on the right handlebar (right side = -x)
  const clamp = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.05, 12), black);
  clamp.rotation.z = Math.PI / 2; clamp.position.set(-0.2, 1.1, 0.29); g.add(clamp);
  // arm + ball joint
  const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.11, 8), black);
  arm.position.set(-0.2, 1.16, 0.28); arm.rotation.x = -0.25; g.add(arm);
  g.add(joint([-0.2, 1.215, 0.265], 0.016, black));
  // cradle + phone, tilted back toward the rider
  const holder = new THREE.Group();
  holder.position.set(-0.2, 1.27, 0.255);
  holder.rotation.x = 0.62;
  const cradle = new THREE.Mesh(new THREE.BoxGeometry(0.092, 0.17, 0.012), black);
  cradle.position.z = 0.004; holder.add(cradle);
  for (const sy of [-1, 1]) {
    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.012, 0.022), black);
    grip.position.set(0, sy * 0.087, -0.006); holder.add(grip);
  }
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.078, 0.158, 0.009), std(0x2a2d33, { metalness: 0.7, roughness: 0.3 }));
  body.position.z = -0.008; holder.add(body);
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.072, 0.152), new THREE.MeshBasicMaterial({ map: phoneTex, toneMapped: false }));
  screen.position.z = -0.0128; screen.rotation.y = Math.PI; holder.add(screen); // faces the rider (-z)
  g.add(holder);
  shadowAll(g);
  screen.castShadow = false;
  return g;
}

function rr(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
function drawPhone() {
  const g = phoneCanvas.getContext('2d'), W = phoneCanvas.width, H = phoneCanvas.height;
  g.fillStyle = '#f3f5f4'; g.fillRect(0, 0, W, H);
  // status bar
  const now = new Date();
  g.fillStyle = '#0b8f45'; g.fillRect(0, 0, W, 112);
  g.fillStyle = '#fff'; g.font = '600 18px system-ui,sans-serif'; g.textAlign = 'left'; g.textBaseline = 'middle';
  g.fillText(now.toTimeString().slice(0, 5), 20, 20);
  g.textAlign = 'right'; g.fillText('4G ▮▮▮  87%', W - 18, 20);
  // app header
  g.textAlign = 'left'; g.font = '800 26px system-ui,sans-serif'; g.fillText('Tài xế Bike', 20, 58);
  const online = game.mode === 'drive';
  rr(g, W - 132, 42, 112, 32, 16); g.fillStyle = online ? '#ffffff' : '#c9d3cd'; g.fill();
  g.fillStyle = online ? '#0b8f45' : '#555'; g.font = '700 16px system-ui,sans-serif'; g.textAlign = 'center';
  g.fillText(online ? '● Trực tuyến' : '○ Ngoại tuyến', W - 76, 59);
  if (phoneDead()) { g.fillStyle = '#050505'; g.fillRect(0, 0, W, H); g.fillStyle = '#fff'; g.textAlign = 'center'; g.font = '700 60px system-ui'; g.fillText('📵', W / 2, H / 2 - 30); g.font = '700 22px system-ui'; g.fillText(L('Hết pin', 'Battery dead'), W / 2, H / 2 + 30); g.font = '500 15px system-ui'; g.fillText(L('Sạc ở quán cà phê (phím E)', 'Charge at a café (E)'), W / 2, H / 2 + 60); phoneTex.needsUpdate = true; return; }
  // earnings strip
  g.textAlign = 'left'; g.fillStyle = 'rgba(255,255,255,.85)'; g.font = '500 15px system-ui,sans-serif';
  g.fillText('Thu nhập hôm nay', 20, 92);
  g.textAlign = 'right'; g.fillStyle = '#fff'; g.font = '800 20px system-ui,sans-serif';
  g.fillText(fmtVND(profile.money), W - 20, 92);
  // map (real streets, heading-up)
  const my = 124, mh = 300, cxm = W / 2, cym = my + mh * 0.62, sc = 1.6;
  rr(g, 12, my, W - 24, mh, 16); g.save(); g.clip();
  g.fillStyle = '#e8e4da'; g.fillRect(12, my, W - 24, mh);
  g.translate(cxm, cym); g.rotate(player.h - Math.PI);
  g.save(); g.scale(sc / PXM, sc / PXM); g.drawImage(mapCv, -(player.x - MX0) * PXM, -(player.z - MZ0) * PXM); g.restore();
  const target = currentTarget();
  if (route) drawRoutePath(g, (x) => (x - player.x) * sc, (z) => (z - player.z) * sc, 7, game.state === 'pickup' ? '#00a650' : '#ff7a00');
  if (target) {
    const tx = (target.x - player.x) * sc, tz = (target.z - player.z) * sc;
    g.fillStyle = game.state === 'pickup' ? '#00a650' : '#ff7a00'; g.beginPath(); g.arc(tx, tz, 11, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#fff'; g.beginPath(); g.arc(tx, tz, 4.5, 0, Math.PI * 2); g.fill();
  }
  if (police.active) { const px = (police.x - player.x) * sc, pz = (police.z - player.z) * sc; g.fillStyle = (Math.floor(performance.now() / 250) % 2) ? '#ef4444' : '#2563eb'; g.beginPath(); g.arc(px, pz, 9, 0, 7); g.fill(); }
  g.restore();
  g.save(); g.translate(cxm, cym);
  g.fillStyle = '#1a73e8'; g.strokeStyle = '#fff'; g.lineWidth = 3;
  g.beginPath(); g.moveTo(0, -14); g.lineTo(10, 10); g.lineTo(0, 4); g.lineTo(-10, 10); g.closePath(); g.fill(); g.stroke();
  g.restore();
  // speed bubble + street
  rr(g, 22, my + 12, 74, 40, 12); g.fillStyle = 'rgba(255,255,255,.92)'; g.fill();
  g.fillStyle = '#222'; g.textAlign = 'center'; g.font = '800 20px system-ui,sans-serif';
  g.fillText(Math.round(Math.abs(player.v) * 3.6), 59, my + 29); g.font = '500 11px system-ui'; g.fillText('km/h', 59, my + 45);
  const sn = streetNameAt(player.x, player.z);
  if (sn) { g.font = '700 15px system-ui'; const tw = Math.min(W - 60, g.measureText(sn).width + 24); rr(g, (W - tw) / 2, my + mh - 40, tw, 28, 14); g.fillStyle = 'rgba(20,30,40,.8)'; g.fill(); g.fillStyle = '#fff'; g.fillText(sn, W / 2, my + mh - 25, W - 70); }
  // card
  const cy = my + mh + 12;
  rr(g, 12, cy, W - 24, H - cy - 14, 18); g.fillStyle = '#ffffff'; g.fill();
  g.textAlign = 'left';
  const line = (txt, y, font, col) => { g.font = font; g.fillStyle = col; g.fillText(txt, 30, y, W - 60); };
  const row = (y, col, label, val) => {
    g.fillStyle = col; g.beginPath(); g.arc(38, y, 7, 0, Math.PI * 2); g.fill();
    g.font = '500 13px system-ui,sans-serif'; g.fillStyle = '#888'; g.fillText(label, 56, y - 10);
    g.font = '700 17px system-ui,sans-serif'; g.fillStyle = '#1d1d1f'; g.fillText(val, 56, y + 11, W - 90);
  };
  if (profile.banned) {
    line('⛔ Tài khoản bị khóa hôm nay', cy + 44, '800 20px system-ui,sans-serif', '#c62828');
    line('Xe đang bị CSGT tạm giữ', cy + 80, '500 16px system-ui,sans-serif', '#555');
  } else if (game.state === 'offer' && game.offer) {
    const o = game.offer, food = o.type !== 'ride';
    rr(g, 30, cy + 16, 130, 28, 14); g.fillStyle = food ? '#fff1e3' : '#e6f6ec'; g.fill();
    g.font = '800 14px system-ui'; g.fillStyle = food ? '#d76500' : '#0b8f45'; g.fillText(food ? '🍜 GRABFOOD' : '🛵 GRABBIKE', 42, cy + 31);
    g.textAlign = 'right'; g.font = '800 22px system-ui'; g.fillStyle = '#0b8f45'; g.fillText(fmtVND(o.fare), W - 30, cy + 32); g.textAlign = 'left';
    row(cy + 78, '#00a650', food ? 'Lấy món tại' : 'Điểm đón', o.subs ? o.subs[0].shop.name + ' + ' + o.subs[1].shop.name : food ? o.shop.name : 'Đường ' + o.pickup.name);
    row(cy + 130, '#ff7a00', 'Giao tới', o.subs ? o.subs[0].drop.name + ' · ' + o.subs[1].drop.name : 'Đường ' + o.drop.name);
    line(`${o.km.toFixed(1)} km${food ? ' · ' + o.items.join(', ') : ''}`, cy + 172, '500 14px system-ui', '#777');
    rr(g, 26, H - 80, W - 52, 50, 25); g.fillStyle = '#00a650'; g.fill();
    g.fillStyle = '#fff'; g.font = '800 19px system-ui'; g.textAlign = 'center'; g.fillText(`NHẬN CUỐC (${Math.ceil(o.expire)}s)`, W / 2, H - 55);
  } else if (!target) {
    line('Đang tìm cuốc gần bạn…', cy + 40, '700 22px system-ui,sans-serif', '#1d1d1f');
    const t = performance.now() / 300;
    for (let i = 0; i < 3; i++) { g.fillStyle = `rgba(0,166,80,${0.3 + 0.7 * ((Math.sin(t - i) + 1) / 2)})`; g.beginPath(); g.arc(40 + i * 22, cy + 80, 7, 0, Math.PI * 2); g.fill(); }
    line(`Chuyến hôm nay: ${profile.trips}   ⭐ ${$('rating').textContent}   Cấp ${profile.level}`, cy + 130, '500 16px system-ui,sans-serif', '#555');
    line(`Mục tiêu: ${fmtVND(Math.max(0, profile.money))} / ${fmtVND(profile.goal)}`, cy + 160, '600 16px system-ui,sans-serif', '#0b8f45');
  } else if (game.order && game.order.type === 'batch') {
    const o = game.order;
    line(L('🍱 ĐƠN GHÉP · 2 túi hàng', '🍱 BATCH · 2 bags'), cy + 34, '800 17px system-ui', '#d76500');
    if (o.stops) o.stops.forEach((st, i) => {
      const sub = o.subs[st.s], done = i < o.si, cur = i === o.si;
      const txt = `${done ? '✅' : cur ? '👉' : '⬜'} ${st.k === 'pick' ? L('Lấy', 'Pick') : L('Giao', 'Drop')} ${st.s + 1}: ${st.k === 'pick' ? sub.shop.name : sub.drop.name}`;
      line(txt, cy + 66 + i * 28, (cur ? '700 ' : '500 ') + '15px system-ui', done ? '#999' : '#1d1d1f');
    });
    o.subs.forEach((sub, i) => { if (sub.picked && !sub.done) line(`${L('Túi', 'Bag')} ${i + 1}: 🔥${Math.round(sub.heat)}% 📦${Math.round(sub.integ)}%`, cy + 186 + i * 22, '600 14px system-ui', sub.heat < 50 ? '#c62828' : '#0b8f45'); });
    rr(g, 26, H - 80, W - 52, 50, 25); g.fillStyle = game.state === 'ride' ? '#ff7a00' : '#00a650'; g.fill();
    g.fillStyle = '#fff'; g.font = '800 19px system-ui,sans-serif'; g.textAlign = 'center'; g.fillText(game.state === 'ride' ? L('🏁 TỚI ĐIỂM GIAO', '🏁 GO TO DROP') : L('📍 TỚI QUÁN', '📍 GO TO SHOP'), W / 2, H - 55);
  } else {
    const o = game.order, food = o.type === 'food', pickup = game.state === 'pickup';
    rr(g, 30, cy + 18, 150, 28, 14); g.fillStyle = pickup ? '#e6f6ec' : '#fff1e3'; g.fill();
    g.font = '700 14px system-ui,sans-serif'; g.fillStyle = pickup ? '#0b8f45' : '#d76500';
    g.fillText(pickup ? (food ? 'ĐANG TỚI QUÁN' : 'ĐANG ĐẾN ĐÓN') : (food ? 'ĐANG GIAO MÓN' : 'ĐANG CHỞ KHÁCH'), 42, cy + 33);
    const d = route ? route.len : Math.hypot(target.x - player.x, target.z - player.z);
    g.textAlign = 'right'; g.font = '800 20px system-ui,sans-serif'; g.fillStyle = '#1d1d1f';
    g.fillText(d >= 1000 ? (d / 1000).toFixed(1) + ' km' : Math.round(d) + ' m', W - 30, cy + 33);
    g.textAlign = 'left';
    row(cy + 82, '#00a650', food ? 'Lấy món tại' : 'Điểm đón', food ? o.shop.name : 'Đường ' + o.pickup.name);
    g.strokeStyle = '#ccc'; g.lineWidth = 2; g.setLineDash([4, 4]); g.beginPath(); g.moveTo(38, cy + 92); g.lineTo(38, cy + 126); g.stroke(); g.setLineDash([]);
    row(cy + 136, '#ff7a00', food ? 'Giao tới' : 'Điểm đến', 'Đường ' + o.drop.name);
    g.font = '500 14px system-ui,sans-serif'; g.fillStyle = '#888'; g.fillText(`${o.km.toFixed(1)} km · ${food ? o.items.join(', ') : 'Tiền mặt'}`, 30, cy + 182, W - 150);
    g.textAlign = 'right'; g.font = '800 22px system-ui,sans-serif'; g.fillStyle = '#0b8f45'; g.fillText(fmtVND(o.fare), W - 30, cy + 182); g.textAlign = 'left';
    rr(g, 26, H - 80, W - 52, 50, 25); g.fillStyle = pickup ? '#00a650' : '#ff7a00'; g.fill();
    g.fillStyle = '#fff'; g.font = '800 19px system-ui,sans-serif'; g.textAlign = 'center';
    g.fillText(pickup ? (food ? '📍 TỚI QUÁN LẤY MÓN' : '📍 TỚI ĐIỂM ĐÓN KHÁCH') : '🏁 TỚI ĐIỂM GIAO', W / 2, H - 55);
  }
  phoneTex.needsUpdate = true;
}

const shirtColors = CFG.outfits.shirtColors;   // data/config/outfits.json
function buildPassengerSeated() {
  const g = new THREE.Group();
  const shirtMat = std(0xe8505b, { roughness: 0.85 });
  const pants = std(0x3a3a40, { roughness: 0.9 });
  const torso = limb([0, 0.92, -0.7], [0, 1.36, -0.64], 0.15, shirtMat);
  torso.scale.set(1.15, 1, 0.85); g.add(torso);
  g.add(limb([0, 1.48, -0.62], [0, 1.53, -0.61], 0.055, skin));
  g.add(helmet([0, 1.65, -0.6], GRAB_GREEN));
  for (const s of [-1, 1]) {
    g.add(limb([s * 0.19, 1.32, -0.64], [s * 0.25, 1.12, -0.56], 0.05, shirtMat));
    g.add(limb([s * 0.25, 1.12, -0.56], [s * 0.19, 1.04, -0.44], 0.045, skin));
    g.add(limb([s * 0.12, 0.88, -0.68], [s * 0.26, 0.84, -0.4], 0.072, pants));
    g.add(limb([s * 0.26, 0.84, -0.4], [s * 0.37, 0.36, -0.42], 0.058, pants));
    const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.08, 0.2), std(0xf0f0f0)); shoe.position.set(s * 0.37, 0.31, -0.38); g.add(shoe);
  }
  shadowAll(g);
  g.userData.shirt = shirtMat;
  return g;
}
function buildPassengerStanding() {
  const g = new THREE.Group();
  const shirtMat = std(0xe8505b, { roughness: 0.85 });
  const pants = std(0x3a3a40, { roughness: 0.9 });
  for (const s of [-1, 1]) {
    g.add(limb([s * 0.1, 0.92, 0], [s * 0.11, 0.1, 0], 0.07, pants));
    const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.08, 0.22), std(0xf0f0f0)); shoe.position.set(s * 0.11, 0.04, 0.04); g.add(shoe);
  }
  const torso = limb([0, 0.98, 0], [0, 1.42, 0], 0.16, shirtMat); torso.scale.set(1.15, 1, 0.8); g.add(torso);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.13, 16, 12), skin); head.position.y = 1.72; g.add(head);
  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.135, 16, 10, 0, Math.PI * 2, 0, 1.4), std(0x1a1310)); hair.position.y = 1.74; g.add(hair);
  g.add(limb([-0.2, 1.42, 0], [-0.25, 0.98, 0.02], 0.05, shirtMat));
  const arm = new THREE.Group(); arm.position.set(0.2, 1.42, 0);
  arm.add(limb([0, 0, 0], [0.18, 0.42, 0], 0.05, shirtMat));
  const hand = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), skin); hand.position.set(0.2, 0.47, 0); arm.add(hand);
  g.add(arm);
  // phone in other hand
  const phone = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.13, 0.015), std(0x111111)); phone.position.set(-0.26, 0.97, 0.06); g.add(phone);
  shadowAll(g);
  g.userData.arm = arm; g.userData.shirt = shirtMat;
  return g;
}
