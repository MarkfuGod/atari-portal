import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS, COIN_CONFIG } from '../config.js';
import { GameManager } from '../core/GameManager.js';
import SFX from '../core/SFXManager.js';
import NeonGlow from '../vfx/NeonGlow.js';
import { getVisualStyle, isModernistStyle, getFonts } from '../core/VisualStyle.js';

const cyan = '#00f0ff';
const magenta = '#ff00e6';
const green = '#39ff14';

export class PauseScene extends Phaser.Scene {
  constructor() {
    super('PauseScene');
  }

  create(data) {
    this.visualStyle = getVisualStyle();
    this.palette = this.visualStyle.palette;
    this.modernist = isModernistStyle();
    this.parentScene = data.parentScene || null;
    this.scene.bringToTop();

    if (this.modernist) {
      this._createModernist();
    } else {
      this._createNeon();
    }

    this.refreshShop();

    this.input.keyboard.on('keydown-ESC', () => this.resumeGame());
    this.input.keyboard.on('keydown-P', () => this.resumeGame());
    this.input.keyboard.on('keydown-N', () => this.skipGame());
  }

  // ─────────────────────────────────────────────────────────────
  //  Modernist paper-poster pause card (matches visual bible)
  // ─────────────────────────────────────────────────────────────
  _createModernist() {
    const p = this.palette;
    const css = this.visualStyle.css;
    const f = this.visualStyle.fonts || getFonts();

    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, p.terminal, 0.78);

    const panelW = 460;
    const panelH = 430;
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;
    const panelLeft = cx - panelW / 2;
    const panelTop = cy - panelH / 2;
    const panelRight = panelLeft + panelW;
    const panelBottom = panelTop + panelH;

    const card = this.add.graphics();

    card.fillStyle(p.paper, 0.97);
    card.fillRect(panelLeft, panelTop, panelW, panelH);

    card.fillStyle(p.paperDark, 0.18);
    for (let i = 0; i < 220; i++) {
      const gx = panelLeft + 4 + (i * 53) % (panelW - 8);
      const gy = panelTop + 6 + Math.floor(i * 29) % (panelH - 12);
      card.fillRect(gx, gy, 1, 1);
    }

    card.fillStyle(p.vermilion, 1);
    card.fillRect(panelLeft, panelTop, panelW, 6);
    card.fillStyle(p.ink, 1);
    card.fillRect(panelLeft, panelTop + 6, panelW, 1);
    card.fillStyle(p.vermilion, 1);
    card.fillRect(panelLeft, panelBottom - 3, panelW, 3);

    card.lineStyle(1, p.ink, 0.55);
    card.strokeRect(panelLeft, panelTop, panelW, panelH);

    const tickLen = 10;
    card.lineStyle(1.5, p.vermilion, 1);
    [[panelLeft, panelTop], [panelRight, panelTop], [panelLeft, panelBottom], [panelRight, panelBottom]].forEach(([tx, ty], i) => {
      const sx = i % 2 === 0 ? 1 : -1;
      const sy = i < 2 ? 1 : -1;
      card.lineBetween(tx, ty, tx + tickLen * sx, ty);
      card.lineBetween(tx, ty, tx, ty + tickLen * sy);
    });

    this.add.text(panelLeft + 14, panelTop + 16, '> SYS', {
      fontSize: '9px', fontFamily: f.mono, color: css.muted,
    }).setDepth(2);
    this.add.text(panelRight - 14, panelTop + 16, 'AP-04 / PAUSE', {
      fontSize: '9px', fontFamily: f.mono, color: css.muted,
    }).setOrigin(1, 0).setDepth(2);

    this.add.text(cx, panelTop + 56, 'SYSTEM PAUSED', {
      fontSize: '30px', fontFamily: f.display, color: css.ink,
    }).setOrigin(0.5).setDepth(2);

    const ruleG = this.add.graphics().setDepth(2);
    ruleG.lineStyle(1, p.vermilion, 1);
    ruleG.lineBetween(cx - 90, panelTop + 84, cx + 90, panelTop + 84);

