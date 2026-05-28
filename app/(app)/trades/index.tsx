import { Link, useFocusEffect, useLocalSearchParams } from 'expo-router';
import type { Href } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppShell, PrimaryLinkButton, SectionHeading, useAppTheme } from '@/lib/ui';
import { countTrades, listTags, listTradeSummaries, useAccountScope } from '@/lib/trades';
import type { JournalTag, TradeSummary } from '@/lib/trades';

const NEW_TRADE_ROUTE = '/trades/new' as Href;

export default function TradesScreen() {
  const theme = useAppTheme();
  const params = useLocalSearchParams<{ focus?: string; sourceTradeIds?: string }>();
  const focusLabel = getParamValue(params.focus);
  const {
    error: accountError,
    isLoading: isLoadingAccounts,
    selectedAccountIds,
    selectedAccounts
  } = useAccountScope();
  const [trades, setTrades] = useState<TradeSummary[]>([]);
  const [totalTrades, setTotalTrades] = useState<number | null>(null);
  const [tags, setTags] = useState<JournalTag[]>([]);
  const [selectedTagId, setSelectedTagId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      async function loadTrades() {
        if (isLoadingAccounts) {
          return;
        }

        if (selectedAccountIds.length === 0) {
          setTrades([]);
          setTotalTrades(0);
          setIsLoading(false);
          return;
        }

        setIsLoading(true);
        setTotalTrades(null);
        setError(null);

        try {
          const sourceTradeIds = parseSourceTradeIds(params.sourceTradeIds);
          const [loadedTrades, loadedTags, loadedTotalTrades] = await Promise.all([
            listTradeSummaries({
              accountIds: selectedAccountIds,
              limit: sourceTradeIds.length > 0 ? 500 : undefined,
              tagId: selectedTagId ?? undefined
            }),
            listTags(),
            countTrades({ accountIds: selectedAccountIds })
          ]);

          if (isActive) {
            setTrades(
              sourceTradeIds.length > 0
                ? loadedTrades.filter((trade) => sourceTradeIds.includes(trade.id))
                : loadedTrades
            );
            setTags(loadedTags);
            setTotalTrades(loadedTotalTrades);
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
    }, [isLoadingAccounts, params.sourceTradeIds, selectedAccountIds, selectedTagId])
  );

  const accountScopeLabel =
    selectedAccounts.length === 1 ? selectedAccounts[0].name : `${selectedAccounts.length} selected accounts`;

  return (
    <AppShell activeRoute="trades">
      <View style={styles.headerRow}>
        <View style={styles.header}>
          <SectionHeading
            eyebrow="Trade journal"
            subtitle="Review executions, context, and outcomes in one continuous history."
            title="Saved trades"
          />
          {!isLoadingAccounts ? (
            <Text style={[styles.tradeCount, { color: theme.muted }]}>
              {totalTrades === null
                ? 'Counting saved trades...'
                : `${totalTrades} saved trade${totalTrades === 1 ? '' : 's'} in ${accountScopeLabel}`}
            </Text>
          ) : null}
          {focusLabel ? <Text style={[styles.focusText, { color: theme.textSecondary }]}>Focus: {focusLabel}</Text> : null}
        </View>
        <PrimaryLinkButton href={NEW_TRADE_ROUTE}>Log trade</PrimaryLinkButton>
      </View>

      {tags.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.filters}>
            <Pressable
              onPress={() => {
                setSelectedTagId(null);
              }}
              style={[
                styles.filterChip,
                {
                  backgroundColor: selectedTagId === null ? theme.accentMuted : theme.card,
                  borderColor: selectedTagId === null ? theme.accent : theme.border
                }
              ]}
            >
              <Text
                style={[
                  styles.filterChipText,
                  { color: selectedTagId === null ? theme.accent : theme.muted }
                ]}
              >
                All
              </Text>
            </Pressable>
            {tags.map((tag) => (
              <Pressable
                key={tag.id}
                onPress={() => setSelectedTagId(tag.id)}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: selectedTagId === tag.id ? theme.accentMuted : theme.card,
                    borderColor: selectedTagId === tag.id ? theme.accent : theme.border
                  }
                ]}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    { color: selectedTagId === tag.id ? theme.accent : theme.muted }
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
        <View style={[styles.statePanel, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <ActivityIndicator color={theme.accent} />
          <Text style={[styles.stateText, { color: theme.muted }]}>Loading trades...</Text>
        </View>
      ) : null}

      {accountError || error ? (
        <View style={[styles.statePanel, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.errorText, { color: theme.danger }]}>{accountError ?? error}</Text>
        </View>
      ) : null}

      {!isLoading && !accountError && !error && trades.length === 0 ? (
        <View style={[styles.statePanel, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.stateTitle, { color: theme.text }]}>No trades yet</Text>
          <Text style={[styles.stateText, { color: theme.muted }]}>Log the first manual trade to start building history.</Text>
        </View>
      ) : null}

      <View style={styles.list}>
        {trades.map((trade) => {
          const pnlColor =
            trade.net_pnl === null ? theme.text : trade.net_pnl >= 0 ? theme.positive : theme.danger;
          return (
            <Link key={trade.id} href={`/trades/${trade.id}` as Href} asChild>
              <Pressable
                style={({ pressed }) => [
                  styles.tradeRow,
                  { backgroundColor: theme.card, borderColor: theme.border },
                  pressed && styles.buttonPressed
                ]}
              >
                <View style={styles.tradeMain}>
                  <Text style={[styles.symbol, { color: theme.text }]}>{trade.asset?.symbol ?? 'Unknown asset'}</Text>
                  <Text style={[styles.meta, { color: theme.muted }]}>
                    {trade.direction.toUpperCase()} | {trade.status.toUpperCase()} |{' '}
                    {formatDate(trade.opened_at)}
                  </Text>
                  {trade.strategy ? <Text style={[styles.meta, { color: theme.muted }]}>Strategy: {trade.strategy.name}</Text> : null}
                  {trade.tags.length > 0 ? (
                    <View style={styles.tags}>
                      {trade.tags.map((tag) => (
                        <Text key={tag.id} style={[styles.tagChip, { backgroundColor: theme.mutedSurface, color: theme.textSecondary }]}>
                          {tag.name}
                        </Text>
                      ))}
                    </View>
                  ) : null}
                </View>
                <View style={styles.tradeNumbers}>
                  <Text style={[styles.price, { color: pnlColor }]}>
                    {trade.net_pnl !== null ? formatCurrency(trade.net_pnl) : 'Open'}
                  </Text>
                  <Text style={[styles.meta, { color: theme.muted }]}>
                    Entry {formatNumber(trade.entry_price)} | Size {formatNumber(trade.quantity)}
                  </Text>
                </View>
              </Pressable>
            </Link>
          );
        })}
      </View>
    </AppShell>
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

function parseSourceTradeIds(value: string | string[] | undefined) {
  const rawValue = getParamValue(value);

  return rawValue?.split(',').filter(Boolean) ?? [];
}

function getParamValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    alignItems: 'flex-start',
    justifyContent: 'space-between'
  },
  header: {
    gap: 8,
    maxWidth: 860
  },
  focusText: {
    fontSize: 15,
    lineHeight: 22
  },
  tradeCount: {
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20
  },
  buttonPressed: {
    opacity: 0.76,
    transform: [{ scale: 0.985 }]
  },
  statePanel: {
    maxWidth: 860,
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
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
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 14
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: -0.1
  },
  stateTitle: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.2
  },
  stateText: {
    fontSize: 15,
    lineHeight: 22
  },
  errorText: {
    fontSize: 14,
    fontWeight: '600'
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
    borderRadius: 12,
    borderWidth: 1,
    padding: 16
  },
  tradeMain: {
    gap: 6
  },
  symbol: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.3
  },
  meta: {
    fontSize: 13,
    fontWeight: '500'
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
    fontSize: 12,
    fontWeight: '600',
    paddingHorizontal: 8,
    paddingVertical: 4
  },
  tradeNumbers: {
    alignItems: 'flex-end',
    gap: 6
  },
  price: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2
  }
});
