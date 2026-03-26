import { COLORS, GAME_WIDTH, GAME_HEIGHT } from '../config.js';
import { GameManager } from './GameManager.js';
import SFX from './SFXManager.js';

const POWERUP_DEFS = {
  PacmanScene: [
    { id: 'speed', name: 'SPEED', texture: 'powerup-speed', duration: 8000, color: COLORS.NEON_YELLOW },
    { id: 'freeze', name: 'FREEZE', texture: 'powerup-freeze', duration: 5000, color: COLORS.NEON_CYAN },
    { id: 'phase', name: 'PHASE', texture: 'powerup-phase', duration: 6000, color: COLORS.NEON_PURPLE },
  ],
  BreakoutScene: [
    { id: 'multiball', name: 'MULTI', texture: 'powerup-multiball', duration: 0, color: COLORS.NEON_CYAN },
    { id: 'expand', name: 'EXPAND', texture: 'powerup-speed', duration: 10000, color: COLORS.NEON_GREEN },
    { id: 'magnet', name: 'STICKY', texture: 'powerup-magnet', duration: 8000, color: COLORS.NEON_MAGENTA },
  ],
  SpaceInvadersScene: [
    { id: 'spread', name: 'SPREAD', texture: 'powerup-spread', duration: 8000, color: COLORS.NEON_ORANGE },
    { id: 'shield', name: 'SHIELD', texture: 'powerup-shield', duration: 0, color: COLORS.NEON_BLUE },
    { id: 'bomb', name: 'BOMB', texture: 'powerup-bomb', duration: 0, color: COLORS.NEON_RED },
  ],
  AsteroidsScene: [
    { id: 'spread', name: 'SPREAD', texture: 'powerup-spread', duration: 8000, color: COLORS.NEON_ORANGE },
    { id: 'shield', name: 'SHIELD', texture: 'powerup-shield', duration: 0, color: COLORS.NEON_BLUE },
    { id: 'brake', name: 'BRAKE', texture: 'powerup-speed', duration: 10000, color: COLORS.NEON_GREEN },
  ],
  FroggerScene: [
    { id: 'freeze', name: 'FREEZE', texture: 'powerup-freeze', duration: 5000, color: COLORS.NEON_CYAN },
    { id: 'teleport', name: 'WARP', texture: 'powerup-phase', duration: 0, color: COLORS.NEON_PURPLE },
  ],
  TetrisScene: [
    { id: 'clear_rows', name: 'CLEAR', texture: 'powerup-bomb', duration: 0, color: COLORS.NEON_RED },
    { id: 'slow', name: 'SLOW', texture: 'powerup-freeze', duration: 8000, color: COLORS.NEON_CYAN },
  ],
};

export class PowerUpSystem {
  constructor(scene, sceneKey) {
    this.scene = scene;
    this.sceneKey = sceneKey;
    this.defs = POWERUP_DEFS[sceneKey] || [];
    this.activePowerUps = [];
    this.spawnedItems = [];
    this.spawnTimer = 0;
    this.spawnInterval = 15000;
    this.activeEffects = {};
    this._spawnPositionProvider = null;

    const luckyMult = GameManager.modSystem.hasMod('lucky_drops') ? 0.5 : 1;
    this.spawnInterval *= luckyMult;
  }

  setSpawnPositionProvider(fn) {
    this._spawnPositionProvider = fn;
  }

  update(delta) {
    this.spawnTimer += delta;
    if (this.spawnTimer >= this.spawnInterval && this.defs.length > 0) {
      this.spawnTimer = 0;
      this.spawnRandom();
    }

    // Decay active timed effects
    for (const [key, effect] of Object.entries(this.activeEffects)) {
      if (effect.duration > 0) {
        effect.remaining -= delta;
        if (effect.remaining <= 0) {
          delete this.activeEffects[key];
          this.scene.events.emit('powerup-expired', key);
        }
      }
    }
  }

  spawnRandom() {
    if (this.spawnedItems.length >= 2) return;

    const def = this.defs[Math.floor(Math.random() * this.defs.length)];
    let x, y;
    if (this._spawnPositionProvider) {
      const pos = this._spawnPositionProvider();
      if (!pos) return;
      x = pos.x;
      y = pos.y;
    } else {
      x = 60 + Math.random() * (GAME_WIDTH - 120);
      y = 60 + Math.random() * (GAME_HEIGHT - 120);
    }

    try {
      const sprite = this.scene.add.image(x, y, def.texture)
        .setDisplaySize(18, 18)
        .setDepth(90)
        .setAlpha(0);

      sprite.powerUpDef = def;

      this.scene.tweens.add({
        targets: sprite,
        alpha: { from: 0, to: 0.9 },
        scale: { from: 0.3, to: 1 },
        duration: 400,
        ease: 'Back.easeOut',
      });

      this.scene.tweens.add({
        targets: sprite,
        y: y + 5,
        alpha: { from: 0.9, to: 0.6 },
        duration: 1200,
        yoyo: true,
        repeat: -1,
        delay: 400,
      });

      this.spawnedItems.push(sprite);

      // Auto-despawn after 12 seconds
      this.scene.time.delayedCall(12000, () => {
        const idx = this.spawnedItems.indexOf(sprite);
        if (idx >= 0) {
          this.spawnedItems.splice(idx, 1);
          if (sprite.active) {
            this.scene.tweens.add({
              targets: sprite,
              alpha: 0, scale: 0,
              duration: 300,
              onComplete: () => sprite.destroy(),
            });
          }
        }
      });
    } catch (_) { /* texture might not exist */ }
  }

  checkCollection(playerX, playerY, radius = 25) {
    for (let i = this.spawnedItems.length - 1; i >= 0; i--) {
      const item = this.spawnedItems[i];
      if (!item.active) continue;
      const dx = playerX - item.x;
      const dy = playerY - item.y;
      if (Math.sqrt(dx * dx + dy * dy) < radius) {
        const def = item.powerUpDef;
        this.collect(def);
        item.destroy();
        this.spawnedItems.splice(i, 1);
        return def;
      }
    }
    return null;
  }

  collect(def) {
    SFX.coin();

    this.activeEffects[def.id] = {
      duration: def.duration,
      remaining: def.duration,
    };

    this.scene.events.emit('powerup-collected', def);

    const label = this.scene.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 20, def.name, {
      fontSize: '16px', fontFamily: 'monospace',
      color: '#' + def.color.toString(16).padStart(6, '0'),
    }).setOrigin(0.5).setDepth(300).setAlpha(0);

    this.scene.tweens.add({
      targets: label,
      alpha: 1, y: label.y - 20,
      duration: 300,
      onComplete: () => {
        this.scene.tweens.add({
          targets: label,
          alpha: 0, y: label.y - 15,
          duration: 400, delay: 600,
          onComplete: () => label.destroy(),
        });
      }
    });
  }

  hasEffect(id) {
    return !!this.activeEffects[id];
  }

  destroy() {
    try {
      this.spawnedItems.forEach(item => { if (item && item.active) item.destroy(); });
    } catch (_) { /* safe */ }
    this.spawnedItems = [];
    this.activeEffects = {};
  }
}
