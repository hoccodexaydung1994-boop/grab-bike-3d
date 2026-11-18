# Changelog

## 3.1.0 · In development

- Audited the static Three.js architecture, shared profile, map and routing contract, production hosting and baseline smoke tests.
- Improved District 7 with textured asphalt and paving, curbs and crossing marks, Vietnamese storefronts, facade relief, and instanced benches and parked scooters.
- Corrected detail winding, shadow camera setup and sky shader interpolation. Reduced the high-quality post-processing target's multisampling cost.
- Added a helmeted procedural walking character, walk and sprint cycles, animated mounting and dismounting, and a persistent parked scooter within the current session.
- Added mouse orbit, wheel and pinch zoom, and camera avoidance for building walls. Improved steering alignment and handbrake behavior.
- Deferred vehicle asset loading until game boot and added a usable procedural fallback with animated wheels.
- Added District 1 around Hẻm 15B Lê Thánh Tôn with a menu selector, traffic, pedestrians, storefronts, navigation and merchant jobs.
- Kept shared progression, earnings, English and saves while scoping active side quests, story locations and multiplayer rooms to the correct district.
- Changed adaptive quality to sample frame duration independently of physics timing and retain saved resolution and shadow preferences.
