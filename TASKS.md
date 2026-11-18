# Upgrade tasks

- [x] Check out the existing repository and create a feature branch.
- [x] Inspect entry points, manifest, map schema, graphics, gameplay, saves, online systems and Vercel configuration.
- [x] Record architecture, graphics risks and the implementation plan.
- [x] Verify baseline smoke results. All four suites exited 0.
- [x] Upgrade District 7 materials and environment detail. First pass rendered in Chromium and passed all four smoke suites.
- [x] Improve the rider, scooter, controls and camera. Added focused walking and remount assertions.
- [x] Add the District 1 world and selector. Reproduced the map from its OSM extract.
- [x] Verify district-safe progression and missions, English Mode, and multiplayer room separation with mocks.
- [x] Validate session-only adaptive quality and static deployment inputs.
- [x] Run integrated regressions and prepare the pull request contents.
- [ ] Push the feature branch and open the pull request. Both the Git transport and connected GitHub API returned HTTP 403 for writes. This also blocks the branch-triggered Vercel preview.

## Remaining validation and follow-up

- [ ] Measure native desktop and mid-range phone performance on representative hardware.
- [ ] Verify live Firebase rooms and Google cloud saves with a configured test project.
- [ ] Extend streetscape variation with parked cars and expand geographic coverage of District 1.
- [ ] Publish on-foot poses to other players in a backward-compatible online update.
