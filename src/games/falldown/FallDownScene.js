import Phaser from 'phaser';
import { BaseGameScene } from '../BaseGameScene.js';
import { GAME_WIDTH, GAME_HEIGHT, COLORS } from '../../config.js';
import SFX from '../../core/SFXManager.js';
import AudioReactive from '../../core/AudioReactiveSystem.js';
import CyberSceneFX from '../../vfx/CyberSceneFX.js';
import PosterSceneFX from '../../vfx/PosterSceneFX.js';
import { cssColor } from '../../core/VisualStyle.js';

const MOD_PLAYER_KEY = 'falldown-mod-player';
const MOD_ORB_KEY = 'falldown-mod-orb';
const MOD_PLAT_KEYS = {
  normal: 'falldown-mod-plat-normal',
  fragile: 'falldown-mod-plat-fragile',
  damage: 'falldown-mod-plat-damage',
  audio: 'falldown-mod-plat-audio',
  glitch: 'falldown-mod-plat-glitch',
};

export class FallDownScene extends BaseGameScene {
  constructor() {
    super('FallDownScene', 'survival'); 
  }

  create() {
    super.create();

    this.physics.world.gravity.y = 800;
    this.baseSpeed = -150;
    this.survivalTime = 0;
    this.isInvincible = false;

    this.hp = 3;
    this.runScore = 0;

    if (this.modernist) this._ensureModernistTextures();
    this.drawCyberArena();

    this.platforms = this.physics.add.group({ allowGravity: false, immovable: true });
    this.orbs = this.physics.add.group({ allowGravity: false, immovable: true });

    const p = this.palette;
    const playerTex = this.modernist ? MOD_PLAYER_KEY : 'pinball-bound';
    this.player = this.physics.add.sprite(GAME_WIDTH / 2, 200, playerTex);
    if (this.modernist) {
      this.player.clearTint();
    } else {
      this.player.setTint(0x00f0ff);
    }
    this.player.setCollideWorldBounds(false);
    this.player.setBounce(0.1).setDepth(60);
    if (!this.modernist) this.player.setBlendMode(Phaser.BlendModes.ADD);
    this.player.setMaxVelocity(1000, 800);
    if (this.modernist) {
      this.playerGlow = null;
    } else {
      this.playerGlow = this.add.circle(this.player.x, this.player.y, 22, COLORS.NEON_CYAN, 0.16)
        .setDepth(58)
        .setBlendMode(Phaser.BlendModes.ADD);
    }

    this.physics.add.collider(this.player, this.platforms, this.onHitPlatform, null, this);
    this.physics.add.overlap(this.player, this.orbs, this.collectOrb, null, this);

    this.setupControls();

    const uiScoreColor = this.modernist ? cssColor(p.ink) : '#00f0ff';
    const uiHealthColor = this.modernist ? cssColor(p.vermilion) : '#ff1744';
    const uiSpeedColor = this.modernist ? cssColor(p.muted) : '#ff00e6';
    this.uiScore = this.add.text(10, 20, 'SCORE: 0', { fontSize: '16px', color: uiScoreColor, fontStyle: 'bold' }).setDepth(100);
    this.uiHealth = this.add.text(10, 45, 'LIVES: 3', { fontSize: '14px', color: uiHealthColor, fontStyle: 'bold' }).setDepth(100);
    this.uiSpeed = this.add.text(10, 65, 'SPEED: 150', { fontSize: '14px', color: uiSpeedColor }).setDepth(100);

    const startPlatTex = this.modernist ? MOD_PLAT_KEYS.normal : 'plat-normal';
    const startPlat = this.platforms.create(GAME_WIDTH / 2, 250, startPlatTex);
    startPlat.setData('type', 'normal');
    startPlat.setVelocityY(this.baseSpeed);
    if (!this.modernist) startPlat.setBlendMode(Phaser.BlendModes.ADD);
    startPlat.body.checkCollision.down = true;

    for(let i=0; i<6; i++) {
      this.spawnPlatform(400 + i * 150, true);
    }
  }

