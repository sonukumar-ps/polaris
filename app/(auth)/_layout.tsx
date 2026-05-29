import { Redirect, Stack } from 'expo-router';
import type { Href } from 'expo-router';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { useAuth } from '@/lib/auth/session';
import { useAppTheme } from '@/lib/ui';

const HOME_ROUTE = '/home' as Href;

export default function AuthLayout() {
  const theme = useAppTheme();
  const { error, isLoading, session } = useAuth();

  if (isLoading) {
    return (
      <View style={[styles.screen, { backgroundColor: theme.background }]}>
        <ActivityIndicator color={theme.accent} />
        <Text style={[styles.loadingText, { color: theme.muted }]}>Checking your session...</Text>
      </View>
    );
  }

  if (session) {
    return <Redirect href={HOME_ROUTE} />;
  }

  return (
    <>
      {error ? (
        <View style={[styles.banner, { backgroundColor: theme.dangerMuted, borderBottomColor: theme.danger }]}>
          <Text style={[styles.bannerText, { color: theme.danger }]}>{error}</Text>
        </View>
      ) : null}
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.background } }} />
    </>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: 'center',
    gap: 12,
    justifyContent: 'center'
  },
  loadingText: {
    fontSize: 14,
    fontWeight: '600'
  },
  banner: {
    borderBottomWidth: 1,
    padding: 12
  },
  bannerText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center'
  }
});
