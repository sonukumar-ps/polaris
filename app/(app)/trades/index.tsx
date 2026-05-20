import { Link, useFocusEffect } from 'expo-router';
import type { Href } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { listTradeSummaries } from '@/lib/trades';
import type { TradeSummary } from '@/lib/trades';

const HOME_ROUTE = '/home' as Href;
const NEW_TRADE_ROUTE = '/trades/new' as Href;

export default function TradesScreen() {
  const [trades, setTrades] = useState<TradeSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      async function loadTrades() {
        setIsLoading(true);
        setError(null);

        try {
          const loadedTrades = await listTradeSummaries();

          if (isActive) {
            setTrades(loadedTrades);
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
    }, [])
  );

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Link href={HOME_ROUTE} style={styles.backLink}>
          Back
        </Link>
        <Text style={styles.eyebrow}>Trade Journal</Text>
        <Text style={styles.title}>Saved trades</Text>
      </View>

      <Link href={NEW_TRADE_ROUTE} asChild>
        <Pressable style={({ pressed }) => [styles.primaryButton, pressed && styles.buttonPressed]}>
          <Text style={styles.primaryButtonText}>Log trade</Text>
        </Pressable>
      </Link>

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
              </View>
              <View style={styles.tradeNumbers}>
                <Text style={styles.price}>Entry {formatNumber(trade.entry_price)}</Text>
                <Text style={styles.meta}>Size {formatNumber(trade.quantity)}</Text>
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
  tradeNumbers: {
    alignItems: 'flex-end',
    gap: 6
  },
  price: {
    color: '#0F172A',
    fontSize: 16,
    fontWeight: '700'
  }
});
