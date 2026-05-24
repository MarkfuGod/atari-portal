import Phaser from 'phaser';
import { BaseGameScene } from '../BaseGameScene.js';
import { GAME_WIDTH, GAME_HEIGHT, COLORS } from '../../config.js';
import { GameManager } from '../../core/GameManager.js';
import SFX from '../../core/SFXManager.js';
import TrailSystem from '../../vfx/TrailSystem.js';
import DebrisSystem from '../../vfx/DebrisSystem.js';
import GlitchEffect from '../../vfx/GlitchEffect.js';
import CyberSceneFX from '../../vfx/CyberSceneFX.js';
import PosterSceneFX from '../../vfx/PosterSceneFX.js';

const MOD_PACMAN_KEY = 'pac-mod-pacman';
const MOD_DOT_KEY = 'pac-mod-dot';
const MOD_PELLET_KEY = 'pac-mod-pellet';
const MOD_PORTAL_PELLET_KEY = 'pac-mod-portal-pellet';
const MOD_GHOST_KEYS = {
  'ghost-red': 'pac-mod-ghost-red',
  'ghost-pink': 'pac-mod-ghost-pink',
  'ghost-cyan': 'pac-mod-ghost-cyan',
  'ghost-orange': 'pac-mod-ghost-orange',
};

const CELL = 28;
const COLS = 20;
const ROWS = 17;
const OFFSET_X = Math.floor((GAME_WIDTH - COLS * CELL) / 2);
const OFFSET_Y = 28 + Math.floor((GAME_HEIGHT - 28 - ROWS * CELL) / 2);

const PACMAN_SPEED = 150;
const GHOST_SPEED = 135;
const GHOST_VULNERABLE_SPEED = 80;
const VULNERABLE_DURATION = 6000;
const PORTAL_DOT_THRESHOLD = 0.6;

const MAZE = [
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  [1,0,0,0,0,1,0,0,0,0,0,0,0,0,1,0,0,0,0,1],
  [1,2,1,1,0,1,0,1,1,1,1,1,1,0,1,0,1,1,2,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,1,1,0,1,0,1,1,3,3,1,1,0,1,0,1,1,0,1],
  [1,0,0,0,0,1,0,0,0,3,3,0,0,0,1,0,0,0,0,1],
  [1,1,1,1,0,1,1,1,0,3,3,0,1,1,1,0,1,1,1,1],
  [3,3,3,1,0,0,0,0,0,3,3,0,0,0,0,0,1,3,3,3],
  [1,1,1,1,0,1,0,1,1,1,1,1,1,0,1,0,1,1,1,1],
  [1,0,0,0,0,1,0,0,0,0,0,0,0,0,1,0,0,0,0,1],
  [1,0,1,1,0,1,0,1,1,1,1,1,1,0,1,0,1,1,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,2,1,1,0,1,1,1,0,1,1,0,1,1,1,0,1,1,2,1],
  [1,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,1],
  [1,1,0,1,0,1,0,1,1,1,1,1,1,0,1,0,1,0,1,1],
  [1,0,0,0,0,1,0,0,0,0,0,0,0,0,1,0,0,0,0,1],
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
];

function cellToWorld(col, row) {
  return {
    x: OFFSET_X + col * CELL + CELL / 2,
    y: OFFSET_Y + row * CELL + CELL / 2,
  };
}

function worldToCell(x, y) {
  return {
    col: Math.floor((x - OFFSET_X) / CELL),
    row: Math.floor((y - OFFSET_Y) / CELL),
  };
}

function isWalkable(col, row) {
  if (row < 0 || row >= ROWS || col < 0 || col >= COLS) return false;
  return MAZE[row][col] !== 1;
}

const DIRECTIONS = {
  LEFT: { x: -1, y: 0 },
  RIGHT: { x: 1, y: 0 },
  UP: { x: 0, y: -1 },
  DOWN: { x: 0, y: 1 },
};

export class PacmanScene extends BaseGameScene {
  constructor() {
    super('PacmanScene', 'pacman');
  }

