import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS, GAME_ORDER, GAME_NAMES } from '../config.js';
import { GameManager } from '../core/GameManager.js';
import SFX from '../core/SFXManager.js';
import BGM from '../core/AudioManager.js';
import NeonGlow from '../vfx/NeonGlow.js';

const cyan = '#00f0ff';
const magenta = '#ff00e6';
const purple = '#b845ff';
const green = '#39ff14';

export class MenuScene extends Phaser.Scene {
  constructor() {
    super('MenuScene');
  }

  create() {
    this.cameras.main.fadeIn(500);
    this.cameras.main.setBackgroundColor(COLORS.BG_DARK);
    BGM.playForScene(this, 'MenuScene');
    this.levelSelectOpen = false;
    this.levelSelectItems = [];
    this.shopOpen = false;
    this.shopItems = [];

    const cx = GAME_WIDTH / 2;

    this.drawGridBackground();
    this.drawPortalDecor(cx, 210);
    this.drawDataStreams();

    const title = this.add.text(cx, 60, 'ATARI PORTAL', {
      fontSize: '44px', fontFamily: 'monospace', color: magenta,
    }).setOrigin(0.5).setDepth(10);
    NeonGlow.applyTextGlow(this, title, COLORS.NEON_MAGENTA);

    this.tweens.add({
      targets: title,
      alpha: { from: 0.7, to: 1 },
      duration: 1500, yoyo: true, repeat: -1,
    });

    const subtitle = this.add.text(cx, 115, 'SYSTEM BREACH DETECTED...', {
      fontSize: '13px', fontFamily: 'monospace', color: cyan,
    }).setOrigin(0.5).setAlpha(0).setDepth(10);

    this.typewriterEffect(subtitle, 'SYSTEM BREACH DETECTED...', 40);

    const versionText = this.add.text(cx, 138, 'v2.0 // CYBERPUNK EDITION', {
      fontSize: '10px', fontFamily: 'monospace', color: purple,
    }).setOrigin(0.5).setAlpha(0.5).setDepth(10);

    this.createButton(cx, 370, '> STORY MODE', () => this.startGame('story'));
    this.createButton(cx, 410, '> ARCADE MODE', () => this.startGame('arcade'));
    this.createButton(cx, 450, '> LEVEL SELECT', () => this.toggleLevelSelect());
    this.createButton(cx, 490, '> UPGRADES', () => this.openUpgradeShop());

    const hs = GameManager.getHighScore();
    if (hs > 0) {
      this.add.text(cx, 530, `BEST: ${String(hs).padStart(7, '0')}`, {
        fontSize: '13px', fontFamily: 'monospace', color: '#444466',
      }).setOrigin(0.5).setDepth(10);
    }

    this.add.text(cx, GAME_HEIGHT - 20, 'ARROWS/WASD: MOVE | SPACE: ACTION | H: HACK | N: SKIP | ESC: PAUSE', {
      fontSize: '10px', fontFamily: 'monospace', color: '#333355',
    }).setOrigin(0.5).setDepth(10);

    const borderG = this.add.graphics().setDepth(10);
    NeonGlow.cornerAccents(borderG, 10, 10, GAME_WIDTH - 20, GAME_HEIGHT - 20, 20, COLORS.NEON_CYAN, 1);
  }

  drawGridBackground() {
    const g = this.add.graphics();
    g.lineStyle(1, COLORS.GRID_LINE, 0.25);
    for (let x = 0; x < GAME_WIDTH; x += 40) {
      g.strokeLineShape(new Phaser.Geom.Line(x, 0, x, GAME_HEIGHT));
    }
    for (let y = 0; y < GAME_HEIGHT; y += 40) {
      g.strokeLineShape(new Phaser.Geom.Line(0, y, GAME_WIDTH, y));
    }
  }

  drawPortalDecor(cx, cy) {
    const g = this.add.graphics().setDepth(1);
    for (let i = 0; i < 3; i++) {
      const color = i % 2 === 0 ? COLORS.NEON_PURPLE : COLORS.NEON_CYAN;
      g.lineStyle(2 - i * 0.3, color, 0.2 - i * 0.04);
      g.strokeCircle(cx, cy, 30 + i * 18);
    }
    this.tweens.add({
      targets: g, angle: 360, duration: 12000, repeat: -1,
    });

    for (let i = 0; i < 20; i++) {
      const angle = (Math.PI * 2 * i) / 20;
      const r = 35 + Math.random() * 35;
      const color = [COLORS.NEON_CYAN, COLORS.NEON_MAGENTA, COLORS.NEON_PURPLE][i % 3];
      const p = this.add.circle(
        cx + Math.cos(angle) * r,
        cy + Math.sin(angle) * r,
        1 + Math.random() * 1.5,
        color, 0.4 + Math.random() * 0.4
      ).setDepth(1);
      this.tweens.add({
        targets: p,
        x: cx + Math.cos(angle + Math.PI) * (r + 15),
        y: cy + Math.sin(angle + Math.PI) * (r + 15),
        alpha: 0, duration: 3000 + Math.random() * 3000,
        yoyo: true, repeat: -1,
      });
    }
  }

