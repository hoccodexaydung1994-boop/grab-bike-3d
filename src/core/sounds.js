'use strict';
/* ================= Âm thanh thật từ file (assets/audio, cấu hình data/config/sounds.json) ================= */
// Thiếu file nào thì giữ âm thanh tổng hợp của core/audio.js cho phần đó.
const SND = { buf: {}, loops: {}, cfg: CFG.sounds.sounds, loading: false, engSrc: null, engGain: null };
async function sndLoad() {
  if (SND.loading || !actx) return; SND.loading = true;
  await Promise.all(Object.entries(SND.cfg).map(async ([k, c]) => {
    const base = c.file.replace(/\.\w+$/, ''), tries = [c.url, 'assets/audio/' + c.file, ...['.ogg', '.mp3', '.wav', '.m4a'].map(e => 'assets/audio/' + base + e)].filter(Boolean);
    for (const u of [...new Set(tries)]) {
      try { const r = await fetch(u); if (!r.ok) continue; const ab = await r.arrayBuffer(); SND.buf[k] = await actx.decodeAudioData(ab); break; } catch (e) { }
    }
  }));
  const n = Object.keys(SND.buf).length;
  if (n) console.log('🔊 Âm thanh thật:', Object.keys(SND.buf).join(', '));
  if (SND.buf.engine) { const s = actx.createBufferSource(), g = actx.createGain(); s.buffer = SND.buf.engine; s.loop = true; g.gain.value = 0; s.connect(g).connect(actx.destination); s.start(); SND.engSrc = s; SND.engGain = g; }
  for (const k of ['rain', 'city', 'siren']) if (SND.buf[k]) { const s = actx.createBufferSource(), g = actx.createGain(); s.buffer = SND.buf[k]; s.loop = true; g.gain.value = 0; s.connect(g).connect(actx.destination); s.start(); SND.loops[k] = g; }
}
{ const _ia = initAudio; initAudio = function () { _ia(); sndLoad(); }; }
function sndPlay(k, rate = 1, vol = 1) {
  const b = SND.buf[k]; if (!b || !actx || game.muted) return false;
  const s = actx.createBufferSource(), g = actx.createGain(); s.buffer = b; s.playbackRate.value = rate; g.gain.value = (SND.cfg[k].vol ?? 0.6) * vol;
  s.connect(g).connect(actx.destination); s.start(); return true;
}
function sndLoop(k, target) { const g = SND.loops[k]; if (!g) return false; g.gain.setTargetAtTime(game.muted ? 0 : target * (SND.cfg[k].vol ?? 0.5), actx.currentTime, 0.4); return true; }
function sndEngine(on, sp, gas) {
  if (!SND.engSrc) return;
  SND.engSrc.playbackRate.setTargetAtTime(0.7 + Math.min(1.6, sp / 14) + (gas ? 0.08 : 0), actx.currentTime, 0.08);
  SND.engGain.gain.setTargetAtTime(on ? SND.cfg.engine.vol * (0.55 + (gas ? 0.45 : 0) + Math.min(0.3, sp / 40)) : 0, actx.currentTime, 0.1);
}
{ const _h = horn; horn = () => { if (!sndPlay('horn', 0.95 + Math.random() * 0.1)) _h(); }; }
BOOT.push(() => {
  const _so = showOffer; showOffer = function (o) { _so(o); sndPlay('offer'); };
  const _ea = earn; earn = function (a, m, t) { _ea(a, m, t); if (a >= 5000) sndPlay('cash', 1, 0.7); };
  const _tf = triggerFall; triggerFall = function (r) { const was = fall.on; _tf(r); if (!was && fall.on) sndPlay('crash'); };
  const _oc = onCrash; onCrash = function (sp) { _oc(sp); sndPlay('crash', 1.1, Math.min(1, sp / 14)); };
  const _st = $('bStart').onclick; $('bStart').onclick = function (e) { _st && _st.call(this, e); setTimeout(() => sndPlay('start'), 300); };
  FRAME.push(() => { if (actx) sndLoop('siren', police.active && police.mode === 'pursue' ? Math.max(0, 1 - Math.hypot(police.x - player.x, police.z - player.z) / 200) : 0); });
});
