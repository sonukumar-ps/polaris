import { useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useMemo, useState } from 'react';
import { Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  AppShell,
  Card,
  EmptyState,
  InfoTip,
  LoadingState,
  PrimaryButton,
  SecondaryLinkButton,
  SectionHeading,
  TextField,
  useAppTheme
} from '@/lib/ui';
import {
  addStopLossMove,
  deleteStopLossMove,
  getTrade,
  listAccounts,
  listStopLossMoves,
  listStrategies,
  listTradeImages,
  markBulletproof,
  updateManualTrade,
  uploadTradeImage
} from '@/lib/trades';
import { seedStopLossHistory } from '@/lib/trades/seed-sl-history';
import type {
  ManualTradeTagInput,
  StopLossHistoryRow,
  TradeDirection,
  TradeImage,
  TradeSummary,
  TradingAccount,
  TradingStrategy
} from '@/lib/trades';

type TradeEditDraft = {
  accountId: string;
  closedAt: string;
  customTags: string;
  direction: TradeDirection;
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

type ValidationErrors = Partial<Record<keyof TradeEditDraft, string>>;
type DropdownOption = {
  meta?: string;
  value: string;
  label: string;
};

export default function TradeDetailScreen() {
  const { tradeId } = useLocalSearchParams<{ tradeId: string }>();
  const theme = useAppTheme();
  const [trade, setTrade] = useState<TradeSummary | null>(null);
  const [draft, setDraft] = useState<TradeEditDraft | null>(null);
  const [accounts, setAccounts] = useState<TradingAccount[]>([]);
  const [strategies, setStrategies] = useState<TradingStrategy[]>([]);
  const [images, setImages] = useState<TradeImage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [editErrors, setEditErrors] = useState<ValidationErrors>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<'account' | 'strategy' | null>(null);

  const selectedAccount = accounts.find((account) => account.id === draft?.accountId) ?? null;
  const selectedStrategy = strategies.find((strategy) => strategy.id === draft?.strategyId) ?? null;
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

    async function loadTrade() {
      if (!tradeId) {
        setError('Trade id is missing.');
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const [loadedTrade, loadedImages, loadedAccounts, loadedStrategies] = await Promise.all([
          getTrade(tradeId),
          listTradeImages(tradeId),
          listAccounts(),
          listStrategies()
        ]);

        if (isActive) {
          setTrade(loadedTrade);
          setDraft(createDraftFromTrade(loadedTrade));
          setImages(loadedImages);
          setAccounts(loadedAccounts);
          setStrategies(loadedStrategies);
        }
      } catch (loadError) {
        if (isActive) {
          setError(loadError instanceof Error ? loadError.message : 'Could not load trade.');
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    void loadTrade();

    return () => {
      isActive = false;
    };
  }, [tradeId]);

  function updateField<Key extends keyof TradeEditDraft>(key: Key, value: TradeEditDraft[Key]) {
    setDraft((current) =>
      current
        ? {
            ...current,
            [key]: value
          }
        : current
    );
    setEditErrors((current) => ({
      ...current,
      [key]: undefined
    }));
    setEditError(null);
  }

  function beginEditing() {
    if (!trade) {
      return;
    }

    setDraft(createDraftFromTrade(trade));
    setEditErrors({});
    setEditError(null);
    setIsEditing(true);
  }

  function cancelEditing() {
    if (trade) {
      setDraft(createDraftFromTrade(trade));
    }

    setEditErrors({});
    setEditError(null);
    setIsEditing(false);
  }

  async function handleSaveEdit() {
    if (!tradeId || !draft) {
      return;
    }

    const nextErrors = validateDraft(draft);
    setEditErrors(nextErrors);
    setEditError(null);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setIsSavingEdit(true);

    try {
      await updateManualTrade({
        accountId: draft.accountId,
        assetClass: trade?.asset?.asset_class ?? 'other',
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
        tags: buildTagInputs(draft),
        tradeId
      });

      const updatedTrade = await getTrade(tradeId);
      setTrade(updatedTrade);
      setDraft(createDraftFromTrade(updatedTrade));
      setIsEditing(false);
    } catch (saveError) {
      setEditError(saveError instanceof Error ? saveError.message : 'Could not update trade.');
    } finally {
      setIsSavingEdit(false);
    }
  }

  async function handleAttachImage() {
    if (!tradeId) {
      return;
    }

    setImageError(null);
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      setImageError('Photo library permission is required to attach screenshots.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: false,
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.9
    });

    if (result.canceled) {
      return;
    }

    const asset = result.assets[0];
    setIsUploadingImage(true);

    try {
      await uploadTradeImage({
        fileName: asset.fileName,
        mimeType: asset.mimeType,
        tradeId,
        uri: asset.uri
      });
      setImages(await listTradeImages(tradeId));
    } catch (uploadError) {
      setImageError(uploadError instanceof Error ? uploadError.message : 'Could not attach image.');
    } finally {
      setIsUploadingImage(false);
    }
  }

  return (
    <AppShell activeRoute="trades">
      <View style={styles.headerRow}>
        <SectionHeading
          eyebrow="Trade detail"
          subtitle="Review execution, outcome, tags, notes, and chart context in one place."
          title={trade?.asset?.symbol ?? 'Trade'}
        />
        <SecondaryLinkButton href="/trades">Back to trades</SecondaryLinkButton>
      </View>

      {isLoading ? <LoadingState label="Loading trade..." /> : null}

      {error ? (
        <Card style={{ borderColor: theme.danger }}>
          <Text style={[styles.errorText, { color: theme.danger }]}>{error}</Text>
        </Card>
      ) : null}

      {trade ? (
        <View style={styles.layout}>
          <Card style={styles.mainCard}>
            {isEditing && draft ? (
              <TradeEditForm
                draft={draft}
                editError={editError}
                errors={editErrors}
                isSaving={isSavingEdit}
                onCancel={cancelEditing}
                onOpenDropdown={setOpenDropdown}
                onSave={handleSaveEdit}
                onUpdate={updateField}
                selectedAccount={selectedAccount}
                selectedStrategy={selectedStrategy}
                strategies={strategies}
              />
            ) : (
              <TradeReadOnlyCard onEdit={beginEditing} trade={trade} />
            )}
          </Card>

          <View style={styles.sideColumn}>
            <StopLossTrailCard trade={trade} onTradeUpdate={(t) => setTrade(t)} />

            <Card style={styles.sideCard}>
              <View style={styles.cardHeader}>
                <View>
                  <Text style={[styles.sectionTitle, { color: theme.text }]}>Chart screenshots</Text>
                  <Text style={[styles.sideMeta, { color: theme.muted }]}>Attach visual context</Text>
                </View>
                <PrimaryButton disabled={isUploadingImage} onPress={handleAttachImage}>
                  {isUploadingImage ? 'Uploading...' : 'Attach'}
                </PrimaryButton>
              </View>
              {imageError ? <Text style={[styles.errorText, { color: theme.danger }]}>{imageError}</Text> : null}
              {images.length === 0 ? (
                <EmptyState body="Screenshots attached to this trade will appear here." title="No screenshots" />
              ) : (
                <View style={styles.imageGrid}>
                  {images.map((image) => (
                    <Pressable
                      key={image.id}
                      style={[styles.imageFrame, { backgroundColor: theme.mutedSurface, borderColor: theme.border }]}
                    >
                      {image.signedUrl ? (
                        <Image source={{ uri: image.signedUrl }} style={styles.chartImage} />
                      ) : (
                        <Text style={[styles.sideMeta, { color: theme.muted }]}>Preview unavailable</Text>
                      )}
                    </Pressable>
                  ))}
                </View>
              )}
            </Card>
          </View>
        </View>
      ) : null}

      {draft ? (
        <>
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
        </>
      ) : null}
    </AppShell>
  );
}

function StopLossTrailCard({
  trade,
  onTradeUpdate
}: {
  trade: TradeSummary;
  onTradeUpdate: (trade: TradeSummary) => void;
}) {
  const theme = useAppTheme();
  const [history, setHistory] = useState<StopLossHistoryRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [isMarkingBp, setIsMarkingBp] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newPrice, setNewPrice] = useState('');
  const [reason, setReason] = useState('');

  useEffect(() => {
    let isActive = true;
    async function load() {
      setIsLoading(true);
      try {
        const moves = await listStopLossMoves(trade.id);
        if (isActive) setHistory(moves);
      } catch {
        // silent
      } finally {
        if (isActive) setIsLoading(false);
      }
    }
    void load();
    return () => {
      isActive = false;
    };
  }, [trade.id]);

  const currentSl = history.length > 0 ? history[history.length - 1].new_price : trade.stop_loss_price;
  const today = new Date().toISOString().slice(0, 10);
  const trailedToday = history.some((m) => m.moved_at.slice(0, 10) === today);

  async function handleAddMove() {
    const parsed = Number(newPrice);
    if (!parsed || !Number.isFinite(parsed)) {
      setError('Enter a valid new SL price.');
      return;
    }
    if (currentSl === null) {
      setError('Trade has no initial stop loss to move.');
      return;
    }
    if (trailedToday) {
      setError("Already trailed today. Jason's rule: max 1 trail per day.");
      return;
    }

    setIsAdding(true);
    setError(null);

    try {
      await addStopLossMove({
        newPrice: parsed,
        oldPrice: Number(currentSl),
        reason: reason.trim() || undefined,
        tradeId: trade.id
      });

      const refreshed = await listStopLossMoves(trade.id);
      setHistory(refreshed);
      setNewPrice('');
      setReason('');
      setShowForm(false);

      // Reload trade to reflect trailing_stop_count update
      const updatedTrade = await getTrade(trade.id);
      onTradeUpdate(updatedTrade);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save SL move.');
    } finally {
      setIsAdding(false);
    }
  }

  async function handleMarkBulletproof() {
    setIsMarkingBp(true);
    setError(null);
    try {
      await markBulletproof(trade.id);
      const updatedTrade = await getTrade(trade.id);
      onTradeUpdate(updatedTrade);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not mark as bulletproof.');
    } finally {
      setIsMarkingBp(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteStopLossMove(id);
      const refreshed = await listStopLossMoves(trade.id);
      setHistory(refreshed);
      const updatedTrade = await getTrade(trade.id);
      onTradeUpdate(updatedTrade);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete move.');
    }
  }

  return (
    <Card style={styles.sideCard}>
      <View style={styles.cardHeader}>
        <View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Stop-loss trail</Text>
            <InfoTip term="trailing_stop" />
          </View>
          <Text style={[styles.sideMeta, { color: theme.muted }]}>
            {history.length} move{history.length !== 1 ? 's' : ''}
            {trade.is_bulletproof ? ' • Bulletproof' : ''}
          </Text>
        </View>
        {!trade.is_bulletproof && currentSl !== null ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Pressable
              disabled={isMarkingBp}
              onPress={handleMarkBulletproof}
              style={({ pressed }) => [
                styles.inlineAction,
                { backgroundColor: theme.card, borderColor: theme.positive },
                pressed && styles.pressed
              ]}
            >
              <Text style={[styles.inlineActionText, { color: theme.positive }]}>
                {isMarkingBp ? 'Marking...' : '🛡️ Bulletproof'}
              </Text>
            </Pressable>
            <InfoTip term="bulletproof" />
          </View>
        ) : null}
      </View>

      {currentSl !== null ? (
        <View style={[styles.currentSlBox, { backgroundColor: theme.mutedSurface }]}>
          <Text style={[styles.currentSlLabel, { color: theme.muted }]}>Current SL</Text>
          <Text style={[styles.currentSlValue, { color: theme.text }]}>{formatNumber(Number(currentSl))}</Text>
        </View>
      ) : null}

      {isLoading ? <Text style={[styles.sideMeta, { color: theme.muted }]}>Loading...</Text> : null}

      {!isLoading && history.length === 0 ? (
        <View style={{ gap: 8 }}>
          <Text style={[styles.emptyBody, { color: theme.muted }]}>
            No SL moves yet. Add one when you trail the stop or move to breakeven.
          </Text>
          <Pressable
            onPress={async () => {
              setError(null);
              try {
                const result = await seedStopLossHistory();
                const refreshed = await listStopLossMoves(trade.id);
                setHistory(refreshed);
                const updatedTrade = await getTrade(trade.id);
                onTradeUpdate(updatedTrade);
                if (result.movesAdded === 0) {
                  setError('No SL moves added. Try a different trade with a stop loss.');
                }
              } catch (err) {
                setError(err instanceof Error ? err.message : 'Could not seed SL history.');
              }
            }}
            style={({ pressed }) => [
              styles.inlineAction,
              { backgroundColor: theme.mutedSurface, borderColor: theme.border },
              pressed && styles.pressed
            ]}
          >
            <Text style={[styles.inlineActionText, { color: theme.accent }]}>
              🧪 Seed SL history across trades
            </Text>
          </Pressable>
        </View>
      ) : null}

      {history.length > 0 ? (
        <View style={styles.timelineList}>
          {history.map((move, idx) => (
            <View key={move.id} style={[styles.timelineRow, { borderBottomColor: theme.border }]}>
              <View style={[styles.timelineDot, { backgroundColor: theme.accent }]} />
              <View style={styles.timelineContent}>
                <Text style={[styles.timelineDate, { color: theme.muted }]}>
                  {formatDate(move.moved_at)} #{idx + 1}
                </Text>
                <Text style={[styles.timelinePrices, { color: theme.text }]}>
                  {formatNumber(Number(move.old_price))} → {formatNumber(Number(move.new_price))}
                </Text>
                {move.reason ? (
                  <Text style={[styles.timelineReason, { color: theme.muted }]}>{move.reason}</Text>
                ) : null}
              </View>
              <Pressable
                onPress={() => handleDelete(move.id)}
                style={({ pressed }) => [pressed && styles.pressed]}
              >
                <Text style={[styles.timelineDelete, { color: theme.danger }]}>×</Text>
              </Pressable>
            </View>
          ))}
        </View>
      ) : null}

      {error ? <Text style={[styles.errorText, { color: theme.danger }]}>{error}</Text> : null}

      {showForm ? (
        <View style={styles.slFormBox}>
          <TextField
            inputMode="decimal"
            label="New SL price"
            onChangeText={setNewPrice}
            placeholder="1.2680"
            value={newPrice}
          />
          <TextField
            label="Reason (optional)"
            onChangeText={setReason}
            placeholder="Trail to last daily low"
            value={reason}
          />
          <View style={styles.slFormButtons}>
            <Pressable
              onPress={() => {
                setShowForm(false);
                setNewPrice('');
                setReason('');
                setError(null);
              }}
              style={({ pressed }) => [
                styles.inlineAction,
                { backgroundColor: theme.card, borderColor: theme.border },
                pressed && styles.pressed
              ]}
            >
              <Text style={[styles.inlineActionText, { color: theme.muted }]}>Cancel</Text>
            </Pressable>
            <PrimaryButton disabled={isAdding} onPress={handleAddMove}>
              {isAdding ? 'Saving...' : 'Save move'}
            </PrimaryButton>
          </View>
        </View>
      ) : (
        <Pressable
          disabled={trailedToday || currentSl === null}
          onPress={() => setShowForm(true)}
          style={({ pressed }) => [
            styles.inlineAction,
            {
              backgroundColor: theme.card,
              borderColor: trailedToday ? theme.border : theme.accent,
              opacity: trailedToday || currentSl === null ? 0.5 : 1
            },
            pressed && styles.pressed
          ]}
        >
          <Text style={[styles.inlineActionText, { color: trailedToday ? theme.muted : theme.accent }]}>
            {trailedToday ? '🔒 Trailed today (max 1/day)' : '+ Add SL move'}
          </Text>
        </Pressable>
      )}
    </Card>
  );
}

