import { GLITCH_CONFIG, COLORS, GAME_WIDTH, GAME_HEIGHT } from '../config.js';
import { GameManager } from './GameManager.js';
import GlitchEffect from '../vfx/GlitchEffect.js';
import SFX from './SFXManager.js';

const ANOMALY_TYPES = [
  'CONTROL_INVERSION',
  'DIMENSIONAL_BLEED',
  'TIME_DILATION',
  'VISUAL_CORRUPTION',
  'POWER_SURGE',
  'DATA_LEAK',
];

export class GlitchSystem {
  constructor(scene) {
    this.scene = scene;
    this.active = false;
    this.currentAnomaly = null;
    this.timer = 0;
    this.nextGlitchIn = this.rollNextInterval();
    this.anomalyTimer = 0;
    this.controlInverted = false;
    this.timeDilationFactor = 1;
    this.enemiesFrozen = false;
    this.dataLeakItems = [];
  }

  rollNextInterval() {
    const diff = GameManager.state.difficulty;
    const min = GLITCH_CONFIG.MIN_INTERVAL / diff;
    const max = GLITCH_CONFIG.MAX_INTERVAL / diff;
    return min + Math.random() * (max - min);
  }

  update(delta) {
    if (this.active) {
      this.anomalyTimer -= delta;
      if (this.anomalyTimer <= 0) {
        this.endAnomaly();
      }
      return;
    }

    this.timer += delta;
    if (this.timer >= this.nextGlitchIn) {
      this.triggerRandomAnomaly();
    }
  }

  triggerRandomAnomaly() {
    const type = ANOMALY_TYPES[Math.floor(Math.random() * ANOMALY_TYPES.length)];
    this.startAnomaly(type);
  }

  startAnomaly(type) {
    this.active = true;
    this.currentAnomaly = type;
    this.timer = 0;

    SFX.glitchStart?.();
    this.showAnomalyBanner(type);

    switch (type) {
      case 'CONTROL_INVERSION':
        this.controlInverted = true;
        this.anomalyTimer = GLITCH_CONFIG.CONTROL_INVERT_DURATION;
        GlitchEffect.digitalNoise(this.scene, 500);
        break;

      case 'DIMENSIONAL_BLEED':
        this.anomalyTimer = GLITCH_CONFIG.DIMENSIONAL_BLEED_DURATION;
        this.spawnDimensionalBleed();
        break;

      case 'TIME_DILATION':
        this.anomalyTimer = GLITCH_CONFIG.TIME_SLOW_DURATION + GLITCH_CONFIG.TIME_FAST_DURATION;
        this.timeDilationFactor = 0.3;
        this.scene.time.delayedCall(GLITCH_CONFIG.TIME_SLOW_DURATION, () => {
          if (this.currentAnomaly === 'TIME_DILATION') {
            this.timeDilationFactor = 2.0;
            GlitchEffect.chromaticAberration(this.scene, 300);
          }
        });
        break;

      case 'VISUAL_CORRUPTION':
        this.anomalyTimer = GLITCH_CONFIG.VISUAL_CORRUPT_DURATION;
        this.startVisualCorruption();
        break;

      case 'POWER_SURGE':
        this.enemiesFrozen = true;
        this.anomalyTimer = GLITCH_CONFIG.POWER_SURGE_DURATION;
        this.showPowerSurgeEffect();
        break;

      case 'DATA_LEAK':
        this.anomalyTimer = GLITCH_CONFIG.DATA_LEAK_DURATION;
        this.spawnDataLeakCoins();
        break;
    }
  }

  endAnomaly() {
    this.active = false;
    this.currentAnomaly = null;
    this.controlInverted = false;
    this.timeDilationFactor = 1;
    this.enemiesFrozen = false;
    this.nextGlitchIn = this.rollNextInterval();
    this.timer = 0;

    try {
      this.dataLeakItems.forEach(item => { if (item && item.active) item.destroy(); });
    } catch (_) { /* safe */ }
    this.dataLeakItems = [];

    try {
      if (this.corruptionTimer) { this.corruptionTimer.destroy(); }
    } catch (_) { /* timer may be complete */ }
    this.corruptionTimer = null;

    try {
      if (this.corruptionSlices) {
        this.corruptionSlices.forEach(s => { if (s && s.active) s.destroy(); });
      }
    } catch (_) { /* safe */ }
    this.corruptionSlices = [];
  }

