import Phaser from 'phaser';
import { COLORS } from '../config.js';
import NeonGlow from './NeonGlow.js';

const ArcadeFX = {
  flash(scene, x, y, {
    color = COLORS.WHITE,
    radius = 18,
    alpha = 0.5,
    duration = 220,
    depth = 40,
    scale = 2.4,
    shape = 'circle',
  } = {}) {
    const obj = shape === 'rect'
      ? scene.add.rectangle(x, y, radius * 1.8, radius * 1.8, color, alpha)
      : scene.add.circle(x, y, radius, color, alpha);
    obj.setDepth(depth);

    scene.tweens.add({
      targets: obj,
      alpha: 0,
      scaleX: scale,
      scaleY: scale,
      duration,
      ease: 'Quad.easeOut',
      onComplete: () => obj.destroy(),
    });

    return obj;
  },

  burst(scene, x, y, {
    count = 10,
    colors = [COLORS.WHITE, COLORS.NEON_CYAN, COLORS.NEON_MAGENTA],
    distance = 56,
    duration = 420,
    size = 6,
    depth = 41,
    shape = 'rect',
    alpha = 0.85,
  } = {}) {
    const bits = [];
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.3;
      const color = Phaser.Utils.Array.GetRandom(colors);
      const bit = shape === 'circle'
        ? scene.add.circle(x, y, size * 0.5, color, alpha)
        : scene.add.rectangle(x, y, size, Math.max(2, size * 0.45), color, alpha);

      bit.setDepth(depth);
      bit.rotation = angle;
      bits.push(bit);

      const travel = distance * (0.65 + Math.random() * 0.6);
      scene.tweens.add({
        targets: bit,
        x: x + Math.cos(angle) * travel,
        y: y + Math.sin(angle) * travel,
        alpha: 0,
        scaleX: 0.25,
        scaleY: 0.25,
        duration: duration * (0.8 + Math.random() * 0.4),
        ease: 'Cubic.easeOut',
        onComplete: () => bit.destroy(),
      });
    }

    return bits;
  },

  callout(scene, text, x, y, {
    color = COLORS.NEON_CYAN,
    fontSize = '20px',
    duration = 900,
    depth = 70,
  } = {}) {
    const label = scene.add.text(x, y, text, {
      fontSize,
      fontFamily: 'monospace',
      color: '#ffffff',
    }).setOrigin(0.5).setDepth(depth).setAlpha(0);

    NeonGlow.applyTextGlow(scene, label, color);

    scene.tweens.add({
      targets: label,
      alpha: 1,
      y: y - 16,
      scale: { from: 0.8, to: 1.05 },
      duration: 220,
      ease: 'Back.easeOut',
      onComplete: () => {
        scene.tweens.add({
          targets: label,
          alpha: 0,
          y: label.y - 10,
          duration: 360,
          delay: Math.max(0, duration - 580),
          ease: 'Quad.easeIn',
          onComplete: () => label.destroy(),
        });
      },
    });

    return label;
  },

  pulse(scene, target, {
    scaleTo = 1.12,
    duration = 120,
    yoyo = true,
    repeat = 0,
  } = {}) {
    if (!target) return null;
    return scene.tweens.add({
      targets: target,
      scaleX: scaleTo,
      scaleY: scaleTo,
      duration,
      yoyo,
      repeat,
      ease: 'Quad.easeOut',
    });
  },

  screenTint(scene, {
    color = COLORS.NEON_MAGENTA,
    alpha = 0.12,
    duration = 220,
    depth = 65,
  } = {}) {
    const overlay = scene.add.rectangle(
      scene.scale.width / 2,
      scene.scale.height / 2,
      scene.scale.width,
      scene.scale.height,
      color,
      alpha
    ).setDepth(depth).setBlendMode(Phaser.BlendModes.ADD);

    scene.tweens.add({
      targets: overlay,
      alpha: 0,
      duration,
      ease: 'Quad.easeOut',
      onComplete: () => overlay.destroy(),
    });

    return overlay;
  },
};

export default ArcadeFX;
