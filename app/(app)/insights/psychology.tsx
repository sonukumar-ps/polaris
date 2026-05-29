import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppShell, Card, LoadingState, SectionHeading, useAppTheme, userMessage } from '@/lib/ui';
import { listTradeSummaries, useAccountScope } from '@/lib/trades';
import { seedDemoTrades } from '@/lib/trades/seed-trades';
import {
  analyzePostLossBehaviour,
  calculateConvictionCorrelation,
  calculatePsychologyPerformance,
  calculateQualityCorrelation
} from '@/lib/trades/backtesting';
import type { ConvictionBucket, PostLossBehaviour, PsychSegment, QualityBucket, TradeSummary } from '@/lib/trades';

export default function PsychologyScreen() {
  const theme = useAppTheme();
  const { selectedAccountIds } = useAccountScope();
  const [trades, setTrades] = useState<TradeSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSeeding, setIsSeeding] = useState(false);
  const [seedCount, setSeedCount] = useState(0);

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
        if (isActive) setError(userMessage(err, "Couldn't load trades"));
      } finally {
        if (isActive) setIsLoading(false);
      }
    }

    void loadData();
    return () => { isActive = false; };
  }, [selectedAccountIds]);

  const hasPsychData = trades.some((t) => t.psychology !== null);
  const qualityBuckets = calculateQualityCorrelation(trades);
  const convictionBuckets = calculateConvictionCorrelation(trades);
  const psychSegments = calculatePsychologyPerformance(trades);
  const postLoss = analyzePostLossBehaviour(trades);

  return (
    <AppShell activeRoute="insights">
      <SectionHeading
        eyebrow="Behavioural"
        subtitle="How your mental state and execution fidelity affect outcomes."
        title="Psychology"
      />

      {isLoading ? <LoadingState label="Loading psychology data..." /> : null}
      {error ? (
        <Card style={{ borderColor: theme.danger }}>
          <Text style={[styles.errorText, { color: theme.danger }]}>{error}</Text>
        </Card>
      ) : null}

      {!isLoading && !error && !hasPsychData ? (
        <Card>
          <Text style={[styles.emptyTitle, { color: theme.text }]}>No psychology data yet</Text>
          <Text style={[styles.emptyBody, { color: theme.muted }]}>
            Start adding psychology data to your trades to unlock behavioural insights. Tap the "How did you trade?"
            section when logging a trade.
          </Text>
          <Pressable
            disabled={isSeeding}
            onPress={async () => {
              setIsSeeding(true);
              try {
                const count = await seedDemoTrades();
                setSeedCount(count);
                const loaded = await listTradeSummaries({
                  accountIds: selectedAccountIds ?? undefined,
                  limit: 200
                });
                setTrades(loaded);
              } catch (err) {
                setError(userMessage(err, "Couldn't load demo trades"));
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
              {isSeeding ? 'Seeding 20 trades...' : seedCount > 0 ? `✓ Seeded ${seedCount} trades` : '🧪 Load 20 demo trades with psychology data'}
            </Text>
          </Pressable>
        </Card>
      ) : null}

      {!isLoading && !error && hasPsychData ? (
        <View style={styles.content}>
          {qualityBuckets.length > 0 ? (
            <Card>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Setup quality vs outcome</Text>
              <View style={styles.buckets}>
                {qualityBuckets.map((bucket) => (
                  <QualityBucketCard key={bucket.qualityScore} bucket={bucket} />
                ))}
              </View>
            </Card>
          ) : null}

          {convictionBuckets.length > 0 ? (
            <Card>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Conviction level vs outcome</Text>
              <View style={styles.buckets}>
                {convictionBuckets.map((bucket) => (
                  <ConvictionBucketCard key={bucket.convictionRange} bucket={bucket} />
                ))}
              </View>
            </Card>
          ) : null}

          {psychSegments.length > 0 ? (
            <Card>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>State & context performance</Text>
              <View style={styles.segmentRows}>
                {psychSegments.map((seg) => (
                  <SegmentRow key={`${seg.dimension}-${seg.value}`} segment={seg} />
                ))}
              </View>
            </Card>
          ) : null}

          {postLoss ? <PostLossCard postLoss={postLoss} /> : null}
        </View>
      ) : null}
    </AppShell>
  );
}

function QualityBucketCard({ bucket }: { bucket: QualityBucket }) {
  const theme = useAppTheme();
  const pnlColor = bucket.netPnl >= 0 ? theme.positive : theme.danger;

  return (
    <View style={[styles.bucket, { backgroundColor: theme.mutedSurface }]}>
      <Text style={[styles.bucketLabel, { color: theme.muted }]}>Quality {bucket.qualityScore}</Text>
      <Text style={[styles.bucketWr, { color: theme.text }]}>{Math.round(bucket.winRate * 100)}%</Text>
      <Text style={[styles.bucketR, { color: theme.text }]}>{bucket.avgRr.toFixed(2)}R avg</Text>
      <Text style={[styles.bucketPnl, { color: pnlColor }]}>{formatCurrency(bucket.netPnl)}</Text>
      <Text style={[styles.bucketCount, { color: theme.muted }]}>{bucket.tradeCount} trades</Text>
    </View>
  );
}

function ConvictionBucketCard({ bucket }: { bucket: ConvictionBucket }) {
  const theme = useAppTheme();
  const pnlColor = bucket.netPnl >= 0 ? theme.positive : theme.danger;

  return (
    <View style={[styles.bucket, { backgroundColor: theme.mutedSurface }]}>
      <Text style={[styles.bucketLabel, { color: theme.muted }]}>{capitalize(bucket.convictionRange)}</Text>
      <Text style={[styles.bucketWr, { color: theme.text }]}>{Math.round(bucket.winRate * 100)}%</Text>
      <Text style={[styles.bucketR, { color: theme.text }]}>{bucket.avgRr.toFixed(2)}R avg</Text>
      <Text style={[styles.bucketPnl, { color: pnlColor }]}>{formatCurrency(bucket.netPnl)}</Text>
      <Text style={[styles.bucketCount, { color: theme.muted }]}>{bucket.tradeCount} trades</Text>
    </View>
  );
}

function SegmentRow({ segment }: { segment: PsychSegment }) {
  const theme = useAppTheme();
  const pnlColor = segment.netPnl >= 0 ? theme.positive : theme.danger;

  return (
    <View style={[styles.segmentRow, { borderBottomColor: theme.border }]}>
      <View style={styles.segmentLabel}>
        <Text style={[styles.segmentDim, { color: theme.muted }]}>{formatDimension(segment.dimension)}</Text>
        <Text style={[styles.segmentVal, { color: theme.text }]}>{formatValue(segment.value)}</Text>
      </View>
      <Text style={[styles.segmentStat, { color: theme.muted }]}>{segment.tradeCount} trades</Text>
      <Text style={[styles.segmentStat, { color: theme.text }]}>{Math.round(segment.winRate * 100)}%</Text>
      <Text style={[styles.segmentStat, { color: pnlColor }]}>{formatCurrency(segment.netPnl)}</Text>
    </View>
  );
}

function PostLossCard({ postLoss }: { postLoss: PostLossBehaviour }) {
  const theme = useAppTheme();
  const delta = postLoss.postLossWinRate - postLoss.baselineWinRate;
  const deltaColor = delta >= 0 ? theme.positive : theme.danger;

  return (
    <Card>
      <Text style={[styles.sectionTitle, { color: theme.text }]}>After a loss</Text>
      <Text style={[styles.postLossSubtitle, { color: theme.muted }]}>
        How your next trade performs after a losing trade
      </Text>
      <View style={styles.postLossMetrics}>
        <PostLossMetric
          label="Post-loss win rate"
          value={`${Math.round(postLoss.postLossWinRate * 100)}%`}
          valueColor={deltaColor}
        />
        <PostLossMetric
          label="Baseline win rate"
          value={`${Math.round(postLoss.baselineWinRate * 100)}%`}
          valueColor={theme.text}
        />
        <PostLossMetric
          label="Avg time before next trade"
          value={`${Math.round(postLoss.avgTimeBetweenLossAndNextMinutes)} min`}
          valueColor={theme.text}
        />
        <PostLossMetric
          label="Revenge/frustrated trades"
          value={String(postLoss.revengeTradeCount)}
          valueColor={postLoss.revengeTradeCount > 0 ? theme.danger : theme.positive}
        />
      </View>
    </Card>
  );
}

function PostLossMetric({ label, value, valueColor }: { label: string; value: string; valueColor: string }) {
  const theme = useAppTheme();

  return (
    <View style={[styles.postLossMetric, { backgroundColor: theme.mutedSurface }]}>
      <Text style={[styles.postLossMetricLabel, { color: theme.muted }]}>{label}</Text>
      <Text style={[styles.postLossMetricValue, { color: valueColor }]}>{value}</Text>
    </View>
  );
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatDimension(dim: string) {
  const labels: Record<string, string> = {
    emotional_state: 'Emotion',
    energy_level: 'Energy',
    focus_level: 'Focus',
    htf_bias: 'HTF Bias',
    market_condition: 'Market'
  };
  return labels[dim] ?? dim;
}

function formatValue(value: string) {
  return value.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en', {
    currency: 'USD',
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
    style: 'currency'
  }).format(value);
}

const styles = StyleSheet.create({
  content: { gap: 12 },
  sectionTitle: { fontSize: 17, fontWeight: '800', marginBottom: 10 },
  emptyTitle: { fontSize: 17, fontWeight: '800' },
  emptyBody: { fontSize: 14, lineHeight: 21, marginTop: 4 },
  errorText: { fontSize: 14, fontWeight: '800' },
  buckets: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  bucket: { flex: 1, minWidth: 100, gap: 3, borderRadius: 8, padding: 10, alignItems: 'center' },
  bucketLabel: { fontSize: 11, fontWeight: '800' },
  bucketWr: { fontSize: 20, fontWeight: '800' },
  bucketR: { fontSize: 12 },
  bucketPnl: { fontSize: 13, fontWeight: '800' },
  bucketCount: { fontSize: 11 },
  segmentRows: { gap: 0 },
  segmentRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1 },
  segmentLabel: { flex: 2, gap: 1 },
  segmentDim: { fontSize: 11, fontWeight: '800' },
  segmentVal: { fontSize: 14, fontWeight: '800' },
  segmentStat: { flex: 1, fontSize: 13, textAlign: 'right' },
  postLossSubtitle: { fontSize: 13, lineHeight: 19, marginTop: -6, marginBottom: 4 },
  postLossMetrics: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  postLossMetric: { flex: 1, minWidth: 130, gap: 4, borderRadius: 8, padding: 10 },
  postLossMetricLabel: { fontSize: 11, fontWeight: '800' },
  postLossMetricValue: { fontSize: 17, fontWeight: '800' },
  seedButton: { alignItems: 'center', borderRadius: 8, borderWidth: 1, marginTop: 12, paddingHorizontal: 14, paddingVertical: 10 },
  seedButtonText: { fontSize: 13, fontWeight: '800' },
  pressed: { opacity: 0.72 }
});
