# Abuja Life

A 3D open-world Nigerian life simulator set in Abuja, built with Three.js (r128). Runs in the browser with no build step.

## Run it

Serve the folder with any static server and open `index.html`:

```bash
npx serve .
# or
python -m http.server 8080
```

## Design principle: simulate the city, don't render the city

Abuja is kept as data and only the area around the player is drawn.

- **Locations.** About 90 meaningful places, each with a category, opening hours and services, in `js/sim/sim.js`.
- **Businesses.** Staff, customers and revenue are simulated every game hour. Nobody inside them is rendered.
- **Residents.** 240 people with homes, jobs and daily schedules. A pool of about 20 reusable 3D actors is handed to whoever is near the player right now.
- **Traffic.** Each district has a congestion level and an average speed. A small pool of cars is spawned only on roads near the player.
- **Level of detail.** Full districts are built near the player; far away they become cheap stand-ins.

## Gameplay systems

- **Travel.** Walk, bus, taxi or ride-hailing. Each trip has a distance, an ETA from simulated traffic, a cost and an arrival time. You can watch the ride or skip it with a travel transition, and the clock always advances.
- **Phone.**
  - Maps: pan, zoom, search, categories, directions, ride requests.
  - Rides, Bank (balance, history, transfers, loans, bills) and Invest (fictional exchange with dividends).
  - ShopNaija (next-day delivery), Jobs (careers and day jobs), Messages, Home (housing) and Me (profile).
  - Rich List, Contacts, Activity, Goals and Settings.
- **Housing.**
  - You start in a rented Kubwa self-con with the first week paid. Rent is taken weekly from your bank account, and three days behind means eviction.
  - Rent or buy at estate agents.
  - Five reusable interior templates (Apartment A, B and C; House A and B).
  - Your home is your base: sleep, wardrobe, kitchen, furniture and paint.
- **Careers.** 8 salaried jobs with schedules. Go to the workplace during your shift; pay goes into your bank account, and every 10 shifts earns a promotion. The day jobs from Phase 1 are still there for cash.
- **Player profile.** Age, cash, bank balance, credit score, health, energy, happiness, home, job, inventory, wardrobe, possessions, investments and relationships.
- **From Phase 1.** Third-person 3D character, landmarks, NPC dialogue, day/night clock, businesses and property.

## Project structure

```
index.html            page shell and HUD markup
css/game.css          game UI styles
js/core.js            shared helpers + event bus (AL namespace)
js/data.js            core content: districts, jobs, food, homes, businesses, looks, venues, landmarks, NPC names
js/data-life.js       life-sim content: interior templates, rentals, careers, shop catalogue, stocks, place names
js/sim/sim.js         city simulation: locations, businesses, traffic, population, stock market
js/state.js           player state, save/load, derived values (net worth, prices, clock)
js/world/kit.js       low-poly building kit (shared geometries/materials)
js/world/city.js      city builder, venues, landmarks, traffic, collisions, ground height
js/entities/character.js  modular 3D human + procedural animator
js/entities/player.js     player controller, camera, taxi trips
js/entities/npc.js        pedestrians with routines, other online players
js/systems/time.js        real-time clock, day/night events
js/systems/interaction.js reusable interaction prompts
js/systems/economy.js     day jobs, food, property, business, bank, sleep
js/systems/life.js        rent, careers, bank transfers + loans, shopping, inventory, investments, messages, daily ticks
js/systems/travel.js      travel quotes, journeys, navigation
js/ui/*.js                HUD, venue panels + dialogue, phone + apps, maps, journey card, creator, home interior
js/online.js              optional cloud save + shared leaderboard
js/main.js                boot + main loop
```

To add a new job, food, home, business or venue type, add it to `js/data.js`. The systems read the tables, so most additions need no other code changes.

## Roadmap

- **Phase 2:** full banking, inventory, shops and supermarkets, drivable cars, more careers.
- **Phase 3:** loans and microfinance, property rental, investments and a stock exchange, clubs, religious and cultural events, NPC relationships.
- **Phase 4:** multiplayer, a deeper economy, more of the city.
