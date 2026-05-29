import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { Link } from 'expo-router';

import { AppShell, Card, InfoTip, PrimaryButton, SectionHeading, TextField, useAppTheme, userMessage } from '@/lib/ui';
import { calculatePositionSize, getDrawdownStatus, getRiskLimits, updateRiskLimits } from '@/lib/trades';
import type { DrawdownStatus, RiskLimits } from '@/lib/trades';

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

      <RiskLimitsCard accountBalance={Number(draft.accountBalance) || undefined} />

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

function RiskLimitsCard({ accountBalance }: { accountBalance?: number }) {
  const theme = useAppTheme();
  const [limits, setLimits] = useState<RiskLimits | null>(null);
  const [status, setStatus] = useState<DrawdownStatus | null>(null);
  const [draft, setDraft] = useState({
    maxDailyLossAmount: '',
    maxDailyLossPct: '',
    maxWeeklyLossAmount: '',
    maxWeeklyLossPct: ''
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [enabled, setEnabled] = useState(true);

  async function reload() {
    setIsLoading(true);
    setError(null);
    try {
      const [l, s] = await Promise.all([
        getRiskLimits(),
        getDrawdownStatus(accountBalance).catch(() => null)
      ]);
      setLimits(l);
      setStatus(s);
      setEnabled(l.circuitBreakerEnabled);
      setDraft({
        maxDailyLossAmount: l.maxDailyLossAmount !== null ? String(l.maxDailyLossAmount) : '',
        maxDailyLossPct: l.maxDailyLossPct !== null ? String(l.maxDailyLossPct) : '',
        maxWeeklyLossAmount: l.maxWeeklyLossAmount !== null ? String(l.maxWeeklyLossAmount) : '',
        maxWeeklyLossPct: l.maxWeeklyLossPct !== null ? String(l.maxWeeklyLossPct) : ''
      });
    } catch (err) {
      setError(userMessage(err, "Couldn't load risk limits"));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void reload();
  }, [accountBalance]);

  async function handleSave() {
    setIsSaving(true);
    setError(null);
    setSaveMessage(null);
    try {
      const updated = await updateRiskLimits({
        circuitBreakerEnabled: enabled,
        maxDailyLossAmount: draft.maxDailyLossAmount ? Number(draft.maxDailyLossAmount) : null,
        maxDailyLossPct: draft.maxDailyLossPct ? Number(draft.maxDailyLossPct) : null,
        maxWeeklyLossAmount: draft.maxWeeklyLossAmount ? Number(draft.maxWeeklyLossAmount) : null,
        maxWeeklyLossPct: draft.maxWeeklyLossPct ? Number(draft.maxWeeklyLossPct) : null
      });
      setLimits(updated);
      setSaveMessage('✓ Limits saved');
      const s = await getDrawdownStatus(accountBalance).catch(() => null);
      setStatus(s);
    } catch (err) {
      setError(userMessage(err, "Couldn't save limits"));
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading || !limits) {
    return null;
  }

  return (
    <Card>
      <View style={styles.limitsHeader}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Daily P&L circuit breaker</Text>
          <InfoTip
            title="Circuit breaker"
            definition="A drawdown limit that flags when your daily or weekly losses exceed your threshold. Trading after a big loss is the #1 cause of revenge trading and account blowups — set a hard line you won't cross."
          />
        </View>
        <Switch
          onValueChange={setEnabled}
          thumbColor={enabled ? '#FFFFFF' : theme.muted}
          trackColor={{ false: theme.border, true: theme.accent }}
          value={enabled}
        />
      </View>

      <Text style={[styles.helperText, { color: theme.muted }]}>
        Set either a percentage of equity OR an absolute amount per period. If both are set, the lower (stricter)
        threshold wins. Leave blank to disable that limit.
      </Text>

      {status ? (
        <View style={styles.statusGrid}>
          <View style={[styles.statusBox, { backgroundColor: theme.mutedSurface }]}>
            <Text style={[styles.statusLabel, { color: theme.muted }]}>Today</Text>
            <Text
              style={[
                styles.statusValue,
                { color: status.dailyLoss < 0 ? theme.danger : theme.positive }
              ]}
            >
              {formatCurrencySigned(status.dailyLoss)}
            </Text>
            {status.dailyLossLimit !== null ? (
              <Text style={[styles.statusMeta, { color: theme.muted }]}>
                limit {formatCurrencySigned(status.dailyLossLimit)}
              </Text>
            ) : null}
          </View>
          <View style={[styles.statusBox, { backgroundColor: theme.mutedSurface }]}>
            <Text style={[styles.statusLabel, { color: theme.muted }]}>This week</Text>
            <Text
              style={[
                styles.statusValue,
                { color: status.weeklyLoss < 0 ? theme.danger : theme.positive }
              ]}
            >
              {formatCurrencySigned(status.weeklyLoss)}
            </Text>
            {status.weeklyLossLimit !== null ? (
              <Text style={[styles.statusMeta, { color: theme.muted }]}>
                limit {formatCurrencySigned(status.weeklyLossLimit)}
              </Text>
            ) : null}
          </View>
        </View>
      ) : null}

      <Text style={[styles.subhead, { color: theme.muted }]}>Daily limit</Text>
      <View style={styles.fieldRow}>
        <TextField
          inputMode="decimal"
          label="% of equity"
          onChangeText={(v) => setDraft((d) => ({ ...d, maxDailyLossPct: v }))}
          placeholder="3"
          value={draft.maxDailyLossPct}
        />
        <TextField
          inputMode="decimal"
          label="Amount ($)"
          onChangeText={(v) => setDraft((d) => ({ ...d, maxDailyLossAmount: v }))}
          placeholder="300"
          value={draft.maxDailyLossAmount}
        />
      </View>

      <Text style={[styles.subhead, { color: theme.muted }]}>Weekly limit</Text>
      <View style={styles.fieldRow}>
        <TextField
          inputMode="decimal"
          label="% of equity"
          onChangeText={(v) => setDraft((d) => ({ ...d, maxWeeklyLossPct: v }))}
          placeholder="6"
          value={draft.maxWeeklyLossPct}
        />
        <TextField
          inputMode="decimal"
          label="Amount ($)"
          onChangeText={(v) => setDraft((d) => ({ ...d, maxWeeklyLossAmount: v }))}
          placeholder="600"
          value={draft.maxWeeklyLossAmount}
        />
      </View>

      {saveMessage ? (
        <Text style={[styles.successText, { color: theme.positive }]}>{saveMessage}</Text>
      ) : null}
      {error ? <Text style={[styles.errorText, { color: theme.danger }]}>{error}</Text> : null}

      <PrimaryButton disabled={isSaving} onPress={handleSave}>
        {isSaving ? 'Saving...' : 'Save limits'}
      </PrimaryButton>
    </Card>
  );
}

function formatCurrencySigned(value: number) {
  const sign = value > 0 ? '+' : value < 0 ? '−' : '';
  const formatted = new Intl.NumberFormat('en', {
    currency: 'USD',
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
    style: 'currency'
  }).format(Math.abs(value));
  return `${sign}${formatted}`;
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
  },
  limitsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12
  },
  subhead: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginTop: 4
  },
  statusGrid: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap'
  },
  statusBox: {
    flex: 1,
    minWidth: 130,
    gap: 3,
    borderRadius: 12,
    padding: 14
  },
  statusLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.4,
    textTransform: 'uppercase'
  },
  statusValue: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.3
  },
  statusMeta: {
    fontSize: 12,
    fontWeight: '500'
  },
  successText: {
    fontSize: 13,
    fontWeight: '600'
  },
  errorText: {
    fontSize: 13,
    fontWeight: '600'
  },
  helperText2: {
    fontSize: 13,
    lineHeight: 18
  }
});
