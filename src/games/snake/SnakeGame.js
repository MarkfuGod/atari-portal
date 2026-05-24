import Phaser from 'phaser';
import { BaseGameScene } from '../BaseGameScene.js';
import { GAME_WIDTH, GAME_HEIGHT, COLORS } from '../../config.js';
import SFX from '../../core/SFXManager.js';
import AudioReactive from '../../core/AudioReactiveSystem.js';
import CyberSceneFX from '../../vfx/CyberSceneFX.js';
import PosterSceneFX from '../../vfx/PosterSceneFX.js';

const MOD_SNAKE_HEAD_KEY = 'snake-mod-head';
const MOD_SNAKE_BODY_KEY = 'snake-mod-body';
const MOD_SNAKE_FOOD_KEY = 'snake-mod-food';
const MOD_SNAKE_FOOD_VIRUS_KEY = 'snake-mod-food-virus';
const MOD_SNAKE_FOOD_PATCH_KEY = 'snake-mod-food-patch';
const MOD_SNAKE_RESIDUE_KEY = 'snake-mod-residue';

// --- 配置常量 ---
const CELL = 24;
const COLS = 31;
const ROWS = 22;
const OFFSET_X = Math.floor((GAME_WIDTH - COLS * CELL) / 2);
const OFFSET_Y = 32 + Math.floor((GAME_HEIGHT - 32 - ROWS * CELL) / 2);

const BASE_MOVE_INTERVAL = 150; 
const WIN_LENGTH = 10;           // 获胜条件：长度达到10
const RESIDUE_LIFESPAN = 5000;   // 残留物存在时间 (5秒)

const DIRS = {
  LEFT: { x: -1, y: 0 },
  RIGHT: { x: 1, y: 0 },
  UP: { x: 0, y: -1 },
  DOWN: { x: 0, y: 1 },
};

function cellToWorld(col, row) {
  return {
    x: OFFSET_X + col * CELL + CELL / 2,
    y: OFFSET_Y + row * CELL + CELL / 2,
  };
}

export class SnakeGame extends BaseGameScene {
  constructor() {
    super('SnakeGame', 'pacman');
  }

  create() {
    super.create();

    this.snake = [];
    this.direction = DIRS.RIGHT;
    this.nextDirection = DIRS.RIGHT;
    this.moveAccumulator = 0;
    this.food = null;
    this.residues = [];
    this.sonicWaves = [];
    this.speedMult = 1;
    this.virusTimer = 0;

    if (this.modernist) this._ensureModernistTextures();

    this.drawCyberArena();

    for (let i = 0; i < 4; i++) {
      this.snake.push({ col: 10 - i, row: 11 });
    }

    this.snakeGroup = this.add.group();
    this.snakeJointGfx = this.add.graphics().setDepth(7);
    this.waveGraphics = this.add.graphics().setDepth(5);
    if (this.modernist) {
      this.headGlow = null;
    } else {
      this.headGlow = this.add.circle(0, 0, 18, COLORS.NEON_GREEN, 0.16)
        .setDepth(4)
        .setBlendMode(Phaser.BlendModes.ADD);
    }

    this.setupInput();
    this.spawnFood();
  }

