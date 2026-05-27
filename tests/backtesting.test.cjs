const assert = require('node:assert/strict');
const fs = require('node:fs');
const Module = require('node:module');
const path = require('node:path');
const ts = require('typescript');

const repoRoot = path.resolve(__dirname, '..');

function loadModule(relPath, deps = {}) {
  const sourcePath = path.join(repoRoot, relPath);
  const source = fs.readFileSync(sourcePath, 'utf8');
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020
    },
    fileName: sourcePath
  }).outputText;

  const mod = new Module(sourcePath, module);
  mod.filename = sourcePath;
  mod.paths = Module._nodeModulePaths(repoRoot);

  const originalLoad = mod._resolveFilename;
  const require_ = mod.require.bind(mod);
  mod.require = function (id) {
    if (deps[id]) return deps[id];
    if (id.startsWith('@/')) {
      const relId = id.replace('@/', '');
      const candidates = [
        path.join(repoRoot, relId + '.ts'),
        path.join(repoRoot, relId + '/index.ts'),
        path.join(repoRoot, relId)
      ];
      for (const c of candidates) {
        if (fs.existsSync(c)) {
          return loadModule(path.relative(repoRoot, c), deps);
        }
      }
    }
    return require_(id);
  };

  mod._compile(output, sourcePath);
  return mod.exports;
}

// ─── Stub supabase so psychology.ts can be loaded without network ──────────────
const supabaseStub = {
  auth: { getUser: async () => ({ data: { user: { id: 'test-user' } }, error: null }) },
  from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }) })
};

const psychologyModule = loadModule('lib/trades/backtesting/psychology.ts', { '@/lib/supabase': { supabase: supabaseStub } });
const executionModule = loadModule('lib/trades/backtesting/execution-score.ts');
const segmentedModule = loadModule('lib/trades/backtesting/segmented-analytics.ts');
const mentorModule = loadModule('lib/trades/backtesting/mentor-insights.ts', {
  '../insights': { Insight: null },
  '../service': {},
  './execution-score': executionModule
});

const { calculateExecutionScores } = executionModule;
const {
  calculateSessionPerformance,
  calculateDayPerformance,
  calculateQualityCorrelation,
  calculateConvictionCorrelation,
  calculateMarketConditionPerformance,
  analyzePostLossBehaviour
} = segmentedModule;
const {
  buildRevengeTradeInsight,
  buildSetupQualityInsight,
  buildEnergyCorrelationInsight,
  buildEarlyExitInsight,
  buildSessionSpecializationInsight,
  buildStopLossDisciplineInsight,
  buildConvictionInsight,
  buildMarketConditionMismatchInsight,
  buildBestProcessInsight
} = mentorModule;

// ─── Helper factories ──────────────────────────────────────────────────────────

let tradeCounter = 0;
function makeTrade(overrides = {}) {
  tradeCounter += 1;
  const id = overrides.id ?? `trade-${tradeCounter}`;
  const openedAt = overrides.openedAt ?? `2026-05-${String(tradeCounter % 28 + 1).padStart(2, '0')}T09:00:00.000Z`;
  const closedAt = overrides.closedAt ?? openedAt.replace('T09', 'T11');

  return {
    asset: { asset_class: 'forex', id: `asset-${id}`, symbol: overrides.symbol ?? 'EURUSD' },
    closed_at: closedAt,
    fees: 0,
    gross_pnl: overrides.netPnl ?? null,
    id,
    net_pnl: overrides.netPnl ?? null,
    opened_at: openedAt,
    planned_rr: overrides.plannedRr ?? null,
    psychology: overrides.psychology ?? null,
    r_multiple: overrides.rMultiple ?? (overrides.netPnl !== null && overrides.netPnl !== undefined ? (overrides.netPnl > 0 ? 1 : -1) : null),
    risk_amount: 100,
    status: overrides.status ?? (overrides.netPnl !== null && overrides.netPnl !== undefined ? 'closed' : 'open'),
    strategy: overrides.strategy ?? null,
    strategy_id: overrides.strategyId ?? null,
    tags: overrides.tags ?? [],
    ...overrides
  };
}

