import { GameManager } from './GameManager.js';
import { COIN_CONFIG } from '../config.js';

const SCORE_VALUES = {
  pacman: { dot: 10, powerPellet: 50, ghost: 200, fruit: 100 },
  breakout: { brick: 10, silverBrick: 20, goldBrick: 50 },
  spaceInvaders: { invader: 10, fast: 20, mothership: 100 },
  frogger: { hop: 10, lane: 50, home: 200 },
  asteroids: { large: 20, medium: 50, small: 100, ufo: 200 },
  tetris: { single: 100, double: 300, triple: 500, tetris: 800 },
};

const HIGH_VALUE_THRESHOLD = 50;

export class ScoreManager {
  constructor(scene, gameKey) {
    this.scene = scene;
    this.gameKey = gameKey;
    this.localScore = 0;
    this.values = SCORE_VALUES[gameKey] || {};
  }

  award(type, multiplier = 1, worldX, worldY) {
    const base = this.values[type] || 0;
    const points = base * multiplier;
    this.localScore += points;
    const finalPoints = GameManager.addScore(points);

    if (base >= HIGH_VALUE_THRESHOLD) {
      GameManager.addCoins(1);
      this.scene.events.emit('coins-changed', GameManager.state.coins);
    }

    if (GameManager.state.streakCount >= COIN_CONFIG.STREAK_BONUS) {
      GameManager.addCoins(1);
      this.scene.events.emit('coins-changed', GameManager.state.coins);
    }

    this.scene.events.emit('score-changed', GameManager.state.totalScore);
    this.scene.events.emit('speed-boost-changed', GameManager.state.speedBoostActive);

    const combo = GameManager.comboMultiplier;
    if (combo > 1) {
      this.scene.events.emit('combo-hit', combo, worldX, worldY);
    }
    if (finalPoints > 0) {
      this.scene.events.emit('score-popup', finalPoints, worldX, worldY);
    }

    return finalPoints;
  }

  getLocal() {
    return this.localScore;
  }
}
