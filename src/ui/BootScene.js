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
    g.fillStyle(COLORS.NEON_YELLOW, 0.08);
    g.fillCircle(12, 12, 12);
    g.fillStyle(COLORS.NEON_ORANGE, 0.12);
    g.fillCircle(12, 12, 10.5);
    g.lineStyle(2, COLORS.NEON_YELLOW, 0.25);
    g.strokeCircle(12, 12, 11.5);
    g.lineStyle(1.5, COLORS.NEON_YELLOW, 0.7);
    g.strokeCircle(12, 12, 10.2);
    g.fillStyle(COLORS.NEON_YELLOW, 0.88);
    g.fillCircle(12, 12, 8.5);
    g.fillStyle(COLORS.BG_DARK, 1);
    g.fillTriangle(12, 12, 24, 6, 24, 18);
    g.lineStyle(1, COLORS.NEON_YELLOW, 0.55);
    g.beginPath();
    g.moveTo(12, 12); g.lineTo(24, 6);
    g.strokePath();
    g.beginPath();
    g.moveTo(12, 12); g.lineTo(24, 18);
    g.strokePath();
    g.lineStyle(1, COLORS.NEON_ORANGE, 0.45);
    g.beginPath();
    g.moveTo(6, 6); g.lineTo(12, 12); g.lineTo(6, 18);
    g.strokePath();
    g.lineStyle(1, COLORS.WHITE, 0.8);
    g.strokeCircle(12, 12, 5.5);
    g.fillStyle(COLORS.BG_DARK, 1);
    g.fillCircle(11, 8, 1.2);
    g.fillStyle(COLORS.WHITE, 0.8);
    g.fillCircle(10.6, 7.6, 0.45);
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
    ghostDefs.forEach(([key, color], index) => {
      const g = this.make.graphics({ add: false });
      g.fillStyle(color, 0.1);
      g.fillCircle(12, 10, 12);
      g.lineStyle(2, color, 0.18);
      g.strokeCircle(12, 10, 11);
      g.lineStyle(1.5, color, 0.9);
      g.beginPath();
      g.moveTo(5, 17);
      g.lineTo(5, 9);
      g.lineTo(8.5, 4);
      g.lineTo(15.5, 4);
      g.lineTo(19, 9);
      g.lineTo(19, 17);
      g.lineTo(16.5, 20);
      g.lineTo(14, 17.5);
      g.lineTo(12, 20);
      g.lineTo(10, 17.5);
      g.lineTo(7.5, 20);
      g.closePath();
      g.strokePath();
      g.lineStyle(1, color, 0.35);
      g.lineBetween(8, 7, 16, 7);
      g.lineBetween(7, 12, 17, 12);
      g.lineBetween(8, 16, 16, 16);
      if (index === 0) {
        g.lineBetween(12, 5, 12, 17);
      } else if (index === 1) {
        g.lineBetween(8, 7, 12, 16);
        g.lineBetween(16, 7, 12, 16);
      } else if (index === 2) {
        g.strokeCircle(12, 11, 4);
      } else {
        g.lineBetween(9, 6, 15, 18);
        g.lineBetween(15, 6, 9, 18);
      }
      g.fillStyle(COLORS.WHITE, 1);
      g.fillTriangle(8, 8, 10.5, 10, 8, 12);
      g.fillTriangle(16, 8, 13.5, 10, 16, 12);
      g.fillStyle(color, 0.6);
      g.fillCircle(12, 13, 1.5);
      g.lineStyle(1, color, 0.55);
      g.lineBetween(6, 18, 4.5, 22);
      g.lineBetween(10, 18, 9, 21);
      g.lineBetween(14, 18, 15, 22);
      g.lineBetween(18, 18, 19.5, 21);
      g.generateTexture(key, 24, 24);
      g.destroy();
    });
  }

  genBreakout() {
    const g = this.make.graphics({ add: false });
    g.fillStyle(COLORS.NEON_CYAN, 0.06);
    g.fillRoundedRect(0, 0, 84, 14, 5);
    g.lineStyle(2, COLORS.NEON_CYAN, 0.2);
    g.strokeRoundedRect(1, 1, 82, 12, 5);
    g.lineStyle(1.5, COLORS.NEON_CYAN, 0.9);
    g.beginPath();
    g.moveTo(10, 1);
    g.lineTo(74, 1);
    g.lineTo(82, 7);
    g.lineTo(74, 13);
    g.lineTo(10, 13);
    g.lineTo(2, 7);
    g.closePath();
    g.strokePath();
    g.lineStyle(1, COLORS.NEON_CYAN, 0.28);
    for (let x = 14; x < 74; x += 10) {
      g.lineBetween(x, 3, x + 3, 11);
    }
    g.fillStyle(COLORS.NEON_CYAN, 0.2);
    g.fillRoundedRect(30, 3, 24, 8, 3);
    g.lineStyle(1, COLORS.WHITE, 0.55);
    g.strokeRect(34, 5, 16, 4);
    g.fillStyle(COLORS.WHITE, 0.18);
    g.fillRect(36, 6, 12, 2);
    g.generateTexture('paddle', 84, 14);
    g.destroy();

    const bg = this.make.graphics({ add: false });
    bg.fillStyle(COLORS.NEON_CYAN, 0.12);
    bg.fillCircle(8, 8, 8);
    bg.fillStyle(COLORS.NEON_MAGENTA, 0.14);
    bg.fillCircle(8, 8, 6.5);
    bg.lineStyle(1.2, COLORS.NEON_CYAN, 0.7);
    bg.strokeCircle(8, 8, 5.2);
    bg.lineStyle(1, COLORS.WHITE, 0.5);
    bg.strokeCircle(8, 8, 3.3);
    bg.fillStyle(COLORS.WHITE, 1);
    bg.fillCircle(8, 8, 2.4);
    bg.fillStyle(COLORS.NEON_CYAN, 0.45);
    bg.fillCircle(6.4, 6.2, 1.6);
    bg.generateTexture('ball', 16, 16);
    bg.destroy();

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
      b.fillStyle(color, 0.06);
      b.fillRoundedRect(0, 0, 50, 18, 3);
      b.fillStyle(COLORS.BG_DARK, 0.92);
      b.fillRoundedRect(1, 1, 48, 16, 3);
      b.lineStyle(1.5, color, 0.85);
      b.strokeRoundedRect(1, 1, 48, 16, 3);
      b.lineStyle(1, color, 0.18);
      b.strokeRoundedRect(0, 0, 50, 18, 3);
      b.lineStyle(1, color, 0.18);
      b.lineBetween(5, 5, 45, 5);
      b.lineBetween(5, 13, 45, 13);
      const segments = Math.min(6, label.length + 2);
      for (let i = 0; i < segments; i++) {
        const x = 6 + i * 7;
        b.lineStyle(1, color, 0.35 - i * 0.03);
        b.lineBetween(x, 8.8, x + 3, 8.8);
      }
      b.fillStyle(COLORS.WHITE, 0.12);
      b.fillRect(4, 4, 10, 2);
      b.fillRect(34, 12, 9, 2);
      b.generateTexture(key, 50, 18);
      b.destroy();
    });
  }

  genSpaceInvaders() {
    const g = this.make.graphics({ add: false });
    g.fillStyle(COLORS.NEON_RED, 0.06);
    g.fillCircle(12, 9, 11);
    g.lineStyle(2, COLORS.NEON_RED, 0.18);
    g.strokeCircle(12, 9, 10);
    g.lineStyle(1.5, COLORS.NEON_RED, 0.9);
    g.strokeTriangle(12, 2, 5, 8, 19, 8);
    g.strokeRect(7, 8, 10, 6);
    g.lineStyle(1, COLORS.NEON_RED, 0.55);
    g.lineBetween(5, 8, 2, 4);
    g.lineBetween(19, 8, 22, 4);
    g.lineBetween(7, 11, 2, 16);
    g.lineBetween(17, 11, 22, 16);
    g.lineBetween(9, 14, 6, 18);
    g.lineBetween(15, 14, 18, 18);
    g.lineBetween(12, 3, 12, 14);
    g.fillStyle(COLORS.WHITE, 0.9);
    g.fillCircle(12, 7, 1.8);
    g.generateTexture('invader', 24, 18);
    g.destroy();

    const sg = this.make.graphics({ add: false });
    sg.fillStyle(COLORS.NEON_ORANGE, 0.08);
    sg.fillCircle(13, 10, 12);
    sg.lineStyle(1.5, COLORS.NEON_ORANGE, 0.9);
    sg.beginPath();
    sg.moveTo(2, 12);
    sg.lineTo(8, 6);
    sg.lineTo(13, 2);
    sg.lineTo(18, 6);
    sg.lineTo(24, 12);
    sg.lineTo(18, 18);
    sg.lineTo(8, 18);
    sg.closePath();
    sg.strokePath();
    sg.lineStyle(1, COLORS.NEON_ORANGE, 0.45);
    sg.lineBetween(5, 12, 21, 12);
    sg.lineBetween(13, 3, 13, 18);
    sg.lineBetween(8, 6, 18, 18);
    sg.lineBetween(18, 6, 8, 18);
    sg.fillStyle(COLORS.NEON_ORANGE, 0.28);
    sg.fillCircle(13, 11, 4);
    sg.fillStyle(COLORS.WHITE, 0.8);
    sg.fillCircle(13, 11, 1.7);
    sg.generateTexture('player-ship', 26, 20);
    sg.destroy();

    const sh = this.make.graphics({ add: false });
    sh.fillStyle(0xffd700, 0.06);
    sh.beginPath();
    sh.moveTo(4, 1);
    sh.lineTo(36, 1);
    sh.lineTo(39, 28);
    sh.lineTo(1, 28);
    sh.closePath();
    sh.fillPath();
    sh.lineStyle(1.5, 0xffd700, 0.65);
    sh.beginPath();
    sh.moveTo(4, 1);
    sh.lineTo(36, 1);
    sh.lineTo(39, 28);
    sh.lineTo(1, 28);
    sh.closePath();
    sh.strokePath();
    for (let y = 5; y < 26; y += 5) {
      sh.lineStyle(1, 0xffd700, 0.18);
      sh.lineBetween(4, y, 36, y + 1);
    }
    for (let x = 8; x < 34; x += 7) {
      sh.lineStyle(1, 0xffd700, 0.16);
      sh.lineBetween(x, 3, x + 3, 26);
    }
    sh.generateTexture('shield', 40, 30);
    sh.destroy();
  }

  genAsteroids() {
    const sg = this.make.graphics({ add: false });
    sg.fillStyle(COLORS.NEON_CYAN, 0.07);
    sg.fillCircle(14, 14, 13);
    sg.lineStyle(1.5, COLORS.WHITE, 0.95);
    sg.beginPath();
    sg.moveTo(25, 14);
    sg.lineTo(7, 3);
    sg.lineTo(10, 14);
    sg.lineTo(7, 25);
    sg.closePath();
    sg.strokePath();
    sg.lineStyle(1, COLORS.NEON_CYAN, 0.35);
    sg.lineBetween(10, 14, 24, 14);
    sg.lineBetween(8, 4, 18, 14);
    sg.lineBetween(8, 24, 18, 14);
    sg.fillStyle(COLORS.NEON_CYAN, 0.4);
    sg.fillCircle(5, 14, 3.5);
    sg.fillStyle(COLORS.WHITE, 0.6);
    sg.fillCircle(5.5, 14, 1.6);
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
      g.fillStyle(0x12001f, 0.92);
      g.beginPath();
      g.moveTo(points[0].x, points[0].y);
      points.forEach(p => g.lineTo(p.x, p.y));
      g.closePath();
      g.fillPath();
      g.lineStyle(3, COLORS.NEON_PURPLE, 0.12);
      g.beginPath();
      g.moveTo(points[0].x + 1, points[0].y + 1);
      points.forEach(p => g.lineTo(p.x + 1, p.y + 1));
      g.closePath();
      g.strokePath();
      g.lineStyle(1.5, COLORS.NEON_PURPLE, 0.9);
      g.beginPath();
      g.moveTo(points[0].x, points[0].y);
      points.forEach(p => g.lineTo(p.x, p.y));
      g.closePath();
      g.strokePath();
      g.fillStyle(COLORS.NEON_PURPLE, 0.08);
      g.fillCircle(cx, cy, Math.max(3, size * 0.18));
      if (size > 14) {
        g.lineStyle(1, COLORS.NEON_PURPLE, 0.65);
        g.lineBetween(cx - r * 0.3, cy - r * 0.2, cx + r * 0.4, cy + r * 0.3);
        g.lineBetween(cx + r * 0.1, cy - r * 0.4, cx - r * 0.2, cy + r * 0.3);
        g.lineStyle(1, COLORS.WHITE, 0.22);
        g.lineBetween(cx - r * 0.12, cy + r * 0.05, cx + r * 0.2, cy - r * 0.18);
      }
      g.generateTexture(key, size, size);
      g.destroy();
    });
  }

  genFrogger() {
    const fg = this.make.graphics({ add: false });
    fg.fillStyle(COLORS.NEON_GREEN, 0.08);
    fg.fillCircle(11, 11, 11);
    fg.lineStyle(1.5, COLORS.NEON_GREEN, 0.8);
    fg.beginPath();
    fg.moveTo(4, 8);
    fg.lineTo(8, 4);
    fg.lineTo(14, 4);
    fg.lineTo(18, 8);
    fg.lineTo(18, 15);
    fg.lineTo(14, 19);
    fg.lineTo(8, 19);
    fg.lineTo(4, 15);
    fg.closePath();
    fg.strokePath();
    fg.lineStyle(2, COLORS.NEON_GREEN, 0.45);
    fg.lineBetween(7, 6, 6, 16);
    fg.lineBetween(15, 6, 16, 16);
    fg.lineStyle(1, COLORS.NEON_GREEN, 0.3);
    fg.lineBetween(8, 12, 14, 12);
    fg.lineBetween(11, 6, 11, 17);
    fg.fillStyle(COLORS.WHITE, 0.9);
    fg.fillCircle(8, 8, 1.8);
    fg.fillCircle(14, 8, 1.8);
    fg.fillStyle(COLORS.NEON_GREEN, 1);
    fg.fillCircle(8, 8, 0.8);
    fg.fillCircle(14, 8, 0.8);
    fg.generateTexture('frog', 22, 22);
    fg.destroy();

    ['car-red', 'car-blue', 'car-yellow'].forEach((key, i) => {
      const color = [COLORS.NEON_CYAN, COLORS.NEON_BLUE, COLORS.NEON_YELLOW][i];
      const g = this.make.graphics({ add: false });
      g.fillStyle(color, 0.07);
      g.fillRoundedRect(0, 1, 34, 16, 4);
      g.lineStyle(1.5, color, 0.8);
      g.beginPath();
      g.moveTo(2, 8);
      g.lineTo(8, 2);
      g.lineTo(28, 2);
      g.lineTo(32, 8);
      g.lineTo(28, 16);
      g.lineTo(8, 16);
      g.closePath();
      g.strokePath();
      g.lineStyle(1, color, 0.28);
      g.lineBetween(5, 6, 18, 6);
      g.lineBetween(5, 10, 22, 10);
      g.lineBetween(5, 13, 15, 13);
      g.fillStyle(COLORS.WHITE, 0.5);
      g.fillRect(28, 5, 3, 6);
      g.generateTexture(key, 34, 18);
      g.destroy();
    });

    const lg = this.make.graphics({ add: false });
    lg.fillStyle(COLORS.NEON_CYAN, 0.06);
    lg.beginPath();
    lg.moveTo(4, 2);
    lg.lineTo(60, 2);
    lg.lineTo(63, 9);
    lg.lineTo(60, 16);
    lg.lineTo(4, 16);
    lg.lineTo(1, 9);
    lg.closePath();
    lg.fillPath();
    lg.lineStyle(1.5, COLORS.NEON_CYAN, 0.65);
    lg.beginPath();
    lg.moveTo(4, 2);
    lg.lineTo(60, 2);
    lg.lineTo(63, 9);
    lg.lineTo(60, 16);
    lg.lineTo(4, 16);
    lg.lineTo(1, 9);
    lg.closePath();
    lg.strokePath();
    for (let gx = 10; gx < 60; gx += 12) {
      lg.lineStyle(1, COLORS.NEON_CYAN, 0.15);
      lg.lineBetween(gx, 5, gx + 2, 13);
    }
    lg.generateTexture('log', 64, 18);
    lg.destroy();

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
    lily.lineStyle(1, COLORS.WHITE, 0.2);
    lily.strokeCircle(12, 12, 5.5);
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
    const g = this.make.graphics({ add: false });
    g.fillStyle(COLORS.NEON_CYAN, 0.08);
    g.fillRect(0, 0, 26, 26);
    g.fillStyle(COLORS.BG_MID, 0.65);
    g.fillRect(1, 1, 24, 24);
    g.fillStyle(COLORS.WHITE, 0.08);
    g.fillRect(3, 3, 8, 8);
    g.fillStyle(COLORS.WHITE, 0.04);
    g.fillRect(12, 12, 10, 10);
    g.lineStyle(1.5, COLORS.WHITE, 0.9);
    g.strokeRect(1, 1, 24, 24);
    g.lineStyle(2.5, COLORS.NEON_CYAN, 0.18);
    g.strokeRect(1, 1, 24, 24);
    g.lineStyle(1, COLORS.WHITE, 0.3);
    g.lineBetween(4, 5, 16, 5);
    g.lineBetween(4, 20, 13, 20);
    g.lineBetween(20, 4, 20, 12);
    g.fillStyle(COLORS.WHITE, 0.45);
    g.fillRect(9, 9, 8, 8);
    g.fillStyle(COLORS.WHITE, 0.9);
    g.fillRect(11, 11, 4, 4);
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
