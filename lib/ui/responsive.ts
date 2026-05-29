import { useWindowDimensions } from 'react-native';

export type Breakpoint = 'compact' | 'regular' | 'wide';

/**
 * Width-based breakpoints aligned with Apple's HIG size classes.
 *  - compact: phones in portrait, very narrow web (<600)
 *  - regular: phones in landscape, small tablets (600-899)
 *  - wide:    tablets and desktop, sidebar visible (>=900)
 */
export function useBreakpoint(): Breakpoint {
  const { width } = useWindowDimensions();
  if (width < 600) return 'compact';
  if (width < 900) return 'regular';
  return 'wide';
}

/**
 * Boolean shortcuts for common width checks.
 */
export function useIsCompact(): boolean {
  return useBreakpoint() === 'compact';
}

export function useIsWide(): boolean {
  return useBreakpoint() === 'wide';
}
