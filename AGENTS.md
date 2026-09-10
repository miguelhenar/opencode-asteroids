# AGENTS.md

## What this is

Vanilla JS Asteroids clone — single file (`game.js`, ~423 lines), HTML5 Canvas 800×600, no dependencies, no bundler.

## How to run

- Open `index.html` directly in a browser, or
- `npx serve .` → visit `http://localhost:3000`

No build step. No tests. No lint. No CI. Verify changes by opening the game in a browser.

## Code structure

All game logic is in `game.js`. `index.html` is just a shell with inline CSS.

Key sections in `game.js`:
- **Lines 5–6**: Canvas dimensions (`W=800`, `H=600`) — referenced everywhere
- **Lines 61–63**: Asteroid config arrays `RADII`, `SPEEDS`, `POINTS` (indexed by size 1–3)
- **Lines 122–204**: `Ship` class — movement, shooting, invincibility, drawing
- **Lines 65–119**: `Asteroid` class — irregular polygon vertices, `split()` into size-1
- **Lines 238–266**: Game state init, `spawnAsteroids()` with safe-distance spawn
- **Lines 293–351**: Main `update()` — collision detection, level progression
- **Lines 411–423**: Game loop (`requestAnimationFrame`, delta-time capped at 50ms)

## Conventions

- Spanish comments and UI strings throughout
- `'use strict'` at top of `game.js`
- ES6 classes, no modules, no imports — everything is global
- Game states: `'playing'` | `'dead'` | `'gameover'`
- All objects have a `.dead` flag; filtering dead entities is done after each update
- Entities wrap around screen edges via `wrap()` utility (toroidal space)
