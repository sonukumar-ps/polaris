import { Link } from 'expo-router';
import type { Href } from 'expo-router';
import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type ViewStyle,
  useWindowDimensions
} from 'react-native';

import { useAppTheme } from './theme';
import type { AppTheme } from './theme';

type AppRoute = 'dashboard' | 'add-trade' | 'trades' | 'risk';

const navigationItems: { href: Href; key: AppRoute; label: string }[] = [
  { href: '/home' as Href, key: 'dashboard', label: 'Dashboard' },
  { href: '/trades/new' as Href, key: 'add-trade', label: 'Add Trade' },
  { href: '/trades' as Href, key: 'trades', label: 'Trades' },
  { href: '/risk' as Href, key: 'risk', label: 'Risk' }
];

export function AppShell({
  activeRoute,
  children
}: {
  activeRoute: AppRoute;
  children: ReactNode;
}) {
  const theme = useAppTheme();
  const { width } = useWindowDimensions();
  const showSidebar = width >= 900;

  return (
    <View style={[styles.shell, { backgroundColor: theme.background }]}>
      {showSidebar ? <Sidebar activeRoute={activeRoute} theme={theme} /> : null}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, showSidebar ? styles.contentWithSidebar : null]}
      >
        <FadeInView>{children}</FadeInView>
      </ScrollView>
    </View>
  );
}

export function Card({
  children,
  style
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useAppTheme();

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.card,
          borderColor: theme.border,
          shadowColor: theme.isDark ? '#000000' : '#D8D8D2'
        },
        StyleSheet.flatten(style)
      ]}
    >
      {children}
    </View>
  );
}

export function PrimaryButton({
  children,
  disabled,
  onPress
}: {
  children: ReactNode;
  disabled?: boolean;
  onPress?: () => void;
}) {
  const theme = useAppTheme();

  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.primaryButton,
        { backgroundColor: theme.accent },
        (pressed || disabled) && styles.pressed
      ]}
    >
      <Text style={styles.primaryButtonText}>{children}</Text>
    </Pressable>
  );
}

export function PrimaryLinkButton({
  children,
  href
}: {
  children: ReactNode;
  href: Href;
}) {
  const theme = useAppTheme();

  return (
    <Link
      href={href}
      style={StyleSheet.flatten([styles.primaryButton, styles.linkButton, { backgroundColor: theme.accent }])}
    >
      <Text style={styles.primaryButtonText}>{children}</Text>
    </Link>
  );
}

export function SecondaryLinkButton({
  children,
  href
}: {
  children: ReactNode;
  href: Href;
}) {
  const theme = useAppTheme();

  return (
    <Link
      href={href}
      style={StyleSheet.flatten([
        styles.secondaryButton,
        styles.linkButton,
        { borderColor: theme.border, backgroundColor: theme.card }
      ])}
    >
      <Text style={[styles.secondaryButtonText, { color: theme.text }]}>{children}</Text>
    </Link>
  );
}

export function SectionHeading({
  eyebrow,
  subtitle,
  title
}: {
  eyebrow?: string;
  subtitle?: string;
  title: string;
}) {
  const theme = useAppTheme();

  return (
    <View style={styles.heading}>
      {eyebrow ? <Text style={[styles.eyebrow, { color: theme.accent }]}>{eyebrow}</Text> : null}
      <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
      {subtitle ? <Text style={[styles.subtitle, { color: theme.muted }]}>{subtitle}</Text> : null}
    </View>
  );
}

export function TextField({
  autoCapitalize = 'none',
  error,
  inputMode = 'text',
  label,
  multiline = false,
  onChangeText,
  placeholder,
  value
}: {
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  error?: string;
  inputMode?: 'decimal' | 'text';
  label: string;
  multiline?: boolean;
  onChangeText: (value: string) => void;
  placeholder: string;
  value: string;
}) {
  const theme = useAppTheme();

  return (
    <View style={styles.field}>
      <Text style={[styles.fieldLabel, { color: theme.muted }]}>{label}</Text>
      <TextInput
        autoCapitalize={autoCapitalize}
        inputMode={inputMode}
        multiline={multiline}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.muted}
        style={[
          styles.input,
          {
            backgroundColor: theme.mutedSurface,
            borderColor: error ? theme.danger : theme.border,
            color: theme.text
          },
          multiline && styles.textArea
        ]}
        value={value}
      />
      {error ? <Text style={[styles.errorText, { color: theme.danger }]}>{error}</Text> : null}
    </View>
  );
}

