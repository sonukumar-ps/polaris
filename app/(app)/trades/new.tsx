import { useRouter } from 'expo-router';
import type { Href } from 'expo-router';
import { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import {
  AppShell,
  Card,
  PrimaryButton,
  SecondaryLinkButton,
  SectionHeading,
  TextField,
  useAppTheme
} from '@/lib/ui';
import { calculateRealizedPnl, createManualTrade } from '@/lib/trades';

type Direction = 'long' | 'short';

type TradeDraft = {
  closedAt: string;
  customTags: string;
  direction: Direction;
  emotionTag: string;
  entryPrice: string;
  exitPrice: string;
  fees: string;
  mistakeTag: string;
  notes: string;
  openedAt: string;
  setupTag: string;
  size: string;
  strategyTag: string;
  symbol: string;
};

type ValidationErrors = Partial<Record<keyof TradeDraft, string>>;

const initialDraft: TradeDraft = {
  closedAt: '',
  customTags: '',
  direction: 'long',
  emotionTag: '',
  entryPrice: '',
  exitPrice: '',
  fees: '0',
  mistakeTag: '',
  notes: '',
  openedAt: new Date().toISOString().slice(0, 10),
  setupTag: '',
  size: '',
  strategyTag: '',
  symbol: ''
};

const TRADES_ROUTE = '/trades' as Href;

function parsePositiveNumber(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function parseNonNegativeNumber(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function validateDraft(draft: TradeDraft) {
  const errors: ValidationErrors = {};

  if (!draft.symbol.trim()) {
    errors.symbol = 'Symbol is required.';
  }

  if (!parsePositiveNumber(draft.entryPrice)) {
    errors.entryPrice = 'Entry price must be greater than zero.';
  }

  if (!parsePositiveNumber(draft.size)) {
    errors.size = 'Size must be greater than zero.';
  }

  if (draft.exitPrice && !parsePositiveNumber(draft.exitPrice)) {
    errors.exitPrice = 'Exit price must be greater than zero.';
  }

  if (draft.fees && parseNonNegativeNumber(draft.fees) === null) {
    errors.fees = 'Fees cannot be negative.';
  }

  if (!draft.openedAt.trim()) {
    errors.openedAt = 'Opened date is required.';
  }

  if (draft.closedAt && !draft.exitPrice) {
    errors.exitPrice = 'Exit price is required for closed trades.';
  }

  if (draft.exitPrice && !draft.closedAt) {
    errors.closedAt = 'Closed date is required when an exit price is entered.';
  }

  return errors;
}

function calculatePreview(draft: TradeDraft) {
  const entryPrice = parsePositiveNumber(draft.entryPrice);
  const exitPrice = parsePositiveNumber(draft.exitPrice);
  const size = parsePositiveNumber(draft.size);
  const fees = parseNonNegativeNumber(draft.fees || '0');

  if (!entryPrice || !exitPrice || !size || fees === null) {
    return null;
  }

  return calculateRealizedPnl({
    direction: draft.direction,
    entryPrice,
    exitPrice,
    fees,
    quantity: size
  });
}

export default function NewTradeScreen() {
  const router = useRouter();
  const theme = useAppTheme();
  const [draft, setDraft] = useState<TradeDraft>(initialDraft);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const preview = useMemo(() => calculatePreview(draft), [draft]);

  function updateField<Key extends keyof TradeDraft>(key: Key, value: TradeDraft[Key]) {
    setDraft((current) => ({
      ...current,
      [key]: value
    }));
    setErrors((current) => ({
      ...current,
      [key]: undefined
    }));
    setSubmitError(null);
  }

  async function handleSaveTrade() {
    const nextErrors = validateDraft(draft);
    setErrors(nextErrors);
    setSubmitError(null);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setIsSaving(true);

    try {
      const savedTrade = await createManualTrade({
        closedAt: draft.closedAt ? toDateTime(draft.closedAt) : null,
        direction: draft.direction,
        entryPrice: Number(draft.entryPrice),
        exitPrice: draft.exitPrice ? Number(draft.exitPrice) : null,
        fees: Number(draft.fees || '0'),
        notes: draft.notes,
        openedAt: toDateTime(draft.openedAt),
        quantity: Number(draft.size),
        symbol: draft.symbol,
        tags: buildTagInputs(draft)
      });

      router.replace(`/trades/${savedTrade.id}` as Href);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Could not save trade.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.select({ ios: 'padding', default: undefined })}
      style={{ flex: 1 }}
    >
      <AppShell activeRoute="add-trade">
        <View style={styles.headerRow}>
          <SectionHeading
            eyebrow="New entry"
            subtitle="Capture execution, context, and emotional state without clutter."
            title="Add trade"
          />
          <SecondaryLinkButton href={TRADES_ROUTE}>Saved trades</SecondaryLinkButton>
        </View>

        <View style={styles.layout}>
          <Card style={styles.formCard}>
            <View style={styles.formSection}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Trade</Text>
              <TextField
                autoCapitalize="characters"
                error={errors.symbol}
                label="Symbol"
                onChangeText={(value) => updateField('symbol', value)}
                placeholder="AAPL"
                value={draft.symbol}
              />
              <View style={styles.fieldRow}>
                <TextField
                  error={errors.entryPrice}
                  inputMode="decimal"
                  label="Entry"
                  onChangeText={(value) => updateField('entryPrice', value)}
                  placeholder="100.00"
                  value={draft.entryPrice}
                />
                <TextField
                  error={errors.exitPrice}
                  inputMode="decimal"
                  label="Exit"
                  onChangeText={(value) => updateField('exitPrice', value)}
                  placeholder="112.50"
                  value={draft.exitPrice}
                />
              </View>
              <View style={styles.fieldRow}>
                <TextField
                  error={errors.size}
                  inputMode="decimal"
                  label="Size"
                  onChangeText={(value) => updateField('size', value)}
                  placeholder="10"
                  value={draft.size}
                />
                <TextField
                  error={errors.fees}
                  inputMode="decimal"
                  label="Fees"
                  onChangeText={(value) => updateField('fees', value)}
                  placeholder="0"
                  value={draft.fees}
                />
              </View>
              <View style={styles.segmentedControl}>
                {(['long', 'short'] as const).map((direction) => {
                  const isSelected = draft.direction === direction;

                  return (
                    <Pressable
                      key={direction}
                      onPress={() => updateField('direction', direction)}
                      style={[
                        styles.segment,
                        {
                          backgroundColor: isSelected ? theme.accent : theme.mutedSurface,
                          borderColor: isSelected ? theme.accent : theme.border
                        }
                      ]}
                    >
                      <Text style={[styles.segmentText, { color: isSelected ? '#FFFFFF' : theme.muted }]}>
                        {direction.toUpperCase()}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View style={styles.formSection}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Timing and context</Text>
              <View style={styles.fieldRow}>
                <TextField
                  error={errors.openedAt}
                  label="Opened"
                  onChangeText={(value) => updateField('openedAt', value)}
                  placeholder="2026-05-21"
                  value={draft.openedAt}
                />
                <TextField
                  error={errors.closedAt}
                  label="Closed"
                  onChangeText={(value) => updateField('closedAt', value)}
                  placeholder="Optional"
                  value={draft.closedAt}
                />
              </View>
              <View style={styles.fieldRow}>
                <TextField
                  label="Strategy"
                  onChangeText={(value) => updateField('strategyTag', value)}
                  placeholder="Breakout"
                  value={draft.strategyTag}
                />
                <TextField
                  label="Emotion"
                  onChangeText={(value) => updateField('emotionTag', value)}
                  placeholder="Calm"
                  value={draft.emotionTag}
                />
              </View>
              <View style={styles.fieldRow}>
                <TextField
                  label="Mistake"
                  onChangeText={(value) => updateField('mistakeTag', value)}
                  placeholder="Chased entry"
                  value={draft.mistakeTag}
                />
                <TextField
                  label="Setup"
                  onChangeText={(value) => updateField('setupTag', value)}
                  placeholder="Opening range"
                  value={draft.setupTag}
                />
              </View>
              <TextField
                label="Custom tags"
                onChangeText={(value) => updateField('customTags', value)}
                placeholder="Comma-separated tags"
                value={draft.customTags}
              />
              <TextField
                label="Notes"
                multiline
                onChangeText={(value) => updateField('notes', value)}
                placeholder="What mattered about this trade?"
                value={draft.notes}
              />
            </View>

            {submitError ? <Text style={[styles.errorText, { color: theme.danger }]}>{submitError}</Text> : null}
            <PrimaryButton disabled={isSaving} onPress={handleSaveTrade}>
              {isSaving ? 'Saving...' : 'Save trade'}
            </PrimaryButton>
          </Card>

          <Card style={styles.previewCard}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Preview</Text>
            <Text style={[styles.previewValue, { color: preview && preview.netPnl < 0 ? theme.danger : theme.positive }]}>
              {preview ? formatCurrency(preview.netPnl) : '$0.00'}
            </Text>
            <Text style={[styles.previewLabel, { color: theme.muted }]}>Estimated net P&L</Text>
            <View style={[styles.previewDivider, { backgroundColor: theme.border }]} />
            <Text style={[styles.previewText, { color: theme.muted }]}>
              {preview
                ? `Gross ${formatCurrency(preview.grossPnl)} after entered fees.`
                : 'Enter an exit price to preview realized P&L.'}
            </Text>
          </Card>
        </View>
      </AppShell>
    </KeyboardAvoidingView>
  );
}

function toDateTime(date: string) {
  return new Date(`${date}T00:00:00.000Z`).toISOString();
}

function buildTagInputs(draft: TradeDraft) {
  return [
    { name: draft.strategyTag, type: 'strategy' as const },
    { name: draft.emotionTag, type: 'emotion' as const },
    { name: draft.mistakeTag, type: 'mistake' as const },
    { name: draft.setupTag, type: 'setup' as const },
    ...draft.customTags.split(',').map((name) => ({ name, type: 'custom' as const }))
  ];
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en', {
    currency: 'USD',
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
    style: 'currency'
  }).format(value);
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    alignItems: 'flex-start',
    justifyContent: 'space-between'
  },
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
  previewCard: {
    minWidth: 260,
    flex: 1
  },
  formSection: {
    gap: 14
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
  segmentedControl: {
    flexDirection: 'row',
    gap: 8
  },
  segment: {
    minHeight: 42,
    minWidth: 96,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12
  },
  segmentText: {
    fontSize: 13,
    fontWeight: '800'
  },
  errorText: {
    fontSize: 14,
    fontWeight: '800'
  },
  previewValue: {
    fontSize: 36,
    fontWeight: '800'
  },
  previewLabel: {
    fontSize: 13,
    fontWeight: '800'
  },
  previewDivider: {
    height: 1,
    marginVertical: 4
  },
  previewText: {
    fontSize: 14,
    lineHeight: 21
  }
});
