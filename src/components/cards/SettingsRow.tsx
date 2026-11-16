import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { makeStyles, radius, spacing, typography, useTheme } from '@/theme';
import type { IconName } from '@/types';

type SettingsRowProps = {
  icon: IconName;
  title: string;
  description?: string;
  /** Right aligned short value, e.g. a family name or a count. */
  value?: string;
  onPress?: () => void;
  tone?: 'default' | 'danger';
  last?: boolean;
};

/** Single tappable line inside a SettingsGroup. */
export function SettingsRow({ icon, title, description, value, onPress, tone = 'default', last = false }: SettingsRowProps) {
  const styles = useStyles();
  const { colors } = useTheme();
  const accent = tone === 'danger' ? colors.danger : colors.brandInk;
  const body = (
    <>
      <View style={[styles.icon, tone === 'danger' && styles.iconDanger]}>
        <Ionicons color={accent} name={icon} size={18} />
      </View>
      <View style={styles.copy}>
        <Text numberOfLines={1} style={[styles.title, tone === 'danger' && styles.titleDanger]}>
          {title}
        </Text>
        {description ? (
          <Text numberOfLines={2} style={styles.description}>
            {description}
          </Text>
        ) : null}
      </View>
      {value ? (
        <Text numberOfLines={1} style={styles.value}>
          {value}
        </Text>
      ) : null}
      {onPress ? <Ionicons color={colors.inkMuted} name="chevron-forward" size={17} /> : null}
    </>
  );

  if (!onPress) return <View style={[styles.row, !last && styles.divider]}>{body}</View>;

  return (
    <Pressable
      accessibilityLabel={title}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.row, !last && styles.divider, pressed && styles.pressed]}
    >
      {body}
    </Pressable>
  );
}

type SettingsGroupProps = {
  title?: string;
  children: React.ReactNode;
};

/** Rounded surface that groups related settings rows. */
export function SettingsGroup({ title, children }: SettingsGroupProps) {
  const styles = useStyles();
  return (
    <View style={styles.group}>
      {title ? <Text style={styles.groupTitle}>{title}</Text> : null}
      <View style={styles.groupBody}>{children}</View>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  group: { gap: spacing.xs },
  groupTitle: { ...typography.eyebrow, color: t.colors.inkSecondary, paddingLeft: spacing.xxs },
  groupBody: {
    backgroundColor: t.colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: t.colors.border,
    paddingHorizontal: spacing.sm,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm },
  divider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: t.colors.border },
  pressed: { opacity: 0.85 },
  icon: {
    width: 38,
    height: 38,
    borderRadius: radius.sm,
    backgroundColor: t.colors.brandSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconDanger: { backgroundColor: t.colors.dangerTint },
  copy: { flex: 1, gap: 2 },
  title: { ...typography.bodyStrong, color: t.colors.ink },
  titleDanger: { color: t.colors.danger },
  description: { ...typography.micro, color: t.colors.inkSecondary, lineHeight: 17 },
  value: { ...typography.micro, color: t.colors.inkMuted, maxWidth: 130, textAlign: 'right' },
}));
