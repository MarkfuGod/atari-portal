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
    this.genSnakeTextures();
    this.genPinballTextures();
    this.genFallDownTextures();
  }

  // 生成贪吃蛇相关纹理：蛇头、蛇身、食物，均带霓虹光效
  // 生成贪吃蛇相关纹理：蛇头、蛇身、食物，均带霓虹光效
  genSnakeTextures() {
    // SNAKE HEAD - 青色发光
    {
      const size = 32;
      const tex = this.textures.createCanvas('snake-head', size, size);
      const canvas = tex.getSourceImage();
      const ctx = canvas.getContext('2d');
      ctx.save();
      ctx.clearRect(0, 0, size, size);
      ctx.shadowBlur = 16;
      ctx.shadowColor = '#00f0ff';
      ctx.fillStyle = '#00f0ff';
      ctx.beginPath();
      ctx.arc(size/2, size/2, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      tex.refresh(); // <--- 关键修复：通知WebGL刷新纹理
    }
    // SNAKE BODY - 稍暗青色
    {
      const size = 28;
      const tex = this.textures.createCanvas('snake-body', size, size);
      const canvas = tex.getSourceImage();
      const ctx = canvas.getContext('2d');
      ctx.save();
      ctx.clearRect(0, 0, size, size);
      ctx.shadowBlur = 8;
      ctx.shadowColor = '#0099aa';
      ctx.fillStyle = '#0099aa';
      ctx.beginPath();
      ctx.arc(size/2, size/2, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      tex.refresh(); // <--- 关键修复
    }
    // SNAKE FOOD - 品红色发光
    {
      const size = 24;
      const tex = this.textures.createCanvas('snake-food', size, size);
      const canvas = tex.getSourceImage();
      const ctx = canvas.getContext('2d');
      ctx.save();
      ctx.clearRect(0, 0, size, size);
      ctx.shadowBlur = 12;
      ctx.shadowColor = '#ff00e6';
      ctx.fillStyle = '#ff00e6';
      ctx.beginPath();
      ctx.arc(size/2, size/2, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      tex.refresh(); // <--- 关键修复
    }

    // 1. VIRUS (红色数据包) - 方案A
    {
      const size = 24;
      const tex = this.textures.createCanvas('food-virus', size, size);
      const ctx = tex.getContext();
      ctx.shadowBlur = 15;
      ctx.shadowColor = '#ff1744';
      ctx.fillStyle = '#ff1744';
      ctx.beginPath(); ctx.arc(size/2, size/2, 10, 0, Math.PI*2); ctx.fill();
      tex.refresh();
    }

    // 2. PATCH (绿色补丁) - 方案A
    {
      const size = 24;
      const tex = this.textures.createCanvas('food-patch', size, size);
      const ctx = tex.getContext();
      ctx.shadowBlur = 15;
      ctx.shadowColor = '#39ff14';
      ctx.fillStyle = '#39ff14';
      ctx.fillRect(4, 10, 16, 4); ctx.fillRect(10, 4, 4, 16); // 画一个十字
      tex.refresh();
    }

    // 3. RESIDUE (残留身体) - 机制2 & 3
    {
      const size = 20;
      const tex = this.textures.createCanvas('snake-residue', size, size);
      const ctx = tex.getContext();
      ctx.globalAlpha = 0.6;
      ctx.strokeStyle = '#00f0ff';
      ctx.lineWidth = 2;
      ctx.strokeRect(2, 2, 16, 16); // 画一个空心框，表示这是“虚影”
      tex.refresh();
    }
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

  genPinballTextures() {
    // 1. 弹珠 - 强力白光+青色光晕
    {
      const size = 32;
      const tex = this.textures.createCanvas('pin-ball', size, size);
      const ctx = tex.getContext();
      ctx.shadowBlur = 15; ctx.shadowColor = '#00f0ff';
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(size/2, size/2, 10, 0, Math.PI*2); ctx.fill();
      tex.refresh();
    }
    // 2. 拨杆 (Flipper) - 霓虹紫色圆角矩形
    {
      const tex = this.textures.createCanvas('flipper', 100, 24);
      const ctx = tex.getContext();
      ctx.shadowBlur = 10; ctx.shadowColor = '#b845ff';
      ctx.fillStyle = '#b845ff';
      ctx.beginPath(); ctx.roundRect(0, 0, 100, 24, 12); ctx.fill();
      tex.refresh();
    }
    // 3. 霓虹圈撞击器 (Ring Bumper) - 粉色呼吸光圈
    {
      const size = 64;
      const tex = this.textures.createCanvas('bumper-ring', size, size);
      const ctx = tex.getContext();
      ctx.shadowBlur = 15; ctx.shadowColor = '#ff00e6';
      ctx.strokeStyle = '#ff00e6'; ctx.lineWidth = 6;
      ctx.beginPath(); ctx.arc(size/2, size/2, 26, 0, Math.PI*2); ctx.stroke();
      tex.refresh();
    }
    // 4. 下落靶 (Drop Target) - 霓虹绿色矩形
    {
      const tex = this.textures.createCanvas('target-drop', 40, 20);
      const ctx = tex.getContext();
      ctx.shadowBlur = 12; ctx.shadowColor = '#39ff14';
      ctx.fillStyle = '#39ff14';
      ctx.beginPath(); ctx.roundRect(0, 0, 40, 20, 4); ctx.fill();
      tex.refresh();
    }
    // 5. 霓虹白色边界线 (用于画复杂的机台轨道)
    {
      const tex = this.textures.createCanvas('pinball-bound', 20, 20);
      const ctx = tex.getContext();
      ctx.shadowBlur = 8; ctx.shadowColor = '#ffffff';
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(4, 4, 12, 12);
      tex.refresh();
    }

    // 6. 巡逻 BOSS (猩红色的浮空菱形核心)
    {
      const size = 60;
      const tex = this.textures.createCanvas('boss', size, size);
      const ctx = tex.getContext();
      ctx.shadowBlur = 15; ctx.shadowColor = '#ff1744';
      ctx.fillStyle = '#ff1744';
      ctx.beginPath(); ctx.moveTo(30, 5); ctx.lineTo(55, 30); ctx.lineTo(30, 55); ctx.lineTo(5, 30); ctx.fill();
      tex.refresh();
    }
    // 7. 虫洞 (紫红双色嵌套的旋转星门)
    {
      const size = 80;
      const tex = this.textures.createCanvas('wormhole', size, size);
      const ctx = tex.getContext();
      ctx.shadowBlur = 20; ctx.shadowColor = '#8e2de2';
      ctx.strokeStyle = '#4a00e0'; ctx.lineWidth = 6;
      ctx.beginPath(); ctx.arc(40, 40, 30, 0, Math.PI*2); ctx.stroke();
      ctx.strokeStyle = '#ff00e6'; ctx.lineWidth = 2; // 内圈亮粉色
      ctx.beginPath(); ctx.arc(40, 40, 15, 0, Math.PI*2); ctx.stroke();
      tex.refresh();
    }
  }
  genFallDownTextures() {
    const drawNeonPlat = (key, color, isGlitch = false, hasSpikes = false) => {
      const tex = this.textures.createCanvas(key, 100, 20);
      const ctx = tex.getContext();
      // 黑暗模式下依然清晰的边缘发光
      ctx.shadowBlur = 10; ctx.shadowColor = color;
      ctx.strokeStyle = color; ctx.lineWidth = 3;
      ctx.strokeRect(2, 2, 96, 16);
      
      // 内部半透明填充
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.3;
      ctx.fillRect(2, 2, 96, 16);
      ctx.globalAlpha = 1.0;

      if (hasSpikes) { // 伤害平台：红色的尖刺
        ctx.fillStyle = '#ff0000';
        for(let i=5; i<95; i+=15) {
          ctx.beginPath(); ctx.moveTo(i, 2); ctx.lineTo(i+5, -8); ctx.lineTo(i+10, 2); ctx.fill();
        }
      }
      if (isGlitch) { // 薛定谔平台：随机杂色噪点
        ctx.fillStyle = '#ffffff';
        for(let i=0; i<20; i++) ctx.fillRect(Math.random()*100, Math.random()*20, 2, 2);
      }
      tex.refresh();
    };

    // 1. 正常 (霓虹青色)
    drawNeonPlat('plat-normal', '#00f0ff');
    // 2. 易碎 (警示橙黄)
    drawNeonPlat('plat-fragile', '#ffaa00');
    // 3. 伤害 (腥红尖刺)
    drawNeonPlat('plat-damage', '#ff1744', false, true);
    // 4. 音轨律动 (迷幻洋红)
    drawNeonPlat('plat-audio', '#ff00e6');
    // 5. 薛定谔故障 (不稳定紫白)
    drawNeonPlat('plat-glitch', '#b845ff', true);

    // 6. 重力反转充能球 (闪耀的绿色核心)
    {
      const tex = this.textures.createCanvas('grav-orb', 24, 24);
      const ctx = tex.getContext();
      ctx.shadowBlur = 15; ctx.shadowColor = '#39ff14';
      ctx.fillStyle = '#39ff14';
      ctx.beginPath(); ctx.arc(12, 12, 6, 0, Math.PI*2); ctx.fill();
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(12, 12, 10, 0, Math.PI*2); ctx.stroke();
      tex.refresh();
    }
  }
}
