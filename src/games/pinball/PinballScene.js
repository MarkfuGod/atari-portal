import Phaser from 'phaser';
import { BaseGameScene } from '../BaseGameScene.js';
import { GAME_WIDTH, GAME_HEIGHT, COLORS } from '../../config.js';
import SFX from '../../core/SFXManager.js';
import AudioReactive from '../../core/AudioReactiveSystem.js';
import CyberSceneFX from '../../vfx/CyberSceneFX.js';
import PosterSceneFX from '../../vfx/PosterSceneFX.js';
import { cssColor } from '../../core/VisualStyle.js';

const TABLE_WIDTH = 800;
const MOD_BOUND_KEY = 'pin-mod-bound';
const MOD_BUMPER_KEY = 'pin-mod-bumper';
const MOD_BALL_KEY = 'pin-mod-ball';
const MOD_WORMHOLE_KEY = 'pin-mod-wormhole';
const MOD_BOSS_KEY = 'pin-mod-boss';
const MOD_FLIPPER_KEY = 'pin-mod-flipper';
const MOD_TARGET_KEY = 'pin-mod-target';

export class PinballScene extends BaseGameScene {
  constructor() {
    super('PinballScene', 'breakout'); 
    this.plungeForce = 0;
    this.hitCount = 0; 
  }

