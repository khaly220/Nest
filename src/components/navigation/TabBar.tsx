import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { TabTriggerSlotProps } from 'expo-router/ui';
import type { Href } from 'expo-router';

import { makeStyles, radius, shadows, spacing, typography, useTheme } from '@/theme';
import type { IconName } from '@/types';

export type AdminTab = {
  name: string;
  href: Href;
  label: string;
  icon: IconName;
};

/** The five administrator destinations. Order matches the tab bar. */
export const adminTabs: AdminTab[] = [
  { name: 'home', href: '/home', label: 'Home', icon: 'home-outline' },
  { name: 'family', href: '/family', label: 'Family', icon: 'people-outline' },
  { name: 'access', href: '/access', label: 'Access', icon: 'shield-checkmark-outline' },
  { name: 'activity', href: '/activity', label: 'Activity', icon: 'pulse-outline' },
  { name: 'settings', href: '/settings', label: 'Settings', icon: 'settings-outline' },
];

type TabButtonProps = Omit<TabTriggerSlotProps, 'ref'> & { icon: IconName; label: string };

export function AdminTabButton({ icon, label, isFocused, ...rest }: TabButtonProps) {
  const styles = useTabBarStyles();
  const { colors } = useTheme();
  return (
    <Pressable
      {...rest}
      accessibilityLabel={label}
      accessibilityRole="tab"
      accessibilityState={{ selected: Boolean(isFocused) }}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
    >
      <View style={[styles.iconWrap, isFocused && styles.iconWrapActive]}>
        <Ionicons color={isFocused ? colors.white : colors.inkSecondary} name={icon} size={21} />
      </View>
      <Text style={[styles.label, isFocused && styles.labelActive]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

export const useTabBarStyles = makeStyles((t) => ({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.xxs,
    minHeight: 72,
    backgroundColor: t.colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: t.colors.border,
    ...shadows.raised,
  },
  button: { flex: 1, minHeight: 56, alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: spacing.xs, borderRadius: radius.md },
  pressed: { opacity: 0.85 },
  iconWrap: {
    width: 44,
    height: 30,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapActive: { backgroundColor: t.colors.brandDeep },
  label: { ...typography.micro, fontSize: 11, color: t.colors.inkSecondary, fontWeight: '700' },
  labelActive: { color: t.colors.brandInk, fontWeight: '800' },
}));
