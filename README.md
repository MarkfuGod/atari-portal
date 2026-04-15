# Atari Portal

> The Arcade is Glitching... Dimensional rifts are tearing through classic games. Jump between worlds, chase high scores, and seal the breach.

**[Play Now](https://markfugod.github.io/atari-portal/)**

## About

Atari Portal is a retro arcade collection where 6 classic games are connected through a portal system. Earn points, trigger portals, and warp between games — all rendered procedurally with zero external assets.

Built with **Phaser 3** and **Vite**. Every texture is generated via Canvas at boot. Every sound effect is synthesized at runtime using the Web Audio API. The entire game ships as a single JS bundle with no images or audio files.

## Games

| Game | Portal Trigger | Controls |
|------|---------------|----------|
| **PAC-MAN** | Eat 60% of dots to spawn a portal pellet | Arrow keys / WASD |
| **BREAKOUT** | Destroy 40% of bricks to spawn a portal brick | Arrow keys / WASD + Mouse, Space to launch |
| **SPACE INVADERS** | Kill 70% of invaders to summon a portal mothership | Arrow keys / WASD, Space to fire |
| **FROGGER** | Fill 3 lily pads to unlock a portal pad | Arrow keys / WASD |
| **ASTEROIDS** | Destroy 15 asteroids to spawn a portal asteroid | Arrow keys / WASD, Space to fire |
| **TETRIS** | Clear 15 lines (or 8 lines + a Tetris) to open a rift | Arrow keys / WASD, Space for hard drop |
| **CYBER-PINBALL** | Defeat the moving Boss (5 hits) or reach score limit | A/D to flip (4 flippers), Space to plunge |
| **CYBER-SHAFT** | Survive until the platform speed reaches its maximum | A/D to move |
| **CYBER-SNAKE** | Grow your snake to length 10 | Arrow keys / WASD |

## Modes

- **Story Mode** — Play through all 6 games in order. Difficulty scales as you progress. Complete all to seal the rift.
- **Arcade Mode** — Games are shuffled randomly. Difficulty increases gradually. How far can you go?
- **Level Select** — Jump into any game directly for practice.

## Mechanics

### Portal System
Each game has a unique portal trigger condition. Once met, a glowing portal appears. Walk / fly / bounce into it to warp to the next game. If you haven't triggered one within 45 seconds, a fallback portal spawns automatically.

### Coins & Shop
- Earn **5 coins** per portal traversal
- Earn bonus coins from high-value actions and scoring streaks
- Pause the game (ESC / P) to spend **15 coins** on an extra life

### Speed Boost
Score 3 times within 4 seconds to trigger a **Speed Boost** — game speed increases to 1.35x and score multiplier jumps to 2x for 8 seconds.

### Difficulty Scaling
Each portal traversal increases the global difficulty multiplier. Story mode scales at +0.15 per game; Arcade mode at +0.075. This affects enemy speed, drop intervals, and spawn rates.

## Controls

| Action | Key |
|--------|-----|
| Move | Arrow keys / WASD |
| Fire / Launch / Hard Drop | Space |
| Pause | ESC / P |
| Navigate menus | Mouse click |

## Tech Stack

- **Phaser 3.86** — Game framework
- **Vite 6** — Build tool & dev server
- **Web Audio API** — Procedural 8-bit SFX synthesis (no audio files)
- **Canvas API** — Procedural texture generation (no image files)
- **GitHub Actions** — Auto-deploy to GitHub Pages on push

## Development

```bash
# Install dependencies
npm install

# Start dev server (localhost:3000)
npm run dev

# Production build
npm run build

# Preview production build
npm run preview
```

## Project Structure

```
src/
├── main.js              # Phaser game config & scene registration
├── config.js            # Constants, colors, game order, tuning
├── core/
│   ├── GameManager.js   # Global state, progression, save/load
│   ├── ScoreManager.js  # Per-game scoring with coin & streak logic
│   ├── PortalSystem.js  # Portal spawn, animation, overlap detection
│   ├── AudioManager.js  # (legacy stub)
│   └── SFXManager.js    # Web Audio procedural sound synthesizer
├── ui/
│   ├── BootScene.js     # Texture generation & SFX init
│   ├── MenuScene.js     # Title screen & mode selection
│   ├── HUDScene.js      # Score, lives, coins, boost overlay
│   ├── PauseScene.js    # Pause menu with shop & return to menu
│   ├── TransitionScene.js  # Portal warp animation
│   ├── GameOverScene.js
│   └── VictoryScene.js
└── games/
    ├── BaseGameScene.js # Shared game logic (portal, death, boost)
    ├── pacman/          # Grid-based maze with ghosts
    ├── breakout/        # Physics-based brick breaker
    ├── space-invaders/  # Classic formation shooter
    ├── frogger/         # Lane-crossing with logs & cars
    ├── asteroids/       # Inertial ship with wrap-around
    └── tetris/          # Standard guideline with SRS wall kicks
    ├── pinball/         # Cyberpunk pinball with multiball & wormholes
    ├── falldown/        # High-speed descent with gravity inversion
    └── snake/           # Grid snake with screen-wrap and laser waves
```

## License

MIT
