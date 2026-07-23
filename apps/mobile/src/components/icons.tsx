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
