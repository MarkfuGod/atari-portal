import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS } from '../config.js';
import NeonGlow from './NeonGlow.js';

function hex(color) {
  return `#${color.toString(16).padStart(6, '0')}`;
}

function randomBitLine(length = 18) {
  let out = '';
  for (let i = 0; i < length; i++) out += Math.random() > 0.5 ? '1' : '0';
  return out;
}

const CyberSceneFX = {
  drawCircuitBackdrop(scene, {
    primary = COLORS.NEON_BLUE,
    secondary = COLORS.NEON_CYAN,
    accent = COLORS.NEON_MAGENTA,
    top = 32,
    bottom = GAME_HEIGHT,
    density = 1,
    depth = -30,
  } = {}) {
    const bg = scene.add.graphics().setDepth(depth);
    bg.fillGradientStyle(0x02030b, 0x060a1f, 0x02030b, 0x0b0620, 1);
    bg.fillRect(0, top, GAME_WIDTH, bottom - top);

    const lineCount = Math.floor(24 * density);
    for (let i = 0; i < lineCount; i++) {
      const y = Phaser.Math.Between(top + 16, bottom - 20);
      const startX = Phaser.Math.Between(-80, GAME_WIDTH - 140);
      const segA = Phaser.Math.Between(40, 150);
      const segB = Phaser.Math.Between(14, 42);
      const segC = Phaser.Math.Between(50, 190);
      const color = i % 4 === 0 ? accent : (i % 2 === 0 ? primary : secondary);
      const alpha = 0.07 + Math.random() * 0.13;

      bg.lineStyle(i % 5 === 0 ? 2 : 1, color, alpha);
      bg.beginPath();
      bg.moveTo(startX, y);
      bg.lineTo(startX + segA, y);
      bg.lineTo(startX + segA + segB, y + (i % 2 === 0 ? segB : -segB));
      bg.lineTo(startX + segA + segB + segC, y + (i % 2 === 0 ? segB : -segB));
      bg.strokePath();

      if (i % 3 === 0) {
        bg.fillStyle(color, alpha * 1.5);
        bg.fillCircle(startX + segA, y, 2);
        bg.fillCircle(startX + segA + segB + segC, y + (i % 2 === 0 ? segB : -segB), 1.5);
      }
    }

    for (let x = 0; x < GAME_WIDTH; x += 40) {
      bg.lineStyle(1, primary, 0.025);
      bg.lineBetween(x, top, x, bottom);
    }
    for (let y = top; y < bottom; y += 40) {
      bg.lineStyle(1, secondary, 0.022);
      bg.lineBetween(0, y, GAME_WIDTH, y);
    }

    return bg;
  },

  drawHudFrame(scene, {
    title = '',
    subtitle = '',
    primary = COLORS.NEON_CYAN,
    accent = COLORS.NEON_MAGENTA,
    depth = 75,
  } = {}) {
    const g = scene.add.graphics().setDepth(depth);
    g.fillStyle(0x050713, 0.72);
    g.fillRect(0, 32, GAME_WIDTH, 24);
    g.fillRect(0, GAME_HEIGHT - 36, GAME_WIDTH, 36);
    NeonGlow.strokeRect(g, 6, 38, GAME_WIDTH - 12, GAME_HEIGHT - 48, primary, 1.5, 0.28);
    NeonGlow.cornerAccents(g, 8, 38, GAME_WIDTH - 16, GAME_HEIGHT - 48, 24, primary, 2);

    g.lineStyle(2, accent, 0.22);
    g.lineBetween(0, GAME_HEIGHT - 36, GAME_WIDTH, GAME_HEIGHT - 36);
    g.lineStyle(5, primary, 0.08);
    g.lineBetween(14, 52, GAME_WIDTH - 14, 52);

    const titleText = scene.add.text(14, GAME_HEIGHT - 27, title, {
      fontSize: '17px',
      fontFamily: 'monospace',
      color: hex(primary),
    }).setDepth(depth + 1);
    NeonGlow.applyTextGlow(scene, titleText, accent);

    const subText = subtitle
      ? scene.add.text(GAME_WIDTH - 14, GAME_HEIGHT - 25, subtitle, {
        fontSize: '10px',
        fontFamily: 'monospace',
        color: '#7ba0ff',
      }).setOrigin(1, 0).setDepth(depth + 1).setAlpha(0.72)
      : null;

    return { frame: g, titleText, subText };
  },

  drawBinarySideData(scene, {
    color = COLORS.NEON_CYAN,
    depth = -8,
    alpha = 0.18,
    columns = 3,
  } = {}) {
    const items = [];
    const makeColumn = (x, align = 'left') => {
      for (let col = 0; col < columns; col++) {
        for (let row = 0; row < 18; row++) {
          const txt = scene.add.text(x + col * 26 * (align === 'left' ? 1 : -1), 54 + row * 24, randomBitLine(8), {
            fontSize: '8px',
            fontFamily: 'monospace',
            color: hex(color),
          }).setDepth(depth).setAlpha(alpha * (0.5 + Math.random() * 0.8));
          items.push(txt);
          scene.tweens.add({
            targets: txt,
            alpha: { from: txt.alpha, to: alpha * 1.6 },
            y: txt.y + Phaser.Math.Between(4, 14),
            duration: 1200 + Math.random() * 1600,
            yoyo: true,
            repeat: -1,
            delay: Math.random() * 800,
          });
        }
      }
    };

    makeColumn(18, 'left');
    makeColumn(GAME_WIDTH - 18, 'right');
    return items;
  },

  drawHoloPanel(scene, x, y, w, h, {
    primary = COLORS.NEON_CYAN,
    accent = COLORS.NEON_MAGENTA,
    depth = -4,
    tilt = 0,
  } = {}) {
    const c = scene.add.container(x, y).setDepth(depth).setRotation(tilt);
    const g = scene.add.graphics();
    g.fillStyle(0x06101f, 0.52);
    g.fillRect(-w / 2, -h / 2, w, h);
    NeonGlow.strokeRect(g, -w / 2, -h / 2, w, h, primary, 1.2, 0.36);
    for (let i = 0; i < 8; i++) {
      const yy = -h / 2 + 14 + i * 12;
      g.lineStyle(1, i % 2 ? accent : primary, 0.12);
      g.lineBetween(-w / 2 + 12, yy, w / 2 - 12 - i * 3, yy);
    }
    c.add(g);
    scene.tweens.add({
      targets: c,
      alpha: { from: 0.55, to: 0.9 },
      y: y + 8,
      duration: 1800 + Math.random() * 800,
      yoyo: true,
      repeat: -1,
    });
    return c;
  },

  syncGlow(glow, target, scalePulse = 0) {
    if (!glow || !target || !target.active) return;
    glow.setPosition(target.x, target.y);
    if (target.rotation != null) glow.setRotation(target.rotation);
    if (scalePulse) glow.setScale(1 + Math.sin(Date.now() * 0.006) * scalePulse);
  },
};

export default CyberSceneFX;
