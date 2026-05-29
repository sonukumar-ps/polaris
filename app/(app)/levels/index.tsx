import { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  AppShell,
  Card,
  ConfirmDialog,
  friendlyReason,
  InfoTip,
  LoadingState,
  PrimaryButton,
  SectionHeading,
  TextField,
  useAppTheme,
  userMessage
} from '@/lib/ui';
import {
  createSrLevel,
  deleteSrLevel,
  incrementLevelTouch,
  listSrLevels,
  updateSrLevel
} from '@/lib/trades';
import { MAJOR_PAIRS } from '@/lib/trades/checklists/checklist.types';
import { seedSrLevels } from '@/lib/trades/sr-levels/seed-sr-levels';
import type { SrLevelRole, SrLevelRow, SrLevelType } from '@/lib/trades';

type LevelDraft = {
  levelRole: SrLevelRole | '';
  notes: string;
  price: string;
  symbol: string;
  touchCount: string;
  type: SrLevelType;
};

const emptyDraft: LevelDraft = {
  levelRole: '',
  notes: '',
  price: '',
  symbol: 'GBPUSD',
  touchCount: '1',
  type: 'horizontal'
};

export default function LevelsScreen() {
  const theme = useAppTheme();
  const [levels, setLevels] = useState<SrLevelRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSeeding, setIsSeeding] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [draft, setDraft] = useState<LevelDraft>(emptyDraft);
  const [isSaving, setIsSaving] = useState(false);
  const [filterSymbol, setFilterSymbol] = useState<string>('');
  const [openDropdown, setOpenDropdown] = useState<'filter' | 'add-symbol' | null>(null);
  const [pendingAction, setPendingAction] = useState<{
    action: 'touch' | 'archive' | 'delete';
    level: SrLevelRow;
  } | null>(null);

  // Full reload (shows loading state). Used on mount + filter change only.
  async function reload() {
    setIsLoading(true);
    setError(null);
    try {
      const loaded = await listSrLevels({
        activeOnly: true,
        symbol: filterSymbol || undefined
      });
      setLevels(loaded);
    } catch (err) {
      setError(userMessage(err, "Couldn't load levels"));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void reload();
  }, [filterSymbol]);

  // Group levels by symbol
  const groupedLevels = useMemo(() => {
    const groups = new Map<string, SrLevelRow[]>();
    for (const level of levels) {
      const existing = groups.get(level.symbol) ?? [];
      groups.set(level.symbol, [...existing, level]);
    }
    return Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [levels]);

  async function handleSave() {
    const parsed = Number(draft.price);
    if (!parsed || !Number.isFinite(parsed)) {
      setError('Enter a valid price.');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      // Save first — we need the server-generated id for the optimistic insert
      const created = await createSrLevel({
        levelRole: draft.levelRole || null,
        notes: draft.notes.trim() || null,
        price: parsed,
        symbol: draft.symbol,
        touchCount: Number(draft.touchCount) || 1,
        type: draft.type
      });

      setLevels((prev) => [...prev, created].sort((a, b) => {
        if (a.symbol !== b.symbol) return a.symbol.localeCompare(b.symbol);
        return Number(b.price) - Number(a.price);
      }));
      setDraft(emptyDraft);
      setShowAddModal(false);
    } catch (err) {
      setError(userMessage(err, "Couldn't save the level"));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleTouch(id: string) {
    // Snapshot the row's previous values so we can revert exactly
    const previous = levels.find((l) => l.id === id);
    if (!previous) return;

    // Optimistic update — bump touch count + today's date immediately
    const today = new Date().toISOString().slice(0, 10);
    setLevels((prev) =>
      prev.map((l) =>
        l.id === id
          ? { ...l, last_touched_date: today, touch_count: l.touch_count + 1 }
          : l
      )
    );
    setError(null);

    try {
      await incrementLevelTouch(id);
    } catch (err) {
      // Revert to the exact pre-action state — no surprises from unrelated server changes
      setLevels((prev) => prev.map((l) => (l.id === id ? previous : l)));
      console.warn('Touch update failed:', err);
      setError(`Couldn't save that touch — ${friendlyReason(err)}. Your change was reverted.`);
    }
  }

  async function handleDeactivate(id: string) {
    // Snapshot the row so we can put it back if the call fails
    const previous = levels.find((l) => l.id === id);
    if (!previous) return;

    // Optimistic remove from active list
    setLevels((prev) => prev.filter((l) => l.id !== id));
    setError(null);

    try {
      await updateSrLevel(id, { isActive: false });
    } catch (err) {
      // Re-insert the row in its original position
      setLevels((prev) => [...prev, previous].sort((a, b) => {
        if (a.symbol !== b.symbol) return a.symbol.localeCompare(b.symbol);
        return Number(b.price) - Number(a.price);
      }));
      console.warn('Archive failed:', err);
      setError(`Couldn't archive that level — ${friendlyReason(err)}. The level is still here.`);
    }
  }

  async function handleDelete(id: string) {
    const previous = levels.find((l) => l.id === id);
    if (!previous) return;

    setLevels((prev) => prev.filter((l) => l.id !== id));
    setError(null);

    try {
      await deleteSrLevel(id);
    } catch (err) {
      setLevels((prev) => [...prev, previous].sort((a, b) => {
        if (a.symbol !== b.symbol) return a.symbol.localeCompare(b.symbol);
        return Number(b.price) - Number(a.price);
      }));
      console.warn('Delete failed:', err);
      setError(`Couldn't delete that level — ${friendlyReason(err)}. The level is still here.`);
    }
  }


  const filterOptions = [
    { label: 'All pairs', value: '' },
    ...MAJOR_PAIRS.map((p) => ({ label: p, value: p }))
  ];

  return (
    <AppShell activeRoute="levels">
      <View style={styles.headerRow}>
        <SectionHeading
          eyebrow="Reusable database"
          subtitle="Saved support and resistance levels across pairs. Increment touch count when price reacts."
          title="S/R Levels"
        />
        <View style={styles.headerActions}>
          <PrimaryButton onPress={() => setShowAddModal(true)}>+ Add level</PrimaryButton>
        </View>
      </View>

      <Card>
        <View style={styles.filterRow}>
          <Text style={[styles.filterLabel, { color: theme.muted }]}>Filter</Text>
          <DropdownButton
            onOpen={() => setOpenDropdown('filter')}
            placeholder="All pairs"
            value={filterSymbol || 'All pairs'}
          />
        </View>
      </Card>

      {isLoading ? <LoadingState label="Loading levels..." /> : null}
      {error ? (
        <Card style={{ borderColor: theme.danger }}>
          <Text style={[styles.errorText, { color: theme.danger }]}>{error}</Text>
        </Card>
      ) : null}

      {!isLoading && !error && levels.length === 0 && !filterSymbol ? (
        <Card>
          <Text style={[styles.emptyTitle, { color: theme.text }]}>No levels yet</Text>
          <Text style={[styles.emptyBody, { color: theme.muted }]}>
            Build your S/R library to save time on daily checklists. Add levels manually or seed the demo set below.
          </Text>
          <Pressable
            disabled={isSeeding}
            onPress={async () => {
              setIsSeeding(true);
              try {
                const count = await seedSrLevels();
                if (count === 0) {
                  setError('No levels added.');
                } else {
                  await reload();
                }
              } catch (err) {
                setError(userMessage(err, "Couldn't load demo levels"));
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
              {isSeeding ? 'Seeding...' : '🧪 Seed 20 demo levels across major pairs'}
            </Text>
          </Pressable>
        </Card>
      ) : null}

      {!isLoading && !error && levels.length === 0 && filterSymbol ? (
        <Card>
          <Text style={[styles.emptyTitle, { color: theme.text }]}>
            No levels for {filterSymbol}
          </Text>
          <Text style={[styles.emptyBody, { color: theme.muted }]}>
            You haven't saved any S/R levels for this pair yet. Add one with the button above, or change the filter to "All pairs".
          </Text>
          <Pressable
            onPress={() => setFilterSymbol('')}
            style={({ pressed }) => [
              styles.seedButton,
              { backgroundColor: theme.mutedSurface, borderColor: theme.border },
              pressed && styles.pressed
            ]}
          >
            <Text style={[styles.seedButtonText, { color: theme.accent }]}>Clear filter</Text>
          </Pressable>
        </Card>
      ) : null}

      {!isLoading && !error && levels.length > 0 ? (
        <View style={styles.content}>
          <Card>
            <Text style={[styles.summaryLine, { color: theme.text }]}>
              <Text style={{ fontWeight: '800' }}>{levels.length}</Text> active level{levels.length !== 1 ? 's' : ''} across{' '}
              <Text style={{ fontWeight: '800' }}>{groupedLevels.length}</Text> {groupedLevels.length === 1 ? 'pair' : 'pairs'}
            </Text>
          </Card>

          {groupedLevels.map(([symbol, symbolLevels]) => (
            <PairLevelsCard
              key={symbol}
              levels={symbolLevels}
              onDeactivate={(id) => {
                const level = symbolLevels.find((l) => l.id === id);
                if (level) setPendingAction({ action: 'archive', level });
              }}
              onDelete={(id) => {
                const level = symbolLevels.find((l) => l.id === id);
                if (level) setPendingAction({ action: 'delete', level });
              }}
              onTouch={(id) => {
                const level = symbolLevels.find((l) => l.id === id);
                if (level) setPendingAction({ action: 'touch', level });
              }}
              symbol={symbol}
            />
          ))}
        </View>
      ) : null}

      <AddLevelModal
        draft={draft}
        isOpen={showAddModal}
        isSaving={isSaving}
        onClose={() => {
          setShowAddModal(false);
          setDraft(emptyDraft);
          setError(null);
        }}
        onOpenSymbol={() => setOpenDropdown('add-symbol')}
        onSave={handleSave}
        onUpdate={(key, value) => setDraft((d) => ({ ...d, [key]: value }))}
      />

      <SelectModal
        isOpen={openDropdown === 'filter'}
        onClose={() => setOpenDropdown(null)}
        onSelect={(value) => {
          setFilterSymbol(value);
          setOpenDropdown(null);
        }}
        options={filterOptions}
        selectedValue={filterSymbol}
        title="Filter by pair"
      />
      <SelectModal
        isOpen={openDropdown === 'add-symbol'}
        onClose={() => setOpenDropdown(null)}
        onSelect={(value) => {
          setDraft((d) => ({ ...d, symbol: value }));
          setOpenDropdown(null);
        }}
        options={MAJOR_PAIRS.map((p) => ({ label: p, value: p }))}
        selectedValue={draft.symbol}
        title="Select pair"
      />

      <ConfirmDialog
        cancelLabel="Cancel"
        confirmLabel={confirmCopy(pendingAction).confirmLabel}
        destructive={pendingAction?.action === 'delete'}
        isOpen={pendingAction !== null}
        message={confirmCopy(pendingAction).message}
        onCancel={() => setPendingAction(null)}
        onConfirm={() => {
          if (!pendingAction) return;
          const { action, level } = pendingAction;
          setPendingAction(null);
          if (action === 'touch') handleTouch(level.id);
          else if (action === 'archive') handleDeactivate(level.id);
          else if (action === 'delete') handleDelete(level.id);
        }}
        title={confirmCopy(pendingAction).title}
      />
    </AppShell>
  );
}

function confirmCopy(
  pending: { action: 'touch' | 'archive' | 'delete'; level: SrLevelRow } | null
): { confirmLabel: string; message: string; title: string } {
  if (!pending) return { confirmLabel: 'Confirm', message: '', title: '' };
  const { action, level } = pending;
  const priceLabel = `${level.symbol} at ${level.price}`;

  if (action === 'touch') {
    return {
      confirmLabel: 'Record touch',
      message: `This will bump the touch count from ${level.touch_count} to ${level.touch_count + 1} and set the last-touched date to today.`,
      title: `Record a touch on ${priceLabel}?`
    };
  }

  if (action === 'archive') {
    return {
      confirmLabel: 'Archive',
      message: 'The level will be hidden from the active list but kept in the database for future reference.',
      title: `Archive ${priceLabel}?`
    };
  }

  return {
    confirmLabel: 'Delete',
    message: "This will permanently remove the level. You won't be able to recover it.",
    title: `Delete ${priceLabel}?`
  };
}

function PairLevelsCard({
  levels,
  onDeactivate,
  onDelete,
  onTouch,
  symbol
}: {
  levels: SrLevelRow[];
  onDeactivate: (id: string) => void;
  onDelete: (id: string) => void;
  onTouch: (id: string) => void;
  symbol: string;
}) {
  const theme = useAppTheme();
  const supports = levels.filter((l) => l.level_role === 'support').length;
  const resistances = levels.filter((l) => l.level_role === 'resistance').length;
  const flipZones = levels.filter((l) => l.level_role === 'flip_zone').length;

  return (
    <Card>
      <View style={styles.pairHeader}>
        <Text style={[styles.pairSymbol, { color: theme.text }]}>{symbol}</Text>
        <View style={styles.pairCounts}>
          {supports > 0 ? (
            <Text style={[styles.pairCount, { color: theme.positive }]}>
              S: {supports}
            </Text>
          ) : null}
          {resistances > 0 ? (
            <Text style={[styles.pairCount, { color: theme.danger }]}>
              R: {resistances}
            </Text>
          ) : null}
          {flipZones > 0 ? (
            <View style={styles.flipBadge}>
              <Text style={[styles.pairCount, { color: theme.accent }]}>
                ⇋ {flipZones} Flip
              </Text>
              <InfoTip term="flip_zone" />
            </View>
          ) : null}
        </View>
      </View>

      <View style={styles.levelList}>
        {levels.map((level) => (
          <LevelRow
            key={level.id}
            level={level}
            onDeactivate={() => onDeactivate(level.id)}
            onDelete={() => onDelete(level.id)}
            onTouch={() => onTouch(level.id)}
          />
        ))}
      </View>
    </Card>
  );
}

function LevelRow({
  level,
  onDeactivate,
  onDelete,
  onTouch
}: {
  level: SrLevelRow;
  onDeactivate: () => void;
  onDelete: () => void;
  onTouch: () => void;
}) {
  const theme = useAppTheme();
  const roleColor = level.level_role === 'support'
    ? theme.positive
    : level.level_role === 'resistance'
      ? theme.danger
      : theme.accent;

  const typeLabel: Record<string, string> = {
    angular_trendline: 'Trendline',
    dynamic_ema: 'Dynamic EMA',
    horizontal: 'Horizontal'
  };

  const lastTouched = level.last_touched_date
    ? formatDateShort(level.last_touched_date)
    : 'Never';

  return (
    <View style={[styles.levelRow, { borderBottomColor: theme.border }]}>
      <View style={styles.levelMain}>
        <View style={styles.levelTop}>
          <Text style={[styles.levelPrice, { color: theme.text }]}>
            {formatNumber(Number(level.price))}
          </Text>
          {level.level_role ? (
            <View style={[styles.roleBadge, { backgroundColor: roleColor }]}>
              <Text style={styles.roleBadgeText}>
                {level.level_role === 'flip_zone' ? 'Flip' : level.level_role.charAt(0).toUpperCase() + level.level_role.slice(1)}
              </Text>
            </View>
          ) : null}
          <Text style={[styles.typeLabel, { color: theme.muted }]}>
            {typeLabel[level.type] ?? level.type}
          </Text>
        </View>
        <View style={styles.levelMeta}>
          <Text style={[styles.touchCount, { color: theme.text }]}>
            {level.touch_count} touch{level.touch_count !== 1 ? 'es' : ''}
          </Text>
          <Text style={[styles.lastTouched, { color: theme.muted }]}>
            Last: {lastTouched}
          </Text>
        </View>
        {level.notes ? (
          <Text style={[styles.levelNotes, { color: theme.muted }]}>{level.notes}</Text>
        ) : null}
      </View>

      <View style={styles.levelActions}>
        <Pressable
          onPress={onTouch}
          style={({ pressed }) => [
            styles.actionButton,
            { backgroundColor: theme.mutedSurface, borderColor: theme.accent },
            pressed && styles.pressed
          ]}
        >
          <Text style={[styles.actionText, { color: theme.accent }]}>+ touch</Text>
        </Pressable>
        <Pressable
          onPress={onDeactivate}
          style={({ pressed }) => [
            styles.actionButton,
            { backgroundColor: theme.mutedSurface, borderColor: theme.border },
            pressed && styles.pressed
          ]}
        >
          <Text style={[styles.actionText, { color: theme.muted }]}>archive</Text>
        </Pressable>
        <Pressable
          onPress={onDelete}
          style={({ pressed }) => [pressed && styles.pressed]}
        >
          <Text style={[styles.deleteText, { color: theme.danger }]}>×</Text>
        </Pressable>
      </View>
    </View>
  );
}

function AddLevelModal({
  draft,
  isOpen,
  isSaving,
  onClose,
  onOpenSymbol,
  onSave,
  onUpdate
}: {
  draft: LevelDraft;
  isOpen: boolean;
  isSaving: boolean;
  onClose: () => void;
  onOpenSymbol: () => void;
  onSave: () => void;
  onUpdate: <K extends keyof LevelDraft>(key: K, value: LevelDraft[K]) => void;
}) {
  const theme = useAppTheme();

  return (
    <Modal animationType="fade" onRequestClose={onClose} transparent visible={isOpen}>
      <View style={styles.modalBackdrop}>
        <Card style={styles.addModalCard}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Add S/R level</Text>
            <Pressable onPress={onClose} style={({ pressed }) => [pressed && styles.pressed]}>
              <Text style={[styles.closeText, { color: theme.muted }]}>Close</Text>
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.modalFields}>
            <View style={styles.fieldRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.fieldLabel, { color: theme.muted }]}>Symbol</Text>
                <Pressable
                  onPress={onOpenSymbol}
                  style={({ pressed }) => [
                    styles.dropdownBtn,
                    { backgroundColor: theme.mutedSurface, borderColor: theme.border },
                    pressed && styles.pressed
                  ]}
                >
                  <Text style={[styles.dropdownVal, { color: theme.text }]}>{draft.symbol}</Text>
                </Pressable>
              </View>
              <TextField
                inputMode="decimal"
                label="Price"
                onChangeText={(v) => onUpdate('price', v)}
                placeholder="1.2750"
                value={draft.price}
              />
            </View>

            <View>
              <View style={styles.labelRow}>
                <Text style={[styles.fieldLabel, { color: theme.muted }]}>Type</Text>
                <InfoTip term="dynamic_ema" />
              </View>
              <View style={styles.chipRow}>
                {(
                  [
                    { key: 'horizontal' as SrLevelType, label: 'Horizontal' },
                    { key: 'angular_trendline' as SrLevelType, label: 'Trendline' },
                    { key: 'dynamic_ema' as SrLevelType, label: 'Dynamic EMA' }
                  ]
                ).map(({ key, label }) => {
                  const isSelected = draft.type === key;
                  return (
                    <Pressable
                      key={key}
                      onPress={() => onUpdate('type', key)}
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

            <View>
              <View style={styles.labelRow}>
                <Text style={[styles.fieldLabel, { color: theme.muted }]}>Role</Text>
                <InfoTip term="flip_zone" />
              </View>
              <View style={styles.chipRow}>
                {(
                  [
                    { key: 'support' as SrLevelRole, label: 'Support' },
                    { key: 'resistance' as SrLevelRole, label: 'Resistance' },
                    { key: 'flip_zone' as SrLevelRole, label: 'Flip Zone' }
                  ]
                ).map(({ key, label }) => {
                  const isSelected = draft.levelRole === key;
                  return (
                    <Pressable
                      key={key}
                      onPress={() => onUpdate('levelRole', isSelected ? '' : key)}
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

            <TextField
              inputMode="decimal"
              label="Touch count"
              labelExtra={<InfoTip term="sr_touch_count" />}
              onChangeText={(v) => onUpdate('touchCount', v)}
              placeholder="1"
              value={draft.touchCount}
            />

            <TextField
              label="Notes"
              multiline
              onChangeText={(v) => onUpdate('notes', v)}
              placeholder="Weekly support, defended 3x"
              value={draft.notes}
            />

            <PrimaryButton disabled={isSaving} onPress={onSave}>
              {isSaving ? 'Saving...' : 'Save level'}
            </PrimaryButton>
          </ScrollView>
        </Card>
      </View>
    </Modal>
  );
}

function DropdownButton({
  onOpen,
  placeholder,
  value
}: {
  onOpen: () => void;
  placeholder: string;
  value: string;
}) {
  const theme = useAppTheme();

  return (
    <Pressable
      onPress={onOpen}
      style={({ pressed }) => [
        styles.dropdownBtn,
        { backgroundColor: theme.mutedSurface, borderColor: theme.border },
        pressed && styles.pressed
      ]}
    >
      <Text style={[styles.dropdownVal, { color: value ? theme.text : theme.muted }]}>
        {value || placeholder}
      </Text>
      <Text style={[styles.dropdownChevron, { color: theme.muted }]}>⌄</Text>
    </Pressable>
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
  options: { label: string; value: string }[];
  selectedValue: string;
  title: string;
}) {
  const theme = useAppTheme();

  return (
    <Modal animationType="fade" onRequestClose={onClose} transparent visible={isOpen}>
      <View style={styles.modalBackdrop}>
        <Card style={styles.selectModalCard}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>{title}</Text>
            <Pressable onPress={onClose} style={({ pressed }) => [pressed && styles.pressed]}>
              <Text style={[styles.closeText, { color: theme.muted }]}>Close</Text>
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={{ gap: 8 }}>
            {options.map((opt) => {
              const isSelected = opt.value === selectedValue;
              return (
                <Pressable
                  key={opt.value || 'all'}
                  onPress={() => onSelect(opt.value)}
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
                    {opt.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </Card>
      </View>
    </Modal>
  );
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('en', {
    maximumFractionDigits: 5,
    minimumFractionDigits: 0
  }).format(value);
}

function formatDateShort(value: string) {
  return new Intl.DateTimeFormat('en', {
    day: '2-digit',
    month: 'short'
  }).format(new Date(value));
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, alignItems: 'flex-start', justifyContent: 'space-between' },
  headerActions: { gap: 8 },
  content: { gap: 12 },
  filterRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  filterLabel: { fontSize: 13, fontWeight: '800' },
  summaryLine: { fontSize: 14, lineHeight: 21 },
  emptyTitle: { fontSize: 17, fontWeight: '800', marginBottom: 6 },
  emptyBody: { fontSize: 14, lineHeight: 21, marginBottom: 12 },
  errorText: { fontSize: 14, fontWeight: '800' },
  seedButton: { alignItems: 'center', borderRadius: 8, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 10 },
  seedButtonText: { fontSize: 13, fontWeight: '800' },

  pairHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  pairSymbol: { fontSize: 18, fontWeight: '800' },
  pairCounts: { flexDirection: 'row', gap: 10 },
  pairCount: { fontSize: 12, fontWeight: '800' },

  levelList: { gap: 0 },
  levelRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    borderBottomWidth: 1,
    paddingVertical: 12
  },
  levelMain: { flex: 1, gap: 5 },
  levelTop: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  levelPrice: { fontSize: 16, fontWeight: '800' },
  roleBadge: { borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  roleBadgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: '800' },
  typeLabel: { fontSize: 11, fontWeight: '800' },
  levelMeta: { flexDirection: 'row', gap: 12 },
  touchCount: { fontSize: 13, fontWeight: '800' },
  lastTouched: { fontSize: 12 },
  levelNotes: { fontSize: 12, lineHeight: 17 },
  levelActions: { gap: 6, alignItems: 'flex-end' },
  actionButton: { borderRadius: 6, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 4 },
  actionText: { fontSize: 11, fontWeight: '800' },
  deleteText: { fontSize: 18, fontWeight: '800', paddingHorizontal: 4, paddingTop: 4 },

  modalBackdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.38)', padding: 18 },
  addModalCard: { width: '100%', maxWidth: 560, maxHeight: '90%' },
  selectModalCard: { width: '100%', maxWidth: 500, maxHeight: '82%' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  modalTitle: { fontSize: 18, fontWeight: '800' },
  closeText: { fontSize: 13, fontWeight: '800' },
  modalFields: { gap: 14, paddingBottom: 4 },
  fieldRow: { flexDirection: 'row', gap: 12 },
  fieldLabel: { fontSize: 13, fontWeight: '800', marginBottom: 6 },
  dropdownBtn: { minHeight: 50, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'space-between', borderRadius: 8, borderWidth: 1, paddingHorizontal: 13, paddingVertical: 10 },
  dropdownVal: { fontSize: 15, fontWeight: '800' },
  dropdownChevron: { fontSize: 18, fontWeight: '800' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  chip: { borderRadius: 8, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 7 },
  chipText: { fontSize: 13, fontWeight: '800' },
  selectOption: { borderRadius: 8, borderWidth: 1, padding: 12 },
  selectOptionText: { fontSize: 15, fontWeight: '800' },
  pressed: { opacity: 0.72 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  flipBadge: { flexDirection: 'row', alignItems: 'center', gap: 5 }
});
