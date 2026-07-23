/**
 * Thin inline line-icons via react-native-svg (stroke 1.6–2.0, currentColor /
 * token colour), per the handoff "Icons" note. No emoji, no icon font.
 */

import * as React from 'react';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { colors } from '../theme/tokens';

export interface IconProps {
  size?: number;
  color?: string;
}

/** Magnifier — search bar. */
export function SearchIcon({ size = 15, color = colors.faint }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 15 15" fill="none">
      <Circle cx={6.5} cy={6.5} r={4.5} stroke={color} strokeWidth={1.9} />
      <Path d="M10 10l4 4" stroke={color} strokeWidth={1.9} strokeLinecap="round" />
    </Svg>
  );
}

/** Vertical ⋮ — pipeline header action menu. */
export function KebabIcon({ size = 20, color = colors.ink }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20" fill={color}>
      <Circle cx={10} cy={4} r={1.7} />
      <Circle cx={10} cy={10} r={1.7} />
      <Circle cx={10} cy={16} r={1.7} />
    </Svg>
  );
}

/** Warning triangle — precedes the risk count in the KPI line. */
export function WarningIcon({ size = 12, color = colors.red }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 14 14" fill="none">
      <Path
        d="M7 1.6l5.4 9.4a.8.8 0 0 1-.7 1.2H2.3a.8.8 0 0 1-.7-1.2L7 1.6z"
        stroke={color}
        strokeWidth={1.6}
        strokeLinejoin="round"
      />
      <Path d="M7 5.4v3" stroke={color} strokeWidth={1.6} strokeLinecap="round" />
      <Circle cx={7} cy={10.2} r={0.85} fill={color} />
    </Svg>
  );
}

/** Bottom-nav: pipeline (list). */
export function PipelineIcon({ size = 21, color = colors.ink }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 21 21" fill={color}>
      <Circle cx={4} cy={5} r={1.5} />
      <Rect x={8} y={4} width={10} height={2} rx={1} />
      <Circle cx={4} cy={10.5} r={1.5} />
      <Rect x={8} y={9.5} width={10} height={2} rx={1} />
      <Circle cx={4} cy={16} r={1.5} />
      <Rect x={8} y={15} width={10} height={2} rx={1} />
    </Svg>
  );
}

/** Bottom-nav: market (bars). */
export function MarketIcon({ size = 21, color = colors.faintAlt }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 21 21" fill={color}>
      <Rect x={3} y={11} width={4} height={7} rx={1} />
      <Rect x={8.5} y={6} width={4} height={12} rx={1} />
      <Rect x={14} y={9} width={4} height={9} rx={1} />
    </Svg>
  );
}

/** Bottom-nav: central + (new deal). */
export function PlusIcon({ size = 20, color = '#ffffff' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20" fill={color}>
      <Rect x={9} y={3.5} width={2.2} height={13} rx={1.1} />
      <Rect x={3.4} y={9} width={13} height={2.2} rx={1.1} />
    </Svg>
  );
}

/** Bottom-nav: profile. */
export function ProfileIcon({ size = 21, color = colors.faintAlt }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 21 21" fill={color}>
      <Circle cx={10.5} cy={7.5} r={3.8} />
      <Path d="M4 19c0-3.8 3-6 6.5-6s6.5 2.2 6.5 6" />
    </Svg>
  );
}

