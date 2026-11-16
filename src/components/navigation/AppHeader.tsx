import React from 'react';
import { Pressable, Text, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { makeStyles, radius, spacing, typography, useTheme } from '@/theme';

type AppHeaderProps = {
  title?: string;
  eyebrow?: string;
  subtitle?: string;
  onBack?: () => void;
  backLabel?: string;
  right?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

/**
 * In-screen top bar. Safe area insets are handled by ScreenContainer, so this
 * component only lays out the title row and its actions.
 */
export function AppHeader({ title, eyebrow, subtitle, onBack, backLabel = 'Back', right, style }: AppHeaderProps) {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <View style={[styles.header, style]}>
      <View style={styles.row}>
        {onBack ? (
          <Pressable
            accessibilityLabel={backLabel}
            accessibilityRole="button"
            hitSlop={8}
            onPress={onBack}
            style={({ pressed }) => [styles.back, pressed && styles.pressed]}
          >
            <Ionicons color={colors.brandInk} name="arrow-back" size={19} />
          </Pressable>
        ) : null}
        <View style={styles.copy}>
          {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
          {title ? <Text style={styles.title}>{title}</Text> : null}
        </View>
        {right ? <View style={styles.right}>{right}</View> : null}
      </View>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  header: { gap: spacing.xs },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  back: {
    width: 42,
    height: 42,
    borderRadius: radius.md,
    backgroundColor: t.colors.surface,
    borderWidth: 1,
    borderColor: t.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.85, transform: [{ scale: 0.97 }] },
  copy: { flex: 1, gap: 2 },
  eyebrow: { ...typography.eyebrow, color: t.colors.inkSecondary },
  title: { ...typography.title2, color: t.colors.ink },
  right: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  subtitle: { ...typography.caption, color: t.colors.inkSecondary, lineHeight: 20 },
}));
