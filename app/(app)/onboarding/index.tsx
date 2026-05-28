import { useRouter } from 'expo-router';
import type { Href } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  Card,
  PrimaryButton,
  TextField,
  useAppTheme
} from '@/lib/ui';
import { createStrategy, listAccounts, listStrategies } from '@/lib/trades';
import { seedDemoTrades } from '@/lib/trades/seed-trades';
import { seedSrLevels } from '@/lib/trades/sr-levels/seed-sr-levels';

const JASON_DEFAULT_STRATEGY = {
  description: "Trade with the prevailing trend on a pullback to the 20/50 EMA zone, after reaction at S/R with 3+ touches.",
  marketConditions: 'Oscillating market with 3+ identifiable swings, daily timeframe primary',
  mustHaveRulesText: [
    'Market condition: visibly oscillating with 3+ HH/HL or LH/LL swings',
    'Market phase: in pullback relative to trade direction',
    'S/R reaction: 3+ previous touches at the relevant level',
    'Deceleration: smaller candles, doji, tweezer, or HLT pattern',
    'Price above/below 50 EMA aligned with trade direction',
    'Price has visited 20/50 EMA zone in the last trading day'
  ].join('\n'),
  name: 'Forex Trend',
  preferredRulesText: [
    'Candlestick pattern at entry (doji, engulfing, tweezer)',
    'Multiple timeframe confirmation (HTF aligned)',
    'Indicator signal (RSI, MACD, fib retracement)',
    'Emotional rating between 4-6 (calm/optimal)'
  ].join('\n'),
  qualitativeNotes: 'Risk 1% per trade. Use pending buy/sell stop 3-5 pips beyond last daily H/L. Maximum 5 concurrent trades. Trail SL max 1x per day.'
};

type Step = 'welcome' | 'strategy' | 'seed' | 'done';

