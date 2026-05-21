import { Link } from 'expo-router';
import type { Href } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line, Path, Text as SvgText } from 'react-native-svg';

import { supabase } from '@/lib/supabase';
import { buildEquityCurve, calculateDashboardMetrics, listTrades } from '@/lib/trades';
import type { EquityCurvePoint, TradeRow } from '@/lib/trades';

const NEW_TRADE_ROUTE = '/trades/new' as Href;
const TRADES_ROUTE = '/trades' as Href;

export default function HomeScreen() {
  const [trades, setTrades] = useState<TradeRow[]>([]);
  const [dashboardError, setDashboardError] = useState<string | null>(null);
  const [isLoadingDashboard, setIsLoadingDashboard] = useState(true);
  const dashboardMetrics = useMemo(() => calculateDashboardMetrics(trades), [trades]);
  const equityCurve = useMemo(() => buildEquityCurve(trades), [trades]);
  const metrics = [
    { label: 'Realized P&L', value: formatCurrency(dashboardMetrics.realizedPnl) },
    { label: 'Win rate', value: formatPercent(dashboardMetrics.winRate) },
    { label: 'Trades logged', value: String(dashboardMetrics.tradeCount) },
    { label: 'Average win', value: formatCurrency(dashboardMetrics.averageWin) },
    { label: 'Average loss', value: formatCurrency(dashboardMetrics.averageLoss) }
  ];

  useEffect(() => {
    let isActive = true;

    async function loadDashboard() {
      setDashboardError(null);
      setIsLoadingDashboard(true);

      try {
        const loadedTrades = await listTrades({ limit: 500 });

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
  }, []);

  async function handleSignOut() {
    await supabase.auth.signOut();
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.topBar}>
        <View style={styles.header}>
          <Text style={styles.eyebrow}>Polaris Trade Journal</Text>
          <Text style={styles.title}>Log trades. Review patterns. Improve decisions.</Text>
          <Text style={styles.subtitle}>
            V1 starts with manual trade logging, chart screenshots, strategy tags, emotional
            context, and clean P&L visibility across web, iOS, and Android.
          </Text>
        </View>

        <Pressable
          onPress={handleSignOut}
          style={({ pressed }) => [styles.signOutButton, pressed && styles.signOutButtonPressed]}
        >
          <Text style={styles.signOutButtonText}>Sign out</Text>
        </Pressable>
      </View>

      {dashboardError ? (
        <View style={styles.errorPanel}>
          <Text style={styles.errorText}>{dashboardError}</Text>
        </View>
      ) : null}

      <View style={styles.metricsGrid}>
        {metrics.map((metric) => (
          <View key={metric.label} style={styles.metricCard}>
            {isLoadingDashboard ? (
              <ActivityIndicator color="#2563EB" />
            ) : (
              <Text style={styles.metricValue}>{metric.value}</Text>
            )}
            <Text style={styles.metricLabel}>{metric.label}</Text>
          </View>
        ))}
      </View>

      <View style={styles.chartPanel}>
        <View style={styles.chartHeader}>
          <Text style={styles.chartTitle}>Equity curve</Text>
          <Text style={styles.chartMeta}>
            {equityCurve.length > 0
              ? `${equityCurve.length} closed trade${equityCurve.length === 1 ? '' : 's'}`
              : 'No closed trades'}
          </Text>
        </View>
        {isLoadingDashboard ? (
          <View style={styles.chartState}>
            <ActivityIndicator color="#2563EB" />
            <Text style={styles.chartStateText}>Loading curve...</Text>
          </View>
        ) : equityCurve.length === 0 ? (
          <View style={styles.chartState}>
            <Text style={styles.chartStateTitle}>No realized P&L yet</Text>
            <Text style={styles.chartStateText}>
              Close a trade with an exit price to start the equity curve.
            </Text>
          </View>
        ) : (
          <EquityCurveChart points={equityCurve} />
        )}
      </View>

      <View style={styles.panel}>
        <Text style={styles.panelTitle}>Next build target</Text>
        <Text style={styles.panelText}>
          Manual trade persistence is online. Log a trade, then review saved entries
          from the journal list.
        </Text>
        <View style={styles.actions}>
          <Link href={NEW_TRADE_ROUTE} asChild>
            <Pressable style={({ pressed }) => [styles.primaryButton, pressed && styles.primaryButtonPressed]}>
              <Text style={styles.primaryButtonText}>Log trade</Text>
            </Pressable>
          </Link>
          <Link href={TRADES_ROUTE} asChild>
            <Pressable style={({ pressed }) => [styles.secondaryButton, pressed && styles.primaryButtonPressed]}>
              <Text style={styles.secondaryButtonText}>View trades</Text>
            </Pressable>
          </Link>
        </View>
      </View>
    </ScrollView>
  );
}

function EquityCurveChart({ points }: { points: EquityCurvePoint[] }) {
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
          stroke="#CBD5E1"
          strokeDasharray="6 6"
          strokeWidth={2}
          x1={paddingX}
          x2={width - paddingX}
          y1={zeroY}
          y2={zeroY}
        />
        <SvgText fill="#64748B" fontSize="12" fontWeight="700" x={paddingX} y={18}>
          {formatCurrency(maxValue)}
        </SvgText>
        <SvgText fill="#64748B" fontSize="12" fontWeight="700" x={paddingX} y={height - 8}>
          {formatCurrency(minValue)}
        </SvgText>
        <Path d={path} fill="none" stroke="#2563EB" strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} />
        {lastPoint ? <Circle cx={lastPoint.x} cy={lastPoint.y} fill="#2563EB" r={5} /> : null}
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

function formatPercent(value: number) {
  return new Intl.NumberFormat('en', {
    maximumFractionDigits: 0,
    style: 'percent'
  }).format(value);
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F8FAFC'
  },
  content: {
    gap: 24,
    padding: 24,
    paddingBottom: 40
  },
  header: {
    gap: 12,
    maxWidth: 760
  },
  topBar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingTop: 64
  },
  eyebrow: {
    color: '#2563EB',
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'uppercase'
  },
  title: {
    color: '#0F172A',
    fontSize: 40,
    fontWeight: '800',
    lineHeight: 46
  },
  subtitle: {
    color: '#475569',
    fontSize: 17,
    lineHeight: 26
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12
  },
  chartPanel: {
    maxWidth: 860,
    gap: 14,
    borderRadius: 8,
    borderColor: '#E2E8F0',
    borderWidth: 1,
    backgroundColor: '#FFFFFF',
    padding: 18
  },
  chartHeader: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  chartTitle: {
    color: '#0F172A',
    fontSize: 20,
    fontWeight: '800'
  },
  chartMeta: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: '700'
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
    backgroundColor: '#F8FAFC',
    padding: 18
  },
  chartStateTitle: {
    color: '#0F172A',
    fontSize: 16,
    fontWeight: '800'
  },
  chartStateText: {
    color: '#475569',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center'
  },
  errorPanel: {
    borderRadius: 8,
    borderColor: '#FCA5A5',
    borderWidth: 1,
    backgroundColor: '#FEF2F2',
    padding: 14
  },
  errorText: {
    color: '#991B1B',
    fontSize: 14,
    fontWeight: '700'
  },
  metricCard: {
    minWidth: 160,
    flexGrow: 1,
    borderRadius: 8,
    borderColor: '#E2E8F0',
    borderWidth: 1,
    backgroundColor: '#FFFFFF',
    padding: 16
  },
  metricValue: {
    color: '#0F172A',
    fontSize: 28,
    fontWeight: '800'
  },
  metricLabel: {
    color: '#64748B',
    fontSize: 14,
    marginTop: 4
  },
  panel: {
    maxWidth: 760,
    gap: 14,
    borderRadius: 8,
    backgroundColor: '#0F172A',
    padding: 20
  },
  panelTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8
  },
  panelText: {
    color: '#CBD5E1',
    fontSize: 15,
    lineHeight: 23
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10
  },
  signOutButton: {
    minHeight: 40,
    justifyContent: 'center',
    borderRadius: 8,
    borderColor: '#CBD5E1',
    borderWidth: 1,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14
  },
  signOutButtonPressed: {
    opacity: 0.7
  },
  signOutButtonText: {
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '700'
  },
  primaryButton: {
    alignSelf: 'flex-start',
    minHeight: 42,
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: '#2563EB',
    paddingHorizontal: 16
  },
  primaryButtonPressed: {
    opacity: 0.76
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700'
  },
  secondaryButton: {
    alignSelf: 'flex-start',
    minHeight: 42,
    justifyContent: 'center',
    borderRadius: 8,
    borderColor: '#475569',
    borderWidth: 1,
    paddingHorizontal: 16
  },
  secondaryButtonText: {
    color: '#E2E8F0',
    fontSize: 14,
    fontWeight: '700'
  }
});
