import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS, GAME_NAMES } from '../config.js';
import { GameManager } from '../core/GameManager.js';
import SFX from '../core/SFXManager.js';
import NeonGlow from '../vfx/NeonGlow.js';
import AudioBackground from '../vfx/AudioBackground.js';

export class TransitionScene extends Phaser.Scene {
  constructor() {
    super('TransitionScene');
  }

  create(data) {
    this.fromScene = data.from;
    this.toScene = data.to;
    this.scene.bringToTop();
    this.cameras.main.setBackgroundColor(0x000000);

    const gameName = GAME_NAMES[this.toScene] || 'NEXT SECTOR';
    const mutationMgr = GameManager.mutationSystem;

    const nameLabel = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 10, '', {
      fontSize: '36px', fontFamily: 'monospace', color: '#ffffff',
    }).setOrigin(0.5).setAlpha(0).setDepth(6000);

    const sectorLabel = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 55, 'ENTERING SECTOR', {
      fontSize: '12px', fontFamily: 'monospace', color: '#b845ff',
    }).setOrigin(0.5).setAlpha(0).setDepth(6000);

    let mutationLabel = null;
    if (mutationMgr && mutationMgr.activeMutation) {
      mutationLabel = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 40, '', {
        fontSize: '14px', fontFamily: 'monospace',
        color: '#' + COLORS.NEON_ORANGE.toString(16).padStart(6, '0'),
      }).setOrigin(0.5).setAlpha(0).setDepth(6000);
    }

    const WARP_DURATION = 2800;

    SFX.warpTravel();
    AudioBackground.startWarp(
      WARP_DURATION,
      () => {
        sectorLabel.setAlpha(1);
        nameLabel.setText(gameName);
        NeonGlow.applyTextGlow(this, nameLabel, COLORS.NEON_MAGENTA);
        this.tweens.add({
          targets: nameLabel,
          alpha: 1, scale: { from: 0.3, to: 1 },
          duration: 500, ease: 'Back.easeOut',
        });

        if (mutationLabel && mutationMgr.activeMutation) {
          mutationLabel.setText('MUTATION: ' + mutationMgr.activeMutation.name);
          this.tweens.add({ targets: mutationLabel, alpha: 1, duration: 400, delay: 300 });
        }
      },
      () => {
        this.cameras.main.flash(300, 200, 180, 255);
        AudioBackground.stopWarp(this.toScene, GameManager.state.mode);

        this.time.delayedCall(250, () => {
          this._ensureOverlay('HUDScene');
          this._ensureOverlay('CRTOverlay');
          const hud = this.scene.get('HUDScene');
          if (hud) hud.listenToScene(this.toScene);
          this.scene.start(this.toScene);
        });
      },
    );
  }

  _ensureOverlay(key) {
    try {
      if (this.scene.isSleeping(key)) this.scene.wake(key);
      else if (!this.scene.isActive(key)) this.scene.launch(key);
    } catch (_) { /* safe */ }
  }
}