export default function OnboardingScreen() {
  const router = useRouter();
  const theme = useAppTheme();
  const [step, setStep] = useState<Step>('welcome');
  const [strategyName, setStrategyName] = useState(JASON_DEFAULT_STRATEGY.name);
  const [isWorking, setIsWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);
  const [seedSummary, setSeedSummary] = useState<string | null>(null);

  // If user already has strategies, redirect home — onboarding is one-time
  useEffect(() => {
    let isActive = true;
    async function check() {
      try {
        const strategies = await listStrategies();
        if (isActive && strategies.length > 0) {
          router.replace('/home' as Href);
        }
      } catch {
        // silent — let user proceed
      } finally {
        if (isActive) setChecking(false);
      }
    }
    void check();
    return () => {
      isActive = false;
    };
  }, []);

  async function handleCreateStrategy() {
    if (!strategyName.trim()) {
      setError('Give your strategy a name.');
      return;
    }
    setIsWorking(true);
    setError(null);
    try {
      // Ensure default account exists by calling listAccounts
      await listAccounts();
      await createStrategy({
        description: JASON_DEFAULT_STRATEGY.description,
        marketConditions: JASON_DEFAULT_STRATEGY.marketConditions,
        mustHaveRules: JASON_DEFAULT_STRATEGY.mustHaveRulesText.split('\n'),
        name: strategyName,
        preferredRules: JASON_DEFAULT_STRATEGY.preferredRulesText.split('\n'),
        qualitativeNotes: JASON_DEFAULT_STRATEGY.qualitativeNotes
      });
      setStep('seed');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create strategy.');
    } finally {
      setIsWorking(false);
    }
  }

  async function handleSeed() {
    setIsWorking(true);
    setError(null);
    try {
      const [tradeCount, levelCount] = await Promise.all([
        seedDemoTrades().catch(() => 0),
        seedSrLevels().catch(() => 0)
      ]);
      setSeedSummary(`Loaded ${tradeCount} demo trades + ${levelCount} S/R levels.`);
      setStep('done');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not seed data.');
    } finally {
      setIsWorking(false);
    }
  }

  function skipSeed() {
    setStep('done');
  }

  function goHome() {
    router.replace('/home' as Href);
  }

  if (checking) {
    return (
      <View style={[styles.screen, { backgroundColor: theme.background }]}>
        <Text style={[styles.checkingText, { color: theme.muted }]}>Checking your account...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={[styles.screen, { backgroundColor: theme.background }]}
      style={{ flex: 1 }}
    >
      <View style={styles.wrap}>
        {/* Progress dots */}
        <View style={styles.progressRow}>
          {(['welcome', 'strategy', 'seed', 'done'] as const).map((s, idx) => {
            const currentIdx = ['welcome', 'strategy', 'seed', 'done'].indexOf(step);
            const isActive = idx === currentIdx;
            const isDone = idx < currentIdx;
            return (
              <View
                key={s}
                style={[
                  styles.dot,
                  {
                    backgroundColor: isActive ? theme.accent : isDone ? theme.positive : theme.border,
                    width: isActive ? 28 : 8
                  }
                ]}
              />
            );
          })}
        </View>

        {step === 'welcome' ? (
          <Card>
            <Text style={[styles.eyebrow, { color: theme.accent }]}>Welcome to Polaris</Text>
            <Text style={[styles.title, { color: theme.text }]}>
              The trading journal built on{'\n'}Jason's elite trader system.
            </Text>
            <Text style={[styles.body, { color: theme.muted }]}>
              Let's get you set up. We'll create your first strategy and account in under 30 seconds — then you can
              start logging trades or load demo data to explore the features.
            </Text>

            <View style={styles.featureList}>
              <FeatureRow theme={theme} title="Daily checklists" body="Walk Jason's 4 critical columns for every pair before deciding to trade." />
              <FeatureRow theme={theme} title="Pre-flight orders" body="Pending buy/sell stops with 24h expiry — no market orders, no FOMO entries." />
              <FeatureRow theme={theme} title="Behavioral insights" body="Psychology, Best Process, and Exposure dashboards keep you accountable." />
              <FeatureRow theme={theme} title="Circuit breaker" body="Configurable daily/weekly P&L limits — built-in protection from revenge trading." />
            </View>

            <PrimaryButton onPress={() => setStep('strategy')}>Get started</PrimaryButton>
          </Card>
        ) : null}

        {step === 'strategy' ? (
          <Card>
            <Text style={[styles.eyebrow, { color: theme.accent }]}>Step 1 of 2</Text>
            <Text style={[styles.title, { color: theme.text }]}>Create your first strategy</Text>
            <Text style={[styles.body, { color: theme.muted }]}>
              We've pre-filled the Forex Trend strategy from Jason's system — must-have rules, preferred analysis, and
              the 1% risk framework. You can edit it any time from the trade form. Just confirm or rename below.
            </Text>

            <TextField
              autoCapitalize="words"
              label="Strategy name"
              onChangeText={setStrategyName}
              placeholder="Forex Trend"
              value={strategyName}
            />

            <View style={styles.ruleBox}>
              <Text style={[styles.ruleTitle, { color: theme.text }]}>Must-have rules</Text>
              <Text style={[styles.ruleBody, { color: theme.muted }]}>{JASON_DEFAULT_STRATEGY.mustHaveRulesText}</Text>
            </View>

            <View style={styles.ruleBox}>
              <Text style={[styles.ruleTitle, { color: theme.text }]}>Preferred analysis</Text>
              <Text style={[styles.ruleBody, { color: theme.muted }]}>{JASON_DEFAULT_STRATEGY.preferredRulesText}</Text>
            </View>

            {error ? <Text style={[styles.errorText, { color: theme.danger }]}>{error}</Text> : null}

            <View style={styles.actionRow}>
              <Pressable
                onPress={() => setStep('welcome')}
                style={({ pressed }) => [
                  styles.backButton,
                  { borderColor: theme.border, backgroundColor: theme.card },
                  pressed && styles.pressed
                ]}
              >
                <Text style={[styles.backButtonText, { color: theme.muted }]}>← Back</Text>
              </Pressable>
              <View style={{ flex: 1 }}>
                <PrimaryButton disabled={isWorking} onPress={handleCreateStrategy}>
                  {isWorking ? 'Creating...' : 'Create strategy'}
                </PrimaryButton>
              </View>
            </View>
          </Card>
        ) : null}

        {step === 'seed' ? (
          <Card>
            <Text style={[styles.eyebrow, { color: theme.accent }]}>Step 2 of 2</Text>
            <Text style={[styles.title, { color: theme.text }]}>Load demo data?</Text>
            <Text style={[styles.body, { color: theme.muted }]}>
              We can seed 20 realistic closed trades (with full psychology data) + 20 S/R levels across major forex
              pairs. This lights up Psychology, Best Process, Exposure, and Checklist Analytics tabs so you can see
              how the features work before logging your own trades.
            </Text>

            <View style={[styles.bullet, { backgroundColor: theme.mutedSurface }]}>
              <Text style={[styles.bulletText, { color: theme.text }]}>
                You can also load demo data later from any empty state — or skip this and start fresh.
              </Text>
            </View>

            {error ? <Text style={[styles.errorText, { color: theme.danger }]}>{error}</Text> : null}

            <View style={styles.actionRow}>
              <Pressable
                disabled={isWorking}
                onPress={skipSeed}
                style={({ pressed }) => [
                  styles.backButton,
                  { borderColor: theme.border, backgroundColor: theme.card, flex: 1 },
                  pressed && styles.pressed
                ]}
              >
                <Text style={[styles.backButtonText, { color: theme.muted }]}>Skip — I'll start fresh</Text>
              </Pressable>
              <View style={{ flex: 1 }}>
                <PrimaryButton disabled={isWorking} onPress={handleSeed}>
                  {isWorking ? 'Loading demo data...' : '🧪 Load demo data'}
                </PrimaryButton>
              </View>
            </View>
          </Card>
        ) : null}

        {step === 'done' ? (
          <Card>
            <Text style={[styles.checkmark, { color: theme.positive }]}>✓</Text>
            <Text style={[styles.title, { color: theme.text }]}>You're all set</Text>
            <Text style={[styles.body, { color: theme.muted }]}>
              {seedSummary
                ? `${seedSummary} Head to the Checklist tab to start your daily routine, or check out the Psychology and Best Process tabs to see what insights your trades will surface.`
                : "Head to the Checklist tab to start your daily routine — walk through Jason's 4 critical columns for each pair, then save your first trade from a qualified setup."}
            </Text>
            <PrimaryButton onPress={goHome}>Go to dashboard</PrimaryButton>
          </Card>
        ) : null}
      </View>
    </ScrollView>
  );
}

function FeatureRow({
  body,
  theme,
  title
}: {
  body: string;
  theme: ReturnType<typeof useAppTheme>;
  title: string;
}) {
  return (
    <View style={styles.featureRow}>
      <View style={[styles.featureDot, { backgroundColor: theme.accent }]} />
      <View style={styles.featureCopy}>
        <Text style={[styles.featureTitle, { color: theme.text }]}>{title}</Text>
        <Text style={[styles.featureBody, { color: theme.muted }]}>{body}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    paddingTop: 56
  },
  wrap: {
    width: '100%',
    maxWidth: 560,
    gap: 20
  },
  progressRow: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4
  },
  dot: {
    height: 8,
    borderRadius: 4
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase'
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.5,
    lineHeight: 34
  },
  body: {
    fontSize: 15,
    lineHeight: 22
  },
  featureList: {
    gap: 14,
    marginTop: 4
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12
  },
  featureDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 8
  },
  featureCopy: {
    flex: 1,
    gap: 2
  },
  featureTitle: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: -0.1
  },
  featureBody: {
    fontSize: 13,
    lineHeight: 19
  },
  ruleBox: {
    gap: 4
  },
  ruleTitle: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.4,
    textTransform: 'uppercase'
  },
  ruleBody: {
    fontSize: 13,
    lineHeight: 19
  },
  bullet: {
    borderRadius: 10,
    padding: 14
  },
  bulletText: {
    fontSize: 13,
    lineHeight: 19
  },
  errorText: {
    fontSize: 13,
    fontWeight: '600'
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'stretch'
  },
  backButton: {
    minHeight: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14
  },
  backButtonText: {
    fontSize: 14,
    fontWeight: '600'
  },
  pressed: {
    opacity: 0.72
  },
  checkmark: {
    fontSize: 48,
    fontWeight: '700',
    alignSelf: 'flex-start'
  },
  checkingText: {
    fontSize: 14,
    fontWeight: '500'
  }
});
