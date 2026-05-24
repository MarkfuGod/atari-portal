import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS } from '../config.js';
import { GameManager } from '../core/GameManager.js';
import SFX from '../core/SFXManager.js';
import NeonGlow from '../vfx/NeonGlow.js';
import AudioBackground from '../vfx/AudioBackground.js';
import { cssColor, getVisualStyle, isModernistStyle, getFonts } from '../core/VisualStyle.js';

const cyan = '#00f0ff';
const magenta = '#ff00e6';
const green = '#39ff14';

export class ModSelectScene extends Phaser.Scene {
  constructor() {
    super('ModSelectScene');
  }

  create(data) {
    this.visualStyle = getVisualStyle();
    this.palette = this.visualStyle.palette;
    this.modernist = isModernistStyle();
    this.fonts = this.visualStyle.fonts || getFonts();
    this.toScene = data.to;
    this.fromScene = data.from;
    this._sleepOverlay('HUDScene');
    this._sleepOverlay('CRTOverlay');
    this.scene.bringToTop();
    this.cameras.main.setBackgroundColor(this.palette.terminal);
    this.cameras.main.fadeIn(400);
    AudioBackground.setScene('ModSelectScene');

    this.drawGridBackground();

    const title = this.add.text(GAME_WIDTH / 2, 60, 'MOD SELECT', {
      fontSize: this.modernist ? '32px' : '32px',
      fontFamily: this.fonts.display,
      color: this.modernist ? this.visualStyle.css.paper : cyan,
    }).setOrigin(0.5);
    if (!this.modernist) NeonGlow.applyTextGlow(this, title, COLORS.NEON_CYAN);

    this.add.text(GAME_WIDTH / 2, 95, 'Choose an upgrade for your run', {
      fontSize: '12px',
      fontFamily: this.fonts.ui,
      color: this.modernist ? this.visualStyle.css.muted : '#555577',
    }).setOrigin(0.5);

    const modSystem = GameManager.modSystem;
    const choices = modSystem.getRandomChoices(3);
    const forcedModId = GameManager.consumeNextModCheat();
    if (forcedModId) {
      const forcedMod = modSystem.getModById(forcedModId);
      const alreadyOwned = forcedMod && modSystem.hasMod(forcedMod.id);
      if (forcedMod && !alreadyOwned) {
        const existingIdx = choices.findIndex(choice => choice.id === forcedMod.id);
        if (existingIdx > 0) {
          choices.splice(existingIdx, 1);
          choices.unshift(forcedMod);
        } else if (existingIdx < 0) {
          choices.pop();
          choices.unshift(forcedMod);
        }
      }
    }

    const cardWidth = 200;
    const cardHeight = 220;
    const spacing = 30;
    const totalWidth = choices.length * cardWidth + (choices.length - 1) * spacing;
    const startX = (GAME_WIDTH - totalWidth) / 2;

    choices.forEach((mod, i) => {
      const cx = startX + i * (cardWidth + spacing) + cardWidth / 2;
      const cy = 280;

      this.createModCard(cx, cy, cardWidth, cardHeight, mod);
    });

    const skipBtn = this.add.text(GAME_WIDTH / 2, 480, '> SKIP', {
      fontSize: '15px',
      fontFamily: this.fonts.ui,
      color: this.modernist ? this.visualStyle.css.paper : '#555577',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    skipBtn.on('pointerover', () => skipBtn.setColor(this.modernist ? this.visualStyle.css.vermilion : cyan));
    skipBtn.on('pointerout', () => skipBtn.setColor(this.modernist ? this.visualStyle.css.paper : '#555577'));
    skipBtn.on('pointerdown', () => this.proceed());

    this.drawActiveMods();
  }

  createModCard(cx, cy, w, h, mod) {
    const p = this.palette;
    const css = this.visualStyle.css;
    const modernist = this.modernist;
    const g = this.add.graphics();
    g.fillStyle(modernist ? p.paper : COLORS.HUD_BG, modernist ? 0.96 : 0.9);
    g.fillRect(cx - w / 2, cy - h / 2, w, h);
    if (modernist) {
      g.lineStyle(1, p.paperDark, 0.95);
      g.strokeRect(cx - w / 2, cy - h / 2, w, h);
    } else {
      NeonGlow.strokeRect(g, cx - w / 2, cy - h / 2, w, h, COLORS.NEON_CYAN, 1, 0.4);
    }

    const categoryColors = modernist
      ? {
        offensive: p.vermilion,
        defensive: p.blue,
        utility: p.green,
        chaos: p.violet,
      }
      : {
        offensive: COLORS.NEON_RED,
        defensive: COLORS.NEON_BLUE,
        utility: COLORS.NEON_GREEN,
        chaos: COLORS.NEON_MAGENTA,
      };
    const catColor = categoryColors[mod.category] || COLORS.NEON_CYAN;
    const catHex = cssColor(catColor);

    if (modernist) {
      g.fillStyle(catColor, 1);
      g.fillRect(cx - w / 2, cy - h / 2, w, 8);
      g.fillRect(cx - w / 2, cy - h / 2, 22, h);
    }

    const f = this.fonts;
    this.add.text(cx, cy - h / 2 + 20, mod.category.toUpperCase(), {
      fontSize: '10px', fontFamily: f.ui, color: catHex,
    }).setOrigin(0.5);

    try {
      this.add.image(cx, cy - 20, mod.icon).setDisplaySize(32, 32).setTint(catColor);
    } catch (_) {}

    const nameText = this.add.text(cx, cy + 20, mod.name, {
      fontSize: '16px',
      fontFamily: f.display,
      color: modernist ? css.ink : '#ffffff',
    }).setOrigin(0.5);
    if (!modernist) NeonGlow.applyTextGlow(this, nameText, catColor);

    this.add.text(cx, cy + 50, mod.description, {
      fontSize: '10px',
      fontFamily: f.mono,
      color: modernist ? '#4f4a3f' : '#888899',
      wordWrap: { width: w - 20 },
      align: 'center',
    }).setOrigin(0.5);

    const hitArea = this.add.rectangle(cx, cy, w, h, 0x000000, 0)
      .setInteractive({ useHandCursor: true });

    hitArea.on('pointerover', () => {
      g.clear();
      g.fillStyle(modernist ? p.paper : COLORS.HUD_BG, modernist ? 1 : 0.9);
      g.fillRect(cx - w / 2, cy - h / 2, w, h);
      if (modernist) {
        g.fillStyle(catColor, 1);
        g.fillRect(cx - w / 2, cy - h / 2, w, 8);
        g.fillRect(cx - w / 2, cy - h / 2, 30, h);
        g.lineStyle(2, catColor, 1);
        g.strokeRect(cx - w / 2, cy - h / 2, w, h);
        nameText.setColor(catHex);
      } else {
        NeonGlow.strokeRect(g, cx - w / 2, cy - h / 2, w, h, catColor, 2, 0.8);
      }
    });

    hitArea.on('pointerout', () => {
      g.clear();
      g.fillStyle(modernist ? p.paper : COLORS.HUD_BG, modernist ? 0.96 : 0.9);
      g.fillRect(cx - w / 2, cy - h / 2, w, h);
      if (modernist) {
        g.fillStyle(catColor, 1);
        g.fillRect(cx - w / 2, cy - h / 2, w, 8);
        g.fillRect(cx - w / 2, cy - h / 2, 22, h);
        g.lineStyle(1, p.paperDark, 0.95);
        g.strokeRect(cx - w / 2, cy - h / 2, w, h);
        nameText.setColor(css.ink);
      } else {
        NeonGlow.strokeRect(g, cx - w / 2, cy - h / 2, w, h, COLORS.NEON_CYAN, 1, 0.4);
      }
    });

    hitArea.on('pointerdown', () => {
      SFX.shopBuy();
      this.selectMod(mod);
    });
  }

  selectMod(mod) {
    const result = GameManager.modSystem.addMod(mod);
    if (result && result.immediate === 'extra_life') {
      GameManager.state.lives++;
    }
    this.proceed();
  }

  proceed() {
    this.cameras.main.fadeOut(300, 10, 10, 26);
    this.time.delayedCall(350, () => {
      this.scene.start('TransitionScene', { from: this.fromScene, to: this.toScene });
    });
  }

  drawActiveMods() {
    const mods = GameManager.modSystem.activeMods;
    if (mods.length === 0) return;

    this.add.text(GAME_WIDTH / 2, 520, 'ACTIVE MODS:', {
      fontSize: '10px',
      fontFamily: this.fonts.ui,
      color: this.modernist ? this.visualStyle.css.muted : '#444466',
    }).setOrigin(0.5);

    const names = mods.map(m => m.name).join(' | ');
    this.add.text(GAME_WIDTH / 2, 540, names, {
      fontSize: '11px',
      fontFamily: this.fonts.mono,
      color: this.modernist ? this.visualStyle.css.paper : '#666688',
    }).setOrigin(0.5);
  }

  _sleepOverlay(key) {
    try {
      if (this.scene.isActive(key)) {
        this.scene.sleep(key);
      }
    } catch (_) { /* safe */ }
  }

  drawGridBackground() {
    const g = this.add.graphics();
    if (this.modernist) {
      const p = this.palette;
      g.fillStyle(p.terminal, 1);
      g.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
      g.fillStyle(p.paper, 0.08);
      g.fillRect(28, 30, GAME_WIDTH - 56, GAME_HEIGHT - 72);
      g.lineStyle(1, p.faint, 0.48);
      for (let x = 40; x < GAME_WIDTH; x += 32) {
        g.lineBetween(x, 42, x, GAME_HEIGHT - 46);
      }
      for (let y = 48; y < GAME_HEIGHT - 46; y += 32) {
        g.lineBetween(40, y, GAME_WIDTH - 40, y);
      }
      g.lineStyle(2, p.vermilion, 0.9);
      g.lineBetween(52, 118, GAME_WIDTH - 52, 118);
      return;
    }

    g.lineStyle(1, COLORS.GRID_LINE, 0.2);
    for (let x = 0; x < GAME_WIDTH; x += 40) {
      g.strokeLineShape(new Phaser.Geom.Line(x, 0, x, GAME_HEIGHT));
    }
    for (let y = 0; y < GAME_HEIGHT; y += 40) {
      g.strokeLineShape(new Phaser.Geom.Line(0, y, GAME_WIDTH, y));
    }
  }
}
