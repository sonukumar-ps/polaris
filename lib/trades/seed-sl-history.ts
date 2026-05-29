import { supabase } from '@/lib/supabase';
import { addStopLossMove, markBulletproof } from './orders/order';

/**
 * Seeds stop-loss trail history on a few of the user's most recent trades.
 * Picks trades with stop_loss_price set and adds 1-3 trail moves each,
 * plus marks one as bulletproof.
 *
 * Returns the number of trail moves added across all trades.
 */
export async function seedStopLossHistory(): Promise<{
  movesAdded: number;
  tradesUpdated: number;
}> {
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData.user) {
    throw new Error('You must be signed in to seed SL history.');
  }

  // Find trades with stop_loss_price set, closed (so we have full history)
  const { data: trades, error: tradesError } = await supabase
    .from('trades')
    .select('id, entry_price, stop_loss_price, direction, opened_at, closed_at, exit_price')
    .eq('user_id', userData.user.id)
    .not('stop_loss_price', 'is', null)
    .eq('status', 'closed')
    .order('opened_at', { ascending: false })
    .limit(6);

  if (tradesError) {
    throw new Error(`Could not load trades: ${tradesError.message}`);
  }

  if (!trades || trades.length === 0) {
    throw new Error('No closed trades with stop loss found. Seed trades first.');
  }

  let movesAdded = 0;
  let tradesUpdated = 0;

  // Pattern: alternate trades get 1, 2, or 3 trails, last one gets bulletproof
  for (let i = 0; i < trades.length; i++) {
    const trade = trades[i];
    if (!trade.stop_loss_price || !trade.opened_at) continue;

    const initialSl = Number(trade.stop_loss_price);
    const entryPrice = Number(trade.entry_price);
    const isLong = trade.direction === 'long';
    const openedMs = new Date(trade.opened_at).getTime();
    const closedMs = trade.closed_at ? new Date(trade.closed_at).getTime() : openedMs + 24 * 60 * 60 * 1000;
    const duration = closedMs - openedMs;

    // Determine how many trails to add (cycling 0, 1, 2, 3)
    const trailCount = i % 4;

    let currentSl = initialSl;

    for (let j = 0; j < trailCount; j++) {
      // Trail by 1/3 of distance to entry each step (toward breakeven and beyond)
      const distance = entryPrice - currentSl;
      const newSl = currentSl + distance * 0.4;
      const movedAt = new Date(openedMs + (duration * (j + 1)) / (trailCount + 1)).toISOString();

      const reasons = [
        'Trail to last daily low',
        'Move to breakeven after 1R profit',
        'Trail to 1H swing low',
        'Lock in 50% of running profit',
        'Daily close confirmation, trail SL'
      ];

      try {
        await addStopLossMove({
          movedAt,
          newPrice: Number(newSl.toFixed(5)),
          oldPrice: Number(currentSl.toFixed(5)),
          reason: reasons[(i + j) % reasons.length],
          tradeId: trade.id
        });

        currentSl = newSl;
        movesAdded++;
      } catch {
        // Skip if it fails (e.g. trade not owned)
      }
    }

    // Mark every 3rd trade as bulletproof (if it had at least one trail)
    if (trailCount >= 2 && (isLong ? currentSl >= entryPrice : currentSl <= entryPrice)) {
      try {
        await markBulletproof(trade.id);
      } catch {
        // silent
      }
    }

    if (trailCount > 0) {
      tradesUpdated++;
    }
  }

  return { movesAdded, tradesUpdated };
}
