import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS, HACK_CONFIG, AUDIO_REACTIVE as AR, CYBER_GRID } from '../config.js';
import { GameManager } from '../core/GameManager.js';
import { PortalSystem } from '../core/PortalSystem.js';
import { ScoreManager } from '../core/ScoreManager.js';
import { GlitchSystem } from '../core/GlitchSystem.js';
import { PowerUpSystem } from '../core/PowerUpSystem.js';
import SFX from '../core/SFXManager.js';
import BGM from '../core/AudioManager.js';
import AudioReactive from '../core/AudioReactiveSystem.js';
import NeonGlow from '../vfx/NeonGlow.js';
import GlitchEffect from '../vfx/GlitchEffect.js';
import AudioBackground from '../vfx/AudioBackground.js';
import PosterSceneFX from '../vfx/PosterSceneFX.js';
import { cssColor, getVisualStyle, getFonts, isModernistStyle } from '../core/VisualStyle.js';

export class BaseGameScene extends Phaser.Scene {
  constructor(key, scoreKey) {
    super(key);
    this.sceneKey = key;
    this.scoreKey = scoreKey;
  }

  create() {
    this.visualStyle = getVisualStyle();
    this.palette = this.visualStyle.palette;
    this.modernist = isModernistStyle();
    this.fonts = this.visualStyle.fonts || getFonts();
    this.cameras.main.setBackgroundColor(this.palette.terminal);
    AudioBackground.setScene(this.sceneKey, GameManager.state.mode);
    console.log('[AudioReactive] BaseGameScene create', this.sceneKey);

    this.portal = new PortalSystem(this);
    this.score = new ScoreManager(this, this.scoreKey);
    this.glitch = new GlitchSystem(this);
    this.powerUps = new PowerUpSystem(this, this.sceneKey);
    this.gameArea = { x: 0, y: 32, width: GAME_WIDTH, height: GAME_HEIGHT - 32 };
    this.cameras.main.fadeIn(400);

    this._ensureOverlayRunning('HUDScene');
    this._ensureOverlayRunning('CRTOverlay');

    const hud = this.scene.get('HUDScene');
    if (hud) {
      hud.listenToScene(this.sceneKey);
      hud.scene.bringToTop();
    }
    const crt = this.scene.get('CRTOverlay');
    if (crt) crt.scene.bringToTop();

    this.portal.startFallbackTimer();

    this.events.on('portal-force-spawn', () => {
      if (!this.portal.portalActive) {
        this.onPortalForceSpawn();
      }
    });

    this.pauseKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    this.pauseKeyP = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.P);
    this.hackKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.H);
    this.skipKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.N);
    this.cheatKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.BACK_SLASH);

    this._prevBoostState = false;
    this._prevHackState = false;
    this._ending = false;
    this._foregroundFocus = { x: 0, y: 0 };

    // Apply active mutation effects
    const ms = GameManager.mutationSystem;
    if (ms.activeMutation) {
      ms.applyToScene(this);
    }

    this.drawGameGrid();
    this._initDataStream();
    this._setCRTIntensity();

    BGM.playForScene(this, this.sceneKey);

    this.events.on('combo-hit', this._showCombo, this);
    this.events.on('score-popup', this._showScorePopup, this);

    this.events.once('shutdown', this.shutdown, this);
  }

  drawGameGrid() {
    this._gridGfx = this.add.graphics().setDepth(0);
    this._gridAlpha = this.modernist ? 0.18 : 0.12;
    this._drawGridLines(this._gridAlpha);
  }

  _drawGridLines(alpha) {
    const g = this._gridGfx;
    g.clear();
    const dashLen = this.modernist ? 6 : 4;
    const gapLen = this.modernist ? 10 : 6;
    const gridColor = this.modernist ? this.palette.faint : COLORS.GRID_LINE;
    const majorColor = this.modernist ? this.palette.paper : COLORS.GRID_LINE;
    const step = this.modernist ? 32 : 40;

    if (this.modernist) {
      g.fillStyle(this.palette.paper, 0.025);
      g.fillRect(0, 32, GAME_WIDTH, GAME_HEIGHT - 32);
      g.lineStyle(1, this.palette.vermilion, 0.38);
      g.lineBetween(0, 32, GAME_WIDTH, 32);
    }

    g.lineStyle(1, gridColor, alpha);
    for (let x = 0; x < GAME_WIDTH; x += step) {
      for (let y = 32; y < GAME_HEIGHT; y += dashLen + gapLen) {
        const endY = Math.min(y + dashLen, GAME_HEIGHT);
        g.strokeLineShape(new Phaser.Geom.Line(x, y, x, endY));
      }
    }
    for (let y = 32; y < GAME_HEIGHT; y += step) {
      for (let x = 0; x < GAME_WIDTH; x += dashLen + gapLen) {
        const endX = Math.min(x + dashLen, GAME_WIDTH);
        g.strokeLineShape(new Phaser.Geom.Line(x, y, endX, y));
      }
    }

    if (this.modernist) {
      g.lineStyle(1, majorColor, alpha * 1.3);
      g.strokeRect(10, 42, GAME_WIDTH - 20, GAME_HEIGHT - 54);
      g.lineStyle(1, this.palette.cyan, alpha * 1.15);
      g.lineBetween(GAME_WIDTH / 2, 42, GAME_WIDTH / 2, GAME_HEIGHT - 12);
      g.lineBetween(10, GAME_HEIGHT / 2, GAME_WIDTH - 10, GAME_HEIGHT / 2);
    }
  }

  _initDataStream() {
    const cfg = CYBER_GRID[this.sceneKey];
    if (!cfg) return;
    const density = this.modernist ? Math.min(0.22, cfg.streamDensity || 0.3) : (cfg.streamDensity || 0.3);
    const color = this.modernist ? cssColor(this.palette.cyan) : '#' + (cfg.streamColor || COLORS.NEON_CYAN).toString(16).padStart(6, '0');
    const colCount = Math.floor(density * 15);
    const chars = this.modernist ? '01+-' : '01';

    this._dataStreamItems = [];
    for (let i = 0; i < colCount; i++) {
      const cx = Math.random() * GAME_WIDTH;
      const speed = 30 + Math.random() * 50;
      const len = 3 + Math.floor(Math.random() * 5);
      for (let j = 0; j < len; j++) {
        const ch = chars[Math.floor(Math.random() * chars.length)];
        const a = (0.06 + (1 - j / len) * 0.08) * density;
        const txt = this.add.text(cx, -20 - j * 14, ch, {
          fontSize: '10px', fontFamily: this.fonts.mono, color,
        }).setAlpha(this.modernist ? a * 0.7 : a).setDepth(1);
        this._dataStreamItems.push({ obj: txt, speed, startX: cx });
        this.tweens.add({
          targets: txt,
          y: GAME_HEIGHT + 20,
          duration: ((GAME_HEIGHT + 40) / speed) * 1000,
          delay: Math.random() * 4000 + j * 100,
          repeat: -1,
          onRepeat: () => { txt.y = -20; txt.x = cx + (Math.random() - 0.5) * 10; },
        });
      }
    }
  }

  _setCRTIntensity() {
    const crt = this.scene.get('CRTOverlay');
    if (crt && crt.setIntensity) {
      const diff = GameManager.state.difficulty || 1;
      const intensity = Math.min(1, (diff - 1) * 0.2 + 0.3);
      crt.setIntensity(intensity);
    }
  }

  get gameSpeed() {
    let speed = GameManager.speedMultiplier;
    if (this.glitch && this.glitch.timeDilationFactor !== 1) {
      speed *= this.glitch.timeDilationFactor;
    }
    return speed;
  }

  get controlInverted() {
    return this.glitch ? this.glitch.controlInverted : false;
  }

  get horizontalControlInverted() {
    const glitchInvert = this.glitch ? this.glitch.controlInverted : false;
    const mirrorInvert = !!GameManager.mutationSystem?.isMirrored;
    return glitchInvert !== mirrorInvert;
  }

  get verticalControlInverted() {
    return this.glitch ? this.glitch.controlInverted : false;
  }

  get enemiesFrozen() {
    return (this.glitch && this.glitch.enemiesFrozen) || GameManager.state.hackActive;
  }

  update(time, delta) {
    if (this._ending) return;

    if (Phaser.Input.Keyboard.JustDown(this.pauseKey) || Phaser.Input.Keyboard.JustDown(this.pauseKeyP)) {
      SFX.pause();
      this.scene.pause();
      this.scene.launch('PauseScene', { parentScene: this.sceneKey });
    }

    if (Phaser.Input.Keyboard.JustDown(this.hackKey)) {
      this.tryActivateHack();
    }

    if (Phaser.Input.Keyboard.JustDown(this.skipKey)) {
      this.skipToNextGame();
    }

    if (Phaser.Input.Keyboard.JustDown(this.cheatKey) && this.cheatKey.shiftKey) {
      this._handleCheatHotkey();
    }

    if (this.portal) this.portal.update(time, delta);
    if (this.glitch) this.glitch.update(delta);
    if (this.powerUps) this.powerUps.update(delta);
    this._updateAudioReactive(delta);

    // Speed boost tracking
    const boostExpired = GameManager.updateSpeedBoost(delta);
    if (boostExpired) {
      this.events.emit('speed-boost-changed', false);
      this.onSpeedBoostEnd();
    }
    if (GameManager.state.speedBoostActive && !this._prevBoostState) {
      this.onSpeedBoostStart();
      this.showBoostFlash();
    }
    this._prevBoostState = GameManager.state.speedBoostActive;

    // Hack tracking
    const hackExpired = GameManager.updateHack(delta);
    if (hackExpired) {
      this.onHackEnd();
    }
    if (GameManager.state.hackActive && !this._prevHackState) {
      this.onHackStart();
    }
    this._prevHackState = GameManager.state.hackActive;

    // Mutation fog update
    const ms = GameManager.mutationSystem;
    if (ms.visibilityRadius > 0 && this._playerPos) {
      ms.updateFog(this, this._playerPos.x, this._playerPos.y);
    }
  }

  _handleCheatHotkey() {
    if (this.scene.isActive('CheatMenuScene')) return;
    this.scene.pause();
    this.scene.launch('CheatMenuScene', { parentScene: this.sceneKey });
  }

  setPlayerPosition(x, y) {
    this._playerPos = { x, y };
    AudioBackground.setFocus(this.sceneKey, x, y);
    this._updateForegroundParallax(x, y);
  }

  _updateForegroundParallax(x, y) {
    if (!this.cameras?.main) return;
    const nx = Phaser.Math.Clamp(((x / GAME_WIDTH) - 0.5) * 2, -1, 1);
    const ny = Phaser.Math.Clamp(((y / GAME_HEIGHT) - 0.5) * 2, -1, 1);
    this._foregroundFocus.x = Phaser.Math.Linear(this._foregroundFocus.x, nx, 0.08);
    this._foregroundFocus.y = Phaser.Math.Linear(this._foregroundFocus.y, ny, 0.08);

    const fx = this._foregroundFocus.x;
    const fy = this._foregroundFocus.y;
    const cam = this.cameras.main;

    if (this.modernist) {
      cam.setRotation(0);
      cam.setZoom(1);
      cam.centerOn(GAME_WIDTH / 2, GAME_HEIGHT / 2);
      this._updateCanvasPerspective(0, 0);
      return;
    }

    cam.setRotation(fx * 0.025);
    cam.setZoom(1.015 + (Math.abs(fx) + Math.abs(fy)) * 0.012);
    cam.centerOn(
      GAME_WIDTH / 2 + fx * 18,
      GAME_HEIGHT / 2 + fy * 12,
    );

    this._updateCanvasPerspective(fx, fy);
  }

  _updateCanvasPerspective(fx, fy) {
    const canvas = this.game?.canvas;
    if (!canvas) return;
    const mirrorScale = this._mutMirror ? -1 : 1;
    canvas.style.transformOrigin = '50% 50%';
    canvas.style.willChange = 'transform';

    if (this.modernist) {
      canvas.style.transformStyle = 'flat';
      canvas.style.transform = `scaleX(${mirrorScale})`;
      return;
    }

    const depth = (Math.abs(fx) + Math.abs(fy)) * 18;
    canvas.style.transformStyle = 'preserve-3d';
    canvas.style.transform = [
      'perspective(900px)',
      `scaleX(${mirrorScale})`,
      `rotateX(${(-fy * 8).toFixed(3)}deg)`,
      `rotateY(${(fx * 10).toFixed(3)}deg)`,
      `translateZ(${depth.toFixed(2)}px)`,
      `translate(${(-fx * 8).toFixed(2)}px, ${(fy * 6).toFixed(2)}px)`,
    ].join(' ');
  }

  shakeCamera(intensity = 0.005, duration = 150) {
    try {
      this.cameras.main.shake(duration, intensity);
    } catch (_) { /* safe */ }
  }

  onSpeedBoostStart() {
    SFX.boost();
    this.shakeCamera(0.006, 200);
  }
  onSpeedBoostEnd() {}

  showBoostFlash() {
    const x = GAME_WIDTH / 2;
    const y = GAME_HEIGHT / 2 - 40;
    const color = this.modernist ? cssColor(this.palette.vermilion) : '#ff6e00';
    const flash = this.add.text(x, y, 'SPEED BOOST!', {
      fontSize: this.modernist ? '28px' : '24px',
      fontFamily: this.modernist ? this.fonts.display : this.fonts.ui,
      color,
    }).setOrigin(0.5).setDepth(200).setAlpha(0);

    if (this.modernist) {
      flash.setStroke(cssColor(this.palette.ink), 1);
    } else {
      NeonGlow.applyTextGlow(this, flash, COLORS.NEON_ORANGE);
    }

    // Rubber-stamp rule under the text in modernist
    let rule = null;
    if (this.modernist) {
      rule = this.add.graphics().setDepth(200).setAlpha(0);
      rule.lineStyle(2, this.palette.vermilion, 1);
      rule.lineBetween(x - 80, y + 14, x + 80, y + 14);
    }

    this.tweens.add({
      targets: rule ? [flash, rule] : flash,
      alpha: { from: 0, to: 1 }, y: y - 30, scale: { from: 0.5, to: 1.2 },
      duration: 400, ease: 'Back.easeOut',
      onComplete: () => {
        this.tweens.add({
          targets: rule ? [flash, rule] : flash,
          alpha: 0, y: y - 50,
          duration: 600, delay: 400,
          onComplete: () => { flash.destroy(); if (rule) rule.destroy(); },
        });
      }
    });
  }

  tryActivateHack() {
    if (GameManager.activateHack()) {
      this.onHackStart();
    } else {
      this.showHackDenied();
    }
  }

  showHackDenied() {
    const charge = GameManager.state.hackCharge || 0;
    const pct = Math.floor((charge / HACK_CONFIG.MAX_CHARGE) * 100);
    const color = this.modernist ? cssColor(this.palette.vermilion) : '#ff1744';
    const txt = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 40, `HACK CHARGE: ${pct}%`, {
      fontSize: '16px',
      fontFamily: this.modernist ? this.fonts.ui : this.fonts.mono,
      color,
    }).setOrigin(0.5).setDepth(300).setAlpha(0);
    if (this.modernist) {
      txt.setStroke(cssColor(this.palette.ink), 1);
    }

    this.tweens.add({
      targets: txt,
      alpha: { from: 0, to: 1 },
      y: txt.y - 15,
      duration: 300,
      onComplete: () => {
        this.tweens.add({
          targets: txt,
          alpha: 0,
          duration: 500,
          delay: 600,
          onComplete: () => txt.destroy(),
        });
      }
    });
  }

  onHackStart() {
    SFX.boost();
    GlitchEffect.chromaticAberration(this, 600);

    if (this.modernist) {
      // Print-context overlay: a faint paper wash + vermilion top/bottom rule.
      // No additive blend, no neon glow — reads like an "OVERRIDE" rubber stamp
      // applied to the whole page.
      const overlay = this.add.graphics().setDepth(250);
      overlay.fillStyle(this.palette.paper, 0.08);
      overlay.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
      overlay.lineStyle(2, this.palette.vermilion, 0.9);
      overlay.lineBetween(0, 34, GAME_WIDTH, 34);
      overlay.lineBetween(0, GAME_HEIGHT - 34, GAME_WIDTH, GAME_HEIGHT - 34);
      this._hackOverlay = overlay;

      const txt = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 60, 'ACCESS GRANTED', {
        fontSize: '32px', fontFamily: this.fonts.display,
        color: cssColor(this.palette.ink),
      }).setOrigin(0.5).setDepth(300).setAlpha(0);
      txt.setStroke(cssColor(this.palette.paper), 2);

      const rule = this.add.graphics().setDepth(300).setAlpha(0);
      rule.lineStyle(2, this.palette.vermilion, 1);
      rule.lineBetween(GAME_WIDTH / 2 - 90, GAME_HEIGHT / 2 - 40, GAME_WIDTH / 2 + 90, GAME_HEIGHT / 2 - 40);

      this.tweens.add({
        targets: [txt, rule],
        alpha: { from: 0, to: 1 }, scale: { from: 0.5, to: 1 },
        duration: 400,
        onComplete: () => {
          this.tweens.add({
            targets: [txt, rule], alpha: 0, y: '-=20',
            duration: 500, delay: 600,
            onComplete: () => { txt.destroy(); rule.destroy(); },
          });
        }
      });

      this.events.emit('hack-changed');
      return;
    }

    const overlay = this.add.rectangle(
      GAME_WIDTH / 2, GAME_HEIGHT / 2,
      GAME_WIDTH, GAME_HEIGHT,
      COLORS.NEON_CYAN, 0.08
    ).setDepth(250).setBlendMode(Phaser.BlendModes.ADD);
    this._hackOverlay = overlay;

    const txt = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 60, 'ACCESS GRANTED', {
      fontSize: '28px', fontFamily: this.fonts.ui, color: '#39ff14',
    }).setOrigin(0.5).setDepth(300).setAlpha(0);
    NeonGlow.applyTextGlow(this, txt, COLORS.NEON_GREEN);

    this.tweens.add({
      targets: txt,
      alpha: { from: 0, to: 1 }, scale: { from: 0.5, to: 1 },
      duration: 400,
      onComplete: () => {
        this.tweens.add({
          targets: txt, alpha: 0, y: txt.y - 20,
          duration: 500, delay: 600,
          onComplete: () => txt.destroy(),
        });
      }
    });

    this.events.emit('hack-changed');
  }

  onHackEnd() {
    if (this._hackOverlay) {
      this._hackOverlay.destroy();
      this._hackOverlay = null;
    }
    this.events.emit('hack-changed');
  }

  onPortalForceSpawn() {
    this.portal.spawnPortal(GAME_WIDTH / 2, GAME_HEIGHT / 2);
  }

  triggerPortal(x, y) {
    this.portal.spawnPortal(x, y);
    this.shakeCamera(0.005, 300);
    this.showPortalHint();
    if (this.modernist) this._spawnPortalHalftoneStamp(x, y);
  }

  // Print-native arrival stamp: a halftone field expands outward from the
  // portal spawn point, then fades — a rubber-stamp accent in place of the
  // neon overlay rectangle.
  _spawnPortalHalftoneStamp(x, y) {
    try {
      const field = PosterSceneFX.drawHalftoneField(this, x, y, 60, {
        rings: 8,
        depth: 95,
        alpha: 0.55,
      });
      if (!field || !field.graphics) return;
      const tick = { s: 0.3, b: 0.25 };
      this.tweens.add({
        targets: tick,
        s: 1.35, b: 0,
        duration: 700, ease: 'Cubic.easeOut',
        onUpdate: () => field.draw(tick.s, tick.b),
        onComplete: () => {
          this.tweens.add({
            targets: field.graphics,
            alpha: 0, duration: 350,
            onComplete: () => { try { field.graphics.destroy(); } catch (_) {} },
          });
        },
      });
    } catch (_) { /* safe */ }
  }

  showPortalHint() {
    this._showHintText('▸ REACH THE PORTAL ▸');
  }

  _showHintText(msg) {
    if (this._portalHint) { try { this._portalHint.destroy(); } catch (_) {} }
    const color = this.modernist ? cssColor(this.palette.vermilion) : '#b845ff';
    this._portalHint = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 16, msg, {
      fontSize: '13px',
      fontFamily: this.modernist ? this.fonts.ui : this.fonts.mono,
      color,
    }).setOrigin(0.5).setDepth(200);
    if (this.modernist) {
      this._portalHint.setStroke(cssColor(this.palette.ink), 1);
    }
    this.tweens.add({
      targets: this._portalHint,
      alpha: { from: 1, to: 0.3 },
      duration: 1000,
      yoyo: true,
      repeat: -1,
    });
  }

  tryEnterPortal(playerX, playerY) {
    if (this.portal.checkOverlap(playerX, playerY)) {
      this.enterPortal();
      return true;
    }
    return false;
  }

  enterPortal() {
    this._ending = true;
    this.portal.enterPortal(() => {
      GameManager.save();
      GameManager.addPermanentCoins(Math.floor(GameManager.state.coins * 0.1));
      const nextScene = GameManager.advanceToNextGame();

      try { GameManager.mutationSystem.cleanupScene(this); } catch (_) {}
      try { this.scene.sleep('HUDScene'); } catch (_) {}
      try { this.scene.sleep('CRTOverlay'); } catch (_) {}

      if (GameManager.storyComplete) {
        this.scene.start('VictoryScene');
      } else {
        this.scene.start('ModSelectScene', { from: this.sceneKey, to: nextScene });
      }
    });
  }

  skipToNextGame() {
    if (this._ending) return;
    this._ending = true;

    SFX.portalEnter();
    this.cameras.main.fadeOut(500, 10, 10, 26);
    this.time.delayedCall(550, () => {
      GameManager.save();
      const nextScene = GameManager.advanceToNextGame();

      this._cleanupBeforeTransition();

      if (GameManager.storyComplete) {
        this.scene.start('VictoryScene');
      } else {
        this.scene.start('ModSelectScene', { from: this.sceneKey, to: nextScene });
      }
    });
  }

  onPlayerDeath() {
    SFX.death();
    this.shakeCamera(0.012, 250);
    const alive = GameManager.loseLife();
    this.events.emit('lives-changed', GameManager.state.lives);
    if (!alive) {
      this._ending = true;
      this.cameras.main.fadeOut(600, 10, 10, 26);
      this.time.delayedCall(700, () => {
        this._cleanupBeforeTransition();
        this.scene.start('GameOverScene');
      });
      return false;
    }
    return true;
  }

  _ensureOverlayRunning(key) {
    try {
      if (this.scene.isSleeping(key)) {
        this.scene.wake(key);
      } else if (!this.scene.isActive(key)) {
        this.scene.launch(key);
      }
    } catch (_) { /* safe */ }
  }

  _cleanupBeforeTransition() {
    try {
      GameManager.mutationSystem.cleanupScene(this);
    } catch (_) { /* safe */ }
    try { this.scene.sleep('HUDScene'); } catch (_) {}
    try { this.scene.sleep('CRTOverlay'); } catch (_) {}
  }

  _showCombo(count, worldX, worldY) {
    const x = worldX != null ? worldX : GAME_WIDTH / 2;
    const y = worldY != null ? worldY - 20 : GAME_HEIGHT / 2 - 30;

    const size = count >= 5 ? '22px' : count >= 3 ? '18px' : '14px';
    let color;
    if (this.modernist) {
      // Tiered ink stamp — vermilion for the saturated tier, ink/mustard below.
      color = count >= 5
        ? cssColor(this.palette.vermilion)
        : count >= 3 ? cssColor(this.palette.mustard) : cssColor(this.palette.ink);
    } else {
      color = count >= 5 ? '#ff00e6' : count >= 3 ? '#ff6e00' : '#00f0ff';
    }
    const suffix = count >= 5 ? '!!' : count >= 3 ? '!' : '';
    const label = count >= 5 ? 'MAX COMBO' : 'COMBO';

    const txt = this.add.text(x, y, `x${count} ${label}${suffix}`, {
      fontSize: size,
      fontFamily: this.modernist ? this.fonts.display : this.fonts.ui,
      color,
    }).setOrigin(0.5).setDepth(400).setAlpha(0);

    if (this.modernist) {
      // 1px ink outline for a print-stamp read at every tier.
      txt.setStroke(cssColor(this.palette.ink), 1);
    }

    this.tweens.add({
      targets: txt,
      alpha: { from: 0, to: 1 },
      y: y - 25,
      scale: { from: 0.6, to: 1.1 },
      duration: 250,
      ease: 'Back.easeOut',
      onComplete: () => {
        this.tweens.add({
          targets: txt,
          alpha: 0, y: txt.y - 15,
          duration: 400, delay: 300,
          onComplete: () => txt.destroy(),
        });
      }
    });

    if (count >= 3) this.shakeCamera(0.003, 100);
  }

  _showScorePopup(points, worldX, worldY) {
    if (!worldX && !worldY) return;
    const x = worldX || GAME_WIDTH / 2;
    const y = worldY || GAME_HEIGHT / 2;
    const color = this.modernist ? cssColor(this.palette.ink) : '#00f0ff';

    const txt = this.add.text(x, y, `+${points}`, {
      fontSize: '13px', fontFamily: this.fonts.mono, color,
    }).setOrigin(0.5).setDepth(350).setAlpha(0.9);

    this.tweens.add({
      targets: txt,
      alpha: 0,
      y: y - 30,
      duration: 600,
      ease: 'Power2',
      onComplete: () => txt.destroy(),
    });
  }

  _updateAudioReactive(delta) {
    AudioReactive.update(delta);
    const ar = AudioReactive;

    if (!this._audioReactiveDebugLogged && ar._connected) {
      this._audioReactiveDebugLogged = true;
      console.log('[AudioReactive] scene update active', {
        scene: this.sceneKey,
        connected: ar._connected,
      });
    }

    if (ar.isBeat) {
      const intensity = AR.BEAT_CAMERA_SHAKE * ar.beatIntensity;
      this.cameras.main.shake(100, intensity);
    }

    if (this._gridGfx) {
      const target = Phaser.Math.Linear(AR.BASS_GRID_ALPHA_MIN, AR.BASS_GRID_ALPHA_MAX, ar.bassSmooth);
      if (Math.abs(target - this._gridAlpha) > 0.01) {
        this._gridAlpha = target;
        this._drawGridLines(target);
      }
    }
  }

  shutdown() {
    try {
      const canvas = this.game?.canvas;
      if (canvas) {
        canvas.style.transform = '';
        canvas.style.transformOrigin = '';
        canvas.style.transformStyle = '';
        canvas.style.willChange = '';
      }
    } catch (_) { /* safe */ }
    try {
      if (this.portal) { this.portal.destroy(); this.portal = null; }
    } catch (_) { this.portal = null; }
    try {
      if (this.glitch) { this.glitch.destroy(); this.glitch = null; }
    } catch (_) { this.glitch = null; }
    try {
      if (this.powerUps) { this.powerUps.destroy(); this.powerUps = null; }
    } catch (_) { this.powerUps = null; }
    try {
      if (this._portalHint) { this._portalHint.destroy(); this._portalHint = null; }
    } catch (_) { this._portalHint = null; }
    try {
      if (this._dataStreamItems) {
        this._dataStreamItems.forEach(d => { try { d.obj.destroy(); } catch (_) {} });
        this._dataStreamItems = null;
      }
    } catch (_) {}
    try {
      GameManager.mutationSystem.cleanupScene(this);
    } catch (_) { /* safe */ }
  }
}
