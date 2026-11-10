'use strict';
/* ================= Đồ hoạ cao (GFX_HIGH): bầu trời, mặt trời theo giờ, phản chiếu môi trường, bloom, đường ướt ================= */
const HD = { on: GFX_HIGH, post: GFX_HIGH, composer: null, bloom: null, envKey: -1, envRT: null, pr: 0 };
if (HD.on) {
  /* ---- bầu trời: dải màu theo giờ + mặt trời + mây + sao ---- */
  const skyU = { top: { value: new THREE.Color(0.16, 0.4, 0.85) }, hor: { value: new THREE.Color(0.62, 0.78, 0.95) }, gnd: { value: new THREE.Color(0.25, 0.27, 0.25) },
    sunDir: { value: new THREE.Vector3(0, 1, 0) }, sunCol: { value: new THREE.Color(1, 0.95, 0.85) }, night: { value: 0 }, cloud: { value: 0.45 }, time: { value: 0 } };
  const skyMat = new THREE.ShaderMaterial({ uniforms: skyU, side: THREE.BackSide, depthWrite: false, depthTest: false, fog: false,
    vertexShader: `varying vec3 vDir; void main(){ vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `uniform vec3 top, hor, gnd, sunDir, sunCol; uniform float night, cloud, time; varying vec3 vDir;
      float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float noise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y); }
      float fbm(vec2 p){ float a = 0.5, s = 0.0; for (int i = 0; i < 5; i++){ s += a * noise(p); p = p * 2.03 + 7.1; a *= 0.5; } return s; }
      void main(){
        vec3 d = normalize(vDir);
        vec3 col = mix(hor, top, pow(max(d.y, 0.0), 0.5));
        float sd = max(dot(d, sunDir), 0.0);
        col += sunCol * (pow(sd, 350.0) * 6.0 + pow(sd, 24.0) * 0.35 + pow(sd, 4.0) * 0.12) * (1.0 - night);
        if (d.y > 0.0) {
          vec2 uv = d.xz / (d.y + 0.12) * 1.3 + vec2(time * 0.01, 0.0);
          float c = smoothstep(1.0 - cloud, 1.0 - cloud + 0.35, fbm(uv)) * smoothstep(0.0, 0.18, d.y);
          vec3 cc = mix(hor * 1.05 + sunCol * 0.25 * (1.0 - night), vec3(1.0), 0.55) * (1.0 - night * 0.82);
          col = mix(col, cc, c * 0.85);
          vec2 sp = d.xz / (d.y + 0.05) * 90.0; float st = step(0.9975, hash(floor(sp))) * night * (1.0 - c) * smoothstep(0.05, 0.3, d.y);
          col += vec3(st) * 1.6;
        } else col = mix(hor, gnd, smoothstep(0.0, -0.25, d.y));
        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }` });
  const skyGeo = new THREE.SphereGeometry(1000, 32, 16);
  const sky = new THREE.Mesh(skyGeo, skyMat); sky.frustumCulled = false; sky.renderOrder = -10; scene.add(sky);
  const envScene = new THREE.Scene(); envScene.add(new THREE.Mesh(skyGeo, skyMat));
  const pmrem = new THREE.PMREMGenerator(renderer);
  const C = (r, g, b) => new THREE.Color(r, g, b);
  const KEY = { // [giờ, đỉnh trời, chân trời, màu nắng]
    day: [C(0.14, 0.36, 0.82), C(0.6, 0.76, 0.94), C(1, 0.96, 0.88)], gold: [C(0.2, 0.3, 0.62), C(1.0, 0.62, 0.34), C(1, 0.62, 0.32)],
    dusk: [C(0.07, 0.09, 0.26), C(0.5, 0.3, 0.36), C(0.9, 0.5, 0.4)], night: [C(0.006, 0.012, 0.045), C(0.03, 0.05, 0.11), C(0.55, 0.65, 1)] };
  const mix3 = (a, b, k) => a.map((c, i) => c.clone().lerp(b[i], k));
  const sunWhite = new THREE.Color(0xfff0d8), moon = new THREE.Vector3(-0.45, 0.75, 0.35).normalize();
  function hdSky(min) {
    const h = min / 60, t = Math.max(0, Math.min(1, (h - 5.5) / 13)), el = Math.sin(Math.PI * t) * 1.13 - 0.06, az = Math.PI * t;
    const real = new THREE.Vector3(Math.cos(az) * Math.cos(el), Math.sin(el), 0.38 * Math.cos(el)).normalize();
    let pal, nk = 0;
    if (h < 5.5 || h >= 19.4) { pal = KEY.night; nk = 1; }
    else if (h < 7) pal = mix3(KEY.gold, KEY.day, (h - 5.5) / 1.5);
    else if (h < 16.3) pal = KEY.day;
    else if (h < 17.9) pal = mix3(KEY.day, KEY.gold, (h - 16.3) / 1.6);
    else if (h < 18.7) pal = mix3(KEY.gold, KEY.dusk, (h - 17.9) / 0.8);
    else { const k = (h - 18.7) / 0.7; pal = mix3(KEY.dusk, KEY.night, k); nk = k; }
    const gloom = 1 - 0.45 * rain;
    skyU.top.value.copy(pal[0]).multiplyScalar(gloom).lerp(C(0.3, 0.33, 0.37).multiplyScalar(1 - nk * 0.9), rain * 0.7);
    skyU.hor.value.copy(pal[1]).multiplyScalar(gloom).lerp(C(0.5, 0.53, 0.56).multiplyScalar(1 - nk * 0.9), rain * 0.7);
    skyU.sunCol.value.copy(pal[2]); skyU.night.value = nk; skyU.cloud.value = 0.42 + rain * 0.5; skyU.sunDir.value.copy(real);
    // hướng nắng cho bóng đổ: không thấp hơn ~14°, đêm dùng ánh trăng
    const L = nk > 0.5 ? moon : real.clone().setY(Math.max(real.y, 0.25)).normalize();
    SUN_DIR.copy(L); sun.color.copy(nk > 0.5 ? C(0.6, 0.7, 1) : sunWhite.clone().lerp(pal[2], 0.6));
    scene.fog.color.copy(skyU.hor.value); scene.background.copy(skyU.hor.value);
    hemi.intensity *= 0.55 + 0.3 * nk;                          // phần còn lại của ánh sáng môi trường đến từ bầu trời phản chiếu
    const key = Math.round(min / 20) * 10 + Math.round(rain * 4);
    if (key !== HD.envKey) { HD.envKey = key; const rt = pmrem.fromScene(envScene, 0, 1, 1100); if (HD.envRT) HD.envRT.dispose(); HD.envRT = rt; scene.environment = rt.texture; }
  }
  { const _ad = applyDaylight; applyDaylight = function (m) { _ad(m); hdSky(m); }; }
  BOOT.push(() => applyDaylight(profile.clock));
  FRAME.push((dt) => {
    skyU.time.value += dt; sky.position.copy(camera.position);
    // đường ướt khi mưa: bóng hơn, phản chiếu trời và đèn
    MAT_ASPHALT.roughness = 0.92 - 0.62 * rain; MAT_SIDE.roughness = 0.95 - 0.4 * rain; MAT_ASPHALT.color.setHex(0x44474d).multiplyScalar(1 - 0.35 * rain);
  });

  /* ---- hậu kỳ: bloom cho đèn đường, đèn xe, biển hiệu + khử răng cưa ---- */
  try {
    const mkRT = () => new THREE.WebGLRenderTarget(innerWidth, innerHeight, { type: THREE.HalfFloatType, samples: 4 });
    HD.composer = new EffectComposer(renderer, mkRT());
    HD.composer.addPass(new RenderPass(scene, camera));
    HD.bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.45, 0.7, 1.1);
    HD.composer.addPass(HD.bloom); HD.composer.addPass(new OutputPass());
    renderFrame = () => {
      if (!HD.post) return renderer.render(scene, camera);
      const pr = renderer.getPixelRatio(); if (pr !== HD.pr) { HD.pr = pr; HD.composer.setPixelRatio(pr); HD.composer.setSize(innerWidth, innerHeight); }
      HD.bloom.strength = 0.3 + 0.55 * nightK;
      HD.composer.render();
    };
    addEventListener('resize', () => HD.composer.setSize(innerWidth, innerHeight));
  } catch (e) { console.warn('post-processing off', e); HD.post = false; }
  // máy giật → tắt hậu kỳ trước khi giảm các thứ khác
  { const _ps = perfStepDown; perfStepDown = function () { if (HD.post) { HD.post = false; toast(L('⚙️ Máy hơi giật → tắt hiệu ứng ánh sáng (bloom)', '⚙️ Bloom off for performance'), 2.2); return; } _ps(); }; }
}
/* ---- nút chọn mức đồ hoạ trong Cài đặt ---- */
{
  const _rp = renderPanel;
  renderPanel = function () {
    _rp(); if (panelTab !== 'settings') return;
    $('mpBody').insertAdjacentHTML('beforeend', `<h4>✨ ${L('Mức đồ hoạ', 'Graphics quality')}</h4><p><button class="chip${GFX_HIGH ? ' sel' : ''}" data-gfx="high">${L('Cao — bầu trời, phản chiếu, nhà & cây chi tiết (máy tính có card rời)', 'High — sky, reflections, detailed city')}</button> <button class="chip${GFX_HIGH ? '' : ' sel'}" data-gfx="low">${L('Thấp — nhẹ, cho điện thoại / máy yếu', 'Low — light, for phones')}</button><br><small>${L('Đổi mức sẽ tải lại game (hồ sơ vẫn giữ).', 'Changing reloads the game (progress is kept).')}</small></p>`);
  };
  $('mpBody').addEventListener('click', (e) => { const b = e.target.closest('[data-gfx]'); if (!b || (b.dataset.gfx === 'high') === GFX_HIGH) return; saveProfile(); try { localStorage.setItem('grabbike.gfx', b.dataset.gfx); } catch (er) { } location.reload(); });
}
