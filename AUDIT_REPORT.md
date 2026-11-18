# GrabBike 3D architecture audit

Baseline is main at `b2285fc`. The site is a static HTML, CSS, JavaScript application with no package manifest, bundler, or compile step. The HTML import map pins Three.js and addons to r160. `src/main.js` loads JSON, then classic scripts in manifest order. The scripts share global bindings, and the final boot script runs hooks and starts the animation frame loop. Vercel config supplies cache headers for source and GLBs.

## Existing systems

| Area | Implementation |
| --- | --- |
| World | District 7 JSON supplies geometry, roads, POIs, signals and directed graph data. The world creates spatial indices, meshes, labels and routing data once at startup. |
| Navigation | Graph-based traffic and route scoring share edge geometry. Street names, HUD navigation, signals, and minimap depend on the loaded map. |
| Vehicle and rider | Local scooter supports SH/Vespa GLB loading, procedural fallback, physics, garage and outfitted procedural seated rider. Input covers keyboard and touch. |
| Jobs and economy | Passenger and food offers, multi-stop batches, dispatch, arrival dialogues, fares, expenses, XP, upgrades, daily reports, story, side quests, and traffic enforcement. |
| English | Shared English toggle, lessons and scored mission conversations. |
| Online | Firebase rooms and leaderboards, PeerJS fallback, remote player and outfit replication, and optional Google cloud saves. |
| Save data | Shared local profile, three slots, import/export, and daily backups. Active side quests can contain world coordinates. Live orders and routes are session state. |

District 7 has 1,550 road records and 2,193 graph edges. Its real-world geometry is supplemented by procedural fill. Adding a district requires supplying the same map contract and handling district-specific state without replacing the shared profile.

## Verification and risks

The four Node smoke suites execute manifest scripts with stubbed Three.js and DOM objects. They exercise gameplay flows and print diagnostics. Their exit status detects thrown errors, while several gameplay outcomes still require reading the logs. They cannot establish WebGL correctness, appearance, mobile interaction, or live Firebase behavior.

The original third-person camera has fixed presets and interpolation. Walking, mounting, follow orbit and camera obstruction handling are absent at baseline. District 7 story location checks and saved side-quest coordinates require explicit handling before another map can load. Online rooms must keep players in the same coordinate system. Keep the existing Firebase settings, storage keys, map data, and Vercel configuration.

Existing multiplayer and save interfaces render some externally supplied strings through HTML templates. That behavior predates this upgrade and should be reviewed independently of the district integration.
