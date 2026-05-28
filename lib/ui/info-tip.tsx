import { useState } from 'react';
import { Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { GLOSSARY } from './glossary';
import { useAppTheme } from './theme';

type InfoTipProps =
  | { term: keyof typeof GLOSSARY; definition?: never; title?: never; size?: 'small' | 'medium' }
  | { definition: string; size?: 'small' | 'medium'; term?: never; title: string };

/**
 * Inline (?) icon that reveals a glossary entry on tap/hover.
 *
 * Two usage modes:
 *  - <InfoTip term="flip_zone" /> — looks up from glossary
 *  - <InfoTip title="..." definition="..." /> — inline custom text
 */
export function InfoTip(props: InfoTipProps) {
  const theme = useAppTheme();
  const [isOpen, setIsOpen] = useState(false);
  const isWeb = Platform.OS === 'web';

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

  // On web, also support hover via pointer events
  const hoverHandlers = isWeb
    ? {
        onHoverIn: () => setIsOpen(true),
        onHoverOut: () => setIsOpen(false)
      }
    : {};

  return (
    <View style={styles.wrapper}>
      <Pressable
        onPress={() => setIsOpen(true)}
        {...hoverHandlers}
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

      {/* On web, render an inline floating popover near the icon */}
      {isWeb && isOpen ? (
        <View
          pointerEvents="none"
          style={[
            styles.webPopover,
            {
              backgroundColor: theme.card,
              borderColor: theme.border,
              shadowColor: theme.isDark ? '#000000' : '#202020'
            }
          ]}
        >
          <Text style={[styles.popoverTitle, { color: theme.text }]}>{title}</Text>
          <Text style={[styles.popoverBody, { color: theme.muted }]}>{definition}</Text>
        </View>
      ) : null}

      {/* On mobile, render a tap-dismissable modal */}
      {!isWeb ? (
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
                styles.mobileCard,
                {
                  backgroundColor: theme.card,
                  borderColor: theme.border
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
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'relative',
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
  webPopover: {
    position: 'absolute',
    top: 22,
    left: -10,
    width: 280,
    borderRadius: 8,
    borderWidth: 1,
    padding: 12,
    gap: 6,
    zIndex: 100,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
    elevation: 8
  },
  popoverTitle: {
    fontSize: 14,
    fontWeight: '800'
  },
  popoverBody: {
    fontSize: 13,
    lineHeight: 19
  },
  modalBackdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 24
  },
  mobileCard: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    gap: 8
  },
  closeButton: {
    alignItems: 'center',
    borderRadius: 8,
    paddingVertical: 10,
    marginTop: 6
  },
  closeButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800'
  }
});
