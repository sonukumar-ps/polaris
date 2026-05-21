import { Link, useFocusEffect, useLocalSearchParams } from 'expo-router';
import type { Href } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { listTags, listTradeSummaries } from '@/lib/trades';
import type { JournalTag, TradeSummary } from '@/lib/trades';

const HOME_ROUTE = '/home' as Href;
const NEW_TRADE_ROUTE = '/trades/new' as Href;

export default function TradesScreen() {
  const params = useLocalSearchParams<{ focus?: string; sourceTradeIds?: string }>();
  const focusLabel = getParamValue(params.focus);
  const [trades, setTrades] = useState<TradeSummary[]>([]);
  const [tags, setTags] = useState<JournalTag[]>([]);
  const [selectedTagId, setSelectedTagId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      async function loadTrades() {
        setIsLoading(true);
        setError(null);

        try {
          const sourceTradeIds = parseSourceTradeIds(params.sourceTradeIds);
          const [loadedTrades, loadedTags] = await Promise.all([
            listTradeSummaries({
              limit: sourceTradeIds.length > 0 ? 500 : undefined,
              tagId: selectedTagId ?? undefined
            }),
            listTags()
          ]);

          if (isActive) {
            setTrades(
              sourceTradeIds.length > 0
                ? loadedTrades.filter((trade) => sourceTradeIds.includes(trade.id))
                : loadedTrades
            );
            setTags(loadedTags);
          }
        } catch (loadError) {
          if (isActive) {
            setError(loadError instanceof Error ? loadError.message : 'Could not load trades.');
          }
        } finally {
          if (isActive) {
            setIsLoading(false);
          }
        }
      }

      void loadTrades();

      return () => {
        isActive = false;
      };
    }, [params.sourceTradeIds, selectedTagId])
  );

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Link href={HOME_ROUTE} style={styles.backLink}>
          Back
        </Link>
        <Text style={styles.eyebrow}>Trade Journal</Text>
        <Text style={styles.title}>Saved trades</Text>
        {focusLabel ? <Text style={styles.focusText}>Focus: {focusLabel}</Text> : null}
      </View>

      <Link href={NEW_TRADE_ROUTE} asChild>
        <Pressable style={({ pressed }) => [styles.primaryButton, pressed && styles.buttonPressed]}>
          <Text style={styles.primaryButtonText}>Log trade</Text>
        </Pressable>
      </Link>

      {tags.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.filters}>
            <Pressable
              onPress={() => {
                setSelectedTagId(null);
              }}
              style={[styles.filterChip, selectedTagId === null && styles.filterChipSelected]}
            >
              <Text
                style={[
                  styles.filterChipText,
                  selectedTagId === null && styles.filterChipTextSelected
                ]}
              >
                All
              </Text>
            </Pressable>
            {tags.map((tag) => (
              <Pressable
                key={tag.id}
                onPress={() => setSelectedTagId(tag.id)}
                style={[styles.filterChip, selectedTagId === tag.id && styles.filterChipSelected]}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    selectedTagId === tag.id && styles.filterChipTextSelected
                  ]}
                >
                  {tag.name}
                </Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>
      ) : null}

      {isLoading ? (
        <View style={styles.statePanel}>
          <ActivityIndicator color="#2563EB" />
          <Text style={styles.stateText}>Loading trades...</Text>
        </View>
      ) : null}

      {error ? (
        <View style={styles.statePanel}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {!isLoading && !error && trades.length === 0 ? (
        <View style={styles.statePanel}>
          <Text style={styles.stateTitle}>No trades yet</Text>
          <Text style={styles.stateText}>Log the first manual trade to start building history.</Text>
        </View>
      ) : null}

      <View style={styles.list}>
        {trades.map((trade) => (
          <Link key={trade.id} href={`/trades/${trade.id}` as Href} asChild>
            <Pressable style={({ pressed }) => [styles.tradeRow, pressed && styles.buttonPressed]}>
              <View style={styles.tradeMain}>
                <Text style={styles.symbol}>{trade.asset?.symbol ?? 'Unknown asset'}</Text>
                <Text style={styles.meta}>
                  {trade.direction.toUpperCase()} | {trade.status.toUpperCase()} |{' '}
                  {formatDate(trade.opened_at)}
                </Text>
                {trade.strategy ? <Text style={styles.meta}>Strategy: {trade.strategy.name}</Text> : null}
                {trade.tags.length > 0 ? (
                  <View style={styles.tags}>
                    {trade.tags.map((tag) => (
                      <Text key={tag.id} style={styles.tagChip}>
                        {tag.name}
                      </Text>
                    ))}
                  </View>
                ) : null}
              </View>
              <View style={styles.tradeNumbers}>
                <Text style={[styles.price, trade.net_pnl !== null && pnlStyle(trade.net_pnl)]}>
                  {trade.net_pnl !== null ? formatCurrency(trade.net_pnl) : 'Open'}
                </Text>
                <Text style={styles.meta}>
                  Entry {formatNumber(trade.entry_price)} | Size {formatNumber(trade.quantity)}
                </Text>
              </View>
            </Pressable>
          </Link>
        ))}
      </View>
    </ScrollView>
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

function parseSourceTradeIds(value: string | string[] | undefined) {
  const rawValue = getParamValue(value);

  return rawValue?.split(',').filter(Boolean) ?? [];
}

function getParamValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
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
  focusText: {
    color: '#475569',
    fontSize: 15,
    lineHeight: 22
  },
  primaryButton: {
    alignSelf: 'flex-start',
    minHeight: 44,
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: '#2563EB',
    paddingHorizontal: 16
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700'
  },
  buttonPressed: {
    opacity: 0.76
  },
  statePanel: {
    maxWidth: 860,
    gap: 8,
    borderRadius: 8,
    borderColor: '#E2E8F0',
    borderWidth: 1,
    backgroundColor: '#FFFFFF',
    padding: 18
  },
  filters: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 2
  },
  filterChip: {
    minHeight: 36,
    justifyContent: 'center',
    borderRadius: 8,
    borderColor: '#CBD5E1',
    borderWidth: 1,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12
  },
  filterChipSelected: {
    borderColor: '#2563EB',
    backgroundColor: '#EFF6FF'
  },
  filterChipText: {
    color: '#475569',
    fontSize: 13,
    fontWeight: '700'
  },
  filterChipTextSelected: {
    color: '#1D4ED8'
  },
  stateTitle: {
    color: '#0F172A',
    fontSize: 18,
    fontWeight: '800'
  },
  stateText: {
    color: '#475569',
    fontSize: 15,
    lineHeight: 22
  },
  errorText: {
    color: '#B91C1C',
    fontSize: 14,
    fontWeight: '700'
  },
  list: {
    maxWidth: 860,
    gap: 10
  },
  tradeRow: {
    minHeight: 82,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'space-between',
    borderRadius: 8,
    borderColor: '#E2E8F0',
    borderWidth: 1,
    backgroundColor: '#FFFFFF',
    padding: 16
  },
  tradeMain: {
    gap: 6
  },
  symbol: {
    color: '#0F172A',
    fontSize: 20,
    fontWeight: '800'
  },
  meta: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: '600'
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4
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
  tradeNumbers: {
    alignItems: 'flex-end',
    gap: 6
  },
  price: {
    color: '#0F172A',
    fontSize: 16,
    fontWeight: '700'
  },
  profit: {
    color: '#166534'
  },
  loss: {
    color: '#B91C1C'
  }
});
