'use strict';
/* ================= Markers ================= */
function emojiTex(emoji, bg) {
  return canvasTex(128, 128, (g, w, h) => {
    g.fillStyle = bg; g.beginPath(); g.arc(64, 60, 50, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.moveTo(44, 100); g.lineTo(64, 126); g.lineTo(84, 100); g.fill();
    g.font = '58px system-ui,"Apple Color Emoji","Segoe UI Emoji",sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(emoji, 64, 64);
  });
}
function makeMarker(color, emoji) {
  const g = new THREE.Group();
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(1.7, 1.7, 26, 32, 1, true),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.16, side: THREE.DoubleSide, depthWrite: false }));
  beam.position.y = 13; g.add(beam);
  const ring = new THREE.Mesh(new THREE.RingGeometry(1.45, 1.85, 48), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9, side: THREE.DoubleSide }));
  ring.rotation.x = -Math.PI / 2; ring.position.y = 0.06; g.add(ring);
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: emojiTex(emoji, '#' + new THREE.Color(color).getHexString()), depthWrite: false }));
  sp.scale.set(2.4, 2.4, 1); sp.position.y = 4.2; g.add(sp);
  g.userData = { ring, sp };
  g.visible = false;
  scene.add(g);
  return g;
}
const pickupMarker = makeMarker(0x00c25a, '🙋');
const dropMarker = makeMarker(0xff8a1f, '🏁');
