'use strict';
/* ================= Vespa (GLB, simplified from the user's OBJ) ================= */
// vespa.glb: front = +z, ground y = 0, wheelbase centred on z = 0.
// nodes: body, glass, wheelFront, wheelRear (wheel nodes pivot at their axle)
function buildBike() {
  const root = new THREE.Group();   // position + heading
  const lean = new THREE.Group();   // roll, pivot at ground
  root.add(lean);
  const bike = { root, lean, frontWheel: null, rearWheel: null, R: 0.23, ready: false };
  new GLTFLoader().load('models/vespa.glb?v=' + GAME_VERSION, (gltf) => {
    const m = gltf.scene;
    m.traverse(o => {
      if (o.isMesh) {
        o.castShadow = true; o.receiveShadow = true;
        if (o.material.map) o.material.map.anisotropy = 8;
      }
    });
    bike.model = m;
    bike.frontWheel = m.getObjectByName('wheelFront');
    bike.rearWheel = m.getObjectByName('wheelRear');
    lean.add(m);
    bike.ready = true;
    applyPaint();
    $('loading').classList.add('hidden');
  }, undefined, (err) => {
    console.error(err);
    $('loading').textContent = 'Không tải được mô hình xe (vespa.glb)';
  });
  return bike;
}
