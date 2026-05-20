import { Pressable, StyleSheet, Text, View } from 'react-native';

import { supabase } from '@/lib/supabase';

const metrics = [
  { label: 'Realized P&L', value: '$0.00' },
  { label: 'Win rate', value: '0%' },
  { label: 'Trades logged', value: '0' }
];

export default function HomeScreen() {
  async function handleSignOut() {
    await supabase.auth.signOut();
  }

  return (
    <View style={styles.screen}>
      <View style={styles.topBar}>
        <View style={styles.header}>
          <Text style={styles.eyebrow}>Polaris Trade Journal</Text>
          <Text style={styles.title}>Log trades. Review patterns. Improve decisions.</Text>
          <Text style={styles.subtitle}>
            V1 starts with manual trade logging, chart screenshots, strategy tags, emotional
            context, and clean P&L visibility across web, iOS, and Android.
          </Text>
        </View>

        <Pressable
          onPress={handleSignOut}
          style={({ pressed }) => [styles.signOutButton, pressed && styles.signOutButtonPressed]}
        >
          <Text style={styles.signOutButtonText}>Sign out</Text>
        </Pressable>
      </View>

      <View style={styles.metricsGrid}>
        {metrics.map((metric) => (
          <View key={metric.label} style={styles.metricCard}>
            <Text style={styles.metricValue}>{metric.value}</Text>
            <Text style={styles.metricLabel}>{metric.label}</Text>
          </View>
        ))}
      </View>

      <View style={styles.panel}>
        <Text style={styles.panelTitle}>Next build target</Text>
        <Text style={styles.panelText}>
          Set up Supabase, define the trade schema, and wire authentication before the
          first trade-entry form lands.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    gap: 24,
    padding: 24,
    backgroundColor: '#F8FAFC'
  },
  header: {
    gap: 12,
    maxWidth: 760
  },
  topBar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingTop: 64
  },
  eyebrow: {
    color: '#2563EB',
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'uppercase'
  },
  title: {
    color: '#0F172A',
    fontSize: 40,
    fontWeight: '800',
    lineHeight: 46
  },
  subtitle: {
    color: '#475569',
    fontSize: 17,
    lineHeight: 26
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12
  },
  metricCard: {
    minWidth: 160,
    flexGrow: 1,
    borderRadius: 8,
    borderColor: '#E2E8F0',
    borderWidth: 1,
    backgroundColor: '#FFFFFF',
    padding: 16
  },
  metricValue: {
    color: '#0F172A',
    fontSize: 28,
    fontWeight: '800'
  },
  metricLabel: {
    color: '#64748B',
    fontSize: 14,
    marginTop: 4
  },
  panel: {
    maxWidth: 760,
    borderRadius: 8,
    backgroundColor: '#0F172A',
    padding: 20
  },
  panelTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8
  },
  panelText: {
    color: '#CBD5E1',
    fontSize: 15,
    lineHeight: 23
  },
  signOutButton: {
    minHeight: 40,
    justifyContent: 'center',
    borderRadius: 8,
    borderColor: '#CBD5E1',
    borderWidth: 1,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14
  },
  signOutButtonPressed: {
    opacity: 0.7
  },
  signOutButtonText: {
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '700'
  }
});
