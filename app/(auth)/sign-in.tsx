import { StyleSheet, Text, View } from 'react-native';

export default function SignInScreen() {
  return (
    <View style={styles.screen}>
      <View style={styles.panel}>
        <Text style={styles.eyebrow}>Polaris</Text>
        <Text style={styles.title}>Sign in</Text>
        <Text style={styles.subtitle}>Email authentication will be implemented in AUTH-002.</Text>
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
    gap: 10,
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
  }
});
