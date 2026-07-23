/**
 * DealPilot design tokens.
 *
 * Colors are transcribed VERBATIM from the design handoff
 * (handoff/design_handoff_dealpilot/README.md → "Design Tokens › Farben").
 * Where the table lists two hex values for one token (e.g. `faint`,
 * `line-soft`, `chip-bg`, `faint`/`grau-inaktiv`), both are exposed with a
 * primary/`*Alt` pair so callers can match the exact prototype usage.
 *
 * Statussemantik: green = good, yellow = hint, red = critical, gray = missing.
 * Teal is deliberately NOT an Ampel color — it marks "plan / deliberate action /
 * AI" (measures, context, financing, surveyor).
 */

export const colors = {
  // Surfaces / neutrals
  bgApp: '#f7f5f2', // App background (screens)
  bgCanvas: '#e9e6e1', // Exploration canvas (Pipeline.dc.html only)
  surface: '#ffffff', // Cards, rows, sheets

  // Text
  ink: '#23211d', // Primary text / headlines
  ink2: '#3a3833', // Secondary text
  muted: '#6b6862', // Tertiary text
  muted2: '#8a867f', // Labels
  faint: '#9a968f', // Hints, placeholders
  faintAlt: '#b6b2ab', // Hints, placeholders (softer)

  // Lines / fills
  line: '#e7e4df', // Borders
  lineSoft: '#f0ede8', // Inner dividers
  lineSoftAlt: '#ece9e4', // Inner dividers (alt)
  chipBg: '#f0eee9', // Neutral chips / segmented bg
  chipBgAlt: '#eceae6', // Neutral chips / segmented bg (alt)

  // Dark
  dark: '#1c1b19', // Dark hero cards, primary buttons, bottom-nav (signal variant)
  darkLine: '#33322e', // Divider on dark

  // Ampel: green
  green: '#2e9e5b', // Ampel-green — good / checked / positive cashflow
  greenText: '#2e6f52', // Green text on light
  greenSoft: '#e6f1ea', // Green badge bg
  greenLight: '#7fd0a1', // Green on dark bg

  // Ampel: yellow
  yellow: '#c2882a', // Ampel-yellow — hint / medium risk
  yellowSoft: '#f6efdf', // Yellow badge bg

  // Ampel: red
  red: '#c1442d', // Ampel-red — critical / high risk / negative value
  redSoft: '#f6e7e3', // Red badge bg
  redLight: '#e08a7a', // Red on dark bg

  // Teal (plan / AI)
  teal: '#4a7a86', // Measures, context, AI actions, affiliate
  tealText: '#2f5760', // Teal text
  tealSoft: '#e6eef0', // Teal badge bg
  tealLight: '#8fc3d0', // Teal on dark
  tealLightAlt: '#8fb0a3', // Teal bar variant

  // Gray inactive / missing
  grayInactive: '#cfccc6', // Missing / inactive
  grayInactiveAlt: '#dcd8d1', // Missing / inactive (alt)

  // Extra rail tint used by the discarded-row rail in the prototype.
  railDiscarded: '#d4d0c9',
} as const;

/** Spacing raster: 8 / 10 / 12 / 14 / 16; screen padding 16. */
export const spacing = {
  xs: 8,
  sm: 10,
  md: 12,
  lg: 14,
  xl: 16,
  /** Standard screen horizontal padding. */
  screen: 16,
} as const;

/** Corner radii per the handoff. */
export const radii = {
  card: 16, // Cards 14–18
  cardLg: 18,
  cardSm: 14,
  row: 11, // Rows/chips 10–13
  chip: 11,
  chipSm: 10,
  chipLg: 13,
  sheet: 24, // Sheets: 24 top
  score: 12, // Score field 12–14
  button: 12, // Buttons 12–14
  buttonLg: 14,
  pill: 999,
} as const;

export const shadows = {
  /** Card shadow (signal variant). */
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
} as const;

export type ColorToken = keyof typeof colors;