  showAnomalyBanner(type) {
    const names = {
      CONTROL_INVERSION: 'CTRL INVERT',
      DIMENSIONAL_BLEED: 'DIM. BLEED',
      TIME_DILATION: 'TIME WARP',
      VISUAL_CORRUPTION: 'CORRUPTION',
      POWER_SURGE: 'POWER SURGE',
      DATA_LEAK: 'DATA LEAK',
    };

    const colors = {
      CONTROL_INVERSION: '#ff1744',
      DIMENSIONAL_BLEED: '#b845ff',
      TIME_DILATION: '#00f0ff',
      VISUAL_CORRUPTION: '#ff00e6',
      POWER_SURGE: '#39ff14',
      DATA_LEAK: '#ffd700',
    };

    const label = this.scene.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 60,
      'ANOMALY: ' + (names[type] || type), {
        fontSize: '20px', fontFamily: 'monospace',
        color: colors[type] || '#ffffff',
      }).setOrigin(0.5).setDepth(300).setAlpha(0);

    this.scene.tweens.add({
      targets: label,
      alpha: { from: 0, to: 1 },
      y: label.y - 20,
      scale: { from: 0.5, to: 1.1 },
      duration: 400,
      ease: 'Back.easeOut',
      onComplete: () => {
        this.scene.tweens.add({
          targets: label,
          alpha: 0, y: label.y - 15,
          duration: 600, delay: 800,
          onComplete: () => label.destroy(),
        });
      }
    });
  }

  spawnDimensionalBleed() {
    const bleedCount = 4 + Math.floor(Math.random() * 4);
    const textureKeys = ['ghost-red', 'invader', 'asteroid-small', 'ball', 'frog'];

    for (let i = 0; i < bleedCount; i++) {
      const key = textureKeys[Math.floor(Math.random() * textureKeys.length)];
      const x = Math.random() * GAME_WIDTH;
      const y = 40 + Math.random() * (GAME_HEIGHT - 80);

      try {
        const sprite = this.scene.add.image(x, y, key)
          .setAlpha(0.4)
          .setDepth(50)
          .setTint(COLORS.NEON_PURPLE);

        this.scene.tweens.add({
          targets: sprite,
          alpha: { from: 0, to: 0.4 },
          x: x + (Math.random() - 0.5) * 200,
          y: y + (Math.random() - 0.5) * 100,
          duration: GLITCH_CONFIG.DIMENSIONAL_BLEED_DURATION,
          onComplete: () => sprite.destroy(),
        });
      } catch (_) { /* texture not loaded yet */ }
    }
  }

  startVisualCorruption() {
    this.corruptionSlices = [];
    this.corruptionTimer = this.scene.time.addEvent({
      delay: 200,
      repeat: Math.floor(GLITCH_CONFIG.VISUAL_CORRUPT_DURATION / 200) - 1,
      callback: () => {
        GlitchEffect.screenTear(this.scene, 150);
      }
    });
  }

  showPowerSurgeEffect() {
    const flash = this.scene.add.rectangle(
      GAME_WIDTH / 2, GAME_HEIGHT / 2,
      GAME_WIDTH, GAME_HEIGHT,
      COLORS.NEON_GREEN, 0.1
    ).setDepth(250);

    this.scene.tweens.add({
      targets: flash,
      alpha: { from: 0.15, to: 0.02 },
      duration: 500, yoyo: true,
      repeat: Math.floor(GLITCH_CONFIG.POWER_SURGE_DURATION / 1000) - 1,
      onComplete: () => flash.destroy(),
    });
  }

  spawnDataLeakCoins() {
    const count = 8 + Math.floor(Math.random() * 8);
    for (let i = 0; i < count; i++) {
      this.scene.time.delayedCall(i * 300, () => {
        if (!this.scene || !this.scene.scene.isActive()) return;
        const x = 50 + Math.random() * (GAME_WIDTH - 100);
        const coin = this.scene.add.circle(x, -10, 6, 0xffd700, 0.9).setDepth(200);
        coin.isDataLeakCoin = true;
        this.dataLeakItems.push(coin);

        this.scene.tweens.add({
          targets: coin,
          y: GAME_HEIGHT + 10,
          duration: 2000 + Math.random() * 1500,
          onComplete: () => {
            const idx = this.dataLeakItems.indexOf(coin);
            if (idx >= 0) this.dataLeakItems.splice(idx, 1);
            coin.destroy();
          }
        });
      });
    }
  }

  checkDataLeakCollection(playerX, playerY) {
    for (let i = this.dataLeakItems.length - 1; i >= 0; i--) {
      const coin = this.dataLeakItems[i];
      if (!coin.active) continue;
      const dx = playerX - coin.x;
      const dy = playerY - coin.y;
      if (Math.sqrt(dx * dx + dy * dy) < 25) {
        GameManager.addCoins(1);
        this.scene.events.emit('coins-changed', GameManager.state.coins);
        coin.destroy();
        this.dataLeakItems.splice(i, 1);
        SFX.coin();
      }
    }
  }

  destroy() {
    this.endAnomaly();
  }
}
