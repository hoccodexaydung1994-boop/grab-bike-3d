'use strict';
/* ================= Audio ================= */
let actx = null, eng = null;
function initAudio() {
  if (actx) return;
  try {
    actx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = actx.createOscillator(); osc.type = 'sawtooth';
    const osc2 = actx.createOscillator(); osc2.type = 'square';
    const filt = actx.createBiquadFilter(); filt.type = 'lowpass'; filt.frequency.value = 500;
    const gain = actx.createGain(); gain.gain.value = 0;
    const g2 = actx.createGain(); g2.gain.value = 0.3;
    osc.connect(filt); osc2.connect(g2).connect(filt); filt.connect(gain).connect(actx.destination);
    osc.start(); osc2.start();
    eng = { osc, osc2, filt, gain };
  } catch (e) { actx = null; }
}
function tone(freq, t0, dur, type = 'sine', vol = 0.12) {
  if (!actx || game.muted) return;
  const o = actx.createOscillator(), g = actx.createGain();
  o.type = type; o.frequency.value = freq;
  g.gain.setValueAtTime(vol, actx.currentTime + t0);
  g.gain.exponentialRampToValueAtTime(0.001, actx.currentTime + t0 + dur);
  o.connect(g).connect(actx.destination); o.start(actx.currentTime + t0); o.stop(actx.currentTime + t0 + dur + 0.02);
}
let ding = (notes) => notes.forEach((f, i) => tone(f, i * 0.11, 0.25, 'sine', 0.1));
let horn = () => { tone(415, 0, 0.35, 'square', 0.05); tone(523, 0, 0.35, 'square', 0.05); };