    const resumeY = panelTop + 116;
    const resumePip = this.add.graphics().setDepth(2);
    const drawResumePip = (color) => {
      resumePip.clear();
      resumePip.fillStyle(color, 1);
      resumePip.fillTriangle(cx - 92, resumeY - 7, cx - 92, resumeY + 7, cx - 80, resumeY);
    };
    drawResumePip(p.vermilion);
    const resume = this.add.text(cx - 70, resumeY, 'RESUME', {
      fontSize: '20px', fontFamily: f.display, color: css.ink,
    }).setOrigin(0, 0.5).setDepth(2);
    const resumeZone = this.add.zone(cx, resumeY, panelW - 60, 32).setOrigin(0.5).setDepth(3).setInteractive({ useHandCursor: true });
    resumeZone.on('pointerover', () => { resume.setColor(css.vermilion); drawResumePip(p.ink); SFX.menuSelect(); });
    resumeZone.on('pointerout', () => { resume.setColor(css.ink); drawResumePip(p.vermilion); });
    resumeZone.on('pointerdown', () => this.resumeGame());

    const sectionY = panelTop + 158;
    const sectionG = this.add.graphics().setDepth(2);
    sectionG.fillStyle(p.ink, 1);
    sectionG.fillRect(panelLeft + 24, sectionY - 6, 6, 12);
    this.add.text(panelLeft + 40, sectionY, 'SHOP', {
      fontSize: '12px', fontFamily: f.ui, color: css.ink, fontStyle: 'bold',
    }).setOrigin(0, 0.5).setDepth(2);
    this.add.text(panelRight - 24, sectionY, '02 / RESOURCES', {
      fontSize: '8px', fontFamily: f.mono, color: css.muted,
    }).setOrigin(1, 0.5).setDepth(2);
    sectionG.lineStyle(1, p.ink, 0.32);
    sectionG.lineBetween(panelLeft + 110, sectionY, panelRight - 110, sectionY);

    const statsY = panelTop + 184;
    this.add.text(panelLeft + 40, statsY, 'COINS', {
      fontSize: '10px', fontFamily: f.mono, color: css.muted,
    }).setDepth(2);
    this.coinsLabel = this.add.text(panelLeft + 40, statsY + 12, '', {
      fontSize: '18px', fontFamily: f.display, color: css.mustard,
    }).setDepth(2);

    this.add.text(panelLeft + 150, statsY, 'LIVES', {
      fontSize: '10px', fontFamily: f.mono, color: css.muted,
    }).setDepth(2);
    this.livesLabel = this.add.text(panelLeft + 150, statsY + 12, '', {
      fontSize: '18px', fontFamily: f.display, color: css.vermilion,
    }).setDepth(2);

    const buyY = panelTop + 238;
    const buyG = this.add.graphics().setDepth(2);
    const drawBuyCard = (hover) => {
      buyG.clear();
      buyG.fillStyle(p.paperDark, hover ? 0.55 : 0.32);
      buyG.fillRect(panelLeft + 24, buyY - 18, panelW - 48, 36);
      buyG.fillStyle(p.green, 1);
      buyG.fillRect(panelLeft + 24, buyY - 18, 6, 36);
      buyG.lineStyle(1, p.ink, hover ? 0.7 : 0.35);
      buyG.strokeRect(panelLeft + 24, buyY - 18, panelW - 48, 36);
    };
    drawBuyCard(false);

    this.buyBtn = this.add.text(panelLeft + 40, buyY, `BUY +1 LIFE`, {
      fontSize: '13px', fontFamily: f.ui, color: css.ink, fontStyle: 'bold',
    }).setOrigin(0, 0.5).setDepth(3);
    this.buyCost = this.add.text(panelRight - 30, buyY, `${COIN_CONFIG.LIFE_COST} CR`, {
      fontSize: '13px', fontFamily: f.mono, color: css.mustard,
    }).setOrigin(1, 0.5).setDepth(3);

    const buyZone = this.add.zone(cx, buyY, panelW - 48, 38).setOrigin(0.5).setDepth(4).setInteractive({ useHandCursor: true });
    buyZone.on('pointerover', () => { drawBuyCard(true); SFX.menuSelect(); });
    buyZone.on('pointerout', () => drawBuyCard(false));
    buyZone.on('pointerdown', () => this.buyLife());

    this.feedbackText = this.add.text(cx, panelTop + 278, '', {
      fontSize: '10px', fontFamily: f.mono, color: css.muted,
    }).setOrigin(0.5).setDepth(3);

    const navY1 = panelTop + 322;
    const navY2 = panelTop + 354;

    const drawArrow = (g, ax, ay, color) => {
      g.clear();
      g.lineStyle(1.5, color, 1);
      g.lineBetween(ax, ay, ax + 11, ay);
      g.lineBetween(ax + 7, ay - 4, ax + 11, ay);
      g.lineBetween(ax + 7, ay + 4, ax + 11, ay);
    };

