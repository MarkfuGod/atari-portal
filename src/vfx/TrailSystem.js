import { COLORS } from '../config.js';

const TrailSystem = {
  _trails: new Map(),
  _nextId: 0,

  createTrail(scene, target, opts = {}) {
    const config = {
      color: opts.color ?? COLORS.NEON_CYAN,
      length: opts.length ?? 6,
      fadeRate: opts.fadeRate ?? 0.82,
      interval: opts.interval ?? 35,
      size: opts.size ?? null,
      depth: opts.depth ?? (target.depth ?? 5) - 1,
      shape: opts.shape ?? 'circle',
      useSprite: opts.useSprite ?? false,
      textureKey: opts.textureKey ?? null,
    };

    const id = this._nextId++;
    const trail = {
      id,
      scene,
      target,
      config,
      ghosts: [],
      timer: null,
      active: true,
    };

    trail.timer = scene.time.addEvent({
      delay: config.interval,
      loop: true,
      callback: () => this._spawnGhost(trail),
    });

    this._trails.set(id, trail);
    return id;
  },

  _spawnGhost(trail) {
    if (!trail.active || !trail.target || !trail.target.active) return;
    const { scene, target, config } = trail;
    const x = target.x;
    const y = target.y;
    const angle = target.angle ?? 0;

    let ghost;
    if (config.useSprite && config.textureKey) {
      ghost = scene.add.image(x, y, config.textureKey);
      ghost.setTint(config.color);
      ghost.setAngle(angle);
      if (target.scaleX != null) ghost.setScale(target.scaleX, target.scaleY);
    } else {
      const sz = config.size ?? (target.width ? Math.max(target.width, target.height) * 0.5 : 8);
      ghost = scene.add.graphics();
      ghost.setPosition(x, y);
      const c = config.color;
      if (config.shape === 'rect') {
        ghost.fillStyle(c, 0.7);
        ghost.fillRect(-sz / 2, -sz / 2, sz, sz);
      } else {
        ghost.fillStyle(c, 0.15);
        ghost.fillCircle(0, 0, sz * 1.5);
        ghost.fillStyle(c, 0.4);
        ghost.fillCircle(0, 0, sz);
        ghost.fillStyle(0xffffff, 0.5);
        ghost.fillCircle(0, 0, sz * 0.4);
      }
    }

    ghost.setDepth(config.depth);
    ghost.setAlpha(0.6);
    if (ghost.setBlendMode) ghost.setBlendMode(Phaser.BlendModes.ADD);

    trail.ghosts.push(ghost);

    scene.tweens.add({
      targets: ghost,
      alpha: 0,
      scaleX: (ghost.scaleX ?? 1) * 0.3,
      scaleY: (ghost.scaleY ?? 1) * 0.3,
      duration: config.interval * config.length,
      ease: 'Quad.easeOut',
      onComplete: () => {
        ghost.destroy();
        const idx = trail.ghosts.indexOf(ghost);
        if (idx !== -1) trail.ghosts.splice(idx, 1);
      },
    });

    while (trail.ghosts.length > config.length * 2) {
      const old = trail.ghosts.shift();
      if (old && !old.scene) continue;
      if (old) old.destroy();
    }
  },

  destroyTrail(id) {
    const trail = this._trails.get(id);
    if (!trail) return;
    trail.active = false;
    if (trail.timer) trail.timer.destroy();
    trail.ghosts.forEach(g => { if (g && g.scene) g.destroy(); });
    trail.ghosts.length = 0;
    this._trails.delete(id);
  },

  setTrailColor(id, color) {
    const trail = this._trails.get(id);
    if (trail) trail.config.color = color;
  },

  destroyAll() {
    for (const [id] of this._trails) {
      this.destroyTrail(id);
    }
  },
};

export default TrailSystem;
