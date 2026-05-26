import { Link } from 'expo-router';
import type { Href } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line, Path, Text as SvgText } from 'react-native-svg';

import {
  AppShell,
  Card,
  EmptyState,
  PrimaryLinkButton,
  SecondaryLinkButton,
  SectionHeading,
  useAppTheme
} from '@/lib/ui';
import { supabase } from '@/lib/supabase';
import {
  buildEquityCurve,
  calculateDashboardMetrics,
  calculateStrategyPerformance,
  generateInsightCoach,
  listTradeSummaries,
  useAccountScope
} from '@/lib/trades';
import type {
  EquityCurvePoint,
  Insight,
  InsightMetric,
  StrategyPerformance,
  TradeSummary
} from '@/lib/trades';

const NEW_TRADE_ROUTE = '/trades/new' as Href;
const TRADES_ROUTE = '/trades' as Href;

export default function HomeScreen() {
  const theme = useAppTheme();
  const {
    error: accountError,
    isLoading: isLoadingAccounts,
    selectedAccountIds
  } = useAccountScope();
  const [trades, setTrades] = useState<TradeSummary[]>([]);
  const [dashboardError, setDashboardError] = useState<string | null>(null);
  const [isLoadingDashboard, setIsLoadingDashboard] = useState(true);
  const dashboardMetrics = useMemo(() => calculateDashboardMetrics(trades), [trades]);
  const equityCurve = useMemo(() => buildEquityCurve(trades), [trades]);
  const insight = useMemo(() => generateInsightCoach(trades), [trades]);
  const strategyPerformance = useMemo(() => calculateStrategyPerformance(trades), [trades]);
  const recentTrades = trades.slice(0, 5);
  const isLoadingView = isLoadingAccounts || isLoadingDashboard;
  const metrics = [
    {
      label: 'Total P&L',
      tone: dashboardMetrics.realizedPnl >= 0 ? 'positive' : 'negative',
      value: formatCurrency(dashboardMetrics.realizedPnl)
    },
    { label: 'Win rate', tone: 'neutral', value: formatPercent(dashboardMetrics.winRate) },
    { label: 'Profit factor', tone: 'neutral', value: formatProfitFactor(dashboardMetrics.profitFactor) },
    { label: 'Trades', tone: 'neutral', value: String(dashboardMetrics.tradeCount) }
  ] as const;

  useEffect(() => {
    let isActive = true;

    async function loadDashboard() {
      if (selectedAccountIds.length === 0) {
        setTrades([]);
        setIsLoadingDashboard(isLoadingAccounts);
        return;
      }

      setDashboardError(null);
      setIsLoadingDashboard(true);

      try {
        const loadedTrades = await listTradeSummaries({
          accountIds: selectedAccountIds,
          limit: 500
        });

        if (isActive) {
          setTrades(loadedTrades);
        }
      } catch (error) {
        if (isActive) {
          setDashboardError(error instanceof Error ? error.message : 'Could not load dashboard metrics.');
        }
      } finally {
        if (isActive) {
          setIsLoadingDashboard(false);
        }
      }
    }

    void loadDashboard();

    return () => {
      isActive = false;
    };
  }, [isLoadingAccounts, selectedAccountIds]);

  async function handleSignOut() {
    await supabase.auth.signOut();
  }

  return (
    <AppShell activeRoute="dashboard">
      <View style={styles.topBar}>
        <SectionHeading
          eyebrow="Polaris"
          subtitle="A quiet operating system for reviewing execution quality, risk, and trade outcomes."
          title="Trade journal"
        />
        <View style={styles.actions}>
          <SecondaryLinkButton href={TRADES_ROUTE}>View trades</SecondaryLinkButton>
          <PrimaryLinkButton href={NEW_TRADE_ROUTE}>Add trade</PrimaryLinkButton>
          <Pressable
            onPress={handleSignOut}
            style={({ pressed }) => [
              styles.signOutButton,
              { borderColor: theme.border, backgroundColor: theme.card },
              pressed && styles.pressed
            ]}
          >
            <Text style={[styles.signOutText, { color: theme.muted }]}>Sign out</Text>
          </Pressable>
        </View>
      </View>

      {accountError || dashboardError ? (
        <Card style={{ borderColor: theme.danger }}>
          <Text style={[styles.errorText, { color: theme.danger }]}>{accountError ?? dashboardError}</Text>
        </Card>
      ) : null}

      <View style={styles.metricsGrid}>
        {metrics.map((metric) => (
          <Card key={metric.label} style={styles.metricCard}>
            {isLoadingView ? (
              <ActivityIndicator color={theme.accent} />
            ) : (
              <Text
                style={[
                  styles.metricValue,
                  {
                    color:
                      metric.tone === 'positive'
                        ? theme.positive
                        : metric.tone === 'negative'
                          ? theme.danger
                          : theme.text
                  }
                ]}
              >
                {metric.value}
              </Text>
            )}
            <Text style={[styles.metricLabel, { color: theme.muted }]}>{metric.label}</Text>
          </Card>
        ))}
      </View>

      <InsightCoachCard insight={insight} isLoading={isLoadingView} />

      <StrategyPulseCard isLoading={isLoadingView} strategies={strategyPerformance} />

      <View style={styles.dashboardGrid}>
        <Card style={styles.chartCard}>
          <View style={styles.cardHeader}>
            <View>
              <Text style={[styles.cardTitle, { color: theme.text }]}>Equity curve</Text>
              <Text style={[styles.cardMeta, { color: theme.muted }]}>
                {equityCurve.length > 0
                  ? `${equityCurve.length} closed trade${equityCurve.length === 1 ? '' : 's'}`
                  : 'No closed trades'}
              </Text>
            </View>
          </View>
          {isLoadingView ? (
            <View style={[styles.chartState, { backgroundColor: theme.mutedSurface }]}>
              <ActivityIndicator color={theme.accent} />
              <Text style={[styles.stateText, { color: theme.muted }]}>Loading curve...</Text>
            </View>
          ) : equityCurve.length === 0 ? (
            <EmptyState
              body="Close a trade with an exit price to begin tracking cumulative realized P&L."
              title="No curve yet"
            />
          ) : (
            <EquityCurveChart points={equityCurve} />
          )}
        </Card>

        <Card style={styles.recentCard}>
          <View style={styles.cardHeader}>
            <View>
              <Text style={[styles.cardTitle, { color: theme.text }]}>Recent trades</Text>
              <Text style={[styles.cardMeta, { color: theme.muted }]}>Latest journal entries</Text>
            </View>
            <SecondaryLinkButton href={TRADES_ROUTE}>All</SecondaryLinkButton>
          </View>
          {isLoadingView ? (
            <ActivityIndicator color={theme.accent} />
          ) : recentTrades.length === 0 ? (
            <EmptyState body="Your newest trades will appear here once saved." title="No trades" />
          ) : (
            <View style={styles.tradeList}>
              {recentTrades.map((trade) => (
                <Link key={trade.id} href={`/trades/${trade.id}` as Href} asChild>
                  <Pressable style={({ pressed }) => [styles.tradeRow, pressed && styles.pressed]}>
                    <View style={styles.tradeSymbol}>
                      <Text style={[styles.symbolText, { color: theme.text }]}>
                        {trade.asset?.symbol ?? 'Trade'}
                      </Text>
                      <Text style={[styles.tradeMeta, { color: theme.muted }]}>
                        {trade.direction.toUpperCase()} | {formatDate(trade.opened_at)}
                      </Text>
                    </View>
                    <Text
                      style={[
                        styles.tradePnl,
                        {
                          color:
                            trade.net_pnl === null
                              ? theme.muted
                              : trade.net_pnl >= 0
                                ? theme.positive
                                : theme.danger
                        }
                      ]}
                    >
                      {trade.net_pnl === null ? 'Open' : formatCurrency(trade.net_pnl)}
                    </Text>
                  </Pressable>
                </Link>
              ))}
            </View>
          )}
        </Card>
      </View>
    </AppShell>
  );
}