  drawDataStreams() {
    const chars = '01';
    for (let col = 0; col < 3; col++) {
      const x = 30 + col * (GAME_WIDTH / 2 - 30) + Math.random() * 100;
      for (let i = 0; i < 6; i++) {
        const ch = chars[Math.floor(Math.random() * chars.length)];
        const txt = this.add.text(x, -10 - i * 16, ch, {
          fontSize: '12px', fontFamily: 'monospace',
          color: green,
        }).setAlpha(0.15).setDepth(0);
        this.tweens.add({
          targets: txt,
          y: GAME_HEIGHT + 10,
          alpha: { from: 0.15, to: 0 },
          duration: 6000 + Math.random() * 4000,
          delay: Math.random() * 5000 + i * 200,
          repeat: -1,
        });
      }
    }
  }

  typewriterEffect(textObj, fullText, charDelay) {
    let i = 0;
    textObj.setText('');
    textObj.setAlpha(1);
    this.time.addEvent({
      delay: charDelay,
      repeat: fullText.length - 1,
      callback: () => {
        i++;
        textObj.setText(fullText.substring(0, i));
      }
    });
  }

  createButton(x, y, label, callback) {
    const txt = this.add.text(x, y, label, {
      fontSize: '18px', fontFamily: 'monospace', color: '#ffffff',
    }).setOrigin(0.5).setDepth(10).setInteractive({ useHandCursor: true });

    txt.on('pointerover', () => {
      txt.setColor(cyan);
      NeonGlow.applyTextGlow(this, txt, COLORS.NEON_CYAN);
      SFX.menuSelect();
    });
    txt.on('pointerout', () => {
      txt.setColor('#ffffff');
      txt.setStyle({ ...txt.style, shadow: {} });
    });
    txt.on('pointerdown', callback);
    return txt;
  }

  toggleLevelSelect() {
    if (this.levelSelectOpen) {
      this.levelSelectItems.forEach(item => item.destroy());
      this.levelSelectItems = [];
      this.levelSelectOpen = false;
      return;
    }

    this.levelSelectOpen = true;
    const cx = GAME_WIDTH / 2;
    const panelH = GAME_ORDER.length * 30 + 60;
    const panelY = GAME_HEIGHT / 2;
    const topY = panelY - panelH / 2;

    const bg = this.add.rectangle(cx, panelY, 340, panelH, COLORS.HUD_BG, 0.95).setDepth(100);
    const borderG = this.add.graphics().setDepth(100);
    NeonGlow.strokeRect(borderG, cx - 170, topY, 340, panelH, COLORS.NEON_CYAN, 1, 0.4);
    this.levelSelectItems.push(bg, borderG);

    const header = this.add.text(cx, topY + 14, '// LEVEL SELECT', {
      fontSize: '13px', fontFamily: 'monospace', color: cyan,
    }).setOrigin(0.5).setDepth(101);
    this.levelSelectItems.push(header);

    GAME_ORDER.forEach((sceneKey, i) => {
      const name = GAME_NAMES[sceneKey];
      const y = topY + 40 + i * 30;
      const txt = this.add.text(cx, y, `${i + 1}. ${name}`, {
        fontSize: '13px', fontFamily: 'monospace', color: '#7777aa',
      }).setOrigin(0.5).setDepth(101).setInteractive({ useHandCursor: true });

      txt.on('pointerover', () => { txt.setColor(cyan); SFX.menuSelect(); });
      txt.on('pointerout', () => txt.setColor('#7777aa'));
      txt.on('pointerdown', () => this.startDebugGame(sceneKey, i));
      this.levelSelectItems.push(txt);
    });

    const closeBtn = this.add.text(cx, topY + panelH - 16, '> CLOSE', {
      fontSize: '12px', fontFamily: 'monospace', color: '#ff1744',
    }).setOrigin(0.5).setDepth(101).setInteractive({ useHandCursor: true });
    closeBtn.on('pointerdown', () => {
      this.levelSelectItems.forEach(item => item.destroy());
      this.levelSelectItems = [];
      this.levelSelectOpen = false;
    });
    this.levelSelectItems.push(closeBtn);
  }

