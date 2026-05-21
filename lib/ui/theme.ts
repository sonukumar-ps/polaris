import { useColorScheme } from 'react-native';

export type AppTheme = {
  accent: string;
  background: string;
  border: string;
  card: string;
  danger: string;
  isDark: boolean;
  muted: string;
  mutedSurface: string;
  positive: string;
  text: string;
};

export function useAppTheme(): AppTheme {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';

  return {
    accent: '#007AFF',
    background: isDark ? '#0B0B0C' : '#F7F7F5',
    border: isDark ? '#2A2A2C' : '#E5E5E0',
    card: isDark ? '#151517' : '#FFFFFF',
    danger: '#FF453A',
    isDark,
    muted: isDark ? '#A1A1A6' : '#6E6E73',
    mutedSurface: isDark ? '#1D1D20' : '#EFEFEC',
    positive: '#30D158',
    text: isDark ? '#F5F5F7' : '#1D1D1F'
  };
}