  // Generate flat modernist textures. Head/body are ink rounded squares with a
  // 1px ink border; food is a vermilion filled square; virus food is violet
  // with cross-hatch; patch food is green plus glyph; residue is a hollow ink
  // square (paper hole through the snake's leftover segments).
  _ensureModernistTextures() {
    const p = this.palette;

    if (!this.textures.exists(MOD_SNAKE_HEAD_KEY)) {
      const g = this.make.graphics({ x: 0, y: 0, add: false });
      g.fillStyle(p.ink, 1);
      g.fillRoundedRect(2, 2, 28, 28, 6);
      g.lineStyle(1, p.vermilion, 1);
      g.strokeRoundedRect(2, 2, 28, 28, 6);
      g.fillStyle(p.paper, 1);
      g.fillCircle(11, 13, 2);
      g.fillCircle(21, 13, 2);
      g.fillStyle(p.vermilion, 1);
      g.fillRect(11, 21, 10, 2);
      g.generateTexture(MOD_SNAKE_HEAD_KEY, 32, 32);
      g.destroy();
    }

    if (!this.textures.exists(MOD_SNAKE_BODY_KEY)) {
      const g = this.make.graphics({ x: 0, y: 0, add: false });
      g.fillStyle(p.ink, 1);
      g.fillRoundedRect(2, 2, 24, 24, 5);
      g.lineStyle(1, p.paper, 0.55);
      g.strokeRoundedRect(5, 5, 18, 18, 4);
      g.generateTexture(MOD_SNAKE_BODY_KEY, 28, 28);
      g.destroy();
    }

    if (!this.textures.exists(MOD_SNAKE_FOOD_KEY)) {
      const g = this.make.graphics({ x: 0, y: 0, add: false });
      g.fillStyle(p.vermilion, 1);
      g.fillRect(4, 4, 16, 16);
      g.lineStyle(1, p.ink, 1);
      g.strokeRect(4, 4, 16, 16);
      g.fillStyle(p.ink, 1);
      g.fillRect(5, 5, 3, 3);
      g.generateTexture(MOD_SNAKE_FOOD_KEY, 24, 24);
      g.destroy();
    }

    if (!this.textures.exists(MOD_SNAKE_FOOD_VIRUS_KEY)) {
      const g = this.make.graphics({ x: 0, y: 0, add: false });
      g.fillStyle(p.violet, 1);
      g.fillCircle(12, 12, 9);
      g.lineStyle(1, p.ink, 1);
      g.strokeCircle(12, 12, 9);
      // diagonal hazard hatch
      g.lineStyle(1, p.ink, 0.6);
      g.lineBetween(5, 12, 19, 12);
      g.lineBetween(12, 5, 12, 19);
      g.generateTexture(MOD_SNAKE_FOOD_VIRUS_KEY, 24, 24);
      g.destroy();
    }

    if (!this.textures.exists(MOD_SNAKE_FOOD_PATCH_KEY)) {
      const g = this.make.graphics({ x: 0, y: 0, add: false });
      g.fillStyle(p.green, 1);
      g.fillRect(4, 10, 16, 4);
      g.fillRect(10, 4, 4, 16);
      g.lineStyle(1, p.ink, 1);
      g.strokeRect(4, 10, 16, 4);
      g.strokeRect(10, 4, 4, 16);
      g.generateTexture(MOD_SNAKE_FOOD_PATCH_KEY, 24, 24);
      g.destroy();
    }

    if (!this.textures.exists(MOD_SNAKE_RESIDUE_KEY)) {
      const g = this.make.graphics({ x: 0, y: 0, add: false });
      g.lineStyle(1.5, p.ink, 0.85);
      g.strokeRect(2, 2, 16, 16);
      // hatched fill — leftover scrap of body
      g.lineStyle(1, p.ink, 0.35);
      for (let i = 0; i < 18; i += 4) {
        g.lineBetween(2 + i, 2, 2, 2 + i);
      }
      g.generateTexture(MOD_SNAKE_RESIDUE_KEY, 20, 20);
      g.destroy();
    }
  }

  drawCyberArena() {
    if (this.modernist) {
      this.drawModernistArena();
      return;
    }
    CyberSceneFX.drawCircuitBackdrop(this, {
      primary: COLORS.NEON_GREEN,
      secondary: COLORS.NEON_CYAN,
      accent: COLORS.NEON_MAGENTA,
      top: 32,
      bottom: GAME_HEIGHT - 34,
      density: 1.1,
    });
    CyberSceneFX.drawBinarySideData(this, { color: COLORS.NEON_GREEN, alpha: 0.1, columns: 2 });
    CyberSceneFX.drawHudFrame(this, {
      title: 'SNAKE: VIRAL TRACE',
      subtitle: 'SONIC WAVES // PATCH NODES',
      primary: COLORS.NEON_GREEN,
      accent: COLORS.NEON_MAGENTA,
    });
    CyberSceneFX.drawHoloPanel(this, GAME_WIDTH / 2, GAME_HEIGHT / 2, COLS * CELL + 24, ROWS * CELL + 24, {
      primary: COLORS.NEON_GREEN,
      accent: COLORS.NEON_CYAN,
      depth: -4,
      tilt: 0,
    });
  }

