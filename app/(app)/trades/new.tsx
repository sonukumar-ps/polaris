import { useLocalSearchParams, useRouter } from 'expo-router';
import type { Href } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from 'react-native';

import {
  AppShell,
  Card,
  PrimaryButton,
  SecondaryLinkButton,
  SectionHeading,
  TextField,
  useAppTheme
} from '@/lib/ui';
import { calculateRealizedPnl, createManualTrade, createStrategy, listAccounts, listStrategies } from '@/lib/trades';
import type { TradingAccount, TradingStrategy } from '@/lib/trades';

type Direction = 'long' | 'short';

type TradeDraft = {
  accountId: string;
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
  strategyId: string;
  symbol: string;
};

type StrategyDraft = {
  description: string;
  marketConditions: string;
  mustHaveRules: string;
  name: string;
  preferredRules: string;
  qualitativeNotes: string;
};

type ValidationErrors = Partial<Record<keyof TradeDraft, string>>;
type DropdownOption = {
  meta?: string;
  value: string;
  label: string;
};

const TRADES_ROUTE = '/trades' as Href;
const emptyStrategyDraft: StrategyDraft = {
  description: '',
  marketConditions: '',
  mustHaveRules: '',
  name: '',
  preferredRules: '',
  qualitativeNotes: ''
};

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

  if (!draft.accountId) {
    errors.accountId = 'Select an account.';
  }

  if (!draft.strategyId) {
    errors.strategyId = 'Select or create a strategy.';
  }

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
  const params = useLocalSearchParams<{ entryPrice?: string; size?: string }>();
  const [draft, setDraft] = useState<TradeDraft>(() => createInitialDraft(params));
  const [accounts, setAccounts] = useState<TradingAccount[]>([]);
  const [strategies, setStrategies] = useState<TradingStrategy[]>([]);
  const [strategyDraft, setStrategyDraft] = useState<StrategyDraft>(emptyStrategyDraft);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [strategyError, setStrategyError] = useState<string | null>(null);
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(true);
  const [isLoadingStrategies, setIsLoadingStrategies] = useState(true);
  const [isCreatingStrategy, setIsCreatingStrategy] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isStrategyModalOpen, setIsStrategyModalOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<'account' | 'strategy' | null>(null);
  const preview = useMemo(() => calculatePreview(draft), [draft]);
  const selectedAccount = accounts.find((account) => account.id === draft.accountId) ?? null;
  const selectedStrategy = strategies.find((strategy) => strategy.id === draft.strategyId) ?? null;
  const accountOptions = useMemo(
    () =>
      accounts.map((account) => ({
        label: account.name,
        meta: account.is_main ? 'Main account' : account.broker_name ?? undefined,
        value: account.id
      })),
    [accounts]
  );
  const strategyOptions = useMemo(
    () =>
      strategies.map((strategy) => ({
        label: strategy.name,
        meta: strategy.description ?? undefined,
        value: strategy.id
      })),
    [strategies]
  );

  useEffect(() => {
    let isActive = true;

    async function loadTradingAccounts() {
      setIsLoadingAccounts(true);
      setSubmitError(null);

      try {
        const loadedAccounts = await listAccounts();
        const defaultAccount = loadedAccounts.find((account) => account.is_main) ?? loadedAccounts[0];

        if (isActive) {
          setAccounts(loadedAccounts);
          setDraft((current) => ({
            ...current,
            accountId: current.accountId || defaultAccount?.id || ''
          }));
        }
      } catch (error) {
        if (isActive) {
          setSubmitError(error instanceof Error ? error.message : 'Could not load trading accounts.');
        }
      } finally {
        if (isActive) {
          setIsLoadingAccounts(false);
        }
      }
    }

    void loadTradingAccounts();

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    let isActive = true;

    async function loadStrategyOptions() {
      setIsLoadingStrategies(true);
      setStrategyError(null);

      try {
        const loadedStrategies = await listStrategies();

        if (isActive) {
          setStrategies(loadedStrategies);
          setDraft((current) => ({
            ...current,
            strategyId: current.strategyId || loadedStrategies[0]?.id || ''
          }));
        }
      } catch (error) {
        if (isActive) {
          setStrategyError(error instanceof Error ? error.message : 'Could not load strategies.');
        }
      } finally {
        if (isActive) {
          setIsLoadingStrategies(false);
        }
      }
    }

    void loadStrategyOptions();

    return () => {
      isActive = false;
    };
  }, []);

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

  function updateStrategyDraft<Key extends keyof StrategyDraft>(key: Key, value: StrategyDraft[Key]) {
    setStrategyDraft((current) => ({
      ...current,
      [key]: value
    }));
    setStrategyError(null);
  }

  async function handleCreateStrategy() {
    if (!strategyDraft.name.trim()) {
      setStrategyError('Strategy name is required.');
      return;
    }

    setIsCreatingStrategy(true);
    setStrategyError(null);

    try {
      const savedStrategy = await createStrategy({
        description: strategyDraft.description,
        marketConditions: strategyDraft.marketConditions,
        mustHaveRules: splitRules(strategyDraft.mustHaveRules),
        name: strategyDraft.name,
        preferredRules: splitRules(strategyDraft.preferredRules),
        qualitativeNotes: strategyDraft.qualitativeNotes
      });

      setStrategies((current) => [...current, savedStrategy]);
      updateField('strategyId', savedStrategy.id);
      setStrategyDraft(emptyStrategyDraft);
      setIsStrategyModalOpen(false);
    } catch (error) {
      setStrategyError(error instanceof Error ? error.message : 'Could not create strategy.');
    } finally {
      setIsCreatingStrategy(false);
    }
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
        accountId: draft.accountId,
        closedAt: draft.closedAt ? toDateTime(draft.closedAt) : null,
        direction: draft.direction,
        entryPrice: Number(draft.entryPrice),
        exitPrice: draft.exitPrice ? Number(draft.exitPrice) : null,
        fees: Number(draft.fees || '0'),
        notes: draft.notes,
        openedAt: toDateTime(draft.openedAt),
        quantity: Number(draft.size),
        strategyId: draft.strategyId,
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
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Account</Text>
              {isLoadingAccounts ? (
                <LoadingPill label="Loading accounts..." />
              ) : (
                <DropdownField
                  label="Account"
                  onOpen={() => setOpenDropdown('account')}
                  placeholder="Select account"
                  value={selectedAccount?.name ?? ''}
                />
              )}
              {errors.accountId ? <Text style={[styles.errorText, { color: theme.danger }]}>{errors.accountId}</Text> : null}
            </View>

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
              <View style={styles.sectionHeaderRow}>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>Strategy</Text>
                <Pressable
                  onPress={() => setIsStrategyModalOpen(true)}
                  style={({ pressed }) => [
                    styles.inlineAction,
                    { borderColor: theme.border, backgroundColor: theme.card },
                    pressed && styles.pressed
                  ]}
                >
                  <Text style={[styles.inlineActionText, { color: theme.text }]}>New strategy</Text>
                </Pressable>
              </View>
              {isLoadingStrategies ? (
                <LoadingPill label="Loading strategies..." />
              ) : strategies.length === 0 ? (
                <View style={[styles.emptyPanel, { backgroundColor: theme.mutedSurface }]}>
                  <Text style={[styles.emptyPanelTitle, { color: theme.text }]}>No strategies yet</Text>
                  <Text style={[styles.emptyPanelText, { color: theme.muted }]}>
                    Create one before saving so every trade has a clear playbook.
                  </Text>
                </View>
              ) : (
                <DropdownField
                  label="Strategy"
                  meta={selectedStrategy?.description ?? undefined}
                  onOpen={() => setOpenDropdown('strategy')}
                  placeholder="Select strategy"
                  value={selectedStrategy?.name ?? ''}
                />
              )}
              {errors.strategyId ? <Text style={[styles.errorText, { color: theme.danger }]}>{errors.strategyId}</Text> : null}
              {strategyError && !isStrategyModalOpen ? (
                <Text style={[styles.errorText, { color: theme.danger }]}>{strategyError}</Text>
              ) : null}
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
                  label="Emotion"
                  onChangeText={(value) => updateField('emotionTag', value)}
                  placeholder="Calm"
                  value={draft.emotionTag}
                />
                <TextField
                  label="Mistake"
                  onChangeText={(value) => updateField('mistakeTag', value)}
                  placeholder="Chased entry"
                  value={draft.mistakeTag}
                />
              </View>
              <View style={styles.fieldRow}>
                <TextField
                  label="Setup"
                  onChangeText={(value) => updateField('setupTag', value)}
                  placeholder="Opening range"
                  value={draft.setupTag}
                />
                <TextField
                  label="Custom tags"
                  onChangeText={(value) => updateField('customTags', value)}
                  placeholder="Comma-separated tags"
                  value={draft.customTags}
                />
              </View>
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

        <StrategyModal
          draft={strategyDraft}
          error={strategyError}
          isCreating={isCreatingStrategy}
          isOpen={isStrategyModalOpen}
          onClose={() => {
            setIsStrategyModalOpen(false);
            setStrategyError(null);
          }}
          onCreate={handleCreateStrategy}
          onUpdate={updateStrategyDraft}
        />
        <SelectModal
          isOpen={openDropdown === 'account'}
          onClose={() => setOpenDropdown(null)}
          onSelect={(accountId) => {
            updateField('accountId', accountId);
            setOpenDropdown(null);
          }}
          options={accountOptions}
          selectedValue={draft.accountId}
          title="Select account"
        />
        <SelectModal
          isOpen={openDropdown === 'strategy'}
          onClose={() => setOpenDropdown(null)}
          onSelect={(strategyId) => {
            updateField('strategyId', strategyId);
            setOpenDropdown(null);
          }}
          options={strategyOptions}
          selectedValue={draft.strategyId}
          title="Select strategy"
        />
      </AppShell>
    </KeyboardAvoidingView>
  );
}

