import Phaser from 'phaser';
import { GAME_WIDTH, COLORS, GAME_NAMES, SPEED_BOOST, HACK_CONFIG, GAME_LORE, GAME_ORDER } from '../config.js';
import { GameManager } from '../core/GameManager.js';
import NeonGlow from '../vfx/NeonGlow.js';
import { getVisualStyle, isModernistStyle, getFonts } from '../core/VisualStyle.js';

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
    this.visualStyle = getVisualStyle();
    this.palette = this.visualStyle.palette;
    this.modernist = isModernistStyle();
    const p = this.palette;
    const css = this.visualStyle.css;
    const f = this.visualStyle.fonts || getFonts();

    const g = this.add.graphics().setDepth(999);
    g.fillStyle(this.modernist ? p.terminal : COLORS.HUD_BG, this.modernist ? 0.94 : 0.92);
    g.fillRect(0, 0, GAME_WIDTH, HUD_H);
    if (this.modernist) {
      g.fillStyle(p.vermilion, 1);
      g.fillRect(0, 0, 64, 3);
      g.fillStyle(p.mustard, 1);
      g.fillRect(64, 0, 42, 3);
      g.lineStyle(1, p.paper, 0.35);
      g.strokeRect(0, 0, GAME_WIDTH, HUD_H);
    } else {
      NeonGlow.strokeRect(g, 0, 0, GAME_WIDTH, HUD_H, COLORS.HUD_BORDER, 1, 0.5);
      NeonGlow.cornerAccents(g, 0, 0, GAME_WIDTH, HUD_H, 10, COLORS.HUD_BORDER, 1);
    }

    g.lineStyle(1, this.modernist ? p.paper : COLORS.HUD_BORDER, this.modernist ? 0.18 : 0.15);
    g.strokeLineShape(new Phaser.Geom.Line(0, HUD_H, GAME_WIDTH, HUD_H));

    this.scoreText = this.add.text(12, 8, 'SCR:0000000', {
      fontSize: '13px',
      fontFamily: f.mono,
      color: this.modernist ? css.green : neonCyan,
    }).setDepth(1000);
    if (!this.modernist) NeonGlow.applyTextGlow(this, this.scoreText, COLORS.NEON_CYAN);

    this.livesGroup = this.add.group();
    this.drawLives(3);

    this.coinsText = this.add.text(GAME_WIDTH - 135, 8, '', {
      fontSize: '13px',
      fontFamily: f.mono,
      color: this.modernist ? css.mustard : '#ffd700',
    }).setOrigin(1, 0).setDepth(1000);

    this.gameLabel = this.add.text(GAME_WIDTH / 2, 8, '', {
      fontSize: '13px',
      fontFamily: f.ui,
      color: this.modernist ? css.paper : neonPurple,
    }).setOrigin(0.5, 0).setDepth(1000);
    if (!this.modernist) NeonGlow.applyTextGlow(this, this.gameLabel, COLORS.NEON_PURPLE);

    this.boostIndicator = this.add.text(160, 8, '', {
      fontSize: '12px',
      fontFamily: f.mono,
      color: this.modernist ? css.vermilion : neonOrange,
    }).setDepth(1000);

    this.boostBar = this.add.rectangle(160, 27, 0, 3, this.modernist ? p.vermilion : COLORS.NEON_ORANGE, 0.9)
      .setOrigin(0, 0.5).setDepth(1000);
    this.boostBar.setVisible(false);

    this.hackBarBg = this.add.rectangle(GAME_WIDTH - 12, HUD_H + 10, 6, 100, this.modernist ? p.terminal : COLORS.HUD_BG, 0.7)
      .setOrigin(0.5, 0).setDepth(998);
    this.hackBarFill = this.add.rectangle(GAME_WIDTH - 12, HUD_H + 10 + 100, 4, 0, this.modernist ? p.cyan : COLORS.NEON_CYAN, 0.8)
      .setOrigin(0.5, 1).setDepth(999);

    const hackG = this.add.graphics().setDepth(998);
    if (this.modernist) {
      hackG.lineStyle(1, p.paper, 0.35);
      hackG.strokeRect(GAME_WIDTH - 15, HUD_H + 8, 6, 104);
    } else {
      NeonGlow.strokeRect(hackG, GAME_WIDTH - 15, HUD_H + 8, 6, 104, COLORS.NEON_CYAN, 1, 0.3);
    }

    this.hackLabel = this.add.text(GAME_WIDTH - 12, HUD_H + 115, 'H', {
      fontSize: '11px',
      fontFamily: f.ui,
      color: this.modernist ? css.cyan : neonCyan,
    }).setOrigin(0.5, 0).setDepth(999).setAlpha(0.6);

    this.mutationText = this.add.text(GAME_WIDTH / 2, HUD_H + 4, '', {
      fontSize: '10px',
      fontFamily: f.mono,
      color: this.modernist ? css.mustard : neonOrange,
    }).setOrigin(0.5, 0).setDepth(998).setAlpha(0);

    // Breach progress bar
    const bpX = 220;
    const bpW = 120;
    this.add.text(bpX - 2, 22, 'BREACH', {
      fontSize: '8px',
      fontFamily: f.ui,
      color: this.modernist ? css.cyan : neonCyan,
    }).setDepth(1000).setAlpha(0.5);
    this.breachBarBg = this.add.rectangle(bpX, 19, bpW, 3, this.modernist ? p.faint : COLORS.HUD_BG, 0.6)
      .setOrigin(0, 0.5).setDepth(999);
    this.breachBarFill = this.add.rectangle(bpX, 19, 0, 3, this.modernist ? p.cyan : COLORS.NEON_CYAN, 0.7)
      .setOrigin(0, 0.5).setDepth(1000);
    this.add.rectangle(bpX, 19, bpW, 3)
      .setOrigin(0, 0.5).setDepth(1000).setStrokeStyle(1, this.modernist ? p.paper : COLORS.NEON_CYAN, this.modernist ? 0.28 : 0.3);

    this.scene.get(GameManager.currentSceneKey)?.events?.on('score-changed', this.updateScore, this);
    this.events.on('wake', this.refresh, this);
    this.events.on('resume', this.refresh, this);
    this.refresh();
  }

  drawLives(count) {
    this.livesGroup.clear(true, true);
    const startX = GAME_WIDTH - 10;
    const color = this.modernist ? this.palette.vermilion : COLORS.NEON_PINK;
    for (let i = 0; i < count; i++) {
      const x = startX - i * 14;
      const diamond = this.add.graphics().setDepth(1000);
      diamond.fillStyle(color, 0.9);
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
      this.hackBarFill.setFillStyle(this.modernist ? this.palette.green : COLORS.NEON_GREEN, 1);
      this.hackLabel.setAlpha(1);
    } else {
      this.hackBarFill.setFillStyle(this.modernist ? this.palette.cyan : COLORS.NEON_CYAN, 0.8);
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
