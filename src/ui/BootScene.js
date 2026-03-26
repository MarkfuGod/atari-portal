import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS } from '../config.js';
import SFX from '../core/SFXManager.js';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  preload() {
    SFX.init();
    this.generateTextures();
    this.loadBGM();
  }

  loadBGM() {
    this.load.audio('bgm_menu', 'assets/audio/BGM/BGM_menu.mp3');
    this.load.audio('bgm_epic', 'assets/audio/BGM/BGM_Epic.mp3');
    this.load.audio('bgm_intense', 'assets/audio/BGM/BGM_intense.mp3');
    this.load.audio('bgm_reassurance', 'assets/audio/BGM/BGM_reassurance.mp3');
    this.load.audio('bgm_rock', 'assets/audio/BGM/BGM_rock.mp3');
  }

  generateTextures() {
    this.genPortalPellet();
    this.genDot();
    this.genPowerPellet();
    this.genPacman();
    this.genGhosts();
    this.genBreakout();
    this.genSpaceInvaders();
    this.genAsteroids();
    this.genFrogger();
    this.genTetris();
    this.genBullets();
    this.genMothership();
    this.genPixel();
    this.genPowerUps();
  }

  genPortalPellet() {
    const g = this.make.graphics({ add: false });
    g.fillStyle(COLORS.NEON_PURPLE, 0.3);
    g.fillCircle(8, 8, 8);
    g.fillStyle(COLORS.PORTAL_CORE, 0.6);
    g.fillCircle(8, 8, 6);
    g.fillStyle(COLORS.PORTAL_CORE, 1);
    g.fillCircle(8, 8, 4);
    g.fillStyle(COLORS.WHITE, 0.9);
    g.fillCircle(8, 8, 2);
    g.generateTexture('portal-pellet', 16, 16);
    g.destroy();
  }

  genDot() {
    const g = this.make.graphics({ add: false });
    g.fillStyle(COLORS.NEON_CYAN, 0.5);
    g.fillCircle(3, 3, 3);
    g.fillStyle(COLORS.WHITE, 0.9);
    g.fillCircle(3, 3, 1.5);
    g.generateTexture('dot', 6, 6);
    g.destroy();
  }

  genPowerPellet() {
    const g = this.make.graphics({ add: false });
    g.fillStyle(COLORS.NEON_CYAN, 0.3);
    g.fillCircle(7, 7, 7);
    g.fillStyle(COLORS.WHITE, 0.8);
    g.fillCircle(7, 7, 5);
    g.fillStyle(COLORS.WHITE, 1);
    g.fillCircle(7, 7, 3);
    g.generateTexture('power-pellet', 14, 14);
    g.destroy();
  }

  genPacman() {
    const g = this.make.graphics({ add: false });
    g.fillStyle(COLORS.NEON_YELLOW, 0.2);
    g.fillCircle(12, 12, 12);
    g.fillStyle(COLORS.NEON_YELLOW, 1);
    g.fillCircle(12, 12, 10);
    g.fillStyle(COLORS.BG_DARK, 1);
    g.fillTriangle(12, 12, 24, 6, 24, 18);
    g.generateTexture('pacman', 24, 24);
    g.destroy();
  }

  genGhosts() {
    const ghostDefs = [
      ['ghost-red', COLORS.NEON_RED],
      ['ghost-pink', COLORS.NEON_PINK],
      ['ghost-cyan', COLORS.NEON_CYAN],
      ['ghost-orange', COLORS.NEON_ORANGE],
    ];
    ghostDefs.forEach(([key, color]) => {
      const g = this.make.graphics({ add: false });
      g.fillStyle(color, 0.15);
      g.fillRoundedRect(-2, -2, 24, 24, { tl: 12, tr: 12, bl: 0, br: 0 });
      g.fillStyle(color, 1);
      g.fillRoundedRect(0, 0, 20, 20, { tl: 10, tr: 10, bl: 0, br: 0 });
      g.fillRect(0, 10, 20, 10);
      g.lineStyle(1, COLORS.WHITE, 0.3);
      g.strokeRoundedRect(0, 0, 20, 20, { tl: 10, tr: 10, bl: 0, br: 0 });
      g.fillStyle(COLORS.WHITE, 1);
      g.fillCircle(6, 8, 3);
      g.fillCircle(14, 8, 3);
      g.fillStyle(COLORS.NEON_BLUE, 1);
      g.fillCircle(7, 8, 1.5);
      g.fillCircle(15, 8, 1.5);
      g.generateTexture(key, 24, 24);
      g.destroy();
    });
  }

  genBreakout() {
    const g = this.make.graphics({ add: false });
    g.fillStyle(COLORS.NEON_CYAN, 0.2);
    g.fillRect(-2, -1, 84, 14);
    g.fillStyle(COLORS.WHITE, 1);
    g.fillRect(0, 0, 80, 12);
    g.lineStyle(1, COLORS.NEON_CYAN, 0.6);
    g.strokeRect(0, 0, 80, 12);
    g.generateTexture('paddle', 84, 14);
    g.destroy();

    const bg = this.make.graphics({ add: false });
    bg.fillStyle(COLORS.WHITE, 0.2);
    bg.fillCircle(5, 5, 5);
    bg.fillStyle(COLORS.WHITE, 1);
    bg.fillCircle(5, 5, 4);
    bg.generateTexture('ball', 10, 10);
    bg.destroy();

    const brickDefs = [
      ['brick-red', COLORS.NEON_RED],
      ['brick-orange', COLORS.NEON_ORANGE],
      ['brick-yellow', COLORS.NEON_YELLOW],
      ['brick-green', COLORS.NEON_GREEN],
      ['brick-cyan', COLORS.NEON_CYAN],
      ['brick-blue', COLORS.NEON_BLUE],
      ['brick-portal', COLORS.PORTAL_GLOW],
    ];
    brickDefs.forEach(([key, color]) => {
      const b = this.make.graphics({ add: false });
      b.fillStyle(color, 0.15);
      b.fillRect(-1, -1, 50, 18);
      b.fillStyle(color, 0.9);
      b.fillRect(0, 0, 48, 16);
      b.lineStyle(1, COLORS.WHITE, 0.25);
      b.strokeRect(0, 0, 48, 16);
      b.lineStyle(1, color, 0.5);
      b.strokeRect(-1, -1, 50, 18);
      b.generateTexture(key, 50, 18);
      b.destroy();
    });
  }

  genSpaceInvaders() {
    const g = this.make.graphics({ add: false });
    const pattern = [
      [0,0,1,0,0,0,0,0,1,0,0],
      [0,0,0,1,0,0,0,1,0,0,0],
      [0,0,1,1,1,1,1,1,1,0,0],
      [0,1,1,0,1,1,1,0,1,1,0],
      [1,1,1,1,1,1,1,1,1,1,1],
      [1,0,1,1,1,1,1,1,1,0,1],
      [1,0,1,0,0,0,0,0,1,0,1],
      [0,0,0,1,1,0,1,1,0,0,0],
    ];
    g.fillStyle(COLORS.NEON_GREEN, 0.15);
    g.fillRect(-1, -1, 24, 18);
    g.fillStyle(COLORS.NEON_GREEN, 1);
    pattern.forEach((row, ry) => row.forEach((v, rx) => {
      if (v) g.fillRect(rx * 2, ry * 2, 2, 2);
    }));
    g.generateTexture('invader', 24, 18);
    g.destroy();

    const sg = this.make.graphics({ add: false });
    sg.fillStyle(COLORS.NEON_GREEN, 0.2);
    sg.fillTriangle(12, -2, -2, 20, 26, 20);
    sg.fillStyle(COLORS.NEON_GREEN, 1);
    sg.fillTriangle(10, 0, 0, 18, 20, 18);
    sg.lineStyle(1, COLORS.NEON_GREEN, 0.4);
    sg.strokeTriangle(10, 0, 0, 18, 20, 18);
    sg.generateTexture('player-ship', 26, 20);
    sg.destroy();
  }

  genAsteroids() {
    const sg = this.make.graphics({ add: false });

    sg.fillStyle(COLORS.NEON_CYAN, 0.12);
    sg.fillTriangle(26, 14, 4, 2, 4, 26);

    sg.lineStyle(2, COLORS.NEON_CYAN, 0.25);
    sg.strokeTriangle(27, 14, 3, 1, 3, 27);

    sg.lineStyle(2, COLORS.NEON_CYAN, 1);
    sg.strokeTriangle(26, 14, 4, 2, 4, 26);

    sg.lineStyle(1, COLORS.NEON_CYAN, 0.5);
    sg.lineBetween(4, 8, 9, 14);
    sg.lineBetween(9, 14, 4, 20);

    sg.lineStyle(1.5, COLORS.WHITE, 0.8);
    sg.lineBetween(14, 14, 26, 14);

    sg.generateTexture('asteroid-ship', 28, 28);
    sg.destroy();

    [['asteroid-large', 40], ['asteroid-medium', 24], ['asteroid-small', 12]].forEach(([key, size]) => {
      const g = this.make.graphics({ add: false });
      const cx = size / 2, cy = size / 2, r = size / 2 - 2;
      const points = [];
      for (let i = 0; i < 8; i++) {
        const angle = (Math.PI * 2 * i) / 8;
        const vary = 0.7 + Math.random() * 0.3;
        points.push({ x: cx + Math.cos(angle) * r * vary, y: cy + Math.sin(angle) * r * vary });
      }
      g.lineStyle(2, COLORS.NEON_PURPLE, 0.2);
      g.beginPath();
      g.moveTo(points[0].x + 1, points[0].y + 1);
      points.forEach(p => g.lineTo(p.x + 1, p.y + 1));
      g.closePath();
      g.strokePath();
      g.lineStyle(2, COLORS.NEON_CYAN, 1);
      g.beginPath();
      g.moveTo(points[0].x, points[0].y);
      points.forEach(p => g.lineTo(p.x, p.y));
      g.closePath();
      g.strokePath();
      g.generateTexture(key, size, size);
      g.destroy();
    });
  }

  genFrogger() {
    const fg = this.make.graphics({ add: false });
    fg.fillStyle(COLORS.NEON_GREEN, 0.2);
    fg.fillRoundedRect(0, 0, 22, 22, 5);
    fg.fillStyle(COLORS.NEON_GREEN, 1);
    fg.fillRoundedRect(2, 2, 18, 18, 4);
    fg.fillStyle(COLORS.WHITE, 0.8);
    fg.fillCircle(7, 7, 2);
    fg.fillCircle(15, 7, 2);
    fg.fillStyle(COLORS.BG_DARK, 1);
    fg.fillCircle(7, 7, 1);
    fg.fillCircle(15, 7, 1);
    fg.generateTexture('frog', 22, 22);
    fg.destroy();

    ['car-red', 'car-blue', 'car-yellow'].forEach((key, i) => {
      const color = [COLORS.NEON_RED, COLORS.NEON_BLUE, COLORS.NEON_YELLOW][i];
      const g = this.make.graphics({ add: false });
      g.fillStyle(color, 0.15);
      g.fillRoundedRect(-1, 0, 34, 18, 4);
      g.fillStyle(color, 1);
      g.fillRoundedRect(0, 2, 32, 14, 3);
      g.lineStyle(1, COLORS.WHITE, 0.2);
      g.strokeRoundedRect(0, 2, 32, 14, 3);
      g.fillStyle(COLORS.WHITE, 0.5);
      g.fillRect(24, 5, 5, 8);
      g.generateTexture(key, 34, 18);
      g.destroy();
    });

    const lg = this.make.graphics({ add: false });
    lg.fillStyle(0x5D4037, 1);
    lg.fillRoundedRect(0, 2, 64, 14, 5);
    lg.lineStyle(1, 0x8D6E63, 0.4);
    lg.strokeRoundedRect(0, 2, 64, 14, 5);
    lg.generateTexture('log', 64, 18);
    lg.destroy();

    const lily = this.make.graphics({ add: false });
    lily.fillStyle(COLORS.NEON_GREEN, 0.2);
    lily.fillCircle(12, 12, 12);
    lily.fillStyle(0x228B22, 1);
    lily.fillCircle(12, 12, 10);
    lily.fillStyle(0x006400, 1);
    lily.fillTriangle(12, 12, 22, 7, 22, 17);
    lily.generateTexture('lilypad', 24, 24);
    lily.destroy();

    const pl = this.make.graphics({ add: false });
    pl.fillStyle(COLORS.PORTAL_GLOW, 0.3);
    pl.fillCircle(12, 12, 12);
    pl.fillStyle(COLORS.PORTAL_GLOW, 1);
    pl.fillCircle(12, 12, 10);
    pl.fillStyle(COLORS.WHITE, 0.4);
    pl.fillCircle(12, 12, 5);
    pl.generateTexture('lilypad-portal', 24, 24);
    pl.destroy();
  }

  genTetris() {
    const g = this.make.graphics({ add: false });
    g.fillStyle(COLORS.WHITE, 0.15);
    g.fillRect(-1, -1, 26, 26);
    g.fillStyle(COLORS.WHITE, 0.9);
    g.fillRect(0, 0, 24, 24);
    g.lineStyle(1, COLORS.NEON_CYAN, 0.4);
    g.strokeRect(0, 0, 24, 24);
    g.lineStyle(1, COLORS.WHITE, 0.15);
    g.strokeRect(2, 2, 20, 20);
    g.generateTexture('tetris-block', 26, 26);
    g.destroy();
  }

  genBullets() {
    const bg = this.make.graphics({ add: false });
    bg.fillStyle(COLORS.NEON_CYAN, 0.3);
    bg.fillRect(-1, -1, 5, 10);
    bg.fillStyle(COLORS.WHITE, 1);
    bg.fillRect(0, 0, 3, 8);
    bg.generateTexture('bullet', 5, 10);
    bg.destroy();

    const eg = this.make.graphics({ add: false });
    eg.fillStyle(COLORS.NEON_RED, 0.3);
    eg.fillRect(-1, -1, 5, 10);
    eg.fillStyle(COLORS.NEON_RED, 1);
    eg.fillRect(0, 0, 3, 8);
    eg.generateTexture('enemy-bullet', 5, 10);
    eg.destroy();
  }

  genMothership() {
    const g = this.make.graphics({ add: false });
    g.fillStyle(COLORS.NEON_RED, 0.2);
    g.fillEllipse(18, 10, 36, 18);
    g.fillStyle(COLORS.NEON_RED, 1);
    g.fillEllipse(16, 8, 32, 14);
    g.fillStyle(COLORS.NEON_PINK, 0.8);
    g.fillEllipse(16, 6, 20, 6);
    g.lineStyle(1, COLORS.NEON_RED, 0.4);
    g.strokeEllipse(16, 8, 32, 14);
    g.generateTexture('mothership', 36, 18);
    g.destroy();
  }

  genPixel() {
    const g = this.make.graphics({ add: false });
    g.fillStyle(COLORS.WHITE, 1);
    g.fillRect(0, 0, 1, 1);
    g.generateTexture('pixel', 1, 1);
    g.destroy();
  }

  genPowerUps() {
    const defs = [
      ['powerup-multiball', COLORS.NEON_CYAN],
      ['powerup-shield', COLORS.NEON_BLUE],
      ['powerup-speed', COLORS.NEON_YELLOW],
      ['powerup-magnet', COLORS.NEON_MAGENTA],
      ['powerup-bomb', COLORS.NEON_RED],
      ['powerup-freeze', COLORS.NEON_CYAN],
      ['powerup-spread', COLORS.NEON_ORANGE],
      ['powerup-phase', COLORS.NEON_PURPLE],
    ];
    defs.forEach(([key, color]) => {
      const g = this.make.graphics({ add: false });
      g.fillStyle(color, 0.2);
      g.fillCircle(10, 10, 10);
      g.fillStyle(color, 0.6);
      g.fillCircle(10, 10, 7);
      g.fillStyle(COLORS.WHITE, 0.9);
      g.fillCircle(10, 10, 4);
      g.lineStyle(1, color, 0.8);
      g.strokeCircle(10, 10, 9);
      g.generateTexture(key, 20, 20);
      g.destroy();
    });
  }

  create() {
    this.scene.start('MenuScene');
  }
}
