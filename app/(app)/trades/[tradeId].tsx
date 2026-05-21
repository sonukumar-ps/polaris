import { useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import {
  AppShell,
  Card,
  EmptyState,
  LoadingState,
  PrimaryButton,
  SecondaryLinkButton,
  SectionHeading,
  useAppTheme
} from '@/lib/ui';
import { getTrade, listTradeImages, uploadTradeImage } from '@/lib/trades';
import type { TradeImage, TradeSummary } from '@/lib/trades';

export default function TradeDetailScreen() {
  const { tradeId } = useLocalSearchParams<{ tradeId: string }>();
  const theme = useAppTheme();
  const [trade, setTrade] = useState<TradeSummary | null>(null);
  const [images, setImages] = useState<TradeImage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

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
        const [loadedTrade, loadedImages] = await Promise.all([
          getTrade(tradeId),
          listTradeImages(tradeId)
        ]);

        if (isActive) {
          setTrade(loadedTrade);
          setImages(loadedImages);
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
            <View style={styles.heroRow}>
              <View>
                <Text style={[styles.tradeTitle, { color: theme.text }]}>
                  {trade.direction.toUpperCase()} {trade.asset?.symbol ?? 'Trade'}
                </Text>
                <Text style={[styles.tradeSubtitle, { color: theme.muted }]}>
                  {trade.status.toUpperCase()} | Opened {formatDate(trade.opened_at)}
                </Text>
              </View>
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
            </View>

            <View style={styles.metricGrid}>
              <Metric label="Strategy" value={trade.strategy?.name ?? 'Not set'} />
              <Metric label="Entry" value={formatNumber(trade.entry_price)} />
              <Metric label="Exit" value={trade.exit_price ? formatNumber(trade.exit_price) : 'Open'} />
              <Metric label="Size" value={formatNumber(trade.quantity)} />
              <Metric label="Fees" value={formatCurrency(trade.fees)} />
              <Metric label="Gross P&L" value={trade.gross_pnl !== null ? formatCurrency(trade.gross_pnl) : 'Open'} />
              <Metric label="Closed" value={trade.closed_at ? formatDate(trade.closed_at) : 'Open'} />
            </View>

            {trade.tags.length > 0 ? (
              <View style={[styles.dividedSection, { borderColor: theme.border }]}>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>Tags</Text>
                <View style={styles.tags}>
                  {trade.tags.map((tag) => (
                    <Text
                      key={tag.id}
                      style={[
                        styles.tagChip,
                        { backgroundColor: theme.mutedSurface, color: theme.muted }
                      ]}
                    >
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
          </Card>

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
      ) : null}
    </AppShell>
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
    minWidth: 300,
    flex: 2
  },
  sideCard: {
    minWidth: 280,
    flex: 1
  },
  heroRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    alignItems: 'flex-start',
    justifyContent: 'space-between'
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
    minWidth: 150,
    flex: 1,
    gap: 4,
    borderRadius: 8,
    padding: 12
  },
  metricLabel: {
    fontSize: 12,
    fontWeight: '800'
  },
  metricValue: {
    fontSize: 17,
    fontWeight: '800'
  },
  dividedSection: {
    gap: 10,
    borderTopWidth: 1,
    paddingTop: 16
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800'
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
  errorText: {
    fontSize: 14,
    fontWeight: '800'
  }
});
