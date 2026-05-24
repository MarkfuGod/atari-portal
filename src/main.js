import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from './config.js';
import { BootScene } from './ui/BootScene.js';
import { VideoIntroScene } from './ui/VideoIntroScene.js';
import { MenuScene } from './ui/MenuScene.js';
import { HUDScene } from './ui/HUDScene.js';
import { PauseScene } from './ui/PauseScene.js';
import { GameOverScene } from './ui/GameOverScene.js';
import { TransitionScene } from './ui/TransitionScene.js';
import { VictoryScene } from './ui/VictoryScene.js';
import { CRTOverlay } from './vfx/CRTOverlay.js';
import { ModSelectScene } from './ui/ModSelectScene.js';
import { CheatMenuScene } from './ui/CheatMenuScene.js';
import { PacmanScene } from './games/pacman/PacmanScene.js';
import { BreakoutScene } from './games/breakout/BreakoutScene.js';
import { SpaceInvadersScene } from './games/space-invaders/SpaceInvadersScene.js';
import { FroggerScene } from './games/frogger/FroggerScene.js';
import { AsteroidsScene } from './games/asteroids/AsteroidsScene.js';
import { TetrisScene } from './games/tetris/TetrisScene.js';
import AudioBackground from './vfx/AudioBackground.js';
import StageGutterFx from './vfx/StageGutterFx.js';
import { SnakeGame } from './games/snake/SnakeGame.js';
import { PinballScene } from './games/pinball/PinballScene.js';
import { FallDownScene } from './games/falldown/FallDownScene.js';

const config = {
  type: Phaser.AUTO,
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  parent: 'game-root',
  backgroundColor: '#0a0a1a',
  pixelArt: true,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 0 },
      debug: false
    }
  },
  scene: [
    BootScene,
    VideoIntroScene,
    MenuScene,
    HUDScene,
    PauseScene,
    GameOverScene,
    TransitionScene,
    VictoryScene,
    CRTOverlay,
    ModSelectScene,
    CheatMenuScene,
    PacmanScene,
    BreakoutScene,
    SpaceInvadersScene,
    FroggerScene,
    AsteroidsScene,
    TetrisScene,
    SnakeGame,
    PinballScene,
    FallDownScene,
  ]
};

function bootGame() {
  new Phaser.Game(config);
  AudioBackground.init();
  StageGutterFx.init();
}

// Ensure modernist typography (Albatross / HS LunaObscura / Monowire) is parsed
// and ready before Phaser starts measuring/rasterizing text into the canvas.
// Without this gate, the first paint of MenuScene/HUDScene falls back to
// generic sans/monospace and the poster layout shifts when the @font-face
// files arrive a few hundred ms later.
if (typeof document !== 'undefined' && document.fonts && document.fonts.ready) {
  const loaders = [
    document.fonts.load('1em "Albatross"'),
    document.fonts.load('1em "HS LunaObscura"'),
    document.fonts.load('1em "Monowire"'),
  ];
  Promise.all(loaders)
    .catch(() => { /* fall through; @font-face fallbacks will still render */ })
    .then(() => document.fonts.ready)
    .catch(() => null)
    .finally(bootGame);
} else {
  bootGame();
}
