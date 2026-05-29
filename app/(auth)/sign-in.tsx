import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';

import { supabase } from '@/lib/supabase';
import { useAppTheme, userMessage } from '@/lib/ui';

type AuthMode = 'sign-in' | 'sign-up';

export default function SignInScreen() {
  const theme = useAppTheme();
  const [authMode, setAuthMode] = useState<AuthMode>('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isSignUp = authMode === 'sign-up';

  async function handleSubmit() {
    const normalizedEmail = email.trim().toLowerCase();

    setError(null);
    setMessage(null);

    if (!normalizedEmail || !password) {
      setError('Enter an email and password.');
      return;
    }

    setIsSubmitting(true);

    try {
      const { error: authError } = isSignUp
        ? await supabase.auth.signUp({
            email: normalizedEmail,
            password
          })
        : await supabase.auth.signInWithPassword({
            email: normalizedEmail,
            password
          });

      if (authError) {
        setError(authError.message);
        return;
      }

      if (isSignUp) {
        setMessage('Account created. Check your email if confirmation is required.');
      }
    } catch (submitError) {
      setError(userMessage(submitError, 'Sign-in failed'));
    } finally {
      setIsSubmitting(false);
    }
  }

  function toggleMode() {
    setAuthMode(isSignUp ? 'sign-in' : 'sign-up');
    setError(null);
    setMessage(null);
  }

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      <View style={[styles.panel, { backgroundColor: theme.card, borderColor: theme.border, shadowColor: theme.shadow }]}>
        <Text style={[styles.eyebrow, { color: theme.accent }]}>Polaris</Text>
        <Text style={[styles.title, { color: theme.text }]}>{isSignUp ? 'Create account' : 'Sign in'}</Text>
        <Text style={[styles.subtitle, { color: theme.muted }]}>
          {isSignUp
            ? 'Start your trade journal with email and password.'
            : 'Welcome back. Continue to your trade journal.'}
        </Text>

        <View style={styles.form}>
          <TextInput
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            onChangeText={setEmail}
            placeholder="Email"
            placeholderTextColor={theme.muted}
            style={[styles.input, { backgroundColor: theme.mutedSurface, borderColor: theme.border, color: theme.text }]}
            textContentType="emailAddress"
            value={email}
          />
          <TextInput
            autoCapitalize="none"
            onChangeText={setPassword}
            placeholder="Password"
            placeholderTextColor={theme.muted}
            secureTextEntry
            style={[styles.input, { backgroundColor: theme.mutedSurface, borderColor: theme.border, color: theme.text }]}
            textContentType={isSignUp ? 'newPassword' : 'password'}
            value={password}
          />

          {error ? <Text style={[styles.error, { color: theme.danger }]}>{error}</Text> : null}
          {message ? <Text style={[styles.message, { color: theme.positive }]}>{message}</Text> : null}

          <Pressable
            disabled={isSubmitting}
            onPress={handleSubmit}
            style={({ pressed }) => [
              styles.primaryButton,
              { backgroundColor: theme.accent },
              (pressed || isSubmitting) && styles.primaryButtonPressed
            ]}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryButtonText}>{isSignUp ? 'Create account' : 'Sign in'}</Text>
            )}
          </Pressable>
        </View>

        <Pressable onPress={toggleMode} style={styles.secondaryButton}>
          <Text style={[styles.secondaryButtonText, { color: theme.accent }]}>
            {isSignUp ? 'Already have an account? Sign in' : 'Need an account? Create one'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24
  },
  panel: {
    width: '100%',
    maxWidth: 420,
    gap: 12,
    borderRadius: 14,
    borderWidth: 1,
    padding: 24,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.08,
    shadowRadius: 28,
    elevation: 4
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase'
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.5
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22
  },
  form: {
    gap: 12,
    marginTop: 8
  },
  input: {
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 1,
    fontSize: 15,
    paddingHorizontal: 14,
    paddingVertical: 12
  },
  error: {
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18
  },
  message: {
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18
  },
  primaryButton: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    paddingHorizontal: 16
  },
  primaryButtonPressed: {
    opacity: 0.78,
    transform: [{ scale: 0.985 }]
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.1
  },
  secondaryButton: {
    alignItems: 'center',
    paddingVertical: 6
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '600'
  }
});
