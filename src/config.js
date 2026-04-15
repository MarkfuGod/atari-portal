export const GAME_WIDTH = 800;
export const GAME_HEIGHT = 600;
export const PIXEL_SCALE = 1;

export const COLORS = {
  BLACK: 0x000000,
  WHITE: 0xffffff,
  BG_DARK: 0x0a0a1a,
  BG_MID: 0x12122a,
  NEON_CYAN: 0x00f0ff,
  NEON_MAGENTA: 0xff00e6,
  NEON_PINK: 0xff2d7b,
  NEON_BLUE: 0x3d5afe,
  NEON_PURPLE: 0xb845ff,
  NEON_GREEN: 0x39ff14,
  NEON_YELLOW: 0xf0ff00,
  NEON_ORANGE: 0xff6e00,
  NEON_RED: 0xff1744,
  PORTAL_GLOW: 0xb845ff,
  PORTAL_CORE: 0xff00e6,
  PORTAL_EDGE: 0x3d5afe,
  HUD_BG: 0x080818,
  HUD_BORDER: 0x00f0ff,
  GRID_LINE: 0x1a1a3a,
  // Legacy aliases used by game scenes
  CYAN: 0x00f0ff,
  MAGENTA: 0xff00e6,
  YELLOW: 0xf0ff00,
  RED: 0xff1744,
  GREEN: 0x39ff14,
  BLUE: 0x3d5afe,
  ORANGE: 0xff6e00,
};

export const GAME_ORDER = [
  'PacmanScene',
  'BreakoutScene',
  'SpaceInvadersScene',
  'FroggerScene',
  'AsteroidsScene',
  'TetrisScene',
  'SnakeGame',
  'PinballScene',
  'FallDownScene',
];

export const GAME_NAMES = {
  PacmanScene: 'PAC-MAN',
  BreakoutScene: 'BREAKOUT',
  SpaceInvadersScene: 'SPACE INVADERS',
  FroggerScene: 'FROGGER',
  AsteroidsScene: 'ASTEROIDS',
  TetrisScene: 'TETRIS',
  SnakeGame: 'SNAKE',
  PinballScene: 'PINBALL',
  FallDownScene: 'CYBER-SHAFT',
};

export const PORTAL_CONFIG = {
  FALLBACK_TIME: 35000,
  APPEAR_DURATION: 1500,
  PULSE_SPEED: 0.003,
  PARTICLE_COUNT: 20,
  INTERACTION_RADIUS: 40,
  URGENCY_LIFETIME: 20000,
  URGENCY_WARNING: 5000,
};

export const DIFFICULTY = {
  BASE: 1.0,
  INCREMENT: 0.25,
};

export const COIN_CONFIG = {
  PER_PORTAL: 5,
  LIFE_COST: 15,
  STREAK_BONUS: 3,
};

export const SPEED_BOOST = {
  STREAK_THRESHOLD: 2,
  STREAK_WINDOW: 3000,
  DURATION: 8000,
  SPEED_MULT: 1.35,
  SCORE_MULT: 2.0,
};

export const GLITCH_CONFIG = {
  MIN_INTERVAL: 12000,
  MAX_INTERVAL: 25000,
  CONTROL_INVERT_DURATION: 5000,
  TIME_SLOW_DURATION: 3000,
  TIME_FAST_DURATION: 2000,
  POWER_SURGE_DURATION: 4000,
  DATA_LEAK_DURATION: 6000,
  VISUAL_CORRUPT_DURATION: 4000,
  DIMENSIONAL_BLEED_DURATION: 5000,
};

export const MUTATION_CONFIG = {
  OVERCLOCK: { speedMult: 1.3, scoreMult: 1.5 },
  LOW_POWER: { brightness: 0.78, coinMult: 3 },
  MIRROR_MODE: { mirror: true },
  PERMADEATH: { noExtraLives: true, scoreMult: 3 },
  SWARM: { enemyMult: 2, enemyDropCoins: true },
  PIXEL_FOG: { visibilityRadius: 120 },
};

export const HACK_CONFIG = {
  MAX_CHARGE: 100,
  CHARGE_PER_SCORE: 2,
  DURATION: 5000,
  SCORE_MULT: 3.0,
  PORTAL_PROGRESS_JUMP: 0.2,
};

export const MOD_CONFIG = {
  CHOICES_PER_PORTAL: 3,
};

export const COMBO_CONFIG = {
  WINDOW: 1500,
  MAX_MULT: 5,
  MIN_BASE: 20,
};

export const AUDIO_REACTIVE = {
  BEAT_CAMERA_SHAKE: 0.004,
  BEAT_FLASH_ALPHA: 0.12,
  BEAT_FLASH_DURATION: 120,
  BASS_GRID_ALPHA_MIN: 0.08,
  BASS_GRID_ALPHA_MAX: 0.28,
  SCANLINE_ALPHA_MIN: 0.08,
  SCANLINE_ALPHA_MAX: 0.22,
  CHROMATIC_OFFSET: 4,
  VIGNETTE_PULSE: 0.12,
  ENERGY_TINT_ALPHA: 0.06,
};
