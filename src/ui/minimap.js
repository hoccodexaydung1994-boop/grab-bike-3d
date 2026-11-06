'use strict';
/* ================= HUD: minimap from a pre-rendered map ================= */
const PXM = 0.8, MX0 = BX0 - 200, MZ0 = BZ0 - 200;
const mapCv = document.createElement('canvas');
mapCv.width = Math.ceil((BX1 - BX0 + 400) * PXM); mapCv.height = Math.ceil((BZ1 - BZ0 + 400) * PXM);
{
  const g = mapCv.getContext('2d');
  const X = (x) => (x - MX0) * PXM, Z = (z) => (z - MZ0) * PXM;
  const poly = (p, fill) => { g.beginPath(); for (let i = 0; i < p.length; i += 2) (i ? g.lineTo : g.moveTo).call(g, X(p[i]), Z(p[i + 1])); g.closePath(); g.fillStyle = fill; g.fill(); };
  const line = (p, w, col) => { g.beginPath(); for (let i = 0; i < p.length; i += 2) (i ? g.lineTo : g.moveTo).call(g, X(p[i]), Z(p[i + 1])); g.strokeStyle = col; g.lineWidth = Math.max(1, w * PXM); g.lineCap = 'round'; g.lineJoin = 'round'; g.stroke(); };
  g.fillStyle = '#e8e4da'; g.fillRect(0, 0, mapCv.width, mapCv.height);
  MAP.green.forEach(p => poly(p, '#c5e1b0')); MAP.wetland.forEach(p => poly(p, '#b9d4b0')); MAP.pitch.forEach(p => poly(p, '#b3dba0'));
  MAP.water.forEach(p => poly(p, '#9cc8ec')); MAP.waterLines.forEach(l => line(l.p, l.w, '#9cc8ec'));
  for (let i = 0; i < F.length; i += 6) { const cx = F[i], cz = F[i + 1], s = Math.max(F[i + 3], F[i + 4]) * PXM * 0.45; g.fillStyle = '#d6cfc3'; g.fillRect(X(cx) - s, Z(cz) - s, s * 2, s * 2); }
  MAP.buildings.forEach(b => poly(b.p, '#cbc3b6'));
  [...MAP.roads].sort((a, b) => b.c - a.c).forEach(r => { if (!r.e) line(r.p, r.c >= 6 ? r.w : r.w + 2, r.c >= 6 ? '#f4efe6' : '#b9b3a7'); });
  [...MAP.roads].sort((a, b) => b.c - a.c).forEach(r => { if (!r.e && r.c < 6) line(r.p, r.w, r.c <= 1 ? '#ffd27a' : r.c <= 3 ? '#fff3c4' : '#ffffff'); });
  MAP.deck.forEach(d => line(d.p, d.w, '#f6a57a'));
}
const mini = $('mini'), mg = mini.getContext('2d');
function drawRoutePath(g, toX, toY, w, col) {
  if (!route) return;
  const p = route.pts; g.beginPath();
  for (let i = 0; i < p.length; i += 2) (i ? g.lineTo : g.moveTo).call(g, toX(p[i]), toY(p[i + 1]));
  g.strokeStyle = col; g.lineWidth = w; g.lineCap = 'round'; g.lineJoin = 'round'; g.stroke();
}
function drawMini() {
  const W = mini.width, R = 260, S = W / (R * 2);
  mg.clearRect(0, 0, W, W);
  if (phoneDead()) { mg.fillStyle = '#111'; mg.fillRect(0, 0, W, W); mg.fillStyle = '#fff'; mg.font = '700 28px system-ui'; mg.textAlign = 'center'; mg.fillText('📵', W / 2, W / 2 - 10); mg.font = '600 18px system-ui'; mg.fillText(L('Hết pin', 'No battery'), W / 2, W / 2 + 26); return; }
  mg.drawImage(mapCv, (player.x - R - MX0) * PXM, (player.z - R - MZ0) * PXM, R * 2 * PXM, R * 2 * PXM, 0, 0, W, W);
  const X = (x) => (x - player.x + R) * S, Z = (z) => (z - player.z + R) * S;
  drawRoutePath(mg, X, Z, 6, game.state === 'pickup' ? '#00b14f' : '#ff7a00');
  for (const s of SIGNALS) { const x = X(s.x), y = Z(s.z); if (x < 0 || y < 0 || x > W || y > W) continue; const [st] = sigState(s, Math.sin(player.h), Math.cos(player.h)); mg.fillStyle = st === 'G' ? '#22c55e' : st === 'Y' ? '#facc15' : '#ef4444'; mg.beginPath(); mg.arc(x, y, 4, 0, 7); mg.fill(); }
  for (const c of cars) { if (!c.mesh.visible) continue; const x = X(c.mesh.position.x), y = Z(c.mesh.position.z); if (x < 0 || y < 0 || x > W || y > W) continue; const sz = c.kind === 'bike' ? 3 : 5; mg.fillStyle = c.kind === 'bike' ? '#8a7a40' : '#555'; mg.fillRect(x - sz / 2, y - sz / 2, sz, sz); }
  const dot = (p, c) => { let x = X(p.x), y = Z(p.z); x = Math.max(8, Math.min(W - 8, x)); y = Math.max(8, Math.min(W - 8, y)); mg.fillStyle = c; mg.beginPath(); mg.arc(x, y, 9, 0, Math.PI * 2); mg.fill(); mg.strokeStyle = '#fff'; mg.lineWidth = 3; mg.stroke(); };
  if (game.state === 'pickup') dot(game.order.pickup, '#00b14f');
  if (game.state === 'ride') dot(game.order.drop, '#ff7a00');
  if (police.active) dot({ x: police.x, z: police.z }, '#1d4ed8');
  if (SK().tho >= 2) for (const c of CHECKPOINTS) { const x = X(c.x), y = Z(c.z); if (x > 0 && y > 0 && x < W && y < W) { mg.fillStyle = '#1e40af'; mg.fillRect(x - 7, y - 7, 14, 14); mg.fillStyle = '#fff'; mg.font = '700 12px system-ui'; mg.fillText('P', x, y + 1); } }
  if (game.order && game.order.stops) for (let i = game.order.si + 1; i < game.order.stops.length; i++) { const p = stopSpot(game.order, game.order.stops[i]); const x = X(p.x), y = Z(p.z); mg.fillStyle = '#ff8a1f'; mg.beginPath(); mg.arc(x, y, 6, 0, 7); mg.fill(); }
  mg.font = '26px system-ui'; mg.textAlign = 'center'; mg.textBaseline = 'middle';
  { const x = X(homeSpot.x), y = Z(homeSpot.z); if (x > 0 && y > 0 && x < W && y < W) mg.fillText('🏠', x, y - 14); }
  mg.save(); mg.translate(W / 2, W / 2); mg.rotate(Math.atan2(Math.cos(player.h), Math.sin(player.h)));
  mg.fillStyle = '#1a73e8'; mg.strokeStyle = '#fff'; mg.lineWidth = 3;
  mg.beginPath(); mg.moveTo(16, 0); mg.lineTo(-10, 10); mg.lineTo(-5, 0); mg.lineTo(-10, -10); mg.closePath(); mg.fill(); mg.stroke();
  mg.restore();
  mg.fillStyle = 'rgba(0,0,0,.55)'; mg.font = '700 20px system-ui'; mg.fillText('B', W / 2, 16);
}