function InsightCoachCard({ insight, isLoading }: { insight: Insight; isLoading: boolean }) {
  const theme = useAppTheme();
  const relatedTradesRoute = {
    pathname: '/trades',
    params: {
      focus: insight.title,
      sourceTradeIds: insight.sourceTradeIds.join(',')
    }
  } as Href;

  return (
    <Card style={styles.insightCard}>
      <View style={styles.cardHeader}>
        <View>
          <Text style={[styles.cardTitle, { color: theme.text }]}>This week&apos;s focus</Text>
          <Text style={[styles.cardMeta, { color: theme.muted }]}>One review cue from your journal</Text>
        </View>
        {insight.sourceTradeIds.length > 0 ? (
          <SecondaryLinkButton href={relatedTradesRoute}>{insight.action.label}</SecondaryLinkButton>
        ) : null}
      </View>
      {isLoading ? (
        <View style={[styles.insightLoading, { backgroundColor: theme.mutedSurface }]}>
          <ActivityIndicator color={theme.accent} />
          <Text style={[styles.stateText, { color: theme.muted }]}>Reading your journal...</Text>
        </View>
      ) : (
        <>
          <View style={styles.insightBody}>
            <View
              style={[
                styles.insightIndicator,
                {
                  backgroundColor:
                    insight.severity === 'positive'
                      ? theme.positive
                      : insight.severity === 'warning'
                        ? theme.danger
                        : theme.accent
                }
              ]}
            />
            <View style={styles.insightCopy}>
              <Text style={[styles.insightTitle, { color: theme.text }]}>{insight.title}</Text>
              <Text style={[styles.insightReason, { color: theme.muted }]}>{insight.reason}</Text>
            </View>
          </View>
          <View style={styles.insightMetrics}>
            {insight.metrics.map((metric) => (
              <InsightMetricView key={metric.label} metric={metric} />
            ))}
          </View>
        </>
      )}
    </Card>
  );
}

