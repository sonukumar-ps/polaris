import type { TradeSummary } from '../service';

export type ExecutionBreakdown = {
  entryTimingScore: number;
  exitTimingScore: number;
  followedPlanScore: number;
  sizeAdherenceScore: number;
  stopDisciplineScore: number;
};

export type ExecutionScore = {
  breakdown: ExecutionBreakdown;
  score: number;
  tradeId: string;
};

function scoreEntryTiming(value: string | null): { max: number; score: number } {
  if (value === null) return { max: 0, score: 0 };
  if (value === 'on_time') return { max: 25, score: 25 };
  if (value === 'early' || value === 'late') return { max: 25, score: 12 };
  return { max: 25, score: 0 };
}

function scoreExitTiming(value: string | null): { max: number; score: number } {
  if (value === null) return { max: 0, score: 0 };
  if (value === 'on_time') return { max: 25, score: 25 };
  if (value === 'late') return { max: 25, score: 12 };
  return { max: 25, score: 0 };
}

function scoreSizeAdherence(value: string | null): { max: number; score: number } {
  if (value === null) return { max: 0, score: 0 };
  if (value === 'correct') return { max: 15, score: 15 };
  if (value === 'undersized') return { max: 15, score: 7 };
  return { max: 15, score: 0 };
}

export function calculateExecutionScores(trades: TradeSummary[]): ExecutionScore[] {
  const results: ExecutionScore[] = [];

  for (const trade of trades) {
    const psych = trade.psychology;

    const followedPlan = psych?.followed_plan ?? null;
    const followedPlanScore = followedPlan === true ? 25 : 0;
    const followedPlanMax = followedPlan !== null ? 25 : 0;

    const { score: entryTimingScore, max: entryTimingMax } = scoreEntryTiming(psych?.entry_timing ?? null);
    const { score: exitTimingScore, max: exitTimingMax } = scoreExitTiming(psych?.exit_timing ?? null);
    const { score: sizeAdherenceScore, max: sizeAdherenceMax } = scoreSizeAdherence(
      psych?.position_size_adherence ?? null
    );

    const movedSL = psych?.moved_stop_loss ?? null;
    const stopDisciplineScore = movedSL === false ? 10 : 0;
    const stopDisciplineMax = movedSL !== null ? 10 : 0;

    const filledCount = [
      followedPlan !== null,
      psych?.entry_timing !== null && psych?.entry_timing !== undefined,
      psych?.exit_timing !== null && psych?.exit_timing !== undefined,
      psych?.position_size_adherence !== null && psych?.position_size_adherence !== undefined,
      movedSL !== null
    ].filter(Boolean).length;

    if (filledCount < 2) continue;

    const rawSum = followedPlanScore + entryTimingScore + exitTimingScore + sizeAdherenceScore + stopDisciplineScore;
    const maxPossible = followedPlanMax + entryTimingMax + exitTimingMax + sizeAdherenceMax + stopDisciplineMax;
    const score = maxPossible > 0 ? Math.round((rawSum / maxPossible) * 100) : 0;

    results.push({
      breakdown: {
        entryTimingScore,
        exitTimingScore,
        followedPlanScore,
        sizeAdherenceScore,
        stopDisciplineScore
      },
      score,
      tradeId: trade.id
    });
  }

  return results.sort((a, b) => b.score - a.score);
}
