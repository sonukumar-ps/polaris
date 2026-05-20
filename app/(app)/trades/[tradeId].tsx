import { Link, useLocalSearchParams } from 'expo-router';
import type { Href } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';

import { getTrade } from '@/lib/trades';
import type { TradeSummary } from '@/lib/trades';

const TRADES_ROUTE = '/trades' as Href;

export default function TradeDetailScreen() {
  const { tradeId } = useLocalSearchParams<{ tradeId: string }>();
  const [trade, setTrade] = useState<TradeSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isActive = true;

    async function loadTrade() {
      if (!tradeId) {
        setError('Trade id is missing.');
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const loadedTrade = await getTrade(tradeId);

        if (isActive) {
          setTrade(loadedTrade);
        }
      } catch (loadError) {
        if (isActive) {
          setError(loadError instanceof Error ? loadError.message : 'Could not load trade.');
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    void loadTrade();

    return () => {
      isActive = false;
    };
  }, [tradeId]);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Link href={TRADES_ROUTE} style={styles.backLink}>
          Back to trades
        </Link>
        <Text style={styles.eyebrow}>Trade Detail</Text>
        <Text style={styles.title}>{trade?.asset?.symbol ?? 'Trade'}</Text>
      </View>

      {isLoading ? (
        <View style={styles.panel}>
          <ActivityIndicator color="#2563EB" />
          <Text style={styles.mutedText}>Loading trade...</Text>
        </View>
      ) : null}

      {error ? (
        <View style={styles.panel}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {trade ? (
        <View style={styles.panel}>
          <View style={styles.row}>
            <Metric label="Direction" value={trade.direction.toUpperCase()} />
            <Metric label="Status" value={trade.status.toUpperCase()} />
          </View>
          <View style={styles.row}>
            <Metric label="Entry" value={formatNumber(trade.entry_price)} />
            <Metric label="Exit" value={trade.exit_price ? formatNumber(trade.exit_price) : 'Open'} />
          </View>
          <View style={styles.row}>
            <Metric label="Size" value={formatNumber(trade.quantity)} />
            <Metric label="Fees" value={formatNumber(trade.fees)} />
          </View>
          <View style={styles.row}>
            <Metric
              label="Gross P&L"
              value={trade.gross_pnl !== null ? formatCurrency(trade.gross_pnl) : 'Open'}
              valueStyle={trade.gross_pnl !== null ? pnlStyle(trade.gross_pnl) : undefined}
            />
            <Metric
              label="Net P&L"
              value={trade.net_pnl !== null ? formatCurrency(trade.net_pnl) : 'Open'}
              valueStyle={trade.net_pnl !== null ? pnlStyle(trade.net_pnl) : undefined}
            />
          </View>
          <View style={styles.row}>
            <Metric label="Opened" value={formatDate(trade.opened_at)} />
            <Metric label="Closed" value={trade.closed_at ? formatDate(trade.closed_at) : 'Open'} />
          </View>
          {trade.tags.length > 0 ? (
            <View style={styles.tagsSection}>
              <Text style={styles.metricLabel}>Tags</Text>
              <View style={styles.tags}>
                {trade.tags.map((tag) => (
                  <Text key={tag.id} style={styles.tagChip}>
                    {tag.type}: {tag.name}
                  </Text>
                ))}
              </View>
            </View>
          ) : null}
          {trade.notes ? (
            <View style={styles.notes}>
              <Text style={styles.metricLabel}>Notes</Text>
              <Text style={styles.notesText}>{trade.notes}</Text>
            </View>
          ) : null}
        </View>
      ) : null}
    </ScrollView>
  );
}

function Metric({
  label,
  value,
  valueStyle
}: {
  label: string;
  value: string;
  valueStyle?: object;
}) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={[styles.metricValue, valueStyle]}>{value}</Text>
    </View>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }).format(new Date(value));
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('en', {
    maximumFractionDigits: 8,
    minimumFractionDigits: 0
  }).format(value);
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en', {
    currency: 'USD',
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
    style: 'currency'
  }).format(value);
}

function pnlStyle(value: number) {
  return value >= 0 ? styles.profit : styles.loss;
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F8FAFC'
  },
  content: {
    gap: 18,
    padding: 24,
    paddingTop: 56
  },
  header: {
    gap: 8,
    maxWidth: 860
  },
  backLink: {
    color: '#2563EB',
    fontSize: 14,
    fontWeight: '700'
  },
  eyebrow: {
    color: '#2563EB',
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'uppercase'
  },
  title: {
    color: '#0F172A',
    fontSize: 34,
    fontWeight: '800'
  },
  panel: {
    maxWidth: 860,
    gap: 16,
    borderRadius: 8,
    borderColor: '#E2E8F0',
    borderWidth: 1,
    backgroundColor: '#FFFFFF',
    padding: 18
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12
  },
  metric: {
    minWidth: 180,
    flex: 1,
    gap: 4
  },
  metricLabel: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: '700'
  },
  metricValue: {
    color: '#0F172A',
    fontSize: 20,
    fontWeight: '800'
  },
  mutedText: {
    color: '#475569',
    fontSize: 15
  },
  errorText: {
    color: '#B91C1C',
    fontSize: 14,
    fontWeight: '700'
  },
  notes: {
    gap: 6,
    borderTopColor: '#E2E8F0',
    borderTopWidth: 1,
    paddingTop: 16
  },
  tagsSection: {
    gap: 8,
    borderTopColor: '#E2E8F0',
    borderTopWidth: 1,
    paddingTop: 16
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  tagChip: {
    overflow: 'hidden',
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
    color: '#334155',
    fontSize: 12,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 4
  },
  notesText: {
    color: '#334155',
    fontSize: 15,
    lineHeight: 23
  },
  profit: {
    color: '#166534'
  },
  loss: {
    color: '#B91C1C'
  }
});
