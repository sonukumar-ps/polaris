import { useRouter } from 'expo-router';
import type { Href } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppShell, Card, LoadingState, SectionHeading, useAppTheme, userMessage } from '@/lib/ui';
import { generateAllInsights, generateInsightCoach, listTradeSummaries } from '@/lib/trades';
import type { Insight, TradeSummary } from '@/lib/trades';
import { useAccountScope } from '@/lib/trades';

export default function InsightsOverviewScreen() {
  const router = useRouter();
  const theme = useAppTheme();
  const { selectedAccountIds } = useAccountScope();
  const [trades, setTrades] = useState<TradeSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;

    async function loadData() {
      setIsLoading(true);
      setError(null);

      try {
        const loaded = await listTradeSummaries({
          accountIds: selectedAccountIds ?? undefined,
          limit: 200
        });

        if (isActive) {
          setTrades(loaded);
        }
      } catch (err) {
        if (isActive) {
          setError(userMessage(err, "Couldn't load trades"));
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    void loadData();

    return () => {
      isActive = false;
    };
  }, [selectedAccountIds]);

  const allInsights = trades.length > 0 ? generateAllInsights(trades) : [];
  const primary = allInsights[0] ?? generateInsightCoach(trades);
  const secondary = allInsights.slice(1);

  function navigateToSourceTrades(insight: Insight) {
    if (insight.sourceTradeIds.length === 0) return;
    const ids = insight.sourceTradeIds.join(',');
    router.push(`/trades?sourceTradeIds=${ids}&focus=${encodeURIComponent(insight.title)}` as Href);
  }

  return (
    <AppShell activeRoute="insights">
      <SectionHeading
        eyebrow="Mentor"
        subtitle="Pattern recognition from your closed trades."
        title="Insights"
      />

      {isLoading ? <LoadingState label="Analysing trades..." /> : null}

      {error ? (
        <Card style={{ borderColor: theme.danger }}>
          <Text style={[styles.errorText, { color: theme.danger }]}>{error}</Text>
        </Card>
      ) : null}

      {!isLoading && !error ? (
        <View style={styles.content}>
          <InsightCard insight={primary} isPrimary onAction={navigateToSourceTrades} />
          {secondary.map((insight) => (
            <InsightCard key={insight.id} insight={insight} onAction={navigateToSourceTrades} />
          ))}
          {allInsights.length === 0 ? (
            <Card>
              <Text style={[styles.emptyTitle, { color: theme.text }]}>No insights yet</Text>
              <Text style={[styles.emptyBody, { color: theme.muted }]}>
                Log and close a few trades to unlock your first coaching insight.
              </Text>
            </Card>
          ) : null}
        </View>
      ) : null}
    </AppShell>
  );
}

function InsightCard({
  insight,
  isPrimary = false,
  onAction
}: {
  insight: Insight;
  isPrimary?: boolean;
  onAction: (insight: Insight) => void;
}) {
  const theme = useAppTheme();

  const severityColor =
    insight.severity === 'positive'
      ? theme.positive
      : insight.severity === 'warning'
        ? theme.danger
        : theme.muted;

  return (
    <Card style={[styles.insightCard, isPrimary && { borderLeftWidth: 3, borderLeftColor: severityColor }]}>
      <View style={styles.insightHeader}>
        <View style={[styles.severityDot, { backgroundColor: severityColor }]} />
        <Text style={[styles.insightTitle, { color: theme.text }]}>{insight.title}</Text>
      </View>
      <Text style={[styles.insightReason, { color: theme.muted }]}>{insight.reason}</Text>
      <View style={styles.metrics}>
        {insight.metrics.map((metric) => (
          <View key={metric.label} style={[styles.metric, { backgroundColor: theme.mutedSurface }]}>
            <Text style={[styles.metricLabel, { color: theme.muted }]}>{metric.label}</Text>
            <Text
              style={[
                styles.metricValue,
                {
                  color:
                    metric.tone === 'positive'
                      ? theme.positive
                      : metric.tone === 'warning'
                        ? theme.danger
                        : theme.text
                }
              ]}
            >
              {metric.value}
            </Text>
          </View>
        ))}
      </View>
      <Pressable
        onPress={() => onAction(insight)}
        style={({ pressed }) => [
          styles.actionButton,
          { backgroundColor: theme.mutedSurface, borderColor: theme.border },
          pressed && styles.pressed
        ]}
      >
        <Text style={[styles.actionLabel, { color: theme.text }]}>{insight.action.label}</Text>
      </Pressable>
    </Card>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 12
  },
  insightCard: {
    gap: 12
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10
  },
  severityDot: {
    width: 8,
    height: 8,
    borderRadius: 4
  },
  insightTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '800'
  },
  insightReason: {
    fontSize: 14,
    lineHeight: 21
  },
  metrics: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  metric: {
    flex: 1,
    minWidth: 120,
    gap: 3,
    borderRadius: 8,
    padding: 10
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: '800'
  },
  metricValue: {
    fontSize: 16,
    fontWeight: '800'
  },
  actionButton: {
    alignSelf: 'flex-start',
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 8
  },
  actionLabel: {
    fontSize: 13,
    fontWeight: '800'
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '800'
  },
  emptyBody: {
    fontSize: 14,
    lineHeight: 21,
    marginTop: 4
  },
  errorText: {
    fontSize: 14,
    fontWeight: '800'
  },
  pressed: {
    opacity: 0.72
  }
});
