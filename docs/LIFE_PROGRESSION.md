# Life progression

Closes four gaps from [LAGOS_LIFE_COMPARISON_2026-10-10.md](LAGOS_LIFE_COMPARISON_2026-10-10.md): skills, a career ladder, feelings with named causes and story missions. Rules live in `src/shared/progression.mjs` and follow the Today's Hustle pattern. Both stores and the browser preview call `recordProgression` inside the same atomic economy operation that already runs `recordHustleProgress`, so progress only comes from real, server-validated actions.

| System | What the player sees | Server rule |
| --- | --- | --- |
| Skills | Nine skills (Cooking, Fitness, Charisma, plus the six job skills), levels 1–10 | XP from shifts (correct answers), cooking at home, gym/training, meet-ups and nights out, galleries/workshops, Banex, CBN careers, WTC/ICC networking |
| Career ladder | Five titled ranks per job (e.g. Bank teller → Branch manager) | Promotion needs shifts in that job, a job-skill level and an Abuja Rep level; pay ×1.00 / 1.15 / 1.30 / 1.50 / 1.80; +50 Rep; rank kept per job |
| Feelings | Mood chip in the world and a Feelings tab: "Starving −30", "Fine house +12", "Smashed my shift +15"… | From needs, home tier and time-limited events (max 12 kept). Mood scales shift pay from −10% (Miserable) to +10% (Elated) |
| Abuja Stories | Five multi-step stories tied to places (City Gate, Aso Rock, Eagle Square, Millennium Park, clubs) | Steps advance in order; finished stories pay naira + Rep once through the ledger (`story-claim`, idempotency key required) |

Actions: `career-promote` (no key needed, no money) and `story-claim` (money, key required). Mongo persists the state in `progression.lifeProgress`.

Client: `app/progression.js` / `app/progression.css` add a **My progress** entry to My life, a mood chip in the world, and toasts for level-ups, promotions and finished stories. The preview now also loads Today's Hustle, which previously had no preview adapter.

Tests: `tests/progression.test.mjs` (pure rules plus a real SQLite career run: four shifts, promotion, idempotent story reward, 1.15× pay). The Mongo path is wired but its integration suite needs `TEST_MONGODB_URI`.
