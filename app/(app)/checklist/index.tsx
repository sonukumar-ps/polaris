import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from 'react-native';

import {
  AppShell,
  Card,
  LoadingState,
  PrimaryButton,
  SectionHeading,
  TextField,
  useAppTheme
} from '@/lib/ui';
import {
  listChecklistsByDate,
  listStrategies,
  upsertChecklist
} from '@/lib/trades';
import { seedDemoChecklists } from '@/lib/trades/checklists/seed-demo';
import type {
  ChecklistDecision,
  DecelerationEvidence,
  MarketPhase,
  SrType,
  StrategyChecklistInput,
  StrategyChecklistRow,
  StrategyType,
  TradingStrategy
} from '@/lib/trades';
import { MAJOR_PAIRS } from '@/lib/trades/checklists/checklist.types';

type ChecklistDraft = {
  candlestickPattern: string;
  correlationPairs: string;
  decelerationEvidence: DecelerationEvidence | '';
  decelerationPass: boolean | null;
  decision: ChecklistDecision | '';
  decisionReason: string;
  direction: 'long' | 'short' | '';
  ema50PositionPass: boolean | null;
  emaZoneVisitedPass: boolean | null;
  emotionalRating: string;
  indicatorSignal: string;
  marketConditionNote: string;
  marketConditionPass: boolean | null;
  marketPhase: MarketPhase | '';
  marketPhasePass: boolean | null;
  mtfConfirmation: string;
  newsCheckClear: boolean | null;
  reversalPattern: string;
  reversalSrPass: boolean | null;
  rrOnTrade: string;
  rrToLastSwing: string;
  rrToNextSr: string;
  srReactionPass: boolean | null;
  srTouchCount: string;
  srTypes: SrType[];
  totalSrTouches: string;
};

const emptyDraft: ChecklistDraft = {
  candlestickPattern: '',
  correlationPairs: '',
  decelerationEvidence: '',
  decelerationPass: null,
  decision: '',
  decisionReason: '',
  direction: '',
  ema50PositionPass: null,
  emaZoneVisitedPass: null,
  emotionalRating: '',
  indicatorSignal: '',
  marketConditionNote: '',
  marketConditionPass: null,
  marketPhasePass: null,
  marketPhase: '',
  mtfConfirmation: '',
  newsCheckClear: null,
  reversalPattern: '',
  reversalSrPass: null,
  rrOnTrade: '',
  rrToLastSwing: '',
  rrToNextSr: '',
  srReactionPass: null,
  srTouchCount: '',
  srTypes: [],
  totalSrTouches: ''
};

type DropdownOption = { label: string; meta?: string; value: string };

