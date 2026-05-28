import { useColorScheme } from 'react-native';

export type AppTheme = {
  accent: string;
  accentMuted: string;       // subtle accent tint for backgrounds
  background: string;
  border: string;
  borderStrong: string;      // stronger border for emphasis
  card: string;
  cardElevated: string;      // slightly lighter card surface for layered UI
  danger: string;
  dangerMuted: string;       // subtle danger tint for backgrounds
  isDark: boolean;
  muted: string;
  mutedSurface: string;
  positive: string;
  positiveMuted: string;     // subtle positive tint for backgrounds
  shadow: string;            // shadow color tuned per scheme
  text: string;
  textSecondary: string;     // softer than text but stronger than muted
  warning: string;
};

/**
 * Design tokens — use these instead of magic numbers so the whole
 * app moves together when the design language changes.
 */
export const RADIUS = {
  small: 8,
  medium: 12,
  large: 16,
  xlarge: 22,
  pill: 999
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28
};

export const TYPOGRAPHY = {
  largeTitle: { fontSize: 32, fontWeight: '700' as const, letterSpacing: -0.6, lineHeight: 38 },
  title1: { fontSize: 26, fontWeight: '700' as const, letterSpacing: -0.4, lineHeight: 32 },
  title2: { fontSize: 20, fontWeight: '700' as const, letterSpacing: -0.3, lineHeight: 26 },
  title3: { fontSize: 17, fontWeight: '700' as const, letterSpacing: -0.2, lineHeight: 22 },
  headline: { fontSize: 15, fontWeight: '600' as const, lineHeight: 20 },
  body: { fontSize: 15, fontWeight: '400' as const, lineHeight: 22 },
  bodyEmphasis: { fontSize: 15, fontWeight: '600' as const, lineHeight: 22 },
  callout: { fontSize: 14, fontWeight: '500' as const, lineHeight: 19 },
  subhead: { fontSize: 13, fontWeight: '600' as const, lineHeight: 18 },
  footnote: { fontSize: 12, fontWeight: '500' as const, lineHeight: 16 },
  caption: { fontSize: 11, fontWeight: '500' as const, lineHeight: 14 },
  eyebrow: { fontSize: 11, fontWeight: '700' as const, letterSpacing: 0.8, textTransform: 'uppercase' as const }
};

export function useAppTheme(): AppTheme {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';

  return {
    accent: '#007AFF',
    accentMuted: isDark ? 'rgba(0, 122, 255, 0.16)' : 'rgba(0, 122, 255, 0.10)',
    background: isDark ? '#000000' : '#F7F7F5',
    border: isDark ? '#2A2A2C' : '#E5E5E0',
    borderStrong: isDark ? '#3A3A3C' : '#D2D2CC',
    card: isDark ? '#1C1C1E' : '#FFFFFF',
    cardElevated: isDark ? '#2C2C2E' : '#FFFFFF',
    danger: '#FF453A',
    dangerMuted: isDark ? 'rgba(255, 69, 58, 0.16)' : 'rgba(255, 69, 58, 0.10)',
    isDark,
    muted: isDark ? '#98989E' : '#86868B',
    mutedSurface: isDark ? '#2C2C2E' : '#F2F2EE',
    positive: '#30D158',
    positiveMuted: isDark ? 'rgba(48, 209, 88, 0.16)' : 'rgba(48, 209, 88, 0.10)',
    shadow: isDark ? '#000000' : '#9C9C95',
    text: isDark ? '#F5F5F7' : '#1D1D1F',
    textSecondary: isDark ? '#C7C7CC' : '#3C3C43',
    warning: '#FF9F0A'
  };
}
