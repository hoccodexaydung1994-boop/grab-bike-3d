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
