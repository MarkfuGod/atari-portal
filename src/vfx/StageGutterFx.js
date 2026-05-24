/**
 * StageGutterFx — live animated VFX in the two side gutters around the
 * 16:9 game canvas. Each gutter gets its own 2D canvas with:
 *
 *   • a particle field (drifts up, beat-reactive, lighter blend)
 *   • beat-rings emitted on every BGM beat
 *   • a focus beam that follows player / pointer Y
 *   • a vertical spectrum column reading AudioReactive._freqData
 *   • mustard sparks on strong beats
 *   • connecting wireframe lines between nearby particles
 *
 * Uses the modernist palette (paper / vermilion / mustard / cyan / violet)
 * so the side rails feel like the same artwork as the menu poster.
 *
 * Reads live audio data from AudioReactive (web-audio analyser) and
 * focus/motion from AudioBackground._stageBg (player position).
 */
import AudioReactive from '../core/AudioReactiveSystem.js';
import AudioBackground from './AudioBackground.js';

const PALETTE = {
  paper:     'rgba(242, 239, 230, 1)',
  paperSoft: 'rgba(242, 239, 230, 0.55)',
  ink:       'rgba(8, 8, 18, 1)',
  vermilion: 'rgba(255, 59, 48, 1)',
  vermSoft:  'rgba(255, 59, 48, 0.55)',
  mustard:   'rgba(242, 183, 5, 1)',
  cyan:      'rgba(85, 214, 210, 1)',
  cyanSoft:  'rgba(85, 214, 210, 0.4)',
  violet:    'rgba(169, 68, 255, 1)',
};

const PALETTE_LIST = [PALETTE.paper, PALETTE.cyan, PALETTE.vermilion, PALETTE.mustard, PALETTE.violet];

const MAX_PARTICLES = 200;
const MAX_RINGS = 18;
const MAX_SPARKS = 90;