function makePsychology(overrides = {}) {
  return {
    conviction_level: null,
    created_at: '2026-05-01T00:00:00.000Z',
    emotional_state: null,
    energy_level: null,
    entry_timing: null,
    exit_timing: null,
    focus_level: null,
    followed_plan: null,
    htf_bias: null,
    id: `psych-${Math.random()}`,
    lesson: null,
    market_condition: null,
    moved_stop_loss: null,
    moved_take_profit: null,
    position_size_adherence: null,
    session: null,
    setup_quality: null,
    trade_id: 'trade-x',
    updated_at: '2026-05-01T00:00:00.000Z',
    user_id: 'user-1',
    ...overrides
  };
}

// ─── Execution Score Tests ─────────────────────────────────────────────────────

// All 5 fields filled, perfect score
const perfectTrade = makeTrade({
  id: 'perf-1',
  netPnl: 100,
  psychology: makePsychology({
    entry_timing: 'on_time',
    exit_timing: 'on_time',
    followed_plan: true,
    moved_stop_loss: false,
    position_size_adherence: 'correct'
  })
});
const perfectScores = calculateExecutionScores([perfectTrade]);
assert.equal(perfectScores.length, 1);
assert.equal(perfectScores[0].score, 100);
assert.equal(perfectScores[0].breakdown.followedPlanScore, 25);
assert.equal(perfectScores[0].breakdown.entryTimingScore, 25);
assert.equal(perfectScores[0].breakdown.exitTimingScore, 25);
assert.equal(perfectScores[0].breakdown.sizeAdherenceScore, 15);
assert.equal(perfectScores[0].breakdown.stopDisciplineScore, 10);

// Partial fields — normalization: only followedPlan + entryTiming (max=50), both perfect → 100
const partialTrade = makeTrade({
  id: 'partial-1',
  netPnl: 50,
  psychology: makePsychology({
    entry_timing: 'on_time',
    followed_plan: true
  })
});
const partialScores = calculateExecutionScores([partialTrade]);
assert.equal(partialScores.length, 1);
assert.equal(partialScores[0].score, 100);

// Not enough fields (only 1 filled) — excluded
const thinTrade = makeTrade({
  id: 'thin-1',
  netPnl: 20,
  psychology: makePsychology({ followed_plan: true })
});
const thinScores = calculateExecutionScores([thinTrade]);
assert.equal(thinScores.length, 0);

// No psychology — excluded
const noPsychTrade = makeTrade({ id: 'nopsych-1', netPnl: 30, psychology: null });
const noPsychScores = calculateExecutionScores([noPsychTrade]);
assert.equal(noPsychScores.length, 0);

// Bad execution: moved SL, early exit, oversized
const badTrade = makeTrade({
  id: 'bad-1',
  netPnl: -50,
  psychology: makePsychology({
    entry_timing: 'missed_better',
    exit_timing: 'early',
    followed_plan: false,
    moved_stop_loss: true,
    position_size_adherence: 'oversized'
  })
});
const badScores = calculateExecutionScores([badTrade]);
assert.equal(badScores.length, 1);
assert.equal(badScores[0].score, 0);

console.log('✓ Execution score tests passed');

// ─── Session Performance Tests ────────────────────────────────────────────────

const sessionTrades = [
  makeTrade({ netPnl: 100, rMultiple: 2, psychology: makePsychology({ session: 'london' }) }),
  makeTrade({ netPnl: 80, rMultiple: 1.5, psychology: makePsychology({ session: 'london' }) }),
  makeTrade({ netPnl: -40, rMultiple: -1, psychology: makePsychology({ session: 'london' }) }),
  makeTrade({ netPnl: -60, rMultiple: -1.5, psychology: makePsychology({ session: 'new_york' }) }),
  makeTrade({ netPnl: -20, rMultiple: -0.5, psychology: makePsychology({ session: 'new_york' }) }),
  makeTrade({ netPnl: 30, psychology: null }) // excluded — no session
];

