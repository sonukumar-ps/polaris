import { Link } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppShell, Card, InfoTip, LoadingState, SectionHeading, useAppTheme } from '@/lib/ui';
import {
  calculateCurrencyExposure,
  calculateExposureWarnings,
  listTradeSummaries,
  useAccountScope
} from '@/lib/trades';
import type { CurrencyExposure, ExposureWarning, TradeSummary } from '@/lib/trades';
import { seedOpenTrades } from '@/lib/trades/seed-open-trades';

export default function ExposureScreen() {
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

    async function load() {
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

    void load();
    return () => {
      isActive = false;
    };
  }, [selectedAccountIds]);

  const openTrades = trades.filter((t) => t.status === 'open');
  const exposures = calculateCurrencyExposure(trades);
  const warnings = calculateExposureWarnings(exposures);

  return (
    <AppShell activeRoute="insights">
      <SectionHeading
        eyebrow="Risk management"
        subtitle="Live view of currency exposure across your open trades. Avoid doubling up on the same currency."
        title="Exposure"
      />

      {isLoading ? <LoadingState label="Loading exposure data..." /> : null}
      {error ? (
        <Card style={{ borderColor: theme.danger }}>
          <Text style={[styles.errorText, { color: theme.danger }]}>{error}</Text>
        </Card>
      ) : null}

      {!isLoading && !error && openTrades.length === 0 ? (
        <Card>
          <Text style={[styles.emptyTitle, { color: theme.text }]}>No open trades</Text>
          <Text style={[styles.emptyBody, { color: theme.muted }]}>
            Exposure analysis requires open trades. Seed demo open trades below to see how the dashboard works.
          </Text>
          <Pressable
            disabled={isSeeding}
            onPress={async () => {
              setIsSeeding(true);
              try {
                await seedOpenTrades();
                await reload();
              } catch (err) {
                setError(err instanceof Error ? err.message : 'Could not seed open trades.');
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
              {isSeeding ? 'Seeding open trades...' : '🧪 Seed 6 open trades with currency overlap'}
            </Text>
          </Pressable>
        </Card>
      ) : null}

      {!isLoading && !error && openTrades.length > 0 ? (
        <View style={styles.content}>
          <Card>
            <Text style={[styles.summaryLine, { color: theme.text }]}>
              <Text style={{ fontWeight: '800' }}>{openTrades.length}</Text> open trade{openTrades.length !== 1 ? 's' : ''} across{' '}
              <Text style={{ fontWeight: '800' }}>{exposures.length}</Text> {exposures.length === 1 ? 'currency' : 'currencies'}
            </Text>
          </Card>

          {warnings.length > 0 ? (
            <Card style={{ borderLeftWidth: 3, borderLeftColor: theme.danger }}>
              <Text style={[styles.sectionTitle, { color: theme.danger }]}>
                ⚠ {warnings.length} exposure warning{warnings.length !== 1 ? 's' : ''}
              </Text>
              <View style={styles.warningList}>
                {warnings.map((w, idx) => (
                  <WarningRow key={`${w.currency}-${idx}`} warning={w} />
                ))}
              </View>
            </Card>
          ) : (
            <Card style={{ borderLeftWidth: 3, borderLeftColor: theme.positive }}>
              <Text style={[styles.sectionTitle, { color: theme.positive }]}>✓ No exposure warnings</Text>
              <Text style={[styles.summaryLine, { color: theme.muted }]}>
                No currency is doubled-up across multiple non-bulletproof trades. Good risk management.
              </Text>
            </Card>
          )}

          <Card>
            <View style={styles.titleRow}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Currency exposure</Text>
              <InfoTip term="net_exposure" />
            </View>
            <Text style={[styles.cardSubtitle, { color: theme.muted }]}>
              Sorted by absolute exposure magnitude
            </Text>
            <View style={styles.exposureList}>
              {exposures.map((exp) => (
                <ExposureRow key={exp.currency} exposure={exp} />
              ))}
            </View>
          </Card>
        </View>
      ) : null}
    </AppShell>
  );
}

function ExposureRow({ exposure }: { exposure: CurrencyExposure }) {
  const theme = useAppTheme();

  // Bar visualization
  const isLongDominant = exposure.netExposure > 0;
  const magnitude = Math.abs(exposure.netExposure);
  const barColor = magnitude < 0.34 ? theme.muted : isLongDominant ? theme.positive : theme.danger;
  const sentiment = magnitude < 0.1 ? 'Balanced' : isLongDominant ? 'Net long' : 'Net short';

  return (
    <View style={[styles.exposureRow, { borderBottomColor: theme.border }]}>
      <View style={styles.exposureHeader}>
        <Text style={[styles.currencyCode, { color: theme.text }]}>{exposure.currency}</Text>
        <View style={styles.exposureCounts}>
          <Text style={[styles.exposureCount, { color: theme.positive }]}>
            ↑ {exposure.longCount}
          </Text>
          <Text style={[styles.exposureCount, { color: theme.danger }]}>
            ↓ {exposure.shortCount}
          </Text>
          <Text style={[styles.sentimentTag, { color: barColor }]}>{sentiment}</Text>
        </View>
      </View>

      <View style={[styles.exposureBarTrack, { backgroundColor: theme.mutedSurface }]}>
        <View
          style={[
            styles.exposureBarFill,
            {
              backgroundColor: barColor,
              left: isLongDominant ? '50%' : `${50 - magnitude * 50}%`,
              width: `${magnitude * 50}%`
            }
          ]}
        />
        <View style={[styles.exposureBarCenter, { backgroundColor: theme.border }]} />
      </View>

      <View style={styles.tradePills}>
        {exposure.trades.map((t) => {
          const isLongOnThisCurrency = t.role === 'base_long' || t.role === 'quote_long';
          const pillColor = isLongOnThisCurrency ? theme.positive : theme.danger;
          return (
            <Link asChild href={`/trades/${t.tradeId}` as any} key={t.tradeId}>
              <Pressable
                style={({ pressed }) => [
                  styles.tradePill,
                  { backgroundColor: theme.mutedSurface, borderColor: pillColor },
                  pressed && styles.pressed
                ]}
              >
                <Text style={[styles.tradePillSymbol, { color: theme.text }]}>{t.symbol}</Text>
                <Text style={[styles.tradePillDirection, { color: pillColor }]}>
                  {isLongOnThisCurrency ? '↑' : '↓'}
                </Text>
                {t.isBulletproof ? (
                  <Text style={[styles.tradePillBp, { color: theme.positive }]}>🛡</Text>
                ) : null}
              </Pressable>
            </Link>
          );
        })}
      </View>
    </View>
  );
}

function WarningRow({ warning }: { warning: ExposureWarning }) {
  const theme = useAppTheme();
  const severityColor = warning.severity === 'high' ? theme.danger : theme.text;

  return (
    <View style={[styles.warningRow, { borderLeftColor: severityColor }]}>
      <Text style={[styles.warningCurrency, { color: severityColor }]}>{warning.currency}</Text>
      <Text style={[styles.warningMessage, { color: theme.text }]}>{warning.message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { gap: 12 },
  sectionTitle: { fontSize: 17, fontWeight: '800', marginBottom: 6 },
  cardSubtitle: { fontSize: 13, lineHeight: 19, marginBottom: 10 },
  summaryLine: { fontSize: 14, lineHeight: 21 },
  emptyTitle: { fontSize: 17, fontWeight: '800', marginBottom: 6 },
  emptyBody: { fontSize: 14, lineHeight: 21, marginBottom: 12 },
  errorText: { fontSize: 14, fontWeight: '800' },
  warningList: { gap: 10, marginTop: 6 },
  warningRow: {
    borderLeftWidth: 3,
    paddingLeft: 12,
    gap: 4
  },
  warningCurrency: { fontSize: 15, fontWeight: '800' },
  warningMessage: { fontSize: 13, lineHeight: 19 },
  exposureList: { gap: 0 },
  exposureRow: {
    gap: 8,
    borderBottomWidth: 1,
    paddingVertical: 14
  },
  exposureHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12
  },
  currencyCode: { fontSize: 18, fontWeight: '800' },
  exposureCounts: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  exposureCount: { fontSize: 14, fontWeight: '800' },
  sentimentTag: { fontSize: 12, fontWeight: '800' },
  exposureBarTrack: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    position: 'relative'
  },
  exposureBarFill: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    borderRadius: 4
  },
  exposureBarCenter: {
    position: 'absolute',
    left: '50%',
    top: 0,
    bottom: 0,
    width: 1
  },
  tradePills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6
  },
  tradePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 6,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4
  },
  tradePillSymbol: { fontSize: 12, fontWeight: '800' },
  tradePillDirection: { fontSize: 14, fontWeight: '800' },
  tradePillBp: { fontSize: 11 },
  seedButton: { alignItems: 'center', borderRadius: 8, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 10 },
  seedButtonText: { fontSize: 13, fontWeight: '800' },
  pressed: { opacity: 0.72 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }
});
