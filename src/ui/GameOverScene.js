import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS } from '../config.js';
import { GameManager } from '../core/GameManager.js';
import SFX from '../core/SFXManager.js';
import BGM from '../core/AudioManager.js';
import NeonGlow from '../vfx/NeonGlow.js';
import GlitchEffect from '../vfx/GlitchEffect.js';
import AudioBackground from '../vfx/AudioBackground.js';

export class GameOverScene extends Phaser.Scene {
  constructor() {
    super('GameOverScene');
  }

  create() {
    try { this.scene.stop('HUDScene'); } catch (_) {}
    try { this.scene.stop('CRTOverlay'); } catch (_) {}
    this.scene.bringToTop();
    GameManager.saveHighScore();
    SFX.gameOver();
    BGM.stop(this);
    this.cameras.main.fadeIn(500);
    this.cameras.main.setBackgroundColor(COLORS.BG_DARK);
    AudioBackground.setScene('GameOverScene');

    GlitchEffect.screenTear(this, 800);

    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, COLORS.BG_DARK, 0.95);

    const borderG = this.add.graphics();
    NeonGlow.strokeRect(borderG, 150, 120, 500, 360, COLORS.NEON_RED, 1, 0.4);

    const title = this.add.text(GAME_WIDTH / 2, 170, 'CONNECTION LOST', {
      fontSize: '38px', fontFamily: 'monospace', color: '#ff1744',
    }).setOrigin(0.5);
    NeonGlow.applyTextGlow(this, title, COLORS.NEON_RED);

    this.tweens.add({
      targets: title,
      alpha: { from: 0.5, to: 1 },
      duration: 500, yoyo: true, repeat: -1,
    });

    this.add.text(GAME_WIDTH / 2, 250, `SCORE: ${String(GameManager.state.totalScore).padStart(7, '0')}`, {
      fontSize: '22px', fontFamily: 'monospace', color: '#00f0ff',
    }).setOrigin(0.5);

    this.add.text(GAME_WIDTH / 2, 290, `SECTORS: ${GameManager.state.gamesCompleted.length}  |  CREDITS: ${GameManager.state.coins}`, {
      fontSize: '14px', fontFamily: 'monospace', color: '#555577',
    }).setOrigin(0.5);

    const hs = GameManager.getHighScore();
    this.add.text(GAME_WIDTH / 2, 325, `BEST: ${String(hs).padStart(7, '0')}`, {
      fontSize: '14px', fontFamily: 'monospace', color: '#b845ff',
    }).setOrigin(0.5);

    const restart = this.add.text(GAME_WIDTH / 2, 410, '> RECONNECT', {
      fontSize: '18px', fontFamily: 'monospace', color: '#ffffff',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    restart.on('pointerover', () => restart.setColor('#00f0ff'));
    restart.on('pointerout', () => restart.setColor('#ffffff'));
    restart.on('pointerdown', () => this.toMenu());

    this.input.keyboard.on('keydown-ENTER', () => this.toMenu());
  }

  toMenu() {
    this.scene.stop('HUDScene');
    this.scene.stop('CRTOverlay');
    this.scene.start('MenuScene');
  }
}
