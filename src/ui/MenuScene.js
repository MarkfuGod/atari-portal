import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS, GAME_ORDER, GAME_NAMES, AUDIO_REACTIVE as AR } from '../config.js';
import { GameManager } from '../core/GameManager.js';
import SFX from '../core/SFXManager.js';
import BGM from '../core/AudioManager.js';
import AudioReactive from '../core/AudioReactiveSystem.js';
import NeonGlow from '../vfx/NeonGlow.js';
import AudioBackground from '../vfx/AudioBackground.js';

const cyan = '#00f0ff';
const magenta = '#ff00e6';
const purple = '#b845ff';
const green = '#39ff14';

const SPECTRUM_BARS = 64;
const SPECTRUM_CX = GAME_WIDTH / 2;
const SPECTRUM_CY = 210;
const SPECTRUM_BASE_RADIUS = 45;
const SPECTRUM_MAX_BAR = 55;
const SPECTRUM_BAR_WIDTH = 3;

export class MenuScene extends Phaser.Scene {
  constructor() {
    super('MenuScene');
  }

  create() {
    this.cameras.main.fadeIn(500);
    this.cameras.main.setBackgroundColor(COLORS.BG_DARK);
    BGM.playForScene(this, 'MenuScene');
    AudioBackground.setScene('MenuScene');
    this.levelSelectOpen = false;
    this.levelSelectItems = [];
    this.shopOpen = false;
    this.shopItems = [];

    try {
      if (this.scene.isSleeping('CRTOverlay')) {
        this.scene.wake('CRTOverlay');
      } else if (!this.scene.isActive('CRTOverlay')) {
        this.scene.launch('CRTOverlay');
      }
    } catch (_) { /* safe */ }

    const cx = GAME_WIDTH / 2;

    this.drawGridBackground();
    this._initSpectrumRing();
    this.drawDataStreams();

    this.titleText = this.add.text(cx, 60, 'ATARI PORTAL', {
      fontSize: '44px', fontFamily: 'monospace', color: magenta,
    }).setOrigin(0.5).setDepth(10);
    NeonGlow.applyTextGlow(this, this.titleText, COLORS.NEON_MAGENTA);
    this._beatTitleActive = false;

    this.tweens.add({
      targets: this.titleText,
      alpha: { from: 0.7, to: 1 },
      duration: 1500, yoyo: true, repeat: -1,
    });

    const subtitle = this.add.text(cx, 115, 'SYSTEM BREACH DETECTED...', {
      fontSize: '13px', fontFamily: 'monospace', color: cyan,
    }).setOrigin(0.5).setAlpha(0).setDepth(10);

    this.typewriterEffect(subtitle, 'SYSTEM BREACH DETECTED...', 40);

    this.add.text(cx, 138, 'v2.0 // CYBERPUNK EDITION', {
      fontSize: '10px', fontFamily: 'monospace', color: purple,
    }).setOrigin(0.5).setAlpha(0.5).setDepth(10);

    this.createButton(cx, 370, '> STORY MODE', () => this.startGame('story'));
    this.createButton(cx, 410, '> ARCADE MODE', () => this.startGame('arcade'));
    this.createButton(cx, 450, '> LEVEL SELECT', () => this.toggleLevelSelect());
    this.createButton(cx, 490, '> UPGRADES', () => this.openUpgradeShop());

    const hs = GameManager.getHighScore();
    if (hs > 0) {
      this.add.text(cx, 530, `BEST: ${String(hs).padStart(7, '0')}`, {
        fontSize: '13px', fontFamily: 'monospace', color: '#444466',
      }).setOrigin(0.5).setDepth(10);
    }

    this.add.text(cx, GAME_HEIGHT - 20, 'ARROWS/WASD: MOVE | SPACE: ACTION | H: HACK | N: SKIP | ESC: PAUSE', {
      fontSize: '10px', fontFamily: 'monospace', color: '#333355',
    }).setOrigin(0.5).setDepth(10);

    const borderG = this.add.graphics().setDepth(10);
    NeonGlow.cornerAccents(borderG, 10, 10, GAME_WIDTH - 20, GAME_HEIGHT - 20, 20, COLORS.NEON_CYAN, 1);

    this._spectrumColors = [];
    const cC = Phaser.Display.Color.ValueToColor(COLORS.NEON_CYAN);
    const cM = Phaser.Display.Color.ValueToColor(COLORS.NEON_MAGENTA);
    for (let i = 0; i < SPECTRUM_BARS; i++) {
      const t = i / (SPECTRUM_BARS - 1);
      this._spectrumColors.push(Phaser.Display.Color.GetColor(
        Phaser.Math.Linear(cC.red, cM.red, t),
        Phaser.Math.Linear(cC.green, cM.green, t),
        Phaser.Math.Linear(cC.blue, cM.blue, t),
      ));
    }

    this._gridAlpha = 0.25;
  }