const sessionPerf = calculateSessionPerformance(sessionTrades);
assert.equal(sessionPerf.length, 2);
const londonPerf = sessionPerf.find((s) => s.session === 'london');
assert.ok(londonPerf);
assert.equal(londonPerf.tradeCount, 3);
assert.ok(Math.abs(londonPerf.winRate - 2 / 3) < 0.001);
// london netPnl = 140 > ny netPnl = -80, so london is first
assert.equal(sessionPerf[0].session, 'london');

// Trades with no session data → empty
const noSessionPerf = calculateSessionPerformance([makeTrade({ netPnl: 50, psychology: null })]);
assert.equal(noSessionPerf.length, 0);

console.log('✓ Session performance tests passed');

// ─── Quality Correlation Tests ─────────────────────────────────────────────────

const qualityTrades = [
  makeTrade({ netPnl: 100, rMultiple: 2, psychology: makePsychology({ setup_quality: 5 }) }),
  makeTrade({ netPnl: 80, rMultiple: 1.5, psychology: makePsychology({ setup_quality: 5 }) }),
  makeTrade({ netPnl: -20, rMultiple: -1, psychology: makePsychology({ setup_quality: 1 }) }),
  makeTrade({ netPnl: -30, rMultiple: -1.5, psychology: makePsychology({ setup_quality: 1 }) }),
  makeTrade({ netPnl: 10, rMultiple: 0.5, psychology: makePsychology({ setup_quality: 3 }) }) // only 1 trade, excluded
];

const qualityBuckets = calculateQualityCorrelation(qualityTrades);
// q=3 has only 1 trade, excluded (min 2)
assert.ok(!qualityBuckets.find((b) => b.qualityScore === 3));
assert.ok(qualityBuckets.find((b) => b.qualityScore === 5));
assert.ok(qualityBuckets.find((b) => b.qualityScore === 1));
// sorted ascending by qualityScore
assert.equal(qualityBuckets[0].qualityScore, 1);

console.log('✓ Quality correlation tests passed');

// ─── Post-Loss Behaviour Tests ────────────────────────────────────────────────

// 5 consecutive losses means the 5 trades that follow them are all post-loss entries
const postLossBase = '2026-05-01T';
const postLossTrades = [
  makeTrade({ id: 'pl-0', netPnl: -50, openedAt: postLossBase + '08:00:00.000Z', closedAt: postLossBase + '08:30:00.000Z' }),
  makeTrade({ id: 'pl-1', netPnl: -20, openedAt: postLossBase + '09:00:00.000Z', closedAt: postLossBase + '09:30:00.000Z' }),
  makeTrade({ id: 'pl-2', netPnl: -30, openedAt: postLossBase + '10:00:00.000Z', closedAt: postLossBase + '10:30:00.000Z' }),
  makeTrade({ id: 'pl-3', netPnl: -10, openedAt: postLossBase + '11:00:00.000Z', closedAt: postLossBase + '11:30:00.000Z' }),
  makeTrade({ id: 'pl-4', netPnl: -15, openedAt: postLossBase + '12:00:00.000Z', closedAt: postLossBase + '12:30:00.000Z' }),
  makeTrade({ id: 'pl-5', netPnl: 20, openedAt: postLossBase + '13:00:00.000Z', closedAt: postLossBase + '13:30:00.000Z' })
];
// Post-loss trades: pl-1, pl-2, pl-3, pl-4, pl-5 (each follows a loss)
const postLossResult = analyzePostLossBehaviour(postLossTrades);
assert.ok(postLossResult !== null);
assert.equal(postLossResult.postLossTradeCount, 5);
assert.ok(postLossResult.baselineWinRate > 0);

