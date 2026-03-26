import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS } from '../../config.js';
import { GameManager } from '../../core/GameManager.js';
import { BaseGameScene } from '../BaseGameScene.js';
import SFX from '../../core/SFXManager.js';
import NeonGlow from '../../vfx/NeonGlow.js';

const COLS = 10;
const ROWS = 20;
const CELL = 24;
const BOARD_W = COLS * CELL;
const BOARD_H = ROWS * CELL;
const BOARD_X = Math.floor((GAME_WIDTH - BOARD_W) / 2);
const BOARD_Y = 28 + Math.floor((GAME_HEIGHT - 28 - BOARD_H) / 2);

const PREVIEW_X = BOARD_X + BOARD_W + 40;
const PREVIEW_Y = BOARD_Y + 20;

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

    this.boardGfx = this.add.graphics();
    this.drawBoardFrame();

    this.nextPiece = this.randomPiece();
    this.spawnPiece();

    this.input.keyboard.on('keydown-UP', () => this.rotatePiece());
    this.input.keyboard.on('keydown-W', () => this.rotatePiece());
    this.input.keyboard.on('keydown-SPACE', () => this.hardDrop());

    this.events.on('powerup-collected', (def) => {
      if (def.id === 'clear_rows') this.clearBottomRows(2);
    });
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
      this.gameOver = true;
      this.lockPiece();
      this.onPlayerDeath();
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
        this.renderBoard();
        return;
      }
    }
  }

  dropPiece() {
    const shape = this.getShape();
    if (this.isValid(this.currentPieceX, this.currentPieceY + 1, shape)) {
      this.currentPieceY++;
      this.renderBoard();
      return true;
    }
    this.lockPiece();
    return false;
  }

  hardDrop() {
    if (this.gameOver) return;
    const shape = this.getShape();
    while (this.isValid(this.currentPieceX, this.currentPieceY + 1, shape)) {
      this.currentPieceY++;
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
    const color = PIECE_COLORS[this.currentType];
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
      SFX.tLock();
      this.clearLines();
      this.spawnPiece();
    }
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
    this.score.award(awards[Math.min(count, 4) - 1]);
    this.linesCleared += count;
    SFX.tLineClear(count);

    this.flashRows(fullRows, () => {
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
    });
  }

  clearBottomRows(count) {
    for (let i = 0; i < count; i++) {
      const row = ROWS - 1 - i;
      if (row >= 0) {
        this.board[row] = new Array(COLS).fill(0);
        this.boardColors[row] = new Array(COLS).fill(0);
      }
    }
    this.renderBoard();
  }

  flashRows(rows, onComplete) {
    const flashBlocks = [];
    for (const r of rows) {
      for (let c = 0; c < COLS; c++) {
        const x = BOARD_X + c * CELL + CELL / 2;
        const y = BOARD_Y + r * CELL + CELL / 2;
        const img = this.add.image(x, y, 'tetris-block').setTint(COLORS.NEON_CYAN);
        flashBlocks.push(img);
      }
    }

    this.tweens.add({
      targets: flashBlocks,
      alpha: 0,
      duration: 200,
      yoyo: true,
      repeat: 1,
      onComplete: () => {
        flashBlocks.forEach(b => b.destroy());
        onComplete();
      },
    });
  }

  checkPortalCondition(clearedCount, rows) {
    const isTetris = clearedCount === 4;
    if ((this.linesCleared >= 8 && isTetris) || this.linesCleared >= 15) {
      this.portalTriggered = true;
      const minRow = Math.min(...rows);
      const maxRow = Math.max(...rows);
      const ripY = BOARD_Y + ((minRow + maxRow) / 2) * CELL + CELL / 2;
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
    super.onPortalForceSpawn();
  }

  drawBoardFrame() {
    const g = this.boardGfx;
    NeonGlow.strokeRect(g, BOARD_X - 2, BOARD_Y - 2, BOARD_W + 4, BOARD_H + 4, COLORS.NEON_CYAN, 1, 0.5);

    g.lineStyle(1, COLORS.GRID_LINE, 0.15);
    for (let c = 1; c < COLS; c++) {
      g.lineBetween(BOARD_X + c * CELL, BOARD_Y, BOARD_X + c * CELL, BOARD_Y + BOARD_H);
    }
    for (let r = 1; r < ROWS; r++) {
      g.lineBetween(BOARD_X, BOARD_Y + r * CELL, BOARD_X + BOARD_W, BOARD_Y + r * CELL);
    }
  }

  renderBoard() {
    this.blockImages.forEach(img => img.destroy());
    this.blockImages = [];

    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (this.board[r][c]) {
          const x = BOARD_X + c * CELL + CELL / 2;
          const y = BOARD_Y + r * CELL + CELL / 2;
          const img = this.add.image(x, y, 'tetris-block').setTint(this.boardColors[r][c]);
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
            const ghost = this.add.image(gx, gyPx, 'tetris-block').setTint(color).setAlpha(0.2);
            this.blockImages.push(ghost);
          }

          const py = this.currentPieceY + r;
          if (py >= 0) {
            const px = BOARD_X + (this.currentPieceX + c) * CELL + CELL / 2;
            const pyPx = BOARD_Y + py * CELL + CELL / 2;
            const img = this.add.image(px, pyPx, 'tetris-block').setTint(color);
            this.blockImages.push(img);
          }
        }
      }
    }
  }

  drawPreview() {
    this.previewImages.forEach(img => img.destroy());
    this.previewImages = [];

    const shape = PIECES[this.nextPiece][0];
    const color = PIECE_COLORS[this.nextPiece];

    const label = this.add.text(PREVIEW_X, PREVIEW_Y - 16, 'NEXT', {
      fontSize: '12px', color: '#00f0ff', fontFamily: 'monospace',
    });
    this.previewImages.push(label);

    const offsetX = PREVIEW_X + (4 - shape[0].length) * CELL / 4;
    const offsetY = PREVIEW_Y + 4;

    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (!shape[r][c]) continue;
        const x = offsetX + c * CELL + CELL / 2;
        const y = offsetY + r * CELL + CELL / 2;
        const img = this.add.image(x, y, 'tetris-block').setTint(color);
        this.previewImages.push(img);
      }
    }
  }

  updateDAS(time, delta) {
    const inv = this.controlInverted;
    const leftDown = inv
      ? (this.cursors.right.isDown || this.keyD.isDown)
      : (this.cursors.left.isDown || this.keyA.isDown);
    const rightDown = inv
      ? (this.cursors.left.isDown || this.keyA.isDown)
      : (this.cursors.right.isDown || this.keyD.isDown);

    let dir = 0;
    if (leftDown && !rightDown) dir = -1;
    else if (rightDown && !leftDown) dir = 1;

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
    if (this.gameOver) return;

    this.updateDAS(time, delta);

    const inv = this.controlInverted;
    this.softDropping = inv
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
      this.tryEnterPortal(px, py);
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
