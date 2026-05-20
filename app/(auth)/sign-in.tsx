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

type AuthMode = 'sign-in' | 'sign-up';

export default function SignInScreen() {
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

    const { error: authError } = isSignUp
      ? await supabase.auth.signUp({
          email: normalizedEmail,
          password
        })
      : await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password
        });

    setIsSubmitting(false);

    if (authError) {
      setError(authError.message);
      return;
    }

    if (isSignUp) {
      setMessage('Account created. Check your email if confirmation is required.');
      return;
    }
  }

  function toggleMode() {
    setAuthMode(isSignUp ? 'sign-in' : 'sign-up');
    setError(null);
    setMessage(null);
  }

  return (
    <View style={styles.screen}>
      <View style={styles.panel}>
        <Text style={styles.eyebrow}>Polaris</Text>
        <Text style={styles.title}>{isSignUp ? 'Create account' : 'Sign in'}</Text>
        <Text style={styles.subtitle}>
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
            style={styles.input}
            textContentType="emailAddress"
            value={email}
          />
          <TextInput
            autoCapitalize="none"
            onChangeText={setPassword}
            placeholder="Password"
            secureTextEntry
            style={styles.input}
            textContentType={isSignUp ? 'newPassword' : 'password'}
            value={password}
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}
          {message ? <Text style={styles.message}>{message}</Text> : null}

          <Pressable
            disabled={isSubmitting}
            onPress={handleSubmit}
            style={({ pressed }) => [
              styles.primaryButton,
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
          <Text style={styles.secondaryButtonText}>
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
    padding: 24,
    backgroundColor: '#F8FAFC'
  },
  panel: {
    width: '100%',
    maxWidth: 420,
    gap: 12,
    borderRadius: 8,
    borderColor: '#E2E8F0',
    borderWidth: 1,
    backgroundColor: '#FFFFFF',
    padding: 24
  },
  eyebrow: {
    color: '#2563EB',
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'uppercase'
  },
  title: {
    color: '#0F172A',
    fontSize: 30,
    fontWeight: '800'
  },
  subtitle: {
    color: '#475569',
    fontSize: 15,
    lineHeight: 22
  },
  form: {
    gap: 12,
    marginTop: 8
  },
  input: {
    minHeight: 48,
    borderRadius: 8,
    borderColor: '#CBD5E1',
    borderWidth: 1,
    color: '#0F172A',
    fontSize: 16,
    paddingHorizontal: 14,
    paddingVertical: 12
  },
  error: {
    color: '#B91C1C',
    fontSize: 14,
    lineHeight: 20
  },
  message: {
    color: '#166534',
    fontSize: 14,
    lineHeight: 20
  },
  primaryButton: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: '#2563EB',
    paddingHorizontal: 16
  },
  primaryButtonPressed: {
    opacity: 0.78
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700'
  },
  secondaryButton: {
    alignItems: 'center',
    paddingVertical: 6
  },
  secondaryButtonText: {
    color: '#2563EB',
    fontSize: 14,
    fontWeight: '700'
  }
});
