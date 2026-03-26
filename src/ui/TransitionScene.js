import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS, GAME_NAMES } from '../config.js';
import { GameManager } from '../core/GameManager.js';
import GlitchEffect from '../vfx/GlitchEffect.js';
import NeonGlow from '../vfx/NeonGlow.js';

export class TransitionScene extends Phaser.Scene {
  constructor() {
    super('TransitionScene');
  }

  create(data) {
    this.fromScene = data.from;
    this.toScene = data.to;

    this.scene.bringToTop();
    this.cameras.main.setBackgroundColor(COLORS.BG_DARK);

    this.drawGridBackground();
    GlitchEffect.screenTear(this, 600);

    this.time.delayedCall(200, () => {
      GlitchEffect.dataStream(this, GAME_WIDTH / 2 - 200, 20, 1800, COLORS.NEON_CYAN);
    });

    this.drawTunnelLines();
    this.spawnParticles();

    const gameName = GAME_NAMES[this.toScene] || 'NEXT SECTOR';

    const loadingText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 50, 'LOADING NEXT SECTOR', {
      fontSize: '14px', fontFamily: 'monospace',
      color: '#' + COLORS.NEON_CYAN.toString(16).padStart(6, '0'),
    }).setOrigin(0.5).setAlpha(0).setDepth(5000);

    const cursor = this.add.text(
      loadingText.x + loadingText.width / 2 + 4,
      GAME_HEIGHT / 2 - 50, '_',
      { fontSize: '14px', fontFamily: 'monospace', color: '#00f0ff' }
    ).setOrigin(0, 0.5).setAlpha(0).setDepth(5000);

    this.tweens.add({
      targets: [loadingText, cursor],
      alpha: 1,
      duration: 300,
      delay: 400,
    });

    this.tweens.add({
      targets: cursor,
      alpha: { from: 1, to: 0 },
      duration: 400,
      yoyo: true,
      repeat: -1,
      delay: 700,
    });

    const nameLabel = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2, '', {
      fontSize: '36px', fontFamily: 'monospace',
      color: '#' + COLORS.NEON_MAGENTA.toString(16).padStart(6, '0'),
    }).setOrigin(0.5).setAlpha(0).setDepth(5001);
    NeonGlow.applyTextGlow(this, nameLabel, COLORS.NEON_MAGENTA);

    const mutationMgr = GameManager.mutationSystem;
    let mutationLabel = null;
    if (mutationMgr && mutationMgr.activeMutation) {
      mutationLabel = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 50, '', {
        fontSize: '16px', fontFamily: 'monospace',
        color: '#' + COLORS.NEON_ORANGE.toString(16).padStart(6, '0'),
      }).setOrigin(0.5).setAlpha(0).setDepth(5001);
    }

    this.time.delayedCall(800, () => {
      nameLabel.setText(gameName);
      this.tweens.add({
        targets: nameLabel,
        alpha: 1, scale: { from: 0.5, to: 1 },
        duration: 500, ease: 'Back.easeOut',
      });

      if (mutationLabel && mutationMgr.activeMutation) {
        mutationLabel.setText('MUTATION: ' + mutationMgr.activeMutation.name);
        this.tweens.add({
          targets: mutationLabel,
          alpha: 1,
          duration: 400,
          delay: 300,
        });
      }
    });

    this.time.delayedCall(300, () => {
      GlitchEffect.chromaticAberration(this, 500);
    });

    const totalDuration = 2200;
    this.time.delayedCall(totalDuration, () => {
      GlitchEffect.screenTear(this, 300);
      this.cameras.main.fadeOut(400, 10, 10, 26);
      this.time.delayedCall(450, () => {
        this._ensureOverlay('HUDScene');
        this._ensureOverlay('CRTOverlay');
        const hud = this.scene.get('HUDScene');
        if (hud) hud.listenToScene(this.toScene);
        this.scene.start(this.toScene);
      });
    });
  }

  _ensureOverlay(key) {
    try {
      if (this.scene.isSleeping(key)) {
        this.scene.wake(key);
      } else if (!this.scene.isActive(key)) {
        this.scene.launch(key);
      }
    } catch (_) { /* safe */ }
  }

  drawGridBackground() {
    const g = this.add.graphics().setDepth(0);
    g.lineStyle(1, COLORS.GRID_LINE, 0.3);
    for (let x = 0; x < GAME_WIDTH; x += 40) {
      g.strokeLineShape(new Phaser.Geom.Line(x, 0, x, GAME_HEIGHT));
    }
    for (let y = 0; y < GAME_HEIGHT; y += 40) {
      g.strokeLineShape(new Phaser.Geom.Line(0, y, GAME_WIDTH, y));
    }
  }

  drawTunnelLines() {
    const g = this.add.graphics().setDepth(1);
    let progress = 0;

    this.tunnelTimer = this.time.addEvent({
      delay: 16, repeat: -1,
      callback: () => {
        progress += 0.015;
        g.clear();
        for (let i = 0; i < 16; i++) {
          const a = (Math.PI * 2 * i) / 16 + progress * 3;
          const inner = 10 + progress * 100;
          const outer = inner + 200;
          const color = i % 2 === 0 ? COLORS.NEON_PURPLE : COLORS.NEON_CYAN;
          g.lineStyle(1, color, 0.25 * (1 - progress * 0.6));
          g.beginPath();
          g.moveTo(GAME_WIDTH / 2 + Math.cos(a) * inner, GAME_HEIGHT / 2 + Math.sin(a) * inner);
          g.lineTo(GAME_WIDTH / 2 + Math.cos(a) * outer, GAME_HEIGHT / 2 + Math.sin(a) * outer);
          g.strokePath();
        }
      }
    });

    this.time.delayedCall(2600, () => {
      if (this.tunnelTimer) this.tunnelTimer.destroy();
    });
  }

  spawnParticles() {
    for (let i = 0; i < 80; i++) {
      const color = [COLORS.NEON_CYAN, COLORS.NEON_MAGENTA, COLORS.NEON_PURPLE, COLORS.PORTAL_CORE][i % 4];
      const p = this.add.circle(
        GAME_WIDTH / 2 + (Math.random() - 0.5) * 120,
        GAME_HEIGHT / 2 + (Math.random() - 0.5) * 120,
        Math.random() * 2.5 + 0.5,
        color,
        Math.random() * 0.8 + 0.2
      ).setDepth(2);

      const angle = (Math.PI * 2 * i) / 80;
      const radius = 60 + Math.random() * 250;

      this.tweens.add({
        targets: p,
        x: GAME_WIDTH / 2 + Math.cos(angle) * radius,
        y: GAME_HEIGHT / 2 + Math.sin(angle) * radius,
        alpha: 0,
        scale: 0,
        duration: 1800,
        ease: 'Cubic.easeIn',
        delay: i * 12,
      });
    }
  }
}
