import Phaser from 'phaser';
import { PORTAL_CONFIG, COLORS } from '../config.js';
import { GameManager } from './GameManager.js';
import SFX from './SFXManager.js';

export class PortalSystem {
  constructor(scene) {
    this.scene = scene;
    this.portal = null;
    this.portalActive = false;
    this.portalReady = false;
    this.enteringPortal = false;
    this.elapsed = 0;
    this.particles = [];
    this.fallbackTimer = null;
    this.hexRing = null;
    this.urgencyElapsed = 0;
    this.urgencyLifetime = PORTAL_CONFIG.URGENCY_LIFETIME;
    this.portalExpired = false;
    this._warningText = null;
  }

  startFallbackTimer() {
    this.fallbackTimer = this.scene.time.delayedCall(
      PORTAL_CONFIG.FALLBACK_TIME / GameManager.state.difficulty,
      () => { if (!this.portalActive) this.scene.events.emit('portal-force-spawn'); }
    );
  }

  spawnPortal(x, y) {
    if (this.portalActive) return;
    this.portalActive = true;

    if (this.fallbackTimer) {
      this.fallbackTimer.destroy();
      this.fallbackTimer = null;
    }

    this.portal = this.scene.add.container(x, y);
    this.portal.setDepth(100);

    // Outer neon glow layers
    const glow3 = this.scene.add.circle(0, 0, 44, COLORS.NEON_PURPLE, 0.08);
    const glow2 = this.scene.add.circle(0, 0, 38, COLORS.PORTAL_EDGE, 0.15);
    const glow1 = this.scene.add.circle(0, 0, 32, COLORS.PORTAL_GLOW, 0.3);
    const midRing = this.scene.add.circle(0, 0, 24, COLORS.PORTAL_CORE, 0.5);
    const core = this.scene.add.circle(0, 0, 14, COLORS.NEON_MAGENTA, 0.9);
    const innerCore = this.scene.add.circle(0, 0, 6, COLORS.WHITE, 1);

    this.portal.add([glow3, glow2, glow1, midRing, core, innerCore]);
    this.portal.setScale(0);
    this.portalParts = { glow3, glow2, glow1, midRing, core, innerCore };

    // Hexagonal ring decoration
    this.hexRing = this.scene.add.graphics();
    this.portal.add(this.hexRing);

    SFX.portalAppear();

    this.scene.tweens.add({
      targets: this.portal,
      scale: 1,
      duration: PORTAL_CONFIG.APPEAR_DURATION,
      ease: 'Back.easeOut',
      onComplete: () => { this.portalReady = true; }
    });

    // Orbiting particles with neon colors
    const pColors = [COLORS.NEON_CYAN, COLORS.NEON_MAGENTA, COLORS.NEON_PURPLE, COLORS.PORTAL_CORE];
    for (let i = 0; i < PORTAL_CONFIG.PARTICLE_COUNT; i++) {
      const angle = (Math.PI * 2 * i) / PORTAL_CONFIG.PARTICLE_COUNT;
      const color = pColors[i % pColors.length];
      const p = this.scene.add.circle(0, 0, 1.5 + Math.random(), color, 0.7);
      this.portal.add(p);
      this.particles.push({
        obj: p, angle,
        radius: 28 + Math.random() * 14,
        speed: 0.02 + Math.random() * 0.025,
      });
    }

    // Electric arc lines
    for (let i = 0; i < 4; i++) {
      const arc = this.scene.add.graphics();
      this.portal.add(arc);
      this.scene.tweens.add({
        targets: { val: 0 },
        val: 1,
        duration: 600 + Math.random() * 400,
        repeat: -1,
        yoyo: true,
        onUpdate: (tween) => {
          arc.clear();
          const a = (Math.PI * 2 * i) / 4 + this.elapsed * 0.002;
          const r = 30 + tween.getValue() * 8;
          arc.lineStyle(1, COLORS.NEON_CYAN, 0.3 + tween.getValue() * 0.3);
          arc.beginPath();
          arc.moveTo(Math.cos(a) * 14, Math.sin(a) * 14);
          const midA = a + 0.3;
          arc.lineTo(Math.cos(midA) * r, Math.sin(midA) * r);
          arc.strokePath();
        },
      });
    }
  }

