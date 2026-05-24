import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS, GAME_NAMES, GAME_LORE } from '../config.js';
import { GameManager } from '../core/GameManager.js';
import SFX from '../core/SFXManager.js';
import NeonGlow from '../vfx/NeonGlow.js';
import AudioBackground from '../vfx/AudioBackground.js';
import { getVisualStyle, isModernistStyle } from '../core/VisualStyle.js';

export class TransitionScene extends Phaser.Scene {
  constructor() {
    super('TransitionScene');
  }

  create(data) {
    this.visualStyle = getVisualStyle();
    this.palette = this.visualStyle.palette;
    this.modernist = isModernistStyle();
    this.fromScene = data.from;
    this.toScene = data.to;
    this.scene.bringToTop();
    this.cameras.main.setBackgroundColor(this.palette.terminal);

    const gameName = GAME_NAMES[this.toScene] || 'NEXT SECTOR';
    const lore = GAME_LORE[this.toScene];
    const mutationMgr = GameManager.mutationSystem;

    if (this.modernist) this.drawModernistTransitionFrame(gameName, lore);

    const nameLabel = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 10, '', {
      fontSize: this.modernist ? '32px' : '36px',
      fontFamily: 'monospace',
      color: this.modernist ? this.visualStyle.css.paper : '#ffffff',
    }).setOrigin(0.5).setAlpha(0).setDepth(6000);

    const layerNum = lore ? `BREACHING LAYER ${String(lore.layer).padStart(2, '0')}...` : 'ENTERING SECTOR';
    const sectorLabel = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 55, layerNum, {
      fontSize: '12px',
      fontFamily: 'monospace',
      color: this.modernist ? this.visualStyle.css.vermilion : '#b845ff',
    }).setOrigin(0.5).setAlpha(0).setDepth(6000);

    const fwType = lore ? `FIREWALL TYPE: ${lore.firewallType}` : '';
    const fwLabel = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 25, fwType, {
      fontSize: '10px',
      fontFamily: 'monospace',
      color: this.modernist ? this.visualStyle.css.cyan : '#00f0ff',
    }).setOrigin(0.5).setAlpha(0).setDepth(6000);

    let mutationLabel = null;
    if (mutationMgr && mutationMgr.activeMutation) {
      mutationLabel = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 50, '', {
        fontSize: '14px', fontFamily: 'monospace',
        color: this.modernist ? this.visualStyle.css.mustard : '#' + COLORS.NEON_ORANGE.toString(16).padStart(6, '0'),
      }).setOrigin(0.5).setAlpha(0).setDepth(6000);
    }

    const WARP_DURATION = 2800;

    SFX.warpTravel();
    AudioBackground.startWarp(
      WARP_DURATION,
      () => {
        sectorLabel.setAlpha(1);
        nameLabel.setText(gameName);
        if (!this.modernist) NeonGlow.applyTextGlow(this, nameLabel, COLORS.NEON_MAGENTA);
        this.tweens.add({
          targets: nameLabel,
          alpha: 1, scale: { from: 0.3, to: 1 },
          duration: 500, ease: 'Back.easeOut',
        });
        this.tweens.add({ targets: fwLabel, alpha: 0.7, duration: 400, delay: 200 });

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

  drawModernistTransitionFrame(gameName, lore) {
    const p = this.palette;
    const css = this.visualStyle.css;
    const g = this.add.graphics().setDepth(0);

    g.fillStyle(p.terminal, 1);
    g.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    g.fillStyle(p.paper, 1);
    g.fillRect(0, 0, GAME_WIDTH, 116);
    g.fillStyle(p.vermilion, 1);
    g.fillRect(0, 116, GAME_WIDTH, 4);
    g.fillStyle(p.panelAlt, 0.92);
    g.fillRect(72, 150, GAME_WIDTH - 144, 292);
    g.lineStyle(1, p.paper, 0.28);
    g.strokeRect(72, 150, GAME_WIDTH - 144, 292);

    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;
    g.lineStyle(1, p.cyan, 0.34);
    g.lineBetween(cx - 190, cy, cx + 190, cy);
    g.lineBetween(cx, cy - 126, cx, cy + 126);
    for (let i = 0; i < 11; i++) {
      const radius = 28 + i * 16;
      const color = i % 3 === 0 ? p.vermilion : (i % 3 === 1 ? p.cyan : p.paper);
      g.lineStyle(i % 4 === 0 ? 2 : 1, color, 0.16 + i * 0.022);
      g.strokeCircle(cx, cy, radius);
    }

    this.add.text(32, 32, 'ATARI PORTAL', {
      fontSize: '28px',
      fontFamily: 'monospace',
      color: css.ink,
      fontStyle: 'bold',
    }).setDepth(1);
    this.add.text(32, 72, 'TRANSITION / VECTOR IRIS / DATA SPLICE', {
      fontSize: '10px',
      fontFamily: 'monospace',
      color: css.vermilion,
    }).setDepth(1);
    this.add.text(GAME_WIDTH - 232, 34, `TARGET: ${gameName}\n${lore ? `LAYER: ${String(lore.layer).padStart(2, '0')}` : 'SECTOR: UNKNOWN'}\nSTYLE: ${this.visualStyle.shortLabel}`, {
      fontSize: '9px',
      fontFamily: 'monospace',
      color: css.ink,
      lineSpacing: 4,
    }).setDepth(1);
  }
}