  // Print-native arena: paper backdrop, axis ticks, poster HUD, plus a
  // graph-paper frame around the playfield with vermilion corner ticks.
  drawModernistArena() {
    const p = this.palette;
    this.cameras.main.setBackgroundColor(p.paper);

    PosterSceneFX.drawPaperBackdrop(this, {
      top: 32,
      bottom: GAME_HEIGHT - 34,
      depth: -35,
      seam: false,
      grid: true,
      gridStep: CELL,
      grainDensity: 200,
      seed: 0xd0e2,
    });

    PosterSceneFX.drawAxisStripData(this, {
      top: 36,
      bottom: GAME_HEIGHT - 38,
      depth: -8,
      leftAlpha: 0.42,
      rightAlpha: 0.34,
    });

    PosterSceneFX.drawPosterHudFrame(this, {
      title: 'SNAKE // VIRAL TRACE',
      subtitle: 'NODE 72 · CX4024 · 1976',
      barTop: 28,
      barBottom: GAME_HEIGHT - 36,
    });

    const fx = OFFSET_X - 6;
    const fy = OFFSET_Y - 6;
    const fw = COLS * CELL + 12;
    const fh = ROWS * CELL + 12;
    const g = this.add.graphics().setDepth(-3);
    g.fillStyle(p.paper, 0.45);
    g.fillRect(fx, fy, fw, fh);
    g.lineStyle(1.5, p.ink, 1);
    g.strokeRect(fx, fy, fw, fh);
    g.lineStyle(1, p.ink, 0.32);
    g.strokeRect(fx - 4, fy - 4, fw + 8, fh + 8);
    const tickLen = 7;
    g.lineStyle(1.5, p.vermilion, 1);
    g.lineBetween(fx - 4, fy - 4, fx - 4 + tickLen, fy - 4);
    g.lineBetween(fx - 4, fy - 4, fx - 4, fy - 4 + tickLen);
    g.lineBetween(fx + fw + 4, fy - 4, fx + fw + 4 - tickLen, fy - 4);
    g.lineBetween(fx + fw + 4, fy - 4, fx + fw + 4, fy - 4 + tickLen);
    g.lineBetween(fx - 4, fy + fh + 4, fx - 4 + tickLen, fy + fh + 4);
    g.lineBetween(fx - 4, fy + fh + 4, fx - 4, fy + fh + 4 - tickLen);
    g.lineBetween(fx + fw + 4, fy + fh + 4, fx + fw + 4 - tickLen, fy + fh + 4);
    g.lineBetween(fx + fw + 4, fy + fh + 4, fx + fw + 4, fy + fh + 4 - tickLen);

    PosterSceneFX.drawCoordinateBlock(this, 24, 56, {
      label: 'SECTOR 9C',
      coord: '02.1 N  77.3 E',
      node: '72',
      depth: -2,
    });
  }

  update(time, delta) {
    super.update(time, delta);
    if (this.gameOver || this._ending) return;

    this.handleInput();
    this.updateSonicWaves(time);    // 方案B：光波逻辑
    this.checkResidueCollection();  // 拾取残留物
    
    // 病毒加速计时
    if (this.virusTimer > 0) {
      this.virusTimer -= delta;
      if (this.virusTimer <= 0) this.speedMult = 1;
    }

    // 移动计时器
    const interval = (BASE_MOVE_INTERVAL / this.gameSpeed) / this.speedMult;
    this.moveAccumulator += delta;
    if (this.moveAccumulator >= interval) {
      this.moveAccumulator -= interval;
      this.moveSnake();
    }

    // 胜利检测：长度足够且传送门没开
    if (this.snake.length >= WIN_LENGTH && !this.portalSpawned) {
      this.portalSpawned = true;
      this.triggerPortal(GAME_WIDTH / 2, GAME_HEIGHT / 2);
    }

    // 报告玩家位置
    const headPos = cellToWorld(this.snake[0].col, this.snake[0].row);
    this.setPlayerPosition(headPos.x, headPos.y);
    this.syncNeonActors(time, headPos);
    this.tryEnterPortal(headPos.x, headPos.y);

    this.render();
  }

  syncNeonActors(time, headPos) {
    if (this.modernist) return;
    if (!this.headGlow) return;
    this.headGlow.setPosition(headPos.x, headPos.y);
    this.headGlow.setScale(1 + Math.sin(time * 0.012) * 0.12);
  }