  update(time, delta) {
    if (!this.portalActive || !this.portal) return;
    if (this.enteringPortal) return;
    this.elapsed += delta;

    if (this.portalReady && !this.portalExpired) {
      this.urgencyElapsed += delta;
      const remaining = this.urgencyLifetime - this.urgencyElapsed;

      if (remaining <= 0) {
        this.expirePortal();
        return;
      }

      if (remaining <= PORTAL_CONFIG.URGENCY_WARNING && !this._warningText) {
        this.showUrgencyWarning();
      }

      if (this._warningText && remaining > 0) {
        const sec = Math.ceil(remaining / 1000);
        this._warningText.setText(`PORTAL CLOSING: ${sec}s`);
      }

      const urgencyRatio = Math.max(0, remaining / this.urgencyLifetime);
      const shrinkScale = 0.4 + urgencyRatio * 0.6;
      this.portal.setScale(shrinkScale);
    }

    const urgencyRatio = Math.max(0, (this.urgencyLifetime - this.urgencyElapsed) / this.urgencyLifetime);
    const pulseSpeed = PORTAL_CONFIG.PULSE_SPEED * (1 + (1 - urgencyRatio) * 3);
    const pulse = Math.sin(this.elapsed * pulseSpeed) * 0.15 + 1;

    if (this.portalParts) {
      this.portalParts.glow3.setScale(pulse * 1.2);
      this.portalParts.glow2.setScale(pulse * 1.1);
      this.portalParts.glow1.setScale(pulse);
      this.portalParts.midRing.setScale(1 / pulse * 1.05);
      this.portalParts.core.setScale(1 / pulse);
      this.portalParts.glow3.setAlpha(0.05 + Math.sin(this.elapsed * 0.004) * 0.05);
      this.portalParts.glow2.setAlpha(0.1 + Math.sin(this.elapsed * 0.005) * 0.08);

      if (urgencyRatio < 0.3) {
        const red = Math.sin(this.elapsed * 0.01) * 0.5 + 0.5;
        this.portalParts.core.setFillStyle(
          Phaser.Display.Color.GetColor(255, Math.floor(red * 100), Math.floor(red * 50)),
          0.9
        );
      }
    }

    this.particles.forEach(p => {
      p.angle += p.speed * (1 + (1 - urgencyRatio) * 2);
      p.obj.x = Math.cos(p.angle) * p.radius;
      p.obj.y = Math.sin(p.angle) * p.radius;
      p.obj.setAlpha(0.3 + Math.sin(p.angle * 3) * 0.5);
    });

    if (this.hexRing) {
      this.hexRing.clear();
      const hexA = this.elapsed * (0.001 + (1 - urgencyRatio) * 0.003);
      const hexColor = urgencyRatio < 0.3 ? COLORS.NEON_RED : COLORS.NEON_CYAN;
      this.hexRing.lineStyle(1, hexColor, 0.2 + Math.sin(this.elapsed * 0.003) * 0.1);
      this.hexRing.beginPath();
      for (let i = 0; i <= 6; i++) {
        const a = hexA + (Math.PI * 2 * i) / 6;
        const r = 36;
        const px = Math.cos(a) * r;
        const py = Math.sin(a) * r;
        if (i === 0) this.hexRing.moveTo(px, py);
        else this.hexRing.lineTo(px, py);
      }
      this.hexRing.strokePath();
    }
  }

  showUrgencyWarning() {
    if (this._warningText) return;
    this._warningText = this.scene.add.text(
      this.portal.x, this.portal.y - 55,
      'PORTAL CLOSING', {
        fontSize: '11px', fontFamily: 'monospace', color: '#ff1744',
      }
    ).setOrigin(0.5).setDepth(150);
    this.scene.tweens.add({
      targets: this._warningText,
      alpha: { from: 1, to: 0.3 },
      duration: 400,
      yoyo: true,
      repeat: -1,
    });
  }

  expirePortal() {
    this.portalExpired = true;
    this.portalReady = false;

    if (this._warningText) {
      this._warningText.destroy();
      this._warningText = null;
    }

    this.scene.tweens.add({
      targets: this.portal,
      scale: 0, alpha: 0,
      duration: 500,
      ease: 'Cubic.easeIn',
      onComplete: () => {
        try { this.portal.destroy(); } catch (_) {}
        this.portal = null;
        this.portalActive = false;
        this.portalParts = null;
        this.particles = [];
        this.hexRing = null;
        this.startFallbackTimer();
      }
    });
  }

  checkOverlap(playerX, playerY) {
    if (!this.portalReady || this.enteringPortal || !this.portal) return false;
    const dx = playerX - this.portal.x;
    const dy = playerY - this.portal.y;
    return Math.sqrt(dx * dx + dy * dy) < PORTAL_CONFIG.INTERACTION_RADIUS;
  }

  enterPortal(callback) {
    if (this.enteringPortal) return;
    this.enteringPortal = true;
    SFX.portalEnter();

    this.scene.tweens.add({
      targets: this.portal,
      scale: 3.5,
      alpha: 0,
      duration: 900,
      ease: 'Cubic.easeIn',
    });

    this.scene.cameras.main.fadeOut(900, 10, 10, 40);
    this.scene.time.delayedCall(950, () => {
      if (callback) callback();
    });
  }

  destroy() {
    try { if (this.fallbackTimer) this.fallbackTimer.destroy(); } catch (_) {}
    try { if (this.portal) this.portal.destroy(); } catch (_) {}
    try { if (this._warningText) this._warningText.destroy(); } catch (_) {}
    this.fallbackTimer = null;
    this.particles = [];
    this.portal = null;
    this.portalActive = false;
    this.portalReady = false;
    this.enteringPortal = false;
    this.portalExpired = false;
    this.elapsed = 0;
    this.urgencyElapsed = 0;
    this.hexRing = null;
    this._warningText = null;
  }
}
