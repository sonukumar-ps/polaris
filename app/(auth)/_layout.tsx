import { Redirect, Stack } from 'expo-router';
import type { Href } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { useAuth } from '@/lib/auth/session';

const HOME_ROUTE = '/home' as Href;

export default function AuthLayout() {
  const { isLoading, session } = useAuth();

  if (isLoading) {
    return (
      <View style={styles.screen}>
        <ActivityIndicator />
      </View>
    );
  }

  if (session) {
    return <Redirect href={HOME_ROUTE} />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC'
  }
});