  handleInput() {
    const invX = this.horizontalControlInverted;
    const invY = this.verticalControlInverted;
    let newDir = null;

    if (Phaser.Input.Keyboard.JustDown(this.cursors.left) || Phaser.Input.Keyboard.JustDown(this.wasd.left)) {
      newDir = invX ? DIRS.RIGHT : DIRS.LEFT;
    } else if (Phaser.Input.Keyboard.JustDown(this.cursors.right) || Phaser.Input.Keyboard.JustDown(this.wasd.right)) {
      newDir = invX ? DIRS.LEFT : DIRS.RIGHT;
    } else if (Phaser.Input.Keyboard.JustDown(this.cursors.up) || Phaser.Input.Keyboard.JustDown(this.wasd.up)) {
      newDir = invY ? DIRS.DOWN : DIRS.UP;
    } else if (Phaser.Input.Keyboard.JustDown(this.cursors.down) || Phaser.Input.Keyboard.JustDown(this.wasd.down)) {
      newDir = invY ? DIRS.UP : DIRS.DOWN;
    }

    if (newDir && (newDir.x !== -this.direction.x || newDir.y !== -this.direction.y)) {
      this.nextDirection = newDir;
    }
  }

  moveSnake() {
    this.direction = this.nextDirection;
    const head = this.snake[0];
    
    // 穿墙逻辑
    let nextCol = (head.col + this.direction.x + COLS) % COLS;
    let nextRow = (head.row + this.direction.y + ROWS) % ROWS;
    const newHead = { col: nextCol, row: nextRow };

    // 1. 自撞检测 (断尾)
    for (let i = 1; i < this.snake.length; i++) {
      if (this.snake[i].col === newHead.col && this.snake[i].row === newHead.row) {
        this.sliceSnake(i);
        return;
      }
    }

    // 2. 吃食物检测
    if (this.food && newHead.col === this.food.col && newHead.row === this.food.row) {
      this.handleEatFood(this.food.type);
      this.snake.unshift(newHead);
      this.spawnFood();
    } else {
      this.snake.unshift(newHead);
      this.snake.pop();
    }
  }

  handleEatFood(type) {
    this.score.award('dot');
    SFX.eatDot && SFX.eatDot();
    this.showFoodExplosion(this.food.col, this.food.row, type);

    if (type === 'virus') {
      this.speedMult = 1.8;
      this.virusTimer = 5000; // 加速5秒
      this._showScorePopup("SPEED UP!!", cellToWorld(this.food.col, this.food.row).x, cellToWorld(this.food.col, this.food.row).y);
    } else if (type === 'patch') {
      // 变短逻辑
      const toRemove = Math.min(this.snake.length - 3, 3);
      for(let i=0; i<toRemove; i++) this.snake.pop();
      this._showScorePopup("SHORTENED", cellToWorld(this.food.col, this.food.row).x, cellToWorld(this.food.col, this.food.row).y);
    }
  }

  // 👉 新增：用于死亡后重新生成蛇的函数
  resetSnake() {
    this.snake = [];
    this.direction = DIRS.RIGHT;
    this.nextDirection = DIRS.RIGHT;
    // 恢复初始长度 4
    for (let i = 0; i < 4; i++) {
      this.snake.push({ col: 10 - i, row: 11 });
    }
    this.speedMult = 1;
    this.virusTimer = 0;
  }

  // 👉 修复：彻底修复爆头崩溃的逻辑
  sliceSnake(atIndex) {
    // 核心修复：如果切断的是头部 (索引0)，则直接判定致命伤死亡！
    if (atIndex === 0) {
      this.onPlayerDeath(); 
      if (!this.gameOver) {
        this.resetSnake(); // 如果还有命，原地复活
      }
      return; // 结束函数，防止后续报错
    }

    const sliced = this.snake.splice(atIndex);
    const residueKey = this.modernist ? MOD_SNAKE_RESIDUE_KEY : 'snake-residue';
    sliced.forEach(seg => {
      const pos = cellToWorld(seg.col, seg.row);
      const sprite = this.add.image(pos.x, pos.y, residueKey);
      if (!this.modernist) sprite.setBlendMode(Phaser.BlendModes.ADD);

      const resObj = { sprite, col: seg.col, row: seg.row, expire: this.time.now + RESIDUE_LIFESPAN };
      this.residues.push(resObj);

      this.time.delayedCall(RESIDUE_LIFESPAN, () => {
        sprite.destroy();
        this.residues = this.residues.filter(r => r !== resObj);
      });
    });

    this.shakeCamera(0.008, 200);
    if (this.modernist) {
      // Print-context "tear" flash — faint paper wash, no saturated red.
      this.cameras.main.flash(120, 242, 239, 230, 0.15);
    } else {
      this.cameras.main.flash(150, 255, 0, 0, 0.2);
    }
  }

