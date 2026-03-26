import { COLORS } from '../config.js';

const NeonGlow = {
  drawCircle(graphics, x, y, radius, color, coreAlpha = 1.0) {
    graphics.fillStyle(color, coreAlpha * 0.15);
    graphics.fillCircle(x, y, radius * 2.0);
    graphics.fillStyle(color, coreAlpha * 0.25);
    graphics.fillCircle(x, y, radius * 1.5);
    graphics.fillStyle(color, coreAlpha * 0.5);
    graphics.fillCircle(x, y, radius * 1.15);
    graphics.fillStyle(color, coreAlpha);
    graphics.fillCircle(x, y, radius);
  },

  drawRect(graphics, x, y, w, h, color, coreAlpha = 1.0) {
    const pad = 4;
    graphics.fillStyle(color, coreAlpha * 0.1);
    graphics.fillRect(x - pad * 2, y - pad * 2, w + pad * 4, h + pad * 4);
    graphics.fillStyle(color, coreAlpha * 0.2);
    graphics.fillRect(x - pad, y - pad, w + pad * 2, h + pad * 2);
    graphics.fillStyle(color, coreAlpha);
    graphics.fillRect(x, y, w, h);
  },

  strokeRect(graphics, x, y, w, h, color, lineWidth = 1, coreAlpha = 1.0) {
    graphics.lineStyle(lineWidth + 4, color, coreAlpha * 0.1);
    graphics.strokeRect(x - 2, y - 2, w + 4, h + 4);
    graphics.lineStyle(lineWidth + 2, color, coreAlpha * 0.25);
    graphics.strokeRect(x - 1, y - 1, w + 2, h + 2);
    graphics.lineStyle(lineWidth, color, coreAlpha);
    graphics.strokeRect(x, y, w, h);
  },

  strokeLine(graphics, x1, y1, x2, y2, color, lineWidth = 1, coreAlpha = 1.0) {
    const line = new Phaser.Geom.Line(x1, y1, x2, y2);
    graphics.lineStyle(lineWidth + 3, color, coreAlpha * 0.1);
    graphics.strokeLineShape(line);
    graphics.lineStyle(lineWidth + 1, color, coreAlpha * 0.3);
    graphics.strokeLineShape(line);
    graphics.lineStyle(lineWidth, color, coreAlpha);
    graphics.strokeLineShape(line);
  },

  cornerAccents(graphics, x, y, w, h, size, color, lineWidth = 2) {
    const draw = (cx, cy, dx, dy) => {
      graphics.lineStyle(lineWidth + 2, color, 0.15);
      graphics.beginPath();
      graphics.moveTo(cx + dx * size, cy);
      graphics.lineTo(cx, cy);
      graphics.lineTo(cx, cy + dy * size);
      graphics.strokePath();
      graphics.lineStyle(lineWidth, color, 0.9);
      graphics.beginPath();
      graphics.moveTo(cx + dx * size, cy);
      graphics.lineTo(cx, cy);
      graphics.lineTo(cx, cy + dy * size);
      graphics.strokePath();
    };
    draw(x, y, 1, 1);
    draw(x + w, y, -1, 1);
    draw(x, y + h, 1, -1);
    draw(x + w, y + h, -1, -1);
  },

  applyTextGlow(scene, textObj, color) {
    const hex = '#' + color.toString(16).padStart(6, '0');
    textObj.setStyle({
      ...textObj.style,
      shadow: {
        offsetX: 0, offsetY: 0,
        color: hex, blur: 8, stroke: true, fill: true,
      }
    });
  },
};

export default NeonGlow;
