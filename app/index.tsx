import { Redirect } from 'expo-router';
import type { Href } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { useAuth } from '@/lib/auth/session';
import { useAppTheme } from '@/lib/ui';

const HOME_ROUTE = '/home' as Href;
const SIGN_IN_ROUTE = '/sign-in' as Href;

export default function IndexRoute() {
  const theme = useAppTheme();
  const { isLoading, session } = useAuth();

  if (isLoading) {
    return (
      <View style={[styles.screen, { backgroundColor: theme.background }]}>
        <ActivityIndicator color={theme.accent} />
      </View>
    );
  }

  return <Redirect href={session ? HOME_ROUTE : SIGN_IN_ROUTE} />;
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center'
  }
});
