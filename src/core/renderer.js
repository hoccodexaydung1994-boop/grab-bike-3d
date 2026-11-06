'use strict';
// hooks run once after every src file is loaded (see boot.js)
const BOOT = [];
/* ================= Renderer / scene ================= */
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
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -32, right: 32, top: 32, bottom: -32, near: 1, far: 160 });
sun.shadow.bias = -0.0004;
sun.shadow.normalBias = 0.02;
scene.add(sun, sun.target);

const controls = new OrbitControls(camera, canvas);
controls.enabled = false;
controls.enableDamping = true;
controls.minDistance = 1.6;
controls.maxDistance = 14;
controls.maxPolarAngle = Math.PI * 0.49;

const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.6, metalness: 0, ...o });
const shadowAll = (obj) => obj.traverse(m => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