    const skipArrow = this.add.graphics().setDepth(2);
    drawArrow(skipArrow, panelLeft + 24, navY1, p.mustard);
    const skip = this.add.text(panelLeft + 46, navY1, 'SKIP GAME', {
      fontSize: '14px', fontFamily: f.ui, color: css.ink,
    }).setOrigin(0, 0.5).setDepth(2);
    this.add.text(panelRight - 24, navY1, '[N]', {
      fontSize: '10px', fontFamily: f.mono, color: css.muted,
    }).setOrigin(1, 0.5).setDepth(2);
    const skipZone = this.add.zone(cx, navY1, panelW - 48, 22).setOrigin(0.5).setDepth(3).setInteractive({ useHandCursor: true });
    skipZone.on('pointerover', () => { skip.setColor(css.mustard); drawArrow(skipArrow, panelLeft + 24, navY1, p.vermilion); SFX.menuSelect(); });
    skipZone.on('pointerout', () => { skip.setColor(css.ink); drawArrow(skipArrow, panelLeft + 24, navY1, p.mustard); });
    skipZone.on('pointerdown', () => this.skipGame());

    const quitArrow = this.add.graphics().setDepth(2);
    drawArrow(quitArrow, panelLeft + 24, navY2, p.vermilion);
    const quit = this.add.text(panelLeft + 46, navY2, 'DISCONNECT', {
      fontSize: '14px', fontFamily: f.ui, color: css.vermilion,
    }).setOrigin(0, 0.5).setDepth(2);
    this.add.text(panelRight - 24, navY2, '[X]', {
      fontSize: '10px', fontFamily: f.mono, color: css.muted,
    }).setOrigin(1, 0.5).setDepth(2);
    const quitZone = this.add.zone(cx, navY2, panelW - 48, 22).setOrigin(0.5).setDepth(3).setInteractive({ useHandCursor: true });
    quitZone.on('pointerover', () => { quit.setColor(css.ink); drawArrow(quitArrow, panelLeft + 24, navY2, p.ink); SFX.menuSelect(); });
    quitZone.on('pointerout', () => { quit.setColor(css.vermilion); drawArrow(quitArrow, panelLeft + 24, navY2, p.vermilion); });
    quitZone.on('pointerdown', () => this.returnToMenu());

    this.add.text(cx, panelBottom - 18, 'ESC / P  RESUME    ·    N  SKIP    ·    X  DISCONNECT', {
      fontSize: '8px', fontFamily: f.mono, color: css.muted,
    }).setOrigin(0.5).setDepth(2);

