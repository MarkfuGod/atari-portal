import Phaser from 'phaser';
import { BaseGameScene } from '../BaseGameScene.js';
import { GAME_WIDTH, GAME_HEIGHT, COLORS } from '../../config.js';
import { GameManager } from '../../core/GameManager.js';
import SFX from '../../core/SFXManager.js';
import TrailSystem from '../../vfx/TrailSystem.js';
import DebrisSystem from '../../vfx/DebrisSystem.js';
import GlitchEffect from '../../vfx/GlitchEffect.js';

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
    const gfx = this.add.graphics();
    gfx.fillStyle(COLORS.NEON_BLUE, 0.2);

    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (MAZE[r][c] === 1) {
          gfx.fillRect(OFFSET_X + c * CELL, OFFSET_Y + r * CELL, CELL, CELL);
        }
      }
    }

    // Brighter wall outlines
    gfx.lineStyle(1.5, COLORS.NEON_BLUE, 0.7);
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (MAZE[r][c] === 1) {
          const x = OFFSET_X + c * CELL;
          const y = OFFSET_Y + r * CELL;
          if (r > 0 && MAZE[r - 1][c] !== 1) gfx.strokeLineShape(new Phaser.Geom.Line(x, y, x + CELL, y));
          if (r < ROWS - 1 && MAZE[r + 1][c] !== 1) gfx.strokeLineShape(new Phaser.Geom.Line(x, y + CELL, x + CELL, y + CELL));
          if (c > 0 && MAZE[r][c - 1] !== 1) gfx.strokeLineShape(new Phaser.Geom.Line(x, y, x, y + CELL));
          if (c < COLS - 1 && MAZE[r][c + 1] !== 1) gfx.strokeLineShape(new Phaser.Geom.Line(x + CELL, y, x + CELL, y + CELL));
        }
      }
    }

    // Node light points at intersections
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
            gfx.fillStyle(COLORS.NEON_BLUE, 0.08);
            gfx.fillCircle(nx, ny, 3);
          }
        }
      }
    }
  }

  createDots() {
    this.dots = this.add.group();
    this.powerPellets = this.add.group();

    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const val = this.grid[r][c];
        const pos = cellToWorld(c, r);

        if (val === 0) {
          const dot = this.add.image(pos.x, pos.y, 'dot').setDisplaySize(6, 6);
          dot.gridCol = c;
          dot.gridRow = r;
          this.dots.add(dot);
          this.totalDots++;
        } else if (val === 2) {
          const pp = this.add.image(pos.x, pos.y, 'power-pellet').setDisplaySize(14, 14);
          pp.gridCol = c;
          pp.gridRow = r;
          this.powerPellets.add(pp);
          this.tweens.add({
            targets: pp,
            scaleX: { from: 0.9, to: 1.2 },
            scaleY: { from: 0.9, to: 1.2 },
            alpha: { from: 0.7, to: 1 },
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
    this.pacman = this.add.image(startPos.x, startPos.y, 'pacman').setDisplaySize(CELL - 4, CELL - 4);
    this.pacman.gridCol = 10;
    this.pacman.gridRow = 11;
    this.pacman.direction = DIRECTIONS.LEFT;
    this.pacman.nextDirection = null;
    this.pacman.moving = false;
    this.pacman.wantsToMove = false;
    this.pacman.targetX = startPos.x;
    this.pacman.targetY = startPos.y;

    this._pacTrailId = TrailSystem.createTrail(this, this.pacman, {
      color: COLORS.NEON_YELLOW,
      length: 4,
      interval: 60,
      size: 5,
    });
  }

  createGhosts() {
    const ghostConfigs = [
      { key: 'ghost-red', col: 9, row: 5, personality: 'chaser' },
      { key: 'ghost-pink', col: 10, row: 5, personality: 'ambusher' },
      { key: 'ghost-cyan', col: 9, row: 6, personality: 'flanker' },
      { key: 'ghost-orange', col: 10, row: 6, personality: 'random' },
    ];

    this.ghosts = [];
    for (const cfg of ghostConfigs) {
      const pos = cellToWorld(cfg.col, cfg.row);
      const ghost = this.add.image(pos.x, pos.y, cfg.key).setDisplaySize(CELL - 4, CELL - 4);
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
      this.ghosts.push(ghost);

      const ghostColors = {
        'ghost-red': COLORS.NEON_RED,
        'ghost-pink': COLORS.NEON_PINK,
        'ghost-cyan': COLORS.NEON_CYAN,
        'ghost-orange': COLORS.NEON_ORANGE,
      };
      ghost._trailId = TrailSystem.createTrail(this, ghost, {
        color: ghostColors[cfg.key] || COLORS.NEON_RED,
        length: 3,
        interval: 80,
        size: 4,
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
    this.checkDotCollisions();
    this.checkGhostCollisions();

    this.setPlayerPosition(this.pacman.x, this.pacman.y);
    this.powerUps.checkCollection(this.pacman.x, this.pacman.y);
    this.glitch.checkDataLeakCollection(this.pacman.x, this.pacman.y);
    this.tryEnterPortal(this.pacman.x, this.pacman.y);
  }

  handleInput() {
    const inv = this.controlInverted;
    let newDir = null;

    if (this.cursors.left.isDown || this.wasd.left.isDown) {
      newDir = inv ? DIRECTIONS.RIGHT : DIRECTIONS.LEFT;
    } else if (this.cursors.right.isDown || this.wasd.right.isDown) {
      newDir = inv ? DIRECTIONS.LEFT : DIRECTIONS.RIGHT;
    } else if (this.cursors.up.isDown || this.wasd.up.isDown) {
      newDir = inv ? DIRECTIONS.DOWN : DIRECTIONS.UP;
    } else if (this.cursors.down.isDown || this.wasd.down.isDown) {
      newDir = inv ? DIRECTIONS.UP : DIRECTIONS.DOWN;
    }

    if (newDir) {
      this.pacman.nextDirection = newDir;
      this.pacman.wantsToMove = true;
    } else {
      this.pacman.wantsToMove = false;
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

      if ((pac.wantsToMove || dirChanged) && this.canMove(pac.gridCol, pac.gridRow, pac.direction)) {
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
        ghost.setTint(0x0066ff);
        ghost.setAlpha(0.4);
        // Flicker tween for glitch state
        const flicker = this.tweens.add({
          targets: ghost,
          alpha: { from: 0.2, to: 0.6 },
          duration: 200,
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
    DebrisSystem.deathBurst(this, ghost.x, ghost.y, 'medium', {
      colors: [COLORS.NEON_BLUE, COLORS.NEON_CYAN, COLORS.WHITE],
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
      this.portalSpawned = true;
      this.spawnPortalPellet();
    }
  }

  isGhostHouseOrTunnel(r, c) {
    if (r >= 4 && r <= 7 && c >= 8 && c <= 11) return true;
    if (r === 7 && (c <= 2 || c >= 17)) return true;
    return false;
  }

  spawnPortalPellet() {
    const candidates = [];
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (this.isGhostHouseOrTunnel(r, c)) continue;
        if (this.grid[r][c] === 0 || this.grid[r][c] === 3) {
          const dx = Math.abs(c - this.pacman.gridCol);
          const dy = Math.abs(r - this.pacman.gridRow);
          if (dx + dy > 5) candidates.push({ col: c, row: r });
        }
      }
    }

    if (candidates.length === 0) return;
    const spot = candidates[Math.floor(Math.random() * candidates.length)];
    const pos = cellToWorld(spot.col, spot.row);
    this.grid[spot.row][spot.col] = 4;

    this.portalPellet = this.add.image(pos.x, pos.y, 'portal-pellet').setDisplaySize(18, 18);
    this.portalPellet.gridCol = spot.col;
    this.portalPellet.gridRow = spot.row;

    this.tweens.add({
      targets: this.portalPellet,
      alpha: { from: 0.5, to: 1 },
      scale: { from: 0.8, to: 1.1 },
      duration: 600, yoyo: true, repeat: -1,
    });
  }

  showPortalHint() {
    this._showHintText('▸ WALK INTO THE PORTAL ▸');
  }

  onPortalForceSpawn() {
    if (!this.portalSpawned) {
      this.portalSpawned = true;
      this.spawnPortalPellet();
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
