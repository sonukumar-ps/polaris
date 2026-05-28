import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppShell, Card, LoadingState, SectionHeading, useAppTheme } from '@/lib/ui';
import { listTradeSummaries, useAccountScope } from '@/lib/trades';
import { calculateExecutionScores } from '@/lib/trades/backtesting';
import { seedDemoTrades } from '@/lib/trades/seed-trades';
import type { ExecutionScore, TradeSummary } from '@/lib/trades';

export default function BestProcessScreen() {
  const theme = useAppTheme();
  const { selectedAccountIds } = useAccountScope();
  const [trades, setTrades] = useState<TradeSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSeeding, setIsSeeding] = useState(false);

  async function reload() {
    setIsLoading(true);
    setError(null);
    try {
      const loaded = await listTradeSummaries({
        accountIds: selectedAccountIds ?? undefined,
        limit: 200
      });
      setTrades(loaded);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load trades.');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    let isActive = true;

    async function loadData() {
      setIsLoading(true);
      setError(null);

      try {
        const loaded = await listTradeSummaries({
          accountIds: selectedAccountIds ?? undefined,
          limit: 200
        });

        if (isActive) setTrades(loaded);
      } catch (err) {
        if (isActive) setError(err instanceof Error ? err.message : 'Could not load trades.');
      } finally {
        if (isActive) setIsLoading(false);
      }
    }

    void loadData();
    return () => { isActive = false; };
  }, [selectedAccountIds]);

  const scores = calculateExecutionScores(trades);
  const top5 = scores.slice(0, 5);
  const tradesById = new Map(trades.map((t) => [t.id, t]));

  return (
    <AppShell activeRoute="insights">
      <SectionHeading
        eyebrow="RAS Reinforcement"
        subtitle="Your most disciplined trades — not highest P&L, but best process."
        title="Best process"
      />

      {isLoading ? <LoadingState label="Scoring execution..." /> : null}
      {error ? (
        <Card style={{ borderColor: theme.danger }}>
          <Text style={[styles.errorText, { color: theme.danger }]}>{error}</Text>
        </Card>
      ) : null}

      {!isLoading && !error ? (
        <View style={styles.content}>
          <Card style={[styles.headerCard, { borderLeftWidth: 3, borderLeftColor: theme.positive }]}>
            <Text style={[styles.headerText, { color: theme.text }]}>
              These trades scored highest on execution — plan adherence, timing, and discipline — regardless of P&L
              outcome. This is what good process looks like. Study it.
            </Text>
          </Card>

          {scores.length < 5 ? (
            <Card>
              <Text style={[styles.emptyTitle, { color: theme.text }]}>
                {scores.length === 0 ? 'No execution data yet' : `${scores.length} of 5 trades scored`}
              </Text>
              <Text style={[styles.emptyBody, { color: theme.muted }]}>
                Log at least {5 - scores.length} more{scores.length === 0 ? '' : ' '} trade
                {5 - scores.length === 1 ? '' : 's'} with execution fields (followed plan, timing, stop discipline) to
                unlock best-process review.
              </Text>
              {scores.length === 0 ? (
                <Pressable
                  disabled={isSeeding}
                  onPress={async () => {
                    setIsSeeding(true);
                    try {
                      await seedDemoTrades();
                      await reload();
                    } catch (err) {
                      setError(err instanceof Error ? err.message : 'Could not seed demo trades.');
                    } finally {
                      setIsSeeding(false);
                    }
                  }}
                  style={({ pressed }) => [
                    styles.seedButton,
                    { backgroundColor: theme.mutedSurface, borderColor: theme.border },
                    pressed && styles.pressed
                  ]}
                >
                  <Text style={[styles.seedButtonText, { color: theme.accent }]}>
                    {isSeeding ? 'Seeding 20 trades...' : '🧪 Load 20 demo trades with execution data'}
                  </Text>
                </Pressable>
              ) : null}
            </Card>
          ) : null}

          {top5.map((scoreEntry, index) => {
            const trade = tradesById.get(scoreEntry.tradeId);
            if (!trade) return null;

            return (
              <BestProcessCard key={scoreEntry.tradeId} index={index + 1} score={scoreEntry} trade={trade} />
            );
          })}
        </View>
      ) : null}
    </AppShell>
  );
}