  updateSonicWaves(time) {
    this.waveGraphics.clear();

    // 1. 逻辑：判定是否生成新光波
    const musicTrigger = AudioReactive.isBeat && Math.random() > 0.8;
    const randomTrigger = Math.random() > 0.995; 

    if (musicTrigger || randomTrigger) {
      if (this.sonicWaves.length < 3) {
        this.sonicWaves.push({ 
          row: Phaser.Math.Between(0, ROWS-1), 
          warnUntil: time + 600, 
          alpha: 1 
        });
      }
    }

    const p = this.palette;
    const warnColor = this.modernist ? p.vermilion : 0xff0000;
    const waveColor = this.modernist ? p.vermilion : 0xff00e6;

    this.sonicWaves = this.sonicWaves.filter(wave => {
      const y = cellToWorld(0, wave.row).y;
      if (time < wave.warnUntil) {
        if (this.modernist) {
          // Print warning rule: solid vermilion 1px hairline, no dashed neon.
          this.waveGraphics.lineStyle(1.5, warnColor, 0.9);
          this.waveGraphics.lineBetween(0, y, GAME_WIDTH, y);
        } else {
          this.waveGraphics.lineStyle(2, warnColor, 0.6);
          this.waveGraphics.strokeLineShape(new Phaser.Geom.Line(0, y, GAME_WIDTH, y));
        }
        return true;
      } else {
        if (this.modernist) {
          // Print burst: solid vermilion stripe + ink dashed underline so the
          // wave reads as a printed alert ribbon, not a neon laser.
          this.waveGraphics.fillStyle(waveColor, Math.min(0.85, wave.alpha));
          this.waveGraphics.fillRect(0, y - CELL / 2, GAME_WIDTH, CELL);
          this.waveGraphics.lineStyle(1, p.ink, Math.min(1, wave.alpha));
          this.waveGraphics.lineBetween(0, y - CELL / 2, GAME_WIDTH, y - CELL / 2);
          this.waveGraphics.lineBetween(0, y + CELL / 2, GAME_WIDTH, y + CELL / 2);
        } else {
          this.waveGraphics.lineStyle(CELL, waveColor, wave.alpha);
          this.waveGraphics.strokeLineShape(new Phaser.Geom.Line(0, y, GAME_WIDTH, y));
        }

        const hitIdx = this.snake.findIndex(seg => seg.row === wave.row);
        if (hitIdx !== -1) {
          this.sliceSnake(hitIdx);
        }

        wave.alpha -= 0.05;
        return wave.alpha > 0;
      }
    });
  }

  checkResidueCollection() {
    const head = this.snake[0];
    this.residues.forEach((res, i) => {
      if (res.col === head.col && res.row === head.row) {
        const tail = this.snake[this.snake.length-1];
        this.snake.push({ col: tail.col, row: tail.row });
        res.sprite.destroy();
        this.residues.splice(i, 1);
        SFX.powerPellet && SFX.powerPellet();
      }
    });
  }

  spawnFood() {
    let col, row, conflict;
    do {
      col = Phaser.Math.Between(0, COLS - 1);
      row = Phaser.Math.Between(0, ROWS - 1);
      conflict = this.snake.some(s => s.col === col && s.row === row);
    } while (conflict);

    const r = Math.random();
    let type = 'standard';
    let key;
    if (r < 0.15) {
      type = 'virus';
      key = this.modernist ? MOD_SNAKE_FOOD_VIRUS_KEY : 'food-virus';
    } else if (r < 0.25) {
      type = 'patch';
      key = this.modernist ? MOD_SNAKE_FOOD_PATCH_KEY : 'food-patch';
    } else {
      key = this.modernist ? MOD_SNAKE_FOOD_KEY : 'snake-food';
    }

    this.food = { col, row, type, key };
    if (this.foodSprite) this.foodSprite.destroy();
    const pos = cellToWorld(col, row);
    this.foodSprite = this.add.image(pos.x, pos.y, key);
    if (!this.modernist) this.foodSprite.setBlendMode(Phaser.BlendModes.ADD);
    this.foodSprite.setDepth(7);
    this.tweens.add({ targets: this.foodSprite, scale: 1.2, duration: 300, yoyo: true, repeat: -1 });
  }

