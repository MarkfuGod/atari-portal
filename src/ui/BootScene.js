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
    g.fillStyle(COLORS.NEON_PURPLE, 0.15);
    g.fillCircle(8, 8, 8);
    g.lineStyle(1, COLORS.NEON_PURPLE, 0.4);
    g.strokeCircle(8, 8, 7);
    g.fillStyle(COLORS.PORTAL_CORE, 0.5);
    g.fillCircle(8, 8, 5);
    g.fillStyle(COLORS.PORTAL_CORE, 1);
    g.fillCircle(8, 8, 3);
    g.fillStyle(COLORS.WHITE, 0.9);
    g.fillCircle(8, 8, 1.5);
    g.generateTexture('portal-pellet', 16, 16);
    g.destroy();
  }

  genDot() {
    const g = this.make.graphics({ add: false });
    g.fillStyle(COLORS.NEON_CYAN, 0.3);
    g.fillRect(1, 1, 4, 4);
    g.fillStyle(COLORS.WHITE, 0.9);
    g.fillRect(2, 2, 2, 2);
    g.generateTexture('dot', 6, 6);
    g.destroy();
  }

  genPowerPellet() {
    const g = this.make.graphics({ add: false });
    g.fillStyle(COLORS.NEON_CYAN, 0.2);
    g.fillCircle(7, 7, 7);
    g.lineStyle(1, COLORS.NEON_CYAN, 0.6);
    g.strokeCircle(7, 7, 6);
    g.fillStyle(COLORS.NEON_CYAN, 0.7);
    g.fillCircle(7, 7, 4);
    g.fillStyle(COLORS.WHITE, 1);
    g.fillCircle(7, 7, 2);
    g.lineStyle(1, COLORS.WHITE, 0.3);
    g.strokeCircle(7, 7, 5);
    g.generateTexture('power-pellet', 14, 14);
    g.destroy();
  }

  genPacman() {
    const g = this.make.graphics({ add: false });
    g.fillStyle(COLORS.NEON_YELLOW, 0.12);
    g.fillCircle(12, 12, 12);
    g.lineStyle(1.5, COLORS.NEON_YELLOW, 0.6);
    g.strokeCircle(12, 12, 11);
    g.fillStyle(COLORS.NEON_YELLOW, 0.9);
    g.fillCircle(12, 12, 9);
    g.fillStyle(COLORS.BG_DARK, 1);
    g.fillTriangle(12, 12, 24, 6, 24, 18);
    g.lineStyle(1, COLORS.NEON_YELLOW, 0.4);
    g.beginPath();
    g.moveTo(12, 12); g.lineTo(24, 6);
    g.strokePath();
    g.beginPath();
    g.moveTo(12, 12); g.lineTo(24, 18);
    g.strokePath();
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
      // Outer glow
      g.fillStyle(color, 0.1);
      g.fillRoundedRect(-1, -1, 22, 22, { tl: 11, tr: 11, bl: 0, br: 0 });
      // Body outline only (skeletal geometric daemon)
      g.lineStyle(1.5, color, 0.9);
      g.strokeRoundedRect(2, 2, 16, 16, { tl: 8, tr: 8, bl: 0, br: 0 });
      // Internal fill subtle
      g.fillStyle(color, 0.25);
      g.fillRoundedRect(3, 3, 14, 14, { tl: 7, tr: 7, bl: 0, br: 0 });
      // Geometric diamond eyes
      g.fillStyle(COLORS.WHITE, 1);
      g.fillTriangle(6, 6, 9, 8, 6, 10);
      g.fillTriangle(14, 6, 11, 8, 14, 10);
      // Bottom trailing lines
      g.lineStyle(1, color, 0.5);
      g.lineBetween(4, 18, 4, 22);
      g.lineBetween(8, 18, 8, 21);
      g.lineBetween(12, 18, 12, 22);
      g.lineBetween(16, 18, 16, 21);
      g.generateTexture(key, 24, 24);
      g.destroy();
    });
  }

  genBreakout() {
    // Holographic data sled paddle
    const g = this.make.graphics({ add: false });
    g.fillStyle(COLORS.BG_DARK, 0.8);
    g.fillRect(2, 1, 80, 12);
    g.lineStyle(1.5, COLORS.NEON_CYAN, 0.9);
    g.strokeRect(2, 1, 80, 12);
    g.lineStyle(1, COLORS.NEON_CYAN, 0.3);
    g.strokeRect(0, 0, 84, 14);
    // Scan lines inside paddle
    for (let sy = 3; sy < 12; sy += 2) {
      g.lineStyle(1, COLORS.NEON_CYAN, 0.12);
      g.lineBetween(4, sy, 82, sy);
    }
    // Center accent
    g.fillStyle(COLORS.NEON_CYAN, 0.4);
    g.fillRect(38, 3, 8, 8);
    g.generateTexture('paddle', 84, 14);
    g.destroy();

    // Plasma ball with glow
    const bg = this.make.graphics({ add: false });
    bg.fillStyle(COLORS.NEON_CYAN, 0.15);
    bg.fillCircle(5, 5, 5);
    bg.fillStyle(COLORS.NEON_CYAN, 0.4);
    bg.fillCircle(5, 5, 4);
    bg.fillStyle(COLORS.WHITE, 1);
    bg.fillCircle(5, 5, 2.5);
    bg.generateTexture('ball', 10, 10);
    bg.destroy();

    // Data module bricks with labels
    const brickDefs = [
      ['brick-red', COLORS.NEON_RED, 'ERR'],
      ['brick-orange', COLORS.NEON_ORANGE, '0xFF'],
      ['brick-yellow', COLORS.NEON_YELLOW, 'DATA'],
      ['brick-green', COLORS.NEON_GREEN, 'ENC'],
      ['brick-cyan', COLORS.NEON_CYAN, 'SYS'],
      ['brick-blue', COLORS.NEON_BLUE, 'KEY'],
      ['brick-portal', COLORS.PORTAL_GLOW, 'RIFT'],
    ];
    brickDefs.forEach(([key, color, label]) => {
      const b = this.make.graphics({ add: false });
      // Dark fill + neon edge glow
      b.fillStyle(COLORS.BG_DARK, 0.9);
      b.fillRect(1, 1, 48, 16);
      b.lineStyle(1.5, color, 0.8);
      b.strokeRect(1, 1, 48, 16);
      b.lineStyle(1, color, 0.2);
      b.strokeRect(0, 0, 50, 18);
      // Internal scan line
      b.lineStyle(1, color, 0.1);
      b.lineBetween(3, 9, 47, 9);
      b.generateTexture(key, 50, 18);
      b.destroy();
    });
  }

  genSpaceInvaders() {
    // Geometric malware virus (neon red line art)
    const g = this.make.graphics({ add: false });
    g.fillStyle(COLORS.NEON_RED, 0.08);
    g.fillRect(0, 0, 24, 18);
    // Geometric insect-like body
    g.lineStyle(1.5, COLORS.NEON_RED, 0.9);
    g.strokeTriangle(12, 1, 3, 10, 21, 10);
    g.strokeRect(6, 10, 12, 6);
    g.lineStyle(1, COLORS.NEON_RED, 0.5);
    g.lineBetween(3, 10, 1, 16);
    g.lineBetween(21, 10, 23, 16);
    g.lineBetween(6, 16, 4, 18);
    g.lineBetween(18, 16, 20, 18);
    // Core eye
    g.fillStyle(COLORS.WHITE, 0.9);
    g.fillCircle(12, 8, 2);
    g.generateTexture('invader', 24, 18);
    g.destroy();

    // Orange neon skeletal turret
    const sg = this.make.graphics({ add: false });
    sg.fillStyle(COLORS.NEON_ORANGE, 0.08);
    sg.fillRect(0, 0, 26, 20);
    sg.lineStyle(1.5, COLORS.NEON_ORANGE, 0.9);
    sg.strokeTriangle(13, 1, 2, 18, 24, 18);
    sg.lineStyle(1, COLORS.NEON_ORANGE, 0.5);
    sg.lineBetween(7, 10, 19, 10);
    sg.lineBetween(13, 1, 13, 18);
    // Glow core
    sg.fillStyle(COLORS.NEON_ORANGE, 0.4);
    sg.fillCircle(13, 10, 3);
    sg.fillStyle(COLORS.WHITE, 0.8);
    sg.fillCircle(13, 10, 1.5);
    sg.generateTexture('player-ship', 26, 20);
    sg.destroy();

    // Holographic gold data grid shield
    const sh = this.make.graphics({ add: false });
    sh.fillStyle(0xffd700, 0.08);
    sh.fillRect(0, 0, 40, 30);
    // Hex grid pattern
    for (let hx = 0; hx < 5; hx++) {
      for (let hy = 0; hy < 4; hy++) {
        const ox = hx * 9 + (hy % 2) * 4.5 + 2;
        const oy = hy * 8 + 3;
        sh.lineStyle(1, 0xffd700, 0.35);
        sh.strokeCircle(ox, oy, 4);
      }
    }
    sh.lineStyle(1.5, 0xffd700, 0.6);
    sh.strokeRect(1, 1, 38, 28);
    sh.generateTexture('shield', 40, 30);
    sh.destroy();
  }

  genAsteroids() {
    // Minimalist neon white triangle ship with thruster
    const sg = this.make.graphics({ add: false });
    sg.lineStyle(1.5, COLORS.WHITE, 0.9);
    sg.strokeTriangle(26, 14, 4, 2, 4, 26);
    sg.lineStyle(1, COLORS.WHITE, 0.3);
    sg.strokeTriangle(27, 14, 3, 1, 3, 27);
    // Thruster glow at rear
    sg.fillStyle(COLORS.NEON_CYAN, 0.4);
    sg.fillCircle(4, 14, 3);
    sg.fillStyle(COLORS.WHITE, 0.6);
    sg.fillCircle(4, 14, 1.5);
    sg.generateTexture('asteroid-ship', 28, 28);
    sg.destroy();

    // Damaged data clumps: purple fill + neon purple cracks + edge glow
    [['asteroid-large', 40], ['asteroid-medium', 24], ['asteroid-small', 12]].forEach(([key, size]) => {
      const g = this.make.graphics({ add: false });
      const cx = size / 2, cy = size / 2, r = size / 2 - 2;
      const points = [];
      for (let i = 0; i < 8; i++) {
        const angle = (Math.PI * 2 * i) / 8;
        const vary = 0.7 + Math.random() * 0.3;
        points.push({ x: cx + Math.cos(angle) * r * vary, y: cy + Math.sin(angle) * r * vary });
      }
      // Dark purple fill
      g.fillStyle(0x1a0030, 0.7);
      g.beginPath();
      g.moveTo(points[0].x, points[0].y);
      points.forEach(p => g.lineTo(p.x, p.y));
      g.closePath();
      g.fillPath();
      // Outer glow
      g.lineStyle(2, COLORS.NEON_PURPLE, 0.25);
      g.beginPath();
      g.moveTo(points[0].x + 1, points[0].y + 1);
      points.forEach(p => g.lineTo(p.x + 1, p.y + 1));
      g.closePath();
      g.strokePath();
      // Main edge
      g.lineStyle(1.5, COLORS.NEON_PURPLE, 0.9);
      g.beginPath();
      g.moveTo(points[0].x, points[0].y);
      points.forEach(p => g.lineTo(p.x, p.y));
      g.closePath();
      g.strokePath();
      // Crack lines
      if (size > 14) {
        g.lineStyle(1, COLORS.NEON_PURPLE, 0.5);
        g.lineBetween(cx - r * 0.3, cy - r * 0.2, cx + r * 0.4, cy + r * 0.3);
        g.lineBetween(cx + r * 0.1, cy - r * 0.4, cx - r * 0.2, cy + r * 0.3);
      }
      g.generateTexture(key, size, size);
      g.destroy();
    });
  }

  genFrogger() {
    // Cyber frog robot: neon green light strips + semi-transparent shell
    const fg = this.make.graphics({ add: false });
    fg.fillStyle(COLORS.NEON_GREEN, 0.1);
    fg.fillRoundedRect(0, 0, 22, 22, 4);
    fg.lineStyle(1.5, COLORS.NEON_GREEN, 0.8);
    fg.strokeRoundedRect(2, 2, 18, 18, 3);
    // Light strips
    fg.lineStyle(2, COLORS.NEON_GREEN, 0.6);
    fg.lineBetween(5, 4, 5, 18);
    fg.lineBetween(17, 4, 17, 18);
    fg.lineStyle(1, COLORS.NEON_GREEN, 0.3);
    fg.lineBetween(8, 12, 14, 12);
    // Glowing eyes
    fg.fillStyle(COLORS.WHITE, 0.9);
    fg.fillCircle(7, 7, 2);
    fg.fillCircle(15, 7, 2);
    fg.fillStyle(COLORS.NEON_GREEN, 1);
    fg.fillCircle(7, 7, 1);
    fg.fillCircle(15, 7, 1);
    fg.generateTexture('frog', 22, 22);
    fg.destroy();

    // Data packets (streamlined cyan/blue rectangles with speed lines)
    ['car-red', 'car-blue', 'car-yellow'].forEach((key, i) => {
      const color = [COLORS.NEON_CYAN, COLORS.NEON_BLUE, COLORS.NEON_CYAN][i];
      const g = this.make.graphics({ add: false });
      g.fillStyle(color, 0.06);
      g.fillRect(0, 1, 34, 16);
      g.lineStyle(1.5, color, 0.8);
      g.strokeRect(1, 2, 32, 14);
      // Speed lines
      g.lineStyle(1, color, 0.3);
      g.lineBetween(3, 5, 15, 5);
      g.lineBetween(3, 9, 20, 9);
      g.lineBetween(3, 13, 12, 13);
      // Front glow
      g.fillStyle(COLORS.WHITE, 0.5);
      g.fillRect(30, 5, 2, 8);
      g.generateTexture(key, 34, 18);
      g.destroy();
    });

    // Holographic floating platform (replaces log)
    const lg = this.make.graphics({ add: false });
    lg.fillStyle(COLORS.NEON_CYAN, 0.06);
    lg.fillRect(0, 2, 64, 14);
    lg.lineStyle(1.5, COLORS.NEON_CYAN, 0.6);
    lg.strokeRect(1, 3, 62, 12);
    // Internal grid
    for (let gx = 10; gx < 60; gx += 12) {
      lg.lineStyle(1, COLORS.NEON_CYAN, 0.15);
      lg.lineBetween(gx, 4, gx, 14);
    }
    lg.generateTexture('log', 64, 18);
    lg.destroy();

    // Data node lilypad (hexagonal)
    const lily = this.make.graphics({ add: false });
    lily.fillStyle(COLORS.NEON_GREEN, 0.1);
    lily.fillCircle(12, 12, 12);
    lily.lineStyle(1.5, COLORS.NEON_GREEN, 0.7);
    // Hexagon
    const hpts = [];
    for (let i = 0; i < 6; i++) {
      const ha = (Math.PI * 2 * i) / 6 - Math.PI / 6;
      hpts.push({ x: 12 + Math.cos(ha) * 9, y: 12 + Math.sin(ha) * 9 });
    }
    lily.beginPath();
    lily.moveTo(hpts[0].x, hpts[0].y);
    hpts.forEach(p => lily.lineTo(p.x, p.y));
    lily.closePath();
    lily.strokePath();
    lily.fillStyle(COLORS.NEON_GREEN, 0.3);
    lily.fillCircle(12, 12, 4);
    lily.generateTexture('lilypad', 24, 24);
    lily.destroy();

    const pl = this.make.graphics({ add: false });
    pl.fillStyle(COLORS.PORTAL_GLOW, 0.15);
    pl.fillCircle(12, 12, 12);
    pl.lineStyle(1.5, COLORS.PORTAL_GLOW, 0.8);
    pl.strokeCircle(12, 12, 10);
    pl.fillStyle(COLORS.PORTAL_GLOW, 0.5);
    pl.fillCircle(12, 12, 5);
    pl.fillStyle(COLORS.WHITE, 0.6);
    pl.fillCircle(12, 12, 2);
    pl.generateTexture('lilypad-portal', 24, 24);
    pl.destroy();
  }

  genTetris() {
    // Core data block: semi-transparent + neon edge + energy core
    const g = this.make.graphics({ add: false });
    g.fillStyle(COLORS.BG_MID, 0.5);
    g.fillRect(1, 1, 24, 24);
    // Neon edge
    g.lineStyle(1.5, COLORS.NEON_CYAN, 0.7);
    g.strokeRect(1, 1, 24, 24);
    g.lineStyle(1, COLORS.NEON_CYAN, 0.2);
    g.strokeRect(0, 0, 26, 26);
    // Inner energy core
    g.fillStyle(COLORS.WHITE, 0.2);
    g.fillRect(8, 8, 10, 10);
    g.fillStyle(COLORS.WHITE, 0.5);
    g.fillRect(10, 10, 6, 6);
    // Code lines
    g.lineStyle(1, COLORS.NEON_CYAN, 0.1);
    g.lineBetween(3, 6, 14, 6);
    g.lineBetween(3, 19, 10, 19);
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
    // Boss virus: complex geometric neon red construction
    const g = this.make.graphics({ add: false });
    g.fillStyle(COLORS.NEON_RED, 0.08);
    g.fillEllipse(18, 9, 36, 18);
    g.lineStyle(1.5, COLORS.NEON_RED, 0.8);
    g.strokeEllipse(18, 9, 32, 14);
    g.lineStyle(1, COLORS.NEON_RED, 0.4);
    g.strokeEllipse(18, 9, 24, 8);
    // Geometric detail
    g.lineStyle(1, COLORS.NEON_RED, 0.5);
    g.lineBetween(6, 9, 30, 9);
    g.lineBetween(18, 2, 18, 16);
    // Core
    g.fillStyle(COLORS.WHITE, 0.7);
    g.fillCircle(18, 9, 2);
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
