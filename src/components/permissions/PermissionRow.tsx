import React from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { makeStyles, radius, spacing, typography, useTheme } from '@/theme';
import type { IconName, PermissionSource } from '@/types';

type PermissionRowProps = {
  title: string;
  description?: string;
  icon: IconName;
  allowed: boolean;
  /** Whether the decision is the recommended default or a custom rule. */
  source?: PermissionSource;
  onChange: (next: boolean) => void;
  /** Long press opens the reset affordance when a custom rule exists. */
  onLongPress?: () => void;
  disabled?: boolean;
  last?: boolean;
};

/** Application or device rule row with a switch and a rule source indicator. */
export function PermissionRow({
  title,
  description,
  icon,
  allowed,
  source = 'recommended',
  onChange,
  onLongPress,
  disabled = false,
  last = false,
}: PermissionRowProps) {
  const { colors } = useTheme();
  const styles = useStyles();
  return (
    <Pressable
      accessibilityLabel={`${title}, ${allowed ? 'allowed' : 'blocked'}`}
      delayLongPress={280}
      disabled={disabled || !onLongPress}
      onLongPress={onLongPress}
      style={({ pressed }) => [styles.row, !last && styles.divider, pressed && onLongPress && styles.pressed]}
    >
      <View style={[styles.icon, allowed ? styles.iconAllowed : styles.iconBlocked]}>
        <Ionicons color={allowed ? colors.brandInk : colors.inkSecondary} name={icon} size={19} />
      </View>
      <View style={styles.copy}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        {description ? (
          <Text style={styles.description} numberOfLines={2}>
            {description}
          </Text>
        ) : null}
        <View style={styles.tags}>
          <Text style={[styles.state, allowed ? styles.stateAllowed : styles.stateBlocked]}>
            {allowed ? 'Allowed' : 'Blocked'}
          </Text>
          <Text style={[styles.source, source === 'custom' && styles.sourceCustom]}>
            {source === 'custom' ? 'Custom' : 'Recommended'}
          </Text>
        </View>
      </View>
      <Switch
        accessibilityLabel={title}
        disabled={disabled}
        ios_backgroundColor={colors.borderStrong}
        onValueChange={onChange}
        thumbColor={colors.white}
        trackColor={{ false: colors.borderStrong, true: colors.success }}
        value={allowed}
      />
    </Pressable>
  );
}

const useStyles = makeStyles((t) => ({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm },
  divider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: t.colors.border },
  pressed: { backgroundColor: t.colors.surfaceMuted },
  icon: {
    width: 42,
    height: 42,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconAllowed: { backgroundColor: t.colors.brandSoft },
  iconBlocked: { backgroundColor: t.colors.surfaceMuted },
  copy: { flex: 1, gap: 2 },
  title: { ...typography.bodyStrong, color: t.colors.ink },
  description: { ...typography.micro, color: t.colors.inkSecondary, lineHeight: 16 },
  tags: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: 2 },
  state: { ...typography.micro, fontSize: 10, fontWeight: '800' },
  stateAllowed: { color: t.colors.success },
  stateBlocked: { color: t.colors.inkMuted },
  source: { ...typography.micro, fontSize: 10, color: t.colors.inkMuted, fontWeight: '700' },
  sourceCustom: { color: t.colors.warning },
}));
