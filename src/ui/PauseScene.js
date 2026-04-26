import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS, COIN_CONFIG } from '../config.js';
import { GameManager } from '../core/GameManager.js';
import SFX from '../core/SFXManager.js';
import NeonGlow from '../vfx/NeonGlow.js';

const cyan = '#00f0ff';
const magenta = '#ff00e6';
const green = '#39ff14';

export class PauseScene extends Phaser.Scene {
  constructor() {
    super('PauseScene');
  }

  create(data) {
    this.parentScene = data.parentScene || null;
    this.scene.bringToTop();

    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, COLORS.BG_DARK, 0.85);

    const borderG = this.add.graphics();
    NeonGlow.strokeRect(borderG, 200, 100, 400, 400, COLORS.NEON_CYAN, 1, 0.4);
    NeonGlow.cornerAccents(borderG, 200, 100, 400, 400, 15, COLORS.NEON_CYAN, 2);

    const title = this.add.text(GAME_WIDTH / 2, 140, 'SYSTEM PAUSED', {
      fontSize: '28px', fontFamily: 'monospace', color: cyan,
    }).setOrigin(0.5);
    NeonGlow.applyTextGlow(this, title, COLORS.NEON_CYAN);

    const resume = this.add.text(GAME_WIDTH / 2, 210, '> RESUME', {
      fontSize: '18px', fontFamily: 'monospace', color: magenta,
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    resume.on('pointerover', () => resume.setColor(cyan));
    resume.on('pointerout', () => resume.setColor(magenta));
    resume.on('pointerdown', () => this.resumeGame());

    this.add.text(GAME_WIDTH / 2, 270, '// SHOP', {
      fontSize: '14px', fontFamily: 'monospace', color: '#555577',
    }).setOrigin(0.5);

    this.coinsLabel = this.add.text(GAME_WIDTH / 2, 300, '', {
      fontSize: '14px', fontFamily: 'monospace', color: '#ffd700',
    }).setOrigin(0.5);

    this.livesLabel = this.add.text(GAME_WIDTH / 2, 325, '', {
      fontSize: '13px', fontFamily: 'monospace', color: '#ff2d7b',
    }).setOrigin(0.5);

    this.buyBtn = this.add.text(GAME_WIDTH / 2, 365, `> BUY +1 LIFE (${COIN_CONFIG.LIFE_COST} coins)`, {
      fontSize: '15px', fontFamily: 'monospace', color: green,
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    this.buyBtn.on('pointerover', () => this.buyBtn.setColor('#ffffff'));
    this.buyBtn.on('pointerout', () => this.updateBuyColor());
    this.buyBtn.on('pointerdown', () => this.buyLife());

    this.feedbackText = this.add.text(GAME_WIDTH / 2, 395, '', {
      fontSize: '12px', fontFamily: 'monospace', color: '#666688',
    }).setOrigin(0.5);

    const skip = this.add.text(GAME_WIDTH / 2, 440, '> SKIP GAME  [N]', {
      fontSize: '16px', fontFamily: 'monospace', color: '#ff6e00',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    skip.on('pointerover', () => skip.setColor('#ffffff'));
    skip.on('pointerout', () => skip.setColor('#ff6e00'));
    skip.on('pointerdown', () => this.skipGame());

    const quit = this.add.text(GAME_WIDTH / 2, 475, '> DISCONNECT', {
      fontSize: '16px', fontFamily: 'monospace', color: '#ff1744',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    quit.on('pointerover', () => quit.setColor('#ffffff'));
    quit.on('pointerout', () => quit.setColor('#ff1744'));
    quit.on('pointerdown', () => this.returnToMenu());

    this.add.text(GAME_WIDTH / 2, 500, 'ESC/P: resume  |  N: skip game', {
      fontSize: '10px', fontFamily: 'monospace', color: '#333355',
    }).setOrigin(0.5);

    this.refreshShop();

    this.input.keyboard.on('keydown-ESC', () => this.resumeGame());
    this.input.keyboard.on('keydown-P', () => this.resumeGame());
    this.input.keyboard.on('keydown-N', () => this.skipGame());
  }

  refreshShop() {
    const s = GameManager.state;
    this.coinsLabel.setText(`COINS: ${s.coins}`);
    this.livesLabel.setText(`LIVES: ${s.lives}`);
    this.updateBuyColor();
  }

  updateBuyColor() {
    const canBuy = GameManager.state.coins >= COIN_CONFIG.LIFE_COST;
    this.buyBtn.setColor(canBuy ? green : '#555555');
  }

  buyLife() {
    if (GameManager.buyLife()) {
      SFX.shopBuy();
      this.feedbackText.setText('+1 LIFE INSTALLED');
      this.feedbackText.setColor(green);
    } else {
      SFX.shopFail();
      this.feedbackText.setText('INSUFFICIENT CREDITS');
      this.feedbackText.setColor('#ff1744');
    }
    this.refreshShop();

    const hud = this.scene.get('HUDScene');
    if (hud) {
      hud.updateLives(GameManager.state.lives);
      hud.updateCoins(GameManager.state.coins);
    }

    this.time.delayedCall(1500, () => {
      if (this.feedbackText) this.feedbackText.setText('');
    });
  }

  returnToMenu() {
    SFX.menuSelect();
    if (this.parentScene) this.scene.stop(this.parentScene);
    this.scene.stop('HUDScene');
    this.scene.stop('CRTOverlay');
    this.scene.start('MenuScene');
  }

  skipGame() {
    SFX.menuSelect();
    if (this.parentScene) this.scene.stop(this.parentScene);

    try { GameManager.mutationSystem.cleanupScene(this.scene.get(this.parentScene)); } catch (_) {}
    try { this.scene.sleep('HUDScene'); } catch (_) {}
    try { this.scene.sleep('CRTOverlay'); } catch (_) {}

    const nextScene = GameManager.advanceToNextGame();

    if (GameManager.storyComplete) {
      this.scene.start('VictoryScene');
    } else {
      this.scene.start('ModSelectScene', { from: this.parentScene, to: nextScene });
    }
  }

  resumeGame() {
    SFX.unpause();
    if (this.parentScene) this.scene.resume(this.parentScene);
    this.scene.stop();
  }
}
