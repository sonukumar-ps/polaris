import { Link } from 'expo-router';
import type { Href } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
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

import { useAccountScope } from '@/lib/trades';

import { useAppTheme } from './theme';
import type { AppTheme } from './theme';

type AppRoute = 'dashboard' | 'add-trade' | 'checklist' | 'trades' | 'risk' | 'insights';

const navigationItems: { href: Href; key: AppRoute; label: string }[] = [
  { href: '/home' as Href, key: 'dashboard', label: 'Dashboard' },
  { href: '/checklist' as Href, key: 'checklist', label: 'Checklist' },
  { href: '/trades/new' as Href, key: 'add-trade', label: 'Add Trade' },
  { href: '/trades' as Href, key: 'trades', label: 'Trades' },
  { href: '/insights' as Href, key: 'insights', label: 'Insights' },
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
      <View style={styles.appPane}>
        <AccountScopeBar theme={theme} />
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.content, showSidebar ? styles.contentWithSidebar : null]}
        >
          <FadeInView>{children}</FadeInView>
        </ScrollView>
      </View>
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

function AccountScopeBar({ theme }: { theme: AppTheme }) {
  const { accounts, error, isLoading, selectedAccountIds, selectedAccounts, toggleAccount } = useAccountScope();
  const [isOpen, setIsOpen] = useState(false);
  const selectedLabel =
    selectedAccounts.length === 0
      ? 'Accounts'
      : selectedAccounts.length === 1
        ? selectedAccounts[0].name
        : `${selectedAccounts.length} accounts`;

  return (
    <View style={[styles.scopeBar, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <View>
        <Text style={[styles.scopeTitle, { color: theme.text }]}>Portfolio view</Text>
        <Text style={[styles.scopeMeta, { color: theme.muted }]}>Performance scope</Text>
      </View>
      <View style={styles.scopeSelector}>
        <Pressable
          disabled={isLoading}
          onPress={() => setIsOpen((current) => !current)}
          style={({ pressed }) => [
            styles.scopeButton,
            {
              backgroundColor: theme.mutedSurface,
              borderColor: isOpen ? theme.accent : theme.border
            },
            (pressed || isLoading) && styles.pressed
          ]}
        >
          <View style={styles.scopeButtonCopy}>
            <Text style={[styles.scopeButtonLabel, { color: theme.muted }]}>Accounts</Text>
            <Text style={[styles.scopeButtonValue, { color: theme.text }]}>
              {isLoading ? 'Loading...' : selectedLabel}
            </Text>
          </View>
          <Text style={[styles.scopeChevron, { color: theme.muted }]}>{isOpen ? '^' : 'v'}</Text>
        </Pressable>
        {isOpen ? (
          <View style={[styles.scopePanel, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.scopePanelTitle, { color: theme.text }]}>Dashboard statistics</Text>
            <Text style={[styles.scopePanelMeta, { color: theme.muted }]}>Select one or combine accounts.</Text>
            {error ? <Text style={[styles.scopeError, { color: theme.danger }]}>{error}</Text> : null}
            <View style={styles.scopeOptions}>
              {accounts.map((account) => {
                const isSelected = selectedAccountIds.includes(account.id);

                return (
                  <Pressable
                    key={account.id}
                    onPress={() => toggleAccount(account.id)}
                    style={({ pressed }) => [
                      styles.scopeOption,
                      {
                        backgroundColor: isSelected ? theme.accent : theme.mutedSurface,
                        borderColor: isSelected ? theme.accent : theme.border
                      },
                      pressed && styles.pressed
                    ]}
                  >
                    <View style={styles.scopeButtonCopy}>
                      <Text style={[styles.scopeOptionName, { color: isSelected ? '#FFFFFF' : theme.text }]}>
                        {account.name}
                      </Text>
                      {account.is_main ? (
                        <Text style={[styles.scopeOptionMeta, { color: isSelected ? '#EAF3FF' : theme.muted }]}>
                          Main account
                        </Text>
                      ) : null}
                    </View>
                    <Text style={[styles.scopeOptionState, { color: isSelected ? '#FFFFFF' : theme.muted }]}>
                      {isSelected ? 'Selected' : 'Select'}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    flexDirection: 'row'
  },
  appPane: {
    flex: 1
  },
  scopeBar: {
    minHeight: 68,
    flexDirection: 'row',
    gap: 18,
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    paddingHorizontal: 20,
    paddingVertical: 10,
    zIndex: 50
  },
  scopeTitle: {
    fontSize: 15,
    fontWeight: '800'
  },
  scopeMeta: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2
  },
  scopeSelector: {
    position: 'relative',
    zIndex: 60
  },
  scopeButton: {
    minHeight: 48,
    minWidth: 194,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6
  },
  scopeButtonCopy: {
    flex: 1,
    gap: 2
  },
  scopeButtonLabel: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase'
  },
  scopeButtonValue: {
    fontSize: 14,
    fontWeight: '800'
  },
  scopeChevron: {
    fontSize: 14,
    fontWeight: '800'
  },
  scopePanel: {
    position: 'absolute',
    top: 56,
    right: 0,
    width: 320,
    gap: 10,
    borderRadius: 8,
    borderWidth: 1,
    padding: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.14,
    shadowRadius: 20,
    zIndex: 80
  },
  scopePanelTitle: {
    fontSize: 17,
    fontWeight: '800'
  },
  scopePanelMeta: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: -6
  },
  scopeError: {
    fontSize: 12,
    fontWeight: '700'
  },
  scopeOptions: {
    gap: 8
  },
  scopeOption: {
    minHeight: 52,
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  scopeOptionName: {
    fontSize: 14,
    fontWeight: '800'
  },
  scopeOptionMeta: {
    fontSize: 12,
    fontWeight: '700'
  },
  scopeOptionState: {
    fontSize: 12,
    fontWeight: '800'
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