// Fewer than 5 post-loss trades → null (only 2 losses → 2 post-loss trades)
const fewPostLoss = [
  makeTrade({ id: 'few-1', netPnl: -50, openedAt: postLossBase + '09:00:00.000Z', closedAt: postLossBase + '09:30:00.000Z' }),
  makeTrade({ id: 'few-2', netPnl: 20, openedAt: postLossBase + '10:00:00.000Z', closedAt: postLossBase + '10:30:00.000Z' }),
  makeTrade({ id: 'few-3', netPnl: -10, openedAt: postLossBase + '11:00:00.000Z', closedAt: postLossBase + '11:30:00.000Z' }),
  makeTrade({ id: 'few-4', netPnl: 15, openedAt: postLossBase + '12:00:00.000Z', closedAt: postLossBase + '12:30:00.000Z' })
];
const fewResult = analyzePostLossBehaviour(fewPostLoss);
assert.equal(fewResult, null);

console.log('✓ Post-loss behaviour tests passed');

// ─── Mentor Insight Rule Tests ────────────────────────────────────────────────

// buildSetupQualityInsight — triggers with clear spread
function makeQualityTrades(n, quality, netPnl, rMultiple) {
  return Array.from({ length: n }, () =>
    makeTrade({ netPnl, rMultiple, psychology: makePsychology({ setup_quality: quality }) })
  );
}
const qualityInsightTrades = [
  ...makeQualityTrades(5, 5, 100, 2.5),
  ...makeQualityTrades(5, 1, -30, -1.0)
];
const qualityInsight = buildSetupQualityInsight(qualityInsightTrades);
assert.ok(qualityInsight !== null);
assert.equal(qualityInsight.id, 'setup-quality-filter');
assert.equal(qualityInsight.severity, 'positive');

// Not enough trades in each bucket
const qualityInsightFew = buildSetupQualityInsight([
  ...makeQualityTrades(3, 5, 100, 2.5),
  ...makeQualityTrades(3, 1, -30, -1.0)
]);
assert.equal(qualityInsightFew, null);

// buildEnergyCorrelationInsight — triggers with low energy underperformance
function makeEnergyTrades(n, energy, netPnl) {
  return Array.from({ length: n }, () =>
    makeTrade({ netPnl, psychology: makePsychology({ energy_level: energy }) })
  );
}
const energyTrades = [
  ...makeEnergyTrades(10, 4, 50),  // good energy → wins
  ...makeEnergyTrades(5, 1, -20),  // low energy → losses
];
const energyInsight = buildEnergyCorrelationInsight(energyTrades);
assert.ok(energyInsight !== null);
assert.equal(energyInsight.id, 'energy-correlation');

// Not enough low energy trades
const energyFew = buildEnergyCorrelationInsight([...makeEnergyTrades(3, 1, -20), ...makeEnergyTrades(5, 4, 50)]);
assert.equal(energyFew, null);

// buildSessionSpecializationInsight — triggers when one session dominates
function makeSessionTrades(n, session, netPnl) {
  return Array.from({ length: n }, () =>
    makeTrade({ netPnl, psychology: makePsychology({ session }) })
  );
}
const sessionInsightTrades = [
  ...makeSessionTrades(5, 'london', 50),   // all wins in london
  ...makeSessionTrades(8, 'new_york', -20) // mostly losses in new_york
];
const sessionInsight = buildSessionSpecializationInsight(sessionInsightTrades);
assert.ok(sessionInsight !== null);
assert.ok(sessionInsight.id.startsWith('session-specialization'));

// Not enough trades in session
const sessionFew = buildSessionSpecializationInsight([...makeSessionTrades(3, 'london', 50)]);
assert.equal(sessionFew, null);

// buildStopLossDisciplineInsight — triggers when moving SL hurts
function makeSLTrades(n, moved, netPnl) {
  return Array.from({ length: n }, () =>
    makeTrade({ netPnl, psychology: makePsychology({ moved_stop_loss: moved }) })
  );
}
const slTrades = [
  ...makeSLTrades(5, true, -40),   // moved SL → big losses
  ...makeSLTrades(5, false, 60)    // held SL → wins
];
const slInsight = buildStopLossDisciplineInsight(slTrades);
assert.ok(slInsight !== null);
assert.equal(slInsight.id, 'stop-loss-discipline');

