/**
 * Typography presets for DealPilot.
 *
 * Three families (Google Fonts, loaded via @expo-google-fonts in the root
 * layout):
 *   - Bricolage Grotesque (700) — headlines, screen/sheet titles, score number,
 *     deal titles, big KPI headings.
 *   - Hanken Grotesk (400/500/600/700) — the whole UI, body, labels, buttons.
 *   - IBM Plex Mono (400/500/600) — all numbers/amounts, shorthand, uppercase
 *     mono labels (SCORE, KI-URTEIL, CASHFLOW / MONAT).
 *
 * Rule: numbers and technical labels always IBM Plex Mono, text in Hanken,
 * big titles in Bricolage.
 *
 * The string values match the exact keys exported by the @expo-google-fonts
 * packages and passed to useFonts() in app/_layout.tsx.
 */

import type { TextStyle } from 'react-native';
import { colors } from './tokens';

export const fonts = {
  bricolage700: 'BricolageGrotesque_700Bold',

  hanken400: 'HankenGrotesk_400Regular',
  hanken500: 'HankenGrotesk_500Medium',
  hanken600: 'HankenGrotesk_600SemiBold',
  hanken700: 'HankenGrotesk_700Bold',

  mono400: 'IBMPlexMono_400Regular',
  mono500: 'IBMPlexMono_500Medium',
  mono600: 'IBMPlexMono_600SemiBold',
} as const;

/**
 * Named presets used across the app. Numeric sizes follow the handoff
 * "Typografie" ranges; letterSpacing on mono labels uses .06–.14em translated
 * to absolute points (React Native letterSpacing is in points, not em).
 */
export const type = {
  /** Screen title — Bricolage 21 / 700. */
  screenTitle: {
    fontFamily: fonts.bricolage700,
    fontSize: 21,
    letterSpacing: -0.21, // ~ -0.01em
    color: colors.ink,
  } satisfies TextStyle,

  /** Deal / card title — Hanken 14 / 600. */
  cardTitle: {
    fontFamily: fonts.hanken600,
    fontSize: 14,
    color: colors.ink,
  } satisfies TextStyle,

  /** Discarded-row title — Hanken 13 / 600 (denser). */
  cardTitleSm: {
    fontFamily: fonts.hanken600,
    fontSize: 13,
    color: colors.ink2,
  } satisfies TextStyle,

  /** Body copy — Hanken 13.5 / 400. */
  body: {
    fontFamily: fonts.hanken400,
    fontSize: 13.5,
    color: colors.ink2,
  } satisfies TextStyle,

  /** Mono subtitle line (Ort · m² · Baujahr · Status) — Mono 11.5 / 400. */
  monoSub: {
    fontFamily: fonts.mono400,
    fontSize: 11.5,
    color: colors.muted,
  } satisfies TextStyle,

  /** Mono KPI line (Kaufpreis · Rendite · Risiken) — Mono 11.5 / 500. */
  monoKpi: {
    fontFamily: fonts.mono500,
    fontSize: 11.5,
    color: colors.ink2,
  } satisfies TextStyle,

  /** Uppercase mono label — e.g. section headers — Mono 10.5 / 600. */
  monoLabel: {
    fontFamily: fonts.mono600,
    fontSize: 10.5,
    letterSpacing: 1.05, // ~ .1em
    textTransform: 'uppercase',
    color: colors.muted2,
  } satisfies TextStyle,

  /** Score number in the row score column — Mono 21 / 600. */
  scoreNum: {
    fontFamily: fonts.mono600,
    fontSize: 21,
    lineHeight: 21,
  } satisfies TextStyle,

  /** "SCORE" micro label under the number — Mono 7.5 / 500. */
  scoreLabel: {
    fontFamily: fonts.mono500,
    fontSize: 7.5,
    letterSpacing: 0.9, // ~ .12em
  } satisfies TextStyle,

  /** Big KPI readout — Mono 32 / 600. */
  kpiBig: {
    fontFamily: fonts.mono600,
    fontSize: 32,
    color: colors.ink,
  } satisfies TextStyle,

  /** Search input text — Hanken 13.5 / 400. */
  input: {
    fontFamily: fonts.hanken400,
    fontSize: 13.5,
    color: colors.ink,
  } satisfies TextStyle,

  /** Bottom-nav label — Hanken 9.5 / 600. */
  navLabel: {
    fontFamily: fonts.hanken600,
    fontSize: 9.5,
  } satisfies TextStyle,

  /** Collaborator avatar initials — Hanken 8.5 / 600. */
  avatar: {
    fontFamily: fonts.hanken600,
    fontSize: 8.5,
    color: colors.teal,
  } satisfies TextStyle,
} as const;

/** The full list of font map entries to hand to useFonts(). Filled in _layout. */
export type FontKey = keyof typeof fonts;
