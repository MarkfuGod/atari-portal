import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS } from '../../config.js';
import { GameManager } from '../../core/GameManager.js';
import { BaseGameScene } from '../BaseGameScene.js';
import SFX from '../../core/SFXManager.js';
import GlitchEffect from '../../vfx/GlitchEffect.js';
import ArcadeFX from '../../vfx/ArcadeFX.js';
import TrailSystem from '../../vfx/TrailSystem.js';
import DebrisSystem from '../../vfx/DebrisSystem.js';

const ROTATION_SPEED = 4;
const THRUST = 220;
const BRAKE_THRUST = 300;
const MAX_SPEED = 320;
const DRAG = 0.992;
const BULLET_SPEED = 420;
const BULLET_LIFETIME = 1000;
const MAX_BULLETS = 4;
const INVINCIBILITY_MS = 2000;
const PORTAL_THRESHOLD = 12;
const INITIAL_ASTEROIDS = 7;
const TOP = 28;
const UFO_SPEED = 130;

const SIZES = {
  large:  { radius: 26, minSpd: 40, maxSpd: 80, next: 'medium', texture: 'asteroid-large' },
  medium: { radius: 16, minSpd: 60, maxSpd: 120, next: 'small', texture: 'asteroid-medium' },
  small:  { radius: 9, minSpd: 90, maxSpd: 160, next: null, texture: 'asteroid-small' },
};

export class AsteroidsScene extends BaseGameScene {
  constructor() {
    super('AsteroidsScene', 'asteroids');
  }

  create() {
    super.create();

    this.asteroids = [];
    this.bullets = [];
    this.shipVx = 0;
    this.shipVy = 0;
    this.destroyedCount = 0;
    this.portalTriggered = false;
    this.portalAsteroidActive = false;
    this.invincible = false;
    this.playerAlive = true;
    this.ufoSprite = null;
    this.ufoTimer = 0;
    this.waveCount = 1;
    this._spawningWave = false;

    this.createShip();
    this.spawnWave(INITIAL_ASTEROIDS);
    this.setupInput();
    this.scheduleUfo();
  }

  createShip() {
    const cx = GAME_WIDTH / 2;
    const cy = TOP + (GAME_HEIGHT - TOP) / 2;

    if (this.textures.exists('asteroid-ship')) {
      this.ship = this.add.sprite(cx, cy, 'asteroid-ship');
    } else {
      this.ship = this.add.triangle(cx, cy, 12, 0, -8, -8, -8, 8, COLORS.WHITE);
    }
    this.ship.setDepth(10);
    this.ship.rotation = -Math.PI / 2;
  }

