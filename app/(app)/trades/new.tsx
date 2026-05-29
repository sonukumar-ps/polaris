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
  useAppTheme,
  userMessage
} from '@/lib/ui';
import { calculateRealizedPnl, createManualTrade, createStrategy, linkChecklistToTrade, listAccounts, listStrategies } from '@/lib/trades';
import type { TradingAccount, TradingStrategy } from '@/lib/trades';
import type {
  EmotionalState,
  EntryTiming,
  ExitTiming,
  HtfBias,
  MarketCondition,
  PositionSizeAdherence,
  TradePsychologyInput,
  TradingSession
} from '@/lib/trades/backtesting/psychology.types';
import type { EntryOrderType, ManagementOption } from '@/lib/trades/orders/order.types';

type Direction = 'long' | 'short';

type PsychDraft = {
  convictionLevel: string;
  emotionalState: EmotionalState | '';
  energyLevel: string;
  entryTiming: EntryTiming | '';
  exitTiming: ExitTiming | '';
  focusLevel: string;
  followedPlan: boolean | null;
  htfBias: HtfBias | '';
  htfTimeframe: string;
  lesson: string;
  marketCondition: MarketCondition | '';
  movedStopLoss: boolean | null;
  movedTakeProfit: boolean | null;
  plannedRr: string;
  positionSizeAdherence: PositionSizeAdherence | '';
  session: TradingSession | '';
  setupQuality: string;
  stopLossPrice: string;
  takeProfitPrice: string;
  timeframe: string;
};

type OrderDraft = {
  entryOrderType: EntryOrderType | '';
  intendedEntryPrice: string;
  isBulletproof: boolean | null;
  managementOption: ManagementOption | '';
  orderExpiryAt: string;
  orderPlacedAt: string;
  orderTriggered: boolean | null;
  rrToLastSwing: string;
  rrToNextSr: string;
  slippagePips: string;
};

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

const emptyPsychDraft: PsychDraft = {
  convictionLevel: '',
  emotionalState: '',
  energyLevel: '',
  entryTiming: '',
  exitTiming: '',
  focusLevel: '',
  followedPlan: null,
  htfBias: '',
  htfTimeframe: '',
  lesson: '',
  marketCondition: '',
  movedStopLoss: null,
  movedTakeProfit: null,
  plannedRr: '',
  positionSizeAdherence: '',
  session: '',
  setupQuality: '',
  stopLossPrice: '',
  takeProfitPrice: '',
  timeframe: ''
};

