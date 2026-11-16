import React from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Button } from '@/components/common/Button';
import { makeStyles, radius, spacing, typography, useTheme } from '@/theme';
import type { IconName } from '@/types';

type EmptyStateProps = {
  icon?: IconName;
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  compact?: boolean;
};

export function EmptyState({ icon = 'sparkles-outline', title, message, actionLabel, onAction, compact = false }: EmptyStateProps) {
  const { colors } = useTheme();
  const styles = useStyles();

  return (
    <View style={[styles.wrap, compact && styles.wrapCompact]}>
      <View style={styles.iconBubble}>
        <Ionicons color={colors.brandInk} name={icon} size={compact ? 22 : 26} />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
      {actionLabel && onAction ? <Button label={actionLabel} onPress={onAction} style={styles.action} variant="secondary" /> : null}
    </View>
  );
}

type LoadingStateProps = {
  message?: string;
  /** Fills the screen and centres the indicator. */
  fullScreen?: boolean;
};

export function LoadingState({ message = 'Loading…', fullScreen = false }: LoadingStateProps) {
  const { colors } = useTheme();
  const styles = useStyles();

  return (
    <View style={[styles.loading, fullScreen && styles.loadingFull]}>
      <ActivityIndicator color={colors.brand} size="small" />
      <Text style={styles.loadingText}>{message}</Text>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.lg,
    backgroundColor: t.colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: t.colors.border,
  },
  wrapCompact: { paddingVertical: spacing.lg },
  iconBubble: {
    width: 54,
    height: 54,
    borderRadius: radius.md,
    backgroundColor: t.colors.brandSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xxs,
  },
  title: { ...typography.title3, color: t.colors.ink, textAlign: 'center' },
  message: { ...typography.caption, color: t.colors.inkSecondary, textAlign: 'center', lineHeight: 20, maxWidth: 320 },
  action: { marginTop: spacing.sm, alignSelf: 'stretch' },
  loading: { alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingVertical: spacing.xxl },
  loadingFull: { flex: 1 },
  loadingText: { ...typography.caption, color: t.colors.inkSecondary },
}));