// Not enough trades
const slFew = buildStopLossDisciplineInsight([...makeSLTrades(3, true, -40), ...makeSLTrades(3, false, 60)]);
assert.equal(slFew, null);

// buildConvictionInsight — triggers when high conviction outperforms
function makeConvictionTrades(n, conviction, rMultiple, netPnl) {
  return Array.from({ length: n }, () =>
    makeTrade({ netPnl, rMultiple, psychology: makePsychology({ conviction_level: conviction }) })
  );
}
const convictionTrades = [
  ...makeConvictionTrades(5, 9, 2.5, 100),  // high conviction → great R
  ...makeConvictionTrades(5, 2, -1.0, -40)  // low conviction → bad R
];
const convictionInsight = buildConvictionInsight(convictionTrades);
assert.ok(convictionInsight !== null);
assert.equal(convictionInsight.id, 'conviction-calibration');

// buildBestProcessInsight — triggers with 5+ scored trades
const processableTrades = Array.from({ length: 6 }, (_, i) =>
  makeTrade({
    id: `proc-${i}`,
    netPnl: i % 2 === 0 ? 50 : -30,
    psychology: makePsychology({
      entry_timing: 'on_time',
      followed_plan: true
    })
  })
);
const bestProcess = buildBestProcessInsight(processableTrades);
assert.ok(bestProcess !== null);
assert.equal(bestProcess.id, 'best-process');
assert.equal(bestProcess.sourceTradeIds.length, 5);

// Not enough trades with execution data
const processableFew = buildBestProcessInsight([
  makeTrade({ netPnl: 50, psychology: makePsychology({ followed_plan: true, entry_timing: 'on_time' }) }),
  makeTrade({ netPnl: 30, psychology: makePsychology({ followed_plan: true, entry_timing: 'on_time' }) })
]);
assert.equal(processableFew, null);

// buildRevengeTradeInsight — triggers on cluster after loss (trades must have psychology records)
const revengeBase = '2026-05-01T';
const psych = makePsychology({ emotional_state: 'frustrated' });
const revengeTrades = [
  makeTrade({ id: 'rev-0', netPnl: -50, openedAt: revengeBase + '09:00:00.000Z', closedAt: revengeBase + '09:30:00.000Z', psychology: psych }),
  makeTrade({ id: 'rev-1', netPnl: -20, openedAt: revengeBase + '09:45:00.000Z', closedAt: revengeBase + '10:00:00.000Z', psychology: psych }),
  makeTrade({ id: 'rev-2', netPnl: -30, openedAt: revengeBase + '10:00:00.000Z', closedAt: revengeBase + '10:30:00.000Z', psychology: psych }),
  makeTrade({ id: 'rev-3', netPnl: 10, openedAt: '2026-05-02T09:00:00.000Z', closedAt: '2026-05-02T11:00:00.000Z', psychology: psych })
];
const revengeInsight = buildRevengeTradeInsight(revengeTrades);
assert.ok(revengeInsight !== null);
assert.equal(revengeInsight.id, 'revenge-trade-cluster');

// No psychology data → null (guard fires)
const noRevenge = buildRevengeTradeInsight([
  makeTrade({ netPnl: -50, openedAt: revengeBase + '09:00:00.000Z', closedAt: revengeBase + '09:30:00.000Z' }),
  makeTrade({ netPnl: -20, openedAt: revengeBase + '09:45:00.000Z', closedAt: revengeBase + '10:15:00.000Z' }),
  makeTrade({ netPnl: -30, openedAt: revengeBase + '10:00:00.000Z', closedAt: revengeBase + '10:30:00.000Z' })
]);
assert.equal(noRevenge, null);

console.log('✓ Mentor insight rule tests passed');

console.log('\nbacktesting.test.cjs passed');
