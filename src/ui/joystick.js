'use strict';
/* ================= Mobile joystick ================= */
{
  const joy = $('joy'), knob = $('joyKnob'); let pid = null, cx = 0;
  joy.addEventListener('pointerdown', (e) => { e.preventDefault(); pid = e.pointerId; const r = joy.getBoundingClientRect(); cx = r.left + r.width / 2; joy.setPointerCapture && joy.setPointerCapture(pid); move(e); });
  const move = (e) => { if (e.pointerId !== pid) return; const r = joy.getBoundingClientRect(); const dx = Math.max(-1, Math.min(1, (e.clientX - cx) / (r.width / 2))); touch.axis = -dx; knob.style.transform = `translateX(${dx * r.width / 2 * 0.7}px)`; };
  const up = (e) => { if (e.pointerId !== pid) return; pid = null; touch.axis = 0; knob.style.transform = ''; };
  joy.addEventListener('pointermove', move); joy.addEventListener('pointerup', up); joy.addEventListener('pointercancel', up);
}
