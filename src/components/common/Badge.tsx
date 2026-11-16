import React from 'react';
import { Text, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';

import { makeStyles, radius, spacing, typography, useTheme } from '@/theme';
import type { NestColors } from '@/theme';

export type BadgeTone = 'neutral' | 'mint' | 'forest' | 'success' | 'warning' | 'danger' | 'onDark';

type BadgeProps = {
  label: string;
  tone?: BadgeTone;
  style?: StyleProp<ViewStyle>;
};

const toneAppearance = (c: NestColors): Record<BadgeTone, { background: string; text: string; border: string }> => ({
  neutral: { background: c.surfaceMuted, text: c.inkSecondary, border: c.border },
  mint: { background: c.brandSoft, text: c.brandInk, border: c.brand },
  forest: { background: c.brandDeep, text: c.white, border: c.brandDeep },
  success: { background: c.successTint, text: c.success, border: c.border },
  warning: { background: c.warningTint, text: c.warning, border: c.border },
  danger: { background: c.dangerTint, text: c.danger, border: c.border },
  onDark: { background: 'rgba(255,255,255,0.14)', text: c.white, border: 'rgba(255,255,255,0.22)' },
});

export function Badge({ label, tone = 'neutral', style }: BadgeProps) {
  const { colors } = useTheme();
  const styles = useStyles();
  const appearance = toneAppearance(colors)[tone];
  return (
    <View style={[styles.badge, { backgroundColor: appearance.background, borderColor: appearance.border }, style]}>
      <Text style={[styles.label, { color: appearance.text }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

/** Small dot used for live status such as device connection state. */
export function StatusDot({ tone = 'success' }: { tone?: 'success' | 'warning' | 'danger' | 'neutral' }) {
  const { colors } = useTheme();
  const styles = useStyles();
  const background =
    tone === 'success' ? colors.success : tone === 'warning' ? colors.warning : tone === 'danger' ? colors.danger : colors.inkMuted;
  return <View style={[styles.dot, { backgroundColor: background }]} />;
}

const useStyles = makeStyles(() => ({
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.xs,
    paddingVertical: 5,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  label: { ...typography.micro, fontWeight: '700' },
  dot: { width: 8, height: 8, borderRadius: 4 },
}));