function InsightMetricView({ metric }: { metric: InsightMetric }) {
  const theme = useAppTheme();

  return (
    <View style={[styles.insightMetric, { backgroundColor: theme.mutedSurface }]}>
      <Text
        style={[
          styles.insightMetricValue,
          {
            color:
              metric.tone === 'positive' ? theme.positive : metric.tone === 'warning' ? theme.danger : theme.text
          }
        ]}
      >
        {metric.value}
      </Text>
      <Text style={[styles.insightMetricLabel, { color: theme.muted }]}>{metric.label}</Text>
    </View>
  );
}

function StrategyPulseCard({
  isLoading,
  strategies
}: {
  isLoading: boolean;
  strategies: StrategyPerformance[];
}) {
  const theme = useAppTheme();
  const bestStrategy = strategies[0] ?? null;
  const reviewStrategy = [...strategies].reverse().find((strategy) => strategy.netPnl < 0) ?? null;
  const visibleStrategies = strategies.slice(0, 3);

  return (
    <Card style={styles.strategyCard}>
      <View style={styles.cardHeader}>
        <View>
          <Text style={[styles.cardTitle, { color: theme.text }]}>Strategy pulse</Text>
          <Text style={[styles.cardMeta, { color: theme.muted }]}>Closed-trade performance for selected accounts</Text>
        </View>
        <SecondaryLinkButton href={TRADES_ROUTE}>Review trades</SecondaryLinkButton>
      </View>
      {isLoading ? (
        <View style={[styles.strategyLoading, { backgroundColor: theme.mutedSurface }]}>
          <ActivityIndicator color={theme.accent} />
          <Text style={[styles.stateText, { color: theme.muted }]}>Reading strategies...</Text>
        </View>
      ) : strategies.length === 0 ? (
        <EmptyState
          body="Closed trades with a selected strategy will show which playbooks deserve more attention."
          title="No strategy signal yet"
        />
      ) : (
        <>
          <View style={styles.strategyHighlights}>
            <StrategyHighlight
              label="Working best"
              strategy={bestStrategy}
              tone={bestStrategy && bestStrategy.netPnl >= 0 ? 'positive' : 'neutral'}
            />
            <StrategyHighlight label="Review next" strategy={reviewStrategy} tone="warning" />
          </View>
          <View style={styles.strategyRows}>
            {visibleStrategies.map((strategy) => (
              <View key={strategy.strategyId ?? strategy.name} style={styles.strategyRow}>
                <View style={styles.strategyNameBlock}>
                  <Text style={[styles.strategyName, { color: theme.text }]}>{strategy.name}</Text>
                  <Text style={[styles.strategyMeta, { color: theme.muted }]}>
                    {strategy.tradeCount} closed | {formatPercent(strategy.winRate)} win | PF{' '}
                    {formatProfitFactor(strategy.profitFactor)}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.strategyPnl,
                    { color: strategy.netPnl >= 0 ? theme.positive : theme.danger }
                  ]}
                >
                  {formatCurrency(strategy.netPnl)}
                </Text>
              </View>
            ))}
          </View>
        </>
      )}
    </Card>
  );
}