function BestProcessCard({
  index,
  score,
  trade
}: {
  index: number;
  score: ExecutionScore;
  trade: TradeSummary;
}) {
  const theme = useAppTheme();
  const pnlColor =
    trade.net_pnl === null ? theme.muted : Number(trade.net_pnl) >= 0 ? theme.positive : theme.danger;

  return (
    <Card>
      <View style={styles.tradeHeader}>
        <View style={[styles.rankBadge, { backgroundColor: theme.accent }]}>
          <Text style={styles.rankText}>#{index}</Text>
        </View>
        <View style={styles.tradeInfo}>
          <Text style={[styles.tradeSymbol, { color: theme.text }]}>
            {trade.direction.toUpperCase()} {trade.asset?.symbol ?? 'Trade'}
          </Text>
          <Text style={[styles.tradeMeta, { color: theme.muted }]}>
            {trade.opened_at ? new Date(trade.opened_at).toLocaleDateString('en', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}
          </Text>
        </View>
        <View style={styles.tradeRight}>
          <Text style={[styles.tradePnl, { color: pnlColor }]}>
            {trade.net_pnl !== null ? formatCurrency(Number(trade.net_pnl)) : 'Open'}
          </Text>
          <View style={[styles.scoreBadge, { backgroundColor: theme.positive }]}>
            <Text style={styles.scoreText}>{score.score}/100</Text>
          </View>
        </View>
      </View>

      <ScoreBar score={score} />

      {trade.psychology ? (
        <View style={styles.psychRow}>
          {trade.psychology.emotional_state ? (
            <PsychChip label="Emotion" value={formatValue(trade.psychology.emotional_state)} />
          ) : null}
          {trade.psychology.energy_level !== null ? (
            <PsychChip label="Energy" value={`${trade.psychology.energy_level}/5`} />
          ) : null}
          {trade.psychology.focus_level !== null ? (
            <PsychChip label="Focus" value={`${trade.psychology.focus_level}/5`} />
          ) : null}
        </View>
      ) : null}
    </Card>
  );
}

function ScoreBar({ score }: { score: ExecutionScore }) {
  const theme = useAppTheme();
  const components = [
    { label: 'Plan', max: 25, value: score.breakdown.followedPlanScore },
    { label: 'Entry', max: 25, value: score.breakdown.entryTimingScore },
    { label: 'Exit', max: 25, value: score.breakdown.exitTimingScore },
    { label: 'Size', max: 15, value: score.breakdown.sizeAdherenceScore },
    { label: 'SL', max: 10, value: score.breakdown.stopDisciplineScore }
  ];

  return (
    <View style={styles.scoreBar}>
      {components.map((c) => {
        const pct = c.max > 0 ? c.value / c.max : 0;
        return (
          <View key={c.label} style={styles.scoreComponent}>
            <Text style={[styles.scoreLabel, { color: theme.muted }]}>{c.label}</Text>
            <View style={[styles.scoreTrack, { backgroundColor: theme.border }]}>
              <View
                style={[
                  styles.scoreFill,
                  { backgroundColor: pct >= 1 ? theme.positive : pct > 0 ? theme.accent : theme.border, width: `${pct * 100}%` }
                ]}
              />
            </View>
            <Text style={[styles.scoreVal, { color: theme.muted }]}>{c.value}</Text>
          </View>
        );
      })}
    </View>
  );
}

function PsychChip({ label, value }: { label: string; value: string }) {
  const theme = useAppTheme();

  return (
    <View style={[styles.psychChip, { backgroundColor: theme.mutedSurface }]}>
      <Text style={[styles.psychChipLabel, { color: theme.muted }]}>{label}</Text>
      <Text style={[styles.psychChipValue, { color: theme.text }]}>{value}</Text>
    </View>
  );
}

function formatValue(value: string) {
  return value.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en', {
    currency: 'USD',
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
    style: 'currency'
  }).format(value);
}

const styles = StyleSheet.create({
  content: { gap: 12 },
  headerCard: { gap: 0 },
  headerText: { fontSize: 14, lineHeight: 21 },
  emptyTitle: { fontSize: 17, fontWeight: '800' },
  emptyBody: { fontSize: 14, lineHeight: 21, marginTop: 4 },
  errorText: { fontSize: 14, fontWeight: '800' },
  tradeHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rankBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center'
  },
  rankText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
  tradeInfo: { flex: 1, gap: 2 },
  tradeSymbol: { fontSize: 16, fontWeight: '800' },
  tradeMeta: { fontSize: 12 },
  tradeRight: { alignItems: 'flex-end', gap: 4 },
  tradePnl: { fontSize: 16, fontWeight: '800' },
  scoreBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  scoreText: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' },
  scoreBar: { gap: 6, marginTop: 4 },
  scoreComponent: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  scoreLabel: { width: 36, fontSize: 11, fontWeight: '800' },
  scoreTrack: { flex: 1, height: 6, borderRadius: 3, overflow: 'hidden' },
  scoreFill: { height: '100%', borderRadius: 3 },
  scoreVal: { width: 24, fontSize: 11, textAlign: 'right' },
  psychRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  psychChip: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 5, gap: 1 },
  psychChipLabel: { fontSize: 10, fontWeight: '800' },
  psychChipValue: { fontSize: 13, fontWeight: '800' },
  seedButton: { alignItems: 'center', borderRadius: 8, borderWidth: 1, marginTop: 12, paddingHorizontal: 14, paddingVertical: 10 },
  seedButtonText: { fontSize: 13, fontWeight: '800' },
  pressed: { opacity: 0.72 }
});
