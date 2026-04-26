import { GAME_WIDTH, GAME_HEIGHT, COLORS } from '../config.js';

const GlitchEffect = {
  screenTear(scene, duration = 500) {
    const slices = [];
    const sliceCount = 12;
    const sliceH = Math.ceil(GAME_HEIGHT / sliceCount);

    for (let i = 0; i < sliceCount; i++) {
      const rect = scene.add.rectangle(
        GAME_WIDTH / 2 + (Math.random() - 0.5) * 30,
        i * sliceH + sliceH / 2,
        GAME_WIDTH + 20, sliceH,
        [COLORS.NEON_CYAN, COLORS.NEON_MAGENTA, COLORS.NEON_PURPLE][i % 3],
        0.06
      ).setDepth(8000);
      slices.push(rect);

      scene.tweens.add({
        targets: rect,
        x: GAME_WIDTH / 2 + (Math.random() - 0.5) * 60,
        alpha: { from: 0.08, to: 0 },
        duration: duration,
        ease: 'Stepped',
        easeParams: [4],
        onComplete: () => rect.destroy(),
      });
    }
    return slices;
  },

  chromaticAberration(scene, duration = 400) {
    const overlay1 = scene.add.rectangle(
      GAME_WIDTH / 2 - 3, GAME_HEIGHT / 2,
      GAME_WIDTH, GAME_HEIGHT,
      COLORS.NEON_CYAN, 0.04
    ).setDepth(8001).setBlendMode(Phaser.BlendModes.ADD);

    const overlay2 = scene.add.rectangle(
      GAME_WIDTH / 2 + 3, GAME_HEIGHT / 2,
      GAME_WIDTH, GAME_HEIGHT,
      COLORS.NEON_MAGENTA, 0.04
    ).setDepth(8001).setBlendMode(Phaser.BlendModes.ADD);

    scene.tweens.add({
      targets: [overlay1, overlay2],
      alpha: 0,
      duration: duration,
      onComplete: () => {
        overlay1.destroy();
        overlay2.destroy();
      }
    });
  },

  digitalNoise(scene, duration = 300) {
    const particles = [];
    for (let i = 0; i < 40; i++) {
      const px = Math.random() * GAME_WIDTH;
      const py = Math.random() * GAME_HEIGHT;
      const w = Math.random() * 30 + 5;
      const h = 1 + Math.random() * 2;
      const color = [COLORS.NEON_CYAN, COLORS.NEON_MAGENTA, COLORS.WHITE][Math.floor(Math.random() * 3)];
      const rect = scene.add.rectangle(px, py, w, h, color, 0.3 + Math.random() * 0.3)
        .setDepth(8002);
      particles.push(rect);
    }

    scene.time.delayedCall(duration, () => {
      particles.forEach(p => p.destroy());
    });
  },

  dataStream(scene, x, columns = 20, duration = 2000, color = COLORS.NEON_GREEN) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$%^&*+=<>{}[]|';
    const streams = [];

    for (let c = 0; c < columns; c++) {
      const col = x + c * 20;
      const speed = 100 + Math.random() * 200;
      const startDelay = Math.random() * 1000;
      const length = 5 + Math.floor(Math.random() * 10);

      for (let i = 0; i < length; i++) {
        const ch = chars[Math.floor(Math.random() * chars.length)];
        const alpha = 1 - (i / length) * 0.7;
        const txt = scene.add.text(col, -20 - i * 16, ch, {
          fontSize: '14px', fontFamily: 'monospace',
          color: '#' + color.toString(16).padStart(6, '0'),
        }).setAlpha(alpha * 0.7).setDepth(8003);

        scene.tweens.add({
          targets: txt,
          y: GAME_HEIGHT + 20,
          duration: (GAME_HEIGHT + 40) / speed * 1000,
          delay: startDelay + i * 40,
          onComplete: () => txt.destroy(),
        });
        streams.push(txt);
      }
    }

    scene.time.delayedCall(duration + 2000, () => {
      streams.forEach(s => { if (s.active) s.destroy(); });
    });
  },

  localNoise(scene, x, y, radius = 40, duration = 400) {
    const count = Math.floor(12 + radius * 0.5);
    const particles = [];
    for (let i = 0; i < count; i++) {
      const px = x + (Math.random() - 0.5) * radius * 2;
      const py = y + (Math.random() - 0.5) * radius * 2;
      const dist = Math.hypot(px - x, py - y);
      if (dist > radius) continue;
      const w = 2 + Math.random() * 8;
      const h = 1 + Math.random() * 2;
      const color = [COLORS.NEON_CYAN, COLORS.NEON_MAGENTA, COLORS.WHITE][Math.floor(Math.random() * 3)];
      const alpha = (0.3 + Math.random() * 0.4) * (1 - dist / radius);
      const rect = scene.add.rectangle(px, py, w, h, color, alpha)
        .setDepth(8002).setBlendMode(Phaser.BlendModes.ADD);
      particles.push(rect);
    }
    scene.time.delayedCall(duration, () => {
      particles.forEach(p => { if (p.active) p.destroy(); });
    });
    return particles;
  },

  signalLoss(scene, duration = 300) {
    const flash = scene.add.rectangle(
      GAME_WIDTH / 2, GAME_HEIGHT / 2,
      GAME_WIDTH, GAME_HEIGHT,
      0xffffff, 0
    ).setDepth(8005);

    scene.tweens.add({
      targets: flash,
      alpha: { from: 0.2, to: 0 },
      duration: 60,
      yoyo: true,
      repeat: 2,
      onComplete: () => flash.destroy(),
    });

    const barCount = 4 + Math.floor(Math.random() * 4);
    const bars = [];
    for (let i = 0; i < barCount; i++) {
      const barY = Math.random() * GAME_HEIGHT;
      const barH = 4 + Math.random() * 10;
      const bar = scene.add.rectangle(
        GAME_WIDTH / 2, barY,
        GAME_WIDTH + 10, barH,
        0x000000, 0.8
      ).setDepth(8006);
      bars.push(bar);

      scene.tweens.add({
        targets: bar,
        y: barY + 80 + Math.random() * 120,
        alpha: 0,
        duration: duration * (0.6 + Math.random() * 0.4),
        delay: i * 25,
        ease: 'Linear',
        onComplete: () => bar.destroy(),
      });
    }
    return bars;
  },
};

export default GlitchEffect;
