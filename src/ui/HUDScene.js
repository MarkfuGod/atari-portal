import Phaser from 'phaser';
import { GAME_WIDTH, COLORS, GAME_NAMES, SPEED_BOOST, HACK_CONFIG, GAME_LORE, GAME_ORDER } from '../config.js';
import { GameManager } from '../core/GameManager.js';
import NeonGlow from '../vfx/NeonGlow.js';

const HUD_H = 32;
const neonCyan = '#00f0ff';
const neonMagenta = '#ff00e6';
const neonGreen = '#39ff14';
const neonOrange = '#ff6e00';
const neonPurple = '#b845ff';
const neonPink = '#ff2d7b';

export class HUDScene extends Phaser.Scene {
  constructor() {
    super('HUDScene');
  }

  create() {
    this.scene.bringToTop();

    const g = this.add.graphics().setDepth(999);
    g.fillStyle(COLORS.HUD_BG, 0.92);
    g.fillRect(0, 0, GAME_WIDTH, HUD_H);
    NeonGlow.strokeRect(g, 0, 0, GAME_WIDTH, HUD_H, COLORS.HUD_BORDER, 1, 0.5);
    NeonGlow.cornerAccents(g, 0, 0, GAME_WIDTH, HUD_H, 10, COLORS.HUD_BORDER, 1);

    g.lineStyle(1, COLORS.HUD_BORDER, 0.15);
    g.strokeLineShape(new Phaser.Geom.Line(0, HUD_H, GAME_WIDTH, HUD_H));

    this.scoreText = this.add.text(12, 8, 'SCR:0000000', {
      fontSize: '13px', fontFamily: 'monospace', color: neonCyan,
    }).setDepth(1000);
    NeonGlow.applyTextGlow(this, this.scoreText, COLORS.NEON_CYAN);

    this.livesGroup = this.add.group();
    this.drawLives(3);

    this.coinsText = this.add.text(GAME_WIDTH - 135, 8, '', {
      fontSize: '13px', fontFamily: 'monospace', color: '#ffd700',
    }).setOrigin(1, 0).setDepth(1000);

    this.gameLabel = this.add.text(GAME_WIDTH / 2, 8, '', {
      fontSize: '12px', fontFamily: 'monospace', color: neonPurple,
    }).setOrigin(0.5, 0).setDepth(1000);
    NeonGlow.applyTextGlow(this, this.gameLabel, COLORS.NEON_PURPLE);

    this.boostIndicator = this.add.text(160, 8, '', {
      fontSize: '12px', fontFamily: 'monospace', color: neonOrange,
    }).setDepth(1000);

    this.boostBar = this.add.rectangle(160, 27, 0, 3, COLORS.NEON_ORANGE, 0.9)
      .setOrigin(0, 0.5).setDepth(1000);
    this.boostBar.setVisible(false);

    this.hackBarBg = this.add.rectangle(GAME_WIDTH - 12, HUD_H + 10, 6, 100, COLORS.HUD_BG, 0.7)
      .setOrigin(0.5, 0).setDepth(998);
    this.hackBarFill = this.add.rectangle(GAME_WIDTH - 12, HUD_H + 10 + 100, 4, 0, COLORS.NEON_CYAN, 0.8)
      .setOrigin(0.5, 1).setDepth(999);

    const hackG = this.add.graphics().setDepth(998);
    NeonGlow.strokeRect(hackG, GAME_WIDTH - 15, HUD_H + 8, 6, 104, COLORS.NEON_CYAN, 1, 0.3);

    this.hackLabel = this.add.text(GAME_WIDTH - 12, HUD_H + 115, 'H', {
      fontSize: '10px', fontFamily: 'monospace', color: neonCyan,
    }).setOrigin(0.5, 0).setDepth(999).setAlpha(0.6);

    this.mutationText = this.add.text(GAME_WIDTH / 2, HUD_H + 4, '', {
      fontSize: '10px', fontFamily: 'monospace', color: neonOrange,
    }).setOrigin(0.5, 0).setDepth(998).setAlpha(0);

    // Breach progress bar
    const bpX = 220;
    const bpW = 120;
    this.add.text(bpX - 2, 22, 'BREACH', {
      fontSize: '7px', fontFamily: 'monospace', color: neonCyan,
    }).setDepth(1000).setAlpha(0.5);
    this.breachBarBg = this.add.rectangle(bpX, 19, bpW, 3, COLORS.HUD_BG, 0.6)
      .setOrigin(0, 0.5).setDepth(999);
    this.breachBarFill = this.add.rectangle(bpX, 19, 0, 3, COLORS.NEON_CYAN, 0.7)
      .setOrigin(0, 0.5).setDepth(1000);
    this.add.rectangle(bpX, 19, bpW, 3)
      .setOrigin(0, 0.5).setDepth(1000).setStrokeStyle(1, COLORS.NEON_CYAN, 0.3);

    this.scene.get(GameManager.currentSceneKey)?.events?.on('score-changed', this.updateScore, this);
    this.events.on('wake', this.refresh, this);
    this.events.on('resume', this.refresh, this);
    this.refresh();
  }