function DropdownField({
  label,
  meta,
  onOpen,
  placeholder,
  value
}: {
  label: string;
  meta?: string;
  onOpen: () => void;
  placeholder: string;
  value: string;
}) {
  const theme = useAppTheme();

  return (
    <View style={styles.dropdownField}>
      <Text style={[styles.fieldLabel, { color: theme.muted }]}>{label}</Text>
      <Pressable
        onPress={onOpen}
        style={({ pressed }) => [
          styles.dropdownButton,
          { backgroundColor: theme.mutedSurface, borderColor: theme.border },
          pressed && styles.pressed
        ]}
      >
        <View style={styles.dropdownCopy}>
          <Text style={[styles.dropdownValue, { color: value ? theme.text : theme.muted }]}>
            {value || placeholder}
          </Text>
          {meta ? <Text style={[styles.dropdownMeta, { color: theme.muted }]}>{meta}</Text> : null}
        </View>
        <Text style={[styles.dropdownChevron, { color: theme.muted }]}>⌄</Text>
      </Pressable>
    </View>
  );
}

function SelectModal({
  isOpen,
  onClose,
  onSelect,
  options,
  selectedValue,
  title
}: {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (value: string) => void;
  options: DropdownOption[];
  selectedValue: string;
  title: string;
}) {
  const theme = useAppTheme();

  return (
    <Modal animationType="fade" onRequestClose={onClose} transparent visible={isOpen}>
      <View style={styles.modalBackdrop}>
        <Card style={styles.selectModalCard}>
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>{title}</Text>
            <Pressable onPress={onClose} style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}>
              <Text style={[styles.closeButtonText, { color: theme.muted }]}>Close</Text>
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.selectOptions}>
            {options.map((option) => {
              const isSelected = option.value === selectedValue;

              return (
                <Pressable
                  key={option.value}
                  onPress={() => onSelect(option.value)}
                  style={({ pressed }) => [
                    styles.selectOption,
                    {
                      backgroundColor: isSelected ? theme.accent : theme.mutedSurface,
                      borderColor: isSelected ? theme.accent : theme.border
                    },
                    pressed && styles.pressed
                  ]}
                >
                  <View style={styles.dropdownCopy}>
                    <Text style={[styles.selectOptionText, { color: isSelected ? '#FFFFFF' : theme.text }]}>
                      {option.label}
                    </Text>
                    {option.meta ? (
                      <Text style={[styles.selectOptionMeta, { color: isSelected ? '#EAF3FF' : theme.muted }]}>
                        {option.meta}
                      </Text>
                    ) : null}
                  </View>
                  {isSelected ? <Text style={styles.selectCheck}>✓</Text> : null}
                </Pressable>
              );
            })}
          </ScrollView>
        </Card>
      </View>
    </Modal>
  );
}

