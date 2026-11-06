'use strict';
/* ================= Xe chạy trên cầu + âm thanh môi trường (phố, mưa, còi) ================= */
const DECK_CARS = [];
DECKS.forEach((D, di) => {
  const L_ = D.cum[D.cum.length - 1], n = Math.min(5, Math.max(1, Math.round(L_ / 220)));
  for (let i = 0; i < n; i++) {
    const car = rand() < 0.3 && D.w >= 8, built = car ? buildCar(pick(['sedan', 'hatch', 'suv']), pick([0xffffff, 0x111111, 0x9aa4ae, 0xc62828, 0x1e3a8a])) : buildMotorbike();
    scene.add(built.mesh);
    DECK_CARS.push({ di, mesh: built.mesh, s: L_ * (i + rand()) / n, sp: car ? 10 + rand() * 3 : 8 + rand() * 3, lat: (rand() - 0.5) * D.w * 0.5, car });
  }
});
function deckPos(D, s) {
  let k = 0; while (k < D.cum.length - 2 && D.cum[k + 1] < s) k++;
  const seg = (D.cum[k + 1] - D.cum[k]) || 1, t = Math.max(0, Math.min(1, (s - D.cum[k]) / seg));
  const ax = D.p[k * 2], az = D.p[k * 2 + 1], bx = D.p[k * 2 + 2], bz = D.p[k * 2 + 3], dx = (bx - ax) / seg, dz = (bz - az) / seg;
  return { x: ax + (bx - ax) * t, z: az + (bz - az) * t, y: D.h[k] + (D.h[k + 1] - D.h[k]) * t, dx, dz };
}
let deckBumpCD = 0;
FRAME.push((dt) => {
  deckBumpCD -= dt;
  const live = !game.paused;
  for (const v of DECK_CARS) {
    const D = DECKS[v.di], Lx = D.cum[D.cum.length - 1];
    if (live) { v.s += v.sp * trafficLevel().speed * dt; if (v.s > Lx) v.s -= Lx; }
    const q = deckPos(D, v.s);
    const x = q.x + q.dz * v.lat, z = q.z - q.dx * v.lat;
    const far = Math.abs(x - player.x) > 420 || Math.abs(z - player.z) > 420;
    v.mesh.visible = !far; if (far) continue;
    v.mesh.position.set(x, q.y + 0.08, z); v.mesh.rotation.y = Math.atan2(q.dx, q.dz);
    if (player.deck && player.deck.di === v.di && deckBumpCD <= 0 && game.mode === 'drive' && Math.hypot(x - player.x, z - player.z) < (v.car ? 2.2 : 1.3) && Math.abs(q.y - player.y) < 2) {
      deckBumpCD = 1.5; const sp = Math.abs(player.v); player.v *= 0.3;
      if (sp > 5) { onCrash(sp); toast(L('💥 Va chạm trên cầu!', '💥 Collision on the bridge!'), 1.4); tone(90, 0, 0.25, 'square', 0.12); } else horn();
    }
  }
});

/* ---- ambient sound: city hum, rain, distant horns (procedural, no audio files) ---- */
const AMB = { on: false, city: null, rain: null, hornT: 8 };
function initAmbient() {
  if (AMB.on || !actx) return; AMB.on = true;
  const len = actx.sampleRate * 2, buf = actx.createBuffer(1, len, actx.sampleRate), d = buf.getChannelData(0);
  let last = 0; for (let i = 0; i < len; i++) { const w = Math.random() * 2 - 1; last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5 * 0.6 + w * 0.4; }
  const mk = (type, f, q) => { const src = actx.createBufferSource(); src.buffer = buf; src.loop = true; const fl = actx.createBiquadFilter(); fl.type = type; fl.frequency.value = f; fl.Q.value = q; const g = actx.createGain(); g.gain.value = 0; src.connect(fl).connect(g).connect(actx.destination); src.start(); return g; };
  AMB.city = mk('lowpass', 380, 0.7); AMB.rain = mk('highpass', 1400, 0.4);
}
FRAME.push((dt) => {
  if (!actx) return; initAmbient();
  const on = !game.muted && (game.mode === 'drive' || game.mode === 'menu');
  let near = 0; if (on) for (const c of cars) if (c.mesh.visible && Math.abs(c.mesh.position.x - player.x) + Math.abs(c.mesh.position.z - player.z) < 70) near++;
  const cityK = on ? Math.min(1, 0.25 + near * 0.06) * (player.y > 10 ? 0.5 : 1) : 0, rainK = on ? rain : 0;
  // file thật (core/sounds.js) nếu có, không thì tiếng ồn tổng hợp
  AMB.city.gain.setTargetAtTime(sndLoop('city', cityK) ? 0 : cityK * 0.05, actx.currentTime, 0.4);
  AMB.rain.gain.setTargetAtTime(sndLoop('rain', rainK) ? 0 : rainK * 0.07, actx.currentTime, 0.5);
  if (on && game.mode === 'drive' && !game.paused) {
    AMB.hornT -= dt * (isPeak() ? 1.8 : 1) * (near > 6 ? 1.5 : 0.7);
    if (AMB.hornT <= 0) { AMB.hornT = 6 + Math.random() * 14; if (sndPlay('horn', 0.8 + Math.random() * 0.4, 0.25)) return; const f = pick([392, 440, 494, 330]), v = 0.012 + Math.random() * 0.015; tone(f, 0, 0.22, 'square', v); if (Math.random() < 0.5) tone(f * 1.26, 0.02, 0.2, 'square', v * 0.8); }
  }
});
