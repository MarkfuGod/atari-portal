import Phaser from 'phaser';
import { BaseGameScene } from '../BaseGameScene.js';
import { GAME_WIDTH, GAME_HEIGHT, COLORS } from '../../config.js';
import { GameManager } from '../../core/GameManager.js';
import SFX from '../../core/SFXManager.js';

const TOP_Y = 28;
const LANE_H = 44;
const HOP_X = 40;
const HOP_COOLDOWN = 150;
const LILY_POSITIONS = [80, 240, 400, 560, 720];
const PORTAL_THRESHOLD = 3;

function laneCenter(row) {
  return TOP_Y + row * LANE_H + LANE_H / 2;
}

export class FroggerScene extends BaseGameScene {
  constructor() {
    super('FroggerScene', 'frogger');
  }

  create() {
    super.create();

    this.lastHopTime = 0;
    this.frogRow = 12;
    this.highestRow = 12;
    this.filledCount = 0;
    this.dead = false;

    this.drawLanes();
    this.createLilyPads();
    this.createCars();
    this.createLogs();
    this.createFrog();
    this.setupInput();
  }

  drawLanes() {
    const g = this.add.graphics();

    g.fillStyle(0x0a1a3a);
    g.fillRect(0, TOP_Y, GAME_WIDTH, LANE_H * 6);

    g.fillStyle(0x0a2a1e);
    g.fillRect(0, TOP_Y + 6 * LANE_H, GAME_WIDTH, LANE_H);

    g.fillStyle(0x1a1a2a);
    g.fillRect(0, TOP_Y + 7 * LANE_H, GAME_WIDTH, LANE_H * 5);

    g.fillStyle(0x333355);
    for (let r = 7; r < 11; r++) {
      const lineY = TOP_Y + (r + 1) * LANE_H;
      for (let x = 0; x < GAME_WIDTH; x += 40) {
        g.fillRect(x, lineY - 1, 20, 2);
      }
    }

    g.fillStyle(0x0a2a1e);
    g.fillRect(0, TOP_Y + 12 * LANE_H, GAME_WIDTH, LANE_H);
  }

  createLilyPads() {
    this.pads = LILY_POSITIONS.map(x => {
      const pad = this.add.image(x, laneCenter(0), 'lilypad').setDepth(1);
      pad.filled = false;
      pad.isPortal = false;
      return pad;
    });
  }

  createCars() {
    this.cars = [];
    const lanes = [
      { row: 7,  speed: 96,  dir: 1,  count: 3, tex: 'car-red' },
      { row: 8,  speed: 120, dir: -1, count: 3, tex: 'car-blue' },
      { row: 9,  speed: 72,  dir: 1,  count: 4, tex: 'car-yellow' },
      { row: 10, speed: 144, dir: -1, count: 2, tex: 'car-red' },
      { row: 11, speed: 108, dir: 1,  count: 3, tex: 'car-blue' },
    ];
    for (const lane of lanes) {
      const gap = GAME_WIDTH / lane.count;
      for (let i = 0; i < lane.count; i++) {
        const car = this.add.image(gap * i + gap / 2, laneCenter(lane.row), lane.tex).setDepth(2);
        car.speed = lane.speed * lane.dir;
        car.setFlipX(lane.dir < 0);
        this.cars.push(car);
      }
    }
  }

  createLogs() {
    this.logs = [];
    const lanes = [
      { row: 1, speed: 50,  dir: 1,  count: 3, wide: false },
      { row: 2, speed: 70,  dir: -1, count: 2, wide: true },
      { row: 3, speed: 40,  dir: 1,  count: 3, wide: false },
      { row: 4, speed: 60,  dir: -1, count: 2, wide: true },
      { row: 5, speed: 55,  dir: 1,  count: 3, wide: false },
    ];
    for (const lane of lanes) {
      const gap = GAME_WIDTH / lane.count;
      for (let i = 0; i < lane.count; i++) {
        const log = this.add.image(gap * i + gap / 2, laneCenter(lane.row), 'log').setDepth(1);
        if (lane.wide) log.setScale(2, 1);
        log.speed = lane.speed * lane.dir;
        log.row = lane.row;
        log.halfW = lane.wide ? 64 : 32;
        this.logs.push(log);
      }
    }
  }

  createFrog() {
    this.frog = this.add.image(GAME_WIDTH / 2, laneCenter(12), 'frog').setDepth(5);
  }

  setupInput() {
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keyW = this.input.keyboard.addKey('W');
    this.keyA = this.input.keyboard.addKey('A');
    this.keyS = this.input.keyboard.addKey('S');
    this.keyD = this.input.keyboard.addKey('D');
  }

  update(time, delta) {
    super.update(time, delta);
    if (this.dead) return;

    const dt = delta / 1000;
    this.moveCars(dt);
    this.moveLogs(dt);
    this.applyLogRiding(dt);
    this.handleInput(time);
    this.checkDangers();
    this.setPlayerPosition(this.frog.x, this.frog.y);
    this.powerUps.checkCollection(this.frog.x, this.frog.y);
    this.glitch.checkDataLeakCollection(this.frog.x, this.frog.y);
    this.tryEnterPortal(this.frog.x, this.frog.y);
  }