export default function ChecklistScreen() {
  const theme = useAppTheme();
  const [checklistDate, setChecklistDate] = useState(
    () => new Date().toISOString().slice(0, 10)
  );
  const [strategyType, setStrategyType] = useState<StrategyType>('trend');
  const [selectedStrategyId, setSelectedStrategyId] = useState('');
  const [symbol, setSymbol] = useState('');
  const [draft, setDraft] = useState<ChecklistDraft>(emptyDraft);

  const [strategies, setStrategies] = useState<TradingStrategy[]>([]);
  const [todaysChecklists, setTodaysChecklists] = useState<StrategyChecklistRow[]>([]);
  const [isLoadingStrategies, setIsLoadingStrategies] = useState(true);
  const [isLoadingChecklists, setIsLoadingChecklists] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [openDropdown, setOpenDropdown] = useState<'strategy' | 'symbol' | null>(null);
  const [isSeeding, setIsSeeding] = useState(false);

  // Collapsible section states
  const [isCriticalOpen, setIsCriticalOpen] = useState(true);
  const [isStrategyColsOpen, setIsStrategyColsOpen] = useState(true);
  const [isPreferredOpen, setIsPreferredOpen] = useState(false);
  const [isQualitativeOpen, setIsQualitativeOpen] = useState(false);
  const [isDecisionOpen, setIsDecisionOpen] = useState(false);

  const selectedStrategy = strategies.find((s) => s.id === selectedStrategyId) ?? null;
  const strategyOptions = useMemo(
    () => strategies.map((s) => ({ label: s.name, meta: s.description ?? undefined, value: s.id })),
    [strategies]
  );
  const pairOptions = useMemo(
    () => MAJOR_PAIRS.map((p) => ({ label: p, value: p })),
    []
  );

  // Derived: how many pairs qualify today
  const qualifiedCount = todaysChecklists.filter(
    (c) =>
      c.decision === 'trade' &&
      c.market_condition_pass === true &&
      c.market_phase_pass === true &&
      c.sr_reaction_pass === true &&
      c.deceleration_pass === true
  ).length;

  // Load strategies once
  useEffect(() => {
    let isActive = true;
    async function load() {
      setIsLoadingStrategies(true);
      try {
        const loaded = await listStrategies();
        if (isActive) {
          setStrategies(loaded);
          if (loaded.length > 0 && !selectedStrategyId) {
            setSelectedStrategyId(loaded[0].id);
          }
        }
      } catch {
        // silent
      } finally {
        if (isActive) setIsLoadingStrategies(false);
      }
    }
    void load();
    return () => { isActive = false; };
  }, []);

  // Load today's checklists when date or strategy changes
  useEffect(() => {
    if (!checklistDate || !selectedStrategyId) return;
    let isActive = true;
    async function load() {
      setIsLoadingChecklists(true);
      try {
        const loaded = await listChecklistsByDate(checklistDate, {
          strategyId: selectedStrategyId
        });
        if (isActive) setTodaysChecklists(loaded);
      } catch {
        // silent
      } finally {
        if (isActive) setIsLoadingChecklists(false);
      }
    }
    void load();
    return () => { isActive = false; };
  }, [checklistDate, selectedStrategyId]);

  // Auto-load existing checklist when symbol changes
  useEffect(() => {
    if (!symbol || !selectedStrategyId || !checklistDate) return;
    const existing = todaysChecklists.find(
      (c) => c.symbol === symbol.toUpperCase() && c.strategy_id === selectedStrategyId
    );
    if (existing) {
      setDraft(rowToDraft(existing));
      setStrategyType(existing.strategy_type as StrategyType);
    } else {
      setDraft(emptyDraft);
    }
  }, [symbol, selectedStrategyId, todaysChecklists]);

  function updateDraft<K extends keyof ChecklistDraft>(key: K, value: ChecklistDraft[K]) {
    setDraft((prev) => ({ ...prev, [key]: value }));
    setSubmitError(null);
  }

  function toggleSrType(type: SrType) {
    setDraft((prev) => ({
      ...prev,
      srTypes: prev.srTypes.includes(type)
        ? prev.srTypes.filter((t) => t !== type)
        : [...prev.srTypes, type]
    }));
  }

  async function handleSave() {
    if (!selectedStrategyId) {
      setSubmitError('Select a strategy first.');
      return;
    }
    if (!symbol.trim()) {
      setSubmitError('Enter a symbol.');
      return;
    }

    setIsSaving(true);
    setSubmitError(null);

    try {
      const input: StrategyChecklistInput = {
        candlestickPattern: draft.candlestickPattern || undefined,
        checklistDate,
        correlationPairs: draft.correlationPairs
          ? draft.correlationPairs.split(',').map((s) => s.trim()).filter(Boolean)
          : undefined,
        decelerationEvidence: draft.decelerationEvidence || undefined,
        decelerationPass: draft.decelerationPass,
        decision: draft.decision || undefined,
        decisionReason: draft.decisionReason || undefined,
        direction: draft.direction || undefined,
        ema50PositionPass: draft.ema50PositionPass,
        emaZoneVisitedPass: draft.emaZoneVisitedPass,
        emotionalRating: draft.emotionalRating ? Number(draft.emotionalRating) : undefined,
        indicatorSignal: draft.indicatorSignal || undefined,
        marketConditionNote: draft.marketConditionNote || undefined,
        marketConditionPass: draft.marketConditionPass,
        marketPhase: draft.marketPhase || undefined,
        marketPhasePass: draft.marketPhasePass,
        mtfConfirmation: draft.mtfConfirmation || undefined,
        newsCheckClear: draft.newsCheckClear,
        reversalPattern: draft.reversalPattern || undefined,
        reversalSrPass: draft.reversalSrPass,
        rrOnTrade: draft.rrOnTrade ? Number(draft.rrOnTrade) : undefined,
        rrToLastSwing: draft.rrToLastSwing ? Number(draft.rrToLastSwing) : undefined,
        rrToNextSr: draft.rrToNextSr ? Number(draft.rrToNextSr) : undefined,
        srReactionPass: draft.srReactionPass,
        srTouchCount: draft.srTouchCount ? Number(draft.srTouchCount) : undefined,
        srTypes: draft.srTypes.length > 0 ? draft.srTypes : undefined,
        strategyId: selectedStrategyId,
        strategyType,
        symbol: symbol.toUpperCase(),
        totalSrTouches: draft.totalSrTouches ? Number(draft.totalSrTouches) : undefined
      };

      await upsertChecklist(input);

      // Refresh today's list
      const refreshed = await listChecklistsByDate(checklistDate, {
        strategyId: selectedStrategyId
      });
      setTodaysChecklists(refreshed);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Could not save checklist.');
    } finally {
      setIsSaving(false);
    }
  }

  const criticalPasses = [
    draft.marketConditionPass,
    draft.marketPhasePass,
    draft.srReactionPass,
    draft.decelerationPass
  ];
  const criticalFilledCount = criticalPasses.filter((v) => v !== null).length;

  const strategyPasses = strategyType === 'trend'
    ? [draft.ema50PositionPass, draft.emaZoneVisitedPass]
    : [draft.reversalSrPass];
  const strategyFilledCount = strategyPasses.filter((v) => v !== null).length;

  return (
    <AppShell activeRoute="checklist">
      <SectionHeading
        eyebrow="Daily prep"
        subtitle="Work through Jason's checklist for each pair before making trade decisions."
        title="Strategy checklist"
      />

      <View style={styles.layout}>
        <Card style={styles.formCard}>
          {/* Date + Strategy + Symbol header */}
          <View style={styles.formSection}>
            <View style={styles.fieldRow}>
              <TextField
                label="Date"
                onChangeText={setChecklistDate}
                placeholder="2026-05-27"
                value={checklistDate}
              />
              <View style={{ flex: 1 }}>
                {isLoadingStrategies ? (
                  <LoadingPill label="Loading strategies..." />
                ) : (
                  <DropdownField
                    label="Strategy"
                    onOpen={() => setOpenDropdown('strategy')}
                    placeholder="Select strategy"
                    value={selectedStrategy?.name ?? ''}
                  />
                )}
              </View>
            </View>

            <View style={styles.fieldRow}>
              <View style={{ flex: 1 }}>
                <DropdownField
                  label="Symbol"
                  onOpen={() => setOpenDropdown('symbol')}
                  placeholder="EURUSD"
                  value={symbol}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.fieldLabel, { color: theme.muted }]}>Direction</Text>
                <View style={styles.segmentedControl}>
                  {(['long', 'short'] as const).map((dir) => {
                    const isSelected = draft.direction === dir;
                    return (
                      <Pressable
                        key={dir}
                        onPress={() => updateDraft('direction', isSelected ? '' : dir)}
                        style={[
                          styles.segment,
                          {
                            backgroundColor: isSelected ? theme.accent : theme.mutedSurface,
                            borderColor: isSelected ? theme.accent : theme.border
                          }
                        ]}
                      >
                        <Text style={[styles.segmentText, { color: isSelected ? '#FFFFFF' : theme.muted }]}>
                          {dir.toUpperCase()}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            </View>

            {/* Strategy type toggle */}
            <View>
              <Text style={[styles.fieldLabel, { color: theme.muted }]}>Strategy type</Text>
              <View style={styles.segmentedControl}>
                {(['trend', 'reversal'] as const).map((t) => {
                  const isSelected = strategyType === t;
                  return (
                    <Pressable
                      key={t}
                      onPress={() => setStrategyType(t)}
                      style={[
                        styles.segment,
                        {
                          backgroundColor: isSelected ? theme.accent : theme.mutedSurface,
                          borderColor: isSelected ? theme.accent : theme.border
                        }
                      ]}
                    >
                      <Text style={[styles.segmentText, { color: isSelected ? '#FFFFFF' : theme.muted }]}>
                        {t.charAt(0).toUpperCase() + t.slice(1)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </View>

          {/* Critical Columns */}
          <CollapsibleSection
            count={`${criticalFilledCount}/4`}
            isOpen={isCriticalOpen}
            onToggle={() => setIsCriticalOpen((v) => !v)}
            title="Critical columns"
          >
            <TickCrossField
              label="Market condition — oscillating with 3 identifiable swings?"
              onSelect={(v) => updateDraft('marketConditionPass', v)}
              value={draft.marketConditionPass}
            />
            <TextField
              label="Market condition notes"
              onChangeText={(v) => updateDraft('marketConditionNote', v)}
              placeholder="e.g. Clear HH/HL structure"
              value={draft.marketConditionNote}
            />

            <ChipSelector
              label="Market phase"
              labels={{ consolidation: 'Consolidation', impulse: 'Impulse', pullback: 'Pullback' }}
              onSelect={(v) => updateDraft('marketPhase', v as MarketPhase | '')}
              options={['pullback', 'impulse', 'consolidation']}
              selected={draft.marketPhase}
            />
            <TickCrossField
              label="Market phase — pullback relative to trade direction?"
              onSelect={(v) => updateDraft('marketPhasePass', v)}
              value={draft.marketPhasePass}
            />

            <TickCrossField
              label="S/R reaction — 3+ previous touches?"
              onSelect={(v) => updateDraft('srReactionPass', v)}
              value={draft.srReactionPass}
            />
            <TextField
              inputMode="decimal"
              label="S/R touch count"
              onChangeText={(v) => updateDraft('srTouchCount', v)}
              placeholder="3"
              value={draft.srTouchCount}
            />
            <View>
              <Text style={[styles.fieldLabel, { color: theme.muted }]}>S/R types</Text>
              <View style={styles.chipRow}>
                {([
                  { key: 'horizontal' as SrType, label: 'Horizontal' },
                  { key: 'angular_trendline' as SrType, label: 'Trendline' },
                  { key: 'dynamic_ema' as SrType, label: 'Dynamic EMA' }
                ]).map(({ key, label }) => {
                  const isSelected = draft.srTypes.includes(key);
                  return (
                    <Pressable
                      key={key}
                      onPress={() => toggleSrType(key)}
                      style={[
                        styles.chip,
                        {
                          backgroundColor: isSelected ? theme.accent : theme.mutedSurface,
                          borderColor: isSelected ? theme.accent : theme.border
                        }
                      ]}
                    >
                      <Text style={[styles.chipText, { color: isSelected ? '#FFFFFF' : theme.muted }]}>
                        {label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <TickCrossField
              label="Market deceleration — smaller candles / reversal pattern?"
              onSelect={(v) => updateDraft('decelerationPass', v)}
              value={draft.decelerationPass}
            />
            <ChipSelector
              label="Deceleration evidence"
              labels={{
                doji: 'Doji',
                engulfing: 'Engulfing',
                hlt: 'High/Low Test',
                inside_bar: 'Inside Bar',
                small_candles: 'Small Candles',
                tweezer: 'Tweezer'
              }}
              onSelect={(v) => updateDraft('decelerationEvidence', v as DecelerationEvidence | '')}
              options={['small_candles', 'doji', 'tweezer', 'inside_bar', 'hlt', 'engulfing']}
              selected={draft.decelerationEvidence}
            />
          </CollapsibleSection>

          {/* Strategy-Specific Columns */}
          <CollapsibleSection
            count={`${strategyFilledCount}/${strategyPasses.length}`}
            isOpen={isStrategyColsOpen}
            onToggle={() => setIsStrategyColsOpen((v) => !v)}
            title={strategyType === 'trend' ? 'Trend columns' : 'Reversal columns'}
          >
            {strategyType === 'trend' ? (
              <>
                <TickCrossField
                  label="Price above/below 50 EMA for trade direction?"
                  onSelect={(v) => updateDraft('ema50PositionPass', v)}
                  value={draft.ema50PositionPass}
                />
                <TickCrossField
                  label="Price visited 20/50 EMA zone in last trading day?"
                  onSelect={(v) => updateDraft('emaZoneVisitedPass', v)}
                  value={draft.emaZoneVisitedPass}
                />
              </>
            ) : (
              <>
                <TickCrossField
                  label="At major S/R level for counter-trend entry?"
                  onSelect={(v) => updateDraft('reversalSrPass', v)}
                  value={draft.reversalSrPass}
                />
                <TextField
                  label="Reversal pattern"
                  onChangeText={(v) => updateDraft('reversalPattern', v)}
                  placeholder="e.g. Bearish engulfing at resistance"
                  value={draft.reversalPattern}
                />
              </>
            )}
          </CollapsibleSection>

          {/* Preferred Analysis */}
          <CollapsibleSection
            isOpen={isPreferredOpen}
            onToggle={() => setIsPreferredOpen((v) => !v)}
            title="Preferred analysis"
          >
            <TextField
              label="Candlestick pattern"
              onChangeText={(v) => updateDraft('candlestickPattern', v)}
              placeholder="e.g. Doji at support"
              value={draft.candlestickPattern}
            />
            <TextField
              label="Multiple timeframe confirmation"
              onChangeText={(v) => updateDraft('mtfConfirmation', v)}
              placeholder="e.g. 1H MACD aligned, weekly trend supports"
              value={draft.mtfConfirmation}
            />
            <TextField
              label="Indicator signal"
              onChangeText={(v) => updateDraft('indicatorSignal', v)}
              placeholder="e.g. RSI oversold at 28, 61.8% fib"
              value={draft.indicatorSignal}
            />
            <ChipSelector
              label="Emotional rating (0 = fearful, 5 = optimal, 10 = greedy)"
              onSelect={(v) => updateDraft('emotionalRating', v)}
              options={['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10']}
              selected={draft.emotionalRating}
            />
          </CollapsibleSection>

          {/* Qualitative Analysis */}
          <CollapsibleSection
            isOpen={isQualitativeOpen}
            onToggle={() => setIsQualitativeOpen((v) => !v)}
            title="Qualitative analysis"
          >
            <TextField
              inputMode="decimal"
              label="Total S/R touches (all types combined)"
              onChangeText={(v) => updateDraft('totalSrTouches', v)}
              placeholder="6"
              value={draft.totalSrTouches}
            />
            <View style={styles.fieldRow}>
              <TextField
                inputMode="decimal"
                label="R:R to last swing"
                onChangeText={(v) => updateDraft('rrToLastSwing', v)}
                placeholder="1.5"
                value={draft.rrToLastSwing}
              />
              <TextField
                inputMode="decimal"
                label="R:R to next S/R"
                onChangeText={(v) => updateDraft('rrToNextSr', v)}
                placeholder="2.0"
                value={draft.rrToNextSr}
              />
            </View>
            <TextField
              inputMode="decimal"
              label="R:R on the trade (with chosen stop/limit)"
              onChangeText={(v) => updateDraft('rrOnTrade', v)}
              placeholder="1.8"
              value={draft.rrOnTrade}
            />
          </CollapsibleSection>

          {/* Trade Decision */}
          <CollapsibleSection
            isOpen={isDecisionOpen}
            onToggle={() => setIsDecisionOpen((v) => !v)}
            title="Trade decision"
          >
            <ChipSelector
              label="Decision"
              labels={{ skip: 'Skip', trade: 'Trade', watch: 'Watch' }}
              onSelect={(v) => updateDraft('decision', v as ChecklistDecision | '')}
              options={['trade', 'skip', 'watch']}
              selected={draft.decision}
            />
            <TextField
              label="Reason"
              multiline
              onChangeText={(v) => updateDraft('decisionReason', v)}
              placeholder="Why this pair? Or why skip?"
              value={draft.decisionReason}
            />
            <TextField
              label="Correlated pairs"
              onChangeText={(v) => updateDraft('correlationPairs', v)}
              placeholder="GBPJPY, GBPAUD"
              value={draft.correlationPairs}
            />
            <TickCrossField
              label="No high-impact news on this pair today?"
              onSelect={(v) => updateDraft('newsCheckClear', v)}
              value={draft.newsCheckClear}
            />
          </CollapsibleSection>

          {submitError ? (
            <Text style={[styles.errorText, { color: theme.danger }]}>{submitError}</Text>
          ) : null}

          <PrimaryButton disabled={isSaving} onPress={handleSave}>
            {isSaving ? 'Saving...' : 'Save checklist'}
          </PrimaryButton>
        </Card>

        {/* Right sidebar: Today's summary */}
        <Card style={styles.sideCard}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Today</Text>
          <Text style={[styles.sideMeta, { color: theme.muted }]}>
            {checklistDate} — {todaysChecklists.length} pair{todaysChecklists.length !== 1 ? 's' : ''} checked
          </Text>

          {isLoadingChecklists ? (
            <ActivityIndicator color={theme.accent} style={{ marginTop: 12 }} />
          ) : null}

          {!isLoadingChecklists && todaysChecklists.length === 0 ? (
            <View style={{ gap: 10 }}>
              <Text style={[styles.emptyBody, { color: theme.muted }]}>
                No checklists for this date yet. Start by selecting a pair above.
              </Text>
              {selectedStrategyId ? (
                <Pressable
                  disabled={isSeeding}
                  onPress={async () => {
                    setIsSeeding(true);
                    try {
                      await seedDemoChecklists(selectedStrategyId, checklistDate);
                      const refreshed = await listChecklistsByDate(checklistDate, {
                        strategyId: selectedStrategyId
                      });
                      setTodaysChecklists(refreshed);
                    } catch {
                      // silent
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
                    {isSeeding ? 'Seeding...' : '🧪 Load demo data'}
                  </Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}

          {qualifiedCount > 0 ? (
            <View style={[styles.qualifyBanner, { backgroundColor: theme.positive + '18' }]}>
              <Text style={[styles.qualifyCount, { color: theme.positive }]}>{qualifiedCount}</Text>
              <Text style={[styles.qualifyLabel, { color: theme.positive }]}>
                pair{qualifiedCount !== 1 ? 's' : ''} qualify
              </Text>
            </View>
          ) : null}

          {todaysChecklists.map((cl) => {
            const allCritical =
              cl.market_condition_pass === true &&
              cl.market_phase_pass === true &&
              cl.sr_reaction_pass === true &&
              cl.deceleration_pass === true;
            const statusColor = cl.decision === 'trade' && allCritical
              ? theme.positive
              : cl.decision === 'skip'
                ? theme.danger
                : theme.muted;

            return (
              <Pressable
                key={cl.id}
                onPress={() => {
                  setSymbol(cl.symbol);
                  setStrategyType(cl.strategy_type as StrategyType);
                }}
                style={({ pressed }) => [
                  styles.pairRow,
                  { borderBottomColor: theme.border },
                  pressed && styles.pressed
                ]}
              >
                <Text style={[styles.pairSymbol, { color: theme.text }]}>{cl.symbol}</Text>
                <Text style={[styles.pairDirection, { color: theme.muted }]}>
                  {cl.direction?.toUpperCase() ?? '—'}
                </Text>
                <View style={[styles.pairStatus, { backgroundColor: statusColor }]}>
                  <Text style={styles.pairStatusText}>
                    {cl.decision ? cl.decision.charAt(0).toUpperCase() + cl.decision.slice(1) : '...'}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </Card>
      </View>

      {/* Modals */}
      <SelectModal
        isOpen={openDropdown === 'strategy'}
        onClose={() => setOpenDropdown(null)}
        onSelect={(id) => { setSelectedStrategyId(id); setOpenDropdown(null); }}
        options={strategyOptions}
        selectedValue={selectedStrategyId}
        title="Select strategy"
      />
      <SelectModal
        isOpen={openDropdown === 'symbol'}
        onClose={() => setOpenDropdown(null)}
        onSelect={(s) => { setSymbol(s); setOpenDropdown(null); }}
        options={pairOptions}
        selectedValue={symbol}
        title="Select pair"
      />
    </AppShell>
  );
}

/* ── Shared subcomponents ────────────────────────────────────── */

function CollapsibleSection({
  children,
  count,
  isOpen,
  onToggle,
  title
}: {
  children: React.ReactNode;
  count?: string;
  isOpen: boolean;
  onToggle: () => void;
  title: string;
}) {
  const theme = useAppTheme();

  return (
    <Card>
      <Pressable onPress={onToggle} style={styles.sectionHeaderRow}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>
          {title}{count ? ` (${count})` : ''}
        </Text>
        <Text style={[styles.chevron, { color: theme.muted }]}>{isOpen ? '▲' : '▼'}</Text>
      </Pressable>
      {isOpen ? <View style={styles.sectionBody}>{children}</View> : null}
    </Card>
  );
}

function TickCrossField({
  label,
  onSelect,
  value
}: {
  label: string;
  onSelect: (value: boolean | null) => void;
  value: boolean | null;
}) {
  const theme = useAppTheme();

  return (
    <View style={styles.tickCrossField}>
      <Text style={[styles.tickCrossLabel, { color: theme.text }]}>{label}</Text>
      <View style={styles.tickCrossRow}>
        <Pressable
          onPress={() => onSelect(value === true ? null : true)}
          style={[
            styles.tickBtn,
            {
              backgroundColor: value === true ? theme.positive : theme.mutedSurface,
              borderColor: value === true ? theme.positive : theme.border
            }
          ]}
        >
          <Text style={[styles.tickBtnText, { color: value === true ? '#FFFFFF' : theme.muted }]}>
            ✓
          </Text>
        </Pressable>
        <Pressable
          onPress={() => onSelect(value === false ? null : false)}
          style={[
            styles.tickBtn,
            {
              backgroundColor: value === false ? theme.danger : theme.mutedSurface,
              borderColor: value === false ? theme.danger : theme.border
            }
          ]}
        >
          <Text style={[styles.tickBtnText, { color: value === false ? '#FFFFFF' : theme.muted }]}>
            ✗
          </Text>
        </Pressable>
      </View>
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
                {labels[opt] ?? opt}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function DropdownField({
  label,
  onOpen,
  placeholder,
  value
}: {
  label: string;
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
        <Text style={[styles.dropdownValue, { color: value ? theme.text : theme.muted }]}>
          {value || placeholder}
        </Text>
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
                  <Text style={[styles.selectOptionText, { color: isSelected ? '#FFFFFF' : theme.text }]}>
                    {option.label}
                  </Text>
                  {option.meta ? (
                    <Text style={[styles.selectOptionMeta, { color: isSelected ? '#EAF3FF' : theme.muted }]}>
                      {option.meta}
                    </Text>
                  ) : null}
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
    <View style={[styles.loadingPill, { backgroundColor: theme.mutedSurface }]}>
      <ActivityIndicator color={theme.accent} />
      <Text style={[styles.loadingPillText, { color: theme.muted }]}>{label}</Text>
    </View>
  );
}

/* ── Helpers ──────────────────────────────────────────────────── */

function rowToDraft(row: StrategyChecklistRow): ChecklistDraft {
  return {
    candlestickPattern: row.candlestick_pattern ?? '',
    correlationPairs: row.correlation_pairs?.join(', ') ?? '',
    decelerationEvidence: (row.deceleration_evidence as DecelerationEvidence) ?? '',
    decelerationPass: row.deceleration_pass,
    decision: (row.decision as ChecklistDecision) ?? '',
    decisionReason: row.decision_reason ?? '',
    direction: (row.direction as 'long' | 'short') ?? '',
    ema50PositionPass: row.ema50_position_pass,
    emaZoneVisitedPass: row.ema_zone_visited_pass,
    emotionalRating: row.emotional_rating !== null ? String(row.emotional_rating) : '',
    indicatorSignal: row.indicator_signal ?? '',
    marketConditionNote: row.market_condition_note ?? '',
    marketConditionPass: row.market_condition_pass,
    marketPhase: (row.market_phase as MarketPhase) ?? '',
    marketPhasePass: row.market_phase_pass,
    mtfConfirmation: row.mtf_confirmation ?? '',
    newsCheckClear: row.news_check_clear,
    reversalPattern: row.reversal_pattern ?? '',
    reversalSrPass: row.reversal_sr_pass,
    rrOnTrade: row.rr_on_trade !== null ? String(row.rr_on_trade) : '',
    rrToLastSwing: row.rr_to_last_swing !== null ? String(row.rr_to_last_swing) : '',
    rrToNextSr: row.rr_to_next_sr !== null ? String(row.rr_to_next_sr) : '',
    srReactionPass: row.sr_reaction_pass,
    srTouchCount: row.sr_touch_count !== null ? String(row.sr_touch_count) : '',
    srTypes: (row.sr_types as SrType[]) ?? [],
    totalSrTouches: row.total_sr_touches !== null ? String(row.total_sr_touches) : ''
  };
}

/* ── Styles ───────────────────────────────────────────────────── */

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
  sideCard: {
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
  sectionBody: {
    gap: 14,
    marginTop: 14
  },
  chevron: {
    fontSize: 14,
    fontWeight: '800'
  },
  fieldRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 6
  },
  segmentedControl: {
    flexDirection: 'row',
    gap: 8
  },
  segment: {
    minHeight: 42,
    flex: 1,
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
  tickCrossField: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  tickCrossLabel: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20
  },
  tickCrossRow: {
    flexDirection: 'row',
    gap: 8
  },
  tickBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: 1
  },
  tickBtnText: {
    fontSize: 18,
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
  dropdownValue: {
    flex: 1,
    fontSize: 16,
    fontWeight: '800'
  },
  dropdownChevron: {
    fontSize: 20,
    fontWeight: '800'
  },
  modalBackdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.38)',
    padding: 18
  },
  selectModalCard: {
    width: '100%',
    maxWidth: 560,
    maxHeight: '82%'
  },
  selectOptions: {
    gap: 8,
    paddingBottom: 4
  },
  selectOption: {
    minHeight: 48,
    justifyContent: 'center',
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
  closeButton: {
    minHeight: 36,
    justifyContent: 'center',
    paddingHorizontal: 10
  },
  closeButtonText: {
    fontSize: 13,
    fontWeight: '800'
  },
  loadingPill: {
    minHeight: 54,
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    borderRadius: 8,
    paddingHorizontal: 12
  },
  loadingPillText: {
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
  sideMeta: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 3
  },
  emptyBody: {
    fontSize: 14,
    lineHeight: 21,
    marginTop: 8
  },
  qualifyBanner: {
    alignItems: 'center',
    borderRadius: 10,
    marginTop: 10,
    padding: 14
  },
  qualifyCount: {
    fontSize: 36,
    fontWeight: '800'
  },
  qualifyLabel: {
    fontSize: 14,
    fontWeight: '800'
  },
  pairRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderBottomWidth: 1,
    paddingVertical: 10
  },
  pairSymbol: {
    flex: 1,
    fontSize: 15,
    fontWeight: '800'
  },
  pairDirection: {
    fontSize: 12,
    fontWeight: '800'
  },
  pairStatus: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3
  },
  pairStatusText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800'
  },
  seedButton: {
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10
  },
  seedButtonText: {
    fontSize: 13,
    fontWeight: '800'
  }
});
