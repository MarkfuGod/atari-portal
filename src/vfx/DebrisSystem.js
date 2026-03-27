import { COLORS } from '../config.js';

const INTENSITY_PRESETS = {
  light: { count: 5, size: 4, spread: 40, duration: 350, shake: 0 },
  medium: { count: 10, size: 6, spread: 65, duration: 450, shake: 0.003 },
  heavy: { count: 18, size: 8, spread: 100, duration: 600, shake: 0.008 },
};

const DebrisSystem = {

  shatter(scene, x, y, opts = {}) {
    const count = opts.count ?? 10;
    const colors = opts.colors ?? [COLORS.NEON_CYAN, COLORS.NEON_MAGENTA, 0xffffff];
    const size = opts.size ?? 5;
    const spread = opts.spread ?? 60;
    const duration = opts.duration ?? 420;
    const depth = opts.depth ?? 45;
    const gravity = opts.gravity ?? 80;

    for (let i = 0; i < count; i++) {
      const c = colors[i % colors.length];
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.6;
      const dist = spread * (0.4 + Math.random() * 0.6);
      const w = size * (0.5 + Math.random());
      const h = size * (0.3 + Math.random() * 0.7);

      const g = scene.add.graphics();
      g.setPosition(x, y);
      g.setDepth(depth);
      g.setBlendMode(Phaser.BlendModes.ADD);

      g.fillStyle(c, 0.9);
      g.fillRect(-w / 2, -h / 2, w, h);
      g.lineStyle(1, 0xffffff, 0.5);
      g.strokeRect(-w / 2, -h / 2, w, h);

      const tx = x + Math.cos(angle) * dist;
      const ty = y + Math.sin(angle) * dist + gravity * (duration / 1000);

      scene.tweens.add({
        targets: g,
        x: tx,
        y: ty,
        alpha: 0,
        scaleX: 0.1,
        scaleY: 0.1,
        angle: (Math.random() - 0.5) * 360,
        duration: duration * (0.7 + Math.random() * 0.6),
        ease: 'Quad.easeOut',
        onComplete: () => g.destroy(),
      });
    }
  },

  dissolve(scene, x, y, opts = {}) {
    const count = opts.count ?? 14;
    const colors = opts.colors ?? [COLORS.NEON_CYAN, COLORS.NEON_MAGENTA, COLORS.NEON_PURPLE];
    const width = opts.width ?? 80;
    const duration = opts.duration ?? 800;
    const depth = opts.depth ?? 45;
    const riseHeight = opts.riseHeight ?? 120;
    const convergeX = opts.convergeX ?? x;
    const convergeY = opts.convergeY ?? (y - riseHeight);

    for (let i = 0; i < count; i++) {
      const c = colors[i % colors.length];
      const startX = x + (Math.random() - 0.5) * width;
      const startY = y + (Math.random() - 0.5) * 10;
      const sz = 2 + Math.random() * 4;

      const g = scene.add.graphics();
      g.setPosition(startX, startY);
      g.setDepth(depth);
      g.setBlendMode(Phaser.BlendModes.ADD);
      g.fillStyle(c, 0.8);
      g.fillCircle(0, 0, sz);
      g.fillStyle(0xffffff, 0.6);
      g.fillCircle(0, 0, sz * 0.4);

      const midX = convergeX + (Math.random() - 0.5) * 20;
      const midY = convergeY + (Math.random() - 0.5) * 15;
      const delay = i * (duration * 0.04);

      scene.tweens.add({
        targets: g,
        x: midX,
        y: midY,
        alpha: 0,
        scaleX: 0.2,
        scaleY: 0.2,
        duration: duration,
        delay,
        ease: 'Cubic.easeIn',
        onComplete: () => g.destroy(),
      });
    }
  },

  deathBurst(scene, x, y, intensity = 'medium', opts = {}) {
    const preset = INTENSITY_PRESETS[intensity] || INTENSITY_PRESETS.medium;
    const colors = opts.colors ?? [COLORS.NEON_CYAN, COLORS.NEON_MAGENTA, COLORS.NEON_RED, 0xffffff];

    this.shatter(scene, x, y, {
      count: preset.count,
      size: preset.size,
      spread: preset.spread,
      duration: preset.duration,
      colors,
      gravity: opts.gravity ?? 50,
      depth: opts.depth ?? 45,
    });

    if (preset.shake > 0) {
      scene.cameras.main.shake(preset.duration * 0.6, preset.shake);
    }

    const flash = scene.add.graphics();
    flash.setPosition(x, y);
    flash.setDepth(50);
    flash.setBlendMode(Phaser.BlendModes.ADD);
    flash.fillStyle(0xffffff, 0.6);
    flash.fillCircle(0, 0, preset.spread * 0.4);
    flash.fillStyle(colors[0], 0.3);
    flash.fillCircle(0, 0, preset.spread * 0.7);

    scene.tweens.add({
      targets: flash,
      alpha: 0,
      scaleX: 2,
      scaleY: 2,
      duration: preset.duration * 0.5,
      ease: 'Quad.easeOut',
      onComplete: () => flash.destroy(),
    });
  },
};

export default DebrisSystem;
