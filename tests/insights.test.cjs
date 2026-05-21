const assert = require('node:assert/strict');
const fs = require('node:fs');
const Module = require('node:module');
const path = require('node:path');
const ts = require('typescript');

const repoRoot = path.resolve(__dirname, '..');
const sourcePath = path.join(repoRoot, 'lib/trades/insights.ts');
const source = fs.readFileSync(sourcePath, 'utf8');
const output = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2020
  },
  fileName: sourcePath
}).outputText;
const insightModule = new Module(sourcePath, module);
insightModule.filename = sourcePath;
insightModule.paths = Module._nodeModulePaths(repoRoot);
insightModule._compile(output, sourcePath);

const { generateInsightCoach } = insightModule.exports;

const analyticsPath = path.join(repoRoot, 'lib/trades/analytics.ts');
const analyticsSource = fs.readFileSync(analyticsPath, 'utf8');
const analyticsOutput = ts.transpileModule(analyticsSource, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2020
  },
  fileName: analyticsPath
}).outputText;
const analyticsModule = new Module(analyticsPath, module);
analyticsModule.filename = analyticsPath;
analyticsModule.paths = Module._nodeModulePaths(repoRoot);
analyticsModule._compile(analyticsOutput, analyticsPath);

const { calculateStrategyPerformance } = analyticsModule.exports;

function trade(overrides = {}) {
  return {
    asset: { asset_class: 'stock', id: `asset-${overrides.id ?? 'a'}`, symbol: overrides.symbol ?? 'AAPL' },
    id: overrides.id ?? 'trade-1',
    net_pnl: overrides.netPnl ?? null,
    opened_at: overrides.openedAt ?? '2026-05-21T00:00:00.000Z',
    status: overrides.status ?? 'open',
    tags: overrides.tags ?? [],
    ...overrides
  };
}

function tag(name, type = 'setup') {
  return { id: `${type}-${name}`, name, type };
}

const emptyInsight = generateInsightCoach([]);
assert.equal(emptyInsight.id, 'empty-journal');
assert.equal(emptyInsight.sourceTradeIds.length, 0);

const openOnlyInsight = generateInsightCoach([
  trade({ id: 'open-1' }),
  trade({ id: 'open-2' })
]);
assert.equal(openOnlyInsight.id, 'open-only');
assert.deepEqual(openOnlyInsight.sourceTradeIds, ['open-1', 'open-2']);

const largeLossInsight = generateInsightCoach([
  trade({ id: 'loss-1', netPnl: -50, status: 'closed', tags: [tag('Breakout')] }),
  trade({ id: 'loss-2', netPnl: -60, status: 'closed', tags: [tag('Breakout')] }),
  trade({ id: 'loss-3', netPnl: -250, status: 'closed', tags: [tag('Breakout')] }),
  trade({ id: 'win-1', netPnl: 120, status: 'closed', tags: [tag('Breakout')] })
]);
assert.equal(largeLossInsight.id, 'large-loss');
assert.deepEqual(largeLossInsight.sourceTradeIds, ['loss-3']);

const missingSetupInsight = generateInsightCoach([
  trade({ id: 'a', netPnl: 20, status: 'closed', tags: [] }),
  trade({ id: 'b', netPnl: -10, status: 'closed', tags: [] }),
  trade({ id: 'c', netPnl: 30, status: 'closed', tags: [tag('Calm', 'emotion')] })
]);
assert.equal(missingSetupInsight.id, 'missing-setup-context');

const weakTagInsight = generateInsightCoach([
  trade({ id: 'mistake-1', netPnl: -20, status: 'closed', tags: [tag('Chased', 'mistake'), tag('Breakout')] }),
  trade({ id: 'mistake-2', netPnl: -30, status: 'closed', tags: [tag('Chased', 'mistake'), tag('Breakout')] }),
  trade({ id: 'ok-1', netPnl: 10, status: 'closed', tags: [tag('Opening range')] })
]);
assert.equal(weakTagInsight.id, 'weak-tag-mistake-chased');
assert.deepEqual(weakTagInsight.sourceTradeIds, ['mistake-1', 'mistake-2']);

const positiveInsight = generateInsightCoach([
  trade({ id: 'w1', netPnl: 50, status: 'closed', tags: [tag('Trend')] }),
  trade({ id: 'w2', netPnl: 30, status: 'closed', tags: [tag('Trend')] }),
  trade({ id: 'w3', netPnl: 20, status: 'closed', tags: [tag('Trend')] }),
  trade({ id: 'l1', netPnl: -10, status: 'closed', tags: [tag('Pullback')] }),
  trade({ id: 'l2', netPnl: -10, status: 'closed', tags: [tag('Range')] })
]);
assert.equal(positiveInsight.id, 'positive-expectancy');
assert.equal(positiveInsight.severity, 'positive');

const strategyPerformance = calculateStrategyPerformance([
  trade({
    id: 'trend-1',
    netPnl: 120,
    status: 'closed',
    strategy: { id: 'trend', name: 'Trend Continuation' },
    strategy_id: 'trend'
  }),
  trade({
    id: 'trend-2',
    netPnl: -20,
    status: 'closed',
    strategy: { id: 'trend', name: 'Trend Continuation' },
    strategy_id: 'trend'
  }),
  trade({
    id: 'reversal-1',
    netPnl: -50,
    status: 'closed',
    strategy: { id: 'reversal', name: 'Reversal at Level' },
    strategy_id: 'reversal'
  }),
  trade({
    id: 'open-trend',
    netPnl: null,
    status: 'open',
    strategy: { id: 'trend', name: 'Trend Continuation' },
    strategy_id: 'trend'
  })
]);
assert.equal(strategyPerformance.length, 2);
assert.equal(strategyPerformance[0].name, 'Trend Continuation');
assert.equal(strategyPerformance[0].tradeCount, 2);
assert.equal(strategyPerformance[0].netPnl, 100);
assert.equal(strategyPerformance[0].winRate, 0.5);
assert.equal(strategyPerformance[0].profitFactor, 6);
assert.equal(strategyPerformance[1].name, 'Reversal at Level');
assert.equal(strategyPerformance[1].netPnl, -50);

console.log('insights.test.cjs passed');