const emptyOrderDraft: OrderDraft = {
  entryOrderType: '',
  intendedEntryPrice: '',
  isBulletproof: null,
  managementOption: '',
  orderExpiryAt: '',
  orderPlacedAt: '',
  orderTriggered: null,
  rrToLastSwing: '',
  rrToNextSr: '',
  slippagePips: ''
};

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
  const params = useLocalSearchParams<{
    checklistId?: string;
    direction?: string;
    entryPrice?: string;
    notes?: string;
    plannedRr?: string;
    rrToLastSwing?: string;
    rrToNextSr?: string;
    size?: string;
    strategyId?: string;
    symbol?: string;
  }>();
  const [draft, setDraft] = useState<TradeDraft>(() => createInitialDraft(params));
  const [psychDraft, setPsychDraft] = useState<PsychDraft>(() => createInitialPsychDraft(params));
  const [orderDraft, setOrderDraft] = useState<OrderDraft>(() => createInitialOrderDraft(params));
  const [isPsychExpanded, setIsPsychExpanded] = useState(false);
  const [isOrderExpanded, setIsOrderExpanded] = useState(Boolean(params.checklistId));
  const checklistId = typeof params.checklistId === 'string' ? params.checklistId : null;
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
          setSubmitError(userMessage(error, "Couldn't load trading accounts"));
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
          setStrategyError(userMessage(error, "Couldn't load strategies"));
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
      setStrategyError(userMessage(error, "Couldn't create the strategy"));
    } finally {
      setIsCreatingStrategy(false);
    }
  }

  function updatePsychField<Key extends keyof PsychDraft>(key: Key, value: PsychDraft[Key]) {
    setPsychDraft((current) => ({ ...current, [key]: value }));
  }

  function updateOrderField<Key extends keyof OrderDraft>(key: Key, value: OrderDraft[Key]) {
    setOrderDraft((current) => ({ ...current, [key]: value }));
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
        checklistId,
        closedAt: draft.closedAt ? toDateTime(draft.closedAt) : null,
        direction: draft.direction,
        entryOrderType: orderDraft.entryOrderType || null,
        entryPrice: Number(draft.entryPrice),
        exitPrice: draft.exitPrice ? Number(draft.exitPrice) : null,
        fees: Number(draft.fees || '0'),
        htfTimeframe: psychDraft.htfTimeframe || null,
        intendedEntryPrice: orderDraft.intendedEntryPrice ? Number(orderDraft.intendedEntryPrice) : null,
        isBulletproof: orderDraft.isBulletproof,
        managementOption: orderDraft.managementOption || null,
        notes: draft.notes,
        openedAt: toDateTime(draft.openedAt),
        orderExpiryAt: orderDraft.orderExpiryAt ? toDateTime(orderDraft.orderExpiryAt) : null,
        orderPlacedAt: orderDraft.orderPlacedAt ? toDateTime(orderDraft.orderPlacedAt) : null,
        orderTriggered: orderDraft.orderTriggered,
        plannedRr: psychDraft.plannedRr ? Number(psychDraft.plannedRr) : null,
        psychology: buildPsychInput(psychDraft),
        quantity: Number(draft.size),
        rrToLastSwing: orderDraft.rrToLastSwing ? Number(orderDraft.rrToLastSwing) : null,
        rrToNextSr: orderDraft.rrToNextSr ? Number(orderDraft.rrToNextSr) : null,
        slippagePips: orderDraft.slippagePips ? Number(orderDraft.slippagePips) : null,
        stopLossPrice: psychDraft.stopLossPrice ? Number(psychDraft.stopLossPrice) : null,
        strategyId: draft.strategyId,
        symbol: draft.symbol,
        tags: buildTagInputs(draft),
        takeProfitPrice: psychDraft.takeProfitPrice ? Number(psychDraft.takeProfitPrice) : null,
        timeframe: psychDraft.timeframe || null
      });

      // If this trade was spawned from a checklist, link them bidirectionally
      if (checklistId) {
        try {
          await linkChecklistToTrade(checklistId, savedTrade.id);
        } catch {
          // Non-fatal — the trade is saved, the link just didn't update
        }
      }

      router.replace(`/trades/${savedTrade.id}` as Href);
    } catch (error) {
      setSubmitError(userMessage(error, "Couldn't save the trade"));
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
            eyebrow={checklistId ? 'From checklist' : 'New entry'}
            subtitle={
              checklistId
                ? 'Pre-filled from your daily checklist. Verify execution prices, then save to place the pending order.'
                : 'Capture execution, context, and emotional state without clutter.'
            }
            title={checklistId ? `Place pending order${draft.symbol ? ` — ${draft.symbol}` : ''}` : 'Add trade'}
          />
          <SecondaryLinkButton href={TRADES_ROUTE}>Saved trades</SecondaryLinkButton>
        </View>

        {checklistId ? (
          <Card style={{ borderLeftWidth: 3, borderLeftColor: theme.accent }}>
            <Text style={[styles.sectionTitle, { color: theme.accent }]}>✓ Checklist verified</Text>
            <Text style={[styles.checklistBannerText, { color: theme.muted }]}>
              Symbol, direction, strategy, R:R targets, and pending order setup were pre-filled from your saved
              checklist. Adjust the actual entry/SL/TP prices to match your broker before saving.
            </Text>
          </Card>
        ) : null}

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

            <PsychologySection
              draft={psychDraft}
              isClosed={!!(draft.closedAt && draft.exitPrice)}
              isExpanded={isPsychExpanded}
              onToggle={() => setIsPsychExpanded((v) => !v)}
              onUpdate={updatePsychField}
            />

            <OrderManagementSection
              draft={orderDraft}
              isExpanded={isOrderExpanded}
              onToggle={() => setIsOrderExpanded((v) => !v)}
              onUpdate={updateOrderField}
            />

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

function createInitialDraft(params: {
  direction?: string | string[];
  entryPrice?: string | string[];
  notes?: string | string[];
  size?: string | string[];
  strategyId?: string | string[];
  symbol?: string | string[];
}): TradeDraft {
  const directionParam = getParamValue(params.direction);
  const direction: Direction = directionParam === 'short' ? 'short' : 'long';

  return {
    accountId: '',
    closedAt: '',
    customTags: '',
    direction,
    emotionTag: '',
    entryPrice: getParamValue(params.entryPrice),
    exitPrice: '',
    fees: '0',
    mistakeTag: '',
    notes: getParamValue(params.notes),
    openedAt: new Date().toISOString().slice(0, 10),
    setupTag: '',
    size: getParamValue(params.size),
    strategyId: getParamValue(params.strategyId),
    symbol: getParamValue(params.symbol)
  };
}

function createInitialPsychDraft(params: { plannedRr?: string | string[] }): PsychDraft {
  return {
    ...emptyPsychDraft,
    plannedRr: getParamValue(params.plannedRr)
  };
}

function createInitialOrderDraft(params: {
  checklistId?: string | string[];
  direction?: string | string[];
  entryPrice?: string | string[];
  rrToLastSwing?: string | string[];
  rrToNextSr?: string | string[];
}): OrderDraft {
  const directionParam = getParamValue(params.direction);
  const orderType =
    directionParam === 'short' ? 'pending_sell_stop' : directionParam === 'long' ? 'pending_buy_stop' : '';

  const today = new Date();
  const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);

  return {
    ...emptyOrderDraft,
    entryOrderType: orderType,
    intendedEntryPrice: getParamValue(params.entryPrice),
    orderExpiryAt: directionParam ? tomorrow.toISOString().slice(0, 10) : '',
    orderPlacedAt: directionParam ? today.toISOString().slice(0, 10) : '',
    rrToLastSwing: getParamValue(params.rrToLastSwing),
    rrToNextSr: getParamValue(params.rrToNextSr)
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

function buildPsychInput(p: PsychDraft): TradePsychologyInput {
  return {
    convictionLevel: p.convictionLevel ? Number(p.convictionLevel) : undefined,
    emotionalState: p.emotionalState || undefined,
    energyLevel: p.energyLevel ? Number(p.energyLevel) : undefined,
    entryTiming: p.entryTiming || undefined,
    exitTiming: p.exitTiming || undefined,
    focusLevel: p.focusLevel ? Number(p.focusLevel) : undefined,
    followedPlan: p.followedPlan ?? undefined,
    htfBias: p.htfBias || undefined,
    lesson: p.lesson || undefined,
    marketCondition: p.marketCondition || undefined,
    movedStopLoss: p.movedStopLoss ?? undefined,
    movedTakeProfit: p.movedTakeProfit ?? undefined,
    positionSizeAdherence: p.positionSizeAdherence || undefined,
    session: p.session || undefined,
    setupQuality: p.setupQuality ? Number(p.setupQuality) : undefined
  };
}

function countPsychFields(p: PsychDraft): number {
  return [
    p.setupQuality, p.convictionLevel, p.energyLevel, p.focusLevel,
    p.emotionalState, p.session, p.marketCondition, p.htfBias,
    p.timeframe, p.htfTimeframe, p.plannedRr, p.stopLossPrice, p.takeProfitPrice,
    p.followedPlan !== null ? 'y' : '', p.entryTiming, p.exitTiming,
    p.movedStopLoss !== null ? 'y' : '', p.movedTakeProfit !== null ? 'y' : '',
    p.positionSizeAdherence, p.lesson
  ].filter(Boolean).length;
}

function PsychologySection({
  draft,
  isClosed,
  isExpanded,
  onToggle,
  onUpdate
}: {
  draft: PsychDraft;
  isClosed: boolean;
  isExpanded: boolean;
  onToggle: () => void;
  onUpdate: <K extends keyof PsychDraft>(key: K, value: PsychDraft[K]) => void;
}) {
  const theme = useAppTheme();
  const filled = countPsychFields(draft);
  const total = 20;

  return (
    <View style={styles.formSection}>
      <Pressable onPress={onToggle} style={styles.sectionHeaderRow}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>
          How did you trade?{filled > 0 ? ` (${filled}/${total} filled)` : ''}
        </Text>
        <Text style={[styles.inlineActionText, { color: theme.muted }]}>{isExpanded ? '▲' : '▼'}</Text>
      </Pressable>

      {isExpanded ? (
        <View style={styles.psychFields}>
          <Text style={[styles.psychSubhead, { color: theme.muted }]}>Pre-trade</Text>

          <ChipSelector
            label="Setup quality"
            onSelect={(v) => onUpdate('setupQuality', v as string)}
            options={['1', '2', '3', '4', '5']}
            selected={draft.setupQuality}
          />
          <ChipSelector
            label="Conviction (1–10)"
            onSelect={(v) => onUpdate('convictionLevel', v as string)}
            options={['1','2','3','4','5','6','7','8','9','10']}
            selected={draft.convictionLevel}
          />
          <ChipSelector
            label="Energy (1–5)"
            onSelect={(v) => onUpdate('energyLevel', v as string)}
            options={['1', '2', '3', '4', '5']}
            selected={draft.energyLevel}
          />
          <ChipSelector
            label="Focus (1–5)"
            onSelect={(v) => onUpdate('focusLevel', v as string)}
            options={['1', '2', '3', '4', '5']}
            selected={draft.focusLevel}
          />
          <ChipSelector
            label="Emotional state"
            onSelect={(v) => onUpdate('emotionalState', v as EmotionalState)}
            options={['neutral','confident','anxious','frustrated','fearful','euphoric','bored','impatient','revenge']}
            selected={draft.emotionalState}
          />
          <ChipSelector
            label="Session"
            onSelect={(v) => onUpdate('session', v as TradingSession)}
            options={['london','new_york','asian','sydney','overlap_london_ny']}
            labels={{ asian: 'Asian', london: 'London', new_york: 'New York', overlap_london_ny: 'LN/NY Overlap', sydney: 'Sydney' }}
            selected={draft.session}
          />
          <ChipSelector
            label="Market condition"
            onSelect={(v) => onUpdate('marketCondition', v as MarketCondition)}
            options={['trending_up','trending_down','ranging','choppy','breakout','reversal','news_driven','low_volatility']}
            labels={{ breakout: 'Breakout', choppy: 'Choppy', low_volatility: 'Low Vol', news_driven: 'News', ranging: 'Ranging', reversal: 'Reversal', trending_down: 'Trending ↓', trending_up: 'Trending ↑' }}
            selected={draft.marketCondition}
          />
          <ChipSelector
            label="HTF bias"
            onSelect={(v) => onUpdate('htfBias', v as HtfBias)}
            options={['bullish','bearish','neutral','no_bias']}
            labels={{ bearish: 'Bearish', bullish: 'Bullish', neutral: 'Neutral', no_bias: 'No bias' }}
            selected={draft.htfBias}
          />
          <View style={styles.fieldRow}>
            <TextField label="Timeframe" onChangeText={(v) => onUpdate('timeframe', v)} placeholder="H1" value={draft.timeframe} />
            <TextField label="HTF timeframe" onChangeText={(v) => onUpdate('htfTimeframe', v)} placeholder="H4" value={draft.htfTimeframe} />
          </View>
          <View style={styles.fieldRow}>
            <TextField label="Planned R:R" inputMode="decimal" onChangeText={(v) => onUpdate('plannedRr', v)} placeholder="2.0" value={draft.plannedRr} />
            <TextField label="Stop loss price" inputMode="decimal" onChangeText={(v) => onUpdate('stopLossPrice', v)} placeholder="Optional" value={draft.stopLossPrice} />
          </View>
          <TextField label="Take profit price" inputMode="decimal" onChangeText={(v) => onUpdate('takeProfitPrice', v)} placeholder="Optional" value={draft.takeProfitPrice} />

          {isClosed ? (
            <>
              <Text style={[styles.psychSubhead, { color: theme.muted }]}>Execution (for closed trades)</Text>
              <YesNoToggle label="Followed plan?" onSelect={(v) => onUpdate('followedPlan', v)} selected={draft.followedPlan} />
              <ChipSelector
                label="Entry timing"
                onSelect={(v) => onUpdate('entryTiming', v as EntryTiming)}
                options={['early','on_time','late','missed_better']}
                labels={{ early: 'Early', late: 'Late', missed_better: 'Missed better', on_time: 'On time' }}
                selected={draft.entryTiming}
              />
              <ChipSelector
                label="Exit timing"
                onSelect={(v) => onUpdate('exitTiming', v as ExitTiming)}
                options={['early','on_time','late','stopped_out']}
                labels={{ early: 'Early', late: 'Late', on_time: 'On time', stopped_out: 'Stopped out' }}
                selected={draft.exitTiming}
              />
              <YesNoToggle label="Moved stop loss?" onSelect={(v) => onUpdate('movedStopLoss', v)} selected={draft.movedStopLoss} />
              <YesNoToggle label="Moved take profit?" onSelect={(v) => onUpdate('movedTakeProfit', v)} selected={draft.movedTakeProfit} />
              <ChipSelector
                label="Position size"
                onSelect={(v) => onUpdate('positionSizeAdherence', v as PositionSizeAdherence)}
                options={['undersized','correct','oversized']}
                labels={{ correct: 'Correct', oversized: 'Oversized', undersized: 'Undersized' }}
                selected={draft.positionSizeAdherence}
              />
              <TextField label="Lesson" multiline onChangeText={(v) => onUpdate('lesson', v)} placeholder="What did this trade teach you?" value={draft.lesson} />
            </>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

function countOrderFields(o: OrderDraft): number {
  return [
    o.entryOrderType,
    o.intendedEntryPrice,
    o.managementOption,
    o.orderPlacedAt,
    o.orderExpiryAt,
    o.orderTriggered !== null ? 'y' : '',
    o.isBulletproof !== null ? 'y' : '',
    o.rrToLastSwing,
    o.rrToNextSr,
    o.slippagePips
  ].filter(Boolean).length;
}

function OrderManagementSection({
  draft,
  isExpanded,
  onToggle,
  onUpdate
}: {
  draft: OrderDraft;
  isExpanded: boolean;
  onToggle: () => void;
  onUpdate: <K extends keyof OrderDraft>(key: K, value: OrderDraft[K]) => void;
}) {
  const theme = useAppTheme();
  const filled = countOrderFields(draft);
  const total = 10;

  return (
    <View style={styles.formSection}>
      <Pressable onPress={onToggle} style={styles.sectionHeaderRow}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>
          Order management{filled > 0 ? ` (${filled}/${total} filled)` : ''}
        </Text>
        <Text style={[styles.inlineActionText, { color: theme.muted }]}>{isExpanded ? '▲' : '▼'}</Text>
      </Pressable>

      {isExpanded ? (
        <View style={styles.psychFields}>
          <Text style={[styles.psychSubhead, { color: theme.muted }]}>Order placement</Text>

          <ChipSelector
            label="Entry order type"
            labels={{ market: 'Market', pending_buy_stop: 'Buy Stop', pending_sell_stop: 'Sell Stop' }}
            onSelect={(v) => onUpdate('entryOrderType', v as EntryOrderType | '')}
            options={['pending_buy_stop', 'pending_sell_stop', 'market']}
            selected={draft.entryOrderType}
          />
          <View style={styles.fieldRow}>
            <TextField
              inputMode="decimal"
              label="Intended entry price"
              onChangeText={(v) => onUpdate('intendedEntryPrice', v)}
              placeholder="1.2650"
              value={draft.intendedEntryPrice}
            />
            <TextField
              inputMode="decimal"
              label="Slippage (pips)"
              onChangeText={(v) => onUpdate('slippagePips', v)}
              placeholder="0.3"
              value={draft.slippagePips}
            />
          </View>
          <View style={styles.fieldRow}>
            <TextField
              label="Order placed"
              onChangeText={(v) => onUpdate('orderPlacedAt', v)}
              placeholder="2026-05-27"
              value={draft.orderPlacedAt}
            />
            <TextField
              label="Order expiry"
              onChangeText={(v) => onUpdate('orderExpiryAt', v)}
              placeholder="2026-05-28"
              value={draft.orderExpiryAt}
            />
          </View>
          <YesNoToggle
            label="Order triggered?"
            onSelect={(v) => onUpdate('orderTriggered', v)}
            selected={draft.orderTriggered}
          />

          <Text style={[styles.psychSubhead, { color: theme.muted }]}>Trade management</Text>

          <ChipSelector
            label="Management option"
            labels={{ advanced: 'Advanced', basic: 'Basic', intermediate: 'Intermediate' }}
            onSelect={(v) => onUpdate('managementOption', v as ManagementOption | '')}
            options={['basic', 'intermediate', 'advanced']}
            selected={draft.managementOption}
          />
          <YesNoToggle
            label="Bulletproof (SL at breakeven+)?"
            onSelect={(v) => onUpdate('isBulletproof', v)}
            selected={draft.isBulletproof}
          />

          <Text style={[styles.psychSubhead, { color: theme.muted }]}>R:R targets</Text>

          <View style={styles.fieldRow}>
            <TextField
              inputMode="decimal"
              label="R:R to last swing"
              onChangeText={(v) => onUpdate('rrToLastSwing', v)}
              placeholder="1.5"
              value={draft.rrToLastSwing}
            />
            <TextField
              inputMode="decimal"
              label="R:R to next S/R"
              onChangeText={(v) => onUpdate('rrToNextSr', v)}
              placeholder="2.0"
              value={draft.rrToNextSr}
            />
          </View>
        </View>
      ) : null}
    </View>
  );
}

function ChipSelector({
  label,
  labels = {},
  onSelect,
  options,
  selected
}: {
  label: string;
  labels?: Record<string, string>;
  onSelect: (value: string) => void;
  options: string[];
  selected: string;
}) {
  const theme = useAppTheme();

  return (
    <View style={styles.chipField}>
      <Text style={[styles.fieldLabel, { color: theme.muted }]}>{label}</Text>
      <View style={styles.chipRow}>
        {options.map((opt) => {
          const isSelected = selected === opt;
          return (
            <Pressable
              key={opt}
              onPress={() => onSelect(isSelected ? '' : opt)}
              style={[
                styles.chip,
                {
                  backgroundColor: isSelected ? theme.accent : theme.mutedSurface,
                  borderColor: isSelected ? theme.accent : theme.border
                }
              ]}
            >
              <Text style={[styles.chipText, { color: isSelected ? '#FFFFFF' : theme.muted }]}>
                {labels[opt] ?? opt.replace(/_/g, ' ')}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function YesNoToggle({
  label,
  onSelect,
  selected
}: {
  label: string;
  onSelect: (value: boolean | null) => void;
  selected: boolean | null;
}) {
  const theme = useAppTheme();

  return (
    <View style={styles.chipField}>
      <Text style={[styles.fieldLabel, { color: theme.muted }]}>{label}</Text>
      <View style={styles.chipRow}>
        {([true, false] as const).map((val) => {
          const isSelected = selected === val;
          const labelText = val ? 'Yes' : 'No';
          return (
            <Pressable
              key={String(val)}
              onPress={() => onSelect(isSelected ? null : val)}
              style={[
                styles.chip,
                {
                  backgroundColor: isSelected ? theme.accent : theme.mutedSurface,
                  borderColor: isSelected ? theme.accent : theme.border
                }
              ]}
            >
              <Text style={[styles.chipText, { color: isSelected ? '#FFFFFF' : theme.muted }]}>{labelText}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
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
    minWidth: 260,
    flex: 2
  },
  previewCard: {
    minWidth: 240,
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
  },
  psychFields: {
    gap: 14
  },
  psychSubhead: {
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: 4
  },
  chipField: {
    gap: 7
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7
  },
  chip: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 7
  },
  chipText: {
    fontSize: 13,
    fontWeight: '800'
  },
  checklistBannerText: {
    fontSize: 13,
    lineHeight: 19,
    marginTop: 4
  }
});
