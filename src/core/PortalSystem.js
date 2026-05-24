import Phaser from 'phaser';
import { PORTAL_CONFIG, COLORS, GAME_WIDTH, GAME_HEIGHT } from '../config.js';
import { GameManager } from './GameManager.js';
import SFX from './SFXManager.js';
import PosterSceneFX from '../vfx/PosterSceneFX.js';
import { getVisualStyle, getFonts, isModernistStyle, cssColor } from './VisualStyle.js';

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
    this.urgencyElapsed = 0;
    this.urgencyLifetime = PORTAL_CONFIG.URGENCY_LIFETIME;
    this.portalExpired = false;
    this._warningText = null;
    this._spiralGfx = null;
    this._ringGfx = null;
    this._vortexParticles = [];
    // Modernist-only handles (drawHalftoneField / drawPortalRings return objects)
    this._modField = null;
    this._modRings = null;
    this._modCorner = null;
    this.modernist = isModernistStyle();
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
    this.elapsed = 0;
    this.urgencyElapsed = 0;
    this.portalExpired = false;

    if (this.fallbackTimer) {
      this.fallbackTimer.destroy();
      this.fallbackTimer = null;
    }

    if (this.modernist) {
      this._spawnPortalModernist(x, y);
      return;
    }

    this.portal = this.scene.add.container(x, y).setDepth(100);

    const glow3 = this.scene.add.circle(0, 0, 48, COLORS.NEON_PURPLE, 0.06);
    const glow2 = this.scene.add.circle(0, 0, 40, COLORS.PORTAL_EDGE, 0.12);
    const glow1 = this.scene.add.circle(0, 0, 34, COLORS.PORTAL_GLOW, 0.25);
    const midRing = this.scene.add.circle(0, 0, 26, COLORS.PORTAL_CORE, 0.45);
    const voidCore = this.scene.add.circle(0, 0, 16, 0x0a0020, 0.95);
    const hotCenter = this.scene.add.circle(0, 0, 6, COLORS.WHITE, 0.8);
    this.portal.add([glow3, glow2, glow1, midRing, voidCore, hotCenter]);
    this.portalParts = { glow3, glow2, glow1, midRing, voidCore, hotCenter };

    this._spiralGfx = this.scene.add.graphics();
    this.portal.add(this._spiralGfx);

    this._ringGfx = this.scene.add.graphics();
    this.portal.add(this._ringGfx);

    this.portal.setScale(0);

    SFX.portalAppear();

    this.scene.tweens.add({
      targets: this.portal,
      scale: 1,
      duration: PORTAL_CONFIG.APPEAR_DURATION,
      ease: 'Back.easeOut',
      onComplete: () => { this.portalReady = true; },
    });

    const pColors = [COLORS.NEON_CYAN, COLORS.NEON_MAGENTA, COLORS.NEON_PURPLE, COLORS.PORTAL_CORE];
    for (let i = 0; i < PORTAL_CONFIG.PARTICLE_COUNT; i++) {
      const angle = (Math.PI * 2 * i) / PORTAL_CONFIG.PARTICLE_COUNT;
      const color = pColors[i % pColors.length];
      const p = this.scene.add.circle(0, 0, 1.5 + Math.random(), color, 0.7);
      this.portal.add(p);
      this.particles.push({
        obj: p, angle,
        radius: 30 + Math.random() * 16,
        speed: 0.025 + Math.random() * 0.03,
        inward: 0.15 + Math.random() * 0.1,
      });
    }

    this._spawnVortexParticles();
  }

  // Modernist portal: a printed-poster rift. PosterSceneFX.drawHalftoneField
  // (~50px) + drawPortalRings (~70px) cached as { graphics, draw(s,b) }
  // callbacks. We add their graphics to a single container so the spawn /
  // expire tweens can act on it. The four corner ticks mark the rift like a
  // registration crosshair stamped on the page.
  _spawnPortalModernist(x, y) {
    const scene = this.scene;
    const p = getVisualStyle().palette;

    this.portal = scene.add.container(x, y).setDepth(100);
    this.portal.setScale(0);

    // drawHalftoneField / drawPortalRings render at absolute coords, so we
    // build them around (0, 0) and then move the underlying graphics to the
    // container — saves us doing per-frame world-coord math.
    const field = PosterSceneFX.drawHalftoneField(scene, 0, 0, 52, {
      rings: 9,
      depth: 100,
      alpha: 0.7,
    });
    const rings = PosterSceneFX.drawPortalRings(scene, 0, 0, 38, { depth: 101 });

    // Re-parent the underlying graphics into the portal container.
    this.portal.add(field.graphics);
    this.portal.add(rings.graphics);

    // Corner registration ticks — a 4-arm hairline reads as a stamp target.
    const corner = scene.add.graphics();
    corner.lineStyle(1.5, p.vermilion, 0.95);
    const armLen = 4;
    const gap = 46;
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([dx, dy]) => {
      const cx = dx * gap;
      const cy = dy * gap;
      corner.lineBetween(cx, cy, cx + armLen * -dx, cy);
      corner.lineBetween(cx, cy, cx, cy + armLen * -dy);
    });
    this.portal.add(corner);
    this._modCorner = corner;

    this._modField = field;
    this._modRings = rings;

    SFX.portalAppear();

    scene.tweens.add({
      targets: this.portal,
      scale: 1,
      duration: PORTAL_CONFIG.APPEAR_DURATION,
      ease: 'Back.easeOut',
      onComplete: () => { this.portalReady = true; },
    });
  }

  _spawnVortexParticles() {
    for (let i = 0; i < 12; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 50 + Math.random() * 40;
      const color = [COLORS.NEON_CYAN, COLORS.NEON_MAGENTA, COLORS.NEON_PURPLE][i % 3];
      const p = this.scene.add.circle(
        Math.cos(angle) * dist, Math.sin(angle) * dist,
        0.8 + Math.random() * 1.2, color, 0.6
      );
      this.portal.add(p);
      this._vortexParticles.push({ obj: p, angle, dist, speed: 0.03 + Math.random() * 0.02 });
    }
  }

  update(time, delta) {
    if (!this.portalActive || !this.portal) return;
    if (this.enteringPortal) return;
    this.elapsed += delta;

    if (this.portalReady && !this.portalExpired) {
      this.urgencyElapsed += delta;
      const remaining = this.urgencyLifetime - this.urgencyElapsed;

      if (remaining <= 0) { this.expirePortal(); return; }

      if (remaining <= PORTAL_CONFIG.URGENCY_WARNING && !this._warningText) {
        this.showUrgencyWarning();
      }
      if (this._warningText && remaining > 0) {
        this._warningText.setText(`PORTAL CLOSING: ${Math.ceil(remaining / 1000)}s`);
      }

      const urgencyRatio = Math.max(0, remaining / this.urgencyLifetime);
      this.portal.setScale(0.4 + urgencyRatio * 0.6);
    }

    const urgencyRatio = Math.max(0, (this.urgencyLifetime - this.urgencyElapsed) / this.urgencyLifetime);
    const pulseSpeed = PORTAL_CONFIG.PULSE_SPEED * (1 + (1 - urgencyRatio) * 3);
    const pulse = Math.sin(this.elapsed * pulseSpeed) * 0.15 + 1;
    const t = this.elapsed * 0.003;

    if (this.modernist) {
      // Print rift breathe: slow ring rotation, bass-style pulse on the
      // halftone, no neon flicker. As urgency rises the rings spin faster.
      const rot = t * (0.4 + (1 - urgencyRatio) * 1.2);
      const ringPulse = Math.sin(this.elapsed * pulseSpeed) * 0.4;
      if (this._modRings) this._modRings.draw(rot, ringPulse);
      const fieldScale = 1 + Math.sin(this.elapsed * 0.0028) * 0.06;
      const fieldBright = 0.05 + (1 - urgencyRatio) * 0.18;
      if (this._modField) this._modField.draw(fieldScale, fieldBright);
      // Subtle corner-tick blink as urgency drops.
      if (this._modCorner) {
        this._modCorner.setAlpha(urgencyRatio < 0.3
          ? 0.45 + (Math.sin(this.elapsed * 0.012) * 0.5 + 0.5) * 0.55
          : 1);
      }
      return;
    }

    if (this.portalParts) {
      this.portalParts.glow3.setScale(pulse * 1.25);
      this.portalParts.glow2.setScale(pulse * 1.12);
      this.portalParts.glow1.setScale(pulse);
      this.portalParts.midRing.setScale(1 / pulse * 1.05);
      this.portalParts.voidCore.setScale(1 / pulse);
      this.portalParts.glow3.setAlpha(0.04 + Math.sin(this.elapsed * 0.004) * 0.04);
      this.portalParts.glow2.setAlpha(0.08 + Math.sin(this.elapsed * 0.005) * 0.07);
      this.portalParts.hotCenter.setAlpha(0.5 + Math.sin(this.elapsed * 0.008) * 0.5);

      if (urgencyRatio < 0.3) {
        const red = Math.sin(this.elapsed * 0.01) * 0.5 + 0.5;
        this.portalParts.voidCore.setFillStyle(
          Phaser.Display.Color.GetColor(80 + Math.floor(red * 100), 0, Math.floor(red * 30)), 0.9
        );
      }
    }

    this._drawSpirals(t, urgencyRatio);
    this._drawRings(t, urgencyRatio);

    const orbSpeed = 1 + (1 - urgencyRatio) * 2;
    this.particles.forEach(p => {
      p.angle += p.speed * orbSpeed;
      const wobble = Math.sin(p.angle * 4 + t * 2) * 3;
      p.obj.x = Math.cos(p.angle) * (p.radius + wobble);
      p.obj.y = Math.sin(p.angle) * (p.radius + wobble);
      p.obj.setAlpha(0.3 + Math.sin(p.angle * 3) * 0.5);
    });

    this._vortexParticles.forEach(vp => {
      vp.angle += vp.speed * orbSpeed * 1.5;
      vp.dist -= 0.15 * orbSpeed;
      if (vp.dist < 5) { vp.dist = 50 + Math.random() * 40; vp.obj.setAlpha(0); }
      else { vp.obj.setAlpha(Math.min(0.6, (vp.dist - 5) / 30)); }
      vp.obj.x = Math.cos(vp.angle) * vp.dist;
      vp.obj.y = Math.sin(vp.angle) * vp.dist;
    });
  }

  _drawSpirals(time, urgencyRatio) {
    if (!this._spiralGfx) return;
    this._spiralGfx.clear();
    const arms = 5;
    const segments = 24;
    const colors = [COLORS.NEON_CYAN, COLORS.NEON_MAGENTA, COLORS.NEON_PURPLE, COLORS.PORTAL_CORE, COLORS.PORTAL_GLOW];
    const spinSpeed = 1.5 + (1 - urgencyRatio) * 3;

    for (let arm = 0; arm < arms; arm++) {
      const baseAngle = (Math.PI * 2 * arm / arms) + time * spinSpeed;
      const color = colors[arm];
      for (let seg = 1; seg < segments; seg++) {
        const frac = seg / segments;
        const r = 8 + frac * 32;
        const a = baseAngle + frac * 2.5;
        const x = Math.cos(a) * r;
        const y = Math.sin(a) * r;
        const alpha = (1 - frac) * 0.35;
        const sz = (1 - frac) * 2.5 + 0.5;
        this._spiralGfx.fillStyle(color, alpha);
        this._spiralGfx.fillCircle(x, y, sz);
      }
    }
  }

  _drawRings(time, urgencyRatio) {
    if (!this._ringGfx) return;
    this._ringGfx.clear();
    const hexColor = urgencyRatio < 0.3 ? COLORS.NEON_RED : COLORS.NEON_CYAN;

    for (let ring = 0; ring < 3; ring++) {
      const radius = 22 + ring * 10;
      const rot = time * (1.2 + ring * 0.4) * (ring % 2 === 0 ? 1 : -1);
      const sides = 6 + ring * 2;
      const alpha = (0.15 - ring * 0.04) + Math.sin(this.elapsed * 0.003 + ring) * 0.06;
      this._ringGfx.lineStyle(1, ring === 0 ? hexColor : COLORS.NEON_PURPLE, Math.max(0.02, alpha));
      this._ringGfx.beginPath();
      for (let i = 0; i <= sides; i++) {
        const a = rot + (Math.PI * 2 * i) / sides;
        const px = Math.cos(a) * radius;
        const py = Math.sin(a) * radius;
        if (i === 0) this._ringGfx.moveTo(px, py);
        else this._ringGfx.lineTo(px, py);
      }
      this._ringGfx.strokePath();
    }
  }

  showUrgencyWarning() {
    if (this._warningText) return;
    const fonts = getFonts();
    const p = getVisualStyle().palette;
    this._warningText = this.scene.add.text(
      this.portal.x, this.portal.y - 60, 'PORTAL CLOSING', {
        fontSize: this.modernist ? '12px' : '11px',
        fontFamily: this.modernist ? fonts.ui : fonts.mono,
        color: this.modernist ? cssColor(p.vermilion) : '#ff1744',
      }
    ).setOrigin(0.5).setDepth(150);
    if (this.modernist) {
      this._warningText.setStroke(cssColor(p.ink), 1);
    }
    this.scene.tweens.add({
      targets: this._warningText,
      alpha: { from: 1, to: 0.3 }, duration: 400, yoyo: true, repeat: -1,
    });
  }

  expirePortal() {
    this.portalExpired = true;
    this.portalReady = false;
    if (this._warningText) { this._warningText.destroy(); this._warningText = null; }
    this.scene.tweens.add({
      targets: this.portal, scale: 0, alpha: 0, duration: 500, ease: 'Cubic.easeIn',
      onComplete: () => {
        try { this.portal.destroy(); } catch (_) {}
        this.portal = null;
        this.portalActive = false;
        this.portalParts = null;
        this.particles = [];
        this._vortexParticles = [];
        this._spiralGfx = null;
        this._ringGfx = null;
        this.startFallbackTimer();
      },
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

    if (this._warningText) { try { this._warningText.destroy(); } catch (_) {} this._warningText = null; }

    [...this.particles, ...this._vortexParticles].forEach((p, i) => {
      this.scene.tweens.add({
        targets: p.obj, x: 0, y: 0, alpha: 0, scale: 0,
        duration: 250 + i * 8, ease: 'Cubic.easeIn',
      });
    });

    this.scene.tweens.add({
      targets: this.portal, scale: 0.6, duration: 180, ease: 'Quad.easeIn',
      onComplete: () => {
        this.scene.tweens.add({
          targets: this.portal, scale: 18, duration: 650, ease: 'Expo.easeIn',
        });
      },
    });

    if (this.modernist) {
      // Paper wash flash instead of magenta chroma; a vermilion bar snaps
      // across the page at peak — reads as a press-stamped frame replacement.
      const p = getVisualStyle().palette;
      const flash = this.scene.add.rectangle(
        GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH + 100, GAME_HEIGHT + 100,
        p.paper, 0
      ).setDepth(998);
      this.scene.tweens.add({
        targets: flash, fillAlpha: 0.78, duration: 250, delay: 200, ease: 'Quad.easeIn',
      });

      const bar = this.scene.add.graphics().setDepth(999);
      bar.fillStyle(p.vermilion, 1);
      bar.fillRect(0, GAME_HEIGHT / 2 - 6, 0, 12);
      this.scene.tweens.add({
        targets: bar, x: 0, duration: 1,
      });
      this.scene.tweens.add({
        targets: { w: 0 },
        w: GAME_WIDTH,
        duration: 380, delay: 240, ease: 'Cubic.easeOut',
        onUpdate: (tw) => {
          const v = tw.getValue();
          bar.clear();
          bar.fillStyle(p.vermilion, 1);
          bar.fillRect((GAME_WIDTH - v) / 2, GAME_HEIGHT / 2 - 6, v, 12);
        },
      });
    } else {
      const flash = this.scene.add.rectangle(
        GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH + 100, GAME_HEIGHT + 100,
        0xd040ff, 0
      ).setDepth(998);

      this.scene.tweens.add({
        targets: flash, fillAlpha: 0.6, duration: 250, delay: 200, ease: 'Quad.easeIn',
        onComplete: () => {
          this.scene.tweens.add({
            targets: flash, fillAlpha: 1, duration: 200,
            onUpdate: (tw) => {
              const v = tw.getValue();
              const r = Math.floor(200 + v * 55);
              const g = Math.floor(180 + v * 75);
              const b = Math.floor(220 + v * 35);
              flash.setFillStyle(Phaser.Display.Color.GetColor(r, g, b), flash.fillAlpha);
            },
          });
        },
      });
    }

    this.scene.cameras.main.shake(700, this.modernist ? 0.006 : 0.02);

    this.scene.time.delayedCall(800, () => {
      if (callback) callback();
    });
  }

  destroy() {
    try { if (this.fallbackTimer) this.fallbackTimer.destroy(); } catch (_) {}
    try { if (this.portal) this.portal.destroy(); } catch (_) {}
    try { if (this._warningText) this._warningText.destroy(); } catch (_) {}
    this.fallbackTimer = null;
    this.particles = [];
    this._vortexParticles = [];
    this.portal = null;
    this.portalActive = false;
    this.portalReady = false;
    this.enteringPortal = false;
    this.portalExpired = false;
    this.elapsed = 0;
    this.urgencyElapsed = 0;
    this._spiralGfx = null;
    this._ringGfx = null;
    this._warningText = null;
    this._modField = null;
    this._modRings = null;
    this._modCorner = null;
  }
}
