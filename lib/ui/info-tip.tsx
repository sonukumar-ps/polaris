import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { GLOSSARY } from './glossary';
import { useAppTheme } from './theme';

type InfoTipProps =
  | { term: keyof typeof GLOSSARY; definition?: never; title?: never; size?: 'small' | 'medium' }
  | { definition: string; size?: 'small' | 'medium'; term?: never; title: string };

/**
 * Inline (?) icon that reveals a glossary entry on tap/click.
 *
 * Uses a Modal on both web and mobile so the popover always renders
 * at the root of the DOM/view hierarchy — never clipped by parent
 * stacking contexts, overflow, or z-index conflicts.
 *
 * Two usage modes:
 *  - <InfoTip term="flip_zone" /> — looks up from glossary
 *  - <InfoTip title="..." definition="..." /> — inline custom text
 */
export function InfoTip(props: InfoTipProps) {
  const theme = useAppTheme();
  const [isOpen, setIsOpen] = useState(false);

  const size = props.size ?? 'small';
  const iconSize = size === 'medium' ? 16 : 14;

  let title: string;
  let definition: string;

  if ('term' in props && props.term) {
    const entry = GLOSSARY[props.term];
    title = entry.title;
    definition = entry.definition;
  } else if ('title' in props && props.title) {
    title = props.title;
    definition = props.definition!;
  } else {
    return null;
  }

  return (
    <View style={styles.wrapper}>
      <Pressable
        onPress={() => setIsOpen(true)}
        style={({ pressed }) => [
          styles.iconButton,
          {
            backgroundColor: isOpen || pressed ? theme.accent : 'transparent',
            borderColor: isOpen || pressed ? theme.accent : theme.muted,
            height: iconSize + 4,
            width: iconSize + 4
          }
        ]}
      >
        <Text
          style={[
            styles.iconText,
            {
              color: isOpen ? '#FFFFFF' : theme.muted,
              fontSize: iconSize - 2
            }
          ]}
        >
          ?
        </Text>
      </Pressable>

      <Modal
        animationType="fade"
        onRequestClose={() => setIsOpen(false)}
        transparent
        visible={isOpen}
      >
        <Pressable onPress={() => setIsOpen(false)} style={styles.modalBackdrop}>
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={[
              styles.tipCard,
              {
                backgroundColor: theme.card,
                borderColor: theme.border,
                shadowColor: theme.isDark ? '#000000' : '#202020'
              }
            ]}
          >
            <Text style={[styles.popoverTitle, { color: theme.text }]}>{title}</Text>
            <Text style={[styles.popoverBody, { color: theme.muted }]}>{definition}</Text>
            <Pressable
              onPress={() => setIsOpen(false)}
              style={({ pressed }) => [
                styles.closeButton,
                {
                  backgroundColor: theme.accent,
                  opacity: pressed ? 0.72 : 1
                }
              ]}
            >
              <Text style={styles.closeButtonText}>Got it</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'center'
  },
  iconButton: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 50,
    borderWidth: 1
  },
  iconText: {
    fontWeight: '800',
    lineHeight: 14
  },
  popoverTitle: {
    fontSize: 16,
    fontWeight: '800'
  },
  popoverBody: {
    fontSize: 14,
    lineHeight: 21
  },
  modalBackdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
    padding: 24
  },
  tipCard: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 14,
    borderWidth: 1,
    padding: 18,
    gap: 10,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 28,
    elevation: 12
  },
  closeButton: {
    alignItems: 'center',
    borderRadius: 8,
    paddingVertical: 10,
    marginTop: 4
  },
  closeButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800'
  }
});