function StrategyHighlight({
  label,
  strategy,
  tone
}: {
  label: string;
  strategy: StrategyPerformance | null;
  tone: 'positive' | 'warning' | 'neutral';
}) {
  const theme = useAppTheme();
  const toneColor = tone === 'positive' ? theme.positive : tone === 'warning' ? theme.danger : theme.text;

  return (
    <View style={[styles.strategyHighlight, { backgroundColor: theme.mutedSurface }]}>
      <Text style={[styles.strategyHighlightLabel, { color: theme.muted }]}>{label}</Text>
      <Text style={[styles.strategyHighlightName, { color: strategy ? theme.text : theme.muted }]}>
        {strategy?.name ?? 'Nothing urgent'}
      </Text>
      <Text style={[styles.strategyHighlightValue, { color: strategy ? toneColor : theme.muted }]}>
        {strategy ? `${formatCurrency(strategy.netPnl)} avg ${formatCurrency(strategy.averagePnl)}` : 'Keep collecting data'}
      </Text>
    </View>
  );
}

function EquityCurveChart({ points }: { points: EquityCurvePoint[] }) {
  const theme = useAppTheme();
  const width = 720;
  const height = 220;
  const paddingX = 42;
  const paddingY = 24;
  const values = points.map((point) => point.equity);
  const minValue = Math.min(0, ...values);
  const maxValue = Math.max(0, ...values);
  const range = maxValue - minValue || 1;
  const chartWidth = width - paddingX * 2;
  const chartHeight = height - paddingY * 2;
  const coordinates = points.map((point, index) => {
    const x =
      points.length === 1 ? paddingX + chartWidth : paddingX + (index / (points.length - 1)) * chartWidth;
    const y = paddingY + ((maxValue - point.equity) / range) * chartHeight;

    return { ...point, x, y };
  });
  const zeroY = paddingY + ((maxValue - 0) / range) * chartHeight;
  const path = coordinates
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
    .join(' ');
  const lastPoint = coordinates[coordinates.length - 1];

  return (
    <View style={styles.chartFrame}>
      <Svg height="100%" viewBox={`0 0 ${width} ${height}`} width="100%">
        <Line
          stroke={theme.border}
          strokeDasharray="6 6"
          strokeWidth={2}
          x1={paddingX}
          x2={width - paddingX}
          y1={zeroY}
          y2={zeroY}
        />
        <SvgText fill={theme.muted} fontSize="12" fontWeight="700" x={paddingX} y={18}>
          {formatCurrency(maxValue)}
        </SvgText>
        <SvgText fill={theme.muted} fontSize="12" fontWeight="700" x={paddingX} y={height - 8}>
          {formatCurrency(minValue)}
        </SvgText>
        <Path d={path} fill="none" stroke={theme.accent} strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} />
        {lastPoint ? <Circle cx={lastPoint.x} cy={lastPoint.y} fill={theme.accent} r={5} /> : null}
      </Svg>
    </View>
  );
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en', {
    currency: 'USD',
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
    style: 'currency'
  }).format(value);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en', {
    day: '2-digit',
    month: 'short'
  }).format(new Date(value));
}

