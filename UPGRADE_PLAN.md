# Upgrade plan

1. Audit the shipped architecture and run all four baseline smoke suites with the repository path.
2. Improve world materials and streetscape detail through the existing procedural geometry and quality presets. Verify the High and Low render paths.
3. Add a walkable rider and refine the scooter, inputs and follow camera within the existing physics and garage hooks. Confirm existing driving and job behavior.
4. Add a separately selectable District 1 with a connected map graph. Document the extent of geographic approximation and keep District 7 as the default.
5. Verify district isolation for side quests and multiplayer while sharing the current profile, progression and settings. Check passenger, food, English and navigation flows.
6. Check rendering costs and adaptive quality on a real graphical browser where available. Record the test environment with any measurements.
7. Run smoke suites, static serving checks and browser gameplay regressions. Record unresolved issues and update the changelog.
8. Publish the feature branch and open a reviewable pull request if authenticated repository access permits. Review a Vercel preview if available. Production deployment requires approval.
