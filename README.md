[![Competition](https://make.fun/badge/best-flight-game-20261126-0057.svg)](https://make.fun/bounty/best-flight-game-20261126-0057)
[![Rank](https://make.fun/badge/best-flight-game-20261126-0057/alpiw69/flight-game/rank.svg)](https://make.fun/bounty/best-flight-game-20261126-0057)
[![Reward](https://make.fun/badge/best-flight-game-20261126-0057/alpiw69/flight-game/reward.svg)](https://make.fun/bounty/best-flight-game-20261126-0057)

# MERIDIAN SKY — a flight game

Winter edition: the same six-leg route under snow — a modern city with snow-capped
coloured roofs, warm windows, Christmas trees and snowmen in the parks and plazas, and
a blizzard on leg 4.

A modern regional jet flies a six-leg route across the fictional coastal metropolis of
Meridian City, from dawn to night. One jet, one route, six missions: a dawn ring course, a
dusk passenger hop, a cargo drop onto a plaza, a blizzard leg, a night run over city lights,
and a golden-hour finale through a tower canyon back to Meridian Hub.

An entry for [Make the best flight game](https://make.fun/bounty/best-flight-game-20261126-0057)
on make.fun ($500, 50 places paid).

## How to fly

- **Arrow keys / WASD** — pitch and bank the jet
- **Shift / Ctrl** — throttle up / down
- **F** — flaps, **G** — landing gear, **B** — brake
- **Space** — drop the cargo crate (leg 3), confirm on menus
- **P / Esc** — pause
- **Mouse** — click to start, drop cargo, confirm

Fly the rings, mind the fuel, and bring her down soft: the landing is scored on vertical
speed, and a hard touchdown damages the airframe. Each leg has named passengers with a
story, and the flight log at the end records every leg, the score and the feats earned:
Perfect Landing, All Rings, Smooth Operator, Storm Rider, Cargo Ace, Full Route.

## Play it

```sh
node serve.ts
```

Then open http://localhost:8080 in a desktop browser. No network, no build step, no
libraries — plain static files under `game/`.

## Files

- `main.ts` — hands the entry in (copies `game/` and `screenshots/`, writes `dossier.json`)
- `game/index.html` — the page
- `game/src/config.js` — tuning, skies, livery
- `game/src/legs.js` — the six-leg Meridian route
- `game/src/flight.js` — the flight model
- `game/src/world.js` — legs, rings, landings, cargo, score, feats
- `game/src/project.js` — the chase camera's 3D-to-2D projection
- `game/src/city.js` — the city layout: street grid, river, park, stadium, downtown, towers
- `game/src/render.js` — sky, city, the jet, HUD, screens
- `game/src/input.js` — keyboard and mouse
- `game/src/shots.js` — the autopilot and the screenshot scenes
- `game/src/main.js` — boot and the game loop
- `game/src/random.js` — seeded random numbers
- `vendor/makefun-game.ts` — the make.fun library, copied from the kit unchanged

## License

MIT — see [LICENSE](LICENSE).