function formatPercent(value: number) {
  return new Intl.NumberFormat('en', {
    maximumFractionDigits: 0,
    style: 'percent'
  }).format(value);
}

function formatProfitFactor(value: number | null) {
  if (value === null) {
    return '0.00';
  }

  if (!Number.isFinite(value)) {
    return '∞';
  }

  return value.toFixed(2);
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    zIndex: 10
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    alignItems: 'center',
    zIndex: 20
  },
  signOutButton: {
    minHeight: 44,
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 14
  },
  signOutText: {
    fontSize: 14,
    fontWeight: '800'
  },
  pressed: {
    opacity: 0.72
  },
  errorText: {
    fontSize: 14,
    fontWeight: '800'
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12
  },
  metricCard: {
    minWidth: 160,
    flex: 1
  },
  metricValue: {
    fontSize: 30,
    fontWeight: '800'
  },
  metricLabel: {
    fontSize: 13,
    fontWeight: '800'
  },
  insightCard: {
    gap: 18
  },
  insightLoading: {
    minHeight: 126,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 8,
    padding: 18
  },
  insightBody: {
    flexDirection: 'row',
    gap: 14,
    alignItems: 'flex-start'
  },
  insightIndicator: {
    width: 6,
    alignSelf: 'stretch',
    borderRadius: 99
  },
  insightCopy: {
    flex: 1,
    gap: 8
  },
  insightTitle: {
    fontSize: 24,
    fontWeight: '800',
    lineHeight: 30
  },
  insightReason: {
    maxWidth: 760,
    fontSize: 15,
    lineHeight: 22
  },
  insightMetrics: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10
  },
  insightMetric: {
    minWidth: 150,
    flex: 1,
    gap: 5,
    borderRadius: 8,
    padding: 12
  },
  insightMetricValue: {
    fontSize: 20,
    fontWeight: '800'
  },
  insightMetricLabel: {
    fontSize: 12,
    fontWeight: '800'
  },
  strategyCard: {
    gap: 18
  },
  strategyLoading: {
    minHeight: 116,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 8,
    padding: 18
  },
  strategyHighlights: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10
  },
  strategyHighlight: {
    minWidth: 220,
    flex: 1,
    gap: 6,
    borderRadius: 8,
    padding: 14
  },
  strategyHighlightLabel: {
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase'
  },
  strategyHighlightName: {
    fontSize: 18,
    fontWeight: '800'
  },
  strategyHighlightValue: {
    fontSize: 13,
    fontWeight: '800'
  },
  strategyRows: {
    gap: 4
  },
  strategyRow: {
    minHeight: 58,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  strategyNameBlock: {
    flex: 1,
    gap: 4
  },
  strategyName: {
    fontSize: 16,
    fontWeight: '800'
  },
  strategyMeta: {
    fontSize: 12,
    fontWeight: '700'
  },
  strategyPnl: {
    fontSize: 15,
    fontWeight: '800'
  },
  dashboardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14
  },
  chartCard: {
    minWidth: 300,
    flex: 2
  },
  recentCard: {
    minWidth: 280,
    flex: 1
  },
  cardHeader: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  cardTitle: {
    fontSize: 19,
    fontWeight: '800'
  },
  cardMeta: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 3
  },
  chartFrame: {
    width: '100%',
    aspectRatio: 16 / 5,
    minHeight: 180
  },
  chartState: {
    minHeight: 180,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 8,
    padding: 18
  },
  stateText: {
    fontSize: 14,
    fontWeight: '700'
  },
  tradeList: {
    gap: 4
  },
  tradeRow: {
    minHeight: 58,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  tradeSymbol: {
    flex: 1,
    gap: 4
  },
  symbolText: {
    fontSize: 16,
    fontWeight: '800'
  },
  tradeMeta: {
    fontSize: 12,
    fontWeight: '700'
  },
  tradePnl: {
    fontSize: 15,
    fontWeight: '800'
  }
});
