import { Link, useRouter } from 'expo-router';
import type { Href } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';

import { calculateRealizedPnl, createManualTrade } from '@/lib/trades';

type Direction = 'long' | 'short';

type TradeDraft = {
  symbol: string;
  direction: Direction;
  entryPrice: string;
  exitPrice: string;
  size: string;
  fees: string;
  openedAt: string;
  closedAt: string;
  strategyTag: string;
  emotionTag: string;
  mistakeTag: string;
  setupTag: string;
  customTags: string;
  notes: string;
};

type ValidationErrors = Partial<Record<keyof TradeDraft, string>>;

const initialDraft: TradeDraft = {
  symbol: '',
  direction: 'long',
  entryPrice: '',
  exitPrice: '',
  size: '',
  fees: '0',
  openedAt: new Date().toISOString().slice(0, 10),
  closedAt: '',
  strategyTag: '',
  emotionTag: '',
  mistakeTag: '',
  setupTag: '',
  customTags: '',
  notes: ''
};

const HOME_ROUTE = '/home' as Href;
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
      style={styles.screen}
    >
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Link href={HOME_ROUTE} style={styles.backLink}>
            Back
          </Link>
          <Link href={TRADES_ROUTE} style={styles.secondaryLink}>
            View saved trades
          </Link>
          <Text style={styles.eyebrow}>Manual Trade</Text>
          <Text style={styles.title}>Log a trade</Text>
          <Text style={styles.subtitle}>
            Save a manual trade to your journal. Tags and screenshots come next.
          </Text>
        </View>

        <View style={styles.form}>
          <Field
            autoCapitalize="characters"
            error={errors.symbol}
            label="Asset symbol"
            onChangeText={(value) => updateField('symbol', value)}
            placeholder="AAPL"
            value={draft.symbol}
          />

          <View style={styles.group}>
            <Text style={styles.label}>Direction</Text>
            <View style={styles.segmentedControl}>
              {(['long', 'short'] as const).map((direction) => (
                <Pressable
                  key={direction}
                  onPress={() => updateField('direction', direction)}
                  style={[
                    styles.segment,
                    draft.direction === direction && styles.segmentSelected
                  ]}
                >
                  <Text
                    style={[
                      styles.segmentText,
                      draft.direction === direction && styles.segmentTextSelected
                    ]}
                  >
                    {direction.toUpperCase()}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={styles.twoColumn}>
            <Field
              error={errors.entryPrice}
              inputMode="decimal"
              label="Entry price"
              onChangeText={(value) => updateField('entryPrice', value)}
              placeholder="100.00"
              value={draft.entryPrice}
            />
            <Field
              error={errors.exitPrice}
              inputMode="decimal"
              label="Exit price"
              onChangeText={(value) => updateField('exitPrice', value)}
              placeholder="112.50"
              value={draft.exitPrice}
            />
          </View>

          <View style={styles.twoColumn}>
            <Field
              error={errors.size}
              inputMode="decimal"
              label="Size"
              onChangeText={(value) => updateField('size', value)}
              placeholder="10"
              value={draft.size}
            />
            <Field
              error={errors.fees}
              inputMode="decimal"
              label="Fees"
              onChangeText={(value) => updateField('fees', value)}
              placeholder="0"
              value={draft.fees}
            />
          </View>

          <View style={styles.twoColumn}>
            <Field
              error={errors.openedAt}
              label="Opened date"
              onChangeText={(value) => updateField('openedAt', value)}
              placeholder="2026-05-20"
              value={draft.openedAt}
            />
            <Field
              error={errors.closedAt}
              label="Closed date"
              onChangeText={(value) => updateField('closedAt', value)}
              placeholder="Optional"
              value={draft.closedAt}
            />
          </View>

          <View style={styles.twoColumn}>
            <Field
              label="Strategy tag"
              onChangeText={(value) => updateField('strategyTag', value)}
              placeholder="Breakout"
              value={draft.strategyTag}
            />
            <Field
              label="Emotion tag"
              onChangeText={(value) => updateField('emotionTag', value)}
              placeholder="Calm"
              value={draft.emotionTag}
            />
          </View>

          <View style={styles.twoColumn}>
            <Field
              label="Mistake tag"
              onChangeText={(value) => updateField('mistakeTag', value)}
              placeholder="Chased entry"
              value={draft.mistakeTag}
            />
            <Field
              label="Setup tag"
              onChangeText={(value) => updateField('setupTag', value)}
              placeholder="Opening range"
              value={draft.setupTag}
            />
          </View>

          <Field
            label="Custom tags"
            onChangeText={(value) => updateField('customTags', value)}
            placeholder="Comma-separated tags"
            value={draft.customTags}
          />

          <Field
            label="Notes"
            multiline
            onChangeText={(value) => updateField('notes', value)}
            placeholder="Setup, context, emotions, execution notes"
            value={draft.notes}
          />

          {submitError ? <Text style={styles.formError}>{submitError}</Text> : null}

          <Pressable
            disabled={isSaving}
            onPress={handleSaveTrade}
            style={({ pressed }) => [
              styles.primaryButton,
              (pressed || isSaving) && styles.primaryButtonPressed
            ]}
          >
            <Text style={styles.primaryButtonText}>{isSaving ? 'Saving...' : 'Save trade'}</Text>
          </Pressable>
        </View>

        <View style={styles.preview}>
          <Text style={styles.previewTitle}>Local preview</Text>
          <Text style={styles.previewText}>
            {preview
              ? `Gross P&L ${preview.grossPnl.toFixed(2)} | Net P&L ${preview.netPnl.toFixed(2)}`
              : 'Enter entry, exit, size, and fees to preview P&L.'}
          </Text>
        </View>
      </ScrollView>
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

type FieldProps = {
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  error?: string;
  inputMode?: 'decimal' | 'text';
  label: string;
  multiline?: boolean;
  onChangeText: (value: string) => void;
  placeholder: string;
  value: string;
};

function Field({
  autoCapitalize = 'none',
  error,
  inputMode = 'text',
  label,
  multiline = false,
  onChangeText,
  placeholder,
  value
}: FieldProps) {
  return (
    <View style={styles.group}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        autoCapitalize={autoCapitalize}
        inputMode={inputMode}
        multiline={multiline}
        onChangeText={onChangeText}
        placeholder={placeholder}
        style={[styles.input, multiline && styles.textArea, error && styles.inputError]}
        value={value}
      />
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F8FAFC'
  },
  content: {
    gap: 20,
    padding: 24,
    paddingTop: 56
  },
  header: {
    gap: 8,
    maxWidth: 760
  },
  backLink: {
    color: '#2563EB',
    fontSize: 14,
    fontWeight: '700'
  },
  secondaryLink: {
    color: '#475569',
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
  subtitle: {
    color: '#475569',
    fontSize: 16,
    lineHeight: 24
  },
  form: {
    maxWidth: 760,
    gap: 16,
    borderRadius: 8,
    borderColor: '#E2E8F0',
    borderWidth: 1,
    backgroundColor: '#FFFFFF',
    padding: 18
  },
  group: {
    flex: 1,
    gap: 6
  },
  label: {
    color: '#334155',
    fontSize: 13,
    fontWeight: '700'
  },
  input: {
    minHeight: 46,
    borderRadius: 8,
    borderColor: '#CBD5E1',
    borderWidth: 1,
    color: '#0F172A',
    fontSize: 16,
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  inputError: {
    borderColor: '#B91C1C'
  },
  textArea: {
    minHeight: 96,
    textAlignVertical: 'top'
  },
  errorText: {
    color: '#B91C1C',
    fontSize: 13
  },
  formError: {
    color: '#B91C1C',
    fontSize: 14,
    fontWeight: '700'
  },
  twoColumn: {
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
    borderColor: '#CBD5E1',
    borderWidth: 1,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12
  },
  segmentSelected: {
    borderColor: '#2563EB',
    backgroundColor: '#EFF6FF'
  },
  segmentText: {
    color: '#475569',
    fontSize: 13,
    fontWeight: '800'
  },
  segmentTextSelected: {
    color: '#1D4ED8'
  },
  primaryButton: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: '#2563EB',
    paddingHorizontal: 16
  },
  primaryButtonPressed: {
    opacity: 0.76
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700'
  },
  preview: {
    maxWidth: 760,
    gap: 8,
    borderRadius: 8,
    borderColor: '#E2E8F0',
    borderWidth: 1,
    backgroundColor: '#FFFFFF',
    padding: 18
  },
  previewTitle: {
    color: '#0F172A',
    fontSize: 18,
    fontWeight: '800'
  },
  previewText: {
    color: '#475569',
    fontSize: 15,
    lineHeight: 22
  },
});
