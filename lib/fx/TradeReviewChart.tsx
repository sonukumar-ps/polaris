import { Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useEffect, useMemo, useRef, useState } from 'react';
import type {
  IChartApi,
  ISeriesApi,
  IPriceLine,
  ISeriesMarkersPluginApi,
  CandlestickData,
  SeriesMarker,
  Time
} from 'lightweight-charts';

import { supabase } from '@/lib/supabase';
import { InfoTip, useAppTheme, userMessage } from '@/lib/ui';

import { getBars } from './cache';
import type { FxBar } from './cache';

const SUPPORTED_FX_PAIRS = new Set([
  'EURUSD', 'USDJPY', 'GBPUSD', 'USDCHF', 'AUDUSD', 'USDCAD', 'NZDUSD'
]);

const PAD_HOURS = { '1h': 48, '1d': 30 * 24 };

export type ReviewTrade = {
  closedAt: string | null;
  direction: 'long' | 'short';
  entryPrice: number;
  exitPrice: number | null;
  openedAt: string;
  stopLossPrice: number | null;
  symbol: string;
  takeProfitPrice: number | null;
};

type Excursion = {
  // Both reported as POSITIVE distances from entry, in price units.
  mae: number;
  maeAt: number;  // unix seconds
  maePrice: number;
  mfe: number;
  mfeAt: number;
  mfePrice: number;
};

/**
 * Trade-review chart powered by TradingView Lightweight Charts.
 *
 * - Candlestick series from getBars() (IndexedDB-cached, never hits Supabase
 *   twice for the same historical window)
 * - Entry/exit markers + price lines, plus SL/TP and MAE/MFE lines when known
 * - Toggle between 1h and 1d for the same trade — both timeframes are in DB
 * - All times rendered in UTC (matching how bars are stored)
 *
 * Web-only: lightweight-charts uses the browser canvas API. On native the
 * component renders a placeholder with a note pointing to the web app.
 */