function LoadingPill({ label }: { label: string }) {
  const theme = useAppTheme();

  return (
    <View style={[styles.accountLoading, { backgroundColor: theme.mutedSurface }]}>
      <ActivityIndicator color={theme.accent} />
      <Text style={[styles.accountLoadingText, { color: theme.muted }]}>{label}</Text>
    </View>
  );
}

function StrategyModal({
  draft,
  error,
  isCreating,
  isOpen,
  onClose,
  onCreate,
  onUpdate
}: {
  draft: StrategyDraft;
  error: string | null;
  isCreating: boolean;
  isOpen: boolean;
  onClose: () => void;
  onCreate: () => void;
  onUpdate: <Key extends keyof StrategyDraft>(key: Key, value: StrategyDraft[Key]) => void;
}) {
  const theme = useAppTheme();

  return (
    <Modal animationType="fade" onRequestClose={onClose} transparent visible={isOpen}>
      <View style={styles.modalBackdrop}>
        <Card style={styles.modalCard}>
          <View style={styles.sectionHeaderRow}>
            <View>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Create strategy</Text>
              <Text style={[styles.modalSubtitle, { color: theme.muted }]}>
                Define the rules before attaching it to this trade.
              </Text>
            </View>
            <Pressable onPress={onClose} style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}>
              <Text style={[styles.closeButtonText, { color: theme.muted }]}>Close</Text>
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.modalFields}>
            <TextField
              label="Name"
              onChangeText={(value) => onUpdate('name', value)}
              placeholder="Opening range breakout"
              value={draft.name}
            />
            <TextField
              label="Description"
              onChangeText={(value) => onUpdate('description', value)}
              placeholder="The specific setup this strategy is designed to capture."
              value={draft.description}
            />
            <TextField
              label="Must-have rules"
              multiline
              onChangeText={(value) => onUpdate('mustHaveRules', value)}
              placeholder="One rule per line"
              value={draft.mustHaveRules}
            />
            <TextField
              label="Preferred rules"
              multiline
              onChangeText={(value) => onUpdate('preferredRules', value)}
              placeholder="Nice-to-have confirmations"
              value={draft.preferredRules}
            />
            <TextField
              label="Market conditions"
              multiline
              onChangeText={(value) => onUpdate('marketConditions', value)}
              placeholder="When this strategy is valid"
              value={draft.marketConditions}
            />
            <TextField
              label="Qualitative notes"
              multiline
              onChangeText={(value) => onUpdate('qualitativeNotes', value)}
              placeholder="What good execution should feel or look like"
              value={draft.qualitativeNotes}
            />
            {error ? <Text style={[styles.errorText, { color: theme.danger }]}>{error}</Text> : null}
            <PrimaryButton disabled={isCreating} onPress={onCreate}>
              {isCreating ? 'Saving...' : 'Save strategy'}
            </PrimaryButton>
          </ScrollView>
        </Card>
      </View>
    </Modal>
  );
}

