const SFX = {
  _ctx: null,
  _master: null,
  _muted: false,

  init() {
    if (this._ctx) return;
    this._ctx = new (window.AudioContext || window.webkitAudioContext)();
    this._master = this._ctx.createGain();
    this._master.gain.value = 0.35;
    this._master.connect(this._ctx.destination);
  },

  resume() {
    if (this._ctx?.state === 'suspended') this._ctx.resume();
  },

  get muted() { return this._muted; },
  set muted(v) {
    this._muted = v;
    if (this._master) this._master.gain.value = v ? 0 : 0.35;
  },

  _osc(freq, duration, type = 'square', freqEnd = null, vol = 0.4, delay = 0) {
    if (!this._ctx) return;
    const t = this._ctx.currentTime + delay;
    const osc = this._ctx.createOscillator();
    const gain = this._ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (freqEnd !== null) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(freqEnd, 1), t + duration);
    }
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
    osc.connect(gain);
    gain.connect(this._master);
    osc.start(t);
    osc.stop(t + duration);
  },

  _noise(duration, vol = 0.3, delay = 0, filterFreq = null) {
    if (!this._ctx) return;
    const t = this._ctx.currentTime + delay;
    const sr = this._ctx.sampleRate;
    const len = sr * duration;
    const buf = this._ctx.createBuffer(1, len, sr);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;

    const src = this._ctx.createBufferSource();
    src.buffer = buf;
    const gain = this._ctx.createGain();
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

    if (filterFreq) {
      const filter = this._ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = filterFreq;
      src.connect(filter);
      filter.connect(gain);
    } else {
      src.connect(gain);
    }
    gain.connect(this._master);
    src.start(t);
    src.stop(t + duration);
  },

  // ── Glitch ──

  glitchStart() {
    this.resume();
    this._noise(0.2, 0.3, 0, 6000);
    this._osc(80, 0.15, 'sawtooth', 2000, 0.2);
    this._osc(2000, 0.1, 'square', 80, 0.15, 0.1);
  },

  // ── Portal ──

  portalAppear() {
    this.resume();
    for (let i = 0; i < 5; i++) {
      this._osc(300 + i * 120, 0.15, 'sine', 600 + i * 150, 0.15, i * 0.08);
    }
    this._noise(0.4, 0.08, 0, 3000);
  },

  portalEnter() {
    this.resume();
    this._osc(800, 0.8, 'sine', 60, 0.35);
    this._osc(600, 0.6, 'square', 40, 0.12, 0.05);
    this._osc(200, 1.2, 'sine', 1200, 0.2, 0.15);
    this._noise(0.7, 0.15, 0.1, 2000);
    for (let i = 0; i < 4; i++) {
      this._osc(400 + i * 200, 0.1, 'sine', 1000 + i * 300, 0.08, 0.2 + i * 0.1);
    }
  },

  warpTravel() {
    this.resume();
    this._osc(80, 2.5, 'sine', 600, 0.2);
    this._osc(120, 2.0, 'sawtooth', 800, 0.08, 0.3);
    this._noise(2.0, 0.1, 0, 3000);
    for (let i = 0; i < 6; i++) {
      this._osc(200 + i * 150, 0.2, 'sine', 400 + i * 100, 0.04, 0.5 + i * 0.3);
    }
  },

  // ── Common ──

  death() {
    this.resume();
    this._osc(400, 0.12, 'square', 200, 0.35);
    this._osc(200, 0.25, 'square', 60, 0.3, 0.12);
    this._noise(0.15, 0.12, 0.05);
  },

  boost() {
    this.resume();
    this._osc(400, 0.08, 'square', 600, 0.3);
    this._osc(600, 0.08, 'square', 900, 0.25, 0.07);
    this._osc(900, 0.12, 'square', 1200, 0.2, 0.14);
  },

  coin() {
    this.resume();
    this._osc(988, 0.06, 'square', 988, 0.2);
    this._osc(1319, 0.1, 'square', 1319, 0.2, 0.06);
  },

  // ── Asteroids ──

  shoot() {
    this.resume();
    this._osc(1200, 0.08, 'square', 200, 0.2);
  },

  asteroidHit() {
    this.resume();
    this._noise(0.15, 0.25, 0, 4000);
    this._osc(180, 0.1, 'square', 60, 0.15);
  },

  asteroidHitLg() {
    this.resume();
    this._noise(0.25, 0.3, 0, 2500);
    this._osc(120, 0.15, 'sawtooth', 40, 0.2);
  },

  thrust() {
    this.resume();
    this._noise(0.05, 0.08, 0, 800);
  },

  ufoHit() {
    this.resume();
    this._osc(600, 0.06, 'square', 1200, 0.2);
    this._osc(1200, 0.08, 'square', 300, 0.2, 0.06);
    this._noise(0.1, 0.12, 0.05);
  },

  // ── Breakout ──

  paddleHit() {
    this.resume();
    this._osc(440, 0.06, 'square', 520, 0.2);
  },

  brickHit() {
    this.resume();
    this._osc(660, 0.05, 'square', 880, 0.2);
  },

  brickPortalHit() {
    this.resume();
    this._osc(880, 0.08, 'sine', 1320, 0.25);
    this._osc(1320, 0.08, 'sine', 880, 0.15, 0.06);
  },

  wallBounce() {
    this.resume();
    this._osc(300, 0.03, 'square', 350, 0.1);
  },

  ballLost() {
    this.resume();
    this._osc(300, 0.15, 'square', 80, 0.25);
  },

  // ── Frogger ──

  hop() {
    this.resume();
    this._osc(500, 0.04, 'square', 700, 0.15);
  },

  frogHome() {
    this.resume();
    this._osc(523, 0.08, 'square', 523, 0.2);
    this._osc(659, 0.08, 'square', 659, 0.2, 0.08);
    this._osc(784, 0.12, 'square', 784, 0.2, 0.16);
  },

  splash() {
    this.resume();
    this._noise(0.2, 0.2, 0, 3000);
    this._osc(200, 0.1, 'sine', 80, 0.1);
  },

  splat() {
    this.resume();
    this._noise(0.12, 0.25, 0, 2000);
    this._osc(150, 0.08, 'square', 50, 0.15);
  },

  // ── Pac-Man ──

  dotEat() {
    this.resume();
    this._dotHigh = !this._dotHigh;
    const f = this._dotHigh ? 600 : 500;
    this._osc(f, 0.035, 'square', f * 1.2, 0.12);
  },

  powerPellet() {
    this.resume();
    this._osc(200, 0.15, 'square', 800, 0.25);
    this._osc(800, 0.15, 'square', 200, 0.15, 0.15);
  },

  eatGhost() {
    this.resume();
    this._osc(300, 0.1, 'square', 1200, 0.25);
    this._osc(600, 0.08, 'sine', 1500, 0.15, 0.05);
  },

  pacmanDeath() {
    this.resume();
    for (let i = 0; i < 6; i++) {
      this._osc(600 - i * 80, 0.1, 'square', 200 - i * 20, 0.2, i * 0.08);
    }
  },

  // ── Space Invaders ──

  siShoot() {
    this.resume();
    this._osc(900, 0.1, 'square', 300, 0.2);
  },

  invaderHit() {
    this.resume();
    this._noise(0.1, 0.2, 0, 5000);
    this._osc(300, 0.06, 'square', 100, 0.15);
  },

  bombDrop() {
    this.resume();
    this._osc(400, 0.08, 'sawtooth', 150, 0.1);
  },

  mothershipLoop() {
    this.resume();
    this._osc(220, 0.06, 'sine', 280, 0.1);
    this._osc(280, 0.06, 'sine', 220, 0.1, 0.06);
  },

  // ── Tetris ──

  tMove() {
    this.resume();
    this._osc(200, 0.025, 'square', 220, 0.08);
  },

  tRotate() {
    this.resume();
    this._osc(400, 0.04, 'square', 500, 0.12);
  },

  tLock() {
    this.resume();
    this._noise(0.05, 0.12, 0, 1500);
    this._osc(150, 0.06, 'square', 100, 0.12);
  },

  tHardDrop() {
    this.resume();
    this._noise(0.08, 0.2, 0, 2000);
    this._osc(120, 0.08, 'square', 60, 0.2);
  },

  tLineClear(count) {
    this.resume();
    const base = 400 + (count - 1) * 100;
    for (let i = 0; i < Math.min(count, 4); i++) {
      this._osc(base + i * 150, 0.1, 'square', base + i * 150 + 200, 0.2, i * 0.06);
    }
  },

  // ── UI ──

  menuSelect() {
    this.resume();
    this._osc(660, 0.05, 'square', 880, 0.15);
  },

  menuStart() {
    this.resume();
    this._osc(523, 0.06, 'square', 523, 0.2);
    this._osc(659, 0.06, 'square', 659, 0.2, 0.06);
    this._osc(784, 0.06, 'square', 784, 0.2, 0.12);
    this._osc(1047, 0.12, 'square', 1047, 0.2, 0.18);
  },

  gameOver() {
    this.resume();
    this._osc(400, 0.2, 'square', 400, 0.3);
    this._osc(350, 0.2, 'square', 350, 0.25, 0.2);
    this._osc(300, 0.2, 'square', 300, 0.2, 0.4);
    this._osc(200, 0.4, 'square', 100, 0.25, 0.6);
  },

  victory() {
    this.resume();
    const notes = [523, 587, 659, 784, 880, 1047];
    notes.forEach((f, i) => {
      this._osc(f, 0.12, 'square', f, 0.2, i * 0.1);
      this._osc(f * 1.5, 0.08, 'sine', f * 1.5, 0.1, i * 0.1 + 0.02);
    });
  },

  shopBuy() {
    this.resume();
    this._osc(800, 0.06, 'square', 1200, 0.2);
    this._osc(1200, 0.1, 'square', 1200, 0.15, 0.06);
  },

  shopFail() {
    this.resume();
    this._osc(200, 0.1, 'square', 150, 0.2);
    this._osc(150, 0.15, 'square', 100, 0.15, 0.1);
  },

  pause() {
    this.resume();
    this._osc(500, 0.06, 'square', 300, 0.15);
  },

  unpause() {
    this.resume();
    this._osc(300, 0.06, 'square', 500, 0.15);
  },
};

export default SFX;