  moveCars(dt) {
    if (this.enemiesFrozen || this.powerUps.hasEffect('freeze')) return;
    for (const car of this.cars) {
      car.x += car.speed * dt * this.gameSpeed;
      if (car.speed > 0 && car.x > GAME_WIDTH + 40) car.x = -40;
      else if (car.speed < 0 && car.x < -40) car.x = GAME_WIDTH + 40;
    }
  }

  moveLogs(dt) {
    for (const log of this.logs) {
      log.x += log.speed * dt * this.gameSpeed;
      const edge = log.halfW + 20;
      if (log.speed > 0 && log.x > GAME_WIDTH + edge) log.x = -edge;
      else if (log.speed < 0 && log.x < -edge) log.x = GAME_WIDTH + edge;
    }
  }

  applyLogRiding(dt) {
    if (this.frogRow < 1 || this.frogRow > 5) return;
    const log = this.findLog();
    if (log) this.frog.x += log.speed * dt * this.gameSpeed;
  }

  findLog() {
    for (const log of this.logs) {
      if (log.row === this.frogRow && Math.abs(this.frog.x - log.x) < log.halfW) {
        return log;
      }
    }
    return null;
  }

  handleInput(time) {
    if (time - this.lastHopTime < HOP_COOLDOWN) return;

    let dx = 0;
    let dy = 0;
    const { JustDown } = Phaser.Input.Keyboard;

    const inv = this.controlInverted;
    if (JustDown(this.cursors.up) || JustDown(this.keyW)) dy = inv ? 1 : -1;
    else if (JustDown(this.cursors.down) || JustDown(this.keyS)) dy = inv ? -1 : 1;
    else if (JustDown(this.cursors.left) || JustDown(this.keyA)) dx = inv ? 1 : -1;
    else if (JustDown(this.cursors.right) || JustDown(this.keyD)) dx = inv ? -1 : 1;

    if (dx === 0 && dy === 0) return;

    const newX = Phaser.Math.Clamp(this.frog.x + dx * HOP_X, HOP_X / 2, GAME_WIDTH - HOP_X / 2);
    const newRow = Phaser.Math.Clamp(this.frogRow + dy, 0, 12);

    if (newRow === this.frogRow && Math.abs(newX - this.frog.x) < 1) return;

    this.frog.x = newX;
    this.lastHopTime = time;

    SFX.hop();

    if (newRow !== this.frogRow) {
      const movedForward = newRow < this.frogRow;
      this.frogRow = newRow;
      this.frog.y = laneCenter(newRow);

      if (movedForward) {
        this.score.award('hop');
        if (newRow < this.highestRow) {
          this.score.award('lane');
          this.highestRow = newRow;
        }
      }
    }

    if (this.frogRow === 0) this.checkLilyPad();
  }

  checkLilyPad() {
    for (const pad of this.pads) {
      if (pad.filled) continue;
      if (Math.abs(this.frog.x - pad.x) < 30) {
        if (pad.isPortal) {
          this.frog.setPosition(pad.x, pad.y);
          this.triggerPortal(pad.x, pad.y);
          return;
        }

        pad.filled = true;
        this.filledCount++;
        this.score.award('home');
        SFX.frogHome();
        this.add.image(pad.x, pad.y, 'frog').setDepth(3);

        if (this.filledCount >= PORTAL_THRESHOLD) this.spawnPortalPad();
        this.respawnFrog();
        return;
      }
    }
    this.die();
  }

  spawnPortalPad() {
    const pad = this.pads.find(p => !p.filled && !p.isPortal);
    if (pad) {
      pad.isPortal = true;
      pad.setTexture('lilypad-portal');
    }
  }

  checkDangers() {
    if (this.frogRow >= 1 && this.frogRow <= 5) {
      if (!this.findLog() || this.frog.x < -20 || this.frog.x > GAME_WIDTH + 20) {
        SFX.splash();
        this.die();
        return;
      }
    }

    if (this.frogRow >= 7 && this.frogRow <= 11) {
      for (const car of this.cars) {
        if (Math.abs(this.frog.y - car.y) < LANE_H * 0.5 && Math.abs(this.frog.x - car.x) < 28) {
          SFX.splat();
          this.die();
          return;
        }
      }
    }
  }

  die() {
    if (this.dead) return;
    this.dead = true;
    this.frog.setVisible(false);
    const alive = this.onPlayerDeath();
    if (alive) {
      this.time.delayedCall(500, () => {
        this.respawnFrog();
        this.dead = false;
      });
    }
  }

  showPortalHint() {
    this._showHintText('▸ HOP ONTO THE GLOWING LILY PAD ▸');
  }

  respawnFrog() {
    this.frogRow = 12;
    this.highestRow = 12;
    this.frog.setPosition(GAME_WIDTH / 2, laneCenter(12));
    this.frog.setVisible(true);
  }
}