  _ensureModernistTextures() {
    const p = this.palette;

    if (!this.textures.exists(MOD_PLAYER_KEY)) {
      const g = this.make.graphics({ x: 0, y: 0, add: false });
      g.fillStyle(p.vermilion, 1);
      g.fillCircle(10, 10, 8);
      g.lineStyle(1.5, p.ink, 1);
      g.strokeCircle(10, 10, 8);
      g.fillStyle(p.paper, 1);
      g.fillCircle(7, 8, 1.5);
      g.generateTexture(MOD_PLAYER_KEY, 20, 20);
      g.destroy();
    }

    const drawPlatBase = (key, fillColor, accent = null, ornaments = null) => {
      if (this.textures.exists(key)) return;
      const g = this.make.graphics({ x: 0, y: 0, add: false });
      g.fillStyle(fillColor, 1);
      g.fillRect(2, 4, 96, 12);
      g.lineStyle(1.5, p.ink, 1);
      g.strokeRect(2, 4, 96, 12);
      if (accent !== null) {
        g.fillStyle(accent, 1);
        g.fillRect(2, 4, 96, 2);
      }
      if (ornaments) ornaments(g);
      g.generateTexture(key, 100, 20);
      g.destroy();
    };

    drawPlatBase(MOD_PLAT_KEYS.normal, p.paper, p.ink, (g) => {
      g.lineStyle(1, p.ink, 0.35);
      for (let i = 8; i < 96; i += 8) {
        g.lineBetween(i, 6, i, 14);
      }
    });

    drawPlatBase(MOD_PLAT_KEYS.fragile, p.mustard, p.ink, (g) => {
      // Cracked-paper hash
      g.lineStyle(1, p.ink, 0.55);
      g.lineBetween(20, 6, 26, 14);
      g.lineBetween(48, 7, 56, 13);
      g.lineBetween(74, 6, 82, 14);
    });

    drawPlatBase(MOD_PLAT_KEYS.damage, p.vermilion, p.ink, (g) => {
      g.fillStyle(p.ink, 1);
      for (let i = 6; i < 94; i += 12) {
        g.fillTriangle(i, 4, i + 5, -4, i + 10, 4);
      }
    });

    drawPlatBase(MOD_PLAT_KEYS.audio, p.cyan, p.ink, (g) => {
      g.lineStyle(1.5, p.ink, 1);
      // little waveform chevrons
      let x = 10;
      while (x < 92) {
        g.lineBetween(x, 14, x + 3, 7);
        g.lineBetween(x + 3, 7, x + 6, 14);
        x += 12;
      }
    });

    drawPlatBase(MOD_PLAT_KEYS.glitch, p.violet, p.ink, (g) => {
      // Noisy dot speckle — looks like a printer mis-feed
      g.fillStyle(p.ink, 0.65);
      const dots = [[12, 8], [22, 13], [34, 9], [46, 12], [58, 7], [70, 14], [82, 9], [92, 12]];
      for (const [dx, dy] of dots) g.fillRect(dx, dy, 2, 2);
    });

    if (!this.textures.exists(MOD_ORB_KEY)) {
      const g = this.make.graphics({ x: 0, y: 0, add: false });
      g.fillStyle(p.vermilion, 1);
      g.fillCircle(12, 12, 7);
      g.lineStyle(1.5, p.ink, 1);
      g.strokeCircle(12, 12, 7);
      g.lineStyle(1, p.ink, 0.55);
      g.strokeCircle(12, 12, 11);
      g.generateTexture(MOD_ORB_KEY, 24, 24);
      g.destroy();
    }
  }

  drawCyberArena() {
    if (this.modernist) {
      this.drawModernistArena();
      return;
    }
    CyberSceneFX.drawCircuitBackdrop(this, {
      primary: COLORS.NEON_CYAN,
      secondary: COLORS.NEON_MAGENTA,
      accent: COLORS.NEON_GREEN,
      top: 32,
      bottom: GAME_HEIGHT - 34,
      density: 1,
    });
    CyberSceneFX.drawBinarySideData(this, { color: COLORS.NEON_CYAN, alpha: 0.1, columns: 2 });
    CyberSceneFX.drawHudFrame(this, {
      title: 'CYBER-SHAFT: FALLDOWN',
      subtitle: 'PLATFORM STREAM // GRAVITY ORBS',
      primary: COLORS.NEON_CYAN,
      accent: COLORS.NEON_MAGENTA,
    });
  }