  create() {
    super.create();

    this.multiballTriggered = false;
    this.tableOffsetX = Math.floor((GAME_WIDTH - TABLE_WIDTH) / 2);
    const tx = (x) => this.tableX(x);

    this.physics.world.gravity.y = 1200;
    this.physics.world.setBoundsCollision(true, true, true, false);

    if (this.modernist) this._ensureModernistTextures();
    this.drawCyberArena();
    this.tableBounds = this.physics.add.staticGroup();
    this.pearls = this.physics.add.staticGroup();

    const p = this.palette;
    const boundTex = this.modernist ? MOD_BOUND_KEY : 'pinball-bound';
    const modernist = this.modernist;

    const buildWall = (x, y, w, h, angle = 0, color = 0xffffff) => {
      const wall = this.tableBounds.create(x, y, boundTex);
      const tint = modernist ? p.ink : color;
      wall.setScale(w / 20, h / 20).setAngle(angle).setTint(tint).refreshBody();
      return wall;
    };

    const buildSlantedWall = (x, y, w, angle, color) => {
      const tint = modernist ? p.ink : color;
      const img = this.add.image(x, y, boundTex).setScale(w / 20, 1).setAngle(angle).setTint(tint);
      if (!modernist) img.setBlendMode(Phaser.BlendModes.ADD);
      const rad = angle * Math.PI / 180;
      const startX = x - Math.cos(rad) * (w / 2), startY = y - Math.sin(rad) * (w / 2);
      const endX = x + Math.cos(rad) * (w / 2), endY = y + Math.sin(rad) * (w / 2);

      const steps = Math.ceil(w / 12);
      for (let i = 0; i <= steps; i++) {
        const node = this.pearls.create(startX + (endX - startX) * (i / steps), startY + (endY - startY) * (i / steps), boundTex);
        node.setScale(1.5).setVisible(false).refreshBody();
      }
    };

    buildWall(tx(10), 300, 20, 600); buildWall(tx(790), 300, 20, 600); buildWall(tx(400), 10, 800, 20);
    buildWall(tx(735), 380, 20, 440); buildWall(tx(765), 570, 40, 20, 0, modernist ? p.vermilion : 0x00f0ff);
    buildSlantedWall(tx(735), 50, 160, 45, 0xffffff);
    buildSlantedWall(tx(80), 50, 200, -45, 0xffffff);
    buildSlantedWall(tx(130), 450, 245, 20, modernist ? p.violet : 0xb845ff);
    buildSlantedWall(tx(610), 450, 245, -20, modernist ? p.violet : 0xb845ff);

    this.balls = this.physics.add.group();

    this.targets = this.physics.add.staticGroup();
    this.spawnMultiballTargets();

    this.bumpers = this.physics.add.staticGroup();
    const bumperTex = modernist ? MOD_BUMPER_KEY : 'bumper-ring';
    [{ x: 370, y: 220 }, { x: 300, y: 320 }, { x: 450, y: 320 },  { x: 120, y: 400 }, { x: 660, y: 400 }].forEach(pos => {
      const b = this.bumpers.create(tx(pos.x), pos.y, bumperTex).setCircle(26);
      if (!modernist) b.setBlendMode(Phaser.BlendModes.ADD);
    });

    const wormholeTex = modernist ? MOD_WORMHOLE_KEY : 'wormhole';
    this.wormholeL = this.physics.add.sprite(tx(120), 60, wormholeTex);
    if (!modernist) this.wormholeL.setBlendMode(Phaser.BlendModes.ADD);
    this.wormholeL.body.setAllowGravity(false).setImmovable(true).setCircle(30, 10, 10);
    this.wormholeR = this.physics.add.sprite(tx(600), 60, wormholeTex);
    if (!modernist) this.wormholeR.setBlendMode(Phaser.BlendModes.ADD);
    this.wormholeR.body.setAllowGravity(false).setImmovable(true).setCircle(30, 10, 10);

    this.bossHealth = 5;
    this.boss = this.physics.add.image(GAME_WIDTH / 2, 80, modernist ? MOD_BOSS_KEY : 'boss');
    if (!modernist) this.boss.setBlendMode(Phaser.BlendModes.ADD);
    this.boss.body.setImmovable(true).setAllowGravity(false).setCircle(30);
    this.tweens.add({ targets: this.boss, x: {from: tx(250), to: tx(550)}, duration: 2500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    // ==========================================
    // 🕹️ 四把拨杆构建区
    // ==========================================
    const flipperTex = modernist ? MOD_FLIPPER_KEY : 'flipper';
    const addFlipperImg = (container, dx) => {
      const img = this.add.image(dx, 0, flipperTex).setOrigin(0.5);
      if (!modernist) img.setBlendMode(Phaser.BlendModes.ADD);
      container.add(img);
    };

    this.leftFlipper = this.add.container(tx(250), 530);
    addFlipperImg(this.leftFlipper, 50);
    this.physics.add.existing(this.leftFlipper);
    this.leftFlipper.body.setImmovable(true).setAllowGravity(false).setSize(100, 24).setOffset(0, -12);

    this.rightFlipper = this.add.container(tx(490), 530);
    addFlipperImg(this.rightFlipper, -50);
    this.physics.add.existing(this.rightFlipper);
    this.rightFlipper.body.setImmovable(true).setAllowGravity(false).setSize(100, 24).setOffset(-100, -12);

    this.upperLeftFlipper = this.add.container(tx(10), 250);
    addFlipperImg(this.upperLeftFlipper, 50);
    this.physics.add.existing(this.upperLeftFlipper);
    this.upperLeftFlipper.body.setImmovable(true).setAllowGravity(false).setSize(100, 24).setOffset(0, -12);

    this.upperRightFlipper = this.add.container(tx(720), 250);
    addFlipperImg(this.upperRightFlipper, -50);
    this.physics.add.existing(this.upperRightFlipper);
    this.upperRightFlipper.body.setImmovable(true).setAllowGravity(false).setSize(100, 24).setOffset(-100, -12);

    // ==========================================
    // ⚡ 物理碰撞注册区
    // ==========================================
    this.physics.add.collider(this.balls, this.tableBounds);
    this.physics.add.collider(this.balls, this.bumpers, this.onHitBumper, null, this);
    this.physics.add.collider(this.balls, this.targets, this.onHitTarget, null, this);
    this.physics.add.collider(this.balls, this.boss, this.onHitBoss, null, this);
    
    // 注册所有 4 把拨杆的碰撞
    this.physics.add.collider(this.balls, this.leftFlipper, this.onHitFlipper, null, this);
    this.physics.add.collider(this.balls, this.rightFlipper, this.onHitFlipper, null, this);
    this.physics.add.collider(this.balls, this.upperLeftFlipper, this.onHitFlipper, null, this);
    this.physics.add.collider(this.balls, this.upperRightFlipper, this.onHitFlipper, null, this);

    this.physics.add.collider(this.balls, this.pearls, (obj1, obj2) => {
      const { ball } = this.getCollisionPair(obj1, obj2);
      if (ball) ball.body.velocity.x += (ball.x < GAME_WIDTH / 2) ? 40 : -40; 
    });

    this.physics.add.overlap(this.balls, [this.wormholeL, this.wormholeR], this.onEnterWormhole, null, this);

    this.setupControls();
    const plungeColor = modernist ? cssColor(p.ink) : '#00f0ff';
    const comboColor = modernist ? cssColor(p.vermilion) : '#ff00e6';
    this.plungeText = this.add.text(tx(765), 540, 'SPACE', { fontSize: '10px', color: plungeColor }).setOrigin(0.5);
    this.comboText = this.add.text(GAME_WIDTH / 2, 20, '', { fontSize: '18px', color: comboColor, fontStyle: 'bold' }).setOrigin(0.5).setDepth(10);
    if (modernist) this.comboText.setStroke(cssColor(p.ink), 1);

    this.spawnBall(tx(765), 450);
  }

  // Print-native pinball: paper backdrop, axis ticks, poster HUD, plus
  // diagonal cross-hatched paper gutters on both sides of the playfield.
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
      seed: 0x91d4,
    });