    this.input.keyboard.on('keydown-X', () => this.returnToMenu());
  }

  // ─────────────────────────────────────────────────────────────
  //  Neon panel (unchanged behavior, now also 16:9-aware)
  // ─────────────────────────────────────────────────────────────
  _createNeon() {
    const f = this.visualStyle.fonts || getFonts();
    const panelW = 460;
    const panelH = 430;
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;
    const panelLeft = cx - panelW / 2;
    const panelTop = cy - panelH / 2;

    this.add.rectangle(cx, cy, GAME_WIDTH, GAME_HEIGHT, this.palette.terminal, 0.85);

    const borderG = this.add.graphics();
    NeonGlow.strokeRect(borderG, panelLeft, panelTop, panelW, panelH, COLORS.NEON_CYAN, 1, 0.4);
    NeonGlow.cornerAccents(borderG, panelLeft, panelTop, panelW, panelH, 15, COLORS.NEON_CYAN, 2);

    const title = this.add.text(cx, panelTop + 40, 'SYSTEM PAUSED', {
      fontSize: '32px', fontFamily: f.display, color: cyan,
    }).setOrigin(0.5);
    NeonGlow.applyTextGlow(this, title, COLORS.NEON_CYAN);

    const resume = this.add.text(cx, panelTop + 110, '> RESUME', {
      fontSize: '18px', fontFamily: f.ui, color: magenta,
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    resume.on('pointerover', () => resume.setColor(cyan));
    resume.on('pointerout', () => resume.setColor(magenta));
    resume.on('pointerdown', () => this.resumeGame());

    this.add.text(cx, panelTop + 170, '// SHOP', {
      fontSize: '15px', fontFamily: f.display, color: '#555577',
    }).setOrigin(0.5);

    this.coinsLabel = this.add.text(cx, panelTop + 200, '', {
      fontSize: '14px', fontFamily: f.mono, color: '#ffd700',
    }).setOrigin(0.5);

    this.livesLabel = this.add.text(cx, panelTop + 225, '', {
      fontSize: '13px', fontFamily: f.mono, color: '#ff2d7b',
    }).setOrigin(0.5);

    this.buyBtn = this.add.text(cx, panelTop + 265, `> BUY +1 LIFE (${COIN_CONFIG.LIFE_COST} coins)`, {
      fontSize: '15px', fontFamily: f.ui, color: green,
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    this.buyBtn.on('pointerover', () => this.buyBtn.setColor('#ffffff'));
    this.buyBtn.on('pointerout', () => this.updateBuyColor());
    this.buyBtn.on('pointerdown', () => this.buyLife());

    this.feedbackText = this.add.text(cx, panelTop + 295, '', {
      fontSize: '12px', fontFamily: f.mono, color: '#666688',
    }).setOrigin(0.5);

    const skip = this.add.text(cx, panelTop + 340, '> SKIP GAME  [N]', {
      fontSize: '16px', fontFamily: f.ui, color: '#ff6e00',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    skip.on('pointerover', () => skip.setColor('#ffffff'));
    skip.on('pointerout', () => skip.setColor('#ff6e00'));
    skip.on('pointerdown', () => this.skipGame());

    const quit = this.add.text(cx, panelTop + 375, '> DISCONNECT', {
      fontSize: '16px', fontFamily: f.ui, color: '#ff1744',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    quit.on('pointerover', () => quit.setColor('#ffffff'));
    quit.on('pointerout', () => quit.setColor('#ff1744'));
    quit.on('pointerdown', () => this.returnToMenu());

    this.add.text(cx, panelTop + 405, 'ESC/P: resume  |  N: skip game', {
      fontSize: '10px', fontFamily: f.mono, color: '#333355',
    }).setOrigin(0.5);
  }

  refreshShop() {
    const s = GameManager.state;
    if (this.coinsLabel) this.coinsLabel.setText(this.modernist ? String(s.coins).padStart(3, '0') : `COINS: ${s.coins}`);
    if (this.livesLabel) this.livesLabel.setText(this.modernist ? String(s.lives).padStart(2, '0') : `LIVES: ${s.lives}`);
    this.updateBuyColor();
  }

  updateBuyColor() {
    if (!this.buyBtn) return;
    const canBuy = GameManager.state.coins >= COIN_CONFIG.LIFE_COST;
    if (this.modernist) {
      this.buyBtn.setColor(canBuy ? this.visualStyle.css.ink : this.visualStyle.css.muted);
      if (this.buyCost) this.buyCost.setColor(canBuy ? this.visualStyle.css.mustard : this.visualStyle.css.muted);
    } else {
      this.buyBtn.setColor(canBuy ? green : '#555555');
    }
  }

  buyLife() {
    const css = this.visualStyle.css;
    if (GameManager.buyLife()) {
      SFX.shopBuy();
      this.feedbackText.setText('+1 LIFE INSTALLED');
      this.feedbackText.setColor(this.modernist ? css.green : green);
    } else {
      SFX.shopFail();
      this.feedbackText.setText('INSUFFICIENT CREDITS');
      this.feedbackText.setColor(this.modernist ? css.vermilion : '#ff1744');
    }
    this.refreshShop();

    const hud = this.scene.get('HUDScene');
    if (hud) {
      hud.updateLives(GameManager.state.lives);
      hud.updateCoins(GameManager.state.coins);
    }

    this.time.delayedCall(1500, () => {
      if (this.feedbackText) this.feedbackText.setText('');
    });
  }

  returnToMenu() {
    SFX.menuSelect();
    if (this.parentScene) this.scene.stop(this.parentScene);
    this.scene.stop('HUDScene');
    this.scene.stop('CRTOverlay');
    this.scene.start('MenuScene');
  }

  skipGame() {
    SFX.menuSelect();
    if (this.parentScene) this.scene.stop(this.parentScene);

    try { GameManager.mutationSystem.cleanupScene(this.scene.get(this.parentScene)); } catch (_) {}
    try { this.scene.sleep('HUDScene'); } catch (_) {}
    try { this.scene.sleep('CRTOverlay'); } catch (_) {}

    const nextScene = GameManager.advanceToNextGame();

    if (GameManager.storyComplete) {
      this.scene.start('VictoryScene');
    } else {
      this.scene.start('ModSelectScene', { from: this.parentScene, to: nextScene });
    }
  }

  resumeGame() {
    SFX.unpause();
    if (this.parentScene) this.scene.resume(this.parentScene);
    this.scene.stop();
  }
}
