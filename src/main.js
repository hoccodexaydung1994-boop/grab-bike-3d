// Grab Bike 3D – Quận 7 · entry point
// 1) nạp three.js, 2) nạp dữ liệu (bản đồ + cấu hình), 3) chạy lần lượt các file game trong src/manifest.json
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
Object.assign(window, { THREE, OrbitControls, GLTFLoader, mergeGeometries, EffectComposer, RenderPass, UnrealBloomPass, OutputPass });

const status = (t) => { const el = document.getElementById('loading'); if (el) el.textContent = t; };
window.addEventListener('error', (e) => status('⚠️ Lỗi: ' + e.message + ' (' + (e.filename || '').split('/').slice(-2).join('/') + ':' + e.lineno + ')'));
const getJSON = async (p, v) => { const r = await fetch(p + '?v=' + v); if (!r.ok) throw new Error(p + ' ' + r.status); return r.json(); };
const loadScript = (src) => new Promise((ok, fail) => { const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = () => fail(new Error('Không tải được ' + src)); document.body.appendChild(s); });

try {
  const man = await getJSON('src/manifest.json', Date.now());
  window.GAME_VERSION = man.version;
  status('Đang tải bản đồ Quận 7…');
  const cfgNames = man.config || [];
  const [map, ...cfgs] = await Promise.all([getJSON('data/map/q7.json', man.version), ...cfgNames.map(n => getJSON('data/config/' + n + '.json', man.version))]);
  window.Q7 = map; window.CFG = Object.fromEntries(cfgNames.map((n, i) => [n, cfgs[i]]));
  for (let i = 0; i < man.files.length; i++) { status(`Đang khởi động… ${Math.round(i / man.files.length * 100)}%`); await loadScript('src/' + man.files[i] + '?v=' + man.version); }
} catch (e) { status('⚠️ ' + e.message + ' — hãy mở game qua web (Vercel / npx serve), không mở file trực tiếp.'); console.error(e); }
