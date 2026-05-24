import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS } from '../../config.js';
import { GameManager } from '../../core/GameManager.js';
import { BaseGameScene } from '../BaseGameScene.js';
import SFX from '../../core/SFXManager.js';
import GlitchEffect from '../../vfx/GlitchEffect.js';
import ArcadeFX from '../../vfx/ArcadeFX.js';
import TrailSystem from '../../vfx/TrailSystem.js';
import DebrisSystem from '../../vfx/DebrisSystem.js';
import CyberSceneFX from '../../vfx/CyberSceneFX.js';
import PosterSceneFX from '../../vfx/PosterSceneFX.js';

const ROWS = 6;
const COLS = 14;
const BRICK_W = 52;
const BRICK_H = 18;
const BRICK_PAD = 4;
const BRICK_OFFSET_X = (GAME_WIDTH - COLS * (BRICK_W + BRICK_PAD) + BRICK_PAD) / 2;
const BRICK_TOP = 60;

const ROW_TEXTURES = [
  'brick-red',
  'brick-orange',
  'brick-yellow',
  'brick-green',
  'brick-cyan',
  'brick-blue',
];

// Modernist row textures rotate through the printed-poster swatch palette
// (vermilion / mustard / cyan / violet) — same band as the menu's swatch row,
// applied to the brick wall.
const MOD_ROW_KEYS = [
  'breakout-mod-row-0',
  'breakout-mod-row-1',
  'breakout-mod-row-2',
  'breakout-mod-row-3',
  'breakout-mod-row-4',
  'breakout-mod-row-5',
];
const MOD_PADDLE_KEY = 'breakout-mod-paddle';
const MOD_BALL_KEY = 'breakout-mod-ball';
const MOD_BRICK_PORTAL_KEY = 'breakout-mod-brick-portal';

const PADDLE_Y = GAME_HEIGHT - 40;
const PADDLE_BASE_W = 80;
const PADDLE_H = 12;
const PADDLE_SPEED = 500;
const PADDLE_SLOW_FACTOR = 0.45;
const BALL_SPEED_BASE = 350;
const BALL_SPEED_INCREMENT = 12;

export class BreakoutScene extends BaseGameScene {
  constructor() {
    super('BreakoutScene', 'breakout');
  }