  setupInput() {
    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = {
      up: this.input.keyboard.addKey('W'),
      down: this.input.keyboard.addKey('S'),
      left: this.input.keyboard.addKey('A'),
      right: this.input.keyboard.addKey('D'),
    };
  }

  render() {
    this.snakeGroup.clear(true, true);
    if (this.snakeJointGfx) this.snakeJointGfx.clear();

    const modernist = this.modernist;
    const headKey = modernist ? MOD_SNAKE_HEAD_KEY : 'snake-head';
    const bodyKey = modernist ? MOD_SNAKE_BODY_KEY : 'snake-body';

    this.snake.forEach((seg, i) => {
      const pos = cellToWorld(seg.col, seg.row);
      const key = i === 0 ? headKey : bodyKey;
      const sprite = this.add.image(pos.x, pos.y, key);
      if (!modernist) sprite.setBlendMode(Phaser.BlendModes.ADD);
      sprite.setDepth(i === 0 ? 8 : 6);

      if (modernist) {
        // Print snake: flat ink segments at full opacity; head rotates to
        // face direction so the eye glyphs read correctly.
        if (i === 0) {
          if (this.direction === DIRS.RIGHT) sprite.setRotation(0);
          else if (this.direction === DIRS.DOWN) sprite.setRotation(Math.PI / 2);
          else if (this.direction === DIRS.LEFT) sprite.setRotation(Math.PI);
          else if (this.direction === DIRS.UP) sprite.setRotation(-Math.PI / 2);
        } else {
          const taper = 1 - Math.min(0.35, (i / Math.max(1, this.snake.length)) * 0.35);
          sprite.setScale(taper);
        }
      } else if (i > 0) {
        const scale = 1 - (i / this.snake.length) * 0.4;
        sprite.setScale(scale).setAlpha(scale);
      }
      this.snakeGroup.add(sprite);
    });

    // Modernist: draw 1px ink connectors between adjacent segments so the
    // snake reads as a serif line of beads rather than disconnected boxes.
    if (modernist && this.snakeJointGfx && this.snake.length > 1) {
      const p = this.palette;
      this.snakeJointGfx.lineStyle(2, p.ink, 0.85);
      for (let i = 1; i < this.snake.length; i++) {
        const a = cellToWorld(this.snake[i - 1].col, this.snake[i - 1].row);
        const b = cellToWorld(this.snake[i].col, this.snake[i].row);
        // Suppress connector if cells aren't actually adjacent (wrap-around)
        if (Math.abs(this.snake[i - 1].col - this.snake[i].col) > 1) continue;
        if (Math.abs(this.snake[i - 1].row - this.snake[i].row) > 1) continue;
        this.snakeJointGfx.lineBetween(a.x, a.y, b.x, b.y);
      }
    }
  }

  showFoodExplosion(col, row, type) {
    const pos = cellToWorld(col, row);
    const p = this.palette;
    let color;
    if (this.modernist) {
      color = type === 'virus' ? p.violet : (type === 'patch' ? p.green : p.vermilion);
    } else {
      color = type === 'virus' ? 0xff1744 : (type === 'patch' ? 0x39ff14 : 0xff00e6);
    }
    const emitter = this.add.particles(pos.x, pos.y, 'pixel', {
      speed: { min: 50, max: 150 },
      scale: { start: 2, end: 0 },
      alpha: { start: 1, end: 0 },
      tint: color,
      lifespan: 600,
      blendMode: this.modernist ? 'NORMAL' : 'ADD',
    });
    emitter.explode(this.modernist ? 12 : 20);
    this.time.delayedCall(700, () => emitter.destroy());
  }
}
