import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS, AUDIO_REACTIVE as AR } from '../config.js';
import AudioReactive from '../core/AudioReactiveSystem.js';

export class CRTOverlay extends Phaser.Scene {
  constructor() {
    super('CRTOverlay');
  }

  create() {
    this.scene.bringToTop();

    this.scanlineGfx = this.add.graphics().setDepth(9000);
    this.drawScanlines(AR.SCANLINE_ALPHA_MIN);

    this.vignetteGfx = this.add.graphics().setDepth(9001);
    this.drawVignette();

    this.flickerOverlay = this.add.rectangle(
      GAME_WIDTH / 2, GAME_HEIGHT / 2,
      GAME_WIDTH, GAME_HEIGHT,
      0x000000, 0
    ).setDepth(9002);

    this.beatFlash = this.add.rectangle(
      GAME_WIDTH / 2, GAME_HEIGHT / 2,
      GAME_WIDTH, GAME_HEIGHT,
      COLORS.NEON_CYAN, 0
    ).setDepth(9003).setBlendMode(Phaser.BlendModes.ADD);

    this.chromaL = this.add.rectangle(
      GAME_WIDTH / 2 - 2, GAME_HEIGHT / 2,
      GAME_WIDTH, GAME_HEIGHT,
      COLORS.NEON_CYAN, 0
    ).setDepth(9004).setBlendMode(Phaser.BlendModes.ADD);

    this.chromaR = this.add.rectangle(
      GAME_WIDTH / 2 + 2, GAME_HEIGHT / 2,
      GAME_WIDTH, GAME_HEIGHT,
      COLORS.NEON_MAGENTA, 0
    ).setDepth(9004).setBlendMode(Phaser.BlendModes.ADD);

    this.energyTint = this.add.rectangle(
      GAME_WIDTH / 2, GAME_HEIGHT / 2,
      GAME_WIDTH, GAME_HEIGHT,
      COLORS.NEON_PURPLE, 0
    ).setDepth(9005).setBlendMode(Phaser.BlendModes.ADD);

    this._scanlineDirty = false;
    this._lastScanAlpha = AR.SCANLINE_ALPHA_MIN;

    this.scheduleFlicker();
  }

  update() {
    const ar = AudioReactive;
    if (!ar.energy && !ar.isBeat) return;

    const scanAlpha = Phaser.Math.Linear(
      AR.SCANLINE_ALPHA_MIN, AR.SCANLINE_ALPHA_MAX, ar.bassSmooth
    );
    if (Math.abs(scanAlpha - this._lastScanAlpha) > 0.015) {
      this.drawScanlines(scanAlpha);
      this._lastScanAlpha = scanAlpha;
    }

    if (ar.isBeat) {
      const color = [COLORS.NEON_CYAN, COLORS.NEON_MAGENTA, COLORS.NEON_PURPLE][
        Math.floor(Math.random() * 3)
      ];
      this.beatFlash.setFillStyle(color, 1);
      this.beatFlash.setAlpha(AR.BEAT_FLASH_ALPHA * ar.beatIntensity);
      this.tweens.add({
        targets: this.beatFlash,
        alpha: 0,
        duration: AR.BEAT_FLASH_DURATION,
        ease: 'Quad.easeOut',
      });
    }

    const offset = AR.CHROMATIC_OFFSET * ar.bassSmooth;
    this.chromaL.setPosition(GAME_WIDTH / 2 - offset, GAME_HEIGHT / 2);
    this.chromaR.setPosition(GAME_WIDTH / 2 + offset, GAME_HEIGHT / 2);
    const chromaAlpha = ar.beatIntensity * 0.04;
    this.chromaL.setAlpha(chromaAlpha);
    this.chromaR.setAlpha(chromaAlpha);

    const tintAlpha = ar.energy * AR.ENERGY_TINT_ALPHA;
    this.energyTint.setAlpha(tintAlpha);
    if (ar.bass > ar.mid && ar.bass > ar.treble) {
      this.energyTint.setFillStyle(COLORS.NEON_MAGENTA, 1);
    } else if (ar.mid > ar.treble) {
      this.energyTint.setFillStyle(COLORS.NEON_PURPLE, 1);
    } else {
      this.energyTint.setFillStyle(COLORS.NEON_CYAN, 1);
    }
  }

  drawScanlines(alpha = 0.12) {
    const g = this.scanlineGfx;
    g.clear();
    for (let y = 0; y < GAME_HEIGHT; y += 3) {
      g.fillStyle(0x000000, alpha);
      g.fillRect(0, y, GAME_WIDTH, 1);
    }
  }

  drawVignette() {
    const g = this.vignetteGfx;
    const w = GAME_WIDTH;
    const h = GAME_HEIGHT;
    const edgeSize = 80;

    for (let i = 0; i < edgeSize; i++) {
      const alpha = 0.35 * (1 - i / edgeSize);
      g.fillStyle(0x000000, alpha);
      g.fillRect(0, i, w, 1);
      g.fillRect(0, h - 1 - i, w, 1);
      g.fillRect(i, 0, 1, h);
      g.fillRect(w - 1 - i, 0, 1, h);
    }

    const cornerSize = 20;
    for (let i = 0; i < cornerSize; i++) {
      const alpha = 0.2 * (1 - i / cornerSize);
      g.fillStyle(0x000000, alpha);
      g.fillRect(0, 0, cornerSize - i, cornerSize - i);
      g.fillRect(w - cornerSize + i, 0, cornerSize - i, cornerSize - i);
      g.fillRect(0, h - cornerSize + i, cornerSize - i, cornerSize - i);
      g.fillRect(w - cornerSize + i, h - cornerSize + i, cornerSize - i, cornerSize - i);
    }
  }

  scheduleFlicker() {
    const delay = 3000 + Math.random() * 8000;
    this.time.delayedCall(delay, () => {
      this.doFlicker();
      this.scheduleFlicker();
    });
  }

  doFlicker() {
    this.tweens.add({
      targets: this.flickerOverlay,
      alpha: { from: 0, to: 0.08 },
      duration: 50,
      yoyo: true,
      repeat: Phaser.Math.Between(1, 3),
      onComplete: () => {
        this.flickerOverlay.setAlpha(0);
      }
    });
  }
}