    PosterSceneFX.drawAxisStripData(this, {
      top: 36,
      bottom: GAME_HEIGHT - 38,
      depth: -8,
      leftAlpha: 0.42,
      rightAlpha: 0.34,
    });

    PosterSceneFX.drawPosterHudFrame(this, {
      title: 'PINBALL // WORMHOLE TABLE',
      subtitle: 'NODE 72 · CX4024 · 1984',
      barTop: 28,
      barBottom: GAME_HEIGHT - 36,
    });

    // Diagonal cross-hatch gutters left/right of the active table region
    const hatch = this.add.graphics().setDepth(-10);
    hatch.lineStyle(1, p.ink, 0.18);
    const drawHatch = (gx, gw) => {
      for (let i = -GAME_HEIGHT; i < gw + GAME_HEIGHT; i += 6) {
        hatch.lineBetween(gx + i, 38, gx + i + GAME_HEIGHT, GAME_HEIGHT - 40);
      }
    };
    drawHatch(0, 0);
    drawHatch(GAME_WIDTH - 4, 0);

    PosterSceneFX.drawCoordinateBlock(this, 24, 56, {
      label: 'SECTOR 8E',
      coord: '17.8 N  29.4 E',
      node: '72',
      depth: -2,
    });
  }

  _ensureModernistTextures() {
    const p = this.palette;

    if (!this.textures.exists(MOD_BOUND_KEY)) {
      const g = this.make.graphics({ x: 0, y: 0, add: false });
      g.fillStyle(p.ink, 1);
      g.fillRect(0, 0, 20, 20);
      g.generateTexture(MOD_BOUND_KEY, 20, 20);
      g.destroy();
    }

    if (!this.textures.exists(MOD_BUMPER_KEY)) {
      const g = this.make.graphics({ x: 0, y: 0, add: false });
      const cx = 30; const cy = 30;
      g.fillStyle(p.paper, 1);
      g.fillCircle(cx, cy, 26);
      g.lineStyle(2, p.vermilion, 1);
      g.strokeCircle(cx, cy, 24);
      g.lineStyle(1.5, p.mustard, 1);
      g.strokeCircle(cx, cy, 18);
      g.lineStyle(1, p.cyan, 1);
      g.strokeCircle(cx, cy, 12);
      g.fillStyle(p.vermilion, 1);
      g.fillCircle(cx, cy, 4);
      g.generateTexture(MOD_BUMPER_KEY, 60, 60);
      g.destroy();
    }

    if (!this.textures.exists(MOD_BALL_KEY)) {
      const g = this.make.graphics({ x: 0, y: 0, add: false });
      g.fillStyle(p.vermilion, 1);
      g.fillCircle(16, 16, 11);
      g.lineStyle(1.5, p.ink, 1);
      g.strokeCircle(16, 16, 11);
      g.fillStyle(p.paper, 1);
      g.fillCircle(13, 13, 2);
      g.generateTexture(MOD_BALL_KEY, 32, 32);
      g.destroy();
    }

    if (!this.textures.exists(MOD_WORMHOLE_KEY)) {
      const g = this.make.graphics({ x: 0, y: 0, add: false });
      const cx = 40; const cy = 40;
      g.fillStyle(p.paper, 1);
      g.fillCircle(cx, cy, 32);
      g.lineStyle(2, p.violet, 1);
      g.strokeCircle(cx, cy, 30);
      g.lineStyle(1.5, p.vermilion, 1);
      g.strokeCircle(cx, cy, 22);
      g.lineStyle(1, p.ink, 0.7);
      // Spoke rays — slow rotation orientation
      for (let i = 0; i < 8; i++) {
        const a = (Math.PI * 2 * i) / 8;
        g.lineBetween(cx + Math.cos(a) * 12, cy + Math.sin(a) * 12, cx + Math.cos(a) * 28, cy + Math.sin(a) * 28);
      }
      g.fillStyle(p.ink, 1);
      g.fillCircle(cx, cy, 4);
      g.generateTexture(MOD_WORMHOLE_KEY, 80, 80);
      g.destroy();
    }

    if (!this.textures.exists(MOD_BOSS_KEY)) {
      const g = this.make.graphics({ x: 0, y: 0, add: false });
      g.fillStyle(p.vermilion, 1);
      g.fillTriangle(30, 5, 55, 30, 30, 55);
      g.fillTriangle(30, 5, 5, 30, 30, 55);
      g.lineStyle(2, p.ink, 1);
      g.strokeTriangle(30, 5, 55, 30, 30, 55);
      g.strokeTriangle(30, 5, 5, 30, 30, 55);
      g.fillStyle(p.paper, 1);
      g.fillCircle(30, 30, 6);
      g.lineStyle(1, p.ink, 1);
      g.strokeCircle(30, 30, 6);
      g.fillStyle(p.vermilion, 1);
      g.fillCircle(30, 30, 2);
      g.generateTexture(MOD_BOSS_KEY, 60, 60);
      g.destroy();
    }

    if (!this.textures.exists(MOD_FLIPPER_KEY)) {
      const g = this.make.graphics({ x: 0, y: 0, add: false });
      // Ink filled wedge, 100x20
      g.fillStyle(p.ink, 1);
      g.fillTriangle(0, 4, 100, 12, 0, 16);
      g.lineStyle(1, p.vermilion, 1);
      g.strokeTriangle(0, 4, 100, 12, 0, 16);
      g.generateTexture(MOD_FLIPPER_KEY, 100, 20);
      g.destroy();
    }

    if (!this.textures.exists(MOD_TARGET_KEY)) {
      const g = this.make.graphics({ x: 0, y: 0, add: false });
      g.fillStyle(p.mustard, 1);
      g.fillRect(2, 4, 36, 12);
      g.lineStyle(1.5, p.ink, 1);
      g.strokeRect(2, 4, 36, 12);
      g.fillStyle(p.ink, 1);
      // Bullseye chevron
      g.fillTriangle(15, 10, 25, 5, 25, 15);
      g.generateTexture(MOD_TARGET_KEY, 40, 20);
      g.destroy();
    }
  }

  drawCyberArena() {
    if (this.modernist) {
      this.drawModernistArena();
      return;
    }
    CyberSceneFX.drawCircuitBackdrop(this, {
      primary: COLORS.NEON_MAGENTA,
      secondary: COLORS.NEON_PURPLE,
      accent: COLORS.WHITE,
      top: 32,
      bottom: GAME_HEIGHT - 34,
      density: 0.9,
    });
    CyberSceneFX.drawBinarySideData(this, { color: COLORS.NEON_MAGENTA, alpha: 0.1, columns: 2 });
    CyberSceneFX.drawHudFrame(this, {
      title: 'PINBALL: WORMHOLE TABLE',
      subtitle: 'MULTIBALL // BOSS CORE',
      primary: COLORS.NEON_MAGENTA,
      accent: COLORS.NEON_PURPLE,
    });
  }

  tableX(x) {
    const offset = this.tableOffsetX ?? Math.floor((GAME_WIDTH - TABLE_WIDTH) / 2);
    return x + offset;
  }

  getCollisionPair(obj1, obj2) {
    const ballKeys = new Set(['pin-ball', MOD_BALL_KEY]);
    const isObj1Ball = obj1.texture && ballKeys.has(obj1.texture.key);
    return isObj1Ball ? { ball: obj1, other: obj2 } : { ball: obj2, other: obj1 };
  }

  spawnBall(x, y) {
    const ballTex = this.modernist ? MOD_BALL_KEY : 'pin-ball';
    const ball = this.balls.create(x, y, ballTex);
    ball.setDepth(20);
    if (!this.modernist) ball.setBlendMode(Phaser.BlendModes.ADD);
    ball.setCollideWorldBounds(true);
    ball.setBounce(0.95);
    ball.body.setCircle(10, 6, 6);
    ball.setMaxVelocity(2500, 2500);
    ball.setData('inWormhole', false);
    return ball;
  }

  spawnMultiballTargets() {
    this.activeTargets = 3;
    const targetTex = this.modernist ? MOD_TARGET_KEY : 'target-drop';
    [{ x: 220, y: 250 }, { x: 370, y: 150 }, { x: 520, y: 250 }].forEach(pos => {
      const t = this.targets.create(this.tableX(pos.x), pos.y, targetTex).setOrigin(0.5);
      if (!this.modernist) t.setBlendMode(Phaser.BlendModes.ADD);
    });
  }

  setupControls() {
    this.keyA = this.input.keyboard.addKey('A');
    this.keyD = this.input.keyboard.addKey('D');
    this.keySpace = this.input.keyboard.addKey('SPACE'); 
    this.cursors = this.input.keyboard.createCursorKeys();
  }

  handleCombo() {
    this.hitCount++;
    const mult = Math.min(1 + (this.hitCount * 0.05), 2.5);
    if (this.hitCount > 1) {
      this.comboText.setText(`COMBO x${this.hitCount} | SPD ${(mult).toFixed(1)}x`);
      this.comboText.setScale(1.5);
      this.tweens.add({ targets: this.comboText, scale: 1, duration: 200 }); 
    }
    return mult;
  }
  
  resetCombo() { 
    this.hitCount = 0; 
    this.comboText.setText(''); 
  }

  update(time, delta) {
    super.update(time, delta);
    if (this.gameOver || this._ending) return;

    this.wormholeL.rotation -= 0.05;
    this.wormholeR.rotation += 0.05;

    const invX = this.horizontalControlInverted;
    const isLeftDown = this.keyA.isDown || this.cursors.left.isDown;
    const isRightDown = this.keyD.isDown || this.cursors.right.isDown;

    // 🌟 控制 4 把拨杆的角度：左侧一起动，右侧一起动
    this.leftFlipper.setAngle((!invX && isLeftDown) || (invX && isRightDown) ? -30 : 20);
    this.upperLeftFlipper.setAngle((!invX && isLeftDown) || (invX && isRightDown) ? -30 : 20);

    this.rightFlipper.setAngle((!invX && isRightDown) || (invX && isLeftDown) ? 30 : -20);
    this.upperRightFlipper.setAngle((!invX && isRightDown) || (invX && isLeftDown) ? 30 : -20);

    const p = this.palette;
    const chargedColor = this.modernist ? cssColor(p.vermilion) : '#ff00e6';
    const idleColor = this.modernist ? cssColor(p.ink) : '#00f0ff';

    if (this.keySpace.isDown) {
      this.plungeForce = Phaser.Math.Clamp(this.plungeForce + delta * 4, 0, 2200);
      this.plungeText.setAlpha(Math.sin(time / 30)); this.plungeText.setColor(chargedColor);
    } else if (Phaser.Input.Keyboard.JustUp(this.keySpace)) {
      let plunged = false;
      this.balls.getChildren().forEach(ball => {
        if (ball.x > this.tableX(730) && ball.y > 400) {
          ball.setVelocityY(-Math.max(this.plungeForce, 1200));
          plunged = true;
        }
      });
      if (plunged) { SFX.powerPellet && SFX.powerPellet(); this.resetCombo(); }
      this.plungeForce = 0;
      this.plungeText.setAlpha(1); this.plungeText.setColor(idleColor);
    }

    this.balls.getChildren().forEach(ball => {
      if (ball.y > GAME_HEIGHT + 20) {
        ball.destroy(); 
      }
    });

    if (this.balls.countActive() === 0 && !this.gameOver) {
      this.onPlayerDeath();
      this.resetCombo(); 
      this.spawnBall(this.tableX(765), 450); 
    }
    
    if (this.balls.countActive() > 0) {
      const activeBall = this.balls.getChildren()[0];
      this.setPlayerPosition(activeBall.x, activeBall.y);
      this.balls.getChildren().forEach(b => this.tryEnterPortal(b.x, b.y));
    }
    this.syncNeonActors(time);
  }

  syncNeonActors(time) {
    if (this.modernist) {
      // Print mode: wormholes still rotate via setRotation in update(); keep
      // the boss subtly breathing but no alpha flicker on the ball.
      if (this.boss && this.boss.active) this.boss.setScale(1 + Math.sin(time * 0.005) * 0.03);
      return;
    }
    this.balls.getChildren().forEach((ball, i) => {
      if (!ball.active) return;
      ball.setAlpha(0.88 + Math.sin(time * 0.01 + i) * 0.12);
    });
    [this.wormholeL, this.wormholeR, this.boss].forEach((obj, i) => {
      if (obj && obj.active) obj.setScale(1 + Math.sin(time * 0.006 + i) * 0.04);
    });
  }

  onHitBumper(obj1, obj2) {
    const { ball, other: bumper } = this.getCollisionPair(obj1, obj2);
    if (!ball) return;

    const mult = this.handleCombo(); 
    this.score.award('brick'); SFX.hit && SFX.hit();
    this.shakeCamera(0.01 * mult, 100); 
    this._showScorePopup(10 * Math.floor(mult), bumper.x, bumper.y); 
    this.tweens.add({ targets: bumper, alpha: {from: 1, to: 0.5}, scale: {from: 1.2, to: 1}, duration: 100 });

    const angle = Phaser.Math.Angle.Between(bumper.x, bumper.y, ball.x, ball.y);
    ball.setVelocity(Math.cos(angle) * 800 * mult, Math.sin(angle) * 800 * mult);
  }

  // ==========================================
  // 🌟 终极拨杆物理学：杠杆原理重构 (支持四把拨杆)
  // ==========================================
  onHitFlipper(obj1, obj2) {
    const { ball, other: flipper } = this.getCollisionPair(obj1, obj2);
    if (!ball) return;

    SFX.hit && SFX.hit();
    const isHitting = Math.abs(flipper.angle) > 25; 
    
    // 🌟 核心修改：判断打中的是左侧的两把之一，还是右侧的
    const isLeft = (flipper === this.leftFlipper || flipper === this.upperLeftFlipper); 
    
    if (isHitting) {
      const mult = this.handleCombo();
      
      const dist = Phaser.Math.Clamp(Math.abs(ball.x - flipper.x), 0, 100);
      const powerMultiplier = 0.6 + (dist / 100) * 0.7;
      const force = 1200 * mult * powerMultiplier; 

      const angleDeg = isLeft ? (-90 + (dist / 100) * 50) : (-90 - (dist / 100) * 50);
      const angleRad = Phaser.Math.DegToRad(angleDeg);

      ball.y -= 15;
      ball.setVelocity(Math.cos(angleRad) * force, Math.sin(angleRad) * force);

    } else {
      this.resetCombo();
      ball.body.velocity.y *= 0.5; 
      ball.body.velocity.x *= 0.8;
    }
  }

  onHitTarget(obj1, obj2) {
    const { ball, other: target } = this.getCollisionPair(obj1, obj2);
    if (!ball) return;

    target.body.enable = false; 
    this.score.award('food'); SFX.eatDot && SFX.eatDot();
    this._showScorePopup(20, target.x, target.y);
    ball.body.velocity.y = -500; 
    
    this.tweens.add({ targets: target, y: target.y - 20, alpha: 0, duration: 200, onComplete: () => target.destroy() });

    this.activeTargets--;
    
    if (this.activeTargets <= 0 && !this.multiballTriggered) {
      this.multiballTriggered = true;

      if (this.modernist) {
        this.cameras.main.flash(600, 242, 239, 230, 0.5);
      } else {
        this.cameras.main.flash(800, 0, 255, 0);
      }
      SFX.powerPellet && SFX.powerPellet();
      this._showScorePopup("MULTIBALL MADNESS!", GAME_WIDTH/2, 300);

      this.spawnBall(this.tableX(350), 100).setVelocity(-300, -200);
      this.spawnBall(this.tableX(390), 100).setVelocity(300, -200);
    }
  }

  onHitBoss(obj1, obj2) {
    const { ball, other: boss } = this.getCollisionPair(obj1, obj2);
    if (!ball || !boss || !boss.active) return;

    this.bossHealth--;
    
    const angle = Phaser.Math.Angle.Between(boss.x, boss.y, ball.x, ball.y);
    ball.setVelocity(Math.cos(angle) * 1000, Math.sin(angle) * 1000);

    SFX.hit && SFX.hit();
    this.shakeCamera(0.02, 200);

    if (this.bossHealth <= 0 && !this.portalSpawned) {
      boss.destroy();
      this.portalSpawned = true;
      SFX.portalOpen && SFX.portalOpen();
      this.triggerPortal(GAME_WIDTH / 2, 80); 
      this._showScorePopup("BOSS DEFEATED!", GAME_WIDTH/2, 100);
    } else {
      boss.setTint(this.modernist ? this.palette.paper : 0xffffff);
      this.tweens.add({
        targets: boss,
        scale: 1.2,
        yoyo: true,
        duration: 50,
        onComplete: () => {
          if (boss && boss.active) boss.clearTint();
        }
      });
    }
  }

  onEnterWormhole(obj1, obj2) {
    const { ball, other: hole } = this.getCollisionPair(obj1, obj2);
    if (!ball || ball.getData('inWormhole')) return; 
    
    ball.setData('inWormhole', true);
    ball.body.enable = false; 
    ball.setVisible(false); 
    SFX.eatDot && SFX.eatDot();

    const isLeft = (hole === this.wormholeL);
    const targetHole = isLeft ? this.wormholeR : this.wormholeL;

    this.time.delayedCall(500, () => {
      if (!ball || !ball.active) return; 
      
      ball.setPosition(targetHole.x, targetHole.y + 15);
      ball.body.enable = true;
      ball.setVisible(true);
      
      const spitSpeedX = isLeft ? -600 : 600; 
      ball.setVelocity(spitSpeedX, 800);
      SFX.powerPellet && SFX.powerPellet();

      this.time.delayedCall(200, () => {
        if (ball && ball.active) {
          ball.setData('inWormhole', false);
        }
      });
    });
  }
}
