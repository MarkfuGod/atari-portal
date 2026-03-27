import { COLORS } from '../config.js';

const RippleEffect = {

  spawn(scene, x, y, opts = {}) {
    const color = opts.color ?? COLORS.NEON_CYAN;
    const rings = opts.rings ?? 3;
    const maxRadius = opts.maxRadius ?? 50;
    const duration = opts.duration ?? 500;
    const lineWidth = opts.lineWidth ?? 2;
    const depth = opts.depth ?? 42;
    const stagger = opts.stagger ?? (duration * 0.2);

    for (let i = 0; i < rings; i++) {
      const g = scene.add.graphics();
      g.setPosition(x, y);
      g.setDepth(depth);
      g.setBlendMode(Phaser.BlendModes.ADD);
      g.setScale(0.1);

      const startAlpha = 0.7 - i * 0.15;
      g.setAlpha(startAlpha);

      const targetRadius = maxRadius * (0.6 + i * 0.2);
      const lw = lineWidth * (1 - i * 0.2);

      g.lineStyle(lw, color, 1);
      g.strokeCircle(0, 0, targetRadius);
      g.lineStyle(lw * 2.5, color, 0.15);
      g.strokeCircle(0, 0, targetRadius);

      scene.tweens.add({
        targets: g,
        scaleX: 1 + i * 0.3,
        scaleY: 1 + i * 0.3,
        alpha: 0,
        duration: duration + i * 80,
        delay: i * stagger,
        ease: 'Quad.easeOut',
        onComplete: () => g.destroy(),
      });
    }
  },
};

export default RippleEffect;