  // ─── Audio-reactive update loop ───────────────────────────────

  update(_time, delta) {
    AudioReactive.update(delta);
    const ar = AudioReactive;
    if (!ar._connected) return;

    this._updateSpectrumRing(ar);
    this._updateGrid(ar);
    this._updateTitle(ar);

    if (ar.isBeat) {
      this._spawnBeatBurst(ar.beatIntensity);
      this.cameras.main.shake(100, AR.BEAT_CAMERA_SHAKE * ar.beatIntensity);
    }
  }

  // ─── Spectrum ring ────────────────────────────────────────────

  _initSpectrumRing() {
    this._spectrumGfx = this.add.graphics().setDepth(2);
    this._ringGlowGfx = this.add.graphics().setDepth(1);
    this._drawRingGlow(SPECTRUM_BASE_RADIUS, 0.15);

    this._spectrumParticles = [];
    for (let i = 0; i < 16; i++) {
      const angle = (Math.PI * 2 * i) / 16;
      const r = SPECTRUM_BASE_RADIUS + 8;
      const color = [COLORS.NEON_CYAN, COLORS.NEON_MAGENTA, COLORS.NEON_PURPLE][i % 3];
      const p = this.add.circle(
        SPECTRUM_CX + Math.cos(angle) * r,
        SPECTRUM_CY + Math.sin(angle) * r,
        1 + Math.random() * 1.5, color, 0.5
      ).setDepth(3);
      this._spectrumParticles.push(p);
      this.tweens.add({
        targets: p,
        angle: 360,
        x: { value: `+=${Math.cos(angle + 0.3) * 4}`, duration: 8000, yoyo: true, repeat: -1 },
        y: { value: `+=${Math.sin(angle + 0.3) * 4}`, duration: 8000, yoyo: true, repeat: -1 },
        alpha: { from: 0.3, to: 0.7, duration: 2000 + Math.random() * 2000, yoyo: true, repeat: -1 },
      });
    }
  }

  _drawRingGlow(radius, alpha) {
    const g = this._ringGlowGfx;
    g.clear();
    g.lineStyle(8, COLORS.NEON_PURPLE, alpha * 0.2);
    g.strokeCircle(SPECTRUM_CX, SPECTRUM_CY, radius + 6);
    g.lineStyle(4, COLORS.NEON_CYAN, alpha * 0.4);
    g.strokeCircle(SPECTRUM_CX, SPECTRUM_CY, radius);
    g.lineStyle(1, COLORS.NEON_MAGENTA, alpha * 0.8);
    g.strokeCircle(SPECTRUM_CX, SPECTRUM_CY, radius - 3);
  }

  _updateSpectrumRing(ar) {
    const g = this._spectrumGfx;
    g.clear();

    if (!ar._freqData) return;

    const freqData = ar._freqData;
    const binCount = freqData.length;
    const binsPerBar = Math.max(1, Math.floor(binCount / SPECTRUM_BARS));
    const radius = SPECTRUM_BASE_RADIUS + ar.bassSmooth * 14;

    this._drawRingGlow(radius, 0.15 + ar.energy * 0.5);

    for (let i = 0; i < SPECTRUM_BARS; i++) {
      let val = 0;
      for (let b = 0; b < binsPerBar; b++) {
        val += freqData[i * binsPerBar + b];
      }
      val = val / binsPerBar / 255;

      const angle = (Math.PI * 2 * i) / SPECTRUM_BARS - Math.PI / 2;
      const barLen = val * SPECTRUM_MAX_BAR;
      if (barLen < 1) continue;

      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      const x1 = SPECTRUM_CX + cos * radius;
      const y1 = SPECTRUM_CY + sin * radius;
      const x2 = SPECTRUM_CX + cos * (radius + barLen);
      const y2 = SPECTRUM_CY + sin * (radius + barLen);
      const color = this._spectrumColors[i];
      const alpha = 0.35 + val * 0.65;

      g.lineStyle(SPECTRUM_BAR_WIDTH + 4, color, alpha * 0.15);
      g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.strokePath();

      g.lineStyle(SPECTRUM_BAR_WIDTH, color, alpha);
      g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.strokePath();
    }

    for (let i = 0; i < this._spectrumParticles.length; i++) {
      this._spectrumParticles[i].setAlpha(0.25 + ar.energy * 0.75);
    }
  }