  create() {
    super.create();

    this.bricksDestroyed = 0;
    this.totalBricks = 0;
    this.portalBrickSpawned = false;
    this.portalTriggered = false;
    this.ballOnPaddle = true;
    this._prevPaddleW = PADDLE_BASE_W;
    this._paddleHitCooldown = 0;
    this._paddleCollider = null;
    this._brickCollider = null;

    this.aimAngle = 0;
    this.aimDir = 1;
    this.aimGraphics = this.add.graphics().setDepth(10);
    this._fieldBorder = this.add.graphics().setDepth(2);

    this.cursors = this.input.keyboard.createCursorKeys();
    this.keyA = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
    this.keyD = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);
    this.keyShift = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT);

    if (this.modernist) this._ensureModernistTextures();

    this.drawCyberArena();
    this.drawBrickFieldBorder();
    this.createPaddle();
    this.createBall();
    this.createBricks();
    this.setupCollisions();

    this.input.on('pointermove', (pointer) => {
      const invX = this.horizontalControlInverted;
      const px = invX ? GAME_WIDTH - pointer.x : pointer.x;
      const half = this.paddle.displayWidth / 2;
      this.paddle.x = Phaser.Math.Clamp(px, half, GAME_WIDTH - half);
      if (this.ballOnPaddle) {
        this.ball.x = this.paddle.x;
        this.ball.y = this.paddle.y - PADDLE_H / 2 - this.ball.displayHeight / 2;
      }
    });

    this.input.on('pointerdown', () => {
      if (this.ballOnPaddle) this.launchBall();
    });

    this.input.keyboard.on('keydown-SPACE', () => {
      if (this.ballOnPaddle) this.launchBall();
    });
  }

  drawCyberArena() {
    if (this.modernist) {
      this.drawModernistArena();
      return;
    }
    CyberSceneFX.drawCircuitBackdrop(this, {
      primary: COLORS.NEON_CYAN,
      secondary: COLORS.NEON_MAGENTA,
      accent: COLORS.NEON_YELLOW,
      top: 32,
      bottom: GAME_HEIGHT - 34,
      density: 0.9,
    });
    CyberSceneFX.drawBinarySideData(this, { color: COLORS.NEON_CYAN, alpha: 0.1, columns: 2 });
    CyberSceneFX.drawHudFrame(this, {
      title: 'BREAKOUT: DATA WALL BREAKER',
      subtitle: 'ENCRYPTION WALL // RIFT BRICK',
      primary: COLORS.NEON_CYAN,
      accent: COLORS.NEON_MAGENTA,
    });
    CyberSceneFX.drawHoloPanel(this, 92, 420, 124, 96, {
      primary: COLORS.NEON_PURPLE,
      accent: COLORS.NEON_CYAN,
      depth: -5,
      tilt: -0.14,
    });
    CyberSceneFX.drawHoloPanel(this, GAME_WIDTH - 92, 420, 124, 96, {
      primary: COLORS.NEON_PURPLE,
      accent: COLORS.NEON_CYAN,
      depth: -5,
      tilt: 0.14,
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
      seed: 0xb614,
    });

    PosterSceneFX.drawAxisStripData(this, {
      top: 36,
      bottom: GAME_HEIGHT - 38,
      depth: -8,
      leftAlpha: 0.42,
      rightAlpha: 0.36,
    });

    PosterSceneFX.drawPosterHudFrame(this, {
      title: 'BREAKOUT // WALL DECONSTRUCTION',
      subtitle: 'NODE 72 · CX4024 · 1976',
      barTop: 28,
      barBottom: GAME_HEIGHT - 36,
    });

    PosterSceneFX.drawPaperPanel(this, 92, 460, 132, 100, {
      accent: p.cyan,
      depth: -4,
      label: '> SECTOR',
    });

    PosterSceneFX.drawPaperPanel(this, GAME_WIDTH - 92, 460, 132, 100, {
      accent: p.violet,
      depth: -4,
      label: '> RIFT LOG',
    });

    PosterSceneFX.drawCoordinateBlock(this, 24, 56, {
      label: 'SECTOR 3B',
      coord: '04.7 N  18.2 E',
      node: '72',
      depth: -2,
    });
  }

  // Generate flat modernist textures once. Bricks rotate the swatch palette
  // (vermilion / mustard / cyan / violet) by row. Paddle is solid ink.
  // Ball is solid vermilion. All have a 1px ink border for crisp print feel.
  _ensureModernistTextures() {
    const p = this.palette;
    const swatches = [p.vermilion, p.mustard, p.cyan, p.violet, p.vermilion, p.mustard];

    MOD_ROW_KEYS.forEach((key, i) => {
      if (this.textures.exists(key)) return;
      const g = this.make.graphics({ x: 0, y: 0, add: false });
      g.fillStyle(swatches[i % swatches.length], 1);
      g.fillRect(0, 0, BRICK_W, BRICK_H);
      g.lineStyle(1, p.ink, 1);
      g.strokeRect(0.5, 0.5, BRICK_W - 1, BRICK_H - 1);
      g.fillStyle(p.ink, 0.16);
      g.fillRect(BRICK_W - 6, 0, 6, 4);
      g.generateTexture(key, BRICK_W, BRICK_H);
      g.destroy();
    });

    if (!this.textures.exists(MOD_BRICK_PORTAL_KEY)) {
      const g = this.make.graphics({ x: 0, y: 0, add: false });
      g.fillStyle(p.paper, 1);
      g.fillRect(0, 0, BRICK_W, BRICK_H);
      g.lineStyle(2, p.vermilion, 1);
      g.strokeRect(1, 1, BRICK_W - 2, BRICK_H - 2);
      g.lineStyle(1, p.ink, 0.85);
      g.strokeRect(4, 4, BRICK_W - 8, BRICK_H - 8);
      g.fillStyle(p.vermilion, 1);
      g.fillCircle(BRICK_W / 2, BRICK_H / 2, 2.5);
      g.generateTexture(MOD_BRICK_PORTAL_KEY, BRICK_W, BRICK_H);
      g.destroy();
    }

    if (!this.textures.exists(MOD_PADDLE_KEY)) {
      const g = this.make.graphics({ x: 0, y: 0, add: false });
      g.fillStyle(p.ink, 1);
      g.fillRect(0, 0, PADDLE_BASE_W, PADDLE_H);
      g.fillStyle(p.vermilion, 1);
      g.fillRect(PADDLE_BASE_W / 2 - 8, 0, 16, 3);
      g.generateTexture(MOD_PADDLE_KEY, PADDLE_BASE_W, PADDLE_H);
      g.destroy();
    }

    if (!this.textures.exists(MOD_BALL_KEY)) {
      const g = this.make.graphics({ x: 0, y: 0, add: false });
      g.fillStyle(p.vermilion, 1);
      g.fillRect(0, 0, 8, 8);
      g.lineStyle(1, p.ink, 1);
      g.strokeRect(0.5, 0.5, 7, 7);
      g.generateTexture(MOD_BALL_KEY, 8, 8);
      g.destroy();
    }
  }

  modBrickRowKey(row) {
    return MOD_ROW_KEYS[row % MOD_ROW_KEYS.length];
  }

  /** Neon frame around the brick grid (Breakout analogue to maze walls). */
  drawBrickFieldBorder() {
    const pad = BRICK_PAD;
    const x = BRICK_OFFSET_X - pad;
    const y = BRICK_TOP - pad;
    const w = COLS * (BRICK_W + BRICK_PAD) + pad;
    const h = ROWS * (BRICK_H + BRICK_PAD) + pad;
    const g = this._fieldBorder || this.add.graphics().setDepth(2);
    g.clear();

    if (this.modernist) {
      const p = this.palette;
      const portal = this.portalBrickSpawned;
      g.lineStyle(portal ? 2 : 1.5, portal ? p.vermilion : p.ink, 1);
      g.strokeRect(x, y, w, h);
      g.lineStyle(1, p.ink, 0.45);
      g.strokeRect(x - 4, y - 4, w + 8, h + 8);
      const tickLen = 6;
      g.lineStyle(1, p.vermilion, 0.85);
      g.lineBetween(x - 4, y - 4, x - 4 + tickLen, y - 4);
      g.lineBetween(x - 4, y - 4, x - 4, y - 4 + tickLen);
      g.lineBetween(x + w + 4, y - 4, x + w + 4 - tickLen, y - 4);
      g.lineBetween(x + w + 4, y - 4, x + w + 4, y - 4 + tickLen);
      g.lineBetween(x - 4, y + h + 4, x - 4 + tickLen, y + h + 4);
      g.lineBetween(x - 4, y + h + 4, x - 4, y + h + 4 - tickLen);
      g.lineBetween(x + w + 4, y + h + 4, x + w + 4 - tickLen, y + h + 4);
      g.lineBetween(x + w + 4, y + h + 4, x + w + 4, y + h + 4 - tickLen);
      return;
    }

    g.lineStyle(2, COLORS.NEON_BLUE, 0.55);
    g.strokeRect(x, y, w, h);
    g.lineStyle(6, this.portalBrickSpawned ? COLORS.NEON_MAGENTA : COLORS.NEON_CYAN, this.portalBrickSpawned ? 0.08 : 0.04);
    g.strokeRect(x - 2, y - 2, w + 4, h + 4);
  }

  createPaddle() {
    const tex = this.modernist ? MOD_PADDLE_KEY : 'paddle';
    this.paddle = this.physics.add.image(GAME_WIDTH / 2, PADDLE_Y, tex);
    this.paddle.setImmovable(true);
    this.paddle.body.allowGravity = false;
    this.paddle.setCollideWorldBounds(true);
    this.paddle.setDisplaySize(PADDLE_BASE_W, PADDLE_H);
    this.paddle.setDepth(12);
    if (!this.modernist) this.paddle.setBlendMode(Phaser.BlendModes.ADD);
    this.paddle.refreshBody();

    if (this.modernist) {
      this.paddleGlow = null;
      this._paddleCodeGfx = null;
      this._codeScrollOffset = 0;
      return;
    }

    this.paddleGlow = this.add.rectangle(this.paddle.x, this.paddle.y, PADDLE_BASE_W + 18, PADDLE_H + 12, COLORS.NEON_CYAN, 0.14)
      .setDepth(10)
      .setBlendMode(Phaser.BlendModes.ADD);
    this._paddleCodeGfx = this.add.graphics().setDepth(11);
    this._codeScrollOffset = 0;
  }

  _drawPaddleCodeFlow() {
    if (this.modernist) return;
    const g = this._paddleCodeGfx;
    if (!g || !this.paddle) return;
    g.clear();
    this._codeScrollOffset = (this._codeScrollOffset + 0.5) % 20;
    const px = this.paddle.x - this.paddle.displayWidth / 2;
    const py = this.paddle.y - 2;
    g.fillStyle(COLORS.NEON_CYAN, 0.08);
    g.fillRect(px + 2, py, this.paddle.displayWidth - 4, 6);
    const codeStr = '01101001 10110100';
    for (let i = 0; i < 3; i++) {
      const ox = px + 5 + (i * 28 + this._codeScrollOffset) % (this.paddle.displayWidth - 10);
      g.fillStyle(COLORS.NEON_CYAN, 0.2);
      g.fillRect(ox, py + 1, 2, 1);
      g.fillRect(ox + 3, py + 3, 2, 1);
    }
  }

  createBall() {
    const ballOnPaddleY = PADDLE_Y - PADDLE_H / 2 - 8;
    const tex = this.modernist ? MOD_BALL_KEY : 'ball';
    this.ball = this.physics.add.image(GAME_WIDTH / 2, ballOnPaddleY, tex);
    const ballSize = this.modernist ? 12 : 16;
    this.ball.setDisplaySize(ballSize, ballSize);
    this.ball.setDepth(14);
    if (!this.modernist) this.ball.setBlendMode(Phaser.BlendModes.ADD);
    this.ball.setCollideWorldBounds(true);
    this.ball.setBounce(1);
    this.ball.body.allowGravity = false;
    this.ball.body.setCircle(this.modernist ? 4 : 8);
    this.ball.body.setMaxSpeed(600);

    this.physics.world.on('worldbounds', (body, up, down) => {
      if (body.gameObject === this.ball && down) {
        this.handleBallLost();
      }
    });

    this.ball.body.onWorldBounds = true;

    if (this.modernist) {
      this.ballGlow = null;
      this._ballTrailId = null;
      return;
    }

    this.ballGlow = this.add.circle(this.ball.x, this.ball.y, 15, COLORS.NEON_CYAN, 0.18)
      .setDepth(13)
      .setBlendMode(Phaser.BlendModes.ADD);

    this._ballTrailId = TrailSystem.createTrail(this, this.ball, {
      color: COLORS.NEON_CYAN,
      length: 10,
      interval: 24,
      size: 6,
    });
  }

  createBricks(animated = false) {
    this.bricks = this.physics.add.staticGroup();

    for (let row = 0; row < ROWS; row++) {
      const texture = this.modernist
        ? this.modBrickRowKey(row)
        : ROW_TEXTURES[row % ROW_TEXTURES.length];
      for (let col = 0; col < COLS; col++) {
        const x = BRICK_OFFSET_X + col * (BRICK_W + BRICK_PAD) + BRICK_W / 2;
        const y = BRICK_TOP + row * (BRICK_H + BRICK_PAD) + BRICK_H / 2;
        const brick = this.bricks.create(x, y, texture);
        brick.setDisplaySize(BRICK_W, BRICK_H);
        brick.refreshBody();
        brick.isPortal = false;
        brick.setDepth(6);
        if (!this.modernist) brick.setBlendMode(Phaser.BlendModes.ADD);
        if (animated) {
          brick.setAlpha(0);
          brick.setScale(0.7);
          this.tweens.add({
            targets: brick,
            alpha: 1,
            scaleX: 1,
            scaleY: 1,
            duration: 220,
            delay: row * 55 + col * 8,
            ease: 'Back.easeOut',
          });
        }
        this.totalBricks++;
      }
    }
  }

  setupCollisions() {
    if (this._paddleCollider) this._paddleCollider.destroy();
    if (this._brickCollider) this._brickCollider.destroy();
    this._paddleCollider = this.physics.add.collider(this.ball, this.paddle, this.hitPaddle, null, this);
    this._brickCollider = this.physics.add.collider(this.ball, this.bricks, this.hitBrick, null, this);
  }

  launchBall() {
    this.ballOnPaddle = false;
    const speed = this.currentBallSpeed();
    this.physics.velocityFromAngle(this.aimAngle - 90, speed, this.ball.body.velocity);
    const p = this.modernist ? this.palette : null;
    ArcadeFX.burst(this, this.ball.x, this.ball.y, {
      count: 10,
      distance: 34,
      duration: 260,
      colors: this.modernist ? [p.vermilion, p.ink, p.cyan] : [COLORS.WHITE, COLORS.NEON_CYAN, COLORS.NEON_MAGENTA],
      size: 5,
    });
    ArcadeFX.screenTint(this, {
      color: this.modernist ? p.vermilion : COLORS.NEON_CYAN,
      alpha: 0.08,
      duration: 160,
    });
    this.shakeCamera(0.0025, 90);
    this.aimGraphics.clear();
  }

  currentBallSpeed() {
    const base = BALL_SPEED_BASE + BALL_SPEED_INCREMENT * (GameManager.state.difficulty - 1) * 10
      + this.bricksDestroyed * 1.5;
    return base * GameManager.speedMultiplier;
  }

  hitPaddle(_ball, paddle) {
    if (this._paddleHitCooldown > 0) return;
    this._paddleHitCooldown = 150;

    SFX.paddleHit();
    const diff = _ball.x - paddle.x;
    const normalised = Phaser.Math.Clamp(diff / (paddle.displayWidth / 2), -1, 1);
    const angle = normalised * 50;
    const speed = this.currentBallSpeed();
    this.physics.velocityFromAngle(angle - 90, speed, _ball.body.velocity);
    const p = this.modernist ? this.palette : null;
    ArcadeFX.flash(this, _ball.x, paddle.y - 4, {
      color: this.modernist ? p.vermilion : COLORS.NEON_CYAN,
      radius: 16,
      alpha: 0.45,
      duration: 160,
      shape: 'rect',
    });
    ArcadeFX.burst(this, _ball.x, paddle.y - 4, {
      count: 7,
      distance: 24,
      duration: 180,
      colors: this.modernist ? [p.ink, p.vermilion] : [COLORS.NEON_CYAN, COLORS.WHITE],
      size: 4,
    });
    this.tweens.killTweensOf(paddle);
    paddle.setScale(1.12, 0.82);
    this.tweens.add({
      targets: paddle,
      scaleX: 1,
      scaleY: 1,
      duration: 120,
      ease: 'Quad.easeOut',
    });
    this.shakeCamera(0.0018, 70);

    _ball.y = paddle.y - PADDLE_H / 2 - _ball.displayHeight / 2 - 2;
    _ball.body.updateFromGameObject();
  }

  hitBrick(_ball, brick) {
    const bx = brick.x;
    const by = brick.y;
    const isPortal = brick.isPortal;
    const texture = brick.texture.key;

    if (brick.isPortal) {
      SFX.brickPortalHit();
      this.score.award('goldBrick', 1, bx, by);
      GlitchEffect.chromaticAberration(this, 260);
      ArcadeFX.callout(this, 'PORTAL OPEN', bx, by - 26, {
        color: this.modernist ? this.palette.vermilion : COLORS.NEON_MAGENTA,
        fontSize: '18px',
      });
      this.triggerPortal(bx, by);
      this.portalTriggered = true;
    } else {
      SFX.brickHit();
      this.score.award('brick', 1, bx, by);
    }

    this._spawnBrickBreakFx(brick, texture, isPortal);
    brick.destroy();
    this.bricksDestroyed++;

    const speed = this.currentBallSpeed();
    _ball.body.velocity.normalize().scale(speed);

    this.maybeSpawnPortalBrick();

    if (this.bricks.countActive() === 0) {
      this.resetLevel();
    }
  }

  maybeSpawnPortalBrick() {
    if (this.portalBrickSpawned || this.portalTriggered) return;

    const ratio = this.bricksDestroyed / this.totalBricks;
    if (ratio < 0.4) return;

    const remaining = this.bricks.getChildren().filter(b => b.active);
    if (remaining.length === 0) return;

    const target = Phaser.Utils.Array.GetRandom(remaining);
    this._markPortalBrick(target);
    this.portalBrickSpawned = true;
  }

  handleBallLost() {
    SFX.ballLost();
    const p = this.modernist ? this.palette : null;
    ArcadeFX.flash(this, this.ball.x, this.ball.y, {
      color: this.modernist ? p.vermilion : COLORS.NEON_RED,
      radius: 20,
      alpha: 0.55,
      duration: 200,
    });
    ArcadeFX.burst(this, this.ball.x, this.ball.y, {
      count: 12,
      distance: 48,
      duration: 320,
      colors: this.modernist ? [p.vermilion, p.ink, p.mustard] : [COLORS.NEON_RED, COLORS.NEON_ORANGE, COLORS.WHITE],
      size: 5,
    });
    ArcadeFX.screenTint(this, {
      color: this.modernist ? p.vermilion : COLORS.NEON_RED,
      alpha: 0.12,
      duration: 220,
    });
    this.ball.body.setVelocity(0);

    const alive = this.onPlayerDeath();
    if (alive) {
      this.resetBallOnPaddle();
    }
  }

  resetBallOnPaddle() {
    this.ballOnPaddle = true;
    this.ball.setPosition(this.paddle.x, PADDLE_Y - PADDLE_H / 2 - this.ball.displayHeight / 2);
    this.ball.body.setVelocity(0);
    this.ball.setAlpha(0.2);
    this.ball.setScale(0.7);
    this.tweens.add({
      targets: this.ball,
      alpha: 1,
      scaleX: 1,
      scaleY: 1,
      duration: 180,
      ease: 'Back.easeOut',
    });
    ArcadeFX.flash(this, this.ball.x, this.ball.y, {
      color: this.modernist ? this.palette.vermilion : COLORS.NEON_CYAN,
      radius: 14,
      alpha: 0.25,
      duration: 180,
    });
  }

  resetLevel() {
    this.bricksDestroyed = 0;
    this.totalBricks = 0;
    this.portalBrickSpawned = false;
    const p = this.modernist ? this.palette : null;
    ArcadeFX.callout(this, 'SECTOR RESET', GAME_WIDTH / 2, BRICK_TOP + 30, {
      color: this.modernist ? p.ink : COLORS.NEON_CYAN,
      fontSize: '20px',
    });
    ArcadeFX.screenTint(this, {
      color: this.modernist ? p.cyan : COLORS.NEON_CYAN,
      alpha: 0.08,
      duration: 240,
    });
    this.createBricks(true);
    this.setupCollisions();
    this.resetBallOnPaddle();
    this.drawBrickFieldBorder();
  }

  onPortalForceSpawn() {
    if (!this.portalBrickSpawned && !this.portalTriggered) {
      this.maybeSpawnPortalBrickForced();
    }
    this.portalTriggered = true;
    super.onPortalForceSpawn();
  }

  maybeSpawnPortalBrickForced() {
    const remaining = this.bricks.getChildren().filter(b => b.active);
    if (remaining.length === 0 || this.portalBrickSpawned) return;

    const target = Phaser.Utils.Array.GetRandom(remaining);
    this._markPortalBrick(target);
    this.portalBrickSpawned = true;
  }

  _markPortalBrick(target) {
    target.setTexture(this.modernist ? MOD_BRICK_PORTAL_KEY : 'brick-portal');
    target.setDisplaySize(BRICK_W, BRICK_H);
    target.refreshBody();
    target.isPortal = true;
    this.drawBrickFieldBorder();
    GlitchEffect.digitalNoise(this, 140);
    ArcadeFX.callout(this, 'RIFT BRICK', target.x, target.y - 24, {
      color: this.modernist ? this.palette.vermilion : COLORS.NEON_MAGENTA,
      fontSize: '16px',
      duration: 760,
    });
    this.tweens.add({
      targets: target,
      alpha: { from: 1, to: 0.45 },
      scaleX: 1.08,
      scaleY: 1.08,
      duration: 260,
      yoyo: true,
      repeat: -1,
    });
  }

  _spawnBrickBreakFx(brick, texture, isPortal) {
    // Shrink/pop before destruction
    const clone = this.add.image(brick.x, brick.y, texture)
      .setDisplaySize(BRICK_W, BRICK_H)
      .setDepth(12);
    this.tweens.add({
      targets: clone,
      scaleX: 0.1,
      scaleY: 0.1,
      alpha: 0,
      duration: isPortal ? 200 : 120,
      ease: 'Back.easeIn',
      onComplete: () => clone.destroy(),
    });

    const p = this.modernist ? this.palette : null;
    ArcadeFX.flash(this, brick.x, brick.y, {
      color: this.modernist
        ? (isPortal ? p.vermilion : p.ink)
        : (isPortal ? COLORS.NEON_MAGENTA : COLORS.WHITE),
      radius: isPortal ? 22 : 16,
      alpha: isPortal ? 0.45 : 0.35,
      duration: isPortal ? 260 : 170,
      shape: 'rect',
    });

    if (this.modernist) {
      const swatches = [p.vermilion, p.mustard, p.cyan, p.violet];
      if (isPortal) {
        DebrisSystem.deathBurst(this, brick.x, brick.y, 'heavy', {
          colors: [p.vermilion, p.cyan, p.ink, p.mustard],
        });
        GlitchEffect.chromaticAberration(this, 300);
      } else {
        DebrisSystem.shatter(this, brick.x, brick.y, {
          count: 8,
          colors: [...swatches, p.ink],
          size: 4,
          spread: 35,
          duration: 280,
        });
      }
    } else {
      const brickColor = brick.getData ? brick.getData('color') : COLORS.NEON_CYAN;
      if (isPortal) {
        DebrisSystem.deathBurst(this, brick.x, brick.y, 'heavy', {
          colors: [COLORS.NEON_MAGENTA, COLORS.NEON_CYAN, COLORS.PORTAL_GLOW, COLORS.WHITE],
        });
        GlitchEffect.chromaticAberration(this, 300);
      } else {
        DebrisSystem.shatter(this, brick.x, brick.y, {
          count: 8,
          colors: [brickColor, COLORS.NEON_CYAN, COLORS.WHITE],
          size: 4,
          spread: 35,
          duration: 280,
        });
      }
    }
    this.shakeCamera(isPortal ? 0.004 : 0.0018, isPortal ? 150 : 70);
  }

  update(time, delta) {
    super.update(time, delta);
    this.drawBrickFieldBorder();
    this._drawPaddleCodeFlow();

    if (this._paddleHitCooldown > 0) this._paddleHitCooldown -= delta;

    if (this.ballOnPaddle) {
      this.ball.x = this.paddle.x;
      this.ball.y = this.paddle.y - PADDLE_H / 2 - this.ball.displayHeight / 2;
      this.updateAimIndicator(delta);
    } else {
      this.aimGraphics.clear();
    }

    let widthMult = 1;
    if (GameManager.modSystem.hasMod('power_paddle')) widthMult *= 1.5;
    if (this.powerUps.hasEffect('expand')) widthMult *= 1.5;

    const w = PADDLE_BASE_W * widthMult;
    if (this._prevPaddleW !== w) {
      this.paddle.setDisplaySize(w, PADDLE_H);
      this.paddle.refreshBody();
      this._prevPaddleW = w;
    }

    const dt = delta / 1000;
    const invX = this.horizontalControlInverted;
    const leftDown = this.cursors.left.isDown || this.keyA.isDown;
    const rightDown = this.cursors.right.isDown || this.keyD.isDown;
    const paddleSpeed = this.keyShift.isDown ? PADDLE_SPEED * PADDLE_SLOW_FACTOR : PADDLE_SPEED;
    const half = this.paddle.displayWidth / 2;

    if (invX ? rightDown : leftDown) {
      this.paddle.x -= paddleSpeed * dt;
    } else if (invX ? leftDown : rightDown) {
      this.paddle.x += paddleSpeed * dt;
    }
    this.paddle.x = Phaser.Math.Clamp(this.paddle.x, half, GAME_WIDTH - half);
    this.paddle.body.updateFromGameObject();

    this.setPlayerPosition(this.paddle.x, this.paddle.y);
    this.powerUps.checkCollection(this.ball.x, this.ball.y);
    this.glitch.checkDataLeakCollection(this.paddle.x, this.paddle.y);

    if (this.portalTriggered || this.portal?.portalActive) {
      this.tryEnterPortal(this.ball.x, this.ball.y);
    }
    this.syncGlowObjects();
  }

  syncGlowObjects() {
    if (this.modernist) return;
    if (this.ballGlow && this.ball) {
      this.ballGlow.setPosition(this.ball.x, this.ball.y);
      this.ballGlow.setScale(1 + Math.sin(this.time.now * 0.012) * 0.12);
    }
    if (this.paddleGlow && this.paddle) {
      this.paddleGlow.setPosition(this.paddle.x, this.paddle.y);
      this.paddleGlow.setSize(this.paddle.displayWidth + 18, PADDLE_H + 12);
      this.paddleGlow.setAlpha(0.1 + Math.sin(this.time.now * 0.008) * 0.04);
    }
  }

  updateAimIndicator(delta) {
    const AIM_SPEED = 80;
    const AIM_RANGE = 50;
    this.aimAngle += AIM_SPEED * this.aimDir * (delta / 1000);
    if (this.aimAngle > AIM_RANGE) { this.aimAngle = AIM_RANGE; this.aimDir = -1; }
    if (this.aimAngle < -AIM_RANGE) { this.aimAngle = -AIM_RANGE; this.aimDir = 1; }

    const g = this.aimGraphics;
    g.clear();

    const startX = this.ball.x;
    const startY = this.ball.y - 4;
    const len = 70;
    const rad = Phaser.Math.DegToRad(this.aimAngle - 90);
    const endX = startX + Math.cos(rad) * len;
    const endY = startY + Math.sin(rad) * len;
    const pulse = Math.sin(this.time.now * 0.01) * 0.5 + 0.5;

    if (this.modernist) {
      const p = this.palette;
      // Print aim: blueprint-style 1px ink dashed line + vermilion arrowhead.
      g.lineStyle(1, p.ink, 0.85);
      const segments = 10;
      for (let i = 0; i < segments; i++) {
        if (i % 2 === 0) {
          const t0 = i / segments;
          const t1 = (i + 1) / segments;
          g.beginPath();
          g.moveTo(startX + (endX - startX) * t0, startY + (endY - startY) * t0);
          g.lineTo(startX + (endX - startX) * t1, startY + (endY - startY) * t1);
          g.strokePath();
        }
      }
      const triSize = 8;
      const ax = endX + Math.cos(rad + Math.PI * 0.85) * triSize;
      const ay = endY + Math.sin(rad + Math.PI * 0.85) * triSize;
      const bx = endX + Math.cos(rad - Math.PI * 0.85) * triSize;
      const by = endY + Math.sin(rad - Math.PI * 0.85) * triSize;
      g.fillStyle(p.vermilion, 0.85 + pulse * 0.15);
      g.fillTriangle(endX, endY, ax, ay, bx, by);
      g.lineStyle(1, p.ink, 1);
      g.strokeTriangle(endX, endY, ax, ay, bx, by);
      return;
    }

    g.lineStyle(6, COLORS.NEON_CYAN, 0.08 + pulse * 0.06);
    g.beginPath();
    g.moveTo(startX, startY);
    g.lineTo(endX, endY);
    g.strokePath();
    g.lineStyle(2, COLORS.NEON_CYAN, 0.6);
    const segments = 8;
    for (let i = 0; i < segments; i++) {
      if (i % 2 === 0) {
        const t0 = i / segments;
        const t1 = (i + 1) / segments;
        g.beginPath();
        g.moveTo(startX + (endX - startX) * t0, startY + (endY - startY) * t0);
        g.lineTo(startX + (endX - startX) * t1, startY + (endY - startY) * t1);
        g.strokePath();
      }
    }

    const triSize = 8;
    const ax = endX + Math.cos(rad + Math.PI * 0.85) * triSize;
    const ay = endY + Math.sin(rad + Math.PI * 0.85) * triSize;
    const bx = endX + Math.cos(rad - Math.PI * 0.85) * triSize;
    const by = endY + Math.sin(rad - Math.PI * 0.85) * triSize;
    g.fillStyle(COLORS.NEON_CYAN, 0.75 + pulse * 0.2);
    g.fillTriangle(endX, endY, ax, ay, bx, by);
  }

  showPortalHint() {
    this._showHintText('▸ GUIDE THE BALL INTO THE PORTAL ▸');
  }

  shutdown() {
    super.shutdown();
    try {
      this.input.off('pointermove');
      this.input.off('pointerdown');
    } catch (_) { /* safe */ }
  }
}