export function TradeReviewChart({ trade }: { trade: ReviewTrade }) {
  const theme = useAppTheme();
  const [timeframe, setTimeframe] = useState<'1h' | '1d'>('1h');
  const [bars, setBars] = useState<FxBar[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hoveredBar, setHoveredBar] = useState<FxBar | null>(null);

  const symbol = trade.symbol.toUpperCase();
  const isSupported = SUPPORTED_FX_PAIRS.has(symbol);
  const isWeb = Platform.OS === 'web';

  // ── Bar fetch ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!isSupported) return;

    let isActive = true;
    async function load() {
      setIsLoading(true);
      setError(null);
      try {
        const openMs = new Date(trade.openedAt).getTime();
        const closeMs = trade.closedAt ? new Date(trade.closedAt).getTime() : openMs;
        const padMs = PAD_HOURS[timeframe] * 3600e3;
        const fromISO = new Date(openMs - padMs).toISOString();
        const toISO = new Date(closeMs + padMs).toISOString();

        const fetched = await getBars(supabase, symbol, timeframe, fromISO, toISO);
        if (isActive) setBars(fetched);
      } catch (err) {
        if (isActive) setError(userMessage(err, "Couldn't load chart data"));
      } finally {
        if (isActive) setIsLoading(false);
      }
    }
    void load();
    return () => {
      isActive = false;
    };
  }, [isSupported, symbol, timeframe, trade.openedAt, trade.closedAt]);

  // ── MAE/MFE computation ───────────────────────────────────────────
  const excursion = useMemo<Excursion | null>(() => {
    if (bars.length === 0 || !trade.closedAt) return null;
    const entryMs = new Date(trade.openedAt).getTime();
    const exitMs = new Date(trade.closedAt).getTime();
    const inTrade = bars.filter((b) => {
      const t = new Date(b.ts).getTime();
      return t >= entryMs && t <= exitMs;
    });
    if (inTrade.length === 0) return null;

    let worstAgainst = trade.entryPrice;  // "against" = adverse for the position
    let bestFor = trade.entryPrice;
    let worstBar: FxBar = inTrade[0];
    let bestBar: FxBar = inTrade[0];

    for (const b of inTrade) {
      if (trade.direction === 'long') {
        if (b.low < worstAgainst) {
          worstAgainst = b.low;
          worstBar = b;
        }
        if (b.high > bestFor) {
          bestFor = b.high;
          bestBar = b;
        }
      } else {
        if (b.high > worstAgainst) {
          worstAgainst = b.high;
          worstBar = b;
        }
        if (b.low < bestFor) {
          bestFor = b.low;
          bestBar = b;
        }
      }
    }

    return {
      mae: Math.abs(trade.entryPrice - worstAgainst),
      maeAt: Math.floor(new Date(worstBar.ts).getTime() / 1000),
      maePrice: worstAgainst,
      mfe: Math.abs(bestFor - trade.entryPrice),
      mfeAt: Math.floor(new Date(bestBar.ts).getTime() / 1000),
      mfePrice: bestFor
    };
  }, [bars, trade]);

  // ── Native fallback ────────────────────────────────────────────────
  if (!isWeb) {
    return (
      <View style={[styles.fallback, { backgroundColor: theme.mutedSurface }]}>
        <Text style={[styles.fallbackTitle, { color: theme.text }]}>Chart view</Text>
        <Text style={[styles.fallbackBody, { color: theme.muted }]}>
          The interactive review chart is available in the web app. Open this trade in a browser to see
          the candlestick view with entry/exit markers and MAE/MFE.
        </Text>
        <TradingViewAttribution muted={theme.muted} accent={theme.accent} />
      </View>
    );
  }

  // ── Non-supported pair ─────────────────────────────────────────────
  if (!isSupported) return null;

  return (
    <View style={styles.wrap}>
      <View style={styles.headerRow}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={[styles.title, { color: theme.text }]}>
            {symbol} chart
          </Text>
          <InfoTip
            title="Reference chart"
            definition="Candles are Dukascopy bid prices, served from local cache after first load. Your fill (entry/exit) is overlaid. Note that your broker's spread will explain part of any gap between your fill and the bar."
          />
        </View>
        <View style={[styles.tfToggle, { backgroundColor: theme.mutedSurface, borderColor: theme.border }]}>
          {(['1h', '1d'] as const).map((tf) => {
            const isSelected = timeframe === tf;
            return (
              <Pressable
                key={tf}
                onPress={() => setTimeframe(tf)}
                style={({ pressed }) => [
                  styles.tfOption,
                  { backgroundColor: isSelected ? theme.card : 'transparent' },
                  pressed && styles.pressed
                ]}
              >
                <Text style={[
                  styles.tfOptionText,
                  { color: isSelected ? theme.accent : theme.muted }
                ]}>
                  {tf}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {isLoading ? (
        <Text style={[styles.loading, { color: theme.muted }]}>Loading bars…</Text>
      ) : null}
      {error ? <Text style={[styles.error, { color: theme.danger }]}>{error}</Text> : null}

      {!isLoading && !error ? (
        <ChartCanvas
          bars={bars}
          excursion={excursion}
          onHoverBar={setHoveredBar}
          theme={theme}
          timeframe={timeframe}
          trade={trade}
        />
      ) : null}

      {/* Tooltip / legend */}
      {hoveredBar ? (
        <View style={[styles.tooltip, { backgroundColor: theme.mutedSurface, borderColor: theme.border }]}>
          <Text style={[styles.tooltipTs, { color: theme.muted }]}>
            {formatUtc(hoveredBar.ts)} UTC
          </Text>
          <View style={styles.tooltipRow}>
            <TooltipChip label="O" value={formatPrice(hoveredBar.open, symbol)} color={theme.text} />
            <TooltipChip label="H" value={formatPrice(hoveredBar.high, symbol)} color={theme.positive} />
            <TooltipChip label="L" value={formatPrice(hoveredBar.low, symbol)} color={theme.danger} />
            <TooltipChip label="C" value={formatPrice(hoveredBar.close, symbol)} color={theme.text} />
          </View>
        </View>
      ) : null}

      {/* MAE/MFE chips */}
      {excursion ? (
        <View style={styles.excursionRow}>
          <ExcursionChip
            background={theme.dangerMuted}
            color={theme.danger}
            label="MAE"
            value={`${formatPips(excursion.mae, symbol)} pips`}
          />
          <ExcursionChip
            background={theme.positiveMuted}
            color={theme.positive}
            label="MFE"
            value={`${formatPips(excursion.mfe, symbol)} pips`}
          />
          <InfoTip
            title="MAE / MFE — what these mean"
            definition={`Maximum Adverse Excursion is the worst the position went underwater between entry and exit. Maximum Favorable Excursion is the best it ran in your favor. Computed at ${timeframe} resolution from bar highs/lows — the true intrabar extreme can be slightly worse than what 1h bars show.`}
          />
        </View>
      ) : null}

      {/* Trade summary line */}
      <View style={styles.summary}>
        <Text style={[styles.summaryText, { color: theme.muted }]}>
          {trade.direction.toUpperCase()} · entry {formatPrice(trade.entryPrice, symbol)}
          {trade.exitPrice !== null
            ? ` · exit ${formatPrice(trade.exitPrice, symbol)} · P/L ${formatPnlPips(trade)} pips`
            : ' · open'}
        </Text>
      </View>

      <TradingViewAttribution muted={theme.muted} accent={theme.accent} />
    </View>
  );
}

// ───────────────────────────────────────────────────────────────────
// Canvas wrapper — creates the lightweight-charts instance, manages
// data updates, markers, price lines, crosshair, and resize.
// ───────────────────────────────────────────────────────────────────

function ChartCanvas({
  bars,
  excursion,
  onHoverBar,
  theme,
  timeframe,
  trade
}: {
  bars: FxBar[];
  excursion: Excursion | null;
  onHoverBar: (bar: FxBar | null) => void;
  theme: ReturnType<typeof useAppTheme>;
  timeframe: '1h' | '1d';
  trade: ReviewTrade;
}) {
  const containerRef = useRef<View>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const priceLinesRef = useRef<IPriceLine[]>([]);
  const markersRef = useRef<ISeriesMarkersPluginApi<Time> | null>(null);
  // Async createChart means the data effect can race ahead of the series.
  // Flip this once the series exists so the data effect re-runs.
  const [isChartReady, setIsChartReady] = useState(false);

  // ── Create chart on mount ─────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    let resizeObserver: ResizeObserver | null = null;

    async function init() {
      // RN's View renders to a div on web; grab the underlying element.
      const node = containerRef.current as unknown as HTMLDivElement | null;
      if (!node) return;

      // Dynamic import keeps lightweight-charts out of any non-web bundle.
      const lc = await import('lightweight-charts');
      if (cancelled) return;

      const chart = lc.createChart(node, {
        autoSize: true,
        layout: {
          background: { type: lc.ColorType.Solid, color: theme.card },
          textColor: theme.muted,
          fontSize: 11
        },
        rightPriceScale: {
          borderColor: theme.border
        },
        timeScale: {
          borderColor: theme.border,
          timeVisible: true,
          secondsVisible: false,
          // Render axis ticks in UTC explicitly — never convert to local time.
          tickMarkFormatter: (time: Time) => formatTickUtc(time, timeframe)
        },
        crosshair: {
          mode: lc.CrosshairMode.Normal,
          vertLine: { color: theme.border, width: 1, style: lc.LineStyle.Solid },
          horzLine: { color: theme.border, width: 1, style: lc.LineStyle.Solid }
        },
        grid: {
          horzLines: { color: theme.border + '55' },
          vertLines: { color: theme.border + '55' }
        },
        localization: {
          locale: 'en-US',
          timeFormatter: (time: Time) => formatTimeUtc(time)
        }
      });

      const series = chart.addSeries(lc.CandlestickSeries, {
        upColor: theme.positive,
        downColor: theme.danger,
        borderVisible: false,
        wickUpColor: theme.positive,
        wickDownColor: theme.danger
      });

      chartRef.current = chart;
      seriesRef.current = series;
      // Initialise an empty markers plugin we can update on every data change
      markersRef.current = lc.createSeriesMarkers(series, []);
      setIsChartReady(true);

      // Crosshair subscription → tooltip data
      chart.subscribeCrosshairMove((param) => {
        if (!param.time || !seriesRef.current) {
          onHoverBar(null);
          return;
        }
        const point = param.seriesData.get(seriesRef.current) as CandlestickData | undefined;
        if (!point) {
          onHoverBar(null);
          return;
        }
        // Re-build an FxBar shape for the tooltip
        const tsSec = typeof point.time === 'number' ? point.time : Number(point.time);
        onHoverBar({
          pair: trade.symbol,
          timeframe,
          ts: new Date(tsSec * 1000).toISOString(),
          open: point.open,
          high: point.high,
          low: point.low,
          close: point.close,
          volume: null
        });
      });

      // Manual resize observer (autoSize handles most but ensures sane behavior on flex changes)
      resizeObserver = new ResizeObserver(() => {
        const rect = node.getBoundingClientRect();
        chart.resize(rect.width, rect.height);
      });
      resizeObserver.observe(node);
    }

    void init();

    return () => {
      cancelled = true;
      if (resizeObserver) resizeObserver.disconnect();
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
        seriesRef.current = null;
        markersRef.current = null;
        priceLinesRef.current = [];
      }
      setIsChartReady(false);
    };
  }, [theme.card, theme.muted, theme.border, theme.positive, theme.danger]);

  // ── Push data + markers + price lines whenever bars change ────────
  useEffect(() => {
    if (!isChartReady) return;
    const series = seriesRef.current;
    if (!series || bars.length === 0) return;

    // 1. Candle data — convert ISO → unix seconds (UTC anchor)
    const data: CandlestickData[] = bars.map((b) => ({
      time: (Math.floor(new Date(b.ts).getTime() / 1000) as Time),
      open: b.open,
      high: b.high,
      low: b.low,
      close: b.close
    }));
    series.setData(data);

    // 2. Markers — entry, exit, MAE, MFE
    const markers: SeriesMarker<Time>[] = [];

    const entryTime = Math.floor(new Date(trade.openedAt).getTime() / 1000) as Time;
    markers.push({
      time: entryTime,
      position: trade.direction === 'long' ? 'belowBar' : 'aboveBar',
      color: theme.accent,
      shape: trade.direction === 'long' ? 'arrowUp' : 'arrowDown',
      text: `Entry ${formatPrice(trade.entryPrice, trade.symbol)}`
    });

    if (trade.closedAt && trade.exitPrice !== null) {
      const exitTime = Math.floor(new Date(trade.closedAt).getTime() / 1000) as Time;
      const isWin =
        trade.direction === 'long'
          ? trade.exitPrice > trade.entryPrice
          : trade.exitPrice < trade.entryPrice;
      markers.push({
        time: exitTime,
        position: trade.direction === 'long' ? 'aboveBar' : 'belowBar',
        color: isWin ? theme.positive : theme.danger,
        shape: 'square',
        text: `Exit ${formatPrice(trade.exitPrice, trade.symbol)}`
      });
    }

    if (excursion && excursion.mae > 1e-9) {
      markers.push({
        time: excursion.maeAt as Time,
        position: trade.direction === 'long' ? 'belowBar' : 'aboveBar',
        color: theme.danger,
        shape: 'circle',
        text: `MAE`
      });
    }
    if (excursion && excursion.mfe > 1e-9) {
      markers.push({
        time: excursion.mfeAt as Time,
        position: trade.direction === 'long' ? 'aboveBar' : 'belowBar',
        color: theme.positive,
        shape: 'circle',
        text: `MFE`
      });
    }

    // Sort markers by time (LWC requirement) and push through plugin
    markers.sort((a, b) => Number(a.time) - Number(b.time));
    if (markersRef.current) {
      markersRef.current.setMarkers(markers);
    }

    // 3. Price lines — clear old then add fresh
    for (const line of priceLinesRef.current) series.removePriceLine(line);
    priceLinesRef.current = [];

    const lc = require('lightweight-charts');

    function addLine(price: number, title: string, color: string, style: number) {
      const line = series!.createPriceLine({
        price,
        color,
        lineWidth: 1,
        lineStyle: style,
        axisLabelVisible: true,
        title
      });
      priceLinesRef.current.push(line);
    }

    // Entry / exit — solid
    addLine(trade.entryPrice, 'Entry', theme.accent, lc.LineStyle.Solid);
    if (trade.exitPrice !== null) {
      const isWin =
        trade.direction === 'long'
          ? trade.exitPrice > trade.entryPrice
          : trade.exitPrice < trade.entryPrice;
      addLine(trade.exitPrice, 'Exit', isWin ? theme.positive : theme.danger, lc.LineStyle.Solid);
    }
    // SL / TP — dashed
    if (trade.stopLossPrice !== null) {
      addLine(trade.stopLossPrice, 'SL', theme.danger, lc.LineStyle.Dashed);
    }
    if (trade.takeProfitPrice !== null) {
      addLine(trade.takeProfitPrice, 'TP', theme.positive, lc.LineStyle.Dashed);
    }
    // MAE / MFE — dotted
    if (excursion && excursion.mae > 1e-9) {
      addLine(excursion.maePrice, 'MAE', theme.danger, lc.LineStyle.Dotted);
    }
    if (excursion && excursion.mfe > 1e-9) {
      addLine(excursion.mfePrice, 'MFE', theme.positive, lc.LineStyle.Dotted);
    }

    // Fit content to window so trade is centered
    chartRef.current?.timeScale().fitContent();
  }, [isChartReady, bars, excursion, trade, theme.accent, theme.positive, theme.danger]);

  return <View ref={containerRef} style={[styles.chartHost, { borderColor: theme.border }]} />;
}

