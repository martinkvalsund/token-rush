# Progress

- [x] Phase 0 — Scaffold
- [x] Phase 1 — Core engine
- [x] Phase 2 — Player controller
- [x] Phase 3 — World generation
- [x] Phase 4 — Obstacles, collisions, lives, chaser
- [x] Phase 5 — Tokens, scoring, HUD, persistence
- [x] Phase 6 — Power-ups
- [x] Phase 7 — Blender art pass and zones (all five zones incl. bridge)
- [x] Phase 8 — Advanced mechanics
- [x] Phase 9 — Audio
- [x] Phase 10 — UI, juice, post-processing, settings
- [x] Phase 11 — Bot, balancing, performance
- [x] Phase 12 — Polish and release (signage and easter eggs, bug-bash flows, README media)
- [x] Phase 13 — Blender assets (done as part of Phase 7 at the owner's request)

## Known issues

- **Soak residual (Phase 11):** the perfect autoplay bot survives 23 of 24 four-minute seeded runs (`npm run soak`). After the faster difficulty ramp, the one death is seed 104 at about 6.3 km (top tier). It comes from tight speed-dependent timing edge cases between pattern joins. The CI bot test (6 seeds × 3 min) has zero deaths.