function createInitialDraft(params: { entryPrice?: string | string[]; size?: string | string[] }): TradeDraft {
  return {
    accountId: '',
    closedAt: '',
    customTags: '',
    direction: 'long',
    emotionTag: '',
    entryPrice: getParamValue(params.entryPrice),
    exitPrice: '',
    fees: '0',
    mistakeTag: '',
    notes: '',
    openedAt: new Date().toISOString().slice(0, 10),
    setupTag: '',
    size: getParamValue(params.size),
    strategyId: '',
    symbol: ''
  };
}

function getParamValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? (value[0] ?? '') : (value ?? '');
}

function toDateTime(date: string) {
  return new Date(`${date}T00:00:00.000Z`).toISOString();
}

function buildTagInputs(draft: TradeDraft) {
  return [
    { name: draft.emotionTag, type: 'emotion' as const },
    { name: draft.mistakeTag, type: 'mistake' as const },
    { name: draft.setupTag, type: 'setup' as const },
    ...draft.customTags.split(',').map((name) => ({ name, type: 'custom' as const }))
  ];
}

function splitRules(value: string) {
  return value
    .split('\n')
    .map((rule) => rule.trim())
    .filter(Boolean);
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
  sectionHeaderRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  fieldRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '800'
  },
  dropdownField: {
    gap: 7
  },
  dropdownButton: {
    minHeight: 52,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 13,
    paddingVertical: 10
  },
  dropdownCopy: {
    flex: 1,
    gap: 3
  },
  dropdownValue: {
    fontSize: 16,
    fontWeight: '800'
  },
  dropdownMeta: {
    fontSize: 12,
    lineHeight: 17
  },
  dropdownChevron: {
    fontSize: 20,
    fontWeight: '800'
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
  accountLoading: {
    minHeight: 54,
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    borderRadius: 8,
    paddingHorizontal: 12
  },
  accountLoadingText: {
    fontSize: 13,
    fontWeight: '800'
  },
  inlineAction: {
    minHeight: 36,
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12
  },
  inlineActionText: {
    fontSize: 13,
    fontWeight: '800'
  },
  emptyPanel: {
    gap: 5,
    borderRadius: 8,
    padding: 14
  },
  emptyPanelTitle: {
    fontSize: 15,
    fontWeight: '800'
  },
  emptyPanelText: {
    fontSize: 13,
    lineHeight: 19
  },
  modalBackdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.38)',
    padding: 18
  },
  modalCard: {
    width: '100%',
    maxWidth: 720,
    maxHeight: '92%'
  },
  selectModalCard: {
    width: '100%',
    maxWidth: 560,
    maxHeight: '82%'
  },
  modalFields: {
    gap: 14,
    paddingBottom: 4
  },
  selectOptions: {
    gap: 8,
    paddingBottom: 4
  },
  selectOption: {
    minHeight: 52,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 8,
    borderWidth: 1,
    padding: 12
  },
  selectOptionText: {
    fontSize: 15,
    fontWeight: '800'
  },
  selectOptionMeta: {
    fontSize: 12,
    lineHeight: 17
  },
  selectCheck: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800'
  },
  modalSubtitle: {
    maxWidth: 520,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 4
  },
  closeButton: {
    minHeight: 36,
    justifyContent: 'center',
    paddingHorizontal: 10
  },
  closeButtonText: {
    fontSize: 13,
    fontWeight: '800'
  },
  pressed: {
    opacity: 0.72
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
