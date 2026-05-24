import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS, GAME_ORDER, GAME_NAMES, AUDIO_REACTIVE as AR } from '../config.js';
import { GameManager } from '../core/GameManager.js';
import SFX from '../core/SFXManager.js';
import BGM from '../core/AudioManager.js';
import AudioReactive from '../core/AudioReactiveSystem.js';
import NeonGlow from '../vfx/NeonGlow.js';
import AudioBackground from '../vfx/AudioBackground.js';
import { cssColor, getVisualStyle, isModernistStyle, toggleVisualStyle } from '../core/VisualStyle.js';

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
const MENU_BUTTONS = [
  { x: 255, y: 210, label: 'START\nMISSION', theme: 'portal', action: 'story' },
  { x: 545, y: 210, label: 'DATA PURGE\nSTATUS', theme: 'shards', action: 'arcade' },
  { x: 255, y: 390, label: 'FIREWALL\nSETTINGS', theme: 'vortex', action: 'levels' },
  { x: 545, y: 390, label: 'REBOOT', theme: 'burst', action: 'upgrades' },
];

export class MenuScene extends Phaser.Scene {
  constructor() {
    super('MenuScene');
  }

  create() {
    this.cameras.main.fadeIn(500);
    this.visualStyle = getVisualStyle();
    this.palette = this.visualStyle.palette;
    this.modernist = isModernistStyle();
    this.cameras.main.setBackgroundColor(this.palette.terminal);
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

    if (this.modernist) {
      this.createModernistMenu();
      return;
    }

    const cx = GAME_WIDTH / 2;

    this.drawGridBackground();
    this._initSpectrumRing();
    this.drawDataStreams();
    this.drawBinaryPanels();
    this.drawAccessFrame();
    this.drawMenuStage3D();
    this.drawCentralSigil();
    this.drawReadabilityPanels();
    this._menuButtons = [];

    this.titleText = this.add.text(cx, 32, 'SYSTEM ACCESS: CYBER ARCADE', {
      fontSize: '24px',
      fontFamily: 'monospace',
      color: '#eafdff',
      stroke: '#00111a',
      strokeThickness: 4,
    }).setOrigin(0.5).setDepth(42);
    NeonGlow.applyTextGlow(this, this.titleText, COLORS.NEON_MAGENTA);
    this._beatTitleActive = false;

    this.tweens.add({
      targets: this.titleText,
      alpha: { from: 0.7, to: 1 },
      duration: 1500, yoyo: true, repeat: -1,
    });

    const subtitle = this.add.text(cx, 58, '[NEON WANDERER] // AETHELGARD FIREWALL ACCESS TERMINAL // [ACTIVE]', {
      fontSize: '10px',
      fontFamily: 'monospace',
      color: '#d8fbff',
      stroke: '#00111a',
      strokeThickness: 2,
    }).setOrigin(0.5).setAlpha(0).setDepth(41);

    this.typewriterEffect(subtitle, '[NEON WANDERER] // AETHELGARD FIREWALL ACCESS TERMINAL // [ACTIVE]', 18);

    this.add.text(cx, 78, 'v2.0 // NEON RETRO OVERHAUL', {
      fontSize: '10px',
      fontFamily: 'monospace',
      color: '#d9c2ff',
      stroke: '#080014',
      strokeThickness: 2,
    }).setOrigin(0.5).setAlpha(0.85).setDepth(41);

    MENU_BUTTONS.forEach((btn) => {
      const action = () => {
        if (btn.action === 'story') this.startGame('story');
        else if (btn.action === 'arcade') this.startGame('arcade');
        else if (btn.action === 'levels') this.toggleLevelSelect();
        else if (btn.action === 'upgrades') this.openUpgradeShop();
      };
      this._menuButtons.push(this.createButton(btn.x, btn.y, btn.label, action, { theme: btn.theme }));
    });
    this.createStyleSwitchButton(GAME_WIDTH - 122, GAME_HEIGHT - 64);

    const hs = GameManager.getHighScore();
    if (hs > 0) {
      this.add.text(cx, 548, `BEST: ${String(hs).padStart(7, '0')}`, {
        fontSize: '13px', fontFamily: 'monospace', color: '#8b93d1',
      }).setOrigin(0.5).setDepth(10);
    }

    this.add.text(cx, GAME_HEIGHT - 20, 'ARROWS/WASD MOVE | SPACE ACTION | H HACK | N SKIP | ESC PAUSE', {
      fontSize: '10px',
      fontFamily: 'monospace',
      color: '#c9d7ff',
      stroke: '#030712',
      strokeThickness: 2,
    }).setOrigin(0.5).setDepth(41);

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
    this._sigilPulse = 0;
    this._menuFocus = { x: 0, y: 0 };
    this.events.once('shutdown', this.resetMenuPerspective, this);
  }

  createModernistMenu() {
    const p = this.palette;
    const css = this.visualStyle.css;
    this._menuButtons = [];
    this._sigilPulse = 0;
    this._menuFocus = { x: 0, y: 0 };
    this._titleLetters = [];
    this._stars = [];
    this._halftoneDots = [];
    this._dataPoints = [];
    this._beatTitleActive = false;
    this._fujiBeatActive = false;
    this._titleCycleBusy = false;
    this._readyCursorOn = true;

    this.drawPosterBackground();

    this.drawAtariMark(34, 42);
    this.drawWarnerHeader(70, 24);
    this.drawSystemBlock(28, 78);
    this.drawYAxis(10, 138, GAME_HEIGHT - 132);
    this.drawAtariPortalTitle(34, 138);
    this.drawSubtitleStack(34, 310);
    this.drawCx4024Plate(232, 314);
    this.drawShipPlate(220, 360);
    this.drawJoystickBlock(28, 432);

    this.drawCoordinateHeader();
    this.drawConstellation();

    this._halftoneGfx = this.add.graphics().setDepth(3);
    this._portalGfx = this.add.graphics().setDepth(5);
    this._dataPointsGfx = this.add.graphics().setDepth(6);
    this._halftoneCenter = { x: 458, y: 286 };
    this.initHalftoneField(this._halftoneCenter.x, this._halftoneCenter.y, 96);
    this.initDataPoints(this._halftoneCenter.x, this._halftoneCenter.y, 112);
    this.drawHalftoneField(0);
    this.drawPortalRings(this._halftoneCenter.x, this._halftoneCenter.y, 0);
    this.drawDataPoints(0);

    this.drawTerrainGraph(560, 472);
    this.drawEdgeTicks(GAME_WIDTH - 16, 84, 452);
    this.drawPageFurniture();

    const buttonDefs = [
      { label: 'START MISSION',  kicker: '01 / BREACH RUN',    accent: p.vermilion, icon: 'start',  action: () => this.startGame('story') },
      { label: 'ARCADE PURGE',   kicker: '02 / RANDOM SECTOR', accent: p.mustard,   icon: 'arcade', action: () => this.startGame('arcade') },
      { label: 'LAYER SELECT',   kicker: '03 / CHOOSE MODE',   accent: p.cyan,      icon: 'layers', action: () => this.toggleLevelSelect() },
      { label: 'REBOOT / CODEX', kicker: '04 / UPGRADES',      accent: p.violet,    icon: 'codex',  action: () => this.openUpgradeShop() },
    ];
    buttonDefs.forEach((def, i) => {
      const y = 200 + i * 56;
      this._menuButtons.push(this.createPosterButton(688, y, 200, 46, def));
    });

    this.createStyleSwitchButton(116, GAME_HEIGHT - 42);

    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 18, 'ARROWS / WASD MOVE   ·   SPACE ACTION   ·   H HACK   ·   N SKIP   ·   ESC PAUSE', {
      fontSize: '9px',
      fontFamily: 'monospace',
      color: css.muted,
    }).setOrigin(0.5).setDepth(80);

