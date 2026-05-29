import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppShell, Card, InfoTip, LoadingState, SectionHeading, useAppTheme, userMessage } from '@/lib/ui';
import type { GlossaryTerm } from '@/lib/ui';
import {
  getChecklistAnalytics,
  getChecklistDailyBreakdown
} from '@/lib/trades';
import type { ChecklistAnalyticsSummary, DailyChecklistCount } from '@/lib/trades';
import { seedAnalyticsDemoData } from '@/lib/trades/checklists/seed-analytics-data';

const RANGES = [
  { days: 7, label: '7d' },
  { days: 14, label: '14d' },
  { days: 30, label: '30d' }
] as const;

export default function ChecklistAnalyticsScreen() {
  const theme = useAppTheme();
  const [rangeDays, setRangeDays] = useState<number>(14);
  const [summary, setSummary] = useState<ChecklistAnalyticsSummary | null>(null);
  const [breakdown, setBreakdown] = useState<DailyChecklistCount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSeeding, setIsSeeding] = useState(false);
  const [seedResult, setSeedResult] = useState<string | null>(null);

  async function reload() {
    setIsLoading(true);
    setError(null);

    const endDate = new Date().toISOString().slice(0, 10);
    const startDate = new Date(Date.now() - (rangeDays - 1) * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);

    try {
      const [s, b] = await Promise.all([
        getChecklistAnalytics({ endDate, startDate }),
        getChecklistDailyBreakdown({ endDate, startDate })
      ]);
      setSummary(s);
      setBreakdown(b);
    } catch (err) {
      setError(userMessage(err, "Couldn't load analytics"));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void reload();
  }, [rangeDays]);

  const hasData = summary !== null && summary.totalChecklists > 0;

  return (
    <AppShell activeRoute="insights">
      <SectionHeading
        eyebrow="Analytics"
        subtitle="Track checklist consistency, qualify rates, and which criteria fail most often."
        title="Checklist insights"
      />

      <Card>
        <View style={styles.rangeRow}>
          {RANGES.map((r) => {
            const isSelected = rangeDays === r.days;
            return (
              <Pressable
                key={r.days}
                onPress={() => setRangeDays(r.days)}
                style={({ pressed }) => [
                  styles.rangeButton,
                  {
                    backgroundColor: isSelected ? theme.accent : theme.mutedSurface,
                    borderColor: isSelected ? theme.accent : theme.border
                  },
                  pressed && styles.pressed
                ]}
              >
                <Text style={[styles.rangeText, { color: isSelected ? '#FFFFFF' : theme.muted }]}>
                  {r.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </Card>

      {isLoading ? <LoadingState label="Loading analytics..." /> : null}
      {error ? (
        <Card style={{ borderColor: theme.danger }}>
          <Text style={[styles.errorText, { color: theme.danger }]}>{error}</Text>
        </Card>
      ) : null}

      {!isLoading && !hasData ? (
        <Card>
          <Text style={[styles.emptyTitle, { color: theme.text }]}>No checklist data</Text>
          <Text style={[styles.emptyBody, { color: theme.muted }]}>
            Fill out checklists in the Checklist tab, or seed 14 days of demo data below.
          </Text>
          {seedResult ? (
            <Text style={[styles.seedResult, { color: theme.positive }]}>{seedResult}</Text>
          ) : null}
          <Pressable
            disabled={isSeeding}
            onPress={async () => {
              setIsSeeding(true);
              setSeedResult(null);
              try {
                const r = await seedAnalyticsDemoData();
                setSeedResult(
                  `✓ ${r.checklistsCreated} checklists across ${r.daysSeeded} days, ${r.tradesCreated} trades (${r.ordersTriggered} triggered, ${r.ordersExpired} expired)`
                );
                await reload();
              } catch (err) {
                setError(userMessage(err, "Couldn't load demo data"));
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
              {isSeeding ? 'Seeding 14 days of data...' : '🧪 Seed 14 days of checklist + trade data'}
            </Text>
          </Pressable>
        </Card>
      ) : null}

      {!isLoading && hasData && summary ? (
        <View style={styles.content}>
          {/* Headline metrics */}
          <Card>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Headline metrics</Text>
            <View style={styles.headlineGrid}>
              <HeadlineMetric
                label="Qualify rate"
                term="qualify_rate"
                value={`${Math.round(summary.qualifyRate * 100)}%`}
                meta={`${summary.qualifiedCount} of ${summary.totalChecklists} setups`}
                color={summary.qualifyRate >= 0.2 ? theme.positive : theme.muted}
              />
              <HeadlineMetric
                label="Consistency"
                term="consistency_rate"
                value={`${Math.round(summary.consistencyRate * 100)}%`}
                meta={`${summary.daysWithChecklists} of ${summary.totalDaysInRange} days`}
                color={summary.consistencyRate >= 0.7 ? theme.positive : theme.danger}
              />
              <HeadlineMetric
                label="Trigger rate"
                term="trigger_rate"
                value={
                  summary.ordersPlacedFromChecklist > 0
                    ? `${Math.round(summary.triggerRate * 100)}%`
                    : '—'
                }
                meta={
                  summary.ordersPlacedFromChecklist > 0
                    ? `${summary.ordersTriggered}/${summary.ordersPlacedFromChecklist} orders filled`
                    : 'No orders placed yet'
                }
                color={
                  summary.ordersPlacedFromChecklist === 0
                    ? theme.muted
                    : summary.triggerRate >= 0.4 && summary.triggerRate <= 0.7
                      ? theme.positive
                      : theme.text
                }
              />
              <HeadlineMetric
                label="Qualified win rate"
                term="qualified_win_rate"
                value={
                  summary.qualifiedTradesWon + summary.qualifiedTradesLost > 0
                    ? `${Math.round(summary.qualifiedWinRate * 100)}%`
                    : '—'
                }
                meta={`${summary.qualifiedTradesWon}W / ${summary.qualifiedTradesLost}L`}
                color={summary.qualifiedWinRate >= 0.5 ? theme.positive : theme.danger}
              />
            </View>
          </Card>

          {/* Daily breakdown sparkline */}
          {breakdown.length > 0 ? (
            <Card>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Daily breakdown</Text>
              <Text style={[styles.cardSubtitle, { color: theme.muted }]}>
                Pairs checked per day, qualified setups highlighted
              </Text>
              <DailyChart breakdown={breakdown} totalDays={summary.totalDaysInRange} />
            </Card>
          ) : null}

          {/* Decision breakdown */}
          <Card>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Decisions</Text>
            <View style={styles.decisionList}>
              <DecisionRow
                color={theme.positive}
                count={summary.decisionBreakdown.trade}
                label="Trade"
                total={summary.totalChecklists}
              />
              <DecisionRow
                color={theme.accent}
                count={summary.decisionBreakdown.watch}
                label="Watch"
                total={summary.totalChecklists}
              />
              <DecisionRow
                color={theme.danger}
                count={summary.decisionBreakdown.skip}
                label="Skip"
                total={summary.totalChecklists}
              />
              <DecisionRow
                color={theme.muted}
                count={summary.decisionBreakdown.undecided}
                label="Undecided"
                total={summary.totalChecklists}
              />
            </View>
          </Card>

          {/* Critical column pass rates */}
          <Card>
            <View style={styles.headlineLabelRow}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Critical column pass rates</Text>
              <InfoTip term="critical_columns" />
            </View>
            <Text style={[styles.cardSubtitle, { color: theme.muted }]}>
              Which criterion is your most common veto?
            </Text>
            <View style={styles.criticalGrid}>
              <CriticalCard
                label="Market condition"
                fillRate={summary.criticalColumnStats.marketCondition.fillRate}
                passRate={summary.criticalColumnStats.marketCondition.passRate}
              />
              <CriticalCard
                label="Market phase"
                fillRate={summary.criticalColumnStats.marketPhase.fillRate}
                passRate={summary.criticalColumnStats.marketPhase.passRate}
              />
              <CriticalCard
                label="S/R reaction"
                fillRate={summary.criticalColumnStats.srReaction.fillRate}
                passRate={summary.criticalColumnStats.srReaction.passRate}
              />
              <CriticalCard
                label="Deceleration"
                fillRate={summary.criticalColumnStats.deceleration.fillRate}
                passRate={summary.criticalColumnStats.deceleration.passRate}
              />
            </View>
          </Card>
        </View>
      ) : null}
    </AppShell>
  );
}

function HeadlineMetric({
  color,
  label,
  meta,
  term,
  value
}: {
  color: string;
  label: string;
  meta: string;
  term?: GlossaryTerm;
  value: string;
}) {
  const theme = useAppTheme();
  return (
    <View style={[styles.headlineCard, { backgroundColor: theme.mutedSurface }]}>
      <View style={styles.headlineLabelRow}>
        <Text style={[styles.headlineLabel, { color: theme.muted }]}>{label}</Text>
        {term ? <InfoTip term={term} /> : null}
      </View>
      <Text style={[styles.headlineValue, { color }]}>{value}</Text>
      <Text style={[styles.headlineMeta, { color: theme.muted }]}>{meta}</Text>
    </View>
  );
}

function DailyChart({
  breakdown,
  totalDays
}: {
  breakdown: DailyChecklistCount[];
  totalDays: number;
}) {
  const theme = useAppTheme();
  const maxTotal = Math.max(...breakdown.map((b) => b.total), 1);

  // Build all days in range to show gaps
  const dateMap = new Map(breakdown.map((b) => [b.date, b]));
  const today = new Date();
  const allDays: (DailyChecklistCount | { date: string; empty: true })[] = [];

  for (let i = totalDays - 1; i >= 0; i--) {
    const d = new Date(today.getTime() - i * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);
    const entry = dateMap.get(d);
    if (entry) {
      allDays.push(entry);
    } else {
      allDays.push({ date: d, empty: true });
    }
  }

  return (
    <View style={styles.chartContainer}>
      <View style={styles.chartBars}>
        {allDays.map((day) => {
          if ('empty' in day) {
            return (
              <View key={day.date} style={styles.chartCol}>
                <View style={[styles.chartBar, { backgroundColor: theme.border, height: 4 }]} />
              </View>
            );
          }

          const totalPct = (day.total / maxTotal) * 100;
          const qualifiedPct = day.total > 0 ? (day.qualified / day.total) * totalPct : 0;

          return (
            <View key={day.date} style={styles.chartCol}>
              <View style={styles.chartStack}>
                <View
                  style={[
                    styles.chartBar,
                    {
                      backgroundColor: theme.mutedSurface,
                      height: `${totalPct}%`
                    }
                  ]}
                />
                {day.qualified > 0 ? (
                  <View
                    style={[
                      styles.chartBarQualified,
                      {
                        backgroundColor: theme.positive,
                        height: `${qualifiedPct}%`
                      }
                    ]}
                  />
                ) : null}
              </View>
              <Text style={[styles.chartLabel, { color: theme.muted }]}>
                {day.date.slice(8, 10)}
              </Text>
            </View>
          );
        })}
      </View>
      <View style={styles.chartLegend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: theme.mutedSurface }]} />
          <Text style={[styles.legendText, { color: theme.muted }]}>Total checked</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: theme.positive }]} />
          <Text style={[styles.legendText, { color: theme.muted }]}>Qualified</Text>
        </View>
      </View>
    </View>
  );
}

function DecisionRow({
  color,
  count,
  label,
  total
}: {
  color: string;
  count: number;
  label: string;
  total: number;
}) {
  const theme = useAppTheme();
  const pct = total > 0 ? (count / total) * 100 : 0;

  return (
    <View style={styles.decisionRow}>
      <View style={styles.decisionLabel}>
        <View style={[styles.decisionDot, { backgroundColor: color }]} />
        <Text style={[styles.decisionLabelText, { color: theme.text }]}>{label}</Text>
      </View>
      <View style={[styles.decisionBar, { backgroundColor: theme.mutedSurface }]}>
        <View style={[styles.decisionBarFill, { backgroundColor: color, width: `${pct}%` }]} />
      </View>
      <Text style={[styles.decisionCount, { color: theme.muted }]}>
        {count} ({Math.round(pct)}%)
      </Text>
    </View>
  );
}

function CriticalCard({
  fillRate,
  label,
  passRate
}: {
  fillRate: number;
  label: string;
  passRate: number;
}) {
  const theme = useAppTheme();
  const passColor = passRate >= 0.6 ? theme.positive : passRate >= 0.3 ? theme.text : theme.danger;

  return (
    <View style={[styles.criticalCard, { backgroundColor: theme.mutedSurface }]}>
      <Text style={[styles.criticalLabel, { color: theme.muted }]}>{label}</Text>
      <Text style={[styles.criticalPass, { color: passColor }]}>
        {Math.round(passRate * 100)}%
      </Text>
      <Text style={[styles.criticalMeta, { color: theme.muted }]}>
        pass when filled ({Math.round(fillRate * 100)}% fill)
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { gap: 12 },
  rangeRow: { flexDirection: 'row', gap: 8 },
  rangeButton: { borderRadius: 8, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 8 },
  rangeText: { fontSize: 13, fontWeight: '800' },
  sectionTitle: { fontSize: 17, fontWeight: '800', marginBottom: 6 },
  cardSubtitle: { fontSize: 13, lineHeight: 19, marginBottom: 12 },
  emptyTitle: { fontSize: 17, fontWeight: '800', marginBottom: 6 },
  emptyBody: { fontSize: 14, lineHeight: 21, marginBottom: 12 },
  seedResult: { fontSize: 13, fontWeight: '800', marginBottom: 8 },
  errorText: { fontSize: 14, fontWeight: '800' },
  seedButton: { alignItems: 'center', borderRadius: 8, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 10 },
  seedButtonText: { fontSize: 13, fontWeight: '800' },

  headlineGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  headlineCard: { flex: 1, minWidth: 140, gap: 3, borderRadius: 8, padding: 12 },
  headlineLabel: { fontSize: 11, fontWeight: '800' },
  headlineLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  headlineValue: { fontSize: 28, fontWeight: '800' },
  headlineMeta: { fontSize: 11 },

  chartContainer: { gap: 12 },
  chartBars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
    height: 120
  },
  chartCol: { flex: 1, alignItems: 'center', gap: 4 },
  chartStack: {
    width: '100%',
    height: 100,
    justifyContent: 'flex-end',
    position: 'relative'
  },
  chartBar: { width: '100%', borderRadius: 3, minHeight: 4 },
  chartBarQualified: {
    width: '100%',
    borderRadius: 3,
    position: 'absolute',
    bottom: 0
  },
  chartLabel: { fontSize: 9, fontWeight: '800' },
  chartLegend: { flexDirection: 'row', gap: 16 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 2 },
  legendText: { fontSize: 11, fontWeight: '800' },

  decisionList: { gap: 8 },
  decisionRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  decisionLabel: { flexDirection: 'row', alignItems: 'center', gap: 8, width: 96 },
  decisionDot: { width: 10, height: 10, borderRadius: 5 },
  decisionLabelText: { fontSize: 13, fontWeight: '800' },
  decisionBar: { flex: 1, height: 8, borderRadius: 4, overflow: 'hidden' },
  decisionBarFill: { height: '100%', borderRadius: 4 },
  decisionCount: { width: 70, fontSize: 12, fontWeight: '800', textAlign: 'right' },

  criticalGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  criticalCard: { flex: 1, minWidth: 140, gap: 3, borderRadius: 8, padding: 12 },
  criticalLabel: { fontSize: 11, fontWeight: '800' },
  criticalPass: { fontSize: 28, fontWeight: '800' },
  criticalMeta: { fontSize: 10, lineHeight: 14 },

  pressed: { opacity: 0.72 }
});
