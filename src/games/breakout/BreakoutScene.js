import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS } from '../../config.js';
import { GameManager } from '../../core/GameManager.js';
import { BaseGameScene } from '../BaseGameScene.js';
import SFX from '../../core/SFXManager.js';

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

const PADDLE_Y = GAME_HEIGHT - 40;
const PADDLE_BASE_W = 80;
const PADDLE_H = 12;
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

    this.cursors = this.input.keyboard.createCursorKeys();
    this.keyA = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
    this.keyD = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);

    this.drawBrickFieldBorder();
    this.createPaddle();
    this.createBall();
    this.createBricks();
    this.setupCollisions();

    this.input.on('pointermove', (pointer) => {
      const inv = this.controlInverted;
      const px = inv ? GAME_WIDTH - pointer.x : pointer.x;
      const half = this.paddle.displayWidth / 2;
      this.paddle.x = Phaser.Math.Clamp(px, half, GAME_WIDTH - half);
      if (this.ballOnPaddle) {
        this.ball.x = this.paddle.x;
      }
    });

    this.input.on('pointerdown', () => {
      if (this.ballOnPaddle) this.launchBall();
    });

    this.input.keyboard.on('keydown-SPACE', () => {
      if (this.ballOnPaddle) this.launchBall();
    });
  }

  /** Neon frame around the brick grid (Breakout analogue to maze walls). */
  drawBrickFieldBorder() {
    const pad = BRICK_PAD;
    const x = BRICK_OFFSET_X - pad;
    const y = BRICK_TOP - pad;
    const w = COLS * (BRICK_W + BRICK_PAD) + pad;
    const h = ROWS * (BRICK_H + BRICK_PAD) + pad;
    const g = this.add.graphics().setDepth(2);
    g.lineStyle(2, COLORS.NEON_BLUE, 0.55);
    g.strokeRect(x, y, w, h);
  }

  createPaddle() {
    this.paddle = this.physics.add.image(GAME_WIDTH / 2, PADDLE_Y, 'paddle');
    this.paddle.setImmovable(true);
    this.paddle.body.allowGravity = false;
    this.paddle.setCollideWorldBounds(true);
    this.paddle.setDisplaySize(PADDLE_BASE_W, PADDLE_H);
    this.paddle.refreshBody();
  }

  createBall() {
    this.ball = this.physics.add.image(GAME_WIDTH / 2, PADDLE_Y - 20, 'ball');
    this.ball.setDisplaySize(16, 16);
    this.ball.setCollideWorldBounds(true);
    this.ball.setBounce(1);
    this.ball.body.allowGravity = false;
    this.ball.body.setCircle(8);
    this.ball.body.setMaxSpeed(600);

    this.physics.world.on('worldbounds', (body, up, down) => {
      if (body.gameObject === this.ball && down) {
        this.handleBallLost();
      }
    });

    this.ball.body.onWorldBounds = true;
  }

  createBricks() {
    this.bricks = this.physics.add.staticGroup();

    for (let row = 0; row < ROWS; row++) {
      const texture = ROW_TEXTURES[row % ROW_TEXTURES.length];
      for (let col = 0; col < COLS; col++) {
        const x = BRICK_OFFSET_X + col * (BRICK_W + BRICK_PAD) + BRICK_W / 2;
        const y = BRICK_TOP + row * (BRICK_H + BRICK_PAD) + BRICK_H / 2;
        const brick = this.bricks.create(x, y, texture);
        brick.setDisplaySize(BRICK_W, BRICK_H);
        brick.refreshBody();
        brick.isPortal = false;
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

    _ball.y = paddle.y - PADDLE_H / 2 - _ball.displayHeight / 2 - 2;
    _ball.body.updateFromGameObject();
  }

  hitBrick(_ball, brick) {
    if (brick.isPortal) {
      SFX.brickPortalHit();
      this.score.award('goldBrick');
      this.triggerPortal(brick.x, brick.y);
      this.portalTriggered = true;
    } else {
      SFX.brickHit();
      this.score.award('brick');
    }

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
    target.setTexture('brick-portal');
    target.setDisplaySize(BRICK_W, BRICK_H);
    target.refreshBody();
    target.isPortal = true;
    this.portalBrickSpawned = true;
  }

  handleBallLost() {
    SFX.ballLost();
    this.ball.body.setVelocity(0);

    const alive = this.onPlayerDeath();
    if (alive) {
      this.resetBallOnPaddle();
    }
  }

  resetBallOnPaddle() {
    this.ballOnPaddle = true;
    this.ball.setPosition(this.paddle.x, PADDLE_Y - 20);
    this.ball.body.setVelocity(0);
  }

  resetLevel() {
    this.bricksDestroyed = 0;
    this.totalBricks = 0;
    this.portalBrickSpawned = false;
    this.createBricks();
    this.setupCollisions();
    this.resetBallOnPaddle();
  }

  onPortalForceSpawn() {
    if (!this.portalBrickSpawned && !this.portalTriggered) {
      this.maybeSpawnPortalBrickForced();
    }
    super.onPortalForceSpawn();
  }

  maybeSpawnPortalBrickForced() {
    const remaining = this.bricks.getChildren().filter(b => b.active);
    if (remaining.length === 0 || this.portalBrickSpawned) return;

    const target = Phaser.Utils.Array.GetRandom(remaining);
    target.setTexture('brick-portal');
    target.setDisplaySize(BRICK_W, BRICK_H);
    target.refreshBody();
    target.isPortal = true;
    this.portalBrickSpawned = true;
  }

  update(time, delta) {
    super.update(time, delta);

    if (this._paddleHitCooldown > 0) this._paddleHitCooldown -= delta;

    if (this.ballOnPaddle) {
      this.ball.x = this.paddle.x;
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
    const paddleSpeed = 500;
    const inv = this.controlInverted;
    const leftDown = this.cursors.left.isDown || this.keyA.isDown;
    const rightDown = this.cursors.right.isDown || this.keyD.isDown;
    const half = this.paddle.displayWidth / 2;

    if (inv ? rightDown : leftDown) {
      this.paddle.x -= paddleSpeed * dt;
    } else if (inv ? leftDown : rightDown) {
      this.paddle.x += paddleSpeed * dt;
    }
    this.paddle.x = Phaser.Math.Clamp(this.paddle.x, half, GAME_WIDTH - half);
    this.paddle.body.updateFromGameObject();

    this.setPlayerPosition(this.paddle.x, this.paddle.y);
    this.powerUps.checkCollection(this.ball.x, this.ball.y);
    this.glitch.checkDataLeakCollection(this.paddle.x, this.paddle.y);

    if (this.portalTriggered) {
      this.tryEnterPortal(this.ball.x, this.ball.y);
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
    g.fillStyle(COLORS.NEON_CYAN, 0.8);
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