    this.startReadyBlink();
    this.events.once('shutdown', this.resetMenuPerspective, this);
  }

  // ─── Poster background ────────────────────────────────────────

  drawPosterBackground() {
    const p = this.palette;
    const g = this.add.graphics().setDepth(0);

    g.fillStyle(p.terminal, 1);
    g.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    g.fillStyle(p.paper, 1);
    g.fillRect(0, 0, 342, GAME_HEIGHT);

    g.fillStyle(p.paperDark, 0.55);
    for (let i = 0; i < 240; i++) {
      const x = 4 + (i * 47) % 334;
      const y = 6 + Math.floor(i * 31) % (GAME_HEIGHT - 12);
      g.fillRect(x, y, 1, 1);
    }
    g.fillStyle(p.ink, 0.07);
    for (let i = 0; i < 110; i++) {
      const x = 4 + (i * 61) % 334;
      const y = 6 + Math.floor(i * 23) % (GAME_HEIGHT - 12);
      g.fillRect(x, y, 1, 1);
    }

    g.lineStyle(1, p.faint, 0.36);
    for (let x = 360; x < GAME_WIDTH - 6; x += 16) g.lineBetween(x, 78, x, GAME_HEIGHT - 60);
    for (let y = 80; y < GAME_HEIGHT - 60; y += 16) g.lineBetween(360, y, GAME_WIDTH - 8, y);

    g.fillStyle(p.faint, 0.55);
    for (let x = 360; x < GAME_WIDTH - 6; x += 8) {
      for (let y = 80; y < GAME_HEIGHT - 60; y += 8) {
        if (((x / 8) + (y / 8)) % 3 === 0) g.fillRect(x, y, 1, 1);
      }
    }

    g.fillStyle(p.vermilion, 1);
    g.fillRect(342, 0, 2, GAME_HEIGHT);
    g.lineStyle(1, p.paper, 0.35);
    g.lineBetween(346, 0, 346, GAME_HEIGHT);

    g.lineStyle(1, p.paper, 0.32);
    g.strokeRect(354, 22, GAME_WIDTH - 362, GAME_HEIGHT - 44);
    g.lineStyle(1, p.paper, 0.18);
    g.strokeRect(358, 26, GAME_WIDTH - 370, GAME_HEIGHT - 52);
  }

  // ─── Left poster panel ────────────────────────────────────────

  drawWarnerHeader(x, y) {
    const css = this.visualStyle.css;
    this.add.text(x, y, 'ATARI', {
      fontSize: '13px',
      fontFamily: 'monospace',
      color: css.ink,
      fontStyle: 'bold',
    }).setDepth(22);
    this.add.text(x, y + 16, 'A Warner Communications Co.', {
      fontSize: '7px',
      fontFamily: 'monospace',
      color: css.ink,
    }).setAlpha(0.74).setDepth(22);
    this.add.text(x, y + 26, '1972', {
      fontSize: '7px',
      fontFamily: 'monospace',
      color: css.ink,
      fontStyle: 'bold',
    }).setAlpha(0.88).setDepth(22);
  }

  drawAtariMark(x, y) {
    const p = this.palette;
    const g = this.add.graphics().setDepth(22);
    g.x = x;
    g.y = y;
    this._fujiGfx = g;

    const h = 22;
    const outerW = 18;

    g.fillStyle(p.ink, 1);
    g.fillRect(-outerW + 3, -h - 2, outerW * 2 - 6, 2);
    g.fillRect(-2, -h, 4, h);
    g.fillPoints([
      { x: -3, y: -h },
      { x: -6, y: -h },
      { x: -outerW, y: 0 },
      { x: -5, y: 0 },
    ], true);
    g.fillPoints([
      { x: 3, y: -h },
      { x: 6, y: -h },
      { x: outerW, y: 0 },
      { x: 5, y: 0 },
    ], true);
  }

  drawSystemBlock(x, y) {
    const css = this.visualStyle.css;
    const lines = ['> SYSTEM 400', '> 32K RAM', '> ATARI OS 1.0'];
    lines.forEach((line, i) => {
      this.add.text(x, y + i * 11, line, {
        fontSize: '9px',
        fontFamily: 'monospace',
        color: css.ink,
      }).setDepth(22);
    });
    this._readyLine = this.add.text(x, y + lines.length * 11, '> READY._', {
      fontSize: '9px',
      fontFamily: 'monospace',
      color: css.ink,
      fontStyle: 'bold',
    }).setDepth(22);
  }

  startReadyBlink() {
    if (!this._readyLine) return;
    this.time.addEvent({
      delay: 520,
      loop: true,
      callback: () => {
        if (!this._readyLine || !this._readyLine.active) return;
        this._readyCursorOn = !this._readyCursorOn;
        this._readyLine.setText(this._readyCursorOn ? '> READY._' : '> READY.');
      },
    });
  }

  drawYAxis(x, top, bottom) {
    const css = this.visualStyle.css;
    const p = this.palette;
    const g = this.add.graphics().setDepth(20);

    g.lineStyle(1, p.ink, 0.45);
    g.lineBetween(x + 18, top, x + 18, bottom);

    const numbers = [2600, 2400, 2200, 2000, 1800, 1600, 1400, 1200, 1000, 800, 600, 400, 200, 0];
    const step = (bottom - top) / (numbers.length - 1);
    numbers.forEach((num, i) => {
      const ny = top + i * step;
      const major = num % 800 === 0;
      g.lineStyle(1, major ? p.vermilion : p.ink, major ? 0.85 : 0.55);
      g.lineBetween(x + 18, ny, x + 18 + (major ? 6 : 3), ny);
      this.add.text(x + 16, ny - 3, String(num), {
        fontSize: '6px',
        fontFamily: 'monospace',
        color: major ? css.vermilion : css.muted,
      }).setOrigin(1, 0).setDepth(21);
    });

    this.add.text(x + 16, top - 12, 'Y', {
      fontSize: '8px',
      fontFamily: 'monospace',
      color: css.ink,
      fontStyle: 'bold',
    }).setOrigin(1, 0).setDepth(21);
  }

  drawAtariPortalTitle(startX, startY) {
    const p = this.palette;
    const css = this.visualStyle.css;
    const letterW = 42;
    const lineH = 70;

    const rows = [
      {
        letters: 'ATARI',
        colors: [css.vermilion, css.ink, css.mustard, css.ink, css.blue],
        insets: ['triangle', null, 'triangle', 'circle', null],
      },
      {
        letters: 'PORTAL',
        colors: [css.blue, css.vermilion, css.ink, css.mustard, css.ink, css.vermilion],
        insets: ['circle', 'circle', 'quarter', null, 'triangle', null],
      },
    ];

    rows.forEach((row, rowIdx) => {
      const y = startY + rowIdx * lineH;
      [...row.letters].forEach((ch, i) => {
        const lx = startX + i * letterW;
        const txt = this.add.text(lx, y, ch, {
          fontSize: '60px',
          fontFamily: 'monospace',
          color: row.colors[i],
          fontStyle: 'bold',
        }).setOrigin(0, 0).setDepth(22);

        const inset = row.insets[i];
        if (inset) {
          const ig = this.add.graphics().setDepth(24);
          const ix = lx + letterW / 2 - 4;
          const iy = y + 28;
          if (inset === 'circle') {
            ig.fillStyle(p.paper, 1);
            ig.fillCircle(ix, iy, 6);
            ig.fillStyle(p.terminal, 1);
            ig.fillCircle(ix, iy, 3);
          } else if (inset === 'triangle') {
            ig.fillStyle(p.paper, 1);
            ig.fillTriangle(ix - 6, iy + 5, ix + 6, iy + 5, ix, iy - 6);
          } else if (inset === 'quarter') {
            ig.fillStyle(p.paper, 1);
            ig.beginPath();
            ig.moveTo(ix, iy);
            ig.lineTo(ix + 7, iy);
            ig.arc(ix, iy, 7, 0, Math.PI / 2, false);
            ig.lineTo(ix, iy);
            ig.closePath();
            ig.fillPath();
          }
        }

        this._titleLetters.push({ text: txt, baseColor: row.colors[i] });
      });
    });
  }

  drawSubtitleStack(x, y) {
    const css = this.visualStyle.css;
    this.add.text(x, y, 'COMPUTER', {
      fontSize: '9px',
      fontFamily: 'monospace',
      color: css.ink,
    }).setAlpha(0.78).setDepth(22);
    this.add.text(x, y + 11, 'SPACE RACE', {
      fontSize: '9px',
      fontFamily: 'monospace',
      color: css.ink,
    }).setAlpha(0.78).setDepth(22);
    this.add.text(x, y + 22, 'GAME PROGRAM', {
      fontSize: '9px',
      fontFamily: 'monospace',
      color: css.ink,
      fontStyle: 'bold',
    }).setDepth(22);
  }

  drawCx4024Plate(x, y) {
    const css = this.visualStyle.css;
    this.add.text(x, y, 'CX4024', {
      fontSize: '12px',
      fontFamily: 'monospace',
      color: css.vermilion,
      fontStyle: 'bold',
    }).setDepth(22);
  }

  drawShipPlate(x, y) {
    const p = this.palette;
    const g = this.add.graphics().setDepth(20);

    g.lineStyle(1, p.ink, 0.18);
    for (let i = 0; i < 4; i++) {
      const oy = y + 28 + i * 6;
      const spread = 12 + i * 10;
      g.lineBetween(x - spread - 30, oy, x + spread + 32, oy);
    }

    g.lineStyle(1.2, p.ink, 0.9);
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x + 22, y + 24);
    g.lineTo(x + 6, y + 18);
    g.lineTo(x + 10, y + 28);
    g.lineTo(x - 10, y + 28);
    g.lineTo(x - 6, y + 18);
    g.lineTo(x - 22, y + 24);
    g.closePath();
    g.strokePath();

    g.fillStyle(p.vermilion, 1);
    g.fillCircle(x, y + 14, 1.8);

    g.fillStyle(p.ink, 0.6);
    const sx = [-44, -28, -12, 16, 30, 46];
    const sy = [-18, -10, -22, -16, -8, -20];
    for (let i = 0; i < sx.length; i++) g.fillRect(x + sx[i], y + sy[i], 1, 1);
  }

  drawJoystickBlock(x, y) {
    const p = this.palette;
    const css = this.visualStyle.css;
    const g = this.add.graphics().setDepth(20);

    g.lineStyle(1, p.ink, 0.85);
    g.lineBetween(x, y, x + 192, y);

    this.add.text(x, y + 6, 'USE WITH', {
      fontSize: '7px',
      fontFamily: 'monospace',
      color: css.ink,
    }).setAlpha(0.78).setDepth(22);
    this.add.text(x, y + 16, 'JOYSTICK CONTROLLERS', {
      fontSize: '8px',
      fontFamily: 'monospace',
      color: css.ink,
      fontStyle: 'bold',
    }).setDepth(22);

    const jx = x + 24;
    const jy = y + 56;
    g.fillStyle(p.ink, 1);
    g.fillRoundedRect(jx - 18, jy + 6, 36, 18, 3);
    g.fillRect(jx - 14, jy + 4, 28, 4);
    g.fillRect(jx - 2.5, jy - 18, 5, 24);
    g.fillStyle(p.vermilion, 1);
    g.fillCircle(jx, jy - 18, 5);
    g.fillStyle(p.paper, 1);
    g.fillCircle(jx, jy - 18, 1.6);

    this.add.text(jx + 28, jy - 16, 'CX40', {
      fontSize: '7px',
      fontFamily: 'monospace',
      color: css.ink,
    }).setDepth(22);
    this.add.text(jx + 28, jy - 7, 'JOYSTICK', {
      fontSize: '6px',
      fontFamily: 'monospace',
      color: css.muted,
    }).setDepth(22);

    this.drawSwatches(x + 96, y + 56);
  }

  drawSwatches(x, y) {
    const p = this.palette;
    const g = this.add.graphics().setDepth(20);
    const colors = [p.vermilion, p.mustard, p.blue, p.ink];
    colors.forEach((color, i) => {
      const sx = x + i * 22;
      g.fillStyle(color, 1);
      g.fillRect(sx, y, 18, 18);
      g.lineStyle(1, p.ink, 0.35);
      g.strokeRect(sx, y, 18, 18);
    });
  }

  // ─── Right terminal panel ─────────────────────────────────────

  drawCoordinateHeader() {
    const css = this.visualStyle.css;
    this.add.text(360, 26, '> SECTOR 7G / QUADRANT B', {
      fontSize: '9px',
      fontFamily: 'monospace',
      color: css.muted,
    }).setDepth(22);
    this.add.text(360, 38, '> 12.4 N    45.7 E', {
      fontSize: '9px',
      fontFamily: 'monospace',
      color: css.muted,
    }).setDepth(22);
    this.add.text(360, 54, '> INTERFACE  AP-IF / 01.0', {
      fontSize: '8px',
      fontFamily: 'monospace',
      color: css.cyan,
    }).setAlpha(0.7).setDepth(22);

    this.add.text(GAME_WIDTH - 40, 24, '72', {
      fontSize: '20px',
      fontFamily: 'monospace',
      color: css.vermilion,
      fontStyle: 'bold',
    }).setOrigin(0.5, 0).setDepth(22);
    this.add.text(GAME_WIDTH - 40, 46, 'NODE', {
      fontSize: '6px',
      fontFamily: 'monospace',
      color: css.muted,
    }).setOrigin(0.5, 0).setDepth(22);
  }

  drawConstellation() {
    const css = this.visualStyle.css;
    this._constellationGfx = this.add.graphics().setDepth(4);

    const baseX = 600;
    const baseY = 80;
    const w = 160;
    const h = 88;

    const rand = (s) => {
      const v = Math.sin(s * 12.9898 + 78.233) * 43758.5453;
      return v - Math.floor(v);
    };

    const starCount = 18;
    for (let i = 0; i < starCount; i++) {
      const sx = baseX + rand(i + 1) * w;
      const sy = baseY + rand(i + 100) * h;
      this._stars.push({
        x: sx,
        y: sy,
        baseA: 0.4 + rand(i + 200) * 0.45,
        phase: rand(i + 300) * Math.PI * 2,
        speed: 0.0014 + rand(i + 400) * 0.0018,
      });
    }

    this.add.text(baseX, baseY - 12, 'NEB-04 / STAR-CHART', {
      fontSize: '7px',
      fontFamily: 'monospace',
      color: css.muted,
    }).setDepth(20);

    this._drawConstellationFrame(0, 0);
  }

  _drawConstellationFrame(time, treble) {
    const g = this._constellationGfx;
    if (!g) return;
    const p = this.palette;
    g.clear();

    g.lineStyle(1, p.cyan, 0.32);
    for (let i = 0; i < this._stars.length - 1; i += 2) {
      const a = this._stars[i];
      const b = this._stars[i + 1];
      g.lineBetween(a.x, a.y, b.x, b.y);
    }
    g.lineStyle(1, p.cyan, 0.16);
    for (let i = 1; i < this._stars.length - 2; i += 3) {
      const a = this._stars[i];
      const b = this._stars[i + 2];
      g.lineBetween(a.x, a.y, b.x, b.y);
    }

    this._stars.forEach((s) => {
      const twinkle = Math.sin(time * s.speed + s.phase) * 0.22;
      const alpha = Phaser.Math.Clamp(s.baseA + twinkle + treble * 0.45, 0.1, 1);
      g.fillStyle(p.paper, alpha);
      g.fillCircle(s.x, s.y, 1.6);
      if (alpha > 0.78) {
        g.lineStyle(1, p.paper, (alpha - 0.5) * 0.7);
        g.lineBetween(s.x - 3, s.y, s.x + 3, s.y);
        g.lineBetween(s.x, s.y - 3, s.x, s.y + 3);
      }
    });
  }

  initHalftoneField(cx, cy, maxRadius) {
    const rings = 14;
    for (let r = 0; r < rings; r++) {
      const t = r / (rings - 1);
      const radius = 6 + t * maxRadius;
      const dotCount = 6 + r * 4;
      const baseR = 4.2 * (1 - t * 0.82);
      const baseA = 0.85 * (1 - t * 0.78);
      for (let i = 0; i < dotCount; i++) {
        const angle = (Math.PI * 2 * i) / dotCount + r * 0.22;
        this._halftoneDots.push({
          x: cx + Math.cos(angle) * radius,
          y: cy + Math.sin(angle) * radius,
          baseR: Math.max(0.6, baseR),
          baseA,
          ringIdx: r,
        });
      }
    }
  }

  drawHalftoneField(bass) {
    const g = this._halftoneGfx;
    if (!g) return;
    const p = this.palette;
    g.clear();

    this._halftoneDots.forEach((d) => {
      const r = d.baseR * (1 + bass * 0.6);
      const a = Phaser.Math.Clamp(d.baseA + bass * 0.22, 0, 1);
      const color = d.ringIdx < 3 ? p.paper : (d.ringIdx < 7 ? p.cyan : p.faint);
      g.fillStyle(color, a);
      g.fillCircle(d.x, d.y, r);
    });
  }

  initDataPoints(cx, cy, maxRadius) {
    const p = this.palette;
    const palette = [p.vermilion, p.mustard, p.paper];
    for (let i = 0; i < 26; i++) {
      const angle = (i * 137.5 * Math.PI) / 180;
      const radius = maxRadius * (0.45 + ((i * 31) % 100) / 220);
      this._dataPoints.push({
        x: cx + Math.cos(angle) * radius,
        y: cy + Math.sin(angle) * radius,
        kind: i % 3,
        color: palette[i % 3],
        phase: ((i * 47) % 100) / 100 * Math.PI * 2,
      });
    }
  }

  drawDataPoints(time) {
    const g = this._dataPointsGfx;
    if (!g) return;
    g.clear();
    this._dataPoints.forEach((d) => {
      const a = 0.45 + Math.sin(time * 0.0014 + d.phase) * 0.28;
      g.fillStyle(d.color, a);
      if (d.kind === 0) {
        g.fillRect(d.x - 1.5, d.y - 1.5, 3, 3);
      } else if (d.kind === 1) {
        g.lineStyle(1, d.color, a);
        g.beginPath();
        g.moveTo(d.x - 2.5, d.y);
        g.lineTo(d.x + 2.5, d.y);
        g.moveTo(d.x, d.y - 2.5);
        g.lineTo(d.x, d.y + 2.5);
        g.strokePath();
      } else {
        g.fillCircle(d.x, d.y, 1.6);
      }
    });
  }

  drawPortalRings(cx, cy, time) {
    const g = this._portalGfx;
    if (!g) return;
    const p = this.palette;
    g.clear();

    g.lineStyle(1, p.paper, 0.18);
    g.lineBetween(cx - 108, cy, cx + 108, cy);
    g.lineBetween(cx, cy - 116, cx, cy + 116);

    for (let i = 0; i < 8; i++) {
      const radius = 14 + i * 12;
      const color = i % 3 === 0 ? p.vermilion : (i % 3 === 1 ? p.cyan : p.paper);
      g.lineStyle(i % 4 === 0 ? 1.4 : 1, color, 0.22 + i * 0.04);
      g.strokeCircle(cx, cy, radius);
    }

    for (let i = 0; i < 20; i++) {
      const angle = (Math.PI * 2 * i) / 20 + time * 0.00014;
      const r1 = 14 + (i % 3) * 5;
      const r2 = 108 + (i % 4) * 4;
      const color = i % 4 === 0 ? p.mustard : p.cyan;
      g.lineStyle(1, color, i % 4 === 0 ? 0.42 : 0.18);
      g.lineBetween(
        cx + Math.cos(angle) * r1, cy + Math.sin(angle) * r1,
        cx + Math.cos(angle) * r2, cy + Math.sin(angle) * r2,
      );
    }

    g.fillStyle(p.paper, 1);
    g.fillCircle(cx, cy, 7);
    g.fillStyle(p.vermilion, 1);
    g.fillCircle(cx, cy, 3.2);
  }

  drawTerrainGraph(x, y) {
    const css = this.visualStyle.css;
    const p = this.palette;
    const g = this.add.graphics().setDepth(20);
    const w = 210;
    const h = 30;
    const hs = GameManager.getHighScore() || 12580;

    this.add.text(x, y - 14, 'HIGH SCORE', {
      fontSize: '8px',
      fontFamily: 'monospace',
      color: css.muted,
    }).setDepth(22);
    this.add.text(x + 78, y - 16, String(hs).padStart(6, '0'), {
      fontSize: '12px',
      fontFamily: 'monospace',
      color: css.cyan,
      fontStyle: 'bold',
    }).setDepth(22);

    const segments = 22;
    const seed = (n) => {
      const v = Math.sin(n * 53.13 + 17.7) * 43758.5;
      return v - Math.floor(v);
    };
    const points = [];
    for (let i = 0; i <= segments; i++) {
      const px = x + (i / segments) * w;
      const hMul = 0.25 + seed(i) * 0.72;
      points.push({ x: px, y: y + h - hMul * h });
    }

    g.fillStyle(p.cyan, 0.08);
    g.beginPath();
    g.moveTo(points[0].x, y + h);
    points.forEach((pt) => g.lineTo(pt.x, pt.y));
    g.lineTo(points[points.length - 1].x, y + h);
    g.closePath();
    g.fillPath();

    g.lineStyle(1, p.cyan, 0.55);
    for (let i = 0; i < points.length - 1; i++) {
      g.lineBetween(points[i].x, points[i].y, points[i + 1].x, points[i + 1].y);
    }

    g.lineStyle(1, p.paper, 0.32);
    g.lineBetween(x, y + h, x + w, y + h);

    g.fillStyle(p.vermilion, 0.85);
    g.fillCircle(x, y + h, 1.5);
    g.fillCircle(x + w, y + h, 1.5);
  }

  drawEdgeTicks(x, top, bottom) {
    const p = this.palette;
    const g = this.add.graphics().setDepth(20);
    const count = 22;
    const step = (bottom - top) / count;
    for (let i = 0; i <= count; i++) {
      const y = top + i * step;
      const long = i % 4 === 0;
      g.lineStyle(1, long ? p.vermilion : p.paper, long ? 0.7 : 0.32);
      g.lineBetween(x, y, x + (long ? 8 : 4), y);
    }
  }

  drawPageFurniture() {
    const css = this.visualStyle.css;
    const p = this.palette;
    const g = this.add.graphics().setDepth(80);

    g.lineStyle(1, p.ink, 0.45);
    g.lineBetween(8, 12, 18, 12);
    g.lineBetween(13, 7, 13, 17);
    g.lineStyle(1, p.vermilion, 0.5);
    g.strokeCircle(13, 12, 4);

    this.add.text(GAME_WIDTH - 12, 12, 'PAGE 01 / 01', {
      fontSize: '7px',
      fontFamily: 'monospace',
      color: css.muted,
    }).setOrigin(1, 0).setDepth(80);

    this.add.text(286, GAME_HEIGHT - 16, 'CONFIDENTIAL', {
      fontSize: '6px',
      fontFamily: 'monospace',
      color: css.muted,
    }).setOrigin(1, 0).setDepth(22);

    this.add.text(GAME_WIDTH - 12, GAME_HEIGHT - 30, 'AP-IF-1982-0424', {
      fontSize: '7px',
      fontFamily: 'monospace',
      color: css.muted,
    }).setOrigin(1, 0).setDepth(80);
  }

  // ─── Poster buttons ───────────────────────────────────────────

  createPosterButton(x, y, w, h, def) {
    const p = this.palette;
    const css = this.visualStyle.css;
    const stripBaseW = 38;
    const stripHoverW = 52;

    const panel = this.add.graphics().setDepth(28);
    const iconGfx = this.add.graphics().setDepth(31);
    const arrowGfx = this.add.graphics().setDepth(31);
    const zone = this.add.zone(x, y, w, h).setOrigin(0.5).setDepth(34).setInteractive({ useHandCursor: true });

    const labelText = this.add.text(x - w / 2 + stripBaseW + 12, y - 10, def.label, {
      fontSize: '15px',
      fontFamily: 'monospace',
      color: css.ink,
      fontStyle: 'bold',
    }).setDepth(30);
    const kickerText = this.add.text(x - w / 2 + stripBaseW + 12, y + 9, def.kicker, {
      fontSize: '8px',
      fontFamily: 'monospace',
      color: css.muted,
    }).setDepth(30);

    const state = { hover: false };

    const drawArrow = () => {
      arrowGfx.clear();
      const ax = x + w / 2 - 16 + (state.hover ? 4 : 0);
      const ay = y;
      arrowGfx.lineStyle(1.5, state.hover ? def.accent : p.ink, 1);
      arrowGfx.lineBetween(ax - 8, ay, ax + 3, ay);
      arrowGfx.lineBetween(ax - 2, ay - 4, ax + 3, ay);
      arrowGfx.lineBetween(ax - 2, ay + 4, ax + 3, ay);
    };

    const drawIcon = () => {
      iconGfx.clear();
      const stripW = state.hover ? stripHoverW : stripBaseW;
      this.drawButtonIcon(iconGfx, x - w / 2 + stripW / 2, y, def.icon, p.paper);
    };

    const draw = () => {
      const stripW = state.hover ? stripHoverW : stripBaseW;
      panel.clear();
      panel.fillStyle(p.paper, state.hover ? 1 : 0.94);
      panel.fillRect(x - w / 2, y - h / 2, w, h);
      panel.fillStyle(def.accent, 1);
      panel.fillRect(x - w / 2, y - h / 2, stripW, h);
      panel.lineStyle(1, state.hover ? def.accent : p.ink, state.hover ? 1 : 0.55);
      panel.strokeRect(x - w / 2, y - h / 2, w, h);

      panel.lineStyle(1, p.ink, 0.22);
      panel.lineBetween(
        x - w / 2 + stripW, y - h / 2 + 4,
        x - w / 2 + stripW, y + h / 2 - 4,
      );

      panel.lineStyle(1, p.ink, state.hover ? 0.35 : 0.18);
      panel.lineBetween(x + w / 2 - 32, y - h / 2 + 5, x + w / 2 - 10, y - h / 2 + 5);
      panel.lineBetween(x + w / 2 - 20, y + h / 2 - 5, x + w / 2 - 10, y + h / 2 - 5);

      drawIcon();
      drawArrow();
    };

    draw();

    zone.on('pointerover', () => {
      state.hover = true;
      draw();
      labelText.setColor(css.vermilion);
      SFX.menuSelect();
    });
    zone.on('pointerout', () => {
      state.hover = false;
      draw();
      labelText.setColor(css.ink);
    });
    zone.on('pointerdown', def.action);

    return { panel, iconGfx, arrowGfx, zone, labelText, kickerText, def };
  }

  drawButtonIcon(g, cx, cy, kind, color) {
    g.fillStyle(color, 1);
    g.lineStyle(1.5, color, 1);
    if (kind === 'start') {
      g.fillTriangle(cx - 6, cy - 8, cx - 6, cy + 8, cx + 8, cy);
    } else if (kind === 'arcade') {
      g.strokeRect(cx - 8, cy - 7, 16, 4);
      g.strokeRect(cx - 6, cy - 1, 12, 4);
      g.strokeRect(cx - 4, cy + 5, 8, 3);
    } else if (kind === 'layers') {
      g.strokeRect(cx - 7, cy - 7, 9, 9);
      g.strokeRect(cx - 3, cy - 3, 9, 9);
      g.fillStyle(color, 0.45);
      g.fillRect(cx + 1, cy + 1, 7, 7);
    } else if (kind === 'codex') {
      g.strokeRect(cx - 8, cy - 7, 16, 14);
      g.lineBetween(cx, cy - 7, cx, cy + 7);
      g.fillTriangle(cx - 6, cy - 2, cx - 6, cy + 2, cx - 3, cy);
      g.fillTriangle(cx + 6, cy - 2, cx + 6, cy + 2, cx + 3, cy);
    } else {
      g.fillCircle(cx, cy, 5);
    }
  }

  createStyleSwitchButton(x, y) {
    const style = getVisualStyle();
    const p = style.palette;
    const css = style.css;
    const modernist = style.id === 'modernist';
    const w = modernist ? 190 : 206;
    const h = 30;
    const g = this.add.graphics().setDepth(80);
    const zone = this.add.zone(x, y, w, h).setOrigin(0.5).setDepth(82).setInteractive({ useHandCursor: true });
    const label = this.add.text(x, y, `STYLE: ${style.shortLabel}  [SWITCH]`, {
      fontSize: modernist ? '9px' : '10px',
      fontFamily: 'monospace',
      color: modernist ? css.ink : '#ffffff',
    }).setOrigin(0.5).setDepth(81);

    const draw = (hover = false) => {
      g.clear();
      if (modernist) {
        g.fillStyle(p.paper, hover ? 1 : 0.9);
        g.fillRect(x - w / 2, y - h / 2, w, h);
        g.fillStyle(hover ? p.vermilion : p.ink, 1);
        g.fillRect(x - w / 2, y - h / 2, 18, h);
        g.lineStyle(1, hover ? p.vermilion : p.ink, hover ? 0.9 : 0.45);
        g.strokeRect(x - w / 2, y - h / 2, w, h);
      } else {
        g.fillStyle(COLORS.HUD_BG, hover ? 0.94 : 0.74);
        g.fillRoundedRect(x - w / 2, y - h / 2, w, h, 8);
        g.lineStyle(1, hover ? COLORS.NEON_MAGENTA : COLORS.NEON_CYAN, hover ? 0.85 : 0.45);
        g.strokeRoundedRect(x - w / 2, y - h / 2, w, h, 8);
      }
    };

    draw(false);
    zone.on('pointerover', () => {
      draw(true);
      label.setColor(modernist ? css.vermilion : cyan);
      SFX.menuSelect();
    });
    zone.on('pointerout', () => {
      draw(false);
      label.setColor(modernist ? css.ink : '#ffffff');
    });
    zone.on('pointerdown', () => {
      SFX.menuSelect();
      toggleVisualStyle();
      try { this.scene.stop('CRTOverlay'); } catch (_) { /* safe */ }
      this.scene.restart();
    });

    return { g, zone, label };
  }

  drawMenuStage3D() {
    const g = this.add.graphics().setDepth(4);
    const cx = GAME_WIDTH / 2;

    g.fillStyle(0x030613, 0.58);
    g.fillTriangle(cx - 330, 500, cx + 330, 500, cx + 245, 98);
    g.fillTriangle(cx - 330, 500, cx - 245, 98, cx + 245, 98);

    g.lineStyle(9, COLORS.NEON_CYAN, 0.035);
    g.strokeTriangle(cx - 330, 500, cx + 330, 500, cx + 245, 98);
    g.strokeTriangle(cx - 330, 500, cx - 245, 98, cx + 245, 98);

    for (let i = 0; i < 9; i++) {
      const t = i / 8;
      const y = Phaser.Math.Linear(112, 492, t);
      const half = Phaser.Math.Linear(245, 330, t);
      g.lineStyle(1, COLORS.NEON_CYAN, 0.08 + t * 0.04);
      g.lineBetween(cx - half, y, cx + half, y);
    }

    for (let i = -5; i <= 5; i++) {
      const topX = cx + i * 48;
      const bottomX = cx + i * 66;
      g.lineStyle(1, i === 0 ? COLORS.NEON_MAGENTA : COLORS.NEON_CYAN, i === 0 ? 0.12 : 0.06);
      g.lineBetween(topX, 108, bottomX, 496);
    }

    const leftFin = this.add.graphics().setDepth(5);
    leftFin.fillStyle(0x06101f, 0.72);
    leftFin.fillTriangle(82, 170, 190, 130, 142, 470);
    leftFin.lineStyle(2, COLORS.NEON_PURPLE, 0.32);
    leftFin.strokeTriangle(82, 170, 190, 130, 142, 470);

    const rightFin = this.add.graphics().setDepth(5);
    rightFin.fillStyle(0x06101f, 0.72);
    rightFin.fillTriangle(GAME_WIDTH - 82, 170, GAME_WIDTH - 190, 130, GAME_WIDTH - 142, 470);
    rightFin.lineStyle(2, COLORS.NEON_PURPLE, 0.32);
    rightFin.strokeTriangle(GAME_WIDTH - 82, 170, GAME_WIDTH - 190, 130, GAME_WIDTH - 142, 470);
  }

  drawReadabilityPanels() {
    const g = this.add.graphics().setDepth(39);
    g.fillStyle(0x020612, 0.78);
    g.fillRoundedRect(122, 18, 556, 72, 10);
    g.lineStyle(1, COLORS.NEON_CYAN, 0.28);
    g.strokeRoundedRect(122, 18, 556, 72, 10);

    g.fillStyle(0x020612, 0.7);
    g.fillRoundedRect(110, GAME_HEIGHT - 36, 580, 26, 8);
    g.lineStyle(1, COLORS.NEON_PURPLE, 0.24);
    g.strokeRoundedRect(110, GAME_HEIGHT - 36, 580, 26, 8);
  }

  // ─── Audio-reactive update loop ───────────────────────────────

  update(_time, delta) {
    if (this.modernist) {
      this.updateModernistMenu(_time, delta);
      return;
    }

    AudioReactive.update(delta);
    const ar = AudioReactive;
    this.updateMenuFocus();
    this._sigilPulse += delta * 0.006;
    this._drawCentralSigilFrame(ar._connected ? ar.energy * 0.35 : 0.12);
    if (!ar._connected) return;

    this._updateSpectrumRing(ar);
    this._updateGrid(ar);
    this._updateTitle(ar);

    if (ar.isBeat) {
      this._spawnBeatBurst(ar.beatIntensity);
      this.cameras.main.shake(100, AR.BEAT_CAMERA_SHAKE * ar.beatIntensity);
    }
  }

  updateModernistMenu(time, delta) {
    AudioReactive.update(delta);
    this.updateMenuFocus();

    const ar = AudioReactive;
    const bass = ar._connected ? ar.bassSmooth : 0;
    const treble = ar._connected ? ar.treble : 0;

    this.drawHalftoneField(bass);
    if (this._halftoneCenter) {
      this.drawPortalRings(this._halftoneCenter.x, this._halftoneCenter.y, time);
    }
    this.drawDataPoints(time);
    this._drawConstellationFrame(time, treble);

    if (!ar._connected) return;

    if (ar.isBeat) {
      if (this._fujiGfx && !this._fujiBeatActive) {
        this._fujiBeatActive = true;
        this.tweens.add({
          targets: this._fujiGfx,
          scale: { from: 1, to: 1.08 },
          duration: 90,
          yoyo: true,
          ease: 'Quad.easeOut',
          onComplete: () => {
            if (this._fujiGfx) this._fujiGfx.setScale(1);
            this._fujiBeatActive = false;
          },
        });
      }

      if (this._titleLetters && this._titleLetters.length && !this._titleCycleBusy) {
        this._titleCycleBusy = true;
        const css = this.visualStyle.css;
        const cycleColors = [css.vermilion, css.mustard, css.cyan, css.violet];
        const idx = Phaser.Math.Between(0, this._titleLetters.length - 1);
        const letter = this._titleLetters[idx];
        const color = cycleColors[Phaser.Math.Between(0, cycleColors.length - 1)];
        if (letter && letter.text && letter.text.active) {
          letter.text.setColor(color);
          this.tweens.add({
            targets: letter.text,
            scale: { from: 1, to: 1.18 },
            duration: 110,
            yoyo: true,
            ease: 'Quad.easeOut',
            onComplete: () => {
              if (letter.text && letter.text.active) {
                letter.text.setColor(letter.baseColor);
                letter.text.setScale(1);
              }
              this._titleCycleBusy = false;
            },
          });
        } else {
          this._titleCycleBusy = false;
        }
      }
    }
  }

  updateMenuFocus() {
    const pointer = this.input.activePointer;
    const tx = pointer ? pointer.x : GAME_WIDTH / 2;
    const ty = pointer ? pointer.y : GAME_HEIGHT / 2;
    this._menuFocus.x = Phaser.Math.Linear(this._menuFocus.x, tx, 0.08);
    this._menuFocus.y = Phaser.Math.Linear(this._menuFocus.y, ty, 0.08);
    AudioBackground.setFocus('MenuScene', this._menuFocus.x, this._menuFocus.y);
    this.updateMenuPerspective();
  }

  updateMenuPerspective() {
    const canvas = this.game?.canvas;
    if (!canvas) return;
    const fx = Phaser.Math.Clamp(((this._menuFocus.x / GAME_WIDTH) - 0.5) * 2, -1, 1);
    const fy = Phaser.Math.Clamp(((this._menuFocus.y / GAME_HEIGHT) - 0.5) * 2, -1, 1);
    const depth = (Math.abs(fx) + Math.abs(fy)) * 12;
    canvas.style.transformOrigin = '50% 50%';
    canvas.style.transformStyle = 'preserve-3d';
    canvas.style.willChange = 'transform';
    canvas.style.transform = [
      'perspective(1000px)',
      `rotateX(${(-fy * 5.5).toFixed(3)}deg)`,
      `rotateY(${(fx * 7).toFixed(3)}deg)`,
      `translateZ(${depth.toFixed(2)}px)`,
      `translate(${(-fx * 5).toFixed(2)}px, ${(fy * 4).toFixed(2)}px)`,
    ].join(' ');
  }

  resetMenuPerspective() {
    const canvas = this.game?.canvas;
    if (!canvas) return;
    canvas.style.transform = '';
    canvas.style.transformOrigin = '';
    canvas.style.transformStyle = '';
    canvas.style.willChange = '';
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
    const chars = '0100110101101';
    for (let col = 0; col < 8; col++) {
      const x = 16 + col * ((GAME_WIDTH - 32) / 7) + Math.random() * 18;
      for (let i = 0; i < 14; i++) {
        const ch = chars[Math.floor(Math.random() * chars.length)];
        const txt = this.add.text(x, -10 - i * 16, ch, {
          fontSize: '11px', fontFamily: 'monospace', color: green,
        }).setAlpha(0.14).setDepth(0);
        this.tweens.add({
          targets: txt,
          y: GAME_HEIGHT + 10,
          alpha: { from: 0.15, to: 0 },
          duration: 4000 + Math.random() * 3500,
          delay: Math.random() * 3500 + i * 120,
          repeat: -1,
        });
      }
    }
  }

  drawBinaryPanels() {
    const panels = [
      { x: 78, y: 72 }, { x: 722, y: 72 },
      { x: 78, y: 508 }, { x: 722, y: 508 },
    ];
    panels.forEach(({ x, y }) => {
      const frame = this.add.graphics().setDepth(6);
      frame.fillStyle(0x090d16, 0.88);
      frame.fillRoundedRect(x - 58, y - 52, 116, 104, 4);
      frame.lineStyle(1.2, 0x9ca3b8, 0.35);
      frame.strokeRoundedRect(x - 58, y - 52, 116, 104, 4);
      frame.lineStyle(3, 0xffffff, 0.04);
      frame.strokeRoundedRect(x - 60, y - 54, 120, 108, 4);
      for (let row = 0; row < 11; row++) {
        const text = this.add.text(x - 48, y - 42 + row * 8, `${Math.random() > 0.5 ? '1' : '0'}${String(Math.floor(Math.random() * 999999999)).padStart(9, '0')}`, {
          fontSize: '7px', fontFamily: 'monospace', color: '#a2acb9',
        }).setAlpha(0.6).setDepth(7);
        this.tweens.add({
          targets: text,
          alpha: { from: 0.35, to: 0.7 },
          duration: 800 + Math.random() * 900,
          yoyo: true,
          repeat: -1,
          delay: row * 70,
        });
      }
    });
  }

  drawAccessFrame() {
    const g = this.add.graphics().setDepth(5);
    g.lineStyle(2, COLORS.NEON_CYAN, 0.35);
    g.lineBetween(160, 46, 640, 46);
    g.lineStyle(4, COLORS.NEON_CYAN, 0.06);
    g.lineBetween(160, 46, 640, 46);
    g.lineStyle(1, COLORS.NEON_CYAN, 0.25);
    g.lineBetween(175, 97, 625, 97);
    g.lineBetween(175, 528, 625, 528);
  }

  drawCentralSigil() {
    this._sigilGfx = this.add.graphics().setDepth(8);
    this._drawCentralSigilFrame(0.4);
  }

  _drawCentralSigilFrame(alphaBoost = 0) {
    const g = this._sigilGfx;
    if (!g) return;
    g.clear();
    const pulse = 1 + Math.sin(this._sigilPulse) * 0.04;
    g.lineStyle(8, COLORS.NEON_CYAN, 0.06 + alphaBoost * 0.1);
    g.strokeCircle(SPECTRUM_CX, SPECTRUM_CY + 86, 58 * pulse);
    g.lineStyle(2, COLORS.NEON_CYAN, 0.75 + alphaBoost * 0.15);
    g.strokeCircle(SPECTRUM_CX, SPECTRUM_CY + 86, 52 * pulse);
    g.lineStyle(1.5, COLORS.NEON_CYAN, 0.95);
    g.beginPath();
    g.moveTo(SPECTRUM_CX - 18, SPECTRUM_CY + 112);
    g.lineTo(SPECTRUM_CX, SPECTRUM_CY + 58);
    g.lineTo(SPECTRUM_CX + 18, SPECTRUM_CY + 112);
    g.strokePath();
    g.lineBetween(SPECTRUM_CX - 11, SPECTRUM_CY + 95, SPECTRUM_CX + 11, SPECTRUM_CY + 95);
    g.lineStyle(1, COLORS.WHITE, 0.4);
    g.lineBetween(SPECTRUM_CX - 7, SPECTRUM_CY + 102, SPECTRUM_CX + 7, SPECTRUM_CY + 102);
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

  createButton(x, y, label, callback, opts = {}) {
    const theme = opts.theme || 'portal';
    const width = 182;
    const height = label.includes('\n') ? 116 : 104;
    const ringColorMap = {
      portal: COLORS.NEON_MAGENTA,
      shards: COLORS.NEON_PURPLE,
      vortex: COLORS.NEON_CYAN,
      burst: COLORS.WHITE,
    };

    const shadow = this.add.graphics().setDepth(19);
    const effect = this.add.graphics().setDepth(20);
    const panel = this.add.graphics().setDepth(21);
    const zone = this.add.zone(x, y, width, height).setOrigin(0.5).setDepth(34).setInteractive({ useHandCursor: true });
    const txt = this.add.text(x, y, label, {
      fontSize: label.includes('\n') ? '26px' : '28px',
      fontFamily: 'monospace',
      align: 'center',
      color: '#ffffff',
      stroke: '#030712',
      strokeThickness: 5,
      lineSpacing: -6,
    }).setOrigin(0.5).setDepth(33);

    const drawPanel = (hover = false) => {
      shadow.clear();
      shadow.fillStyle(0x000000, hover ? 0.5 : 0.38);
      shadow.fillRoundedRect(x - width / 2 + 24, y - height / 2 + 30, width - 30, height - 28, 16);
      shadow.fillStyle(ringColorMap[theme], hover ? 0.12 : 0.07);
      shadow.fillRoundedRect(x - width / 2 + 12, y - height / 2 + 20, width - 26, height - 22, 16);

      panel.clear();
      panel.fillStyle(0x020612, hover ? 0.9 : 0.78);
      panel.fillRoundedRect(x - width / 2 + 16, y - height / 2 + 16, width - 32, height - 32, 14);
      panel.fillStyle(0xffffff, hover ? 0.09 : 0.05);
      panel.fillRoundedRect(x - width / 2 + 24, y - height / 2 + 23, width - 48, 13, 7);
      panel.fillStyle(0x000000, hover ? 0.25 : 0.18);
      panel.fillRoundedRect(x - width / 2 + 24, y + height / 2 - 39, width - 48, 14, 7);
      panel.lineStyle(5, ringColorMap[theme], hover ? 0.14 : 0.08);
      panel.strokeRoundedRect(x - width / 2 + 14, y - height / 2 + 14, width - 28, height - 28, 16);
      panel.lineStyle(1.5, ringColorMap[theme], hover ? 0.82 : 0.45);
      panel.strokeRoundedRect(x - width / 2 + 22, y - height / 2 + 22, width - 44, height - 44, 10);
      panel.lineStyle(1, COLORS.WHITE, hover ? 0.2 : 0.1);
      panel.strokeRoundedRect(x - width / 2 + 30, y - height / 2 + 30, width - 60, height - 60, 8);
    };

    this.drawButtonEffect(effect, x, y, theme, false);
    drawPanel(false);

    zone.on('pointerover', () => {
      txt.setColor(cyan);
      txt.setScale(1.06);
      NeonGlow.applyTextGlow(this, txt, ringColorMap[theme]);
      this.drawButtonEffect(effect, x, y, theme, true);
      drawPanel(true);
      SFX.menuSelect();
    });
    zone.on('pointerout', () => {
      txt.setColor('#ffffff');
      txt.setScale(1);
      txt.setStyle({ ...txt.style, shadow: {}, stroke: '#030712', strokeThickness: 5 });
      this.drawButtonEffect(effect, x, y, theme, false);
      drawPanel(false);
    });
    zone.on('pointerdown', callback);

    return { shadow, effect, panel, zone, txt };
  }

  drawButtonEffect(g, x, y, theme, hover) {
    g.clear();
    const intensity = hover ? 1 : 0.65;
    if (theme === 'portal') {
      g.lineStyle(10, COLORS.NEON_ORANGE, 0.05 * intensity);
      g.strokeCircle(x, y, 58);
      g.lineStyle(5, COLORS.NEON_MAGENTA, 0.25 * intensity);
      g.strokeCircle(x, y, 52);
      for (let i = 0; i < 18; i++) {
        const angle = (Math.PI * 2 * i) / 18;
        const r1 = 36 + (i % 3) * 4;
        const r2 = 58 + (i % 2) * 6;
        g.lineStyle(1.5, i % 2 ? COLORS.NEON_ORANGE : COLORS.NEON_MAGENTA, 0.35 * intensity);
        g.lineBetween(x + Math.cos(angle) * r1, y + Math.sin(angle) * r1, x + Math.cos(angle + 0.16) * r2, y + Math.sin(angle + 0.16) * r2);
      }
    } else if (theme === 'shards') {
      g.fillStyle(COLORS.NEON_PURPLE, 0.08 * intensity);
      g.fillCircle(x, y, 54);
      for (let i = 0; i < 10; i++) {
        const angle = (Math.PI * 2 * i) / 10;
        const sx = x + Math.cos(angle) * (26 + i * 2);
        const sy = y + Math.sin(angle) * (26 + i * 2);
        g.lineStyle(2, i % 2 ? COLORS.NEON_MAGENTA : COLORS.WHITE, 0.42 * intensity);
        g.beginPath();
        g.moveTo(sx, sy);
        g.lineTo(sx + Math.cos(angle + 0.5) * 18, sy + Math.sin(angle + 0.5) * 11);
        g.lineTo(sx + Math.cos(angle - 0.4) * 12, sy + Math.sin(angle - 0.4) * 19);
        g.closePath();
        g.strokePath();
      }
    } else if (theme === 'vortex') {
      for (let i = 0; i < 5; i++) {
        const radius = 24 + i * 8;
        g.lineStyle(3 - i * 0.35, COLORS.NEON_CYAN, (0.34 - i * 0.05) * intensity);
        g.beginPath();
        g.arc(x, y, radius, Phaser.Math.DegToRad(30 + i * 14), Phaser.Math.DegToRad(320 + i * 12), false);
        g.strokePath();
      }
      g.lineStyle(2, COLORS.WHITE, 0.22 * intensity);
      g.strokeCircle(x, y, 10);
    } else {
      for (let i = 0; i < 12; i++) {
        const angle = (Math.PI * 2 * i) / 12;
        const inner = 10 + (i % 2) * 4;
        const outer = 54 + (i % 3) * 6;
        g.lineStyle(2, i % 3 === 0 ? COLORS.WHITE : COLORS.NEON_PURPLE, 0.38 * intensity);
        g.lineBetween(x + Math.cos(angle) * inner, y + Math.sin(angle) * inner, x + Math.cos(angle) * outer, y + Math.sin(angle) * outer);
      }
      g.fillStyle(COLORS.WHITE, 0.2 * intensity);
      g.fillCircle(x, y, 14);
    }
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

    const shadow = this.add.rectangle(cx + 14, panelY + 16, 350, panelH + 10, 0x000000, 0.42).setDepth(99);
    const glow = this.add.rectangle(cx, panelY, 350, panelH + 10, COLORS.NEON_CYAN, 0.08).setDepth(99).setBlendMode(Phaser.BlendModes.ADD);
    const bg = this.add.rectangle(cx, panelY, 340, panelH, COLORS.HUD_BG, 0.96).setDepth(100);
    const borderG = this.add.graphics().setDepth(100);
    NeonGlow.strokeRect(borderG, cx - 170, topY, 340, panelH, COLORS.NEON_CYAN, 1, 0.4);
    this.levelSelectItems.push(shadow, glow, bg, borderG);

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
    const shadow = this.add.rectangle(cx + 16, 366, 512, 352, 0x000000, 0.45).setDepth(99);
    const glow = this.add.rectangle(cx, 350, 512, 340, COLORS.NEON_PURPLE, 0.09).setDepth(99).setBlendMode(Phaser.BlendModes.ADD);
    const bg = this.add.rectangle(cx, 350, 500, 330, COLORS.HUD_BG, 0.96).setDepth(100);
    const borderG = this.add.graphics().setDepth(100);
    NeonGlow.strokeRect(borderG, cx - 250, 185, 500, 330, COLORS.NEON_PURPLE, 1, 0.5);
    this.shopItems.push(shadow, glow, bg, borderG);

    const title = this.add.text(cx, 200, '// REBOOT CONTROL', {
      fontSize: '14px', fontFamily: 'monospace', color: '#b845ff',
    }).setOrigin(0.5).setDepth(101);
    this.shopItems.push(title);

    const permCoins = GameManager.getPermanentCoins();
    const coinLabel = this.add.text(cx, 224, `CREDITS: ${permCoins}`, {
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
      const y = 256 + i * 35;
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

    const achTitle = this.add.text(cx, 398, '// CODEX', {
      fontSize: '11px', fontFamily: 'monospace', color: '#00f0ff',
    }).setOrigin(0.5).setDepth(101);
    this.shopItems.push(achTitle);

    const achSys = GameManager.achievementSystem;
    if (achSys) {
      const achText = this.add.text(cx, 416, `${achSys.totalUnlocked}/${achSys.totalAchievements} UNLOCKED`, {
        fontSize: '10px', fontFamily: 'monospace', color: '#555577',
      }).setOrigin(0.5).setDepth(101);
      this.shopItems.push(achText);
    }

    const perfFps = AudioBackground.getPerformanceFps();
    const effectsLevel = AudioBackground.getAnimationEffectsLevel();
    const highEffects = effectsLevel === 'high';
    const effectsLabel = this.add.text(cx - 180, 438, `ANIMATION EFFECTS: ${effectsLevel.toUpperCase()}`, {
      fontSize: '11px', fontFamily: 'monospace', color: highEffects ? '#39ff14' : '#7777aa',
    }).setDepth(101);
    this.shopItems.push(effectsLabel);

    const effectsBtn = this.add.text(cx + 148, 438, `[SET ${highEffects ? 'LOW' : 'HIGH'}]`, {
      fontSize: '11px', fontFamily: 'monospace', color: '#00f0ff',
    }).setOrigin(0.5, 0).setDepth(101).setInteractive({ useHandCursor: true });
    effectsBtn.on('pointerover', () => effectsBtn.setColor('#ffffff'));
    effectsBtn.on('pointerout', () => effectsBtn.setColor('#00f0ff'));
    effectsBtn.on('pointerdown', () => {
      SFX.menuSelect();
      AudioBackground.setAnimationEffectsLevel(highEffects ? 'low' : 'high');
      this.shopItems.forEach(item => item.destroy());
      this.shopItems = [];
      this.shopOpen = false;
      this.openUpgradeShop();
    });
    this.shopItems.push(effectsBtn);

    const fpsText = perfFps === null ? 'PERF FPS: PENDING' : `PERF FPS: ${Math.round(perfFps)}`;
    const fpsLabel = this.add.text(cx, 462, fpsText, {
      fontSize: '9px', fontFamily: 'monospace', color: '#555577',
    }).setOrigin(0.5).setDepth(101);
    this.shopItems.push(fpsLabel);

    const closeBtn = this.add.text(cx, 492, '> CLOSE', {
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
    GameManager.state.mode = 'story';
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
    if (mode === 'arcade') {
      GameManager.state.currentGameIndex = Phaser.Math.Between(0, GAME_ORDER.length - 1);
    } else {
      GameManager.state.currentGameIndex = 0;
    }
    this.cameras.main.fadeOut(400, 10, 10, 26);
    this.time.delayedCall(400, () => {
      this.scene.launch('HUDScene');
      this.scene.launch('CRTOverlay');
      this.scene.start(GameManager.currentSceneKey);
    });
  }
}