  create() {
    super.create();

    this.grid = MAZE.map(row => [...row]);
    this.totalDots = 0;
    this.dotsEaten = 0;
    this.portalSpawned = false;
    this.gameOver = false;

    if (this.modernist) this._ensureModernistTextures();

    this.drawMaze();
    this.createDots();
    this.createPacman();
    this.createGhosts();
    this.setupInput();

    this.powerUps.setSpawnPositionProvider(() => {
      const walkable = [];
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          if (this.grid[r][c] === 1) continue;
          if (this.isGhostHouseOrTunnel(r, c)) continue;
          walkable.push({ col: c, row: r });
        }
      }
      if (walkable.length === 0) return null;
      const cell = walkable[Math.floor(Math.random() * walkable.length)];
      return cellToWorld(cell.col, cell.row);
    });
  }

  drawMaze() {
    if (this.modernist) {
      this.drawModernistMaze();
      return;
    }
    CyberSceneFX.drawCircuitBackdrop(this, {
      primary: COLORS.NEON_BLUE,
      secondary: COLORS.NEON_CYAN,
      accent: COLORS.NEON_YELLOW,
      top: 32,
      bottom: GAME_HEIGHT - 34,
      density: 1.25,
    });
    CyberSceneFX.drawBinarySideData(this, { color: COLORS.NEON_CYAN, alpha: 0.12, columns: 2 });
    CyberSceneFX.drawHudFrame(this, {
      title: 'PAC-MAN: CYBER-SNACKER',
      subtitle: 'TARGET BIT: [A644]',
      primary: COLORS.NEON_CYAN,
      accent: COLORS.NEON_YELLOW,
    });
    CyberSceneFX.drawHoloPanel(this, OFFSET_X + CELL * 5, OFFSET_Y + CELL * 6.4, 110, 76, {
      primary: COLORS.NEON_BLUE,
      accent: COLORS.NEON_CYAN,
      depth: -6,
      tilt: -0.02,
    });
    CyberSceneFX.drawHoloPanel(this, OFFSET_X + CELL * 15, OFFSET_Y + CELL * 6.4, 110, 76, {
      primary: COLORS.NEON_BLUE,
      accent: COLORS.NEON_CYAN,
      depth: -6,
      tilt: 0.02,
    });

    const panel = this.add.graphics().setDepth(-2);
    panel.fillStyle(0x030817, 0.72);
    panel.fillRoundedRect(OFFSET_X - 18, OFFSET_Y - 18, COLS * CELL + 36, ROWS * CELL + 36, 18);
    panel.lineStyle(2, COLORS.NEON_BLUE, 0.16);
    panel.strokeRoundedRect(OFFSET_X - 18, OFFSET_Y - 18, COLS * CELL + 36, ROWS * CELL + 36, 18);

    const glow = this.add.graphics().setDepth(1);
    const walls = this.add.graphics().setDepth(2);

    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (MAZE[r][c] === 1) {
          const x = OFFSET_X + c * CELL;
          const y = OFFSET_Y + r * CELL;
          glow.fillStyle(COLORS.NEON_BLUE, 0.06);
          glow.fillRoundedRect(x - 2, y - 2, CELL + 4, CELL + 4, 7);
          walls.fillStyle(0x06102a, 0.82);
          walls.fillRoundedRect(x + 2, y + 2, CELL - 4, CELL - 4, 6);
        }
      }
    }

    const edge = this.add.graphics().setDepth(3);
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (MAZE[r][c] === 1) {
          const x = OFFSET_X + c * CELL;
          const y = OFFSET_Y + r * CELL;
          if (r > 0 && MAZE[r - 1][c] !== 1) this._strokeMazeLine(edge, x + 4, y + 2, x + CELL - 4, y + 2);
          if (r < ROWS - 1 && MAZE[r + 1][c] !== 1) this._strokeMazeLine(edge, x + 4, y + CELL - 2, x + CELL - 4, y + CELL - 2);
          if (c > 0 && MAZE[r][c - 1] !== 1) this._strokeMazeLine(edge, x + 2, y + 4, x + 2, y + CELL - 4);
          if (c < COLS - 1 && MAZE[r][c + 1] !== 1) this._strokeMazeLine(edge, x + CELL - 2, y + 4, x + CELL - 2, y + CELL - 4);
        }
      }
    }

    const nodes = this.add.graphics().setDepth(3);
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (MAZE[r][c] === 0) {
          let paths = 0;
          if (r > 0 && MAZE[r - 1][c] === 0) paths++;
          if (r < ROWS - 1 && MAZE[r + 1][c] === 0) paths++;
          if (c > 0 && MAZE[r][c - 1] === 0) paths++;
          if (c < COLS - 1 && MAZE[r][c + 1] === 0) paths++;
          if (paths >= 3) {
            const nx = OFFSET_X + c * CELL + CELL / 2;
            const ny = OFFSET_Y + r * CELL + CELL / 2;
            nodes.fillStyle(COLORS.NEON_CYAN, 0.16);
            nodes.fillCircle(nx, ny, 5);
            nodes.fillStyle(COLORS.WHITE, 0.42);
            nodes.fillCircle(nx, ny, 1.4);
          }
        }
      }
    }
  }

  // Print-native maze: paper backdrop, axis stripes, poster HUD, then ink
  // 1.5px wall lines only on the boundary edges of wall cells (no triple
  // stroke, no glow). Junction nodes become 2px ink dots.
  drawModernistMaze() {
    const p = this.palette;
    this.cameras.main.setBackgroundColor(p.paper);

    PosterSceneFX.drawPaperBackdrop(this, {
      top: 32,
      bottom: GAME_HEIGHT - 34,
      depth: -35,
      seam: false,
      grid: true,
      gridStep: CELL,
      grainDensity: 240,
      seed: 0xe54a,
    });

    PosterSceneFX.drawAxisStripData(this, {
      top: 36,
      bottom: GAME_HEIGHT - 38,
      depth: -8,
      leftAlpha: 0.42,
      rightAlpha: 0.34,
    });

    PosterSceneFX.drawPosterHudFrame(this, {
      title: 'PAC-MAN // CYBER SNACKER',
      subtitle: 'NODE 72 · CX4024 · 1980',
      barTop: 28,
      barBottom: GAME_HEIGHT - 36,
    });

    // Paper plate under the maze with vermilion corner ticks
    const panel = this.add.graphics().setDepth(-3);
    const px = OFFSET_X - 14;
    const py = OFFSET_Y - 14;
    const pw = COLS * CELL + 28;
    const ph = ROWS * CELL + 28;
    panel.fillStyle(p.paper, 0.55);
    panel.fillRect(px, py, pw, ph);
    panel.lineStyle(1.5, p.ink, 1);
    panel.strokeRect(px, py, pw, ph);
    panel.lineStyle(1, p.ink, 0.32);
    panel.strokeRect(px - 4, py - 4, pw + 8, ph + 8);

    // Maze walls — only stroke the outward-facing edges of wall cells so the
    // result reads like a blueprint, not a stack of filled squares.
    const wallGfx = this.add.graphics().setDepth(3);
    wallGfx.lineStyle(1.5, p.ink, 1);
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (MAZE[r][c] !== 1) continue;
        const x = OFFSET_X + c * CELL;
        const y = OFFSET_Y + r * CELL;
        const inset = 3;
        if (r === 0 || MAZE[r - 1][c] !== 1) wallGfx.lineBetween(x + inset, y + inset, x + CELL - inset, y + inset);
        if (r === ROWS - 1 || MAZE[r + 1][c] !== 1) wallGfx.lineBetween(x + inset, y + CELL - inset, x + CELL - inset, y + CELL - inset);
        if (c === 0 || MAZE[r][c - 1] !== 1) wallGfx.lineBetween(x + inset, y + inset, x + inset, y + CELL - inset);
        if (c === COLS - 1 || MAZE[r][c + 1] !== 1) wallGfx.lineBetween(x + CELL - inset, y + inset, x + CELL - inset, y + CELL - inset);
      }
    }

    // Junction nodes — 2x2 ink dots where 3+ paths meet
    const nodes = this.add.graphics().setDepth(3);
    nodes.fillStyle(p.ink, 1);
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (MAZE[r][c] !== 0) continue;
        let paths = 0;
        if (r > 0 && MAZE[r - 1][c] === 0) paths++;
        if (r < ROWS - 1 && MAZE[r + 1][c] === 0) paths++;
        if (c > 0 && MAZE[r][c - 1] === 0) paths++;
        if (c < COLS - 1 && MAZE[r][c + 1] === 0) paths++;
        if (paths >= 3) {
          const nx = OFFSET_X + c * CELL + CELL / 2;
          const ny = OFFSET_Y + r * CELL + CELL / 2;
          nodes.fillRect(nx - 1, ny - 1, 2, 2);
        }
      }
    }

    // Page-edge ticks along the tunnel rows — print equivalent of the cyan
    // tunnel side glow.
    const edgeTicks = this.add.graphics().setDepth(-4);
    edgeTicks.lineStyle(1, p.vermilion, 0.7);
    const tunnelY = OFFSET_Y + 7 * CELL + CELL / 2;
    for (let i = 0; i < 6; i++) {
      edgeTicks.lineBetween(8 + i * 3, tunnelY - 6, 8 + i * 3, tunnelY + 6);
      edgeTicks.lineBetween(GAME_WIDTH - 8 - i * 3, tunnelY - 6, GAME_WIDTH - 8 - i * 3, tunnelY + 6);
    }

    PosterSceneFX.drawCoordinateBlock(this, 24, 56, {
      label: 'SECTOR 5D',
      coord: '14.0 N  09.6 E',
      node: '72',
      depth: -2,
    });
  }

  _strokeMazeLine(gfx, x1, y1, x2, y2) {
    gfx.lineStyle(8, COLORS.NEON_BLUE, 0.08);
    gfx.lineBetween(x1, y1, x2, y2);
    gfx.lineStyle(4, COLORS.NEON_BLUE, 0.26);
    gfx.lineBetween(x1, y1, x2, y2);
    gfx.lineStyle(1.5, COLORS.NEON_CYAN, 0.92);
    gfx.lineBetween(x1, y1, x2, y2);
  }

  // Flat textures for pac-man, the four ghosts, dots, pellets, portal pellet.
  // Pac-Man is a mustard wedge with an ink mouth; ghosts are outline-only
  // silhouettes in their assigned palette swatch.
  _ensureModernistTextures() {
    const p = this.palette;

    if (!this.textures.exists(MOD_PACMAN_KEY)) {
      const g = this.make.graphics({ x: 0, y: 0, add: false });
      const sz = 28;
      const cx = sz / 2;
      const cy = sz / 2;
      const r = sz / 2 - 2;
      const start = Phaser.Math.DegToRad(20);
      const end = Phaser.Math.DegToRad(340);
      g.fillStyle(p.mustard, 1);
      g.beginPath();
      g.moveTo(cx, cy);
      g.arc(cx, cy, r, start, end, true);
      g.closePath();
      g.fillPath();
      g.lineStyle(1.5, p.ink, 1);
      g.beginPath();
      g.moveTo(cx, cy);
      g.arc(cx, cy, r, start, end, true);
      g.closePath();
      g.strokePath();
      g.fillStyle(p.ink, 1);
      g.fillCircle(cx + 1, cy - 6, 1.6);
      g.generateTexture(MOD_PACMAN_KEY, sz, sz);
      g.destroy();
    }

    if (!this.textures.exists(MOD_DOT_KEY)) {
      const g = this.make.graphics({ x: 0, y: 0, add: false });
      g.fillStyle(p.ink, 1);
      g.fillRect(0, 0, 4, 4);
      g.generateTexture(MOD_DOT_KEY, 4, 4);
      g.destroy();
    }

    if (!this.textures.exists(MOD_PELLET_KEY)) {
      const g = this.make.graphics({ x: 0, y: 0, add: false });
      g.fillStyle(p.vermilion, 1);
      g.fillCircle(9, 9, 7);
      g.lineStyle(1, p.ink, 1);
      g.strokeCircle(9, 9, 7);
      g.generateTexture(MOD_PELLET_KEY, 18, 18);
      g.destroy();
    }

    if (!this.textures.exists(MOD_PORTAL_PELLET_KEY)) {
      const g = this.make.graphics({ x: 0, y: 0, add: false });
      g.fillStyle(p.paper, 1);
      g.fillCircle(11, 11, 10);
      g.lineStyle(2, p.vermilion, 1);
      g.strokeCircle(11, 11, 10);
      g.lineStyle(1, p.ink, 0.85);
      g.strokeCircle(11, 11, 6);
      g.fillStyle(p.vermilion, 1);
      g.fillCircle(11, 11, 2);
      g.generateTexture(MOD_PORTAL_PELLET_KEY, 22, 22);
      g.destroy();
    }

    // Outline ghost silhouette, per Atari modernist plan: vermilion / cyan /
    // violet / mustard outlines on transparent. Same icon profile so swap is
    // pure tinting at the texture level.
    const ghostPalette = {
      'ghost-red': p.vermilion,
      'ghost-pink': p.violet,
      'ghost-cyan': p.cyan,
      'ghost-orange': p.mustard,
    };
    for (const [neonKey, modKey] of Object.entries(MOD_GHOST_KEYS)) {
      if (this.textures.exists(modKey)) continue;
      const color = ghostPalette[neonKey];
      const g = this.make.graphics({ x: 0, y: 0, add: false });
      const w = 24;
      const h = 24;
      g.lineStyle(1.5, color, 1);
      // Dome + skirt path
      g.beginPath();
      g.moveTo(2, 22);
      g.lineTo(2, 11);
      g.arc(12, 11, 10, Math.PI, 0, false);
      g.lineTo(22, 22);
      g.lineTo(19, 19);
      g.lineTo(16, 22);
      g.lineTo(13, 19);
      g.lineTo(10, 22);
      g.lineTo(7, 19);
      g.lineTo(4, 22);
      g.closePath();
      g.strokePath();
      // Eyes
      g.fillStyle(p.ink, 1);
      g.fillRect(8, 9, 2, 3);
      g.fillRect(14, 9, 2, 3);
      g.fillStyle(color, 1);
      // Tiny accent pip on the dome
      g.fillCircle(12, 5, 1);
      g.generateTexture(modKey, w, h);
      g.destroy();
    }
  }

  createDots() {
    this.dots = this.add.group();
    this.powerPellets = this.add.group();

    const dotTex = this.modernist ? MOD_DOT_KEY : 'dot';
    const pelletTex = this.modernist ? MOD_PELLET_KEY : 'power-pellet';

    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const val = this.grid[r][c];
        const pos = cellToWorld(c, r);

        if (val === 0) {
          const dot = this.add.image(pos.x, pos.y, dotTex)
            .setDisplaySize(this.modernist ? 4 : 5, this.modernist ? 4 : 5)
            .setDepth(5);
          if (!this.modernist) dot.setBlendMode(Phaser.BlendModes.ADD);
          dot.gridCol = c;
          dot.gridRow = r;
          this.dots.add(dot);
          this.totalDots++;
        } else if (val === 2) {
          const pp = this.add.image(pos.x, pos.y, pelletTex).setDisplaySize(18, 18).setDepth(6);
          if (!this.modernist) pp.setBlendMode(Phaser.BlendModes.ADD);
          pp.gridCol = c;
          pp.gridRow = r;
          this.powerPellets.add(pp);
          this.tweens.add({
            targets: pp,
            scaleX: { from: 0.9, to: 1.2 },
            scaleY: { from: 0.9, to: 1.2 },
            alpha: { from: this.modernist ? 0.85 : 0.7, to: 1 },
            duration: 600,
            yoyo: true,
            repeat: -1,
          });
          this.totalDots++;
        }
      }
    }
  }

  createPacman() {
    const startPos = cellToWorld(10, 11);
    if (this.modernist) {
      this.pacGlow = null;
    } else {
      this.pacGlow = this.add.circle(startPos.x, startPos.y, CELL * 0.72, COLORS.NEON_YELLOW, 0.16)
        .setDepth(8)
        .setBlendMode(Phaser.BlendModes.ADD);
    }
    const pacTex = this.modernist ? MOD_PACMAN_KEY : 'pacman';
    this.pacman = this.add.image(startPos.x, startPos.y, pacTex).setDisplaySize(CELL - 1, CELL - 1);
    this.pacman.setDepth(10);
    if (!this.modernist) this.pacman.setBlendMode(Phaser.BlendModes.ADD);
    this.pacman.gridCol = 10;
    this.pacman.gridRow = 11;
    this.pacman.direction = DIRECTIONS.LEFT;
    this.pacman.nextDirection = null;
    this.pacman.moving = false;
    this.pacman.wantsToMove = false;
    this.pacman.targetX = startPos.x;
    this.pacman.targetY = startPos.y;

    // TrailSystem is style-aware (modernist ink dash; neon glow trail), so
    // this single call works for both branches.
    this._pacTrailId = TrailSystem.createTrail(this, this.pacman, {
      color: this.modernist ? this.palette.ink : COLORS.NEON_YELLOW,
      length: this.modernist ? 4 : 8,
      interval: 38,
      size: 7,
    });
  }

  createGhosts() {
    const ghostConfigs = [
      { key: 'ghost-red', col: 9, row: 5, personality: 'chaser' },
      { key: 'ghost-pink', col: 10, row: 5, personality: 'ambusher' },
      { key: 'ghost-cyan', col: 9, row: 6, personality: 'flanker' },
      { key: 'ghost-orange', col: 10, row: 6, personality: 'random' },
    ];

    const p = this.palette;
    const modColors = {
      'ghost-red': p.vermilion,
      'ghost-pink': p.violet,
      'ghost-cyan': p.cyan,
      'ghost-orange': p.mustard,
    };
    const neonColors = {
      'ghost-red': COLORS.NEON_RED,
      'ghost-pink': COLORS.NEON_PINK,
      'ghost-cyan': COLORS.NEON_CYAN,
      'ghost-orange': COLORS.NEON_ORANGE,
    };

    this.ghosts = [];
    for (const cfg of ghostConfigs) {
      const pos = cellToWorld(cfg.col, cfg.row);
      let glow = null;
      if (!this.modernist) {
        glow = this.add.circle(pos.x, pos.y, CELL * 0.68, neonColors[cfg.key] || COLORS.NEON_RED, 0.12)
          .setDepth(8)
          .setBlendMode(Phaser.BlendModes.ADD);
      }
      const ghostTex = this.modernist
        ? (MOD_GHOST_KEYS[cfg.key] || MOD_GHOST_KEYS['ghost-red'])
        : cfg.key;
      const ghost = this.add.image(pos.x, pos.y, ghostTex).setDisplaySize(CELL - 1, CELL - 1);
      ghost.setDepth(10);
      if (!this.modernist) ghost.setBlendMode(Phaser.BlendModes.ADD);
      ghost.gridCol = cfg.col;
      ghost.gridRow = cfg.row;
      ghost.direction = DIRECTIONS.UP;
      ghost.targetX = pos.x;
      ghost.targetY = pos.y;
      ghost.moving = false;
      ghost.vulnerable = false;
      ghost.textureKey = cfg.key;
      ghost.eaten = false;
      ghost.personality = cfg.personality;
      ghost.glow = glow;
      this.ghosts.push(ghost);

      ghost._trailId = TrailSystem.createTrail(this, ghost, {
        color: this.modernist
          ? modColors[cfg.key]
          : (neonColors[cfg.key] || COLORS.NEON_RED),
        length: this.modernist ? 3 : 7,
        interval: 48,
        size: 5,
      });
    }

    this.vulnerableTimer = null;
  }

  setupInput() {
    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = {
      up: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      down: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      left: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      right: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
    };
  }

  update(time, delta) {
    super.update(time, delta);
    if (this.gameOver) return;

    this.handleInput();
    this.movePacman(delta);
    this.moveGhosts(delta);
    this.syncNeonActors(time);
    this.checkDotCollisions();
    this.checkGhostCollisions();

    this.setPlayerPosition(this.pacman.x, this.pacman.y);
    this.powerUps.checkCollection(this.pacman.x, this.pacman.y);
    this.glitch.checkDataLeakCollection(this.pacman.x, this.pacman.y);
    this.tryEnterPortal(this.pacman.x, this.pacman.y);
  }

  syncNeonActors(time) {
    if (this.modernist) return;
    if (this.pacGlow) {
      this.pacGlow.setPosition(this.pacman.x, this.pacman.y);
      this.pacGlow.setScale(1 + Math.sin(time * 0.01) * 0.08);
    }
    if (this.ghosts) {
      for (const ghost of this.ghosts) {
        if (ghost.glow) {
          ghost.glow.setPosition(ghost.x, ghost.y);
          ghost.glow.setAlpha(ghost.eaten ? 0 : (ghost.vulnerable ? 0.2 : 0.12));
          ghost.glow.setScale(1 + Math.sin(time * 0.008 + ghost.gridCol) * 0.1);
        }
      }
    }
  }

  handleInput() {
    const invX = this.horizontalControlInverted;
    const invY = this.verticalControlInverted;
    let newDir = null;

    if (this.cursors.left.isDown || this.wasd.left.isDown) {
      newDir = invX ? DIRECTIONS.RIGHT : DIRECTIONS.LEFT;
    } else if (this.cursors.right.isDown || this.wasd.right.isDown) {
      newDir = invX ? DIRECTIONS.LEFT : DIRECTIONS.RIGHT;
    } else if (this.cursors.up.isDown || this.wasd.up.isDown) {
      newDir = invY ? DIRECTIONS.DOWN : DIRECTIONS.UP;
    } else if (this.cursors.down.isDown || this.wasd.down.isDown) {
      newDir = invY ? DIRECTIONS.UP : DIRECTIONS.DOWN;
    }

    if (newDir) {
      this.pacman.nextDirection = newDir;
    }
  }

  movePacman(delta) {
    const speedMult = this.powerUps.hasEffect('speed') ? 1.4 : 1;
    const speed = PACMAN_SPEED * (delta / 1000) * this.gameSpeed * speedMult;
    const pac = this.pacman;

    if (!pac.moving) {
      let dirChanged = false;
      if (pac.nextDirection && this.canMove(pac.gridCol, pac.gridRow, pac.nextDirection)) {
        pac.direction = pac.nextDirection;
        pac.nextDirection = null;
        dirChanged = true;
      }

      if ((dirChanged || this.canMove(pac.gridCol, pac.gridRow, pac.direction)) && this.canMove(pac.gridCol, pac.gridRow, pac.direction)) {
        const nc = pac.gridCol + pac.direction.x;
        const nr = pac.gridRow + pac.direction.y;
        const target = cellToWorld(nc, nr);
        pac.targetX = target.x;
        pac.targetY = target.y;
        pac.moving = true;
      }
    }

    if (pac.moving) {
      const dx = pac.targetX - pac.x;
      const dy = pac.targetY - pac.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist <= speed) {
        pac.x = pac.targetX;
        pac.y = pac.targetY;
        const cell = worldToCell(pac.x, pac.y);
        pac.gridCol = cell.col;
        pac.gridRow = cell.row;
        pac.moving = false;
        this.wrapTunnel(pac);
      } else {
        pac.x += (dx / dist) * speed;
        pac.y += (dy / dist) * speed;
      }

      pac.setAngle(this.getAngle(pac.direction));
    }
  }

  moveGhosts(delta) {
    const frozen = this.enemiesFrozen;
    const ghostFear = GameManager.modSystem.hasMod('ghost_fear');

    for (const ghost of this.ghosts) {
      if (ghost.eaten || frozen) continue;

      if (this.powerUps.hasEffect('freeze')) continue;

      const spd = ghost.vulnerable ? GHOST_VULNERABLE_SPEED : GHOST_SPEED;
      const speed = spd * (delta / 1000) * this.gameSpeed;

      if (!ghost.moving) {
        const dirs = this.getAvailableDirections(ghost.gridCol, ghost.gridRow, ghost.direction);
        if (dirs.length > 0) {
          ghost.direction = this.pickGhostDirection(ghost, dirs, ghostFear);
          const nc = ghost.gridCol + ghost.direction.x;
          const nr = ghost.gridRow + ghost.direction.y;
          const target = cellToWorld(nc, nr);
          ghost.targetX = target.x;
          ghost.targetY = target.y;
          ghost.moving = true;
        }
      }

      if (ghost.moving) {
        const dx = ghost.targetX - ghost.x;
        const dy = ghost.targetY - ghost.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist <= speed) {
          ghost.x = ghost.targetX;
          ghost.y = ghost.targetY;
          const cell = worldToCell(ghost.x, ghost.y);
          ghost.gridCol = cell.col;
          ghost.gridRow = cell.row;
          ghost.moving = false;
          this.wrapTunnel(ghost);
        } else {
          ghost.x += (dx / dist) * speed;
          ghost.y += (dy / dist) * speed;
        }
      }
    }
  }

  getAvailableDirections(col, row, currentDir) {
    const reverse = { x: -currentDir.x, y: -currentDir.y };
    const dirs = [];

    for (const d of Object.values(DIRECTIONS)) {
      if (d.x === reverse.x && d.y === reverse.y) continue;
      if (this.canMove(col, row, d)) dirs.push(d);
    }

    if (dirs.length === 0 && this.canMove(col, row, reverse)) {
      dirs.push(reverse);
    }

    return dirs;
  }

  pickGhostDirection(ghost, dirs, fearMode) {
    // Enhanced AI per personality
    const pac = this.pacman;

    if (ghost.vulnerable || fearMode) {
      // Flee from pac-man
      let bestDir = dirs[0];
      let bestDist = -Infinity;
      for (const d of dirs) {
        const nc = ghost.gridCol + d.x;
        const nr = ghost.gridRow + d.y;
        const dx = nc - pac.gridCol;
        const dy = nr - pac.gridRow;
        const dist = dx * dx + dy * dy;
        if (dist > bestDist) { bestDist = dist; bestDir = d; }
      }
      return bestDir;
    }

    switch (ghost.personality) {
      case 'chaser': {
        if (Math.random() > 0.1) {
          return this.dirTowardTarget(ghost, dirs, pac.gridCol, pac.gridRow);
        }
        return dirs[Math.floor(Math.random() * dirs.length)];
      }
      case 'ambusher': {
        const tx = pac.gridCol + pac.direction.x * 4;
        const ty = pac.gridRow + pac.direction.y * 4;
        if (Math.random() > 0.2) {
          return this.dirTowardTarget(ghost, dirs, tx, ty);
        }
        return dirs[Math.floor(Math.random() * dirs.length)];
      }
      case 'flanker': {
        const chaser = this.ghosts[0];
        const tx = 2 * pac.gridCol - chaser.gridCol;
        const ty = 2 * pac.gridRow - chaser.gridRow;
        if (Math.random() > 0.25) {
          return this.dirTowardTarget(ghost, dirs, tx, ty);
        }
        return dirs[Math.floor(Math.random() * dirs.length)];
      }
      default:
        return dirs[Math.floor(Math.random() * dirs.length)];
    }
  }

  dirTowardTarget(ghost, dirs, tx, ty) {
    let bestDir = dirs[0];
    let bestDist = Infinity;
    for (const d of dirs) {
      const nc = ghost.gridCol + d.x;
      const nr = ghost.gridRow + d.y;
      const dx = nc - tx;
      const dy = nr - ty;
      const dist = dx * dx + dy * dy;
      if (dist < bestDist) { bestDist = dist; bestDir = d; }
    }
    return bestDir;
  }

  canMove(col, row, dir) {
    const nc = col + dir.x;
    const nr = row + dir.y;
    if (nr < 0 || nr >= ROWS) return false;
    if (nc < 0 || nc >= COLS) return row === 7;
    return isWalkable(nc, nr);
  }

  wrapTunnel(entity) {
    if (entity.gridRow === 7) {
      if (entity.gridCol < 0) {
        entity.gridCol = COLS - 1;
        const pos = cellToWorld(entity.gridCol, entity.gridRow);
        entity.x = pos.x; entity.y = pos.y;
        entity.targetX = pos.x; entity.targetY = pos.y;
      } else if (entity.gridCol >= COLS) {
        entity.gridCol = 0;
        const pos = cellToWorld(entity.gridCol, entity.gridRow);
        entity.x = pos.x; entity.y = pos.y;
        entity.targetX = pos.x; entity.targetY = pos.y;
      }
    }
  }

  getAngle(dir) {
    if (dir === DIRECTIONS.RIGHT) return 0;
    if (dir === DIRECTIONS.DOWN) return 90;
    if (dir === DIRECTIONS.LEFT) return 180;
    if (dir === DIRECTIONS.UP) return 270;
    return 0;
  }

  activateVulnerableMode() {
    if (this.vulnerableTimer) this.vulnerableTimer.remove(false);
    if (this._ghostGlitchTimers) {
      this._ghostGlitchTimers.forEach(t => t.remove(false));
    }
    this._ghostGlitchTimers = [];

    for (const ghost of this.ghosts) {
      if (!ghost.eaten) {
        ghost.vulnerable = true;
        ghost.setTint(this.modernist ? this.palette.blue : 0x0066ff);
        ghost.setAlpha(this.modernist ? 0.85 : 0.4);
        // Flicker tween for glitch state — in modernist the ghosts stay
        // saturated (no neon flicker), just gently breathe.
        const flicker = this.tweens.add({
          targets: ghost,
          alpha: this.modernist
            ? { from: 0.7, to: 1 }
            : { from: 0.2, to: 0.6 },
          duration: this.modernist ? 320 : 200,
          yoyo: true,
          repeat: -1,
        });
        ghost._flickerTween = flicker;
        // Local noise around ghost
        const noiseTimer = this.time.addEvent({
          delay: 500,
          loop: true,
          callback: () => {
            if (ghost.vulnerable && !ghost.eaten && ghost.active) {
              GlitchEffect.localNoise(this, ghost.x, ghost.y, 18, 200);
            }
          },
        });
        this._ghostGlitchTimers.push(noiseTimer);
      }
    }

    this.vulnerableTimer = this.time.delayedCall(VULNERABLE_DURATION, () => {
      for (const ghost of this.ghosts) {
        ghost.vulnerable = false;
        ghost.clearTint();
        ghost.setAlpha(1);
        if (ghost._flickerTween) {
          ghost._flickerTween.stop();
          ghost._flickerTween = null;
        }
      }
      if (this._ghostGlitchTimers) {
        this._ghostGlitchTimers.forEach(t => t.remove(false));
        this._ghostGlitchTimers = [];
      }
      this.vulnerableTimer = null;
    });
  }

  checkGhostCollisions() {
    const pac = this.pacman;
    const phaseActive = this.powerUps.hasEffect('phase');

    for (const ghost of this.ghosts) {
      if (ghost.eaten) continue;

      const dx = pac.x - ghost.x;
      const dy = pac.y - ghost.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < CELL * 0.6) {
        if (ghost.vulnerable) {
          this.eatGhost(ghost);
        } else if (!phaseActive) {
          this.handlePacmanDeath();
          return;
        }
      }
    }
  }

  eatGhost(ghost) {
    ghost.eaten = true;
    ghost.vulnerable = false;
    if (ghost._flickerTween) {
      ghost._flickerTween.stop();
      ghost._flickerTween = null;
    }

    // Scale-pop + debris burst on eat
    this.tweens.add({
      targets: ghost,
      scaleX: 1.4, scaleY: 1.4,
      duration: 60,
      onComplete: () => {
        ghost.setVisible(false);
        ghost.setScale(1);
      },
    });
    const p = this.palette;
    DebrisSystem.deathBurst(this, ghost.x, ghost.y, 'medium', {
      colors: this.modernist
        ? [p.ink, p.vermilion, p.cyan]
        : [COLORS.NEON_BLUE, COLORS.NEON_CYAN, COLORS.WHITE],
    });
    this.score.award('ghost');
    SFX.eatGhost();

    if (GameManager.mutationSystem.enemyDropCoins) {
      GameManager.addCoins(2);
      this.events.emit('coins-changed', GameManager.state.coins);
    }

    this.time.delayedCall(3000, () => {
      ghost.eaten = false;
      ghost.vulnerable = false;
      ghost.clearTint();
      ghost.setVisible(true);
      const pos = cellToWorld(9, 5);
      ghost.x = pos.x; ghost.y = pos.y;
      ghost.gridCol = 9; ghost.gridRow = 5;
      ghost.moving = false;
    });
  }

  handlePacmanDeath() {
    SFX.pacmanDeath();
    const alive = this.onPlayerDeath();
    if (!alive) {
      this.gameOver = true;
      return;
    }
    this.resetPacmanPosition();
    this.resetGhostPositions();
  }

  resetPacmanPosition() {
    const pos = cellToWorld(10, 11);
    Object.assign(this.pacman, {
      x: pos.x, y: pos.y,
      gridCol: 10, gridRow: 11,
      direction: DIRECTIONS.LEFT, nextDirection: null,
      moving: false, wantsToMove: false,
      targetX: pos.x, targetY: pos.y,
    });
  }

  resetGhostPositions() {
    const startPositions = [
      { col: 9, row: 5 }, { col: 10, row: 5 },
      { col: 9, row: 6 }, { col: 10, row: 6 },
    ];

    this.ghosts.forEach((ghost, i) => {
      const sp = startPositions[i];
      const pos = cellToWorld(sp.col, sp.row);
      Object.assign(ghost, {
        x: pos.x, y: pos.y,
        gridCol: sp.col, gridRow: sp.row,
        direction: DIRECTIONS.UP,
        targetX: pos.x, targetY: pos.y,
        moving: false, vulnerable: false, eaten: false,
      });
      ghost.clearTint();
      ghost.setVisible(true);
    });

    if (this.vulnerableTimer) {
      this.vulnerableTimer.remove(false);
      this.vulnerableTimer = null;
    }
  }

  checkPortalSpawn() {
    if (this.portalSpawned) return;
    if (this.dotsEaten / this.totalDots >= PORTAL_DOT_THRESHOLD) {
      this.portalSpawned = this.spawnPortalPellet();
    }
  }

  isGhostHouseOrTunnel(r, c) {
    if (r >= 4 && r <= 7 && c >= 8 && c <= 11) return true;
    if (r === 7 && (c <= 2 || c >= 17)) return true;
    return false;
  }

  spawnPortalPellet() {
    const candidates = [];
    const fallbackCandidates = [];
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (this.isGhostHouseOrTunnel(r, c)) continue;
        if (this.grid[r][c] === 0 || this.grid[r][c] === 3) {
          fallbackCandidates.push({ col: c, row: r });
          const dx = Math.abs(c - this.pacman.gridCol);
          const dy = Math.abs(r - this.pacman.gridRow);
          if (dx + dy > 5) candidates.push({ col: c, row: r });
        }
      }
    }

    const pool = candidates.length > 0 ? candidates : fallbackCandidates;
    if (pool.length === 0) {
      const pos = cellToWorld(this.pacman.gridCol, this.pacman.gridRow);
      this.triggerPortal(pos.x, pos.y);
      return true;
    }

    const spot = pool[Math.floor(Math.random() * pool.length)];
    const pos = cellToWorld(spot.col, spot.row);
    this.grid[spot.row][spot.col] = 4;

    const portalTex = this.modernist ? MOD_PORTAL_PELLET_KEY : 'portal-pellet';
    this.portalPellet = this.add.image(pos.x, pos.y, portalTex).setDisplaySize(18, 18);
    this.portalPellet.gridCol = spot.col;
    this.portalPellet.gridRow = spot.row;

    this.tweens.add({
      targets: this.portalPellet,
      alpha: { from: 0.5, to: 1 },
      scale: { from: 0.8, to: 1.1 },
      duration: 600, yoyo: true, repeat: -1,
    });
    return true;
  }

  showPortalHint() {
    this._showHintText('▸ WALK INTO THE PORTAL ▸');
  }

  onPortalForceSpawn() {
    if (!this.portalSpawned) {
      this.portalSpawned = this.spawnPortalPellet();
    } else {
      super.onPortalForceSpawn();
    }
  }

  checkDotCollisions() {
    const pac = this.pacman;

    this.dots.getChildren().slice().forEach(dot => {
      if (dot.gridCol === pac.gridCol && dot.gridRow === pac.gridRow) {
        dot.destroy();
        this.grid[dot.gridRow][dot.gridCol] = 3;
        this.dotsEaten++;
        this.score.award('dot');
        SFX.dotEat();
        this.checkPortalSpawn();
      }
    });

    this.powerPellets.getChildren().slice().forEach(pp => {
      if (pp.gridCol === pac.gridCol && pp.gridRow === pac.gridRow) {
        pp.destroy();
        this.grid[pp.gridRow][pp.gridCol] = 3;
        this.dotsEaten++;
        this.score.award('powerPellet');
        SFX.powerPellet();
        this.activateVulnerableMode();
        this.checkPortalSpawn();
      }
    });

    if (this.portalPellet && this.portalPellet.gridCol === pac.gridCol && this.portalPellet.gridRow === pac.gridRow) {
      const px = this.portalPellet.x;
      const py = this.portalPellet.y;
      this.portalPellet.destroy();
      this.portalPellet = null;
      this.triggerPortal(px, py);
    }
  }

  shutdown() {
    super.shutdown();
    try {
      if (this.vulnerableTimer) this.vulnerableTimer.remove(false);
    } catch (_) { /* timer may already be complete */ }
    this.vulnerableTimer = null;
  }
}
