# Abuja Life

A 3D open-world Nigerian life simulator set in Abuja, built with Three.js (r128). Runs in the browser with no build step.

## Run it

Serve the folder with any static server and open `index.html`:

```bash
npx serve .
# or
python -m http.server 8080
```

## What is in Phase 1

- **The Abuja map.** It has 16 districts (Kubwa, Gwarinpa, Jabi, Bwari, Garki, Wuse, Maitama, Nyanya, Lugbe, CBD, Asokoro, Karu, Gwagwalada, Giri, Kuje, Apo), now at human scale.
- **Landmarks.** Aso Rock, National Assembly, Eagle Square, National Mosque, National Christian Centre, National Stadium, the airport, Jabi Lake and Millennium Park.
- **A third-person character you control:**
  - Move with WASD or the arrow keys, or the on-screen joystick on phones.
  - Hold Shift to run.
  - Bumping into buildings stops you, and the character follows the ground height.
  - The camera follows you, and there is a zoomed-out map view.
- **A jointed 3D human with procedural animations:** idle, walk, run, sit, talk, interact, work, eat and wave.
- **Character creator:**
  - Male or female, slim, regular or broad body.
  - 6 skin tones and 8 hairstyles.
  - 7 outfits: T-shirt, streetwear, agbada, kaftan, Ankara, suit, uniform.
- **Interaction system.** Walk up to kiosks (jobs, food, estate agent, business office, bank, ATM, taxi rank, your home, motor park, benches), NPCs and landmarks, then press E.
- **Pedestrians.** They have names, jobs, homes and daily routines. You can talk to them and build friendships.
- **Real-time clock.** One real second is one game minute. There is a day/night cycle, opening hours and passive energy drain.
- **Economy.** Same as before: jobs, food, property, businesses, bank interest, 10% income tax, furniture and comfort, taxis.
- **HUD and phone.**
  - The phone has these apps: Map & Taxi, Wallet, Rich List, Contacts, Activity, Goals and Settings.
  - Placeholder apps for later phases: Bank app, Jobs, Social, Food, Invest and Messages.
- **Saving.** Progress saves in the browser (`localStorage`). An optional online edition saves to the player's account.

## Project structure

```
index.html            page shell and HUD markup
css/game.css          game UI styles
js/core.js            shared helpers + event bus (AL namespace)
js/data.js            all game content: districts, jobs, food, homes, businesses, looks, venues, landmarks, NPC names
js/state.js           player state, save/load, derived values (net worth, prices, clock)
js/world/kit.js       low-poly building kit (shared geometries/materials)
js/world/city.js      city builder, venues, landmarks, traffic, collisions, ground height
js/entities/character.js  modular 3D human + procedural animator
js/entities/player.js     player controller, camera, taxi trips
js/entities/npc.js        pedestrians with routines, other online players
js/systems/time.js        real-time clock, day/night events
js/systems/interaction.js reusable interaction prompts
js/systems/economy.js     jobs, food, property, business, bank, sleep, taxi
js/ui/*.js                HUD, venue panels + dialogue, phone, creator, home interior
js/online.js              optional cloud save + shared leaderboard
js/main.js                boot + main loop
```

To add a new job, food, home, business or venue type, add it to `js/data.js`. The systems read the tables, so most additions need no other code changes.

## Roadmap

- **Phase 2:** full banking, inventory, shops and supermarkets, drivable cars, more careers.
- **Phase 3:** loans and microfinance, property rental, investments and a stock exchange, clubs, religious and cultural events, NPC relationships.
- **Phase 4:** multiplayer, a deeper economy, more of the city.
