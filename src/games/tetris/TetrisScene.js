import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS } from '../../config.js';
import { cssColor } from '../../core/VisualStyle.js';
import { GameManager } from '../../core/GameManager.js';
import { BaseGameScene } from '../BaseGameScene.js';
import SFX from '../../core/SFXManager.js';
import GlitchEffect from '../../vfx/GlitchEffect.js';
import NeonGlow from '../../vfx/NeonGlow.js';
import DebrisSystem from '../../vfx/DebrisSystem.js';
import ArcadeFX from '../../vfx/ArcadeFX.js';
import CyberSceneFX from '../../vfx/CyberSceneFX.js';
import PosterSceneFX from '../../vfx/PosterSceneFX.js';

const COLS = 10;
const ROWS = 20;
const CELL = 24;
const BOARD_W = COLS * CELL;
const BOARD_H = ROWS * CELL;
const BOARD_X = Math.floor((GAME_WIDTH - BOARD_W) / 2);
const BOARD_Y = 28 + Math.floor((GAME_HEIGHT - 28 - BOARD_H) / 2);

const PREVIEW_X = BOARD_X + BOARD_W + 40;
const PREVIEW_Y = BOARD_Y + 20;
const PREVIEW_W = 116;
const PREVIEW_H = 112;

const DAS_INITIAL = 170;
const DAS_REPEAT = 50;

const PIECE_COLORS = {
  I: COLORS.NEON_CYAN,
  O: COLORS.NEON_YELLOW,
  T: COLORS.NEON_PURPLE,
  S: COLORS.NEON_GREEN,
  Z: COLORS.NEON_RED,
  J: COLORS.NEON_BLUE,
  L: COLORS.NEON_ORANGE,
};

const PIECES = {
  I: [
    [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]],
    [[0,0,1,0],[0,0,1,0],[0,0,1,0],[0,0,1,0]],
    [[0,0,0,0],[0,0,0,0],[1,1,1,1],[0,0,0,0]],
    [[0,1,0,0],[0,1,0,0],[0,1,0,0],[0,1,0,0]],
  ],
  O: [
    [[1,1],[1,1]],[[1,1],[1,1]],[[1,1],[1,1]],[[1,1],[1,1]],
  ],
  T: [
    [[0,1,0],[1,1,1],[0,0,0]],
    [[0,1,0],[0,1,1],[0,1,0]],
    [[0,0,0],[1,1,1],[0,1,0]],
    [[0,1,0],[1,1,0],[0,1,0]],
  ],
  S: [
    [[0,1,1],[1,1,0],[0,0,0]],
    [[0,1,0],[0,1,1],[0,0,1]],
    [[0,0,0],[0,1,1],[1,1,0]],
    [[1,0,0],[1,1,0],[0,1,0]],
  ],
  Z: [
    [[1,1,0],[0,1,1],[0,0,0]],
    [[0,0,1],[0,1,1],[0,1,0]],
    [[0,0,0],[1,1,0],[0,1,1]],
    [[0,1,0],[1,1,0],[1,0,0]],
  ],
  J: [
    [[1,0,0],[1,1,1],[0,0,0]],
    [[0,1,1],[0,1,0],[0,1,0]],
    [[0,0,0],[1,1,1],[0,0,1]],
    [[0,1,0],[0,1,0],[1,1,0]],
  ],
  L: [
    [[0,0,1],[1,1,1],[0,0,0]],
    [[0,1,0],[0,1,0],[0,1,1]],
    [[0,0,0],[1,1,1],[1,0,0]],
    [[1,1,0],[0,1,0],[0,1,0]],
  ],
};

const PIECE_NAMES = Object.keys(PIECES);

const WALL_KICKS_NORMAL = [
  [[0,0],[-1,0],[-1,1],[0,-2],[-1,-2]],
  [[0,0],[1,0],[1,-1],[0,2],[1,2]],
  [[0,0],[1,0],[1,1],[0,-2],[1,-2]],
  [[0,0],[-1,0],[-1,-1],[0,2],[-1,2]],
];

const WALL_KICKS_I = [
  [[0,0],[-2,0],[1,0],[-2,-1],[1,2]],
  [[0,0],[2,0],[-1,0],[2,1],[-1,-2]],
  [[0,0],[-1,0],[2,0],[-1,2],[2,-1]],
  [[0,0],[1,0],[-2,0],[1,-2],[-2,1]],
];

export class TetrisScene extends BaseGameScene {
  constructor() {
    super('TetrisScene', 'tetris');
  }

