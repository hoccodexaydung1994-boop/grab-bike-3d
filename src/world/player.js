'use strict';
/* ================= Player ================= */
const foodBoxHolder = new THREE.Group();
const bike = buildBike();
scene.add(bike.root);
const driver = buildDriver();
bike.lean.add(driver);
const phoneMount = buildPhoneMount();
bike.lean.add(phoneMount);
bike.lean.add(foodBoxHolder);
const seatedPax = buildPassengerSeated();
seatedPax.visible = false;
bike.lean.add(seatedPax);
const standPax = buildPassengerStanding();
standPax.visible = false;
scene.add(standPax);

const player = { x: 0, z: 0, y: 0.07, h: 0, v: 0, steer: 0, lean: 0 };
function resetHome() {
  player.x = homeSpot.x; player.z = homeSpot.z; player.h = homeSpot.h; player.v = 0; player.steer = 0; player.y = 0.07;
}
resetHome();
