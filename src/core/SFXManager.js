// =============================================================================
// SFXManager — pseudo-retro modernist synth engine.
// All sounds are generated procedurally via Web Audio API.
// Aesthetic: chiptune DNA (squares, pitch sweeps, arps) processed through a
// modern bus chain (plate reverb send + soft saturation + glue compressor).
// Public API is preserved 1:1 with the previous sample-based implementation.
// =============================================================================

const NOTE = {
  C3: 130.81, D3: 146.83, E3: 164.81, F3: 174.61, G3: 196.00, A3: 220.00, B3: 246.94,
  C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392.00, A4: 440.00, B4: 493.88,
  C5: 523.25, D5: 587.33, E5: 659.25, F5: 698.46, G5: 783.99, A5: 880.00, B5: 987.77,
  C6: 1046.5, D6: 1174.66, E6: 1318.51, F6: 1396.91, G6: 1567.98, A6: 1760, B6: 1975.53,
  C7: 2093.0,
};

function buildPlateIR(ctx, durSec = 1.4, decay = 2.6) {
  const sr = ctx.sampleRate;
  const len = Math.max(1, Math.floor(sr * durSec));
  const ir = ctx.createBuffer(2, len, sr);
  for (let ch = 0; ch < 2; ch++) {
    const data = ir.getChannelData(ch);
    const phase = ch === 0 ? 0 : 137;
    for (let i = 0; i < len; i++) {
      const t = i / len;
      const env = Math.pow(1 - t, decay);
      const noise = (Math.random() * 2 - 1);
      const earlyKick = i < sr * 0.025 ? 0.6 + Math.random() * 0.5 : 1;
      const tonal = Math.sin((i + phase) * 0.0007) * 0.12 * (1 - t);
      data[i] = (noise * env + tonal) * earlyKick;
    }
  }
  return ir;
}

function buildSoftClipCurve(amount = 0.4) {
  const N = 4096;
  const curve = new Float32Array(N);
  const k = 1 + amount * 6;
  for (let i = 0; i < N; i++) {
    const x = (i / N) * 2 - 1;
    curve[i] = Math.tanh(x * k) / Math.tanh(k);
  }
  return curve;
}