export function LoadingState({ label }: { label: string }) {
  const theme = useAppTheme();

  return (
    <View style={styles.state}>
      <ActivityIndicator color={theme.accent} />
      <Text style={[styles.stateText, { color: theme.muted }]}>{label}</Text>
    </View>
  );
}

export function EmptyState({ body, title }: { body: string; title: string }) {
  const theme = useAppTheme();

  return (
    <View style={[styles.state, { backgroundColor: theme.mutedSurface }]}>
      <Text style={[styles.stateTitle, { color: theme.text }]}>{title}</Text>
      <Text style={[styles.stateText, { color: theme.muted }]}>{body}</Text>
    </View>
  );
}

export function FadeInView({ children }: { children: ReactNode }) {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(opacity, {
      duration: 220,
      toValue: 1,
      useNativeDriver: true
    }).start();
  }, [opacity]);

  return <Animated.View style={[styles.fade, { opacity }]}>{children}</Animated.View>;
}

function Sidebar({ activeRoute, theme }: { activeRoute: AppRoute; theme: AppTheme }) {
  return (
    <View style={[styles.sidebar, { borderColor: theme.border }]}>
      <View>
        <Text style={[styles.brand, { color: theme.text }]}>Polaris</Text>
        <Text style={[styles.brandMeta, { color: theme.muted }]}>Trade Journal</Text>
      </View>
      <View style={styles.navList}>
        {navigationItems.map((item) => {
          const isActive = item.key === activeRoute;

          return (
            <Link
              key={item.key}
              href={item.href}
              style={StyleSheet.flatten([
                styles.navItem,
                {
                  backgroundColor: isActive ? theme.mutedSurface : 'transparent'
                }
              ])}
            >
              <Text style={[styles.navText, { color: isActive ? theme.accent : theme.muted }]}>
                {item.label}
              </Text>
            </Link>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    flexDirection: 'row'
  },
  scroll: {
    flex: 1
  },
  content: {
    padding: 20,
    paddingBottom: 44
  },
  contentWithSidebar: {
    padding: 32
  },
  fade: {
    gap: 18,
    width: '100%',
    maxWidth: 1120,
    alignSelf: 'center'
  },
  sidebar: {
    width: 248,
    gap: 28,
    borderRightWidth: 1,
    padding: 24,
    paddingTop: 36
  },
  brand: {
    fontSize: 24,
    fontWeight: '800'
  },
  brandMeta: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 4
  },
  navList: {
    gap: 6
  },
  navItem: {
    minHeight: 40,
    justifyContent: 'center',
    borderRadius: 8,
    paddingHorizontal: 12
  },
  navText: {
    fontSize: 14,
    fontWeight: '700'
  },
  card: {
    gap: 14,
    borderRadius: 8,
    borderWidth: 1,
    padding: 18,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.08,
    shadowRadius: 24
  },
  heading: {
    gap: 8
  },
  eyebrow: {
    fontSize: 13,
    fontWeight: '800',
    textTransform: 'uppercase'
  },
  title: {
    fontSize: 36,
    fontWeight: '800',
    lineHeight: 42
  },
  subtitle: {
    maxWidth: 720,
    fontSize: 16,
    lineHeight: 24
  },
  primaryButton: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    paddingHorizontal: 16
  },
  linkButton: {
    display: 'flex',
    textDecorationLine: 'none'
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800'
  },
  secondaryButton: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 16
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: '800'
  },
  pressed: {
    opacity: 0.72
  },
  field: {
    flex: 1,
    gap: 7,
    minWidth: 220
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '800'
  },
  input: {
    minHeight: 48,
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 16,
    paddingHorizontal: 13,
    paddingVertical: 11
  },
  textArea: {
    minHeight: 104,
    textAlignVertical: 'top'
  },
  errorText: {
    fontSize: 13,
    fontWeight: '700'
  },
  state: {
    minHeight: 150,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 8,
    padding: 18
  },
  stateTitle: {
    fontSize: 17,
    fontWeight: '800'
  },
  stateText: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center'
  }
});