const StageGutterFx = {
  _ready: false,
  _channels: [],

  init() {
    if (this._ready) return;
    if (typeof document === 'undefined') return;

    const leftEl  = document.querySelector('.stage-gutter--left');
    const rightEl = document.querySelector('.stage-gutter--right');
    if (!leftEl || !rightEl) return;

    this._channels = [
      this._createChannel(leftEl,  -1),
      this._createChannel(rightEl, +1),
    ];

    this._lastTime = performance.now();
    this._beatLatch = 0;

    const loop = (t) => {
      this._tick(t);
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);

    window.addEventListener('resize', () => this._channels.forEach(ch => this._resize(ch)));

    this._ready = true;
  },

  _createChannel(host, dir) {
    const canvas = document.createElement('canvas');
    canvas.className = 'stage-canvas';
    canvas.setAttribute('aria-hidden', 'true');
    // The right gutter is `transform: scaleX(-1)` so the canvas would be
    // mirrored too. Counter-mirror the canvas so particles aren't flipped.
    if (dir > 0) canvas.style.transform = 'scaleX(-1)';
    host.prepend(canvas);

    const ch = {
      host,
      canvas,
      ctx: canvas.getContext('2d'),
      dir,
      w: 0, h: 0, dpr: 1,
      particles: [],
      rings: [],
      sparks: [],
      timeAccum: 0,
      spawnAccum: 0,
      lastBeatAt: -10,
      lastSparkAt: -10,
      // Slow-rotating angle for the central halftone ornament
      orient: Math.random() * Math.PI,
    };

    this._resize(ch);
    return ch;
  },

  _resize(ch) {
    const rect = ch.host.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
    ch.dpr = dpr;
    ch.w = Math.max(1, Math.round(rect.width));
    ch.h = Math.max(1, Math.round(rect.height));
    ch.canvas.width  = Math.round(ch.w * dpr);
    ch.canvas.height = Math.round(ch.h * dpr);
    ch.canvas.style.width  = ch.w + 'px';
    ch.canvas.style.height = ch.h + 'px';
    ch.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  },

  _tick(now) {
    const dt = Math.min(0.05, (now - this._lastTime) / 1000);
    this._lastTime = now;

    const stage = (AudioBackground && AudioBackground._stageBg) || {};
    const energy = clamp(stage.energy ?? 0.3, 0, 1.5);
    const bass   = clamp(stage.bass   ?? 0.2, 0, 1.5);
    const beat   = clamp(stage.beat   ?? 0,   0, 1);
    const focusY = clamp(stage.focusY ?? 0,  -1, 1);
    const focusX = clamp(stage.focusX ?? 0,  -1, 1);

    const ar = AudioReactive;
    const realBeat = !!(ar && ar._connected && ar.isBeat);
    const newBeatNow = realBeat || beat > 0.55;

    let beatLatch = false;
    if (newBeatNow && now - this._beatLatch > 110) {
      this._beatLatch = now;
      beatLatch = true;
    }

    for (const ch of this._channels) {
      this._stepChannel(ch, dt, now, { energy, bass, beat, focusX, focusY, beatLatch });
      this._drawChannel(ch, now, { energy, bass, beat, focusX, focusY });
    }
  },

  _stepChannel(ch, dt, now, m) {
    const { energy, bass, beat, focusX, focusY, beatLatch } = m;
    if (ch.w < 4 || ch.h < 4) return;

    ch.timeAccum += dt;
    ch.orient += dt * (0.18 + bass * 0.4) * ch.dir * -1;

    // ── Particle spawn ────────────────────────────────────────────
    const spawnRate = 14 + energy * 60 + bass * 60 + beat * 28;
    ch.spawnAccum += dt * spawnRate;
    while (ch.spawnAccum >= 1 && ch.particles.length < MAX_PARTICLES) {
      ch.spawnAccum -= 1;
      ch.particles.push(this._spawnParticle(ch, m));
    }

    // ── Particle update ───────────────────────────────────────────
    for (let i = ch.particles.length - 1; i >= 0; i--) {
      const p = ch.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy -= dt * 6 * (1 + bass * 1.5);     // slight upward acceleration
      p.vx += Math.sin((p.y + now * 0.001) * 0.02) * dt * 4;
      p.life -= dt;
      if (beatLatch) {
        p.vx += (Math.random() - 0.5) * 90;
        p.vy -= 60 * Math.random();
        p.flash = 1;
      }
      p.flash *= 0.92;
      if (p.life <= 0 || p.y < -8 || p.y > ch.h + 8 || p.x < -8 || p.x > ch.w + 8) {
        ch.particles.splice(i, 1);
      }
    }

    // ── Beat rings ────────────────────────────────────────────────
    if (beatLatch && ch.rings.length < MAX_RINGS) {
      const cx = ch.w / 2;
      const cy = ch.h / 2 + focusY * ch.h * 0.18;
      const palette = [PALETTE.vermilion, PALETTE.cyan, PALETTE.mustard, PALETTE.paper];
      const color = palette[(ch.rings.length + (Math.random() * 4 | 0)) % palette.length];
      ch.rings.push({ x: cx, y: cy, r: 4, vr: 110 + Math.random() * 90, life: 0.9, color });
    }
    for (let i = ch.rings.length - 1; i >= 0; i--) {
      const r = ch.rings[i];
      r.r += r.vr * dt;
      r.life -= dt * 1.2;
      if (r.life <= 0) ch.rings.splice(i, 1);
    }

    // ── Sparks on beat ────────────────────────────────────────────
    if (beatLatch && now - ch.lastSparkAt > 90) {
      ch.lastSparkAt = now;
      const cx = ch.w / 2;
      const cy = ch.h / 2 + focusY * ch.h * 0.16;
      const count = 8 + Math.floor(beat * 10);
      for (let i = 0; i < count && ch.sparks.length < MAX_SPARKS; i++) {
        const a = Math.random() * Math.PI * 2;
        const speed = 140 + Math.random() * 220;
        ch.sparks.push({
          x: cx, y: cy,
          vx: Math.cos(a) * speed,
          vy: Math.sin(a) * speed,
          life: 0.55 + Math.random() * 0.35,
          color: i % 3 === 0 ? PALETTE.mustard : (i % 3 === 1 ? PALETTE.vermilion : PALETTE.paper),
        });
      }
    }
    for (let i = ch.sparks.length - 1; i >= 0; i--) {
      const s = ch.sparks[i];
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.vx *= 0.94;
      s.vy = s.vy * 0.94 + 60 * dt;
      s.life -= dt;
      if (s.life <= 0) ch.sparks.splice(i, 1);
    }
  },

  _spawnParticle(ch, m) {
    const colorIdx = Math.floor(Math.random() * 5);
    return {
      x: 4 + Math.random() * (ch.w - 8),
      y: ch.h + 4 + Math.random() * 18,
      vx: (Math.random() - 0.5) * 14,
      vy: -(20 + Math.random() * 40 + m.bass * 80),
      size: 0.8 + Math.random() * 1.8,
      color: PALETTE_LIST[colorIdx],
      life: 3 + Math.random() * 3,
      flash: 0,
    };
  },

  _drawChannel(ch, now, m) {
    const { energy, bass, beat, focusX, focusY } = m;
    const ctx = ch.ctx;
    const w = ch.w;
    const h = ch.h;

    // Soft trail: instead of full clear, paint a translucent dark rect so
    // particles leave glowing traces.
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = `rgba(6, 6, 14, ${0.34 - beat * 0.12})`;
    ctx.fillRect(0, 0, w, h);

    // ── Focus beam (horizontal line that follows focusY) ──────────
    const beamY = h / 2 + focusY * h * 0.28;
    const beamAlpha = 0.18 + energy * 0.28 + beat * 0.4;
    const grad = ctx.createLinearGradient(0, beamY, w, beamY);
    grad.addColorStop(0,   'rgba(85, 214, 210, 0)');
    grad.addColorStop(0.5, `rgba(85, 214, 210, ${beamAlpha})`);
    grad.addColorStop(1,   'rgba(85, 214, 210, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, beamY - 1, w, 2);

    // Vermilion micro beam (sharp)
    ctx.fillStyle = `rgba(255, 59, 48, ${0.7 + beat * 0.3})`;
    ctx.fillRect(0, beamY, w, 1);

    // ── Halftone ornament center (rotates with focus motion) ──────
    this._drawHalftone(ctx, w / 2, h / 2 + focusY * h * 0.05, Math.min(w, 110), ch.orient, energy, bass);

    // ── Beat rings ────────────────────────────────────────────────
    ctx.globalCompositeOperation = 'lighter';
    for (const r of ch.rings) {
      ctx.beginPath();
      ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2);
      ctx.strokeStyle = r.color.replace(', 1)', `, ${Math.max(0, r.life)})`);
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    // ── Spectrum bars (vertical column near opposite edge) ────────
    this._drawSpectrum(ctx, ch);

    // ── Particles + connecting wireframe ──────────────────────────
    ctx.globalCompositeOperation = 'lighter';
    for (const p of ch.particles) {
      const a = Math.min(1, p.life / 3) * (0.6 + p.flash * 0.4);
      ctx.fillStyle = withAlpha(p.color, a);
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size + p.flash * 1.4, 0, Math.PI * 2);
      ctx.fill();
    }

    // Constellation lines between nearby particles. With higher particle
    // density we keep the connect radius small (≈22px) so the gutter doesn't
    // turn into a solid mesh.
    ctx.strokeStyle = `rgba(85, 214, 210, ${0.05 + energy * 0.14})`;
    ctx.lineWidth = 1;
    const ps = ch.particles;
    const linkR2 = 520;
    for (let i = 0; i < ps.length; i++) {
      const a = ps[i];
      for (let j = i + 1; j < ps.length; j++) {
        const b = ps[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < linkR2) {
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
    }

    // ── Sparks ────────────────────────────────────────────────────
    for (const s of ch.sparks) {
      const a = Math.max(0, Math.min(1, s.life * 1.6));
      ctx.fillStyle = withAlpha(s.color, a);
      ctx.fillRect(s.x - 1, s.y - 1, 2, 2);
    }

    // ── Mustard tracking ticks down the inner edge ────────────────
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = `rgba(242, 183, 5, ${0.32 + beat * 0.6})`;
    const tickStep = 28;
    const tickOffset = (now * 0.06) % tickStep;
    for (let y = -tickStep + tickOffset; y < h; y += tickStep) {
      ctx.fillRect(w - 9, y, 4, 1);
    }

    // ── Inner vermilion edge stripe pulsing on beat ───────────────
    ctx.fillStyle = `rgba(255, 59, 48, ${0.55 + beat * 0.45})`;
    ctx.fillRect(w - 3, 0, 2, h);
  },

  _drawHalftone(ctx, cx, cy, radius, orient, energy, bass) {
    ctx.globalCompositeOperation = 'lighter';
    const rings = 6;
    for (let r = 0; r < rings; r++) {
      const t = r / (rings - 1);
      const rr = 6 + t * (radius * 0.45);
      const count = 6 + r * 4;
      const baseAlpha = (1 - t * 0.6) * (0.4 + energy * 0.35);
      ctx.fillStyle = (r < 2 ? PALETTE.paperSoft : (r < 4 ? PALETTE.cyanSoft : PALETTE.vermSoft));
      for (let i = 0; i < count; i++) {
        const a = (Math.PI * 2 * i) / count + orient * (1 - t);
        const px = cx + Math.cos(a) * rr * (1 + bass * 0.2);
        const py = cy + Math.sin(a) * rr * (1 + bass * 0.2);
        const dotR = (1 - t * 0.6) * (1.2 + bass * 1.4);
        ctx.globalAlpha = baseAlpha;
        ctx.beginPath();
        ctx.arc(px, py, dotR, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;

    // Center pip
    ctx.fillStyle = PALETTE.vermilion;
    ctx.beginPath();
    ctx.arc(cx, cy, 2 + energy * 1.6, 0, Math.PI * 2);
    ctx.fill();
  },

  _drawSpectrum(ctx, ch) {
    const ar = AudioReactive;
    if (!ar || !ar._connected || !ar._freqData) return;
    const fd = ar._freqData;
    const bars = 28;
    const step = Math.max(1, Math.floor(fd.length / bars));
    const w = ch.w;
    const h = ch.h;
    const colWidth = Math.min(72, w * 0.62);
    const colX = 6; // inner edge
    const slot = h / bars;

    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < bars; i++) {
      let sum = 0;
      for (let s = 0; s < step; s++) sum += fd[i * step + s];
      const v = sum / (step * 255);
      const boost = Math.min(1, v * 1.7);
      const barW = Math.max(2, boost * colWidth);
      const y = h - i * slot - slot * 0.55;
      const c = i < bars * 0.3 ? PALETTE.vermilion
              : i < bars * 0.7 ? PALETTE.mustard
              : PALETTE.cyan;
      ctx.fillStyle = withAlpha(c, 0.22 + boost * 0.65);
      ctx.fillRect(colX, y, barW, slot * 0.55);
      ctx.fillStyle = withAlpha(c, 0.5 + boost * 0.4);
      ctx.fillRect(colX, y + slot * 0.2, Math.min(barW, 3), slot * 0.18);
    }
  },
};

function clamp(v, lo, hi) {
  return v < lo ? lo : (v > hi ? hi : v);
}

function withAlpha(rgba, a) {
  // 'rgba(R, G, B, 1)' -> 'rgba(R, G, B, a)'
  return rgba.replace(/, [\d.]+\)$/, `, ${a.toFixed(3)})`);
}

export default StageGutterFx;