const SFX = {
  _ctx: null,
  _master: null,
  _dry: null,
  _send: null,
  _verb: null,
  _muted: false,
  _volume: 0.55,
  _lastPlayed: new Map(),
  _started: false,
  _dotEatStep: 0,

  init() {
    if (this._started) return;
    const Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) return;
    this._ctx = new Ctor();
    this._buildBus();
    this._started = true;
  },

  _buildBus() {
    const ctx = this._ctx;

    this._verb = ctx.createConvolver();
    this._verb.buffer = buildPlateIR(ctx, 1.4, 2.6);

    const verbReturn = ctx.createGain();
    verbReturn.gain.value = 0.55;
    this._verb.connect(verbReturn);

    const softClip = ctx.createWaveShaper();
    softClip.curve = buildSoftClipCurve(0.32);
    softClip.oversample = '4x';

    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.knee.value = 18;
    comp.ratio.value = 4;
    comp.attack.value = 0.004;
    comp.release.value = 0.18;

    const outGain = ctx.createGain();
    outGain.gain.value = this._volume;

    softClip.connect(comp);
    comp.connect(outGain);
    outGain.connect(ctx.destination);

    this._dry = ctx.createGain();
    this._dry.gain.value = 1;
    this._dry.connect(softClip);

    verbReturn.connect(softClip);

    this._send = ctx.createGain();
    this._send.gain.value = 1;
    this._send.connect(this._verb);

    this._master = outGain;
  },

  resume() {
    if (!this._started) this.init();
    if (this._ctx && this._ctx.state === 'suspended') this._ctx.resume();
  },

  get muted() { return this._muted; },
  set muted(v) {
    this._muted = !!v;
    if (this._master) this._master.gain.value = this._muted ? 0 : this._volume;
  },

  _ready() {
    this.resume();
    return !!(this._ctx && !this._muted);
  },

  _canPlay(key, minGap) {
    if (!this._ctx || !minGap) return true;
    const now = this._ctx.currentTime;
    const last = this._lastPlayed.get(key);
    if (last !== undefined && now - last < minGap) return false;
    this._lastPlayed.set(key, now);
    return true;
  },

  _route(node, { pan = 0, send = 0 } = {}) {
    const ctx = this._ctx;
    let out = node;
    if (pan !== 0 && ctx.createStereoPanner) {
      const p = ctx.createStereoPanner();
      p.pan.value = Math.max(-1, Math.min(1, pan));
      out.connect(p);
      out = p;
    }
    out.connect(this._dry);
    if (send > 0) {
      const s = ctx.createGain();
      s.gain.value = send;
      out.connect(s);
      s.connect(this._send);
    }
  },

  // ---- Synth voices --------------------------------------------------------

  _pulse(freq, t0, dur, opts = {}) {
    const {
      vol = 0.32, type = 'square', pan = 0, send = 0,
      glide = 0, attack = 0.004, hold = 0,
    } = opts;
    const ctx = this._ctx;
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (glide && glide !== 1) {
      const target = Math.max(20, freq * glide);
      osc.frequency.exponentialRampToValueAtTime(target, t0 + dur);
    }
    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, t0);
    env.gain.exponentialRampToValueAtTime(vol, t0 + attack);
    if (hold > 0) env.gain.setValueAtTime(vol, t0 + attack + hold);
    env.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(env);
    this._route(env, { pan, send });
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  },

  _bell(freq, t0, opts = {}) {
    const {
      dur = 0.5, idx = 4, ratio = 1.75,
      vol = 0.32, pan = 0, send = 0.2,
    } = opts;
    const ctx = this._ctx;
    const carrier = ctx.createOscillator();
    carrier.type = 'sine';
    carrier.frequency.value = freq;

    const mod = ctx.createOscillator();
    mod.type = 'sine';
    mod.frequency.value = freq * ratio;

    const modAmp = ctx.createGain();
    modAmp.gain.setValueAtTime(freq * idx, t0);
    modAmp.gain.exponentialRampToValueAtTime(0.01, t0 + dur * 0.45);

    mod.connect(modAmp);
    modAmp.connect(carrier.frequency);

    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, t0);
    env.gain.exponentialRampToValueAtTime(vol, t0 + 0.005);
    env.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

    carrier.connect(env);
    this._route(env, { pan, send });

    carrier.start(t0); carrier.stop(t0 + dur + 0.1);
    mod.start(t0); mod.stop(t0 + dur + 0.1);
  },

  _zap(t0, opts = {}) {
    const {
      startFreq = 1100, endFreq = 110, dur = 0.18,
      vol = 0.4, type = 'sawtooth',
      filterTop = 6000, filterBottom = 200, q = 6,
      pan = 0, send = 0.1,
    } = opts;
    const ctx = this._ctx;
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(startFreq, t0);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), t0 + dur);

    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.Q.value = q;
    lp.frequency.setValueAtTime(filterTop, t0);
    lp.frequency.exponentialRampToValueAtTime(Math.max(60, filterBottom), t0 + dur);

    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, t0);
    env.gain.exponentialRampToValueAtTime(vol, t0 + 0.005);
    env.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

    osc.connect(lp);
    lp.connect(env);
    this._route(env, { pan, send });

    osc.start(t0); osc.stop(t0 + dur + 0.05);
  },

  _buzz(freq, t0, dur, opts = {}) {
    const {
      vol = 0.28, detune = 12, voices = 3,
      pan = 0, send = 0.18,
      filterStart = 400, filterEnd = 3500, q = 4,
      pitchEnd = 1, attack = 0.02,
    } = opts;
    const ctx = this._ctx;

    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, t0);
    env.gain.exponentialRampToValueAtTime(vol, t0 + attack);
    env.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.Q.value = q;
    lp.frequency.setValueAtTime(filterStart, t0);
    lp.frequency.exponentialRampToValueAtTime(Math.max(80, filterEnd), t0 + dur * 0.7);

    for (let i = 0; i < voices; i++) {
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(freq, t0);
      o.detune.value = (i - (voices - 1) / 2) * detune;
      if (pitchEnd !== 1) {
        o.frequency.exponentialRampToValueAtTime(Math.max(20, freq * pitchEnd), t0 + dur);
      }
      o.connect(lp);
      o.start(t0);
      o.stop(t0 + dur + 0.05);
    }

    lp.connect(env);
    this._route(env, { pan, send });
  },

  _noise(t0, dur, opts = {}) {
    const {
      vol = 0.3, type = 'bandpass', freq = 4000, q = 2,
      pan = 0, send = 0.05, sweep = 0,
      attack = 0.003,
    } = opts;
    const ctx = this._ctx;
    const len = Math.max(1, Math.floor(ctx.sampleRate * (dur + 0.05)));
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;

    const src = ctx.createBufferSource();
    src.buffer = buf;

    const filt = ctx.createBiquadFilter();
    filt.type = type;
    filt.Q.value = q;
    filt.frequency.setValueAtTime(freq, t0);
    if (sweep && sweep !== 1) {
      filt.frequency.exponentialRampToValueAtTime(Math.max(40, freq * sweep), t0 + dur);
    }

    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, t0);
    env.gain.exponentialRampToValueAtTime(vol, t0 + attack);
    env.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

    src.connect(filt);
    filt.connect(env);
    this._route(env, { pan, send });

    src.start(t0); src.stop(t0 + dur + 0.06);
  },

  _kick(freq, t0, opts = {}) {
    const { vol = 0.55, dur = 0.18, drop = 0.25, pan = 0, send = 0 } = opts;
    const ctx = this._ctx;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, t0);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, freq * drop), t0 + dur * 0.6);

    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, t0);
    env.gain.exponentialRampToValueAtTime(vol, t0 + 0.004);
    env.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

    osc.connect(env);
    this._route(env, { pan, send });

    osc.start(t0); osc.stop(t0 + dur + 0.04);
  },

  // ---- Public API: glitch / portal ---------------------------------------

  glitchStart() {
    if (!this._ready()) return;
    const t = this._ctx.currentTime;
    this._zap(t, {
      startFreq: 760, endFreq: 90, dur: 0.22,
      vol: 0.36, type: 'sawtooth', filterTop: 3500, filterBottom: 240, q: 8, send: 0.18,
    });
    this._noise(t + 0.005, 0.18, {
      vol: 0.18, type: 'bandpass', freq: 2400, q: 5, sweep: 0.3, send: 0.12,
    });
    this._pulse(220, t + 0.04, 0.12, {
      vol: 0.22, type: 'square', glide: 0.4, send: 0.15,
    });
  },

  portalAppear() {
    if (!this._canPlay('portalAppear', 0.4)) return;
    if (!this._ready()) return;
    const t = this._ctx.currentTime;
    this._buzz(NOTE.E4, t, 0.55, {
      vol: 0.24, voices: 4, detune: 16,
      filterStart: 600, filterEnd: 4800, q: 3, send: 0.5, pitchEnd: 1.5,
    });
    this._bell(NOTE.B5, t + 0.04, { dur: 0.7, idx: 5, ratio: 2.01, vol: 0.22, send: 0.55 });
    this._noise(t, 0.5, { vol: 0.12, type: 'highpass', freq: 5000, q: 0.7, sweep: 0.6, send: 0.3 });
  },

  portalEnter() {
    if (!this._ready()) return;
    const t = this._ctx.currentTime;
    this._buzz(NOTE.A3, t, 0.7, {
      vol: 0.32, voices: 4, detune: 22,
      filterStart: 5000, filterEnd: 200, q: 5, send: 0.55, pitchEnd: 0.5,
    });
    this._noise(t, 0.6, { vol: 0.22, type: 'lowpass', freq: 5000, q: 0.8, sweep: 0.15, send: 0.35 });
    this._kick(140, t + 0.4, { vol: 0.5, dur: 0.32, drop: 0.25 });
    this._bell(NOTE.E5, t, { dur: 0.9, idx: 6, ratio: 1.5, vol: 0.18, send: 0.6 });
  },

  warpTravel() {
    if (!this._ready()) return;
    const t = this._ctx.currentTime;
    this._buzz(NOTE.E3, t, 1.2, {
      vol: 0.34, voices: 5, detune: 24,
      filterStart: 300, filterEnd: 6000, q: 3, send: 0.5, pitchEnd: 1.6,
    });
    this._noise(t, 1.0, { vol: 0.2, type: 'bandpass', freq: 1500, q: 1.5, sweep: 4, send: 0.45 });
    this._bell(NOTE.A4, t + 0.6, { dur: 1.0, idx: 5, ratio: 2.01, vol: 0.18, send: 0.5 });
  },

  // ---- Public API: combat / impacts --------------------------------------

  death() {
    if (!this._ready()) return;
    const t = this._ctx.currentTime;
    this._buzz(NOTE.A3, t, 0.85, {
      vol: 0.32, voices: 4, detune: 28,
      filterStart: 2200, filterEnd: 100, q: 6, send: 0.4, pitchEnd: 0.35,
    });
    this._kick(120, t + 0.55, { vol: 0.55, dur: 0.45, drop: 0.22 });
    this._noise(t + 0.04, 0.7, { vol: 0.18, type: 'lowpass', freq: 1200, q: 0.8, sweep: 0.2, send: 0.2 });
  },

  boost() {
    if (!this._ready()) return;
    const t = this._ctx.currentTime;
    [NOTE.G4, NOTE.C5, NOTE.E5, NOTE.G5].forEach((f, i) => {
      this._pulse(f, t + i * 0.035, 0.07, { vol: 0.26, type: 'square', send: 0.18 });
    });
    this._buzz(NOTE.G4, t, 0.35, {
      vol: 0.18, voices: 3, detune: 12, filterStart: 800, filterEnd: 5000, q: 3, send: 0.25,
    });
    this._noise(t, 0.18, { vol: 0.12, type: 'highpass', freq: 6000, q: 0.7, send: 0.1 });
  },

  coin() {
    if (!this._canPlay('coin', 0.035)) return;
    if (!this._ready()) return;
    const t = this._ctx.currentTime;
    this._pulse(NOTE.C6, t,        0.06, { vol: 0.28, type: 'square', send: 0.15 });
    this._pulse(NOTE.G6, t + 0.06, 0.12, { vol: 0.30, type: 'square', send: 0.20 });
    this._bell (NOTE.G6, t + 0.05, { dur: 0.32, idx: 2, ratio: 2.0, vol: 0.16, send: 0.32 });
  },

  shoot() {
    if (!this._canPlay('shoot', 0.045)) return;
    if (!this._ready()) return;
    const t = this._ctx.currentTime;
    this._zap(t, {
      startFreq: 1200, endFreq: 220, dur: 0.09,
      vol: 0.28, type: 'square', filterTop: 7000, filterBottom: 600, q: 4, send: 0.05,
      pan: (Math.random() - 0.5) * 0.2,
    });
    this._noise(t, 0.025, { vol: 0.16, type: 'highpass', freq: 6000, q: 1.2 });
  },

  asteroidHit() {
    if (!this._ready()) return;
    const t = this._ctx.currentTime;
    this._kick(160, t, { vol: 0.42, dur: 0.16, drop: 0.4 });
    this._noise(t, 0.13, { vol: 0.28, type: 'bandpass', freq: 2200, q: 2, sweep: 0.3, send: 0.15 });
    this._bell(NOTE.A4, t, { dur: 0.22, idx: 3, ratio: 2.5, vol: 0.16, send: 0.18 });
  },

  asteroidHitLg() {
    if (!this._ready()) return;
    const t = this._ctx.currentTime;
    this._kick(80, t, { vol: 0.6, dur: 0.32, drop: 0.25 });
    this._noise(t, 0.5, { vol: 0.36, type: 'lowpass', freq: 1800, q: 1.2, sweep: 0.25, send: 0.3 });
    this._buzz(NOTE.E3, t, 0.4, {
      vol: 0.22, voices: 3, detune: 24, filterStart: 1800, filterEnd: 200, q: 4, pitchEnd: 0.6, send: 0.25,
    });
  },

  thrust() {
    if (!this._canPlay('thrust', 0.11)) return;
    if (!this._ready()) return;
    const t = this._ctx.currentTime;
    this._noise(t, 0.13, { vol: 0.16, type: 'bandpass', freq: 700 + Math.random() * 200, q: 1.4, send: 0.05 });
    this._pulse(80 + Math.random() * 40, t, 0.13, { vol: 0.12, type: 'sawtooth', glide: 0.7 });
  },

  ufoHit() {
    if (!this._ready()) return;
    const t = this._ctx.currentTime;
    this._zap(t, {
      startFreq: 880, endFreq: 110, dur: 0.22,
      vol: 0.34, type: 'sawtooth', filterTop: 3000, filterBottom: 200, q: 5, send: 0.25,
    });
    this._bell(NOTE.E5, t, { dur: 0.4, idx: 5, ratio: 1.5, vol: 0.22, send: 0.3 });
    this._kick(120, t + 0.16, { vol: 0.34, dur: 0.18, drop: 0.4 });
  },

  paddleHit() {
    if (!this._canPlay('paddleHit', 0.02)) return;
    if (!this._ready()) return;
    const t = this._ctx.currentTime;
    this._pulse(NOTE.G4, t, 0.06, { vol: 0.26, type: 'square', glide: 1.6, send: 0.08 });
    this._noise(t, 0.02, { vol: 0.14, type: 'highpass', freq: 5500, q: 0.8 });
  },

  brickHit() {
    if (!this._ready()) return;
    const t = this._ctx.currentTime;
    const bright = NOTE.A5 * (0.95 + Math.random() * 0.15);
    this._bell(bright, t, { dur: 0.18, idx: 3, ratio: 2.01, vol: 0.28, send: 0.18 });
    this._pulse(bright * 0.5, t, 0.05, { vol: 0.16, type: 'square' });
  },

  brickPortalHit() {
    if (!this._ready()) return;
    const t = this._ctx.currentTime;
    this._bell(NOTE.E6, t, { dur: 0.4, idx: 5, ratio: 1.5, vol: 0.3, send: 0.45 });
    this._buzz(NOTE.E5, t, 0.25, {
      vol: 0.18, voices: 3, detune: 14, filterStart: 1500, filterEnd: 6000, q: 3, send: 0.4, pitchEnd: 1.4,
    });
    this._noise(t, 0.18, { vol: 0.1, type: 'highpass', freq: 5000, q: 0.7, send: 0.25 });
  },

  wallBounce() {
    if (!this._canPlay('wallBounce', 0.035)) return;
    if (!this._ready()) return;
    const t = this._ctx.currentTime;
    this._pulse(NOTE.E5, t, 0.04, { vol: 0.2, type: 'square', glide: 1.3, send: 0.05 });
  },

  ballLost() {
    if (!this._ready()) return;
    const t = this._ctx.currentTime;
    this._buzz(NOTE.G3, t, 0.45, {
      vol: 0.26, voices: 3, detune: 18, filterStart: 1500, filterEnd: 200, q: 5, pitchEnd: 0.4, send: 0.25,
    });
    this._kick(80, t + 0.3, { vol: 0.42, dur: 0.25, drop: 0.3 });
  },

  hop() {
    if (!this._canPlay('hop', 0.05)) return;
    if (!this._ready()) return;
    const t = this._ctx.currentTime;
    this._pulse(NOTE.A4, t, 0.06, { vol: 0.28, type: 'square', glide: 1.7, send: 0.08 });
    this._pulse(NOTE.A4 * 1.5, t + 0.025, 0.04, { vol: 0.18, type: 'square' });
  },

  frogHome() {
    if (!this._ready()) return;
    const t = this._ctx.currentTime;
    [NOTE.C5, NOTE.E5, NOTE.G5, NOTE.C6].forEach((f, i) => {
      this._pulse(f, t + i * 0.06, 0.12, { vol: 0.28, type: 'square', send: 0.22 });
      this._bell(f, t + i * 0.06, { dur: 0.3, idx: 3, vol: 0.16, send: 0.3 });
    });
  },

  splash() {
    if (!this._ready()) return;
    const t = this._ctx.currentTime;
    this._noise(t, 0.32, { vol: 0.32, type: 'bandpass', freq: 1800, q: 1.2, sweep: 0.25, send: 0.25 });
    this._noise(t + 0.04, 0.18, { vol: 0.2, type: 'highpass', freq: 4000, q: 0.8, sweep: 0.6, send: 0.2 });
    this._pulse(180, t, 0.18, { vol: 0.16, type: 'sine', glide: 0.5 });
  },

  splat() {
    if (!this._ready()) return;
    const t = this._ctx.currentTime;
    this._kick(70, t, { vol: 0.55, dur: 0.28, drop: 0.4 });
    this._noise(t, 0.22, { vol: 0.32, type: 'lowpass', freq: 600, q: 1.2, sweep: 0.4, send: 0.2 });
    this._buzz(NOTE.E3, t, 0.25, {
      vol: 0.2, voices: 3, detune: 30, filterStart: 800, filterEnd: 120, q: 5, pitchEnd: 0.5,
    });
  },

  // ---- Public API: pacman --------------------------------------------------

  dotEat() {
    if (!this._canPlay('dotEat', 0.028)) return;
    if (!this._ready()) return;
    const t = this._ctx.currentTime;
    const high = (this._dotEatStep++ & 1) === 0;
    const f = high ? NOTE.E6 : NOTE.B5;
    this._bell(f, t, { dur: 0.09, idx: 2, ratio: 2.5, vol: 0.22, send: 0.12 });
    this._pulse(f * 0.5, t, 0.04, { vol: 0.12, type: 'square' });
  },

  powerPellet() {
    if (!this._ready()) return;
    const t = this._ctx.currentTime;
    [NOTE.C5, NOTE.E5, NOTE.G5, NOTE.B5].forEach((f, i) => {
      this._pulse(f, t + i * 0.045, 0.09, { vol: 0.26, type: 'square', send: 0.2 });
    });
    this._buzz(NOTE.C5, t, 0.55, {
      vol: 0.22, voices: 4, detune: 16, filterStart: 700, filterEnd: 5500, q: 2.5, pitchEnd: 1.4, send: 0.4,
    });
    this._bell(NOTE.B5, t + 0.18, { dur: 0.6, idx: 4, ratio: 2.01, vol: 0.2, send: 0.5 });
  },

  eatGhost() {
    if (!this._ready()) return;
    const t = this._ctx.currentTime;
    [NOTE.G5, NOTE.C6, NOTE.E6].forEach((f, i) => {
      this._pulse(f, t + i * 0.05, 0.1, { vol: 0.3, type: 'square', send: 0.22 });
      this._bell(f, t + i * 0.05, { dur: 0.3, idx: 4, vol: 0.18, send: 0.32 });
    });
    this._kick(180, t, { vol: 0.36, dur: 0.18, drop: 0.4 });
  },

  pacmanDeath() {
    if (!this._ready()) return;
    const t = this._ctx.currentTime;
    this._buzz(NOTE.A4, t, 1.1, {
      vol: 0.3, voices: 4, detune: 22, filterStart: 2400, filterEnd: 80, q: 6, pitchEnd: 0.18, send: 0.3,
    });
    [0, 0.18, 0.36, 0.54, 0.72].forEach((delay, i) => {
      this._pulse(NOTE.A4 * Math.pow(0.84, i), t + delay, 0.14, {
        vol: 0.24, type: 'square', glide: 0.7, send: 0.15,
      });
    });
  },

  // ---- Public API: space invaders -----------------------------------------

  siShoot() {
    if (!this._canPlay('siShoot', 0.05)) return;
    if (!this._ready()) return;
    const t = this._ctx.currentTime;
    this._zap(t, {
      startFreq: 1400, endFreq: 280, dur: 0.1,
      vol: 0.3, type: 'square', filterTop: 6000, filterBottom: 800, q: 3, send: 0.08,
    });
  },

  invaderHit() {
    if (!this._ready()) return;
    const t = this._ctx.currentTime;
    this._kick(150, t, { vol: 0.42, dur: 0.16, drop: 0.4 });
    this._noise(t, 0.14, { vol: 0.3, type: 'bandpass', freq: 2400, q: 2, sweep: 0.4, send: 0.18 });
    this._bell(NOTE.G4, t, { dur: 0.18, idx: 4, ratio: 2.5, vol: 0.18, send: 0.22 });
  },

  bombDrop() {
    if (!this._canPlay('bombDrop', 0.075)) return;
    if (!this._ready()) return;
    const t = this._ctx.currentTime;
    this._zap(t, {
      startFreq: 480, endFreq: 110, dur: 0.22,
      vol: 0.26, type: 'sawtooth', filterTop: 1400, filterBottom: 220, q: 4, send: 0.12,
    });
  },

  mothershipLoop() {
    if (!this._canPlay('mothershipLoop', 0.22)) return;
    if (!this._ready()) return;
    const t = this._ctx.currentTime;
    const ctx = this._ctx;
    const lfo = ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 9;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 12;
    lfo.connect(lfoGain);

    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.value = NOTE.A3;
    lfoGain.connect(osc.frequency);

    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 900;
    lp.Q.value = 5;

    const env = ctx.createGain();
    const dur = 0.22;
    env.gain.setValueAtTime(0.0001, t);
    env.gain.exponentialRampToValueAtTime(0.18, t + 0.04);
    env.gain.exponentialRampToValueAtTime(0.0001, t + dur);

    osc.connect(lp); lp.connect(env);
    this._route(env, { send: 0.2 });

    osc.start(t); osc.stop(t + dur + 0.05);
    lfo.start(t); lfo.stop(t + dur + 0.05);
  },

  // ---- Public API: tetris --------------------------------------------------

  tMove() {
    if (!this._canPlay('tMove', 0.035)) return;
    if (!this._ready()) return;
    const t = this._ctx.currentTime;
    this._pulse(NOTE.E5, t, 0.035, { vol: 0.22, type: 'square' });
  },

  tRotate() {
    if (!this._ready()) return;
    const t = this._ctx.currentTime;
    this._pulse(NOTE.A5, t, 0.05, { vol: 0.24, type: 'square', glide: 1.18, send: 0.06 });
  },

  tLock() {
    if (!this._ready()) return;
    const t = this._ctx.currentTime;
    this._kick(110, t, { vol: 0.42, dur: 0.13, drop: 0.55 });
    this._noise(t, 0.04, { vol: 0.16, type: 'highpass', freq: 5000, q: 0.8 });
  },

  tHardDrop() {
    if (!this._ready()) return;
    const t = this._ctx.currentTime;
    this._zap(t, {
      startFreq: 700, endFreq: 90, dur: 0.13,
      vol: 0.34, type: 'square', filterTop: 4000, filterBottom: 200, q: 4, send: 0.1,
    });
    this._kick(70, t + 0.1, { vol: 0.55, dur: 0.25, drop: 0.3 });
    this._noise(t + 0.1, 0.16, { vol: 0.22, type: 'lowpass', freq: 1200, q: 1, send: 0.18 });
  },

  tLineClear(count = 1) {
    if (!this._ready()) return;
    const t = this._ctx.currentTime;
    const n = Math.max(1, Math.min(4, count));
    const triads = [
      [NOTE.E5, NOTE.G5, NOTE.B5],
      [NOTE.C5, NOTE.E5, NOTE.G5, NOTE.C6],
      [NOTE.C5, NOTE.E5, NOTE.G5, NOTE.B5, NOTE.D6],
      [NOTE.C5, NOTE.E5, NOTE.G5, NOTE.B5, NOTE.D6, NOTE.G6, NOTE.C7],
    ][n - 1];
    triads.forEach((f, i) => {
      this._pulse(f, t + i * 0.04, 0.12, { vol: 0.28, type: 'square', send: 0.25 });
      this._bell(f, t + i * 0.04, { dur: 0.45, idx: 4, vol: 0.18, send: 0.42 });
    });
    this._kick(120, t, { vol: 0.4 + n * 0.05, dur: 0.22, drop: 0.35 });
    if (n >= 4) {
      this._buzz(NOTE.C5, t + 0.1, 0.9, {
        vol: 0.26, voices: 4, detune: 16, filterStart: 800, filterEnd: 6500, q: 2, pitchEnd: 1.5, send: 0.55,
      });
    }
  },

  // ---- Public API: UI ------------------------------------------------------

  menuSelect() {
    if (!this._canPlay('menuSelect', 0.04)) return;
    if (!this._ready()) return;
    const t = this._ctx.currentTime;
    const f = NOTE.A5 * (0.94 + Math.random() * 0.12);
    this._bell(f, t, { dur: 0.13, idx: 3, ratio: 1.75, vol: 0.26, send: 0.22, pan: (Math.random() - 0.5) * 0.3 });
    this._pulse(f * 0.5, t, 0.03, { vol: 0.1, type: 'square' });
  },

  menuStart() {
    if (!this._ready()) return;
    const t = this._ctx.currentTime;
    this._kick(130, t, { vol: 0.55, dur: 0.22, drop: 0.35 });
    [NOTE.G4, NOTE.C5, NOTE.E5, NOTE.G5].forEach((f, i) => {
      this._pulse(f, t + i * 0.055, 0.1, { vol: 0.3, type: 'square', send: 0.18 });
      this._bell(f, t + i * 0.055, { dur: 0.32, idx: 3, vol: 0.16, send: 0.32 });
    });
    this._buzz(NOTE.G4, t + 0.18, 0.7, {
      vol: 0.2, voices: 4, detune: 14, filterStart: 800, filterEnd: 5500, q: 2, pitchEnd: 1.3, send: 0.5,
    });
  },

  gameOver() {
    if (!this._ready()) return;
    const t = this._ctx.currentTime;
    this._buzz(NOTE.A3, t, 1.4, {
      vol: 0.34, voices: 4, detune: 32, filterStart: 2200, filterEnd: 80, q: 6, pitchEnd: 0.25, send: 0.4,
    });
    [0, 0.22, 0.5, 0.85].forEach((delay, i) => {
      this._pulse(NOTE.A4 * Math.pow(0.78, i), t + delay, 0.22, {
        vol: 0.22, type: 'square', glide: 0.7, send: 0.2,
      });
    });
    this._kick(70, t + 0.92, { vol: 0.55, dur: 0.4, drop: 0.3 });
  },

  victory() {
    if (!this._ready()) return;
    const t = this._ctx.currentTime;
    this._kick(140, t, { vol: 0.5, dur: 0.32, drop: 0.35 });
    [NOTE.C5, NOTE.E5, NOTE.G5, NOTE.C6, NOTE.E6, NOTE.G6].forEach((f, i) => {
      this._pulse(f, t + i * 0.075, 0.18, { vol: 0.3, type: 'square', send: 0.28, pan: (i % 2 ? 0.2 : -0.2) });
      this._bell(f, t + i * 0.075, { dur: 0.5, idx: 4, vol: 0.22, send: 0.45 });
    });
    this._buzz(NOTE.C5, t + 0.2, 1.4, {
      vol: 0.24, voices: 5, detune: 18, filterStart: 700, filterEnd: 6000, q: 2, pitchEnd: 1.5, send: 0.6,
    });
  },

  shopBuy() {
    if (!this._ready()) return;
    const t = this._ctx.currentTime;
    [NOTE.E5, NOTE.A5, NOTE.E6].forEach((f, i) => {
      this._pulse(f, t + i * 0.04, 0.09, { vol: 0.28, type: 'square', send: 0.18 });
    });
    this._bell(NOTE.E6, t + 0.05, { dur: 0.4, idx: 3, ratio: 2.0, vol: 0.22, send: 0.4 });
    this._kick(160, t, { vol: 0.36, dur: 0.16, drop: 0.4 });
  },

  shopFail() {
    if (!this._ready()) return;
    const t = this._ctx.currentTime;
    this._buzz(NOTE.F3, t, 0.4, {
      vol: 0.3, voices: 2, detune: 36, filterStart: 1400, filterEnd: 200, q: 6, pitchEnd: 0.6, send: 0.2,
    });
    this._noise(t, 0.18, { vol: 0.18, type: 'bandpass', freq: 800, q: 2, sweep: 0.4, send: 0.15 });
  },

  pause() {
    if (!this._ready()) return;
    const t = this._ctx.currentTime;
    this._pulse(NOTE.E4, t, 0.16, { vol: 0.28, type: 'square', glide: 0.6, send: 0.2 });
    this._bell(NOTE.E4, t, { dur: 0.3, idx: 3, vol: 0.14, send: 0.3 });
  },

  unpause() {
    if (!this._ready()) return;
    const t = this._ctx.currentTime;
    this._pulse(NOTE.A4, t, 0.12, { vol: 0.3, type: 'square', glide: 1.5, send: 0.18 });
    this._bell(NOTE.E5, t + 0.04, { dur: 0.3, idx: 3, vol: 0.18, send: 0.3 });
  },

  // ---- Aliases -------------------------------------------------------------

  eatDot() { this.dotEat(); },
  hit()    { this.brickHit(); },
  portalOpen() { this.portalAppear(); },
};

export default SFX;