// ───────────────────────────────────────────────────────────────────
// UI bits
// ───────────────────────────────────────────────────────────────────

function TradingViewAttribution({ muted, accent }: { muted: string; accent: string }) {
  return (
    <View style={styles.attribution}>
      <Text style={[styles.attributionText, { color: muted }]}>Charts by </Text>
      <Pressable onPress={() => Linking.openURL('https://www.tradingview.com/')}>
        <Text style={[styles.attributionLink, { color: accent }]}>TradingView</Text>
      </Pressable>
    </View>
  );
}

function TooltipChip({ color, label, value }: { color: string; label: string; value: string }) {
  const theme = useAppTheme();
  return (
    <View style={styles.tooltipChip}>
      <Text style={[styles.tooltipLabel, { color: theme.muted }]}>{label}</Text>
      <Text style={[styles.tooltipValue, { color }]}>{value}</Text>
    </View>
  );
}

function ExcursionChip({
  background,
  color,
  label,
  value
}: {
  background: string;
  color: string;
  label: string;
  value: string;
}) {
  return (
    <View style={[styles.excursionChip, { backgroundColor: background }]}>
      <Text style={[styles.excursionLabel, { color }]}>{label}</Text>
      <Text style={[styles.excursionValue, { color }]}>{value}</Text>
    </View>
  );
}

