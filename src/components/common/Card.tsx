import React from 'react';
import { Pressable, Text, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { makeStyles, radius, shadows, spacing, typography, useTheme } from '@/theme';
import type { IconName } from '@/types';

type CardProps = {
  children: React.ReactNode;
  onPress?: () => void;
  tone?: 'surface' | 'mint' | 'sage' | 'dark' | 'outline';
  padded?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
};

export function Card({ children, onPress, tone = 'surface', padded = true, style, accessibilityLabel }: CardProps) {
  const styles = useStyles();
  const base: StyleProp<ViewStyle>[] = [
    styles.card,
    padded && styles.padded,
    tone === 'surface' && styles.surface,
    tone === 'mint' && styles.mint,
    tone === 'sage' && styles.sage,
    tone === 'dark' && styles.dark,
    tone === 'outline' && styles.outline,
    style,
  ];
  if (!onPress) return <View style={base}>{children}</View>;
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [...base, pressed && styles.pressed]}
    >
      {children}
    </Pressable>
  );
}

type SectionHeaderProps = {
  title: string;
  eyebrow?: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
  actionIcon?: IconName;
  style?: StyleProp<ViewStyle>;
};

export function SectionHeader({ title, eyebrow, subtitle, actionLabel, onAction, actionIcon = 'chevron-forward', style }: SectionHeaderProps) {
  const { colors } = useTheme();
  const styles = useStyles();

  return (
    <View style={[styles.sectionHeader, style]}>
      <View style={styles.sectionCopy}>
        {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
        <Text style={styles.sectionTitle}>{title}</Text>
        {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
      </View>
      {actionLabel && onAction ? (
        <Pressable accessibilityRole="button" hitSlop={8} onPress={onAction} style={({ pressed }) => [styles.action, pressed && { opacity: 0.7 }]}>
          <Text style={styles.actionLabel}>{actionLabel}</Text>
          <Ionicons color={colors.brand} name={actionIcon} size={15} />
        </Pressable>
      ) : null}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  card: { borderRadius: radius.lg, overflow: 'hidden' },
  padded: { padding: spacing.md },
  surface: { backgroundColor: t.colors.surface, borderWidth: 1, borderColor: t.colors.border, ...shadows.xs },
  mint: { backgroundColor: t.colors.brandSoft, borderWidth: 1, borderColor: t.colors.brand },
  sage: { backgroundColor: t.colors.neutralTint, borderWidth: 1, borderColor: t.colors.border },
  dark: { backgroundColor: t.colors.navy },
  outline: { backgroundColor: 'transparent', borderWidth: 1, borderColor: t.colors.border },
  pressed: { opacity: 0.92, transform: [{ scale: 0.995 }] },
  sectionHeader: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: spacing.sm, marginBottom: spacing.sm },
  sectionCopy: { flex: 1, gap: 2 },
  eyebrow: { ...typography.eyebrow, color: t.colors.inkSecondary },
  sectionTitle: { ...typography.title3, color: t.colors.ink },
  sectionSubtitle: { ...typography.micro, color: t.colors.inkSecondary, lineHeight: 17 },
  action: { flexDirection: 'row', alignItems: 'center', gap: 2, paddingVertical: spacing.xxs },
  actionLabel: { ...typography.caption, color: t.colors.brand, fontWeight: '700' },
}));
