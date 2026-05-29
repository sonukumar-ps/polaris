import { Tabs } from 'expo-router';
import { useAppTheme } from '@/lib/ui';

export default function InsightsLayout() {
  const theme = useAppTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.accent,
        tabBarInactiveTintColor: theme.muted,
        tabBarStyle: {
          backgroundColor: theme.card,
          borderTopColor: theme.border
        }
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Overview' }} />
      <Tabs.Screen name="sessions" options={{ title: 'Sessions' }} />
      <Tabs.Screen name="psychology" options={{ title: 'Psychology' }} />
      <Tabs.Screen name="best-process" options={{ title: 'Best Process' }} />
      <Tabs.Screen name="exposure" options={{ title: 'Exposure' }} />
      <Tabs.Screen name="checklist-analytics" options={{ title: 'Checklist' }} />
    </Tabs>
  );
}
