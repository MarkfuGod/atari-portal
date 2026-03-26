/**
 * Real-time audio analysis using Web Audio API AnalyserNode.
 * Extracts bass/mid/treble energy and detects beats from the BGM stream.
 * Other systems read the exported singleton's properties each frame.
 */
const AudioReactive = {
  _analyser: null,
  _freqData: null,
  _connected: false,
  _prevEnergy: 0,
  _beatCooldown: 0,
  _energyHistory: [],
  _historyLen: 30,
  _debug: true,
  _lastSampleLogAt: 0,
  _lastBeatLogAt: 0,

  bass: 0,
  mid: 0,
  treble: 0,
  energy: 0,
  isBeat: false,
  beatIntensity: 0,
  bassSmooth: 0,

  debug(...args) {
    if (!this._debug) return;
    console.log('[AudioReactive]', ...args);
  },

  connect(scene) {
    if (this._connected) {
      this.debug('connect skipped: already connected');
      return;
    }
    const mgr = scene.sound;
    if (!mgr || !mgr.context) {
      this.debug('connect failed: missing Phaser sound manager or audio context');
      return;
    }

    const ctx = mgr.context;
    this._analyser = ctx.createAnalyser();
    this._analyser.fftSize = 256;
    this._analyser.smoothingTimeConstant = 0.82;
    this._freqData = new Uint8Array(this._analyser.frequencyBinCount);

    try {
      this.debug('attempting analyser connect', {
        scene: scene.scene?.key,
        contextState: ctx.state,
        hasMasterVolumeNode: !!mgr.masterVolumeNode,
      });
      mgr.masterVolumeNode.connect(this._analyser);
      this._connected = true;
      this.debug('analyser connected', {
        fftSize: this._analyser.fftSize,
        frequencyBinCount: this._analyser.frequencyBinCount,
      });
      window.__atariPortalAudioReactive = this;
    } catch (error) {
      this.debug('connect failed with error', error);
    }
  },

  update(delta) {
    if (!this._connected || !this._analyser) {
      this.bass = this.mid = this.treble = this.energy = 0;
      this.isBeat = false;
      return;
    }

    this._analyser.getByteFrequencyData(this._freqData);
    const len = this._freqData.length;

    let bSum = 0, mSum = 0, tSum = 0;
    const bassEnd = 10;
    const midEnd = 45;

    for (let i = 0; i < bassEnd; i++) bSum += this._freqData[i];
    for (let i = bassEnd; i < midEnd; i++) mSum += this._freqData[i];
    for (let i = midEnd; i < len; i++) tSum += this._freqData[i];

    this.bass = bSum / (bassEnd * 255);
    this.mid = mSum / ((midEnd - bassEnd) * 255);
    this.treble = tSum / ((len - midEnd) * 255);
    this.energy = (bSum + mSum + tSum) / (len * 255);

    this.bassSmooth += (this.bass - this.bassSmooth) * 0.15;

    const weighted = this.bass * 0.55 + this.mid * 0.3 + this.treble * 0.15;

    this._energyHistory.push(weighted);
    if (this._energyHistory.length > this._historyLen) this._energyHistory.shift();

    let avg = 0;
    for (let i = 0; i < this._energyHistory.length; i++) avg += this._energyHistory[i];
    avg /= this._energyHistory.length;

    this._beatCooldown = Math.max(0, this._beatCooldown - delta);

    const threshold = Math.max(avg * 1.35, 0.12);
    if (weighted > threshold && weighted > this._prevEnergy * 1.15 && this._beatCooldown <= 0) {
      this.isBeat = true;
      this.beatIntensity = Math.min(1.0, (weighted - avg) / avg + 0.5);
      this._beatCooldown = 180;
      const now = performance.now();
      if (now - this._lastBeatLogAt > 250) {
        this._lastBeatLogAt = now;
        this.debug('beat detected', {
          bass: Number(this.bass.toFixed(3)),
          mid: Number(this.mid.toFixed(3)),
          treble: Number(this.treble.toFixed(3)),
          energy: Number(this.energy.toFixed(3)),
          threshold: Number(threshold.toFixed(3)),
          beatIntensity: Number(this.beatIntensity.toFixed(3)),
        });
      }
    } else {
      this.isBeat = false;
    }

    this.beatIntensity = Math.max(0, this.beatIntensity - delta * 0.003);
    this._prevEnergy = weighted;

    const now = performance.now();
    if (now - this._lastSampleLogAt > 2000) {
      this._lastSampleLogAt = now;
      this.debug('audio sample', {
        bass: Number(this.bass.toFixed(3)),
        mid: Number(this.mid.toFixed(3)),
        treble: Number(this.treble.toFixed(3)),
        energy: Number(this.energy.toFixed(3)),
        connected: this._connected,
      });
    }
  },

  disconnect() {
    if (this._analyser && this._connected) {
      try { this._analyser.disconnect(); } catch (_) {}
    }
    this._connected = false;
    this._analyser = null;
    this._freqData = null;
    this._prevEnergy = 0;
    this._energyHistory = [];
    this.bass = this.mid = this.treble = this.energy = 0;
    this.isBeat = false;
    this.beatIntensity = 0;
    this.bassSmooth = 0;
    this._lastSampleLogAt = 0;
    this._lastBeatLogAt = 0;
  },
};

export default AudioReactive;