  // Print-native arena: paper backdrop, axis ticks, poster HUD, and a
  // vertical "> DESCENT" scan ribbon along the left edge to underline
  // the falling motion.
  drawModernistArena() {
    const p = this.palette;
    this.cameras.main.setBackgroundColor(p.paper);

    PosterSceneFX.drawPaperBackdrop(this, {
      top: 32,
      bottom: GAME_HEIGHT - 34,
      depth: -35,
      seam: false,
      grid: true,
      gridStep: 32,
      grainDensity: 220,
      seed: 0x8c11,
    });

    PosterSceneFX.drawAxisStripData(this, {
      top: 36,
      bottom: GAME_HEIGHT - 38,
      depth: -8,
      leftAlpha: 0.42,
      rightAlpha: 0.34,
    });

    PosterSceneFX.drawPosterHudFrame(this, {
      title: 'FALLDOWN // CYBER SHAFT',
      subtitle: 'NODE 72 · CX4024 · 1983',
      barTop: 28,
      barBottom: GAME_HEIGHT - 36,
    });

    // Descent scan ribbon — vermilion vertical stripes alternating with
    // ink labels every 80px, scrolling subtly with audio bass.
    const stripe = this.add.graphics().setDepth(-6);
    stripe.lineStyle(2, p.vermilion, 0.9);
    stripe.lineBetween(GAME_WIDTH - 40, 56, GAME_WIDTH - 40, GAME_HEIGHT - 44);
    for (let y = 80; y < GAME_HEIGHT - 60; y += 80) {
      stripe.lineStyle(1, p.ink, 0.5);
      stripe.lineBetween(GAME_WIDTH - 48, y, GAME_WIDTH - 32, y);
      this.add.text(GAME_WIDTH - 28, y - 5, `> ${(y).toString().padStart(3, '0')}`, {
        fontSize: '8px', fontFamily: this.fonts.mono, color: cssColor(p.muted),
      }).setDepth(-5).setAlpha(0.45);
    }

    PosterSceneFX.drawCoordinateBlock(this, 24, 56, {
      label: 'SECTOR 6F',
      coord: '08.4 N  41.6 E',
      node: '72',
      depth: -2,
    });
  }

  setupControls() {
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keyA = this.input.keyboard.addKey('A');
    this.keyD = this.input.keyboard.addKey('D');
  }

  safeExplosion(x, y, color) {
    if (this.modernist) {
      // Print debris: 6 short ink hash lines + 2 vermilion accents, no
      // additive blocks, radiating outward.
      const pal = this.palette;
      for (let i = 0; i < 8; i++) {
        const angle = (Math.PI * 2 * i) / 8 + Math.random() * 0.3;
        const g = this.add.graphics().setDepth(58);
        const useAccent = i % 4 === 0;
        g.lineStyle(1, useAccent ? pal.vermilion : pal.ink, 0.9);
        g.lineBetween(0, 0, 8, 0);
        g.setPosition(x, y);
        g.setRotation(angle);
        this.tweens.add({
          targets: g,
          x: x + Math.cos(angle) * (40 + Math.random() * 35),
          y: y + Math.sin(angle) * (40 + Math.random() * 35),
          alpha: 0,
          duration: 500 + Math.random() * 200,
          ease: 'Cubic.easeOut',
          onComplete: () => g.destroy(),
        });
      }
      return;
    }

    for(let i=0; i<8; i++) {
      const p = this.add.rectangle(x, y, 12, 12, color).setBlendMode(Phaser.BlendModes.ADD);
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * 80 + 30;
      this.tweens.add({
        targets: p,
        x: x + Math.cos(angle) * dist,
        y: y + Math.sin(angle) * dist,
        alpha: 0, scale: 0.2,
        duration: 400 + Math.random() * 200,
        ease: 'Cubic.easeOut',
        onComplete: () => p.destroy()
      });
    }
  }

  spawnPlatform(yPos, forceNormal = false) {
    const xPos = Phaser.Math.Between(50, GAME_WIDTH - 50);
    let type = 'normal';

    if (!forceNormal) {
      const rand = Math.random();
      if (rand < 0.15) type = 'fragile';
      else if (rand < 0.30) type = 'damage';
      else if (rand < 0.45) type = 'audio';
      else if (rand < 0.60) type = 'glitch';
    }
    const texture = this.modernist
      ? MOD_PLAT_KEYS[type] || MOD_PLAT_KEYS.normal
      : `plat-${type}`;

    const plat = this.platforms.create(xPos, yPos, texture);
    plat.setData('type', type);
    plat.setVelocityY(this.baseSpeed);
    if (!this.modernist) plat.setBlendMode(Phaser.BlendModes.ADD);
    plat.body.checkCollision.down = true;

    if (type === 'normal' && Math.random() < 0.03) {
      const orbTex = this.modernist ? MOD_ORB_KEY : 'grav-orb';
      const orb = this.orbs.create(xPos, yPos - 30, orbTex);
      if (!this.modernist) orb.setTintFill(0xff1744);
      orb.setVelocityY(this.baseSpeed);
      this.tweens.add({ targets: orb, y: orb.y - 10, yoyo: true, repeat: -1, duration: 800 });
    }
  }