// ───────────────────────────────────────────────────────────────────
// Pure helpers
// ───────────────────────────────────────────────────────────────────

function formatPrice(value: number, symbol: string): string {
  return value.toFixed(symbol.toUpperCase().includes('JPY') ? 3 : 5);
}

function formatPips(distance: number, symbol: string): string {
  const factor = symbol.toUpperCase().includes('JPY') ? 100 : 10000;
  return (distance * factor).toFixed(1);
}

function formatPnlPips(trade: ReviewTrade): string {
  if (trade.exitPrice === null) return '0.0';
  const raw =
    trade.direction === 'long'
      ? trade.exitPrice - trade.entryPrice
      : trade.entryPrice - trade.exitPrice;
  const factor = trade.symbol.toUpperCase().includes('JPY') ? 100 : 10000;
  const pips = raw * factor;
  const sign = pips > 0 ? '+' : pips < 0 ? '−' : '';
  return `${sign}${Math.abs(pips).toFixed(1)}`;
}

function formatUtc(iso: string): string {
  const d = new Date(iso);
  return `${pad(d.getUTCDate())}/${pad(d.getUTCMonth() + 1)} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
}

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function formatTickUtc(time: Time, tf: '1h' | '1d'): string {
  const sec = typeof time === 'number' ? time : Number(time);
  const d = new Date(sec * 1000);
  if (tf === '1d') {
    return `${pad(d.getUTCDate())} ${monthShort(d.getUTCMonth())}`;
  }
  return `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
}

