import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Link } from 'expo-router';

import { AppShell, Card, SectionHeading, TextField, useAppTheme } from '@/lib/ui';
import { calculatePositionSize } from '@/lib/trades';

type RiskDraft = {
  accountBalance: string;
  entryPrice: string;
  riskPercent: string;
  stopPrice: string;
  targetPrice: string;
};

const initialDraft: RiskDraft = {
  accountBalance: '10000',
  entryPrice: '',
  riskPercent: '1',
  stopPrice: '',
  targetPrice: ''
};

export default function RiskScreen() {
  const theme = useAppTheme();
  const [draft, setDraft] = useState<RiskDraft>(initialDraft);
  const result = useMemo(() => {
    const accountBalance = parsePositiveNumber(draft.accountBalance);
    const entryPrice = parsePositiveNumber(draft.entryPrice);
    const riskPercent = parsePositiveNumber(draft.riskPercent);
    const stopPrice = parsePositiveNumber(draft.stopPrice);
    const targetPrice = draft.targetPrice ? parsePositiveNumber(draft.targetPrice) : null;

    if (!accountBalance || !entryPrice || !riskPercent || !stopPrice) {
      return null;
    }

    return calculatePositionSize({
      accountBalance,
      entryPrice,
      riskPercent,
      stopPrice,
      targetPrice
    });
  }, [draft]);

  function updateField<Key extends keyof RiskDraft>(key: Key, value: RiskDraft[Key]) {
    setDraft((current) => ({
      ...current,
      [key]: value
    }));
  }

  return (
    <AppShell activeRoute="risk">
      <SectionHeading
        eyebrow="Risk"
        subtitle="Size a position from account risk, entry, stop, and optional target before logging the trade."
        title="Position sizing"
      />

      <View style={styles.layout}>
        <Card style={styles.formCard}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Inputs</Text>
          <View style={styles.fieldRow}>
            <TextField
              inputMode="decimal"
              label="Account"
              onChangeText={(value) => updateField('accountBalance', value)}
              placeholder="10000"
              value={draft.accountBalance}
            />
            <TextField
              inputMode="decimal"
              label="Risk %"
              onChangeText={(value) => updateField('riskPercent', value)}
              placeholder="1"
              value={draft.riskPercent}
            />
          </View>
          <View style={styles.fieldRow}>
            <TextField
              inputMode="decimal"
              label="Entry"
              onChangeText={(value) => updateField('entryPrice', value)}
              placeholder="100.00"
              value={draft.entryPrice}
            />
            <TextField
              inputMode="decimal"
              label="Stop"
              onChangeText={(value) => updateField('stopPrice', value)}
              placeholder="95.00"
              value={draft.stopPrice}
            />
          </View>
          <TextField
            inputMode="decimal"
            label="Target"
            onChangeText={(value) => updateField('targetPrice', value)}
            placeholder="Optional"
            value={draft.targetPrice}
          />
        </Card>

        <Card style={styles.resultCard}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Plan</Text>
          <Text style={[styles.primaryResult, { color: theme.text }]}>
            {result ? formatNumber(result.positionSize) : '0'}
          </Text>
          <Text style={[styles.resultLabel, { color: theme.muted }]}>Units to trade</Text>
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <View style={styles.resultGrid}>
            <Metric label="Max loss" value={result ? formatCurrency(result.maxLoss) : '$0.00'} />
            <Metric label="Risk/unit" value={result ? formatCurrency(result.riskPerUnit) : '$0.00'} />
            <Metric label="Notional" value={result ? formatCurrency(result.notionalValue) : '$0.00'} />
            <Metric
              label="R multiple"
              value={result?.riskRewardRatio ? `${formatNumber(result.riskRewardRatio)}R` : '0R'}
            />
          </View>
          <Text style={[styles.helperText, { color: theme.muted }]}>
            {result?.estimatedReward
              ? `Target reward ${formatCurrency(result.estimatedReward)} before fees and slippage.`
              : 'Add a target price to preview expected reward.'}
          </Text>
          {result ? (
            <Link
              href={{
                pathname: '/trades/new',
                params: {
                  entryPrice: draft.entryPrice,
                  size: String(result.positionSize)
                }
              }}
              style={[styles.logLink, { backgroundColor: theme.accent }]}
            >
              <Text style={styles.logLinkText}>Log with size</Text>
            </Link>
          ) : null}
        </Card>
      </View>
    </AppShell>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  const theme = useAppTheme();

  return (
    <View style={[styles.metric, { backgroundColor: theme.mutedSurface }]}>
      <Text style={[styles.metricValue, { color: theme.text }]}>{value}</Text>
      <Text style={[styles.metricLabel, { color: theme.muted }]}>{label}</Text>
    </View>
  );
}

function parsePositiveNumber(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en', {
    currency: 'USD',
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
    style: 'currency'
  }).format(value);
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('en', {
    maximumFractionDigits: 4,
    minimumFractionDigits: 0
  }).format(value);
}

const styles = StyleSheet.create({
  layout: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
    alignItems: 'flex-start'
  },
  formCard: {
    minWidth: 300,
    flex: 2
  },
  resultCard: {
    minWidth: 280,
    flex: 1
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800'
  },
  fieldRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12
  },
  primaryResult: {
    fontSize: 38,
    fontWeight: '800'
  },
  resultLabel: {
    fontSize: 13,
    fontWeight: '800'
  },
  divider: {
    height: 1,
    marginVertical: 4
  },
  resultGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10
  },
  metric: {
    minWidth: 120,
    flex: 1,
    gap: 5,
    borderRadius: 8,
    padding: 12
  },
  metricValue: {
    fontSize: 17,
    fontWeight: '800'
  },
  metricLabel: {
    fontSize: 12,
    fontWeight: '800'
  },
  helperText: {
    fontSize: 14,
    lineHeight: 21
  },
  logLink: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    paddingHorizontal: 16,
    textDecorationLine: 'none'
  },
  logLinkText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800'
  }
});