  openUpgradeShop() {
    if (this.shopOpen) {
      this.shopItems.forEach(item => item.destroy());
      this.shopItems = [];
      this.shopOpen = false;
      return;
    }
    this.shopOpen = true;
    this.shopItems = [];

    const cx = GAME_WIDTH / 2;
    const bg = this.add.rectangle(cx, 350, 500, 280, COLORS.HUD_BG, 0.95).setDepth(100);
    const borderG = this.add.graphics().setDepth(100);
    NeonGlow.strokeRect(borderG, cx - 250, 210, 500, 280, COLORS.NEON_PURPLE, 1, 0.5);
    this.shopItems.push(bg, borderG);

    const title = this.add.text(cx, 225, '// PERMANENT UPGRADES', {
      fontSize: '14px', fontFamily: 'monospace', color: '#b845ff',
    }).setOrigin(0.5).setDepth(101);
    this.shopItems.push(title);

    const permCoins = GameManager.getPermanentCoins();
    const coinLabel = this.add.text(cx, 248, `CREDITS: ${permCoins}`, {
      fontSize: '12px', fontFamily: 'monospace', color: '#ffd700',
    }).setOrigin(0.5).setDepth(101);
    this.shopItems.push(coinLabel);

    const ups = GameManager.state.permanentUpgrades;
    const upgrades = [
      { key: 'startLives', name: '+1 START LIFE', cost: 50, max: 3, current: ups.startLives || 0 },
      { key: 'hackBoost', name: 'HACK CHARGE +20%', cost: 40, max: 5, current: ups.hackBoost || 0 },
      { key: 'modQuality', name: 'BETTER MODS', cost: 60, max: 3, current: ups.modQuality || 0 },
      { key: 'glitchResist', name: 'GLITCH RESIST', cost: 45, max: 3, current: ups.glitchResist || 0 },
    ];

    upgrades.forEach((up, i) => {
      const y = 280 + i * 38;
      const maxed = up.current >= up.max;
      const canAfford = permCoins >= up.cost;
      const color = maxed ? '#333355' : (canAfford ? '#39ff14' : '#555577');

      const label = this.add.text(cx - 180, y, `${up.name} [${up.current}/${up.max}]`, {
        fontSize: '12px', fontFamily: 'monospace', color: color,
      }).setDepth(101);
      this.shopItems.push(label);

      if (!maxed) {
        const btn = this.add.text(cx + 140, y, `[${up.cost} CR]`, {
          fontSize: '12px', fontFamily: 'monospace', color: canAfford ? '#39ff14' : '#444',
        }).setOrigin(0.5, 0).setDepth(101).setInteractive({ useHandCursor: canAfford });

        if (canAfford) {
          btn.on('pointerover', () => btn.setColor('#00f0ff'));
          btn.on('pointerout', () => btn.setColor('#39ff14'));
          btn.on('pointerdown', () => {
            if (GameManager.buyPermanentUpgrade(up.key, up.cost)) {
              SFX.shopBuy();
              this.shopItems.forEach(item => item.destroy());
              this.shopItems = [];
              this.shopOpen = false;
              this.openUpgradeShop();
            }
          });
        }
        this.shopItems.push(btn);
      }
    });

    // Achievements section
    const achTitle = this.add.text(cx, 440, '// CODEX', {
      fontSize: '11px', fontFamily: 'monospace', color: '#00f0ff',
    }).setOrigin(0.5).setDepth(101);
    this.shopItems.push(achTitle);

    const achSys = GameManager.achievementSystem;
    if (achSys) {
      const achText = this.add.text(cx, 460, `${achSys.totalUnlocked}/${achSys.totalAchievements} UNLOCKED`, {
        fontSize: '10px', fontFamily: 'monospace', color: '#555577',
      }).setOrigin(0.5).setDepth(101);
      this.shopItems.push(achText);
    }

    const closeBtn = this.add.text(cx, 485, '> CLOSE', {
      fontSize: '12px', fontFamily: 'monospace', color: '#ff1744',
    }).setOrigin(0.5).setDepth(101).setInteractive({ useHandCursor: true });
    closeBtn.on('pointerdown', () => {
      this.shopItems.forEach(item => item.destroy());
      this.shopItems = [];
      this.shopOpen = false;
    });
    this.shopItems.push(closeBtn);
  }

  startDebugGame(sceneKey, index) {
    SFX.menuStart();
    GameManager.reset();
    GameManager.state.mode = 'arcade';
    GameManager.state.currentGameIndex = index;
    GameManager.state.coins = 10;
    this.cameras.main.fadeOut(400, 10, 10, 26);
    this.time.delayedCall(400, () => {
      this.scene.launch('HUDScene');
      this.scene.launch('CRTOverlay');
      this.scene.start(sceneKey);
    });
  }

  startGame(mode) {
    SFX.menuStart();
    GameManager.reset();
    GameManager.state.mode = mode;
    this.cameras.main.fadeOut(400, 10, 10, 26);
    this.time.delayedCall(400, () => {
      this.scene.launch('HUDScene');
      this.scene.launch('CRTOverlay');
      this.scene.start(GameManager.currentSceneKey);
    });
  }
}