  update(time, delta) {
    super.update(time, delta);
    if (this.gameOver || this._ending) return;

    // 👉 每秒存活增加 50 分！
    this.survivalTime += delta;
    this.runScore += delta * 0.05; 

    // UI 刷新
    this.uiScore.setText(`SCORE: ${Math.floor(this.runScore)}`);
    this.uiHealth.setText(`LIVES: ${this.hp}`);
    this.uiSpeed.setText(`SPEED: ${Math.abs(Math.floor(this.baseSpeed))}`);

    if (this.player.x < 0) this.player.x = GAME_WIDTH;
    if (this.player.x > GAME_WIDTH) this.player.x = 0;

    this.baseSpeed = Math.max(this.baseSpeed - (delta * 0.003), -500); 
    
    this.platforms.getChildren().forEach(p => p.setVelocityY(this.baseSpeed));
    this.orbs.getChildren().forEach(o => o.setVelocityY(this.baseSpeed));

    if (this.baseSpeed <= -450 && !this.portalSpawned) {
      this.portalSpawned = true;
      this.triggerPortal(GAME_WIDTH / 2, GAME_HEIGHT / 2);
      if (this.modernist) {
        // Paper-wash flash, not a saturated white screen
        this.cameras.main.flash(800, 242, 239, 230, 0.5);
      } else {
        this.cameras.main.flash(1000, 255, 255, 255);
      }
    }

    const invX = this.horizontalControlInverted;
    const isLeft = this.keyA.isDown || this.cursors.left.isDown;
    const isRight = this.keyD.isDown || this.cursors.right.isDown;

    if ((!invX && isLeft) || (invX && isRight)) this.player.setVelocityX(-400);
    else if ((!invX && isRight) || (invX && isLeft)) this.player.setVelocityX(400);
    else this.player.setVelocityX(0);

    let lowestPlatY = 0;
    this.platforms.getChildren().forEach(plat => {
      if (plat.y > lowestPlatY) lowestPlatY = plat.y;
      
      if (plat.getData('type') === 'audio' && AudioReactive.analysis) {
        const scaleX = 1 + (AudioReactive.analysis.bass * 0.005);
        plat.setScale(scaleX, 1).refreshBody();
      }

      if (plat.y < -50) plat.destroy(); 
    });

    if (lowestPlatY < GAME_HEIGHT + 150) {
      this.spawnPlatform(lowestPlatY + 150);
    }

    if (this.player.y < -50) this.takeDamage(true);
    if (this.player.y > GAME_HEIGHT + 50) this.takeDamage(true);
    
    this.setPlayerPosition(this.player.x, this.player.y);
    this.tryEnterPortal(this.player.x, this.player.y);
    this.syncNeonActors(time);
  }

  syncNeonActors(time) {
    if (this.modernist) return;
    if (this.playerGlow && this.player) {
      this.playerGlow.setPosition(this.player.x, this.player.y);
      this.playerGlow.setScale(1 + Math.sin(time * 0.012) * 0.12);
      this.playerGlow.setVisible(this.player.visible);
    }
    this.platforms.getChildren().forEach((plat, i) => {
      if (plat.active) plat.setAlpha(0.78 + Math.sin(time * 0.006 + i) * 0.16);
    });
    this.orbs.getChildren().forEach((orb, i) => {
      if (orb.active) orb.setAlpha(0.85 + Math.sin(time * 0.01 + i) * 0.14);
    });
  }