  setupInput() {
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keyA = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
    this.keyD = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);
    this.keyW = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W);
    this.keyS = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S);
    this.fireKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
  }

  spawnWave(count) {
    ArcadeFX.callout(this, this.waveCount === 1 ? 'ASTEROID FIELD' : `WAVE ${this.waveCount}`, GAME_WIDTH / 2, TOP + 34, {
      color: COLORS.NEON_CYAN,
      fontSize: '18px',
    });
    for (let i = 0; i < count; i++) {
      let x, y;
      do {
        x = Phaser.Math.Between(0, GAME_WIDTH);
        y = Phaser.Math.Between(TOP, GAME_HEIGHT);
      } while (Phaser.Math.Distance.Between(x, y, this.ship.x, this.ship.y) < 120);

      this.spawnAsteroid(x, y, 'large');
    }
  }

  spawnAsteroid(x, y, size, isPortal = false) {
    const cfg = SIZES[size];
    const angle = Math.random() * Math.PI * 2;
    const speed = Phaser.Math.Between(cfg.minSpd, cfg.maxSpd);

    let obj;
    if (this.textures.exists(cfg.texture)) {
      obj = this.add.sprite(x, y, cfg.texture);
    } else {
      obj = this.add.circle(x, y, cfg.radius, COLORS.WHITE);
      obj.setStrokeStyle(1.5, COLORS.WHITE);
      obj.setFillStyle(0x000000, 0);
    }

    obj.setData('size', size);
    obj.setData('vx', Math.cos(angle) * speed);
    obj.setData('vy', Math.sin(angle) * speed);
    obj.setData('radius', cfg.radius);
    obj.setData('isPortal', isPortal);

    obj.rotation = Math.random() * Math.PI * 2;
    obj.setData('rotSpeed', (Math.random() - 0.5) * 2);

    if (isPortal) {
      this.tweens.add({
        targets: obj,
        alpha: { from: 1, to: 0.3 },
        duration: 300,
        yoyo: true,
        repeat: -1,
      });
      this.tweens.add({
        targets: obj,
        scaleX: 1.12,
        scaleY: 1.12,
        duration: 380,
        yoyo: true,
        repeat: -1,
      });
      obj.setData('origColor', true);
      if (!this.textures.exists(cfg.texture)) {
        obj.setStrokeStyle(2, COLORS.PORTAL_GLOW);
      }
    }

    this.asteroids.push(obj);
    return obj;
  }

  scheduleUfo() {
    this.ufoTimer = this.time.delayedCall(Phaser.Math.Between(15000, 30000), () => {
      if (this.playerAlive && !this.ufoSprite) this.spawnUfo();
      if (this.playerAlive) this.scheduleUfo();
    });
  }

  spawnUfo() {
    const fromLeft = Math.random() > 0.5;
    const sx = fromLeft ? -20 : GAME_WIDTH + 20;
    const uy = Phaser.Math.Between(TOP + 30, GAME_HEIGHT - 60);

    this.ufoSprite = this.add.rectangle(sx, uy, 22, 10, COLORS.RED);
    this.ufoSprite.setData('dir', fromLeft ? 1 : -1);
    ArcadeFX.callout(this, 'UFO INBOUND', GAME_WIDTH / 2, uy - 16, {
      color: COLORS.NEON_RED,
      fontSize: '16px',
    });
    ArcadeFX.flash(this, sx, uy, {
      color: COLORS.RED,
      radius: 16,
      alpha: 0.28,
      duration: 220,
      shape: 'rect',
    });
  }

  update(time, delta) {
    super.update(time, delta);
    if (!this.playerAlive) return;

    const dt = delta / 1000;
    this.updateShip(dt);
    this.updateBullets(dt, time);
    this.updateAsteroids(dt);
    this.updateUfo(dt);
    this.checkBulletAsteroidCollisions();
    this.checkBulletUfoCollisions();
    this.checkShipAsteroidCollisions();
    this.tryEnterPortal(this.ship.x, this.ship.y);

    this.setPlayerPosition(this.ship.x, this.ship.y);
    this.powerUps.checkCollection(this.ship.x, this.ship.y);
    this.glitch.checkDataLeakCollection(this.ship.x, this.ship.y);

    if (this.asteroids.length === 0 && !this.portalTriggered) {
      if (!this._spawningWave) {
        this._spawningWave = true;
        this.waveCount += 1;
        ArcadeFX.screenTint(this, { color: COLORS.NEON_CYAN, alpha: 0.08, duration: 220 });
        this.spawnWave(INITIAL_ASTEROIDS + 1);
        this._spawningWave = false;
      }
    }
  }

  updateShip(dt) {
    const inv = this.controlInverted;
    const left = inv ? (this.cursors.right.isDown || this.keyD.isDown) : (this.cursors.left.isDown || this.keyA.isDown);
    const right = inv ? (this.cursors.left.isDown || this.keyA.isDown) : (this.cursors.right.isDown || this.keyD.isDown);
    const thrust = this.cursors.up.isDown || this.keyW.isDown;
    const brake = this.powerUps.hasEffect('brake') && (this.cursors.down.isDown || this.keyS.isDown);

    if (left) this.ship.rotation -= ROTATION_SPEED * dt;
    if (right) this.ship.rotation += ROTATION_SPEED * dt;

    if (thrust) {
      this.shipVx += Math.cos(this.ship.rotation) * THRUST * dt;
      this.shipVy += Math.sin(this.ship.rotation) * THRUST * dt;

      const spd = Math.sqrt(this.shipVx * this.shipVx + this.shipVy * this.shipVy);
      if (spd > MAX_SPEED) {
        this.shipVx = (this.shipVx / spd) * MAX_SPEED;
        this.shipVy = (this.shipVy / spd) * MAX_SPEED;
      }

      this.showThrustFlicker();
    }

    if (brake) {
      this.shipVx -= Math.cos(this.ship.rotation) * BRAKE_THRUST * dt;
      this.shipVy -= Math.sin(this.ship.rotation) * BRAKE_THRUST * dt;
      const spd = Math.sqrt(this.shipVx * this.shipVx + this.shipVy * this.shipVy);
      if (spd > MAX_SPEED) {
        this.shipVx = (this.shipVx / spd) * MAX_SPEED;
        this.shipVy = (this.shipVy / spd) * MAX_SPEED;
      }
    }

    const dragFactor = Math.pow(DRAG, dt * 60);
    this.shipVx *= dragFactor;
    this.shipVy *= dragFactor;

    this.ship.x += this.shipVx * dt;
    this.ship.y += this.shipVy * dt;
    this.wrapPosition(this.ship);
  }

  showThrustFlicker() {
    if (this._lastFlicker && this.time.now - this._lastFlicker < 60) return;
    this._lastFlicker = this.time.now;

    const bx = this.ship.x - Math.cos(this.ship.rotation) * 16;
    const by = this.ship.y - Math.sin(this.ship.rotation) * 16;

    // Alternating white/cyan flame
    const flameColor = Math.random() > 0.5 ? COLORS.WHITE : COLORS.NEON_CYAN;
    const flame = this.add.circle(bx, by, 3.5, flameColor);
    flame.setBlendMode(Phaser.BlendModes.ADD);
    const streak = this.add.rectangle(bx, by, 4, 16, COLORS.NEON_CYAN, 0.25)
      .setRotation(this.ship.rotation + Math.PI / 2)
      .setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({
      targets: flame,
      alpha: 0,
      scaleX: 0.15,
      scaleY: 0.15,
      duration: 140,
      onComplete: () => flame.destroy(),
    });
    this.tweens.add({
      targets: streak,
      alpha: 0,
      scaleY: 0.1,
      duration: 130,
      onComplete: () => streak.destroy(),
    });

    if (!this._shipTrailId && this.ship && this.ship.active) {
      this._shipTrailId = TrailSystem.createTrail(this, this.ship, {
        color: COLORS.NEON_CYAN,
        length: 5,
        interval: 50,
        size: 4,
      });
    }
  }

  spawnBulletAtAngle(angle) {
    const nx = this.ship.x + Math.cos(angle) * 14;
    const ny = this.ship.y + Math.sin(angle) * 14;

    let bullet;
    if (this.textures.exists('bullet')) {
      bullet = this.add.sprite(nx, ny, 'bullet');
    } else {
      bullet = this.add.circle(nx, ny, 2.5, COLORS.CYAN);
    }

    bullet.setData('vx', Math.cos(angle) * BULLET_SPEED + this.shipVx);
    bullet.setData('vy', Math.sin(angle) * BULLET_SPEED + this.shipVy);
    bullet.setData('born', this.time.now);

    this.bullets.push(bullet);
  }

  fireBullet() {
    const spread = this.powerUps.hasEffect('spread');
    const doubleShot = GameManager.modSystem.hasMod('double_shot');
    let angles;
    if (spread) {
      angles = [this.ship.rotation - 0.15, this.ship.rotation, this.ship.rotation + 0.15];
    } else if (doubleShot) {
      angles = [this.ship.rotation - 0.08, this.ship.rotation + 0.08];
    } else {
      angles = [this.ship.rotation];
    }

    const activeBullets = this.bullets.filter(b => b.active);
    if (activeBullets.length + angles.length > MAX_BULLETS) return;

    for (const ang of angles) {
      this.spawnBulletAtAngle(ang);
    }
    ArcadeFX.burst(this, this.ship.x + Math.cos(this.ship.rotation) * 12, this.ship.y + Math.sin(this.ship.rotation) * 12, {
      count: 8,
      distance: 28,
      duration: 180,
      colors: [COLORS.NEON_CYAN, COLORS.WHITE],
      size: 4,
    });
    SFX.shoot();
  }

  updateBullets(dt, time) {
    if (Phaser.Input.Keyboard.JustDown(this.fireKey)) {
      this.fireBullet();
    }

    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      if (!b.active) {
        this.bullets.splice(i, 1);
        continue;
      }

      b.x += b.getData('vx') * dt;
      b.y += b.getData('vy') * dt;
      this.wrapPosition(b);

      if (time - b.getData('born') > BULLET_LIFETIME) {
        b.destroy();
        this.bullets.splice(i, 1);
      }
    }
  }

  updateAsteroids(dt) {
    const spd = this.gameSpeed;
    for (const a of this.asteroids) {
      if (!a.active) continue;
      a.x += a.getData('vx') * dt * spd;
      a.y += a.getData('vy') * dt * spd;
      a.rotation += a.getData('rotSpeed') * dt;
      this.wrapPosition(a);
    }
  }

  updateUfo(dt) {
    if (!this.ufoSprite || !this.ufoSprite.active) return;
    if (this.enemiesFrozen) return;

    const dir = this.ufoSprite.getData('dir');
    this.ufoSprite.x += UFO_SPEED * dir * dt;

    if (this.ufoSprite.x < -40 || this.ufoSprite.x > GAME_WIDTH + 40) {
      this.ufoSprite.destroy();
      this.ufoSprite = null;
    }
  }

  checkBulletAsteroidCollisions() {
    for (let bi = this.bullets.length - 1; bi >= 0; bi--) {
      const b = this.bullets[bi];
      if (!b.active) continue;

      for (let ai = this.asteroids.length - 1; ai >= 0; ai--) {
        const a = this.asteroids[ai];
        if (!a.active) continue;

        const dist = Phaser.Math.Distance.Between(b.x, b.y, a.x, a.y);
        if (dist < a.getData('radius') + 4) {
          this.onAsteroidHit(ai, b, bi);
          break;
        }
      }
    }
  }

  checkBulletUfoCollisions() {
    if (!this.ufoSprite || !this.ufoSprite.active) return;

    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      if (!b.active) continue;

      if (Math.abs(b.x - this.ufoSprite.x) < 16 && Math.abs(b.y - this.ufoSprite.y) < 10) {
        b.destroy();
        this.bullets.splice(i, 1);

        const ux = this.ufoSprite.x;
        const uy = this.ufoSprite.y;
        this.score.award('ufo', 1, ux, uy);
        SFX.ufoHit();
        this.flashEffect(ux, uy, COLORS.RED);
        this.explosionEffect(ux, uy, 14, [COLORS.RED, COLORS.NEON_ORANGE, COLORS.WHITE], 74, 420);
        ArcadeFX.callout(this, 'UFO DOWN', ux, uy - 18, {
          color: COLORS.NEON_RED,
          fontSize: '16px',
        });
        this.ufoSprite.destroy();
        this.ufoSprite = null;
        return;
      }
    }
  }

  checkShipAsteroidCollisions() {
    if (this.invincible) return;

    for (const a of this.asteroids) {
      if (!a.active) continue;
      const dist = Phaser.Math.Distance.Between(this.ship.x, this.ship.y, a.x, a.y);
      if (dist < a.getData('radius') + 8) {
        this.onShipHit();
        return;
      }
    }
  }

  onAsteroidHit(asteroidIndex, bullet, bulletIndex) {
    const a = this.asteroids[asteroidIndex];
    const ax = a.x;
    const ay = a.y;
    const size = a.getData('size');
    const isPortal = a.getData('isPortal');

    bullet.destroy();
    this.bullets.splice(bulletIndex, 1);

    a.destroy();
    this.asteroids.splice(asteroidIndex, 1);

    this.score.award(size, 1, ax, ay);
    this.destroyedCount++;
    this.flashEffect(ax, ay, COLORS.WHITE);
    SFX[size === 'large' ? 'asteroidHitLg' : 'asteroidHit']();

    // Tiered debris explosions
    const intensity = size === 'large' ? 'heavy' : size === 'medium' ? 'medium' : 'light';
    DebrisSystem.deathBurst(this, ax, ay, intensity, {
      colors: [COLORS.NEON_PURPLE, COLORS.NEON_CYAN, COLORS.NEON_MAGENTA, COLORS.WHITE],
    });

    if (GameManager.mutationSystem.enemyDropCoins) {
      GameManager.addCoins(1);
      this.events.emit('coins-changed', GameManager.state.coins);
    }

    if (isPortal) {
      this.portalTriggered = true;
      this.explosionEffect(ax, ay, 18, [COLORS.PORTAL_GLOW, COLORS.PORTAL_CORE, COLORS.CYAN, COLORS.WHITE], 92, 620);
      GlitchEffect.screenTear(this, 260);
      ArcadeFX.callout(this, 'DIMENSIONAL RIFT', ax, ay - 26, {
        color: COLORS.NEON_MAGENTA,
        fontSize: '18px',
      });
      ArcadeFX.screenTint(this, { color: COLORS.NEON_MAGENTA, alpha: 0.12, duration: 240 });
      this.time.delayedCall(400, () => this.triggerPortal(ax, ay));
      return;
    }

    const cfg = SIZES[size];
    if (cfg.next) {
      for (let i = 0; i < 2; i++) {
        this.spawnAsteroid(ax, ay, cfg.next);
      }
    }

    if (!this.portalTriggered && !this.portalAsteroidActive && this.destroyedCount >= PORTAL_THRESHOLD) {
      this.spawnPortalAsteroid();
    }
  }

  spawnPortalAsteroid() {
    this.portalAsteroidActive = true;

    let x, y;
    do {
      x = Phaser.Math.Between(60, GAME_WIDTH - 60);
      y = Phaser.Math.Between(TOP + 60, GAME_HEIGHT - 60);
    } while (Phaser.Math.Distance.Between(x, y, this.ship.x, this.ship.y) < 150);

    this.spawnAsteroid(x, y, 'large', true);
    ArcadeFX.callout(this, 'RIFT ROCK', x, y - 24, {
      color: COLORS.NEON_MAGENTA,
      fontSize: '16px',
    });
    GlitchEffect.digitalNoise(this, 160);
  }

  onShipHit() {
    this.flashEffect(this.ship.x, this.ship.y, COLORS.RED);
    this.explosionEffect(this.ship.x, this.ship.y, 16, [COLORS.NEON_RED, COLORS.NEON_ORANGE, COLORS.WHITE], 62, 360);
    GlitchEffect.chromaticAberration(this, 180);
    ArcadeFX.screenTint(this, { color: COLORS.NEON_RED, alpha: 0.12, duration: 180 });
    const alive = this.onPlayerDeath();

    if (alive) {
      this.respawnShip();
    } else {
      this.playerAlive = false;
      this.ship.setVisible(false);
    }
  }

  respawnShip() {
    this.ship.x = GAME_WIDTH / 2;
    this.ship.y = TOP + (GAME_HEIGHT - TOP) / 2;
    this.shipVx = 0;
    this.shipVy = 0;
    this.ship.rotation = -Math.PI / 2;
    this.invincible = true;
    this.ship.setVisible(true);
    this.ship.setScale(0.6);
    ArcadeFX.flash(this, this.ship.x, this.ship.y, {
      color: COLORS.NEON_CYAN,
      radius: 18,
      alpha: 0.35,
      duration: 200,
    });

    this.tweens.add({
      targets: this.ship,
      alpha: { from: 0.2, to: 1 },
      scaleX: 1,
      scaleY: 1,
      duration: 120,
      yoyo: true,
      repeat: Math.floor(INVINCIBILITY_MS / 240),
      onComplete: () => {
        this.invincible = false;
        this.ship.setAlpha(1);
      },
    });
  }

  showPortalHint() {
    this._showHintText('▸ FLY YOUR SHIP INTO THE PORTAL ▸');
  }

  onPortalForceSpawn() {
    if (!this.portalTriggered) {
      this.portalTriggered = true;
      this.triggerPortal(GAME_WIDTH / 2, TOP + (GAME_HEIGHT - TOP) / 2);
    }
  }

  wrapPosition(obj) {
    if (obj.x < -10) obj.x = GAME_WIDTH + 10;
    else if (obj.x > GAME_WIDTH + 10) obj.x = -10;

    if (obj.y < TOP - 10) obj.y = GAME_HEIGHT + 10;
    else if (obj.y > GAME_HEIGHT + 10) obj.y = TOP - 10;
  }

  flashEffect(x, y, color) {
    ArcadeFX.flash(this, x, y, {
      color,
      radius: 12,
      alpha: 0.42,
      duration: 230,
      scale: 2.5,
      shape: 'circle',
    });
  }

  explosionEffect(x, y, count = 12, colors = [COLORS.PORTAL_GLOW, COLORS.PORTAL_CORE, COLORS.CYAN], distance = 70, duration = 600) {
    ArcadeFX.burst(this, x, y, {
      count,
      colors,
      distance,
      duration,
      size: 7,
      shape: 'circle',
    });
  }

  shutdown() {
    super.shutdown();
  }
}