  // ─── Beat burst ───────────────────────────────────────────────

  _spawnBeatBurst(intensity) {
    const count = 6 + Math.floor(intensity * 8);
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 50 + Math.random() * 90;
      const color = [COLORS.NEON_CYAN, COLORS.NEON_MAGENTA, COLORS.NEON_PURPLE][Math.floor(Math.random() * 3)];
      const size = 1 + Math.random() * 2.5;
      const p = this.add.circle(SPECTRUM_CX, SPECTRUM_CY, size, color, 0.7 + intensity * 0.3).setDepth(4);
      this.tweens.add({
        targets: p,
        x: SPECTRUM_CX + Math.cos(angle) * dist,
        y: SPECTRUM_CY + Math.sin(angle) * dist,
        alpha: 0,
        scale: 0.2,
        duration: 350 + Math.random() * 350,
        ease: 'Quad.easeOut',
        onComplete: () => p.destroy(),
      });
    }
  }

  // ─── Bass-pulsing grid ────────────────────────────────────────

  drawGridBackground() {
    this._gridGfx = this.add.graphics();
    this._drawGrid(0.25);
  }

  _drawGrid(alpha) {
    const g = this._gridGfx;
    g.clear();
    g.lineStyle(1, COLORS.GRID_LINE, alpha);
    for (let x = 0; x < GAME_WIDTH; x += 40) {
      g.strokeLineShape(new Phaser.Geom.Line(x, 0, x, GAME_HEIGHT));
    }
    for (let y = 0; y < GAME_HEIGHT; y += 40) {
      g.strokeLineShape(new Phaser.Geom.Line(0, y, GAME_WIDTH, y));
    }
  }

  _updateGrid(ar) {
    const target = Phaser.Math.Linear(0.08, 0.35, ar.bassSmooth);
    if (Math.abs(target - this._gridAlpha) > 0.008) {
      this._gridAlpha = target;
      this._drawGrid(target);
    }
  }

  // ─── Beat-reactive title ──────────────────────────────────────

  _updateTitle(ar) {
    if (!ar.isBeat || this._beatTitleActive) return;

    this._beatTitleActive = true;
    this.tweens.add({
      targets: this.titleText,
      scaleX: 1.07, scaleY: 1.07,
      duration: 80,
      yoyo: true,
      ease: 'Quad.easeOut',
      onComplete: () => {
        this.titleText.setScale(1);
        this._beatTitleActive = false;
      }
    });

    if (ar.bass > ar.mid && ar.bass > ar.treble) {
      this.titleText.setColor(magenta);
      NeonGlow.applyTextGlow(this, this.titleText, COLORS.NEON_MAGENTA);
    } else if (ar.mid > ar.treble) {
      this.titleText.setColor(purple);
      NeonGlow.applyTextGlow(this, this.titleText, COLORS.NEON_PURPLE);
    } else {
      this.titleText.setColor(cyan);
      NeonGlow.applyTextGlow(this, this.titleText, COLORS.NEON_CYAN);
    }
  }

  // ─── Enhanced data streams ────────────────────────────────────

  drawDataStreams() {
    const chars = '01';
    for (let col = 0; col < 5; col++) {
      const x = 20 + col * ((GAME_WIDTH - 40) / 4) + Math.random() * 40;
      for (let i = 0; i < 8; i++) {
        const ch = chars[Math.floor(Math.random() * chars.length)];
        const txt = this.add.text(x, -10 - i * 16, ch, {
          fontSize: '12px', fontFamily: 'monospace', color: green,
        }).setAlpha(0.2).setDepth(0);
        this.tweens.add({
          targets: txt,
          y: GAME_HEIGHT + 10,
          alpha: { from: 0.2, to: 0 },
          duration: 4500 + Math.random() * 4000,
          delay: Math.random() * 5000 + i * 180,
          repeat: -1,
        });
      }
    }
  }

  // ─── UI helpers (unchanged) ───────────────────────────────────

  typewriterEffect(textObj, fullText, charDelay) {
    let i = 0;
    textObj.setText('');
    textObj.setAlpha(1);
    this.time.addEvent({
      delay: charDelay,
      repeat: fullText.length - 1,
      callback: () => {
        i++;
        textObj.setText(fullText.substring(0, i));
      }
    });
  }

  createButton(x, y, label, callback) {
    const txt = this.add.text(x, y, label, {
      fontSize: '18px', fontFamily: 'monospace', color: '#ffffff',
    }).setOrigin(0.5).setDepth(10).setInteractive({ useHandCursor: true });

    txt.on('pointerover', () => {
      txt.setColor(cyan);
      NeonGlow.applyTextGlow(this, txt, COLORS.NEON_CYAN);
      SFX.menuSelect();
    });
    txt.on('pointerout', () => {
      txt.setColor('#ffffff');
      txt.setStyle({ ...txt.style, shadow: {} });
    });
    txt.on('pointerdown', callback);
    return txt;
  }

  toggleLevelSelect() {
    if (this.levelSelectOpen) {
      this.levelSelectItems.forEach(item => item.destroy());
      this.levelSelectItems = [];
      this.levelSelectOpen = false;
      return;
    }

    this.levelSelectOpen = true;
    const cx = GAME_WIDTH / 2;
    const panelH = GAME_ORDER.length * 30 + 60;
    const panelY = GAME_HEIGHT / 2;
    const topY = panelY - panelH / 2;

    const bg = this.add.rectangle(cx, panelY, 340, panelH, COLORS.HUD_BG, 0.95).setDepth(100);
    const borderG = this.add.graphics().setDepth(100);
    NeonGlow.strokeRect(borderG, cx - 170, topY, 340, panelH, COLORS.NEON_CYAN, 1, 0.4);
    this.levelSelectItems.push(bg, borderG);

    const header = this.add.text(cx, topY + 14, '// LEVEL SELECT', {
      fontSize: '13px', fontFamily: 'monospace', color: cyan,
    }).setOrigin(0.5).setDepth(101);
    this.levelSelectItems.push(header);

    GAME_ORDER.forEach((sceneKey, i) => {
      const name = GAME_NAMES[sceneKey];
      const y = topY + 40 + i * 30;
      const txt = this.add.text(cx, y, `${i + 1}. ${name}`, {
        fontSize: '13px', fontFamily: 'monospace', color: '#7777aa',
      }).setOrigin(0.5).setDepth(101).setInteractive({ useHandCursor: true });

      txt.on('pointerover', () => { txt.setColor(cyan); SFX.menuSelect(); });
      txt.on('pointerout', () => txt.setColor('#7777aa'));
      txt.on('pointerdown', () => this.startDebugGame(sceneKey, i));
      this.levelSelectItems.push(txt);
    });

    const closeBtn = this.add.text(cx, topY + panelH - 16, '> CLOSE', {
      fontSize: '12px', fontFamily: 'monospace', color: '#ff1744',
    }).setOrigin(0.5).setDepth(101).setInteractive({ useHandCursor: true });
    closeBtn.on('pointerdown', () => {
      this.levelSelectItems.forEach(item => item.destroy());
      this.levelSelectItems = [];
      this.levelSelectOpen = false;
    });
    this.levelSelectItems.push(closeBtn);
  }

  openUpgradeShop() {
    if (this.shopOpen) {
      this.shopItems.forEach(item => item.destroy());
      this.shopItems = [];
      this.shopOpen = false;
      return;
    }
    this.shopOpen = true;
    this.shopItems = [];

    const cx = GAME_WIDTH / 2;
    const bg = this.add.rectangle(cx, 350, 500, 280, COLORS.HUD_BG, 0.95).setDepth(100);
    const borderG = this.add.graphics().setDepth(100);
    NeonGlow.strokeRect(borderG, cx - 250, 210, 500, 280, COLORS.NEON_PURPLE, 1, 0.5);
    this.shopItems.push(bg, borderG);

    const title = this.add.text(cx, 225, '// PERMANENT UPGRADES', {
      fontSize: '14px', fontFamily: 'monospace', color: '#b845ff',
    }).setOrigin(0.5).setDepth(101);
    this.shopItems.push(title);

    const permCoins = GameManager.getPermanentCoins();
    const coinLabel = this.add.text(cx, 248, `CREDITS: ${permCoins}`, {
      fontSize: '12px', fontFamily: 'monospace', color: '#ffd700',
    }).setOrigin(0.5).setDepth(101);
    this.shopItems.push(coinLabel);

    const ups = GameManager.state.permanentUpgrades;
    const upgrades = [
      { key: 'startLives', name: '+1 START LIFE', cost: 50, max: 3, current: ups.startLives || 0 },
      { key: 'hackBoost', name: 'HACK CHARGE +20%', cost: 40, max: 5, current: ups.hackBoost || 0 },
      { key: 'modQuality', name: 'BETTER MODS', cost: 60, max: 3, current: ups.modQuality || 0 },
      { key: 'glitchResist', name: 'GLITCH RESIST', cost: 45, max: 3, current: ups.glitchResist || 0 },
    ];

    upgrades.forEach((up, i) => {
      const y = 280 + i * 38;
      const maxed = up.current >= up.max;
      const canAfford = permCoins >= up.cost;
      const color = maxed ? '#333355' : (canAfford ? '#39ff14' : '#555577');

      const label = this.add.text(cx - 180, y, `${up.name} [${up.current}/${up.max}]`, {
        fontSize: '12px', fontFamily: 'monospace', color: color,
      }).setDepth(101);
      this.shopItems.push(label);

      if (!maxed) {
        const btn = this.add.text(cx + 140, y, `[${up.cost} CR]`, {
          fontSize: '12px', fontFamily: 'monospace', color: canAfford ? '#39ff14' : '#444',
        }).setOrigin(0.5, 0).setDepth(101).setInteractive({ useHandCursor: canAfford });

        if (canAfford) {
          btn.on('pointerover', () => btn.setColor('#00f0ff'));
          btn.on('pointerout', () => btn.setColor('#39ff14'));
          btn.on('pointerdown', () => {
            if (GameManager.buyPermanentUpgrade(up.key, up.cost)) {
              SFX.shopBuy();
              this.shopItems.forEach(item => item.destroy());
              this.shopItems = [];
              this.shopOpen = false;
              this.openUpgradeShop();
            }
          });
        }
        this.shopItems.push(btn);
      }
    });

    const achTitle = this.add.text(cx, 440, '// CODEX', {
      fontSize: '11px', fontFamily: 'monospace', color: '#00f0ff',
    }).setOrigin(0.5).setDepth(101);
    this.shopItems.push(achTitle);

    const achSys = GameManager.achievementSystem;
    if (achSys) {
      const achText = this.add.text(cx, 460, `${achSys.totalUnlocked}/${achSys.totalAchievements} UNLOCKED`, {
        fontSize: '10px', fontFamily: 'monospace', color: '#555577',
      }).setOrigin(0.5).setDepth(101);
      this.shopItems.push(achText);
    }

    const closeBtn = this.add.text(cx, 485, '> CLOSE', {
      fontSize: '12px', fontFamily: 'monospace', color: '#ff1744',
    }).setOrigin(0.5).setDepth(101).setInteractive({ useHandCursor: true });
    closeBtn.on('pointerdown', () => {
      this.shopItems.forEach(item => item.destroy());
      this.shopItems = [];
      this.shopOpen = false;
    });
    this.shopItems.push(closeBtn);
  }

  startDebugGame(sceneKey, index) {
    SFX.menuStart();
    GameManager.reset();
    GameManager.state.mode = 'arcade';
    GameManager.state.currentGameIndex = index;
    GameManager.state.coins = 10;
    this.cameras.main.fadeOut(400, 10, 10, 26);
    this.time.delayedCall(400, () => {
      this.scene.launch('HUDScene');
      this.scene.launch('CRTOverlay');
      this.scene.start(sceneKey);
    });
  }

  startGame(mode) {
    SFX.menuStart();
    GameManager.reset();
    GameManager.state.mode = mode;
    this.cameras.main.fadeOut(400, 10, 10, 26);
    this.time.delayedCall(400, () => {
      this.scene.launch('HUDScene');
      this.scene.launch('CRTOverlay');
      this.scene.start(GameManager.currentSceneKey);
    });
  }
}
