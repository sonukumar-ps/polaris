import { Redirect, Stack } from 'expo-router';
import type { Href } from 'expo-router';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { useAuth } from '@/lib/auth/session';

const SIGN_IN_ROUTE = '/sign-in' as Href;

export default function ProtectedLayout() {
  const { error, isLoading, session } = useAuth();

  if (isLoading) {
    return (
      <View style={styles.screen}>
        <ActivityIndicator color="#2563EB" />
        <Text style={styles.loadingText}>Loading your journal...</Text>
      </View>
    );
  }

  if (!session) {
    return <Redirect href={SIGN_IN_ROUTE} />;
  }

  return (
    <>
      {error ? (
        <View style={styles.banner}>
          <Text style={styles.bannerText}>{error}</Text>
        </View>
      ) : null}
      <Stack screenOptions={{ headerShown: false }} />
    </>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: 'center',
    gap: 12,
    justifyContent: 'center',
    backgroundColor: '#F8FAFC'
  },
  loadingText: {
    color: '#475569',
    fontSize: 14,
    fontWeight: '700'
  },
  banner: {
    borderBottomColor: '#FCA5A5',
    borderBottomWidth: 1,
    backgroundColor: '#FEF2F2',
    padding: 12
  },
  bannerText: {
    color: '#991B1B',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center'
  }
});
