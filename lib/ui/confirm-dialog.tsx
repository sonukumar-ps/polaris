import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { useAppTheme } from './theme';

export type ConfirmDialogProps = {
  /** Action button label. Defaults to "Confirm". */
  confirmLabel?: string;
  /** Cancel button label. Defaults to "Cancel". */
  cancelLabel?: string;
  /** When true, the confirm button uses the danger color (for destructive actions). */
  destructive?: boolean;
  /** Whether the dialog is visible. */
  isOpen: boolean;
  /** Body text — supports a short paragraph. */
  message: string;
  /** Fires when the user dismisses (backdrop tap, cancel button, or hardware back). */
  onCancel: () => void;
  /** Fires when the user confirms. */
  onConfirm: () => void;
  /** Short imperative title — e.g. "Delete this level?" */
  title: string;
};

/**
 * Centered confirmation modal that renders above all other UI via React Native
 * Modal (which mounts at the root of the view hierarchy).
 *
 * Use for actions that are infrequent or destructive — anything where an
 * accidental tap would meaningfully damage the user's data.
 */
export function ConfirmDialog({
  cancelLabel = 'Cancel',
  confirmLabel = 'Confirm',
  destructive = false,
  isOpen,
  message,
  onCancel,
  onConfirm,
  title
}: ConfirmDialogProps) {
  const theme = useAppTheme();

  const confirmColor = destructive ? theme.danger : theme.accent;

  return (
    <Modal animationType="fade" onRequestClose={onCancel} transparent visible={isOpen}>
      <Pressable onPress={onCancel} style={styles.backdrop}>
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={[
            styles.card,
            {
              backgroundColor: theme.card,
              borderColor: theme.border,
              shadowColor: theme.isDark ? '#000000' : '#202020'
            }
          ]}
        >
          <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
          <Text style={[styles.message, { color: theme.muted }]}>{message}</Text>

          <View style={styles.buttonRow}>
            <Pressable
              onPress={onCancel}
              style={({ pressed }) => [
                styles.button,
                {
                  backgroundColor: theme.mutedSurface,
                  borderColor: theme.border
                },
                pressed && styles.pressed
              ]}
            >
              <Text style={[styles.cancelText, { color: theme.text }]}>{cancelLabel}</Text>
            </Pressable>
            <Pressable
              onPress={onConfirm}
              style={({ pressed }) => [
                styles.button,
                {
                  backgroundColor: confirmColor,
                  borderColor: confirmColor
                },
                pressed && styles.pressed
              ]}
            >
              <Text style={styles.confirmText}>{confirmLabel}</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    padding: 24
  },
  card: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 18,
    borderWidth: 1,
    padding: 22,
    gap: 10,
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.28,
    shadowRadius: 36,
    elevation: 16
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.3
  },
  message: {
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 21
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8
  },
  button: {
    flex: 1,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14
  },
  cancelText: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: -0.1
  },
  confirmText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: -0.1
  },
  pressed: {
    opacity: 0.72,
    transform: [{ scale: 0.985 }]
  }
});