  create() {
    super.create();

    this.board = Array.from({ length: ROWS }, () => new Array(COLS).fill(0));
    this.boardColors = Array.from({ length: ROWS }, () => new Array(COLS).fill(0));
    this.linesCleared = 0;
    this.portalTriggered = false;
    this.gameOver = false;

    this.blockImages = [];
    this.previewImages = [];

    this.cursors = this.input.keyboard.createCursorKeys();
    this.keyA = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
    this.keyD = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);
    this.keyS = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S);
    this.keyW = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W);
    this.keySpace = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

    this.dasDir = 0;
    this.dasTimer = 0;
    this.dasPhase = 'idle';

    this.dropTimer = 0;
    this.softDropping = false;

    this.drawCyberArena();
    this.boardGfx = this.add.graphics().setDepth(2);
    this.drawBoardFrame();

    this.nextPiece = this.randomPiece();
    this.spawnPiece();

    this.input.keyboard.on('keydown-UP', () => this.rotatePiece());
    this.input.keyboard.on('keydown-W', () => this.rotatePiece());
    this.input.keyboard.on('keydown-SPACE', () => this.hardDrop());

    this.events.on('powerup-collected', (def) => {
      if (def.id === 'clear_rows') this.deleteBottomRows(2);
    });
  }

  drawCyberArena() {
    if (this.modernist) {
      this.drawModernistArena();
      return;
    }
    CyberSceneFX.drawCircuitBackdrop(this, {
      primary: COLORS.NEON_CYAN,
      secondary: COLORS.NEON_GREEN,
      accent: COLORS.NEON_PURPLE,
      top: 32,
      bottom: GAME_HEIGHT - 34,
      density: 0.85,
    });
    CyberSceneFX.drawBinarySideData(this, { color: COLORS.NEON_CYAN, alpha: 0.1, columns: 2 });
    CyberSceneFX.drawHudFrame(this, {
      title: 'TETRIS: CORE RECONSTRUCTION',
      subtitle: 'CORE MATRIX // LINE PURGE',
      primary: COLORS.NEON_CYAN,
      accent: COLORS.NEON_GREEN,
    });
    CyberSceneFX.drawHoloPanel(this, PREVIEW_X + 36, PREVIEW_Y + 145, 126, 90, {
      primary: COLORS.NEON_GREEN,
      accent: COLORS.NEON_CYAN,
      depth: -5,
      tilt: 0.08,
    });
  }

  drawModernistArena() {
    const p = this.palette;
    this.cameras.main.setBackgroundColor(p.paper);

    PosterSceneFX.drawPaperBackdrop(this, {
      top: 32,
      bottom: GAME_HEIGHT - 34,
      depth: -35,
      seam: false,
      grid: true,
      gridStep: 40,
      grainDensity: 240,
      seed: 0x7a13,
    });

    PosterSceneFX.drawAxisStripData(this, {
      top: 36,
      bottom: GAME_HEIGHT - 38,
      depth: -8,
      leftAlpha: 0.42,
      rightAlpha: 0.38,
    });

    PosterSceneFX.drawPosterHudFrame(this, {
      title: 'TETRIS // CORE RECONSTRUCTION',
      subtitle: 'NODE 72 · CX4024 · 1984',
      barTop: 28,
      barBottom: GAME_HEIGHT - 36,
    });

    // Side panels: a "STATS" card on the left, "NEXT" card on the right.
    PosterSceneFX.drawPaperPanel(this, PREVIEW_X + 36, PREVIEW_Y + 160, 128, 96, {
      accent: p.cyan,
      depth: -4,
      label: '> STATS',
    });

    PosterSceneFX.drawPaperPanel(this, BOARD_X - 90, PREVIEW_Y + 30, 116, 80, {
      accent: p.mustard,
      depth: -4,
      label: '> WAVE',
    });

    PosterSceneFX.drawCoordinateBlock(this, 24, 56, {
      label: 'SECTOR 4M',
      coord: '08.1 N  22.3 E',
      node: '72',
      depth: -2,
    });
  }

  modPieceColor(type) {
    const p = this.palette;
    const map = {
      I: p.cyan,
      O: p.mustard,
      T: p.violet,
      S: p.green,
      Z: p.vermilion,
      J: p.blue,
      L: p.ink,
    };
    return map[type] || p.ink;
  }

  get dropInterval() {
    const base = 700;
    const diff = GameManager.state.difficulty;
    let interval = Math.max(50, (base - (diff - 1) * 100) / GameManager.speedMultiplier);
    if (this.powerUps.hasEffect('slow') || GameManager.modSystem.hasMod('slow_fall')) {
      interval *= 1.6;
    }
    return interval;
  }

  randomPiece() {
    return PIECE_NAMES[Phaser.Math.Between(0, PIECE_NAMES.length - 1)];
  }

  spawnPiece() {
    this.currentType = this.nextPiece;
    this.nextPiece = this.randomPiece();
    this.currentRotation = 0;
    const shape = this.getShape();
    this.currentPieceX = Math.floor((COLS - shape[0].length) / 2);
    this.currentPieceY = 0;
    this.dropTimer = 0;

    if (!this.isValid(this.currentPieceX, this.currentPieceY, shape)) {
      this.handleTopOut();
      return;
    }

    this.drawPreview();
    this.renderBoard();
  }

  getShape(type, rot) {
    return PIECES[type || this.currentType][(rot !== undefined ? rot : this.currentRotation)];
  }

  isValid(px, py, shape) {
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (!shape[r][c]) continue;
        const bx = px + c;
        const by = py + r;
        if (bx < 0 || bx >= COLS || by >= ROWS) return false;
        if (by < 0) continue;
        if (this.board[by][bx]) return false;
      }
    }
    return true;
  }

  movePiece(dx) {
    const shape = this.getShape();
    if (this.isValid(this.currentPieceX + dx, this.currentPieceY, shape)) {
      this.currentPieceX += dx;
      SFX.tMove();
      this._spawnPieceJitter(dx);
      this.renderBoard();
    }
  }

  rotatePiece() {
    if (this.gameOver) return;
    const prevRot = this.currentRotation;
    const nextRot = (prevRot + 1) % 4;
    const shape = this.getShape(this.currentType, nextRot);
    const kicks = this.currentType === 'I' ? WALL_KICKS_I : WALL_KICKS_NORMAL;
    const kickSet = kicks[prevRot];

    for (const [kx, ky] of kickSet) {
      if (this.isValid(this.currentPieceX + kx, this.currentPieceY - ky, shape)) {
        this.currentPieceX += kx;
        this.currentPieceY -= ky;
        this.currentRotation = nextRot;
        SFX.tRotate();
        this._spawnRotateFlash();
        this.renderBoard();
        return;
      }
    }
  }

  dropPiece() {
    const shape = this.getShape();
    if (this.isValid(this.currentPieceX, this.currentPieceY + 1, shape)) {
      this.currentPieceY++;
      if (this.softDropping) this._spawnSoftDropStreaks();
      this.renderBoard();
      return true;
    }
    this.lockPiece();
    return false;
  }

  hardDrop() {
    if (this.gameOver) return;
    const shape = this.getShape();
    const startY = this.currentPieceY;
    while (this.isValid(this.currentPieceX, this.currentPieceY + 1, shape)) {
      this.currentPieceY++;
    }
    const traveled = this.currentPieceY - startY;
    if (traveled > 0) {
      this._spawnHardDropTrail(shape, startY, this.currentPieceY);
      this._spawnBoardFlash(COLORS.NEON_CYAN, 0.1 + Math.min(0.18, traveled * 0.012), 180);
      this.shakeCamera(Math.min(0.007, 0.002 + traveled * 0.00025), 120 + traveled * 10);
    }
    SFX.tHardDrop();
    this.lockPiece();
  }

  ghostY() {
    const shape = this.getShape();
    let gy = this.currentPieceY;
    while (this.isValid(this.currentPieceX, gy + 1, shape)) {
      gy++;
    }
    return gy;
  }

  lockPiece() {
    const shape = this.getShape();
    const color = this.modernist ? this.modPieceColor(this.currentType) : PIECE_COLORS[this.currentType];

    if (this.portalTriggered && !this.gameOver && this._checkPieceCellsPortal(shape)) return;

    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (!shape[r][c]) continue;
        const bx = this.currentPieceX + c;
        const by = this.currentPieceY + r;
        if (by >= 0 && by < ROWS && bx >= 0 && bx < COLS) {
          this.board[by][bx] = 1;
          this.boardColors[by][bx] = color;
        }
      }
    }

    if (!this.gameOver) {
      this.renderBoard();
      this._spawnLockPulse(shape, color);
      this.shakeCamera(0.0025, 90);
      SFX.tLock();
      this.clearLines();
      this.spawnPiece();
    }
  }

  _checkPieceCellsPortal(shape) {
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (!shape[r][c]) continue;
        const cellX = BOARD_X + (this.currentPieceX + c) * CELL + CELL / 2;
        const cellY = BOARD_Y + (this.currentPieceY + r) * CELL + CELL / 2;
        if (this.tryEnterPortal(cellX, cellY)) return true;
      }
    }
    return false;
  }

  clearLines() {
    const fullRows = [];
    for (let r = 0; r < ROWS; r++) {
      if (this.board[r].every(c => c !== 0)) {
        fullRows.push(r);
      }
    }

    if (fullRows.length === 0) return;

    const count = fullRows.length;
    const awards = ['single', 'double', 'triple', 'tetris'];
    const centerX = BOARD_X + BOARD_W / 2;
    const centerY = BOARD_Y + ((Math.min(...fullRows) + Math.max(...fullRows) + 1) / 2) * CELL;
    this.score.award(awards[Math.min(count, 4) - 1], 1, centerX, centerY);
    this.linesCleared += count;
    SFX.tLineClear(count);
    this._spawnClearBurst(centerX, centerY, count);
    this._spawnBoardFlash(count === 4 ? COLORS.NEON_MAGENTA : COLORS.NEON_CYAN, 0.1 + count * 0.03, 220 + count * 40);
    this.shakeCamera(0.002 + count * 0.0015, 140 + count * 60);

    if (count >= 3) GlitchEffect.digitalNoise(this, 180 + count * 40);
    if (count === 4) {
      GlitchEffect.chromaticAberration(this, 320);
      this._showClearCallout('TETRIS!', COLORS.NEON_MAGENTA, centerX, centerY - 18, 34);
    } else if (count === 3) {
      this._showClearCallout('TRIPLE', COLORS.NEON_ORANGE, centerX, centerY - 14, 24);
    } else if (count === 2) {
      this._showClearCallout('DOUBLE', COLORS.NEON_CYAN, centerX, centerY - 12, 20);
    }

    for (const row of fullRows.sort((a, b) => b - a)) {
      this.board.splice(row, 1);
      this.boardColors.splice(row, 1);
      this.board.unshift(new Array(COLS).fill(0));
      this.boardColors.unshift(new Array(COLS).fill(0));
    }

    this.renderBoard();

    if (!this.portalTriggered) {
      this.checkPortalCondition(count, fullRows);
    }

    this.flashRows(fullRows, count);
  }

  deleteBottomRows(count) {
    for (let i = 0; i < count; i++) {
      this.board.pop();
      this.boardColors.pop();
      this.board.unshift(new Array(COLS).fill(0));
      this.boardColors.unshift(new Array(COLS).fill(0));
    }
    this.renderBoard();
  }

  handleTopOut() {
    const alive = this.onPlayerDeath();
    if (!alive) {
      this.gameOver = true;
      return;
    }

    this._showClearCallout('STACK OVERLOAD', COLORS.NEON_RED, GAME_WIDTH / 2, BOARD_Y + 48, 20);
    this._spawnBoardFlash(COLORS.NEON_RED, 0.16, 260);
    GlitchEffect.digitalNoise(this, 180);
    this.shakeCamera(0.006, 220);
    this.deleteBottomRows(6);
    this.gameOver = false;
    this.spawnPiece();
  }

  flashRows(rows, count, onComplete = null) {
    if (this.modernist) {
      this._flashRowsModernist(rows, count, onComplete);
      return;
    }
    const flashBlocks = [];
    const flashBars = [];
    const tierColors = [COLORS.NEON_CYAN, COLORS.NEON_GREEN, COLORS.NEON_ORANGE, COLORS.NEON_MAGENTA];
    const color = tierColors[Math.min(count, 4) - 1];

    for (const r of rows) {
      const bar = this.add.rectangle(
        BOARD_X + BOARD_W / 2,
        BOARD_Y + r * CELL + CELL / 2,
        BOARD_W + 24,
        CELL + 8,
        color,
        0.15 + count * 0.04
      ).setDepth(30).setBlendMode(Phaser.BlendModes.ADD);
      flashBars.push(bar);

      for (let c = 0; c < COLS; c++) {
        const x = BOARD_X + c * CELL + CELL / 2;
        const y = BOARD_Y + r * CELL + CELL / 2;
        const img = this.add.image(x, y, 'tetris-block').setTint(color).setScale(0.9);
        flashBlocks.push(img);
      }
    }

    // Phase 1: High-frequency flash
    this.tweens.add({
      targets: flashBlocks,
      alpha: { from: 1, to: 0 },
      duration: 50,
      yoyo: true,
      repeat: 3,
      onComplete: () => {
        // Phase 2: Chromatic glitch
        GlitchEffect.chromaticAberration(this, 200);
        // Phase 3: Dissolve upward
        for (const r of rows) {
          const cy = BOARD_Y + r * CELL + CELL / 2;
          DebrisSystem.dissolve(this, BOARD_X + BOARD_W / 2, cy, {
            count: 10 + count * 3,
            colors: [color, COLORS.WHITE, COLORS.NEON_CYAN],
            width: BOARD_W,
            duration: 500 + count * 80,
            riseHeight: 80,
          });
        }
        flashBlocks.forEach(b => b.destroy());
        if (onComplete) {
          this.time.delayedCall(200, () => onComplete());
        }
      },
    });

    this.tweens.add({
      targets: flashBars,
      alpha: 0,
      scaleX: 1.08,
      duration: 250 + count * 60,
      onComplete: () => {
        flashBars.forEach(bar => bar.destroy());
      },
    });

    // Tetris (4 lines): extra screen tear + callout
    if (count >= 4) {
      GlitchEffect.screenTear(this, 300);
      this.shakeCamera(0.006, 200);
      ArcadeFX.callout(this, 'SYSTEM PURGE', BOARD_X + BOARD_W / 2, BOARD_Y - 10, {
        color: COLORS.NEON_MAGENTA,
        fontSize: '18px',
      });
    }
  }

  _flashRowsModernist(rows, count, onComplete = null) {
    const p = this.palette;
    // Print line-clear: a single saturated vermilion stripe across each row
    // for ~80ms per the spec, paired with row-bar glyph hatches.
    const stripes = [];
    const hatches = [];

    for (const r of rows) {
      const cy = BOARD_Y + r * CELL + CELL / 2;
      const stripe = this.add.rectangle(
        BOARD_X + BOARD_W / 2,
        cy,
        BOARD_W,
        CELL,
        p.vermilion,
        1,
      ).setDepth(30);
      stripes.push(stripe);

      const hatch = this.add.graphics().setDepth(31);
      hatch.lineStyle(1, p.paper, 0.85);
      for (let i = 0; i < COLS; i++) {
        const hx = BOARD_X + i * CELL + 4;
        hatch.lineBetween(hx, cy - CELL / 2 + 4, hx + CELL - 8, cy + CELL / 2 - 4);
      }
      hatches.push(hatch);
    }

    this.tweens.add({
      targets: stripes,
      alpha: 0,
      duration: 220 + count * 60,
      delay: 80,
      ease: 'Quad.easeIn',
      onComplete: () => stripes.forEach(s => s.destroy()),
    });
    this.tweens.add({
      targets: hatches,
      alpha: 0,
      duration: 200 + count * 60,
      delay: 80,
      onComplete: () => hatches.forEach(h => h.destroy()),
    });

    // Tetris-tier extras: print misregistration + a stamp callout.
    if (count >= 4) {
      GlitchEffect.chromaticAberration(this, 240);
      this.shakeCamera(0.004, 180);
      ArcadeFX.callout(this, 'SYSTEM PURGE', BOARD_X + BOARD_W / 2, BOARD_Y - 10, {
        color: p.vermilion,
        fontSize: '18px',
      });
    } else if (count >= 3) {
      GlitchEffect.chromaticAberration(this, 160);
    }

    if (onComplete) this.time.delayedCall(220 + count * 50, () => onComplete());
  }

  checkPortalCondition(clearedCount, rows) {
    const isTetris = clearedCount === 4;
    if ((this.linesCleared >= 8 && isTetris) || this.linesCleared >= 15) {
      this.portalTriggered = true;
      const minRow = Math.min(...rows);
      const maxRow = Math.max(...rows);
      const ripY = BOARD_Y + ((minRow + maxRow) / 2) * CELL + CELL / 2;
      this._showClearCallout('PORTAL OPEN', COLORS.NEON_MAGENTA, GAME_WIDTH / 2, ripY - 36, 22);
      this._spawnBoardFlash(COLORS.NEON_MAGENTA, 0.18, 420);
      GlitchEffect.screenTear(this, 280);
      this.triggerPortal(GAME_WIDTH / 2, ripY);
    }
  }

  showPortalHint() {
    this._showHintText('▸ DROP A PIECE INTO THE PORTAL ▸');
  }

  onPortalForceSpawn() {
    if (!this.portalTriggered) {
      this.portalTriggered = true;
    }
    const spawnRow = Math.floor(ROWS * 0.4);
    this.portal.spawnPortal(
      BOARD_X + Math.floor(COLS / 2) * CELL + CELL / 2,
      BOARD_Y + spawnRow * CELL + CELL / 2,
    );
  }

  drawBoardFrame() {
    const g = this.boardGfx;
    g.clear();

    if (this.modernist) {
      this.drawModernistBoardFrame(g);
      return;
    }

    const time = this.time ? this.time.now * 0.005 : 0;
    const portalPulse = this.portalTriggered ? (Math.sin(time) * 0.5 + 0.5) : 0;
    const frameColor = this.portalTriggered ? COLORS.NEON_MAGENTA : COLORS.NEON_CYAN;
    const frameAlpha = 0.48 + portalPulse * 0.3 + (this.softDropping ? 0.08 : 0);

    NeonGlow.strokeRect(g, BOARD_X - 2, BOARD_Y - 2, BOARD_W + 4, BOARD_H + 4, frameColor, 1, frameAlpha);
    NeonGlow.cornerAccents(g, BOARD_X - 6, BOARD_Y - 6, BOARD_W + 12, BOARD_H + 12, 10, frameColor, 1);

    const previewColor = this.portalTriggered ? COLORS.NEON_PURPLE : COLORS.NEON_BLUE;
    NeonGlow.strokeRect(g, PREVIEW_X - 10, PREVIEW_Y - 26, PREVIEW_W, PREVIEW_H, previewColor, 1, 0.38 + portalPulse * 0.18);
    NeonGlow.cornerAccents(g, PREVIEW_X - 14, PREVIEW_Y - 30, PREVIEW_W + 8, PREVIEW_H + 8, 8, previewColor, 1);

    g.lineStyle(1, COLORS.GRID_LINE, 0.15);
    for (let c = 1; c < COLS; c++) {
      g.lineBetween(BOARD_X + c * CELL, BOARD_Y, BOARD_X + c * CELL, BOARD_Y + BOARD_H);
    }
    for (let r = 1; r < ROWS; r++) {
      g.lineBetween(BOARD_X, BOARD_Y + r * CELL, BOARD_X + BOARD_W, BOARD_Y + r * CELL);
    }
  }

  drawModernistBoardFrame(g) {
    const p = this.palette;
    const portal = this.portalTriggered;
    const frameColor = portal ? p.vermilion : p.ink;
    const frameWidth = portal ? 2 : 1.5;

    g.fillStyle(p.paper, 1);
    g.fillRect(BOARD_X, BOARD_Y, BOARD_W, BOARD_H);
    g.fillStyle(p.ink, 0.04);
    g.fillRect(BOARD_X, BOARD_Y, BOARD_W, BOARD_H);

    g.lineStyle(1, p.faint, 0.55);
    for (let c = 1; c < COLS; c++) {
      g.lineBetween(BOARD_X + c * CELL, BOARD_Y, BOARD_X + c * CELL, BOARD_Y + BOARD_H);
    }
    for (let r = 1; r < ROWS; r++) {
      g.lineBetween(BOARD_X, BOARD_Y + r * CELL, BOARD_X + BOARD_W, BOARD_Y + r * CELL);
    }

    g.lineStyle(frameWidth, frameColor, 1);
    g.strokeRect(BOARD_X - 1, BOARD_Y - 1, BOARD_W + 2, BOARD_H + 2);

    g.lineStyle(1, p.ink, 0.55);
    g.strokeRect(BOARD_X - 5, BOARD_Y - 5, BOARD_W + 10, BOARD_H + 10);

    const tickLen = 6;
    g.lineStyle(1, p.vermilion, 0.85);
    g.lineBetween(BOARD_X - 5, BOARD_Y - 5, BOARD_X - 5 + tickLen, BOARD_Y - 5);
    g.lineBetween(BOARD_X - 5, BOARD_Y - 5, BOARD_X - 5, BOARD_Y - 5 + tickLen);
    g.lineBetween(BOARD_X + BOARD_W + 5, BOARD_Y - 5, BOARD_X + BOARD_W + 5 - tickLen, BOARD_Y - 5);
    g.lineBetween(BOARD_X + BOARD_W + 5, BOARD_Y - 5, BOARD_X + BOARD_W + 5, BOARD_Y - 5 + tickLen);
    g.lineBetween(BOARD_X - 5, BOARD_Y + BOARD_H + 5, BOARD_X - 5 + tickLen, BOARD_Y + BOARD_H + 5);
    g.lineBetween(BOARD_X - 5, BOARD_Y + BOARD_H + 5, BOARD_X - 5, BOARD_Y + BOARD_H + 5 - tickLen);
    g.lineBetween(BOARD_X + BOARD_W + 5, BOARD_Y + BOARD_H + 5, BOARD_X + BOARD_W + 5 - tickLen, BOARD_Y + BOARD_H + 5);
    g.lineBetween(BOARD_X + BOARD_W + 5, BOARD_Y + BOARD_H + 5, BOARD_X + BOARD_W + 5, BOARD_Y + BOARD_H + 5 - tickLen);

    const previewAccent = portal ? p.vermilion : p.cyan;
    g.lineStyle(1.5, previewAccent, 1);
    g.strokeRect(PREVIEW_X - 10, PREVIEW_Y - 26, PREVIEW_W, PREVIEW_H);
    g.lineStyle(1, p.ink, 0.4);
    g.strokeRect(PREVIEW_X - 13, PREVIEW_Y - 29, PREVIEW_W + 6, PREVIEW_H + 6);
  }

  renderBoard() {
    this.blockImages.forEach(img => img.destroy());
    this.blockImages = [];

    if (this.modernist) {
      this.renderBoardModernist();
      return;
    }

    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (this.board[r][c]) {
          const x = BOARD_X + c * CELL + CELL / 2;
          const y = BOARD_Y + r * CELL + CELL / 2;
          const img = this.add.image(x, y, 'tetris-block').setTint(this.boardColors[r][c]).setAlpha(0.9).setDepth(10);
          img.setBlendMode(Phaser.BlendModes.ADD);
          this.blockImages.push(img);
        }
      }
    }

    if (!this.gameOver) {
      const shape = this.getShape();
      const color = PIECE_COLORS[this.currentType];
      const gy = this.ghostY();

      for (let r = 0; r < shape.length; r++) {
        for (let c = 0; c < shape[r].length; c++) {
          if (!shape[r][c]) continue;

          const ghostRow = gy + r;
          if (ghostRow >= 0) {
            const gx = BOARD_X + (this.currentPieceX + c) * CELL + CELL / 2;
            const gyPx = BOARD_Y + ghostRow * CELL + CELL / 2;
            const ghostGlow = this.add.image(gx, gyPx, 'tetris-block').setTint(color).setAlpha(0.08).setScale(1.12).setDepth(8);
            const ghost = this.add.image(gx, gyPx, 'tetris-block').setTint(color).setAlpha(0.16).setScale(0.96).setDepth(9);
            ghostGlow.setBlendMode(Phaser.BlendModes.ADD);
            ghost.setBlendMode(Phaser.BlendModes.ADD);
            this.blockImages.push(ghostGlow);
            this.blockImages.push(ghost);
          }

          const py = this.currentPieceY + r;
          if (py >= 0) {
            const px = BOARD_X + (this.currentPieceX + c) * CELL + CELL / 2;
            const pyPx = BOARD_Y + py * CELL + CELL / 2;
            const pulse = this.softDropping ? 1.08 : 1.0 + Math.sin((this.time.now + (r + c) * 30) * 0.012) * 0.02;
            const glow = this.add.image(px, pyPx, 'tetris-block').setTint(color).setAlpha(0.22).setScale(1.16).setDepth(12);
            const img = this.add.image(px, pyPx, 'tetris-block').setTint(color).setScale(pulse).setDepth(13);
            glow.setBlendMode(Phaser.BlendModes.ADD);
            img.setBlendMode(Phaser.BlendModes.ADD);
            this.blockImages.push(glow);
            this.blockImages.push(img);
          }
        }
      }
    }
  }

  renderBoardModernist() {
    const p = this.palette;
    const inset = 1;
    const cellSize = CELL - inset * 2;

    // Locked blocks: solid color fill + 1px ink border, no glow.
    const stack = this.add.graphics().setDepth(10);
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (!this.board[r][c]) continue;
        const x = BOARD_X + c * CELL + inset;
        const y = BOARD_Y + r * CELL + inset;
        const fill = this.boardColors[r][c];
        stack.fillStyle(fill, 1);
        stack.fillRect(x, y, cellSize, cellSize);
        stack.lineStyle(1, p.ink, 1);
        stack.strokeRect(x + 0.5, y + 0.5, cellSize - 1, cellSize - 1);
        // Notch corner — small printed-block detail.
        stack.fillStyle(p.ink, 0.18);
        stack.fillRect(x + cellSize - 4, y, 4, 4);
      }
    }
    this.blockImages.push(stack);

    if (this.gameOver) return;

    const shape = this.getShape();
    const color = this.modPieceColor(this.currentType);
    const gy = this.ghostY();

    // Ghost piece: outline-only frame in muted ink.
    const ghost = this.add.graphics().setDepth(9);
    ghost.lineStyle(1, p.ink, 0.42);
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (!shape[r][c]) continue;
        const ghostRow = gy + r;
        if (ghostRow < 0) continue;
        const gx = BOARD_X + (this.currentPieceX + c) * CELL + inset;
        const gyPx = BOARD_Y + ghostRow * CELL + inset;
        ghost.strokeRect(gx + 0.5, gyPx + 0.5, cellSize - 1, cellSize - 1);
        // Diagonal hatch as "phantom" indicator.
        ghost.lineStyle(1, p.ink, 0.18);
        ghost.lineBetween(gx + 2, gyPx + cellSize - 2, gx + cellSize - 2, gyPx + 2);
        ghost.lineStyle(1, p.ink, 0.42);
      }
    }
    this.blockImages.push(ghost);

    // Active piece: solid color + 1px ink border. Soft-drop tightens the border
    // weight to telegraph the speed-up without resorting to a glow.
    const active = this.add.graphics().setDepth(13);
    const borderAlpha = this.softDropping ? 1 : 0.9;
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (!shape[r][c]) continue;
        const py = this.currentPieceY + r;
        if (py < 0) continue;
        const px = BOARD_X + (this.currentPieceX + c) * CELL + inset;
        const pyPx = BOARD_Y + py * CELL + inset;
        active.fillStyle(color, 1);
        active.fillRect(px, pyPx, cellSize, cellSize);
        active.lineStyle(this.softDropping ? 1.5 : 1, p.ink, borderAlpha);
        active.strokeRect(px + 0.5, pyPx + 0.5, cellSize - 1, cellSize - 1);
        active.fillStyle(p.ink, 0.22);
        active.fillRect(px + cellSize - 4, pyPx, 4, 4);
      }
    }
    this.blockImages.push(active);
  }

  drawPreview() {
    this.previewImages.forEach(img => img.destroy());
    this.previewImages = [];

    if (this.modernist) {
      this.drawPreviewModernist();
      return;
    }

    const shape = PIECES[this.nextPiece][0];
    const color = PIECE_COLORS[this.nextPiece];

    const label = this.add.text(PREVIEW_X, PREVIEW_Y - 16, 'NEXT', {
      fontSize: '13px', color: '#00f0ff', fontFamily: this.fonts.ui,
    }).setDepth(40).setAlpha(0);
    NeonGlow.applyTextGlow(this, label, COLORS.NEON_CYAN);
    this.previewImages.push(label);

    const offsetX = PREVIEW_X + (4 - shape[0].length) * CELL / 4;
    const offsetY = PREVIEW_Y + 4;
    const blockTargets = [];

    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (!shape[r][c]) continue;
        const x = offsetX + c * CELL + CELL / 2;
        const y = offsetY + r * CELL + CELL / 2;
        const glow = this.add.image(x, y, 'tetris-block').setTint(color).setAlpha(0).setScale(1.14).setDepth(39);
        const img = this.add.image(x, y, 'tetris-block').setTint(color).setScale(0.82).setAlpha(0).setDepth(40);
        this.previewImages.push(glow);
        this.previewImages.push(img);
        blockTargets.push(glow, img);
      }
    }

    this.tweens.add({
      targets: label,
      alpha: 1,
      duration: 180,
    });
    this.tweens.add({
      targets: blockTargets,
      alpha: 1,
      scaleX: 1,
      scaleY: 1,
      duration: 220,
      ease: 'Back.easeOut',
    });
  }

  drawPreviewModernist() {
    const p = this.palette;
    const shape = PIECES[this.nextPiece][0];
    const color = this.modPieceColor(this.nextPiece);

    // Header + piece-name kicker, like a printed plate.
    const label = this.add.text(PREVIEW_X - 8, PREVIEW_Y - 22, '> NEXT', {
      fontSize: '12px', fontFamily: this.fonts.ui, color: cssColor(p.ink),
    }).setDepth(40).setAlpha(0);
    NeonGlow.applyTextGlow(this, label, p.ink);
    this.previewImages.push(label);

    const kicker = this.add.text(PREVIEW_X + PREVIEW_W - 18, PREVIEW_Y - 22, this.nextPiece, {
      fontSize: '13px', fontFamily: this.fonts.display, color: cssColor(p.vermilion),
    }).setOrigin(1, 0).setDepth(40).setAlpha(0);
    this.previewImages.push(kicker);

    const offsetX = PREVIEW_X + (4 - shape[0].length) * CELL / 4;
    const offsetY = PREVIEW_Y + 4;

    const block = this.add.graphics().setDepth(40).setAlpha(0);
    const inset = 1;
    const cellSize = CELL - inset * 2;
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (!shape[r][c]) continue;
        const x = offsetX + c * CELL + inset;
        const y = offsetY + r * CELL + inset;
        block.fillStyle(color, 1);
        block.fillRect(x, y, cellSize, cellSize);
        block.lineStyle(1, p.ink, 1);
        block.strokeRect(x + 0.5, y + 0.5, cellSize - 1, cellSize - 1);
        block.fillStyle(p.ink, 0.22);
        block.fillRect(x + cellSize - 4, y, 4, 4);
      }
    }
    this.previewImages.push(block);

    this.tweens.add({
      targets: [label, kicker, block],
      alpha: 1,
      duration: 220,
      ease: 'Quad.easeOut',
    });
  }

  _getPieceCells(shape = this.getShape(), pieceX = this.currentPieceX, pieceY = this.currentPieceY) {
    const cells = [];
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (!shape[r][c]) continue;
        cells.push({
          x: BOARD_X + (pieceX + c) * CELL + CELL / 2,
          y: BOARD_Y + (pieceY + r) * CELL + CELL / 2,
        });
      }
    }
    return cells;
  }

  _pieceCentroid(shape = this.getShape()) {
    const cells = this._getPieceCells(shape);
    if (!cells.length) return { x: BOARD_X + BOARD_W / 2, y: BOARD_Y + BOARD_H / 2 };
    const sum = cells.reduce((acc, cell) => ({ x: acc.x + cell.x, y: acc.y + cell.y }), { x: 0, y: 0 });
    return { x: sum.x / cells.length, y: sum.y / cells.length };
  }

  _spawnBoardFlash(color, alpha, duration) {
    if (this.modernist) {
      const p = this.palette;
      // Print: a thin vermilion bar across the top of the board snaps in
      // and fades — feels like a press-stamped alert, not an additive flash.
      const stamp = this.add.graphics().setDepth(20);
      stamp.lineStyle(2, p.vermilion, Math.min(1, alpha * 4));
      stamp.strokeRect(BOARD_X - 3, BOARD_Y - 3, BOARD_W + 6, BOARD_H + 6);
      this.tweens.add({
        targets: stamp,
        alpha: 0,
        duration,
        onComplete: () => stamp.destroy(),
      });
      return;
    }
    const flash = this.add.rectangle(
      BOARD_X + BOARD_W / 2,
      BOARD_Y + BOARD_H / 2,
      BOARD_W + 14,
      BOARD_H + 14,
      color,
      alpha
    ).setDepth(20);
    this.tweens.add({
      targets: flash,
      alpha: 0,
      scaleX: 1.02,
      scaleY: 1.02,
      duration,
      onComplete: () => flash.destroy(),
    });
  }

  _spawnClearBurst(x, y, count) {
    if (this.modernist) {
      const p = this.palette;
      const tiers = [p.cyan, p.green, p.mustard, p.vermilion];
      const mainColor = tiers[Math.min(count, 4) - 1];
      DebrisSystem.shatter(this, x, y, {
        count: 8 + count * 3,
        colors: [mainColor, p.ink, p.vermilion],
        size: 4,
        spread: 36 + count * 10,
        duration: 280 + count * 60,
      });
      DebrisSystem.dissolve(this, x, y, {
        count: 5 + count * 2,
        colors: [mainColor, p.ink],
        width: BOARD_W * 0.6,
        duration: 380 + count * 50,
        riseHeight: 60,
      });
      return;
    }
    const colors = [COLORS.NEON_CYAN, COLORS.NEON_GREEN, COLORS.NEON_ORANGE, COLORS.NEON_MAGENTA];
    const mainColor = colors[Math.min(count, 4) - 1];

    // Radial burst outward
    DebrisSystem.shatter(this, x, y, {
      count: 10 + count * 4,
      colors: [mainColor, COLORS.WHITE, COLORS.NEON_CYAN],
      size: 5,
      spread: 40 + count * 12,
      duration: 300 + count * 70,
    });

    // Upward converge particles ("data upload")
    DebrisSystem.dissolve(this, x, y, {
      count: 6 + count * 2,
      colors: [mainColor, COLORS.WHITE],
      width: BOARD_W * 0.6,
      duration: 400 + count * 50,
      riseHeight: 60,
    });
  }

  _showClearCallout(text, color, x, y, size = 26) {
    const labelColor = this.modernist
      ? cssColor(this.palette.ink)
      : '#ffffff';
    const label = this.add.text(x, y, text, {
      fontSize: `${size}px`,
      fontFamily: this.modernist ? this.fonts.display : this.fonts.ui,
      color: labelColor,
    }).setOrigin(0.5).setDepth(60).setAlpha(0);
    NeonGlow.applyTextGlow(this, label, color);
    this.tweens.add({
      targets: label,
      alpha: 1,
      y: y - 18,
      scale: { from: 0.75, to: 1.06 },
      duration: 260,
      ease: 'Back.easeOut',
      onComplete: () => {
        this.tweens.add({
          targets: label,
          alpha: 0,
          y: label.y - 12,
          duration: 380,
          delay: 260,
          onComplete: () => label.destroy(),
        });
      },
    });
  }

  _spawnLockPulse(shape, color) {
    const cells = this._getPieceCells(shape);
    if (this.modernist) {
      const p = this.palette;
      cells.forEach(({ x, y }) => {
        const stamp = this.add.graphics().setDepth(25).setPosition(x, y);
        stamp.lineStyle(1.5, p.ink, 0.85);
        stamp.strokeRect(-CELL / 2 + 1, -CELL / 2 + 1, CELL - 2, CELL - 2);
        this.tweens.add({
          targets: stamp,
          alpha: 0,
          scaleX: 1.35,
          scaleY: 1.35,
          duration: 200,
          ease: 'Quad.easeOut',
          onComplete: () => stamp.destroy(),
        });
      });
      return;
    }
    cells.forEach(({ x, y }) => {
      // Glow ring on lock
      const pulse = this.add.image(x, y, 'tetris-block').setTint(color).setAlpha(0.5).setScale(0.9).setDepth(25);
      pulse.setBlendMode(Phaser.BlendModes.ADD);
      this.tweens.add({
        targets: pulse,
        alpha: 0,
        scaleX: 1.5,
        scaleY: 1.5,
        duration: 220,
        ease: 'Quad.easeOut',
        onComplete: () => pulse.destroy(),
      });
      // Flash accent
      const flash = this.add.graphics().setPosition(x, y).setDepth(26);
      flash.fillStyle(0xffffff, 0.3);
      flash.fillCircle(0, 0, 6);
      flash.setBlendMode(Phaser.BlendModes.ADD);
      this.tweens.add({
        targets: flash,
        alpha: 0,
        scaleX: 2,
        scaleY: 2,
        duration: 150,
        onComplete: () => flash.destroy(),
      });
    });
  }

  _spawnHardDropTrail(shape, startY, endY) {
    const cells = this._getPieceCells(shape, this.currentPieceX, endY);
    const distance = Math.max(1, endY - startY);

    if (this.modernist) {
      const p = this.palette;
      cells.forEach(({ x, y }) => {
        const trail = this.add.graphics().setDepth(18);
        trail.lineStyle(1, p.ink, 0.55);
        trail.lineBetween(x, y - distance * CELL, x, y - CELL * 0.3);
        trail.lineStyle(1, p.vermilion, 0.4);
        trail.lineBetween(x - 4, y - distance * CELL + 4, x - 4, y - CELL * 0.5);
        this.tweens.add({
          targets: trail,
          alpha: 0,
          duration: 180 + distance * 8,
          onComplete: () => trail.destroy(),
        });
      });
      return;
    }

    const color = PIECE_COLORS[this.currentType];
    cells.forEach(({ x, y }) => {
      const trail = this.add.rectangle(
        x,
        y - (distance * CELL) / 2,
        CELL * 0.55,
        distance * CELL + CELL * 0.35,
        color,
        0.18
      ).setDepth(18);
      this.tweens.add({
        targets: trail,
        alpha: 0,
        scaleX: 0.7,
        duration: 150 + distance * 10,
        onComplete: () => trail.destroy(),
      });
    });
  }

  _spawnRotateFlash() {
    const { x, y } = this._pieceCentroid();
    if (this.modernist) {
      const p = this.palette;
      const arc = this.add.graphics().setDepth(22);
      arc.lineStyle(1, p.vermilion, 0.85);
      arc.strokeCircle(x, y, 8);
      this.tweens.add({
        targets: arc,
        alpha: 0,
        scaleX: 2.6,
        scaleY: 2.6,
        duration: 180,
        ease: 'Quad.easeOut',
        onComplete: () => arc.destroy(),
      });
      return;
    }
    const ring = this.add.circle(x, y, 8, COLORS.NEON_CYAN, 0.22).setDepth(22);
    this.tweens.add({
      targets: ring,
      radius: 30,
      alpha: 0,
      duration: 170,
      ease: 'Quad.easeOut',
      onComplete: () => ring.destroy(),
    });
  }

  _spawnPieceJitter(dx) {
    if (this.modernist) {
      const p = this.palette;
      this._getPieceCells().forEach(({ x, y }) => {
        const tick = this.add.graphics().setDepth(18);
        tick.lineStyle(1, p.ink, 0.55);
        tick.lineBetween(x - dx * 6, y - CELL * 0.3, x - dx * 6, y + CELL * 0.3);
        this.tweens.add({
          targets: tick,
          alpha: 0,
          x: tick.x + dx * 6,
          duration: 100,
          onComplete: () => tick.destroy(),
        });
      });
      return;
    }
    const color = PIECE_COLORS[this.currentType];
    this._getPieceCells().forEach(({ x, y }) => {
      const smear = this.add.rectangle(x - dx * 8, y, CELL * 0.4, CELL * 0.75, color, 0.12).setDepth(18);
      this.tweens.add({
        targets: smear,
        x,
        alpha: 0,
        duration: 90,
        onComplete: () => smear.destroy(),
      });
    });
  }

  _spawnSoftDropStreaks() {
    if (this.modernist) {
      const p = this.palette;
      this._getPieceCells().forEach(({ x, y }) => {
        const tick = this.add.graphics().setDepth(18);
        tick.lineStyle(1, p.ink, 0.4);
        tick.lineBetween(x, y - CELL * 0.55, x, y - CELL * 0.15);
        this.tweens.add({
          targets: tick,
          y: tick.y + CELL * 0.4,
          alpha: 0,
          duration: 90,
          onComplete: () => tick.destroy(),
        });
      });
      return;
    }
    const color = PIECE_COLORS[this.currentType];
    this._getPieceCells().forEach(({ x, y }) => {
      const streak = this.add.rectangle(x, y - CELL * 0.45, CELL * 0.18, CELL * 0.9, color, 0.16).setDepth(18);
      this.tweens.add({
        targets: streak,
        y: y + CELL * 0.2,
        alpha: 0,
        duration: 90,
        onComplete: () => streak.destroy(),
      });
    });
  }

  updateDAS(time, delta) {
    const invX = this.horizontalControlInverted;
    const leftHeld = invX
      ? (this.cursors.right.isDown || this.keyD.isDown)
      : (this.cursors.left.isDown || this.keyA.isDown);
    const rightHeld = invX
      ? (this.cursors.left.isDown || this.keyA.isDown)
      : (this.cursors.right.isDown || this.keyD.isDown);

    let dir = 0;
    if (leftHeld && !rightHeld) dir = -1;
    else if (rightHeld && !leftHeld) dir = 1;

    if (dir === 0) {
      this.dasDir = 0;
      this.dasPhase = 'idle';
      return;
    }

    if (dir !== this.dasDir) {
      this.dasDir = dir;
      this.dasTimer = 0;
      this.dasPhase = 'initial';
      this.movePiece(dir);
      return;
    }

    this.dasTimer += delta;

    if (this.dasPhase === 'initial') {
      if (this.dasTimer >= DAS_INITIAL) {
        this.dasPhase = 'repeat';
        this.dasTimer -= DAS_INITIAL;
        this.movePiece(dir);
      }
    } else if (this.dasPhase === 'repeat') {
      while (this.dasTimer >= DAS_REPEAT) {
        this.dasTimer -= DAS_REPEAT;
        this.movePiece(dir);
      }
    }
  }

  update(time, delta) {
    super.update(time, delta);
    this.drawBoardFrame();
    if (this.gameOver) return;

    this.updateDAS(time, delta);

    const invY = this.verticalControlInverted;
    this.softDropping = invY
      ? (this.cursors.up.isDown || this.keyW.isDown)
      : (this.cursors.down.isDown || this.keyS.isDown);
    const interval = this.softDropping ? Math.min(this.dropInterval, 50) : this.dropInterval;

    this.dropTimer += delta;
    if (this.dropTimer >= interval) {
      this.dropTimer = 0;
      this.dropPiece();
    }

    const px = BOARD_X + this.currentPieceX * CELL + CELL / 2;
    const py = BOARD_Y + this.currentPieceY * CELL + CELL / 2;
    this.setPlayerPosition(px, py);
    this.powerUps.checkCollection(px, py);
    this.glitch.checkDataLeakCollection(px, py);

    if (this.portalTriggered) {
      const shape = this.getShape();
      for (let r = 0; r < shape.length; r++) {
        for (let c = 0; c < shape[r].length; c++) {
          if (!shape[r][c]) continue;
          const cx = BOARD_X + (this.currentPieceX + c) * CELL + CELL / 2;
          const cy = BOARD_Y + (this.currentPieceY + r) * CELL + CELL / 2;
          if (this.tryEnterPortal(cx, cy)) return;
        }
      }
    }
  }

  shutdown() {
    super.shutdown();
    try {
      if (this.blockImages) this.blockImages.forEach(img => { if (img && img.active) img.destroy(); });
      if (this.previewImages) this.previewImages.forEach(img => { if (img && img.active) img.destroy(); });
    } catch (_) { /* safe */ }
  }
}
