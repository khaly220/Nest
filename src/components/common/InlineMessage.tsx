import React from 'react';
import { Text, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { makeStyles, radius, spacing, typography, useTheme } from '@/theme';
import type { NestColors } from '@/theme';
import type { IconName } from '@/types';

export type MessageTone = 'info' | 'success' | 'warning' | 'danger';

const toneMap = (c: NestColors): Record<MessageTone, { background: string; border: string; accent: string; icon: IconName }> => ({
  info: { background: c.brandTint, border: c.border, accent: c.brandInk, icon: 'information-circle-outline' },
  success: { background: c.successTint, border: c.border, accent: c.success, icon: 'checkmark-circle-outline' },
  warning: { background: c.warningTint, border: c.border, accent: c.warning, icon: 'warning-outline' },
  danger: { background: c.dangerTint, border: c.border, accent: c.danger, icon: 'alert-circle-outline' },
});

type InlineMessageProps = {
  message?: string;
  tone?: MessageTone;
  icon?: IconName;
  style?: StyleProp<ViewStyle>;
};

/** Single-line feedback used under forms and list headers. */
export function InlineMessage({ message, tone = 'info', icon, style }: InlineMessageProps) {
  const { colors } = useTheme();
  const styles = useStyles();
  if (!message) return null;
  const appearance = toneMap(colors)[tone];
  return (
    <View accessibilityLiveRegion="polite" style={[styles.inline, { backgroundColor: appearance.background, borderColor: appearance.border }, style]}>
      <Ionicons color={appearance.accent} name={icon ?? appearance.icon} size={17} />
      <Text style={[styles.inlineText, { color: appearance.accent }]}>{message}</Text>
    </View>
  );
}

type NoticeCardProps = {
  title: string;
  message: string;
  tone?: MessageTone;
  icon?: IconName;
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

/**
 * Larger explanatory block. Used to keep preview, local-only and
 * not-yet-enforced behaviour explicit on screen.
 */
export function NoticeCard({ title, message, tone = 'info', icon, children, style }: NoticeCardProps) {
  const { colors } = useTheme();
  const styles = useStyles();
  const appearance = toneMap(colors)[tone];
  return (
    <View style={[styles.notice, { backgroundColor: appearance.background, borderColor: appearance.border }, style]}>
      <View style={styles.noticeHeader}>
        <View style={[styles.noticeIcon, { backgroundColor: appearance.accent }]}>
          <Ionicons color={colors.white} name={icon ?? appearance.icon} size={16} />
        </View>
        <Text style={[styles.noticeTitle, { color: appearance.accent }]}>{title}</Text>
      </View>
      <Text style={styles.noticeMessage}>{message}</Text>
      {children}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  inline: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
    padding: spacing.sm,
    borderRadius: radius.sm,
    borderWidth: 1,
  },
  inlineText: { ...typography.micro, flex: 1, lineHeight: 17, fontWeight: '600' },
  notice: { padding: spacing.md, borderRadius: radius.md, borderWidth: 1, gap: spacing.xs },
  noticeHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  noticeIcon: { width: 26, height: 26, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  noticeTitle: { ...typography.caption, fontWeight: '800', flex: 1 },
  noticeMessage: { ...typography.micro, color: t.colors.inkSecondary, lineHeight: 18 },
}));
