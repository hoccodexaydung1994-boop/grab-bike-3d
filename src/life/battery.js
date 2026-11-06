'use strict';
/* ================= Phone battery ================= */
if (profile.st.phone === undefined) profile.st.phone = 100;
if (profile.inv.powerbank === undefined) profile.inv.powerbank = 0;
const phoneDead = () => profile.st.phone <= 0;
function chargePhone(amount, min, cost, cat) {
  if (cost && !spend(cost, cat || 'other')) return;
  if (min) passTime(min);
  profile.st.phone = clamp01(profile.st.phone + amount);
  toast(`🔋 ${L('Pin điện thoại', 'Phone battery')}: ${Math.round(profile.st.phone)}%`, 1.6);
}
