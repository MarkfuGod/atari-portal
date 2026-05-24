const STYLE_KEY = 'atari_portal_visual_style';

export const VISUAL_STYLE_IDS = {
  MODERNIST: 'modernist',
  NEON: 'neon',
};

// Modernist palette as bare values so `roles` can reference them by name.
const MOD_PALETTE = {
  paper: 0xf2efe6,
  paperDark: 0xd8d1bd,
  terminal: 0x080807,
  panel: 0x11110f,
  panelAlt: 0x191813,
  text: 0xf2efe6,
  ink: 0x050505,
  muted: 0x8b8576,
  faint: 0x3b3b34,
  vermilion: 0xff3b30,
  mustard: 0xf2b705,
  cyan: 0x55d6d2,
  blue: 0x2962ff,
  green: 0x70e35b,
  violet: 0xa944ff,
};

const NEON_PALETTE = {
  paper: 0xffffff,
  paperDark: 0x222244,
  terminal: 0x0a0a1a,
  panel: 0x080818,
  panelAlt: 0x12122a,
  text: 0xffffff,
  ink: 0x000000,
  muted: 0x555577,
  faint: 0x1a1a3a,
  vermilion: 0xff1744,
  mustard: 0xf0ff00,
  cyan: 0x00f0ff,
  blue: 0x3d5afe,
  green: 0x39ff14,
  violet: 0xb845ff,
};

// Semantic role tokens — gameplay code should ask for `style.roles.enemy` /
// `.player` / `.projectile` etc. instead of mapping palette swatches by hand.
// Keep both palettes in sync so a `roles.*` lookup never returns undefined.
const MOD_ROLES = {
  player:     MOD_PALETTE.vermilion,
  playerAlt:  MOD_PALETTE.ink,
  enemy:      MOD_PALETTE.ink,
  enemyAlt:   MOD_PALETTE.violet,
  projectile: MOD_PALETTE.mustard,
  enemyShot:  MOD_PALETTE.mustard,
  pickup:     MOD_PALETTE.cyan,
  hazard:     MOD_PALETTE.violet,
  wall:       MOD_PALETTE.ink,
  hud:        MOD_PALETTE.ink,
  hudAccent:  MOD_PALETTE.vermilion,
  positive:   MOD_PALETTE.green,
  negative:   MOD_PALETTE.vermilion,
  warning:    MOD_PALETTE.mustard,
  portal:     MOD_PALETTE.vermilion,
  portalGlow: MOD_PALETTE.cyan,
  backdrop:   MOD_PALETTE.paper,
  grid:       MOD_PALETTE.faint,
  trail:      MOD_PALETTE.ink,
  spark:      MOD_PALETTE.ink,
  debris:     MOD_PALETTE.ink,
};

// Typography tokens. Three roles cover every text site in the codebase:
//   display — big poster headings, scene titles, victory/defeat banners
//   ui      — HUD labels, callouts, button captions, panel headers
//   mono    — coordinate stamps, debug rows, terminal/code text, score readouts
// MODERNIST uses the print-poster trio (Albatross / HS LunaObscura / Monowire);
// NEON keeps the arcade monospace family but borrows Albatross for big titles
// since the typeface reads equally well as cyberpunk display.
const MOD_FONTS = {
  display: '"Albatross", "HS LunaObscura", "Impact", sans-serif',
  ui:      '"HS LunaObscura", "Albatross", "Helvetica Neue", sans-serif',
  mono:    '"Monowire", "Courier New", monospace',
};

const NEON_FONTS = {
  display: '"Albatross", "Impact", "Arial Black", sans-serif',
  ui:      '"HS LunaObscura", "Courier New", monospace',
  mono:    '"Monowire", "Courier New", monospace',
};

const NEON_ROLES = {
  player:     NEON_PALETTE.cyan,
  playerAlt:  0xffffff,
  enemy:      NEON_PALETTE.vermilion,
  enemyAlt:   NEON_PALETTE.violet,
  projectile: NEON_PALETTE.mustard,
  enemyShot:  NEON_PALETTE.vermilion,
  pickup:     NEON_PALETTE.green,
  hazard:     NEON_PALETTE.violet,
  wall:       NEON_PALETTE.blue,
  hud:        NEON_PALETTE.cyan,
  hudAccent:  NEON_PALETTE.violet,
  positive:   NEON_PALETTE.green,
  negative:   NEON_PALETTE.vermilion,
  warning:    NEON_PALETTE.mustard,
  portal:     NEON_PALETTE.violet,
  portalGlow: NEON_PALETTE.cyan,
  backdrop:   NEON_PALETTE.terminal,
  grid:       NEON_PALETTE.faint,
  trail:      NEON_PALETTE.cyan,
  spark:      0xffffff,
  debris:     NEON_PALETTE.violet,
};

export const VISUAL_STYLES = {
  modernist: {
    id: VISUAL_STYLE_IDS.MODERNIST,
    label: 'PSEUDO-RETRO MODERNIST',
    shortLabel: 'MODERNIST',
    palette: MOD_PALETTE,
    roles: MOD_ROLES,
    fonts: MOD_FONTS,
    css: {
      paper: '#f2efe6',
      terminal: '#080807',
      text: '#f2efe6',
      ink: '#050505',
      muted: '#8b8576',
      vermilion: '#ff3b30',
      mustard: '#f2b705',
      cyan: '#55d6d2',
      blue: '#2962ff',
      green: '#70e35b',
      violet: '#a944ff',
    },
  },
  neon: {
    id: VISUAL_STYLE_IDS.NEON,
    label: 'NEON ARCADE',
    shortLabel: 'NEON',
    palette: NEON_PALETTE,
    roles: NEON_ROLES,
    fonts: NEON_FONTS,
    css: {
      paper: '#ffffff',
      terminal: '#0a0a1a',
      text: '#ffffff',
      ink: '#000000',
      muted: '#555577',
      vermilion: '#ff1744',
      mustard: '#f0ff00',
      cyan: '#00f0ff',
      blue: '#3d5afe',
      green: '#39ff14',
      violet: '#b845ff',
    },
  },
};

export function getRoles() {
  return getVisualStyle().roles;
}

export function getFonts() {
  return getVisualStyle().fonts;
}

function normalizeStyleId(styleId) {
  return VISUAL_STYLES[styleId] ? styleId : VISUAL_STYLE_IDS.MODERNIST;
}

export function getVisualStyleId() {
  try {
    return normalizeStyleId(localStorage.getItem(STYLE_KEY));
  } catch (_) {
    return VISUAL_STYLE_IDS.MODERNIST;
  }
}

export function getVisualStyle() {
  return VISUAL_STYLES[getVisualStyleId()];
}

export function isModernistStyle() {
  return getVisualStyleId() === VISUAL_STYLE_IDS.MODERNIST;
}

export function setVisualStyle(styleId) {
  const next = normalizeStyleId(styleId);
  try {
    localStorage.setItem(STYLE_KEY, next);
  } catch (_) { /* silent */ }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('visual-style-changed', {
      detail: { style: VISUAL_STYLES[next] },
    }));
  }

  return VISUAL_STYLES[next];
}

export function toggleVisualStyle() {
  const next = getVisualStyleId() === VISUAL_STYLE_IDS.MODERNIST
    ? VISUAL_STYLE_IDS.NEON
    : VISUAL_STYLE_IDS.MODERNIST;
  return setVisualStyle(next);
}

export function cssColor(value) {
  return `#${value.toString(16).padStart(6, '0')}`;
}
