import React from 'react';
import { Pressable, ScrollView, Switch, Text, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { makeStyles, radius, spacing, typography, useTheme } from '@/theme';
import type { IconName } from '@/types';

type SegmentedOption = { id: string; label: string };

type SegmentedControlProps = {
  options: SegmentedOption[];
  value: string;
  onChange: (id: string, index: number) => void;
  style?: StyleProp<ViewStyle>;
};

/** Compact control for two or three mutually exclusive choices. */
export function SegmentedControl({ options, value, onChange, style }: SegmentedControlProps) {
  const styles = useStyles();
  return (
    <View style={[styles.segmented, style]}>
      {options.map((option, index) => {
        const selected = option.id === value;
        return (
          <Pressable
            accessibilityLabel={option.label}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            key={option.id}
            onPress={() => onChange(option.id, index)}
            style={({ pressed }) => [styles.segment, selected && styles.segmentActive, pressed && styles.pressed]}
          >
            <Text style={[styles.segmentLabel, selected && styles.segmentLabelActive]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

type OptionCardProps = {
  title: string;
  description?: string;
  icon: IconName;
  selected: boolean;
  onPress: () => void;
  badge?: string;
  disabled?: boolean;
};

/** Selectable card with an icon, used for age groups, auth methods and policies. */
export function OptionCard({ title, description, icon, selected, onPress, badge, disabled = false }: OptionCardProps) {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityLabel={title}
      accessibilityRole="radio"
      accessibilityState={{ selected, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.option,
        selected && styles.optionSelected,
        disabled && styles.optionDisabled,
        pressed && !disabled && styles.pressed,
      ]}
    >
      <View style={[styles.optionIcon, selected && styles.optionIconSelected]}>
        <Ionicons color={selected ? colors.white : colors.brandInk} name={icon} size={19} />
      </View>
      <View style={styles.optionCopy}>
        <View style={styles.optionTitleRow}>
          <Text style={styles.optionTitle}>{title}</Text>
          {badge ? <Text style={styles.optionBadge}>{badge}</Text> : null}
        </View>
        {description ? <Text style={styles.optionDescription}>{description}</Text> : null}
      </View>
      <View style={[styles.radio, selected && styles.radioSelected]}>
        {selected ? <Ionicons color={colors.white} name="checkmark" size={13} /> : null}
      </View>
    </Pressable>
  );
}

type FilterChipsProps = {
  options: { id: string; label: string; count?: number }[];
  value: string;
  onChange: (id: string) => void;
  style?: StyleProp<ViewStyle>;
};

/** Horizontally scrolling filter chips for category and state filters. */
export function FilterChips({ options, value, onChange, style }: FilterChipsProps) {
  const styles = useStyles();
  return (
    <ScrollView
      contentContainerStyle={[styles.chips, style]}
      horizontal
      keyboardShouldPersistTaps="handled"
      showsHorizontalScrollIndicator={false}
    >
      {options.map((option) => {
        const selected = option.id === value;
        return (
          <Pressable
            accessibilityLabel={option.label}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            key={option.id}
            onPress={() => onChange(option.id)}
            style={({ pressed }) => [styles.chip, selected && styles.chipSelected, pressed && styles.pressed]}
          >
            <Text style={[styles.chipLabel, selected && styles.chipLabelSelected]}>
              {option.label}
              {typeof option.count === 'number' ? ` · ${option.count}` : ''}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

type SwitchRowProps = {
  title: string;
  description?: string;
  icon?: IconName;
  value: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  tone?: 'default' | 'danger';
};

/** Plain labelled switch used by settings screens. */
export function SwitchRow({ title, description, icon, value, onChange, disabled = false, tone = 'default' }: SwitchRowProps) {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <View style={[styles.switchRow, disabled && styles.optionDisabled]}>
      {icon ? (
        <View style={[styles.switchIcon, tone === 'danger' && styles.switchIconDanger]}>
          <Ionicons color={tone === 'danger' ? colors.danger : colors.brandInk} name={icon} size={18} />
        </View>
      ) : null}
      <View style={styles.optionCopy}>
        <Text style={styles.switchTitle}>{title}</Text>
        {description ? <Text style={styles.optionDescription}>{description}</Text> : null}
      </View>
      <Switch
        accessibilityLabel={title}
        disabled={disabled}
        ios_backgroundColor={colors.borderStrong}
        onValueChange={onChange}
        thumbColor={colors.white}
        trackColor={{ false: colors.borderStrong, true: colors.success }}
        value={value}
      />
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  segmented: {
    flexDirection: 'row',
    padding: 4,
    gap: 4,
    backgroundColor: t.colors.surfaceMuted,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: t.colors.border,
  },
  segment: { flex: 1, minHeight: 40, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  segmentActive: { backgroundColor: t.colors.surface, borderWidth: 1, borderColor: t.colors.border },
  segmentLabel: { ...typography.caption, color: t.colors.inkSecondary, fontWeight: '700' },
  segmentLabelActive: { color: t.colors.brandInk },
  pressed: { opacity: 0.88 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: t.colors.border,
    backgroundColor: t.colors.surface,
  },
  optionSelected: { borderColor: t.colors.success, backgroundColor: t.colors.brandTint },
  optionDisabled: { opacity: 0.55 },
  optionIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.sm,
    backgroundColor: t.colors.brandSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionIconSelected: { backgroundColor: t.colors.brandDeep },
  optionCopy: { flex: 1, gap: 2 },
  optionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  optionTitle: { ...typography.bodyStrong, color: t.colors.ink },
  optionBadge: { ...typography.micro, color: t.colors.success, fontWeight: '800' },
  optionDescription: { ...typography.micro, color: t.colors.inkSecondary, lineHeight: 17 },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: t.colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: { backgroundColor: t.colors.success, borderColor: t.colors.success },
  chips: { gap: spacing.xs, paddingVertical: 2 },
  chip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    backgroundColor: t.colors.surface,
    borderWidth: 1,
    borderColor: t.colors.border,
  },
  chipSelected: { backgroundColor: t.colors.brandDeep, borderColor: t.colors.brandDeep },
  chipLabel: { ...typography.micro, color: t.colors.inkSecondary, fontWeight: '700' },
  chipLabelSelected: { color: t.colors.white },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xs },
  switchIcon: {
    width: 38,
    height: 38,
    borderRadius: radius.sm,
    backgroundColor: t.colors.brandSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  switchIconDanger: { backgroundColor: t.colors.dangerTint },
  switchTitle: { ...typography.bodyStrong, color: t.colors.ink },
}));