/** Chevron back (‹) — detail header. */
export function BackIcon({ size = 22, color = colors.ink }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 22 22" fill="none">
      <Path
        d="M13 5l-6 6 6 6"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/** Chevron right (›) — row affordance. */
export function ChevronRight({ size = 13, color = '#c2bfb8' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 13 13" fill="none">
      <Path
        d="M5 2l5 4.5-5 4.5"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/** Phone handset — contact quick action. */
export function PhoneIcon({ size = 16, color = colors.greenText }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <Path
        d="M3 3.5c0 6 3.5 9.5 9.5 9.5l0-2.5-2.5-1-1.5 1.2C6.8 9.6 6 8.2 5.3 6.5L6.5 5 5.5 2.5z"
        stroke={color}
        strokeWidth={1.7}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/** Envelope — contact quick action. */
export function MailIcon({ size = 16, color = colors.tealText }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <Rect x={2} y={4} width={12} height={9} rx={1.5} stroke={color} strokeWidth={1.7} />
      <Path d="M2.5 5l5.5 4 5.5-4" stroke={color} strokeWidth={1.7} />
    </Svg>
  );
}

/** Info (i) — opens the calc explanation. */
export function InfoIcon({ size = 14, color = '#a8a49c' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 14 14" fill="none">
      <Circle cx={7} cy={7} r={5.5} stroke={color} strokeWidth={1.8} />
      <Path d="M7 6.2v3.4M7 4.4v.1" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}

/** Sliders (adjust) — "Annahmen anpassen" button. */
export function SlidersIcon({ size = 15, color = '#fff' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 15 15" fill="none">
      <Path d="M2 5h11M2 10h11" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
      <Circle cx={5} cy={5} r={2} fill={color} />
      <Circle cx={10} cy={10} r={2} fill={color} />
    </Svg>
  );
}

/** Plus (thin) — add measure. */
export function PlusThin({ size = 14, color = colors.teal }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 14 14" fill={color}>
      <Rect x={6} y={2} width={2} height={10} rx={1} />
      <Rect x={2} y={6} width={10} height={2} rx={1} />
    </Svg>
  );
}

/** Minus — stepper decrement. */
export function MinusIcon({ size = 16, color = colors.ink }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 16 16" fill={color}>
      <Rect x={3} y={7} width={10} height={2} rx={1} />
    </Svg>
  );
}

/** Plus — stepper increment. */
export function PlusStepIcon({ size = 16, color = colors.ink }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 16 16" fill={color}>
      <Rect x={7} y={3} width={2} height={10} rx={1} />
      <Rect x={3} y={7} width={10} height={2} rx={1} />
    </Svg>
  );
}

/** Check — toast + checklist. */
export function CheckIcon({ size = 14, color = colors.green }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 14 14" fill="none">
      <Path
        d="M2 7.5l3 3 6.5-8"
        stroke={color}
        strokeWidth={2.2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/** Padlock — resolved (read-only) risk states. */
export function LockIcon({ size = 15, color = colors.faintAlt }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 15 15" fill="none">
      <Rect x={3} y={7} width={9} height={6} rx={1.5} stroke={color} strokeWidth={1.8} />
      <Path d="M5 7V5a2.5 2.5 0 015 0v2" stroke={color} strokeWidth={1.8} />
    </Svg>
  );
}

/** Document (page) — Fundstelle source line. */
export function DocIcon({ size = 12, color = colors.muted2 }: IconProps) {
  return (
    <Svg width={size} height={(size * 13) / 12} viewBox="0 0 12 13" fill="none">
      <Path d="M2.5 1h5l2.5 2.5v8.5h-7.5z" stroke={color} strokeWidth={1.6} strokeLinejoin="round" />
    </Svg>
  );
}

/** Shield — surveyor / Bausachverständigen affiliate. */
export function ShieldIcon({ size = 18, color = '#fff' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 18 18" fill="none">
      <Path
        d="M9 2l6 3v4c0 4-3 6-6 7-3-1-6-3-6-7V5z"
        stroke={color}
        strokeWidth={1.8}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/** Circular refresh arrows — "Aktualisieren". */
export function RefreshIcon({ size = 14, color = colors.tealText }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 14 14" fill="none">
      <Path d="M3 4v3h3M13 10V7h-3" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M4 7a5 5 0 019-1M12 7a5 5 0 01-9 1" stroke={color} strokeWidth={1.8} />
    </Svg>
  );
}

/** Counter-clock arrow — "Neu eröffnen" (reopen). */
export function ReopenIcon({ size = 14, color = colors.ink2 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 14 14" fill="none">
      <Path d="M7 2a5 5 0 105 5" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
      <Path d="M7 4V.5M9 5h3.5" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

/** Up-arrow — chat send button. */
export function SendIcon({ size = 19, color = '#fff' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 19 19" fill="none">
      <Path d="M9.5 15V4M5 8.5l4.5-4.5 4.5 4.5" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

/** Speech bubble — wizard "Kontext geben" option. */
export function BubbleIcon({ size = 16, color = colors.tealText }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <Path d="M2 3h12v8H8l-3 3v-3H2z" stroke={color} strokeWidth={1.9} strokeLinejoin="round" />
    </Svg>
  );
}

/** Clock — wizard "Fragen an Verkäufer" option. */
export function ClockIcon({ size = 16, color = colors.muted }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <Circle cx={8} cy={8} r={6} stroke={color} strokeWidth={1.9} />
      <Path d="M8 5v3l2 2" stroke={color} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