function formatTimeUtc(time: Time): string {
  const sec = typeof time === 'number' ? time : Number(time);
  const d = new Date(sec * 1000);
  return `${pad(d.getUTCDate())} ${monthShort(d.getUTCMonth())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())} UTC`;
}

function monthShort(m: number): string {
  return ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][m];
}

// ───────────────────────────────────────────────────────────────────
// Styles
// ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  wrap: { gap: 10 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    flexWrap: 'wrap'
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.3
  },
  tfToggle: {
    flexDirection: 'row',
    gap: 2,
    borderRadius: 999,
    borderWidth: 1,
    padding: 3
  },
  tfOption: {
    minWidth: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    paddingVertical: 5,
    paddingHorizontal: 10
  },
  tfOptionText: { fontSize: 12, fontWeight: '600' },
  chartHost: {
    width: '100%',
    height: 380,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden'
  } as any,
  loading: { fontSize: 13, fontWeight: '500' },
  error: { fontSize: 13, fontWeight: '600' },
  tooltip: {
    gap: 4,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8
  },
  tooltipTs: { fontSize: 10, fontWeight: '600', letterSpacing: 0.3 },
  tooltipRow: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
  tooltipChip: { gap: 1 },
  tooltipLabel: { fontSize: 9, fontWeight: '700', letterSpacing: 0.4 },
  tooltipValue: { fontSize: 12, fontWeight: '600' },
  excursionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap'
  },
  excursionChip: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 1
  },
  excursionLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 0.4 },
  excursionValue: { fontSize: 13, fontWeight: '700' },
  summary: { marginTop: 2 },
  summaryText: { fontSize: 12, fontWeight: '500' },
  attribution: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4
  },
  attributionText: { fontSize: 11 },
  attributionLink: { fontSize: 11, fontWeight: '600' },
  pressed: { opacity: 0.72 },
  fallback: {
    borderRadius: 12,
    padding: 16,
    gap: 8
  },
  fallbackTitle: { fontSize: 15, fontWeight: '600' },
  fallbackBody: { fontSize: 13, lineHeight: 18 }
});
