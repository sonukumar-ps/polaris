import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { getDrawdownStatus } from '@/lib/trades';
import type { DrawdownStatus } from '@/lib/trades';

import { useAppTheme } from './theme';

/**
 * Renders a warning banner at the top of the app when the user has
 * breached their configured daily/weekly drawdown limits.
 *
 * Stays hidden when no limits are set or no breach.
 *
 * Polls every 60 seconds since trades close async.
 */
export function DrawdownBanner({ accountBalance }: { accountBalance?: number }) {
  const theme = useAppTheme();
  const [status, setStatus] = useState<DrawdownStatus | null>(null);

  useEffect(() => {
    let isActive = true;

    async function load() {
      try {
        const s = await getDrawdownStatus(accountBalance);
        if (isActive) setStatus(s);
      } catch {
        // silent
      }
    }

    void load();
    const interval = setInterval(load, 60_000);

    return () => {
      isActive = false;
      clearInterval(interval);
    };
  }, [accountBalance]);

  if (!status || (!status.dailyBreached && !status.weeklyBreached)) {
    return null;
  }

  const severity = status.weeklyBreached ? 'weekly' : 'daily';
  const message =
    severity === 'weekly'
      ? formatWeeklyMessage(status)
      : formatDailyMessage(status);

  return (
    <View
      style={[
        styles.banner,
        {
          backgroundColor: theme.dangerMuted,
          borderColor: theme.danger
        }
      ]}
    >
      <View style={[styles.iconCircle, { backgroundColor: theme.danger }]}>
        <Text style={styles.iconText}>!</Text>
      </View>
      <View style={styles.copy}>
        <Text style={[styles.title, { color: theme.danger }]}>
          {severity === 'weekly' ? 'Weekly loss limit breached' : 'Daily loss limit breached'}
        </Text>
        <Text style={[styles.body, { color: theme.text }]}>{message}</Text>
      </View>
    </View>
  );
}

function formatDailyMessage(status: DrawdownStatus): string {
  const loss = formatCurrency(Math.abs(status.dailyLoss));
  const limit = status.dailyLossLimit !== null ? formatCurrency(Math.abs(status.dailyLossLimit)) : 'limit';
  return `You're down ${loss} today (limit ${limit}). Step away from the chart. Tomorrow is a fresh day.`;
}

function formatWeeklyMessage(status: DrawdownStatus): string {
  const loss = formatCurrency(Math.abs(status.weeklyLoss));
  const limit = status.weeklyLossLimit !== null ? formatCurrency(Math.abs(status.weeklyLossLimit)) : 'limit';
  return `You're down ${loss} this week (limit ${limit}). No more trades this week. Review and reset.`;
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
  banner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    borderRadius: 0,
    borderBottomWidth: 1,
    paddingHorizontal: 20,
    paddingVertical: 14
  },
  iconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center'
  },
  iconText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700'
  },
  copy: {
    flex: 1,
    gap: 3
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: -0.1
  },
  body: {
    fontSize: 13,
    fontWeight: '400',
    lineHeight: 18
  }
});
