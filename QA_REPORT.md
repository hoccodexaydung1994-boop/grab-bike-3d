# QA report

## Baseline

All four existing Node suites exited 0 with the checkout path passed as their argument. They mock Three.js and the DOM. The core suite logged the VM's missing dynamic-import callback during the Firebase path after sleeping and still reached day 2. Live Firebase and GPU rendering require separate checks.

| Suite | Baseline result | Areas exercised |
| --- | --- | --- |
| `smoke-core.mjs` | Exit 0 | Falls, traffic, batch jobs, law, daily rollover |
| `smoke-features.mjs` | Exit 0 | English lessons, side quests, food, home and backup |
| `smoke-net.mjs` | Exit 0 | Mocked remote players and save slots |
| `smoke-world.mjs` | Exit 0 | Street food, naps, batch orders, pedestrians and story |

## Verification environment

The application has a static Vercel configuration and uses a CDN import map. The browser QA environment can serve the same pinned Three.js r160 distribution locally if CDN access is restricted. Any frame timing measured with software rendering will be identified as such.

## District 7 graphics checkpoint

The four existing suites exited 0 on the isolated first graphics checkpoint. In a real Chromium WebGL render at the original Tôn Dật Tiên spawn, the new asphalt grain, tiled walks, curb edges and storefront signage were visible. The browser also exposed an intermittent GLB callback race inherited from baseline. The first graphics checkpoint preserved the original District 7 map JSON byte for byte.

## Integrated verification

- Static deployment preflight passed. All 50 manifest scripts resolve and parse, boot remains last, both GLBs have valid headers, and JSON inputs load. The checked-in District 1 map was reproduced from its saved OpenStreetMap extract. District 7 map data, Firebase rules, and Vercel configuration match the baseline.
- Adaptive-quality logic passed a focused synthetic timing check for bloom, resolution, shadows, and traffic changes. Reset restores graphics settings and the camera range, and automatic changes leave the profile preferences intact.
- Focused mission checks generated 100 District 1 offers across passenger, food and batch types and checked routes and the 15B pickup/drop-off area. Passenger and food runs reached settlement. Additional checks kept the original District 7 story and active side quest separate from District 1 and verified Firebase path and PeerJS ID selection with mocks.
- WebGL 2 rendering used headless Chromium 156 and SwiftShader with pinned Three.js r160 locally mirrored for testing. A Pixel 7 landscape emulation accepted touch throttle, dismount, on-foot movement, remount, one-finger camera orbit and two-finger pinch zoom. The parked scooter stayed in place and the session logged no page exceptions. Some input checks use real browser events with bounded simulation ticks for reproducibility.

The serial integrated run returned exit code 0 for all six commands:

```bash
node tests/smoke-core.mjs .
node tests/smoke-features.mjs .
node tests/smoke-net.mjs .
node tests/smoke-world.mjs .
node tests/smoke-net.mjs . --district=q1
node tests/smoke-net.mjs . --district=q7
```

The core suite continues to log the baseline VM dynamic-import limitation before completing. Early concurrent runs also exhausted workspace memory. The serial run completed successfully.

Chromium desktop rendered both districts and verified the district picker, persistence across District 7 → District 1 → District 7, scooter acceleration, dismount, sprint, remount, mouse orbit and wheel zoom. A camera query against a District 1 building shortened a 5 m path to about 2.14 m and kept the returned point outside the footprint. Browser route interception used the exact r160 modules and isolated live Firebase calls.

## Verification limits and delivery

- Hardware FPS and live Firebase or Google authentication were outside the measured coverage. Browser tests used software WebGL and mobile emulation. A foreground home sign can obscure the rider at some orbit angles.
- District 1 is a neighborhood-scale interpretation around Hẻm 15B. Its scenery uses original procedural meshes, with no new external character asset.
- The existing Vercel check is present on main. GitHub refused feature branch writes over HTTPS and through the connected API, so the pull request and its Vercel preview could not be published from this session.