  onHitPlatform(player, plat) {
    if (!player.body.touching.down && !player.body.touching.up) return;
    if (plat.getData('stepped')) return; 

    const type = plat.getData('type');

    if (type === 'normal') {
      plat.setData('stepped', true);
      this.tweens.add({ targets: plat, scaleY: 0.5, yoyo: true, duration: 80 });
      this.time.delayedCall(200, () => { if(plat && plat.active) plat.setData('stepped', false) });
    }
    else if (type === 'fragile') {
      plat.setData('type', 'broken');
      if (this.modernist) plat.setTintFill(this.palette.vermilion);
      else plat.setTintFill(0xff0000);
      this.tweens.add({
        targets: plat, x: plat.x + 10, duration: 40, yoyo: true, repeat: 6,
        onComplete: () => {
          this.safeExplosion(plat.x, plat.y, this.modernist ? this.palette.mustard : 0xffaa00);
          plat.destroy();
        }
      });
    }
    else if (type === 'damage') {
      plat.setData('stepped', true);
      this.takeDamage();
      this.time.delayedCall(500, () => { if(plat && plat.active) plat.setData('stepped', false) });
    }
    else if (type === 'audio') {
      plat.setData('stepped', true);
      this.tweens.add({ targets: plat, scaleY: 2.0, yoyo: true, duration: 100 });
      player.setVelocityY(-500); // 弹飞！
      SFX.powerPellet && SFX.powerPellet();
      this.time.delayedCall(200, () => { if(plat && plat.active) plat.setData('stepped', false) });
    }
    else if (type === 'glitch') {
      plat.setData('type', 'resolved');
      const stableTex = this.modernist ? MOD_PLAT_KEYS.normal : 'plat-normal';
      if (Math.random() > 0.5) {
        plat.setTexture(stableTex);
        plat.setTintFill(this.modernist ? this.palette.paper : 0xffffff);
        this.tweens.add({
          targets: plat, scale: 1.2, duration: 150, yoyo: true,
          onComplete: () => { if(plat && plat.active) plat.clearTint(); }
        });

        this.runScore += 200;
        SFX.eatDot && SFX.eatDot();
        this._showScorePopup("+200", plat.x, plat.y);
      } else {
        this.cameras.main.shake(100, 0.015);
        this.safeExplosion(plat.x, plat.y, this.modernist ? this.palette.violet : 0xb845ff);
        plat.destroy();
        SFX.hit && SFX.hit();
        this._showScorePopup("COLLAPSE!", plat.x, plat.y);
      }
    }
  }

  // 👉 收集生命球
  collectOrb(player, orb) {
    orb.destroy();
    this.hp++;
    this.runScore += 500; // 奖励高分
    SFX.eatDot && SFX.eatDot();
    this.score.award('food');
    this._showScorePopup("+1 LIFE", player.x, player.y);
  }

  // 👉 扣血与无敌帧逻辑重构
  takeDamage(fatal = false) {
    if (this.isInvincible) return; 

    this.hp--;
    this.cameras.main.shake(150, 0.03);
    if (this.modernist) {
      // Faint paper wash + vermilion vignette via screenTint, not red flash.
      this.cameras.main.flash(180, 242, 239, 230, 0.45);
    } else {
      this.cameras.main.flash(200, 255, 0, 0);
    }
    SFX.hit && SFX.hit();

    if (this.hp <= 0) {
      // 彻底死透了，交由主框架结算
      this.onPlayerDeath(); 
      if (!this.gameOver) {
        // 如果系统发了慈悲（比如看广告复活），重置血量
        this.hp = 3;
        this.respawnPlayer();
      }
    } else {
      // 还有命，执行抢救
      if (fatal) {
        this.respawnPlayer(); // 掉下深渊，执行高空抢救
      } else {
        // 踩中尖刺，原地给无敌帧
        this.isInvincible = true;
        this.player.setAlpha(0.5); 
        this.time.delayedCall(2000, () => {
          if (this.player && this.player.active) {
            this.isInvincible = false;
            this.player.setAlpha(1);
          }
        });
      }
    }
  }

  respawnPlayer() {
    if (this.modernist) this.player.clearTint();
    else this.player.setTint(0x00f0ff);
    this.baseSpeed = -150;

    const safeX = GAME_WIDTH / 2;
    const safeY = 250;

    this.player.setPosition(safeX, safeY - 30);
    this.player.setVelocity(0, 0);

    const safePlatTex = this.modernist ? MOD_PLAT_KEYS.normal : 'plat-normal';
    const safePlat = this.platforms.create(safeX, safeY, safePlatTex);
    safePlat.setData('type', 'normal');
    safePlat.setVelocityY(this.baseSpeed);
    if (!this.modernist) safePlat.setBlendMode(Phaser.BlendModes.ADD);
    safePlat.body.checkCollision.down = true;

    this.time.delayedCall(3000, () => {
      if (safePlat && safePlat.active) {
        this.tweens.add({
          targets: safePlat, alpha: 0, duration: 200, yoyo: true, repeat: 3,
          onComplete: () => { if (safePlat && safePlat.active) safePlat.destroy(); }
        });
      }
    });

    this.isInvincible = true;
    this.player.setAlpha(0.5);
    this.time.delayedCall(2000, () => {
      if (this.player && this.player.active) {
        this.isInvincible = false;
        this.player.setAlpha(1);
      }
    });
  }
}
