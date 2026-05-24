import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config.js';
import { getVisualStyle, cssColor, isModernistStyle, getFonts } from '../core/VisualStyle.js';
import CyberSceneFX from './CyberSceneFX.js';

// Modernist twin of CyberSceneFX. Same call signatures, print-native output:
// paper grain backdrops, vector grids, halftone fields, axis-strip metadata,
// muted ink labels with a single vermilion rule instead of glow.
// Mixed-style scenes can call `getActiveFX(scene)` to get the right module.

function getMod() {
  return getVisualStyle();
}

function deterministicGrain(scene, color, alpha, density, seed = 0xa17) {
  const g = scene.add.graphics();
  let s = seed;
  const rng = () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
  g.fillStyle(color, alpha);
  for (let i = 0; i < density; i++) {
    const x = Math.floor(rng() * GAME_WIDTH);
    const y = Math.floor(rng() * GAME_HEIGHT);
    g.fillRect(x, y, 1, 1);
  }
  return g;
}

const PosterSceneFX = {
  drawPaperBackdrop(scene, {
    top = 32,
    bottom = GAME_HEIGHT,
    depth = -30,
    seam = true,
    grid = true,
    gridStep = 32,
    grainDensity = 220,
    seamRatio = 0.42,
    seed = 0xa17,
  } = {}) {
    const style = getMod();
    const p = style.palette;
    const bg = scene.add.graphics().setDepth(depth);

    bg.fillStyle(p.paper, 1);
    bg.fillRect(0, top, GAME_WIDTH, bottom - top);

    if (seam) {
      const seamX = Math.floor(GAME_WIDTH * seamRatio);
      bg.fillStyle(p.terminal, 1);
      bg.fillRect(seamX, top, GAME_WIDTH - seamX, bottom - top);
      bg.fillStyle(p.vermilion, 0.95);
      bg.fillRect(seamX - 1, top, 1, bottom - top);
    }

    if (grid) {
      bg.lineStyle(1, p.faint, 0.18);
      for (let x = gridStep; x < GAME_WIDTH; x += gridStep) {
        bg.lineBetween(x, top + 2, x, bottom - 2);
      }
      for (let y = top + gridStep; y < bottom; y += gridStep) {
        bg.lineBetween(2, y, GAME_WIDTH - 2, y);
      }
    }

    bg.lineStyle(1, p.ink, 0.55);
    bg.strokeRect(6, top + 6, GAME_WIDTH - 12, bottom - top - 12);
    bg.lineStyle(1, p.ink, 0.18);
    bg.strokeRect(10, top + 10, GAME_WIDTH - 20, bottom - top - 20);

    const grain = deterministicGrain(scene, p.ink, 0.06, grainDensity, seed)
      .setDepth(depth + 1);

    return { bg, grain };
  },

  // Axis numerals down left edge + paginated `>` lines down right edge —
  // sister of CyberSceneFX.drawBinarySideData.
  drawAxisStripData(scene, {
    top = 32,
    bottom = GAME_HEIGHT,
    depth = -8,
    every = 60,
    leftX = 12,
    rightX = GAME_WIDTH - 12,
    leftAlpha = 0.55,
    rightAlpha = 0.45,
  } = {}) {
    const style = getMod();
    const p = style.palette;
    const items = [];
    const g = scene.add.graphics().setDepth(depth);

    g.lineStyle(1, p.ink, 0.32);
    g.lineBetween(leftX + 14, top + 4, leftX + 14, bottom - 4);

    let n = 0;
    for (let y = top + 12; y < bottom - 6; y += every) {
      g.lineStyle(1, p.ink, n % 4 === 0 ? 0.78 : 0.32);
      const tickLen = n % 4 === 0 ? 8 : 4;
      g.lineBetween(leftX + 14 - tickLen, y, leftX + 14, y);

      const txt = scene.add.text(leftX, y - 5, String(n * 200).padStart(4, '0'), {
        fontSize: '8px', fontFamily: getFonts().mono,
        color: cssColor(p.ink),
      }).setDepth(depth + 1).setAlpha(leftAlpha);
      items.push(txt);
      n++;
    }

    const rows = ['> 0x041', '> 0x07A', '> 0x0B2', '> 0x0E9', '> 0x122', '> 0x15B', '> 0x194'];
    let ry = top + 14;
    for (const row of rows) {
      const txt = scene.add.text(rightX, ry, row, {
        fontSize: '9px', fontFamily: getFonts().mono,
        color: cssColor(p.muted),
      }).setOrigin(1, 0).setDepth(depth + 1).setAlpha(rightAlpha);
      items.push(txt);
      scene.tweens.add({
        targets: txt,
        alpha: { from: txt.alpha, to: rightAlpha * 1.6 },
        duration: 1400 + Math.random() * 1200,
        yoyo: true,
        repeat: -1,
        delay: Math.random() * 600,
      });
      ry += every;
    }

    return items;
  },

  drawPosterHudFrame(scene, {
    title = '',
    subtitle = '',
    depth = 75,
    barTop = 32,
    barBottom = GAME_HEIGHT - 36,
  } = {}) {
    const style = getMod();
    const p = style.palette;
    const g = scene.add.graphics().setDepth(depth);

    g.fillStyle(p.terminal, 0.94);
    g.fillRect(0, barTop, GAME_WIDTH, 24);
    g.fillStyle(p.paper, 0.96);
    g.fillRect(0, barBottom, GAME_WIDTH, GAME_HEIGHT - barBottom);

    g.lineStyle(1, p.ink, 0.85);
    g.strokeRect(6, barTop + 6, GAME_WIDTH - 12, barBottom - barTop - 12);

    g.lineStyle(2, p.vermilion, 1);
    g.lineBetween(0, barBottom, GAME_WIDTH, barBottom);
    g.lineBetween(0, barTop + 24, GAME_WIDTH, barTop + 24);

    const f = getFonts();
    const titleText = scene.add.text(14, barBottom + 6, title, {
      fontSize: '15px',
      fontFamily: f.ui,
      color: cssColor(p.ink),
    }).setDepth(depth + 1);

    const subText = subtitle
      ? scene.add.text(GAME_WIDTH - 14, barBottom + 9, subtitle, {
        fontSize: '10px',
        fontFamily: f.mono,
        color: cssColor(p.muted),
      }).setOrigin(1, 0).setDepth(depth + 1)
      : null;

    return { frame: g, titleText, subText };
  },

  drawPaperPanel(scene, x, y, w, h, {
    accent = null,
    depth = -4,
    crossHatch = true,
    label = null,
  } = {}) {
    const style = getMod();
    const p = style.palette;
    const accentColor = accent != null ? accent : p.vermilion;
    const c = scene.add.container(x, y).setDepth(depth);
    const g = scene.add.graphics();

    g.fillStyle(p.paper, 0.96);
    g.fillRect(-w / 2, -h / 2, w, h);
    g.lineStyle(1, p.ink, 0.85);
    g.strokeRect(-w / 2, -h / 2, w, h);

    g.fillStyle(accentColor, 1);
    g.fillRect(-w / 2, -h / 2, 6, h);

    if (crossHatch) {
      g.lineStyle(1, p.ink, 0.07);
      for (let i = -h / 2 + 6; i < h / 2; i += 6) {
        g.lineBetween(-w / 2 + 8, i, w / 2 - 4, i + 8);
      }
    }

    c.add(g);
    if (label) {
      const t = scene.add.text(-w / 2 + 12, -h / 2 + 6, label, {
        fontSize: '10px', fontFamily: getFonts().ui,
        color: cssColor(p.ink),
      });
      c.add(t);
    }
    return c;
  },

  // Concentric ring halftone field — the menu's centerpiece, reusable as
  // a gameplay backdrop centerpiece (rifts, portals, energy cores).
  drawHalftoneField(scene, cx, cy, radius, {
    rings = 14,
    depth = -20,
    color = null,
    accentColor = null,
    alpha = 0.55,
  } = {}) {
    const style = getMod();
    const p = style.palette;
    const dotColor = color != null ? color : p.ink;
    const accent = accentColor != null ? accentColor : p.cyan;

    const g = scene.add.graphics().setDepth(depth);
    const dots = [];

    for (let r = 1; r <= rings; r++) {
      const ringRadius = (radius / rings) * r;
      const count = Math.max(6, Math.floor(ringRadius * 0.55));
      for (let i = 0; i < count; i++) {
        const ang = (Math.PI * 2 * i) / count + (r % 2 === 0 ? 0.1 : 0);
        const px = cx + Math.cos(ang) * ringRadius;
        const py = cy + Math.sin(ang) * ringRadius;
        const size = Math.max(0.7, 2.6 - r * 0.15);
        const ringAlpha = Math.max(0.05, alpha - (r / rings) * 0.45);
        const c = r === Math.floor(rings * 0.35) ? accent : dotColor;
        dots.push({ x: px, y: py, size, alpha: ringAlpha, color: c, ring: r });
      }
    }

    const draw = (scale = 1, brighten = 0) => {
      g.clear();
      for (const d of dots) {
        const dx = (d.x - cx) * scale + cx;
        const dy = (d.y - cy) * scale + cy;
        g.fillStyle(d.color, Math.min(1, d.alpha + brighten));
        g.fillCircle(dx, dy, d.size);
      }
    };
    draw();

    return { graphics: g, dots, draw, cx, cy, radius };
  },

  drawCoordinateBlock(scene, x, y, {
    label = 'SECTOR 7G',
    coord = '12.4 N  45.7 E',
    node = '72',
    depth = -2,
  } = {}) {
    const style = getMod();
    const p = style.palette;
    const c = scene.add.container(x, y).setDepth(depth);

    const f = getFonts();
    const t1 = scene.add.text(0, 0, `> ${label}`, {
      fontSize: '10px', fontFamily: f.mono,
      color: cssColor(p.ink),
    });
    const t2 = scene.add.text(0, 12, coord, {
      fontSize: '9px', fontFamily: f.mono,
      color: cssColor(p.muted),
    });
    const nodePlate = scene.add.graphics();
    nodePlate.fillStyle(p.vermilion, 1);
    nodePlate.fillRect(86, -2, 22, 16);
    const t3 = scene.add.text(97, 6, node, {
      fontSize: '10px', fontFamily: f.ui,
      color: cssColor(p.paper),
    }).setOrigin(0.5);

    c.add([t1, t2, nodePlate, t3]);
    return c;
  },

  // Concentric vermilion + cyan rings + slow radial rays + ink pip — pulled
  // from the menu, sized as a rift / portal centerpiece for gameplay scenes.
  drawPortalRings(scene, cx, cy, radius, { depth = -10 } = {}) {
    const style = getMod();
    const p = style.palette;
    const g = scene.add.graphics().setDepth(depth);
    const colors = [p.vermilion, p.cyan, p.ink, p.mustard];

    const draw = (rot = 0, pulse = 0) => {
      g.clear();
      for (let i = 0; i < 8; i++) {
        const r = radius * (0.25 + i * 0.1) + pulse * 6;
        g.lineStyle(i === 0 ? 2 : 1, colors[i % colors.length], 0.85 - i * 0.07);
        g.strokeCircle(cx, cy, r);
      }
      g.lineStyle(1, p.ink, 0.55);
      for (let i = 0; i < 20; i++) {
        const a = rot + (Math.PI * 2 * i) / 20;
        g.lineBetween(
          cx + Math.cos(a) * radius * 0.35,
          cy + Math.sin(a) * radius * 0.35,
          cx + Math.cos(a) * radius * 1.05,
          cy + Math.sin(a) * radius * 1.05,
        );
      }
      g.fillStyle(p.vermilion, 1);
      g.fillCircle(cx, cy, 4);
    };
    draw();

    return { graphics: g, draw, cx, cy, radius };
  },

  // No-op stand-in for CyberSceneFX.syncGlow — modernist sprites have no glow
  // sister object, so callers can just call this unconditionally.
  syncGlow() {},
};

export function getActiveFX(_scene) {
  return isModernistStyle() ? PosterSceneFX : CyberSceneFX;
}

export default PosterSceneFX;
