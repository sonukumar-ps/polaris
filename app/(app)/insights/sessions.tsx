import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppShell, Card, LoadingState, SectionHeading, useAppTheme } from '@/lib/ui';
import { listTradeSummaries, useAccountScope } from '@/lib/trades';
import {
  buildSessionSpecializationInsight,
  calculateDayPerformance,
  calculateSessionPerformance
} from '@/lib/trades/backtesting';
import type { DayPerformance, SessionPerformance, TradeSummary } from '@/lib/trades';

const DAY_LABELS: Record<string, string> = {
  friday: 'Fri',
  monday: 'Mon',
  saturday: 'Sat',
  sunday: 'Sun',
  thursday: 'Thu',
  tuesday: 'Tue',
  wednesday: 'Wed'
};

const SESSION_LABELS: Record<string, string> = {
  asian: 'Asian',
  london: 'London',
  new_york: 'New York',
  overlap_london_ny: 'LN/NY Overlap',
  sydney: 'Sydney'
};

export default function SessionsScreen() {
  const theme = useAppTheme();
  const { selectedAccountIds } = useAccountScope();
  const [trades, setTrades] = useState<TradeSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  const sessionPerf = calculateSessionPerformance(trades);
  const dayPerf = calculateDayPerformance(trades);
  const sessionInsight = buildSessionSpecializationInsight(trades);

  return (
    <AppShell activeRoute="insights">
      <SectionHeading
        eyebrow="Sessions & Days"
        subtitle="When does your edge show up most?"
        title="Session breakdown"
      />

      {isLoading ? <LoadingState label="Loading sessions..." /> : null}
      {error ? (
        <Card style={{ borderColor: theme.danger }}>
          <Text style={[styles.errorText, { color: theme.danger }]}>{error}</Text>
        </Card>
      ) : null}

      {!isLoading && !error ? (
        <View style={styles.content}>
          {sessionInsight ? (
            <Card style={[styles.mentorNote, { borderLeftWidth: 3, borderLeftColor: theme.positive }]}>
              <Text style={[styles.mentorNoteTitle, { color: theme.text }]}>{sessionInsight.title}</Text>
              <Text style={[styles.mentorNoteBody, { color: theme.muted }]}>{sessionInsight.reason}</Text>
            </Card>
          ) : null}

          <Card>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>By session</Text>
            {sessionPerf.length === 0 ? (
              <Text style={[styles.emptyText, { color: theme.muted }]}>
                Tag trades with a session to see performance by market session.
              </Text>
            ) : (
              <View style={styles.tableRows}>
                <View style={[styles.tableHeader, { borderBottomColor: theme.border }]}>
                  <Text style={[styles.colSession, styles.colHeader, { color: theme.muted }]}>Session</Text>
                  <Text style={[styles.colNum, styles.colHeader, { color: theme.muted }]}>Trades</Text>
                  <Text style={[styles.colNum, styles.colHeader, { color: theme.muted }]}>Win %</Text>
                  <Text style={[styles.colNum, styles.colHeader, { color: theme.muted }]}>Avg R</Text>
                  <Text style={[styles.colNum, styles.colHeader, { color: theme.muted }]}>Net P&L</Text>
                </View>
                {sessionPerf.map((row) => (
                  <SessionRow key={row.session} row={row} />
                ))}
              </View>
            )}
          </Card>

          <Card>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>By day of week</Text>
            {dayPerf.length === 0 ? (
              <Text style={[styles.emptyText, { color: theme.muted }]}>Not enough closed trades yet.</Text>
            ) : (
              <View style={styles.dayGrid}>
                {dayPerf.map((row) => (
                  <DayCard key={row.day} row={row} />
                ))}
              </View>
            )}
          </Card>
        </View>
      ) : null}
    </AppShell>
  );
}

function SessionRow({ row }: { row: SessionPerformance }) {
  const theme = useAppTheme();
  const pnlColor = row.netPnl >= 0 ? theme.positive : theme.danger;

  return (
    <View style={[styles.tableRow, { borderBottomColor: theme.border }]}>
      <Text style={[styles.colSession, { color: theme.text }]}>{SESSION_LABELS[row.session] ?? row.session}</Text>
      <Text style={[styles.colNum, { color: theme.muted }]}>{row.tradeCount}</Text>
      <Text style={[styles.colNum, { color: theme.text }]}>{formatPercent(row.winRate)}</Text>
      <Text style={[styles.colNum, { color: theme.text }]}>{row.avgRr.toFixed(2)}R</Text>
      <Text style={[styles.colNum, { color: pnlColor }]}>{formatCurrency(row.netPnl)}</Text>
    </View>
  );
}

function DayCard({ row }: { row: DayPerformance }) {
  const theme = useAppTheme();
  const pnlColor = row.netPnl >= 0 ? theme.positive : theme.danger;

  return (
    <View style={[styles.dayCard, { backgroundColor: theme.mutedSurface }]}>
      <Text style={[styles.dayLabel, { color: theme.muted }]}>{DAY_LABELS[row.day] ?? row.day}</Text>
      <Text style={[styles.dayWinRate, { color: theme.text }]}>{formatPercent(row.winRate)}</Text>
      <Text style={[styles.dayMeta, { color: theme.muted }]}>{row.tradeCount} trades</Text>
      <Text style={[styles.dayPnl, { color: pnlColor }]}>{formatCurrency(row.netPnl)}</Text>
    </View>
  );
}

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`;
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
  mentorNote: { gap: 6 },
  mentorNoteTitle: { fontSize: 15, fontWeight: '800' },
  mentorNoteBody: { fontSize: 13, lineHeight: 20 },
  sectionTitle: { fontSize: 17, fontWeight: '800', marginBottom: 10 },
  emptyText: { fontSize: 14, lineHeight: 21 },
  tableRows: { gap: 0 },
  tableHeader: {
    flexDirection: 'row',
    paddingBottom: 8,
    borderBottomWidth: 1,
    marginBottom: 4
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    borderBottomWidth: 1
  },
  colHeader: { fontWeight: '800' },
  colSession: { flex: 2, fontSize: 13 },
  colNum: { flex: 1, fontSize: 13, textAlign: 'right' },
  dayGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  dayCard: {
    flex: 1,
    minWidth: 80,
    gap: 3,
    borderRadius: 8,
    padding: 10,
    alignItems: 'center'
  },
  dayLabel: { fontSize: 12, fontWeight: '800' },
  dayWinRate: { fontSize: 18, fontWeight: '800' },
  dayMeta: { fontSize: 11 },
  dayPnl: { fontSize: 13, fontWeight: '800' },
  errorText: { fontSize: 14, fontWeight: '800' }
});