function TradeReadOnlyCard({ onEdit, trade }: { onEdit: () => void; trade: TradeSummary }) {
  const theme = useAppTheme();

  return (
    <>
      <View style={styles.heroRow}>
        <View>
          <Text style={[styles.tradeTitle, { color: theme.text }]}>
            {trade.direction.toUpperCase()} {trade.asset?.symbol ?? 'Trade'}
          </Text>
          <Text style={[styles.tradeSubtitle, { color: theme.muted }]}>
            {trade.status.toUpperCase()} | Opened {formatDate(trade.opened_at)}
          </Text>
        </View>
        <View style={styles.heroActions}>
          <Text
            style={[
              styles.netPnl,
              {
                color:
                  trade.net_pnl === null
                    ? theme.muted
                    : trade.net_pnl >= 0
                      ? theme.positive
                      : theme.danger
              }
            ]}
          >
            {trade.net_pnl === null ? 'Open' : formatCurrency(trade.net_pnl)}
          </Text>
          <Pressable
            onPress={onEdit}
            style={({ pressed }) => [
              styles.inlineAction,
              { backgroundColor: theme.card, borderColor: theme.border },
              pressed && styles.pressed
            ]}
          >
            <Text style={[styles.inlineActionText, { color: theme.text }]}>Edit trade</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.metricGrid}>
        <Metric label="Strategy" value={trade.strategy?.name ?? 'Not set'} />
        <Metric label="Entry" value={formatNumber(trade.entry_price)} />
        <Metric label="Exit" value={trade.exit_price ? formatNumber(trade.exit_price) : 'Open'} />
        <Metric label="Size" value={formatNumber(trade.quantity)} />
        <Metric label="Fees" value={formatCurrency(trade.fees)} />
        <Metric label="Gross P&L" value={trade.gross_pnl !== null ? formatCurrency(trade.gross_pnl) : 'Open'} />
        <Metric label="Closed" value={trade.closed_at ? formatDate(trade.closed_at) : 'Open'} />
        {trade.planned_rr !== null ? <Metric label="Planned R:R" value={String(trade.planned_rr)} /> : null}
        {trade.stop_loss_price !== null ? <Metric label="Stop loss" value={formatNumber(trade.stop_loss_price)} /> : null}
        {trade.take_profit_price !== null ? <Metric label="Take profit" value={formatNumber(trade.take_profit_price)} /> : null}
      </View>

      {trade.tags.length > 0 ? (
        <View style={[styles.dividedSection, { borderColor: theme.border }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Tags</Text>
          <View style={styles.tags}>
            {trade.tags.map((tag) => (
              <Text key={tag.id} style={[styles.tagChip, { backgroundColor: theme.mutedSurface, color: theme.muted }]}>
                {tag.type}: {tag.name}
              </Text>
            ))}
          </View>
        </View>
      ) : null}

      {trade.notes ? (
        <View style={[styles.dividedSection, { borderColor: theme.border }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Notes</Text>
          <Text style={[styles.notesText, { color: theme.muted }]}>{trade.notes}</Text>
        </View>
      ) : null}

      {trade.psychology ? <PsychologyCard trade={trade} /> : null}

      {hasOrderManagementData(trade) ? <OrderManagementCard trade={trade} /> : null}
    </>
  );
}

function OrderManagementCard({ trade }: { trade: TradeSummary }) {
  const theme = useAppTheme();

  const orderTypeLabel: Record<string, string> = {
    market: 'Market',
    pending_buy_stop: 'Buy Stop',
    pending_sell_stop: 'Sell Stop'
  };
  const mgmtLabel: Record<string, string> = {
    advanced: 'Advanced',
    basic: 'Basic',
    intermediate: 'Intermediate'
  };

  // Map management_option to glossary term
  const mgmtTerm: Record<string, 'basic_management' | 'intermediate_management' | 'advanced_management'> = {
    advanced: 'advanced_management',
    basic: 'basic_management',
    intermediate: 'intermediate_management'
  };

  return (
    <View style={[styles.dividedSection, { borderColor: theme.border }]}>
      <Text style={[styles.sectionTitle, { color: theme.text }]}>Order management</Text>
      <View style={styles.psychGrid}>
        {trade.entry_order_type ? (
          <PsychChipWithTip
            label="Order type"
            term={trade.entry_order_type === 'pending_buy_stop' ? 'pending_buy_stop' : trade.entry_order_type === 'pending_sell_stop' ? 'pending_sell_stop' : undefined}
            value={orderTypeLabel[trade.entry_order_type] ?? trade.entry_order_type}
          />
        ) : null}
        {trade.order_triggered !== null ? (
          <PsychChip
            label="Triggered"
            tone={trade.order_triggered ? 'positive' : undefined}
            value={trade.order_triggered ? 'Yes' : 'No'}
          />
        ) : null}
        {trade.order_expired ? (
          <PsychChipWithTip label="Expired" term="expired_order" tone="negative" value="Yes" />
        ) : null}
        {trade.management_option ? (
          <PsychChipWithTip
            label="Management"
            term={mgmtTerm[trade.management_option]}
            value={mgmtLabel[trade.management_option] ?? trade.management_option}
          />
        ) : null}
        {trade.is_bulletproof ? (
          <PsychChipWithTip label="Bulletproof" term="bulletproof" tone="positive" value="Yes" />
        ) : null}
        {trade.trailing_stop_count !== null && trade.trailing_stop_count > 0 ? (
          <PsychChipWithTip label="SL trails" term="trailing_stop" value={String(trade.trailing_stop_count)} />
        ) : null}
        {trade.intended_entry_price !== null ? (
          <PsychChip label="Intended entry" value={formatNumber(trade.intended_entry_price)} />
        ) : null}
        {trade.slippage_pips !== null ? (
          <PsychChip label="Slippage" value={`${trade.slippage_pips} pips`} />
        ) : null}
        {trade.rr_to_last_swing !== null ? (
          <PsychChipWithTip label="R:R last swing" term="planned_rr" value={String(trade.rr_to_last_swing)} />
        ) : null}
        {trade.rr_to_next_sr !== null ? (
          <PsychChipWithTip label="R:R next S/R" term="planned_rr" value={String(trade.rr_to_next_sr)} />
        ) : null}
      </View>
    </View>
  );
}

function PsychChipWithTip({
  label,
  term,
  tone,
  value
}: {
  label: string;
  term?: keyof typeof import('@/lib/ui').GLOSSARY;
  tone?: 'positive' | 'negative';
  value: string;
}) {
  const theme = useAppTheme();
  const valueColor = tone === 'positive' ? theme.positive : tone === 'negative' ? theme.danger : theme.text;

  return (
    <View style={[styles.psychChip, { backgroundColor: theme.mutedSurface }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        <Text style={[styles.psychChipLabel, { color: theme.muted }]}>{label}</Text>
        {term ? <InfoTip term={term} /> : null}
      </View>
      <Text style={[styles.psychChipValue, { color: valueColor }]}>{value}</Text>
    </View>
  );
}

function hasOrderManagementData(trade: TradeSummary): boolean {
  return !!(
    trade.entry_order_type ||
    trade.management_option ||
    trade.is_bulletproof ||
    trade.intended_entry_price !== null ||
    trade.slippage_pips !== null ||
    trade.rr_to_last_swing !== null ||
    trade.rr_to_next_sr !== null ||
    (trade.trailing_stop_count !== null && trade.trailing_stop_count > 0)
  );
}

function TradeEditForm({
  draft,
  editError,
  errors,
  isSaving,
  onCancel,
  onOpenDropdown,
  onSave,
  onUpdate,
  selectedAccount,
  selectedStrategy,
  strategies
}: {
  draft: TradeEditDraft;
  editError: string | null;
  errors: ValidationErrors;
  isSaving: boolean;
  onCancel: () => void;
  onOpenDropdown: (value: 'account' | 'strategy') => void;
  onSave: () => void;
  onUpdate: <Key extends keyof TradeEditDraft>(key: Key, value: TradeEditDraft[Key]) => void;
  selectedAccount: TradingAccount | null;
  selectedStrategy: TradingStrategy | null;
  strategies: TradingStrategy[];
}) {
  const theme = useAppTheme();

  return (
    <>
      <View style={styles.sectionHeaderRow}>
        <View>
          <Text style={[styles.tradeTitle, { color: theme.text }]}>Edit trade</Text>
          <Text style={[styles.tradeSubtitle, { color: theme.muted }]}>Update the execution record and save.</Text>
        </View>
        <Pressable
          onPress={onCancel}
          style={({ pressed }) => [
            styles.inlineAction,
            { backgroundColor: theme.card, borderColor: theme.border },
            pressed && styles.pressed
          ]}
        >
          <Text style={[styles.inlineActionText, { color: theme.text }]}>Cancel</Text>
        </Pressable>
      </View>

      <View style={styles.formSection}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Account</Text>
        <DropdownField
          label="Account"
          onOpen={() => onOpenDropdown('account')}
          placeholder="Select account"
          value={selectedAccount?.name ?? ''}
        />
        {errors.accountId ? <Text style={[styles.errorText, { color: theme.danger }]}>{errors.accountId}</Text> : null}
      </View>

      <View style={styles.formSection}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Trade</Text>
        <TextField
          autoCapitalize="characters"
          error={errors.symbol}
          label="Symbol"
          onChangeText={(value) => onUpdate('symbol', value)}
          placeholder="AAPL"
          value={draft.symbol}
        />
        <View style={styles.fieldRow}>
          <TextField
            error={errors.entryPrice}
            inputMode="decimal"
            label="Entry"
            onChangeText={(value) => onUpdate('entryPrice', value)}
            placeholder="100.00"
            value={draft.entryPrice}
          />
          <TextField
            error={errors.exitPrice}
            inputMode="decimal"
            label="Exit"
            onChangeText={(value) => onUpdate('exitPrice', value)}
            placeholder="112.50"
            value={draft.exitPrice}
          />
        </View>
        <View style={styles.fieldRow}>
          <TextField
            error={errors.size}
            inputMode="decimal"
            label="Size"
            onChangeText={(value) => onUpdate('size', value)}
            placeholder="10"
            value={draft.size}
          />
          <TextField
            error={errors.fees}
            inputMode="decimal"
            label="Fees"
            onChangeText={(value) => onUpdate('fees', value)}
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
                onPress={() => onUpdate('direction', direction)}
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
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Strategy</Text>
        {strategies.length === 0 ? (
          <View style={[styles.emptyPanel, { backgroundColor: theme.mutedSurface }]}>
            <Text style={[styles.emptyPanelTitle, { color: theme.text }]}>No strategies yet</Text>
            <Text style={[styles.emptyPanelText, { color: theme.muted }]}>
              Create a strategy from the add trade screen before saving this trade.
            </Text>
          </View>
        ) : (
          <DropdownField
            label="Strategy"
            meta={selectedStrategy?.description ?? undefined}
            onOpen={() => onOpenDropdown('strategy')}
            placeholder="Select strategy"
            value={selectedStrategy?.name ?? ''}
          />
        )}
        {errors.strategyId ? <Text style={[styles.errorText, { color: theme.danger }]}>{errors.strategyId}</Text> : null}
      </View>

      <View style={styles.formSection}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Timing and context</Text>
        <View style={styles.fieldRow}>
          <TextField
            error={errors.openedAt}
            label="Opened"
            onChangeText={(value) => onUpdate('openedAt', value)}
            placeholder="2026-05-21"
            value={draft.openedAt}
          />
          <TextField
            error={errors.closedAt}
            label="Closed"
            onChangeText={(value) => onUpdate('closedAt', value)}
            placeholder="Optional"
            value={draft.closedAt}
          />
        </View>
        <View style={styles.fieldRow}>
          <TextField
            label="Emotion"
            onChangeText={(value) => onUpdate('emotionTag', value)}
            placeholder="Calm"
            value={draft.emotionTag}
          />
          <TextField
            label="Mistake"
            onChangeText={(value) => onUpdate('mistakeTag', value)}
            placeholder="Chased entry"
            value={draft.mistakeTag}
          />
        </View>
        <View style={styles.fieldRow}>
          <TextField
            label="Setup"
            onChangeText={(value) => onUpdate('setupTag', value)}
            placeholder="Opening range"
            value={draft.setupTag}
          />
          <TextField
            label="Custom tags"
            onChangeText={(value) => onUpdate('customTags', value)}
            placeholder="Comma-separated tags"
            value={draft.customTags}
          />
        </View>
        <TextField
          label="Notes"
          multiline
          onChangeText={(value) => onUpdate('notes', value)}
          placeholder="What mattered about this trade?"
          value={draft.notes}
        />
      </View>

      {editError ? <Text style={[styles.errorText, { color: theme.danger }]}>{editError}</Text> : null}
      <PrimaryButton disabled={isSaving} onPress={onSave}>
        {isSaving ? 'Saving...' : 'Save changes'}
      </PrimaryButton>
    </>
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
        <Text style={[styles.dropdownChevron, { color: theme.muted }]}>v</Text>
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
                  {isSelected ? <Text style={[styles.selectOptionMeta, { color: '#FFFFFF' }]}>Selected</Text> : null}
                </Pressable>
              );
            })}
          </ScrollView>
        </Card>
      </View>
    </Modal>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  const theme = useAppTheme();

  return (
    <View style={[styles.metric, { backgroundColor: theme.mutedSurface }]}>
      <Text style={[styles.metricLabel, { color: theme.muted }]}>{label}</Text>
      <Text style={[styles.metricValue, { color: theme.text }]}>{value}</Text>
    </View>
  );
}

function PsychologyCard({ trade }: { trade: TradeSummary }) {
  const theme = useAppTheme();
  const p = trade.psychology!;
  const isClosed = trade.status === 'closed';

  const hasPreTrade = !!(
    p.emotional_state || p.energy_level !== null || p.focus_level !== null ||
    p.conviction_level !== null || p.session || p.market_condition ||
    p.htf_bias || p.setup_quality !== null
  );
  const hasExecution = isClosed && !!(
    p.followed_plan !== null || p.entry_timing || p.exit_timing ||
    p.moved_stop_loss !== null || p.moved_take_profit !== null || p.position_size_adherence
  );

  return (
    <View style={[styles.dividedSection, { borderColor: theme.border }]}>
      <Text style={[styles.sectionTitle, { color: theme.text }]}>Psychology</Text>

      {hasPreTrade ? (
        <>
          <Text style={[styles.psychSubhead, { color: theme.muted }]}>Pre-trade state</Text>
          <View style={styles.psychGrid}>
            {p.emotional_state ? <PsychChip label="Emotion" value={formatPsychValue(p.emotional_state)} /> : null}
            {p.energy_level !== null ? <PsychChip label="Energy" value={`${p.energy_level}/5`} /> : null}
            {p.focus_level !== null ? <PsychChip label="Focus" value={`${p.focus_level}/5`} /> : null}
            {p.conviction_level !== null ? <PsychChip label="Conviction" value={`${p.conviction_level}/10`} /> : null}
            {p.session ? <PsychChip label="Session" value={formatPsychValue(p.session)} /> : null}
            {p.market_condition ? <PsychChip label="Market" value={formatPsychValue(p.market_condition)} /> : null}
            {p.htf_bias ? <PsychChip label="HTF bias" value={formatPsychValue(p.htf_bias)} /> : null}
            {p.setup_quality !== null ? <PsychChip label="Setup quality" value={`${p.setup_quality}/5`} /> : null}
          </View>
        </>
      ) : null}

      {hasExecution ? (
        <>
          <Text style={[styles.psychSubhead, { color: theme.muted }]}>Execution assessment</Text>
          <View style={styles.psychGrid}>
            {p.followed_plan !== null ? (
              <PsychChip
                label="Followed plan"
                tone={p.followed_plan ? 'positive' : 'negative'}
                value={p.followed_plan ? 'Yes' : 'No'}
              />
            ) : null}
            {p.entry_timing ? <PsychChip label="Entry timing" value={formatPsychValue(p.entry_timing)} /> : null}
            {p.exit_timing ? <PsychChip label="Exit timing" value={formatPsychValue(p.exit_timing)} /> : null}
            {p.moved_stop_loss !== null ? (
              <PsychChip
                label="Moved SL"
                tone={p.moved_stop_loss ? 'negative' : 'positive'}
                value={p.moved_stop_loss ? 'Yes' : 'No'}
              />
            ) : null}
            {p.moved_take_profit !== null ? (
              <PsychChip label="Moved TP" value={p.moved_take_profit ? 'Yes' : 'No'} />
            ) : null}
            {p.position_size_adherence ? (
              <PsychChip
                label="Size adherence"
                tone={
                  p.position_size_adherence === 'correct'
                    ? 'positive'
                    : p.position_size_adherence === 'oversized'
                      ? 'negative'
                      : undefined
                }
                value={formatPsychValue(p.position_size_adherence)}
              />
            ) : null}
          </View>
        </>
      ) : null}

      {p.lesson ? (
        <View style={[styles.lessonBlock, { borderLeftColor: theme.accent }]}>
          <Text style={[styles.lessonLabel, { color: theme.muted }]}>Lesson</Text>
          <Text style={[styles.lessonText, { color: theme.text }]}>{p.lesson}</Text>
        </View>
      ) : null}
    </View>
  );
}

function PsychChip({
  label,
  tone,
  value
}: {
  label: string;
  tone?: 'positive' | 'negative';
  value: string;
}) {
  const theme = useAppTheme();
  const valueColor = tone === 'positive' ? theme.positive : tone === 'negative' ? theme.danger : theme.text;

  return (
    <View style={[styles.psychChip, { backgroundColor: theme.mutedSurface }]}>
      <Text style={[styles.psychChipLabel, { color: theme.muted }]}>{label}</Text>
      <Text style={[styles.psychChipValue, { color: valueColor }]}>{value}</Text>
    </View>
  );
}

function formatPsychValue(value: string) {
  return value.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function createDraftFromTrade(trade: TradeSummary): TradeEditDraft {
  const tagsByType = new Map<string, string[]>();

  for (const tag of trade.tags) {
    if (tag.type === 'strategy') {
      continue;
    }

    const existing = tagsByType.get(tag.type) ?? [];
    tagsByType.set(tag.type, [...existing, tag.name]);
  }

  return {
    accountId: trade.account_id,
    closedAt: trade.closed_at ? toDateInput(trade.closed_at) : '',
    customTags: (tagsByType.get('custom') ?? []).join(', '),
    direction: trade.direction,
    emotionTag: (tagsByType.get('emotion') ?? [])[0] ?? '',
    entryPrice: String(trade.entry_price),
    exitPrice: trade.exit_price === null ? '' : String(trade.exit_price),
    fees: String(trade.fees),
    mistakeTag: (tagsByType.get('mistake') ?? [])[0] ?? '',
    notes: trade.notes ?? '',
    openedAt: toDateInput(trade.opened_at),
    setupTag: (tagsByType.get('setup') ?? [])[0] ?? '',
    size: String(trade.quantity),
    strategyId: trade.strategy_id ?? '',
    symbol: trade.asset?.symbol ?? ''
  };
}

function validateDraft(draft: TradeEditDraft) {
  const errors: ValidationErrors = {};

  if (!draft.accountId) {
    errors.accountId = 'Select an account.';
  }

  if (!draft.strategyId) {
    errors.strategyId = 'Select a strategy.';
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

function parsePositiveNumber(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function parseNonNegativeNumber(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function buildTagInputs(draft: TradeEditDraft): ManualTradeTagInput[] {
  return [
    { name: draft.emotionTag, type: 'emotion' },
    { name: draft.mistakeTag, type: 'mistake' },
    { name: draft.setupTag, type: 'setup' },
    ...draft.customTags.split(',').map((name) => ({ name, type: 'custom' as const }))
  ];
}

function toDateInput(value: string) {
  return new Date(value).toISOString().slice(0, 10);
}

function toDateTime(date: string) {
  return new Date(`${date}T00:00:00.000Z`).toISOString();
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }).format(new Date(value));
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('en', {
    maximumFractionDigits: 8,
    minimumFractionDigits: 0
  }).format(value);
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
  mainCard: {
    minWidth: 260,
    flex: 2
  },
  sideCard: {
    minWidth: 240,
    flex: 1
  },
  heroRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    alignItems: 'flex-start',
    justifyContent: 'space-between'
  },
  heroActions: {
    gap: 10,
    alignItems: 'flex-end'
  },
  tradeTitle: {
    fontSize: 28,
    fontWeight: '800'
  },
  tradeSubtitle: {
    fontSize: 13,
    fontWeight: '800',
    marginTop: 4
  },
  netPnl: {
    fontSize: 28,
    fontWeight: '800'
  },
  metricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10
  },
  metric: {
    minWidth: 130,
    flex: 1,
    gap: 4,
    borderRadius: 12,
    padding: 14
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.2,
    textTransform: 'uppercase' as const
  },
  metricValue: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.2
  },
  dividedSection: {
    gap: 10,
    borderTopWidth: 1,
    paddingTop: 16
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
    fontSize: 16,
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
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  tagChip: {
    overflow: 'hidden',
    borderRadius: 8,
    fontSize: 12,
    fontWeight: '800',
    paddingHorizontal: 9,
    paddingVertical: 6
  },
  notesText: {
    fontSize: 15,
    lineHeight: 23
  },
  cardHeader: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  sideMeta: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 3
  },
  imageGrid: {
    gap: 10
  },
  imageFrame: {
    width: '100%',
    overflow: 'hidden',
    aspectRatio: 16 / 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: 1
  },
  chartImage: {
    width: '100%',
    height: '100%'
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
  psychSubhead: {
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.8
  },
  psychGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  psychChip: {
    gap: 3,
    borderRadius: 8,
    minWidth: 80,
    padding: 10
  },
  psychChipLabel: {
    fontSize: 10,
    fontWeight: '800'
  },
  psychChipValue: {
    fontSize: 14,
    fontWeight: '800'
  },
  lessonBlock: {
    borderLeftWidth: 3,
    gap: 4,
    paddingLeft: 12
  },
  lessonLabel: {
    fontSize: 11,
    fontWeight: '800'
  },
  lessonText: {
    fontSize: 15,
    lineHeight: 23
  },
  sideColumn: {
    minWidth: 240,
    flex: 1,
    gap: 14
  },
  currentSlBox: {
    borderRadius: 8,
    padding: 12,
    gap: 3
  },
  currentSlLabel: {
    fontSize: 11,
    fontWeight: '800'
  },
  currentSlValue: {
    fontSize: 22,
    fontWeight: '800'
  },
  timelineList: {
    gap: 0
  },
  timelineRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    borderBottomWidth: 1,
    paddingVertical: 10
  },
  timelineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 6
  },
  timelineContent: {
    flex: 1,
    gap: 2
  },
  timelineDate: {
    fontSize: 11,
    fontWeight: '800'
  },
  timelinePrices: {
    fontSize: 14,
    fontWeight: '800'
  },
  timelineReason: {
    fontSize: 12,
    lineHeight: 17
  },
  timelineDelete: {
    fontSize: 20,
    fontWeight: '800',
    paddingHorizontal: 6
  },
  slFormBox: {
    gap: 10,
    marginTop: 4
  },
  slFormButtons: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'flex-end'
  },
  emptyBody: {
    fontSize: 13,
    lineHeight: 19
  }
});
