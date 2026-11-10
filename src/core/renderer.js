'use strict';
// hooks run once after every src file is loaded (see boot.js)
const BOOT = [];
/* ================= Renderer / scene ================= */
// Mức đồ hoạ: 'high' (mặc định trên máy tính) | 'low'. Đổi trong Cài đặt → tải lại trang.
const GFX_HIGH = (() => { try { const v = localStorage.getItem('grabbike.gfx'); if (v) return v === 'high'; } catch (e) { } return !(typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches); })();
let hdSeed = 20261111; const hrand = () => (hdSeed = (hdSeed * 16807) % 2147483647) / 2147483647;   // RNG riêng cho chi tiết HD (không đổi thế giới)
const SUN_DIR = new THREE.Vector3(30, 55, 18).normalize();
const canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, logarithmicDepthBuffer: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
const SKY = 0xa9d8ff;
scene.background = new THREE.Color(SKY);
scene.fog = new THREE.Fog(SKY, 160, 680);

const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 1200);
camera.position.set(4, 2.5, 6);

const hemi = new THREE.HemisphereLight(0xe4f3ff, 0x5b7a3c, 1.0); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff0d8, 2.3);
sun.castShadow = true;
sun.shadow.mapSize.set(GFX_HIGH ? 4096 : 2048, GFX_HIGH ? 4096 : 2048);
Object.assign(sun.shadow.camera, GFX_HIGH ? { left: -60, right: 60, top: 60, bottom: -60, near: 1, far: 260 } : { left: -32, right: 32, top: 32, bottom: -32, near: 1, far: 160 });
sun.shadow.bias = -0.0004;
sun.shadow.normalBias = 0.02;
scene.add(sun, sun.target);

let renderFrame = () => renderer.render(scene, camera);   // world/hd.js thay bằng bản có hậu kỳ
const controls = new OrbitControls(camera, canvas);
controls.enabled = false;
controls.enableDamping = true;
controls.minDistance = 1.6;
controls.maxDistance = 14;
controls.maxPolarAngle = Math.PI * 0.49;

const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.6, metalness: 0, ...o });
const shadowAll = (obj) => obj.traverse(m => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
