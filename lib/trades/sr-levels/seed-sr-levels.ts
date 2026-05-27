import { createSrLevel } from './sr-level';
import type { SrLevelInput } from './sr-level.types';

/**
 * Seeds ~20 realistic S/R levels across major forex pairs.
 * Covers horizontal levels, trendlines, and dynamic EMA levels
 * with varied touch counts and roles.
 */
export async function seedSrLevels(): Promise<number> {
  const levels: SrLevelInput[] = [
    // GBPUSD — strong demand zone area
    { symbol: 'GBPUSD', price: 1.2650, type: 'horizontal', levelRole: 'support', touchCount: 5, lastTouchedDate: '2026-05-20', notes: 'Major weekly support, defended 5x' },
    { symbol: 'GBPUSD', price: 1.2820, type: 'horizontal', levelRole: 'resistance', touchCount: 3, lastTouchedDate: '2026-05-26', notes: 'Recent swing high cluster' },
    { symbol: 'GBPUSD', price: 1.2750, type: 'dynamic_ema', levelRole: 'flip_zone', touchCount: 4, lastTouchedDate: '2026-05-27', notes: '50 EMA — has acted as flip zone' },
    { symbol: 'GBPUSD', price: 1.2530, type: 'angular_trendline', levelRole: 'support', touchCount: 4, lastTouchedDate: '2026-05-15', notes: 'Daily uptrend line from April low' },

    // EURUSD — range trading
    { symbol: 'EURUSD', price: 1.0790, type: 'horizontal', levelRole: 'support', touchCount: 4, lastTouchedDate: '2026-05-13', notes: 'Range low — strong reactions' },
    { symbol: 'EURUSD', price: 1.0970, type: 'horizontal', levelRole: 'resistance', touchCount: 3, lastTouchedDate: '2026-05-27', notes: 'Range high resistance' },
    { symbol: 'EURUSD', price: 1.0900, type: 'horizontal', levelRole: 'flip_zone', touchCount: 6, lastTouchedDate: '2026-05-23', notes: 'Mid-range pivot, flipped 3x' },

    // GBPJPY — trending pair
    { symbol: 'GBPJPY', price: 190.50, type: 'horizontal', levelRole: 'support', touchCount: 3, lastTouchedDate: '2026-05-14', notes: 'Daily support from breakout' },
    { symbol: 'GBPJPY', price: 193.00, type: 'horizontal', levelRole: 'resistance', touchCount: 2, lastTouchedDate: '2026-05-14', notes: 'Recent high — needs more touches' },
    { symbol: 'GBPJPY', price: 187.20, type: 'angular_trendline', levelRole: 'support', touchCount: 5, lastTouchedDate: '2026-05-10', notes: 'Weekly uptrend line' },

    // USDJPY
    { symbol: 'USDJPY', price: 156.50, type: 'horizontal', levelRole: 'support', touchCount: 4, lastTouchedDate: '2026-05-26', notes: 'Daily demand zone' },
    { symbol: 'USDJPY', price: 158.20, type: 'horizontal', levelRole: 'resistance', touchCount: 3, lastTouchedDate: '2026-05-22', notes: 'Multi-year high zone' },

    // AUDUSD
    { symbol: 'AUDUSD', price: 0.6620, type: 'horizontal', levelRole: 'support', touchCount: 4, lastTouchedDate: '2026-05-19', notes: 'Weekly support level' },
    { symbol: 'AUDUSD', price: 0.6720, type: 'horizontal', levelRole: 'resistance', touchCount: 3, lastTouchedDate: '2026-05-25', notes: 'Recent rejection cluster' },

    // NZDUSD
    { symbol: 'NZDUSD', price: 0.5950, type: 'horizontal', levelRole: 'support', touchCount: 3, lastTouchedDate: '2026-05-18', notes: 'Multi-month low' },
    { symbol: 'NZDUSD', price: 0.6050, type: 'horizontal', levelRole: 'resistance', touchCount: 4, lastTouchedDate: '2026-05-27', notes: 'Strong overhead resistance' },

    // EURGBP
    { symbol: 'EURGBP', price: 0.8520, type: 'horizontal', levelRole: 'support', touchCount: 5, lastTouchedDate: '2026-05-21', notes: 'Major weekly support' },
    { symbol: 'EURGBP', price: 0.8610, type: 'horizontal', levelRole: 'resistance', touchCount: 3, lastTouchedDate: '2026-05-26', notes: 'Range resistance' },

    // USDCAD
    { symbol: 'USDCAD', price: 1.3600, type: 'horizontal', levelRole: 'support', touchCount: 4, lastTouchedDate: '2026-05-23', notes: 'Daily structural support' },
    { symbol: 'USDCAD', price: 1.3760, type: 'angular_trendline', levelRole: 'resistance', touchCount: 3, lastTouchedDate: '2026-05-20', notes: 'Descending trendline from peak' }
  ];

  let count = 0;

  for (const level of levels) {
    try {
      await createSrLevel(level);
      count++;
    } catch {
      // silent — skip if duplicate or error
    }
  }

  return count;
}