  drawLives(count) {
    this.livesGroup.clear(true, true);
    const startX = GAME_WIDTH - 10;
    for (let i = 0; i < count; i++) {
      const x = startX - i * 14;
      const diamond = this.add.graphics().setDepth(1000);
      diamond.fillStyle(COLORS.NEON_PINK, 0.9);
      diamond.fillTriangle(x, 9, x - 5, 16, x + 5, 16);
      diamond.fillTriangle(x, 23, x - 5, 16, x + 5, 16);
      this.livesGroup.add(diamond);
    }
  }

  refresh() {
    this.updateScore(GameManager.state.totalScore);
    this.updateLives(GameManager.state.lives);
    this.updateCoins(GameManager.state.coins);
    this.updateBoost();
    this.updateHackMeter();
    this.updateMutation();
    this.updateBreachProgress();
    this._updateGameLabel(GameManager.currentSceneKey);
  }

  listenToScene(sceneKey) {
    const s = this.scene.get(sceneKey);
    if (s) {
      s.events.on('score-changed', this.updateScore, this);
      s.events.on('lives-changed', this.updateLives, this);
      s.events.on('coins-changed', this.updateCoins, this);
      s.events.on('speed-boost-changed', this.updateBoost, this);
      s.events.on('hack-changed', this.updateHackMeter, this);
    }
    this._updateGameLabel(sceneKey);
    this.updateMutation();
    this.updateBreachProgress();
    this.scene.bringToTop();
  }

  _updateGameLabel(sceneKey) {
    const lore = GAME_LORE[sceneKey];
    if (lore) {
      this.gameLabel.setText(`LAYER ${String(lore.layer).padStart(2, '0')} // ${GAME_NAMES[sceneKey] || ''}`);
    } else {
      this.gameLabel.setText(GAME_NAMES[sceneKey] || '');
    }
  }

  updateBreachProgress() {
    if (!this.breachBarFill) return;
    const completed = GameManager.state.gamesCompleted ? GameManager.state.gamesCompleted.length : 0;
    const total = GAME_ORDER.length;
    const ratio = Math.min(1, completed / total);
    this.breachBarFill.width = ratio * 120;
  }

  updateScore(score) {
    if (this.scoreText) {
      this.scoreText.setText('SCR:' + String(score).padStart(7, '0'));
    }
  }

  updateLives(lives) {
    const count = lives != null ? lives : GameManager.state.lives;
    this.drawLives(count);
  }

  updateCoins(coins) {
    const c = coins != null ? coins : GameManager.state.coins;
    if (this.coinsText) this.coinsText.setText('COIN:' + c);
  }

  updateBoost() {
    const s = GameManager.state;
    if (s.speedBoostActive) {
      this.boostIndicator.setText('SPD x2');
      this.boostBar.setVisible(true);
      const ratio = Math.max(0, s.speedBoostTimer / SPEED_BOOST.DURATION);
      this.boostBar.width = ratio * 60;
    } else {
      this.boostIndicator.setText('');
      this.boostBar.setVisible(false);
    }
  }

  updateHackMeter() {
    const charge = GameManager.state.hackCharge || 0;
    const ratio = Math.min(1, charge / HACK_CONFIG.MAX_CHARGE);
    this.hackBarFill.height = ratio * 100;

    if (ratio >= 1) {
      this.hackBarFill.setFillStyle(COLORS.NEON_GREEN, 1);
      this.hackLabel.setAlpha(1);
    } else {
      this.hackBarFill.setFillStyle(COLORS.NEON_CYAN, 0.8);
      this.hackLabel.setAlpha(0.4);
    }
  }

  updateMutation() {
    const ms = GameManager.mutationSystem;
    if (ms && ms.activeMutation) {
      this.mutationText.setText('MUT: ' + ms.activeMutation.name);
      this.mutationText.setAlpha(0.7);
    } else {
      this.mutationText.setText('');
      this.mutationText.setAlpha(0);
    }
  }

  update() {
    if (GameManager.state.speedBoostActive) this.updateBoost();
    if (GameManager.state.hackCharge !== undefined) this.updateHackMeter();
  }
}
